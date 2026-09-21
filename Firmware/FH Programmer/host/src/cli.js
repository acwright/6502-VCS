// `6502-flash` - the command line, and the two rules it exists to enforce.
//
// **§1: the mapper is decided by file size, never by the name.** A name that
// disagrees with the byte count is a warning and the bytes win.
//
// **§4: a save can never reach a chip by accident.** `program` reads the `.crt`
// and nothing else. There is no `--with-saves`, no `--merge` and no environment
// variable, and the only path from a `.sav` into an image is `merge`, which
// always writes a new file and refuses to write over either input.
//
// Both are 6502-VCS `PLAN.md`, which is normative for the whole rollout.

import { readFile, writeFile } from 'node:fs/promises'
import { basename, resolve } from 'node:path'
import { parseArgs } from 'node:util'

import { crc32hex } from './crc32.js'
import { SECTOR_SIZE, TARGETS, byTarget, describe } from './image.js'
import { legacyToFlash } from './layout.js'
import { programImage, readImage, sectorsWithData, verifyImage } from './ops.js'
import * as sav from './sav.js'
import { describePort, listPorts, openHelper } from './session.js'

const USAGE = `6502-flash - program an AC6502 Flash Cart through the Flash Helper

  6502-flash id                                  --port <path>
  6502-flash erase                               --port <path> [--sector N] [--chip N]
  6502-flash program <file.crt>                  --port <path> [--verify]
  6502-flash verify  <file.crt>                  --port <path>
  6502-flash read    <out.crt> --size 512K       --port <path>
  6502-flash layout  <file.crt> -o <out.crt> --size 512K
  6502-flash merge   <file.crt> <file.sav> -o <out.crt>
  6502-flash ports

Options
  --port <path>    the Flash Helper. Defaults to the only Arduino Mega present.
                   --port fake:512K runs against a simulated Helper and no hardware.
  --size <target>  128K, 256K, 512K or 1M, where the size cannot be read off a file
  --sector <n>     erase one 4 KB sector instead of the whole chip
  --chip <n>       0 for U1, 1 for U2. Without it, --sector counts from the start
                   of the image and every fitted chip is erased
  -o, --out        where layout and merge write. Neither will overwrite its input
  --verify         read the cart back and compare after programming
  --quiet          no progress output
  -h, --help       this
  --version        the tool's version

layout and merge need no hardware. Nor does --port fake:, which runs the whole
tool against a simulated cart - useful, and not evidence about real silicon.

program reads the .crt and nothing else: a .sav can never reach a chip by
accident. Use merge to bake one in, which writes a new file.`

const OPTIONS = {
  port: { type: 'string' },
  size: { type: 'string' },
  sector: { type: 'string' },
  chip: { type: 'string' },
  out: { type: 'string', short: 'o' },
  verify: { type: 'boolean' },
  quiet: { type: 'boolean' },
  help: { type: 'boolean', short: 'h' },
  version: { type: 'boolean' }
}

/** An error whose message is the whole report: no stack, exit 1. */
class UserError extends Error {}

export async function main(argv, { version = '0.0.0' } = {}) {
  let parsed
  try {
    parsed = parseArgs({ args: argv, options: OPTIONS, allowPositionals: true })
  } catch (err) {
    throw new UserError(err.message)
  }
  const { values, positionals } = parsed

  if (values.version) return void console.log(version)
  if (values.help || positionals.length === 0) return void console.log(USAGE)

  const [command, ...rest] = positionals
  const commands = { ports, id, erase, program, verify, read, layout, merge }
  const run = commands[command]
  if (!run) throw new UserError(`there is no \`${command}\` command. Try --help.`)

  await run(rest, values)
}

// ---------------------------------------------------------------- no hardware

async function layout(args, opts) {
  const [input] = need(args, 1, 'layout <file.crt> -o <out.crt> --size 512K')
  const out = needOut(opts, 'layout')
  const target = needSize(opts)
  refuseOverwrite(out, [input])

  const crt = await readFile(input)
  const image = legacyToFlash(crt, target.target)

  await writeFile(out, image)
  console.log(
    `${basename(input)}  ${crt.length.toLocaleString()} bytes  ->  ` +
      `${basename(out)}  ${image.length.toLocaleString()} bytes (${target.target}, ${target.part})`
  )
  console.log(`  $C000-$DFFF at flash $00000, bank 0`)
  console.log(`  $E000-$FFFF at flash $${fixedOf(target).toString(16).toUpperCase()}, the fixed bank`)
  console.log(`  crc32 ${crc32hex(image)}`)
  console.log(
    '\nThe caveat: a legacy game that writes to its own ROM area at $E000-$FFFF\n' +
      'will change banks instead. Nothing else about it changes.'
  )
}

async function merge(args, opts) {
  const [crtPath, savPath] = need(args, 2, 'merge <file.crt> <file.sav> -o <out.crt>')
  const out = needOut(opts, 'merge')
  refuseOverwrite(out, [crtPath, savPath])

  const image = await readFile(crtPath)
  const info = describe(image, basename(crtPath))
  if (info.warning) warn(info.warning)

  const overlay = sav.read(await readFile(savPath))
  const merged = sav.apply(image, overlay)

  await writeFile(out, merged)
  console.log(
    `${basename(crtPath)} + ${basename(savPath)} (${overlay.sectors.size} ` +
      `sector${overlay.sectors.size === 1 ? '' : 's'})  ->  ${basename(out)}`
  )
  console.log(`  crc32 ${crc32hex(image)} -> ${crc32hex(merged)}`)
  console.log(
    '\nThat is the only path from a save into an image, and it wrote a new file.\n' +
      'Both inputs are untouched.'
  )
}

async function ports() {
  const list = await listPorts()
  if (list.length === 0) return void console.log('No serial ports are present.')
  for (const port of list) console.log(describePort(port))

  const candidates = list.filter((p) => p.arduino)
  if (candidates.length === 1) console.log(`\n--port defaults to ${candidates[0].path}`)
  else if (candidates.length > 1) console.log('\nMore than one Arduino: --port has to say which.')
  else console.log('\nNo Arduino here, so --port has to name one.')
}

// ------------------------------------------------------------- needs a Helper

async function id(_args, opts) {
  await withHelper(opts, async ({ device }) => {
    const u1 = await device.id(0)
    report('U1', u1)
    // A report, but a failing one: `id` is the command someone runs to ask
    // whether the cart is connected, and `id && program` should not carry on.
    if (!u1.present) {
      throw new UserError('nothing answered. Either the slot is empty or the cart is not seated.')
    }

    const u2 = await device.id(1)
    report('U2', u2)
    const total = u1.chipSize + (u2.present ? u2.chipSize : 0)
    const spec = TARGETS.find((t) => t.bytes === total)
    console.log(`\n${(total / 1024).toLocaleString()} KB in total` + (spec ? ` - a ${spec.target} cart` : ''))
  })

  function report(name, chip) {
    const bytes = `$${chip.manufacturer.toString(16).padStart(2, '0').toUpperCase()} ` +
      `$${chip.device.toString(16).padStart(2, '0').toUpperCase()}`
    if (!chip.present) {
      console.log(`${name}  ${bytes}  not fitted, or not answering`)
      return
    }
    console.log(`${name}  ${bytes}  ${chip.part}, ${(chip.chipSize / 1024).toLocaleString()} KB`)
  }
}

async function erase(_args, opts) {
  await withHelper(opts, async ({ device }) => {
    const geometry = await resolveGeometry(device, opts)
    const chip = opts.chip === undefined ? null : integer(opts.chip, 'chip', 0, 1)

    if (opts.sector !== undefined) {
      const sector = integer(opts.sector, 'sector', 0, geometry.bytes / SECTOR_SIZE - 1)
      // With --chip the index is that chip's own; without it, the index counts
      // from the start of the image, so on a 1M cart sector 128 is U2's first.
      const offset = sector * SECTOR_SIZE
      const target = chip ?? Math.floor(offset / geometry.chipSize)
      const addr = chip === null ? offset % geometry.chipSize : offset

      await device.eraseSector(target, addr)
      console.log(`Erased sector ${sector} - U${target + 1} $${hex(addr)}, 4 KB.`)
      return
    }

    for (let c = 0; c < geometry.chips; c++) {
      if (chip !== null && c !== chip) continue
      console.log(`Erasing U${c + 1}...`)
      await device.eraseChip(c)
      console.log(`Erased U${c + 1}.`)
    }
  })
}

async function program(args, opts) {
  const [path] = need(args, 1, 'program <file.crt>')
  const image = await readFile(path)
  const info = describeForProgramming(image, path)

  await withHelper(opts, async ({ device, simulated }) => {
    await checkCart(device, info, simulated)

    const held = sectorsWithData(image)
    console.log(
      `${basename(path)}  ${image.length.toLocaleString()} bytes  ${info.target}, ${info.part}` +
        `  crc32 ${crc32hex(image)}`
    )
    console.log(
      `${held.toLocaleString()} of ${(image.length / SECTOR_SIZE).toLocaleString()} sectors hold data; ` +
        'the rest are $FF and a chip erase has already made them right.'
    )

    const bar = reporter(opts)
    const started = Date.now()
    const result = await programImage(device, image, info, { onProgress: bar.update })
    bar.clear()
    console.log(
      `Programmed ${result.programmed.toLocaleString()} pages, skipped ` +
        `${result.skipped.toLocaleString()}, in ${seconds(started)}.`
    )

    if (opts.verify) {
      const check = await runVerify(device, image, info, opts)
      if (!check.ok) throw new UserError(verifyFailure(check))
      console.log('Verified: every byte of the cart matches the image.')
    }

    // Leave the cart the way a power-on would: bank 0, both chips in read mode.
    // A VCS would reset it anyway, but the next command here might not, and a
    // cart left mid-sequence reads status instead of data.
    await device.resetCart()
  })
}

async function verify(args, opts) {
  const [path] = need(args, 1, 'verify <file.crt>')
  const image = await readFile(path)
  const info = describeForProgramming(image, path)

  await withHelper(opts, async ({ device, simulated }) => {
    await checkCart(device, info, simulated)
    const check = await runVerify(device, image, info, opts)
    if (!check.ok) throw new UserError(verifyFailure(check))
    console.log(`${basename(path)}: every byte of the cart matches the image.`)
  })
}

async function read(args, opts) {
  const [out] = need(args, 1, 'read <out.crt> --size 512K')
  const target = needSize(opts)
  const info = describe(Buffer.alloc(target.bytes))

  await withHelper(opts, async ({ device }) => {
    const bar = reporter(opts)
    const started = Date.now()
    const image = await readImage(device, info, { onProgress: bar.update })
    bar.clear()

    await writeFile(out, image)
    console.log(
      `${basename(out)}  ${image.length.toLocaleString()} bytes  ${target.target}  ` +
        `crc32 ${crc32hex(image)}  in ${seconds(started)}`
    )
  })
}

// ------------------------------------------------------------------- plumbing

async function withHelper(opts, body) {
  const session = await openHelper(opts.port, {
    onWait: () => console.error('Waiting for the Flash Helper to come up...')
  })
  if (session.simulated) {
    warn(
      `--port ${opts.port}: this is ${session.description}. Nothing it reports is\n` +
        '  evidence about real hardware.'
    )
  }
  try {
    await body(session)
  } finally {
    await session.close()
  }
}

/**
 * The image checks `program` and `verify` share.
 *
 * A 32K image is refused outright rather than padded. It is a ROM cart image and
 * would run from flash offset 0 with no vectors anywhere the CPU looks; `layout`
 * is the command that makes it into something a flash cart can boot.
 */
function describeForProgramming(image, path) {
  const info = describe(image, basename(path))
  if (info.warning) warn(info.warning)
  if (info.mapper !== 'banked') {
    throw new UserError(
      `${basename(path)} is a ${image.length.toLocaleString()}-byte ROM cart image, not a flash ` +
        'cart image.\n  `6502-flash layout` lays one onto a flash cart; that image is what to program.'
    )
  }
  return info
}

/** Refuse to program a cart that is not the one the image is for. */
async function checkCart(device, info, simulated) {
  const u1 = await device.id(0)
  if (!u1.present) {
    throw new UserError(
      'no chip answered in the slot' +
        (simulated ? '.' : '. Check the cart is seated, and that the Helper is in its shield header.')
    )
  }
  if (u1.chipSize !== info.chipSize) {
    throw new UserError(
      `the cart's U1 is an ${u1.part} (${(u1.chipSize / 1024).toLocaleString()} KB) but the image ` +
        `needs ${(info.chipSize / 1024).toLocaleString()} KB per chip.\n` +
        '  Programming it would alias the high addresses down and produce a cart that does not run.'
    )
  }
  if (info.chips === 2) {
    const u2 = await device.id(1)
    if (!u2.present) {
      throw new UserError('this is a 1M image, and U2 is not fitted. A 1M image needs both chips.')
    }
  }
}

async function runVerify(device, image, info, opts) {
  const bar = reporter(opts)
  const started = Date.now()
  const check = await verifyImage(device, image, info, { onProgress: bar.update })
  bar.clear()
  if (check.ok && !opts.quiet) console.log(`Read back and compared in ${seconds(started)}.`)
  return check
}

function verifyFailure(check) {
  return (
    `the cart does not match the image. First difference at $${hex(check.offset)}: ` +
      `expected $${byte(check.expected)}, read $${byte(check.actual)}.\n` +
      '  A byte that reads $FF where data was expected is a page that did not program;\n' +
      '  a byte with extra bits set is a sector that did not erase.'
  )
}

/**
 * The cart geometry `erase` works against.
 *
 * With `--size` it is the image's, which is the only way to know that a 1M cart
 * has two chips. Without it, the chip says how big it is and one chip is
 * assumed - true of every build variant but the 1M one.
 */
async function resolveGeometry(device, opts) {
  if (opts.size !== undefined) {
    const target = needSize(opts)
    const chips = target.bytes > 0x80000 ? 2 : 1
    return { bytes: target.bytes, chips, chipSize: target.bytes / chips }
  }
  const u1 = await device.id(0)
  if (!u1.present) throw new UserError('no chip answered in the slot, and no --size was given.')
  return { bytes: u1.chipSize, chips: 1, chipSize: u1.chipSize }
}

function reporter(opts) {
  const live = process.stdout.isTTY && !opts.quiet
  let last = -1
  const clear = () => {
    if (live && last >= 0) process.stdout.write('\r'.padEnd(60) + '\r')
    last = -1
  }
  return {
    clear,
    update({ phase, done = 0, total = 1 }) {
      if (!live) return
      const pct = Math.floor((done / total) * 100)
      if (pct === last) return
      last = pct
      process.stdout.write(`\r${phase.padEnd(8)} ${String(pct).padStart(3)}%`)
    }
  }
}

function need(args, n, usage) {
  if (args.length < n) throw new UserError(`not enough arguments.\n  6502-flash ${usage}`)
  return args
}

function needOut(opts, command) {
  if (!opts.out) throw new UserError(`${command} needs -o <out.crt>: it always writes a new file.`)
  return opts.out
}

function needSize(opts) {
  if (!opts.size) {
    throw new UserError('--size is required here: 128K, 256K, 512K or 1M.')
  }
  const target = byTarget(opts.size.toUpperCase())
  if (!target || target.mapper !== 'banked') {
    throw new UserError(`--size ${opts.size} is not a flash cart target. Use 128K, 256K, 512K or 1M.`)
  }
  return target
}

/** Neither `layout` nor `merge` may write over anything it read. */
function refuseOverwrite(out, inputs) {
  for (const input of inputs) {
    if (resolve(out) === resolve(input)) {
      throw new UserError(`${basename(out)} is an input. This command always writes a new file.`)
    }
  }
}

function integer(value, name, min, max) {
  const n = Number(value)
  if (!Number.isInteger(n) || n < min || n > max) {
    throw new UserError(`--${name} ${value} is not a whole number between ${min} and ${max}.`)
  }
  return n
}

const fixedOf = (target) =>
  (target.bytes > 0x80000 ? target.bytes / 2 : target.bytes) - 0x2000

const hex = (n) => n.toString(16).toUpperCase().padStart(5, '0')
const byte = (n) => n.toString(16).toUpperCase().padStart(2, '0')
const seconds = (since) => `${((Date.now() - since) / 1000).toFixed(1)} s`
const warn = (text) => console.error(`warning: ${text}`)

export { UserError }
