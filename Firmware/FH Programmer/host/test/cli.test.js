// The commands as a user meets them. `main()` is called directly rather than
// through a spawned process, so a failure points at a line rather than at an
// exit code.
//
// Everything here runs against `--port fake:`, the simulated Helper, or against
// no hardware at all. That is the whole point of it existing: the boards are on
// order, and every path but the physical bus can be exercised today.

import assert from 'node:assert/strict'
import { mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'

import { main } from '../src/cli.js'
import { crc32hex } from '../src/crc32.js'
import * as sav from '../src/sav.js'

const fixture = (name) => readFile(new URL(`./fixtures/${name}`, import.meta.url))
const scratch = () => mkdtemp(join(tmpdir(), '6502-flash-'))

/** Run a command, capturing what it printed. */
async function run(...argv) {
  const out = []
  const err = []
  const log = console.log
  const error = console.error
  console.log = (...a) => out.push(a.join(' '))
  console.error = (...a) => err.push(a.join(' '))
  try {
    await main(argv)
    return { out: out.join('\n'), err: err.join('\n') }
  } finally {
    console.log = log
    console.error = error
  }
}

const fails = async (argv, pattern) => {
  await assert.rejects(() => run(...argv), (e) => (assert.match(e.message, pattern), true))
}

test('--help lists every command in the plan', async () => {
  const { out } = await run('--help')
  for (const command of ['id', 'erase', 'program', 'verify', 'read', 'layout', 'merge', 'ports']) {
    assert.match(out, new RegExp(`6502-flash ${command}\\b`))
  }
})

test('layout reproduces the committed oracle byte for byte', async () => {
  // `legacy-512K.crt` is what this command has to produce from `legacy.crt`.
  // It is the shared fixture the whole rollout checks against, so a change in
  // either one shows up here rather than on a chip.
  const dir = await scratch()
  const out = join(dir, 'out.crt')
  const { out: printed } = await run('layout', 'test/fixtures/legacy.crt', '-o', out, '--size', '512K')

  assert.deepEqual([...(await readFile(out))], [...(await fixture('legacy-512K.crt'))])
  assert.match(printed, /crc32 bdaa7346/)
  assert.match(printed, /\$E000-\$FFFF at flash \$7E000/)
  assert.match(printed, /will change banks/, 'the caveat is part of the output')
})

test('layout puts the two halves where the bank register expects them', async () => {
  const dir = await scratch()
  const src = join(dir, 'in.crt')
  const out = join(dir, 'out.crt')
  const image = Buffer.alloc(0x8000, 0x00)
  image.fill(0xaa, 0x4000, 0x6000) // $C000-$DFFF
  image.fill(0xbb, 0x6000, 0x8000) // $E000-$FFFF
  await writeFile(src, image)

  await run('layout', src, '-o', out, '--size', '128K')
  const flash = await readFile(out)
  assert.equal(flash.length, 0x20000)
  assert.equal(flash[0x00000], 0xaa, 'bank 0')
  assert.equal(flash[0x1e000], 0xbb, 'the fixed bank, the last 8 KB of the chip')
  assert.equal(flash[0x02000], 0xff, 'everything else is left erased')
})

test('layout refuses a flash image, and points at nothing else', async () => {
  const dir = await scratch()
  await fails(
    ['layout', 'test/fixtures/banked-128K.crt', '-o', join(dir, 'o.crt'), '--size', '512K'],
    /already a flash cart image/
  )
})

test('layout and merge always write a new file', async () => {
  // Never over an input: PLAN.md §4 makes this the one path from a save into an
  // image, and a command that could overwrite its source is one slip away from
  // destroying the cart it was baking.
  await fails(
    ['layout', 'test/fixtures/legacy.crt', '-o', 'test/fixtures/legacy.crt', '--size', '512K'],
    /is an input/
  )
  await fails(['layout', 'test/fixtures/legacy.crt', '--size', '512K'], /needs -o/)
  await fails(['merge', 'test/fixtures/banked-128K.crt', 'test/fixtures/sample.sav'], /needs -o/)
})

test('merge bakes a save in, and leaves both inputs alone', async () => {
  const dir = await scratch()
  const out = join(dir, 'shipped.crt')
  const image = await fixture('banked-128K.crt')
  const before = crc32hex(image)

  const { out: printed } = await run(
    'merge', 'test/fixtures/banked-128K.crt', 'test/fixtures/sample.sav', '-o', out
  )

  const merged = await readFile(out)
  const overlay = sav.read(await fixture('sample.sav'))
  assert.deepEqual([...merged], [...sav.apply(image, overlay)])
  assert.match(printed, new RegExp(`crc32 ${before} -> ${crc32hex(merged)}`))
  assert.equal(crc32hex(await fixture('banked-128K.crt')), before, 'the input did not move')
})

test('merge refuses a save from a different build of the cart', async () => {
  const dir = await scratch()
  const other = join(dir, 'other.crt')
  const image = await fixture('banked-128K.crt')
  image[0x100] ^= 0xff // one byte, and the CRC moves
  await writeFile(other, image)

  await fails(
    ['merge', other, 'test/fixtures/sample.sav', '-o', join(dir, 'out.crt')],
    /different build of this cartridge/
  )
})

test('program refuses a 32K ROM cart image and names the command that helps', async () => {
  await fails(
    ['program', 'test/fixtures/legacy.crt', '--port', 'fake:512K'],
    /ROM cart image[\s\S]*6502-flash layout/
  )
})

test('program takes the size off the bytes and warns about the name', async () => {
  // PLAN.md §1 rules 2 and 3: the mapper is decided by size, never by the name,
  // and a disagreement is a warning rather than an error.
  const dir = await scratch()
  const misnamed = join(dir, 'Cart-512K.crt')
  await writeFile(misnamed, await fixture('banked-128K.crt'))

  const { out, err } = await run('program', misnamed, '--port', 'fake:128K', '--verify')
  assert.match(err, /named for 512K but is 131,072 bytes/)
  assert.match(err, /Going by the bytes/)
  assert.match(out, /128K, SST39SF010A/)
  assert.match(out, /Verified/)
})

test('program erases, skips the erased pages, and verifies', async () => {
  const dir = await scratch()
  const path = join(dir, 'Sparse-128K.crt')
  const image = Buffer.alloc(0x20000, 0xff)
  image.fill(0x7e, 0x1e000, 0x1e100)
  await writeFile(path, image)

  const { out } = await run('program', path, '--port', 'fake:128K', '--verify')
  assert.match(out, /1 of 32 sectors hold data/)
  assert.match(out, /Programmed 1 pages, skipped 511/)
  assert.match(out, /Verified: every byte/)
})

test('program refuses a cart whose chip is the wrong size', async () => {
  // Programming a 512K image onto a 128K part would alias the high addresses
  // down and produce a cart that does not run. Better to say so.
  await fails(
    ['program', 'test/fixtures/legacy-512K.crt', '--port', 'fake:128K'],
    /SST39SF010A \(128 KB\) but the image needs 512 KB/
  )
})

test('program refuses a 1M image when U2 is not fitted', async () => {
  const dir = await scratch()
  const path = join(dir, 'Big-1M.crt')
  await writeFile(path, Buffer.alloc(0x100000, 0xff))
  await fails(['program', path, '--port', 'fake:512K'], /U2 is not fitted/)
})

test('verify reports the first byte that differs', async () => {
  const dir = await scratch()
  const path = join(dir, 'Cart-128K.crt')
  const image = await fixture('banked-128K.crt')
  await writeFile(path, image)

  await run('program', path, '--port', 'fake:128K') // a fresh fake cart each time
  // A second, separate simulated Helper has never been programmed, so it is
  // erased and every byte of a fixture that is not $FF is a difference.
  await fails(['verify', path, '--port', 'fake:128K'], /First difference at \$00000/)
})

test('read needs a size, because the bytes cannot say', async () => {
  const dir = await scratch()
  await fails(['read', join(dir, 'out.crt'), '--port', 'fake:128K'], /--size is required/)
  await fails(['read', join(dir, 'out.crt'), '--size', '64K', '--port', 'fake:128K'], /not a flash cart target/)
})

test('read pulls a cart back into a file', async () => {
  const dir = await scratch()
  const out = join(dir, 'back.crt')
  const { out: printed } = await run('read', out, '--size', '128K', '--port', 'fake:128K')

  const image = await readFile(out)
  assert.equal(image.length, 0x20000)
  assert.ok(image.every((b) => b === 0xff), 'a fresh simulated cart is erased')
  assert.match(printed, /back.crt  131,072 bytes  128K/)
})

test('id reports both chips and adds them up', async () => {
  const { out } = await run('id', '--port', 'fake:1M')
  assert.match(out, /U1 {2}\$BF \$B7 {2}SST39SF040, 512 KB/)
  assert.match(out, /U2 {2}\$BF \$B7 {2}SST39SF040, 512 KB/)
  assert.match(out, /1,024 KB in total - a 1M cart/)
})

test('erase takes a chip, or one sector of the image', async () => {
  const plain = await run('erase', '--port', 'fake:512K', '--size', '512K')
  assert.match(plain.out, /Erasing U1\.\.\.\nErased U1\./)

  // Without --chip a sector index counts from the start of the image, so on a
  // 1M cart sector 128 is U2's first.
  const u2 = await run('erase', '--port', 'fake:1M', '--size', '1M', '--sector', '128')
  assert.match(u2.out, /Erased sector 128 - U2 \$00000/)

  await fails(['erase', '--port', 'fake:128K', '--size', '128K', '--sector', '32'],
              /not a whole number between 0 and 31/)
})

test('every command against the simulated Helper says so, on stderr', async () => {
  const { err } = await run('id', '--port', 'fake:256K')
  assert.match(err, /simulated Flash Helper/)
  assert.match(err, /Nothing it reports is/)
})

test('an unknown command is refused by name', async () => {
  await fails(['blast'], /there is no `blast` command/)
})
