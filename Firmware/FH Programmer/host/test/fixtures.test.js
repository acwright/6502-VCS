import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { crc32hex } from '../src/crc32.js'
import { BANK_SIZE, SECTOR_SIZE, describe as describeImage } from '../src/image.js'
import { legacyToFlash } from '../src/layout.js'
import * as sav from '../src/sav.js'

const HOST = join(dirname(fileURLToPath(import.meta.url)), '..')
const fixture = (n) => readFileSync(join(HOST, 'test', 'fixtures', n))

// The checksums the rest of the rollout quotes. If one of these moves, every
// other implementation checking against these files needs to be told.
test('fixtures have the published checksums', () => {
  assert.equal(crc32hex(fixture('legacy.crt')), '98a4e0fd')
  assert.equal(crc32hex(fixture('legacy-512K.crt')), 'bdaa7346')
  assert.equal(crc32hex(fixture('banked-128K.crt')), 'e0e4f83c')
  assert.equal(crc32hex(fixture('sample.sav')), '45c4068e')
})

test('regeneration is byte-identical', () => {
  // If this fails the generator is not deterministic, and --check in CI is
  // worthless.
  execFileSync(process.execPath, ['tools/make-fixtures.js', '--check'], { cwd: HOST })
})

test('legacy.crt is a 32K ROM cart image', () => {
  const crt = fixture('legacy.crt')
  const info = describeImage(crt, 'legacy.crt')
  assert.equal(info.mapper, 'flat')
  assert.equal(crt.length, 0x8000)
  assert.ok(crt.subarray(0, 0x4000).every((b) => b === 0), '$8000-$BFFF is padding')
  // Every byte of the cartridge half is the high byte of its own CPU address,
  // apart from the two 16-byte tags at $C000 and $E000 and the vectors.
  for (const addr of [0xc010, 0xc123, 0xd555, 0xe010, 0xfff0]) {
    assert.equal(crt[addr - 0x8000], addr >> 8, `$${addr.toString(16)}`)
  }
  assert.equal(crt.subarray(0x4000, 0x4010).toString('latin1'), 'AC6502 LEGACY C0')
  assert.equal(crt.subarray(0x6000, 0x6010).toString('latin1'), 'AC6502 LEGACY E0')
  assert.equal(crt.readUInt16LE(0x7ffc), 0xe000, 'RESET vector')
})

test('banked-128K.crt: every bank is filled with its own number', () => {
  const crt = fixture('banked-128K.crt')
  const info = describeImage(crt, 'banked-128K.crt')
  assert.equal(info.banks, 16)
  assert.equal(info.fixedOffset, 0x1e000)
  for (let b = 0; b < 16; b++) {
    const bank = crt.subarray(b * BANK_SIZE, (b + 1) * BANK_SIZE)
    // The body between the two 16-byte tags is a constant: the bank number.
    assert.ok(
      bank.subarray(16, BANK_SIZE - 16).every((x) => x === b),
      `bank ${b} body should be all 0x${b.toString(16).padStart(2, '0')}`
    )
    const head = bank.subarray(0, 16).toString('latin1')
    assert.match(head, b === 15 ? /^AC6502 FIXED \$0F$/ : /^AC6502 BANK \$[0-9A-F]{2}\n$/)
  }
})

test('banked-128K.crt: the fixed bank carries the vectors', () => {
  const crt = fixture('banked-128K.crt')
  const at = 0x1e000
  assert.equal(crt.readUInt16LE(at + BANK_SIZE - 4), 0xe000, 'RESET')
  assert.equal(crt.subarray(at + BANK_SIZE - 16, at + BANK_SIZE - 6).toString('latin1'), 'FIXED END\n')
})

// A reader that follows PLAN.md §2 exactly. It is here so the fixture is
// demonstrably able to tell a correct mapper from a wrong one - which is the
// only reason the fixture exists.
function readThroughMapper(image, reg, addr) {
  const info = describeImage(image)
  const chip = (reg >> 6) & 1
  const bank = reg & (info.banks - 1)
  if (addr >= 0xe000) return image[info.fixedOffset + (addr - 0xe000)]
  if (chip === 1 && info.chips === 1) return 0xff // open bus
  return image[chip * info.chipSize + bank * BANK_SIZE + (addr - 0xc000)]
}

test('the fixture distinguishes a correct mapper from a wrong one', () => {
  const crt = fixture('banked-128K.crt')
  // Selecting bank n and reading the window gives n.
  for (let b = 0; b < 15; b++) assert.equal(readThroughMapper(crt, b, 0xd000), b)
  // $E000+ ignores the register entirely and always reads the fixed bank.
  for (const reg of [0x00, 0x07, 0x0f, 0x3f, 0x80, 0xff]) {
    assert.equal(readThroughMapper(crt, reg, 0xf000), 0x0f, `reg $${reg.toString(16)}`)
  }
  // A 128K part has no A17/A18, so high bank bits alias down (PLAN.md §2).
  assert.equal(readThroughMapper(crt, 0x10, 0xd000), readThroughMapper(crt, 0x00, 0xd000))
  assert.equal(readThroughMapper(crt, 0x2e, 0xd000), readThroughMapper(crt, 0x0e, 0xd000))
  // Bit 7 is latched and goes nowhere: 128-255 mirror 0-127.
  assert.equal(readThroughMapper(crt, 0x85, 0xd000), readThroughMapper(crt, 0x05, 0xd000))
  // U2 is not fitted on a 128K cart, so B6 reads open bus.
  assert.equal(readThroughMapper(crt, 0x40, 0xd000), 0xff)
})

test('legacy-512K.crt is exactly what layout produces', () => {
  assert.ok(legacyToFlash(fixture('legacy.crt'), '512K').equals(fixture('legacy-512K.crt')))
})

test('sample.sav applies to banked-128K.crt', () => {
  const crt = fixture('banked-128K.crt')
  const file = fixture('sample.sav')
  const parsed = sav.read(file)
  assert.deepEqual([...parsed.sectors.keys()], [0, 28, 29], 'ascending, non-contiguous')
  assert.equal(parsed.imageSize, crt.length)

  const out = sav.apply(crt, file)
  assert.equal(out.length, crt.length)
  assert.equal(
    out.subarray(28 * SECTOR_SIZE, 28 * SECTOR_SIZE + 21).toString('latin1'),
    'AC6502 SAVE SECTOR 28'
  )
  // Sectors 28 and 29 are bank 14 - where a cartridge keeps its saves.
  assert.equal(Math.floor((28 * SECTOR_SIZE) / BANK_SIZE), 14)
  // Everything outside the three sectors is untouched.
  assert.deepEqual([...sav.diffSectors(crt, out).keys()], [0, 28, 29])
})

test('sample.sav is refused against a different build', () => {
  const crt = Buffer.from(fixture('banked-128K.crt'))
  crt[0x100] ^= 0xff
  assert.throws(() => sav.apply(crt, fixture('sample.sav')), sav.SaveMismatchError)
})
