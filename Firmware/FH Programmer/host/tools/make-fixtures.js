#!/usr/bin/env node
// Generates the cartridge test fixtures.
//
// These four files are the shared oracle for the whole Flash Cart rollout
// (6502-VCS PLAN.md §5.5).  6502-EMULATOR's mapper, the PicoCalc port, the DB
// Emulator and this tool all check against *them* rather than against each
// other, which is the only way four independent implementations of the same
// contract end up agreeing.
//
//   node tools/make-fixtures.js           rewrite them
//   node tools/make-fixtures.js --check   fail if any is stale
//
// Everything here is deterministic.  Nothing is random, nothing is timestamped,
// and regenerating must produce byte-identical files or the check is worthless.

import { writeFileSync, readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { crc32hex } from '../src/crc32.js'
import { BANK_SIZE, SECTOR_SIZE } from '../src/image.js'
import { legacyToFlash } from '../src/layout.js'
import * as sav from '../src/sav.js'

const DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'test', 'fixtures')

// A cartridge's three vectors, pointing into the fixed bank, so the fixtures
// look like something that could actually boot.
const NMI = 0xe003
const RESET = 0xe000
const IRQ = 0xe006
const putVectors = (buf, at) => {
  buf.writeUInt16LE(NMI, at)
  buf.writeUInt16LE(RESET, at + 2)
  buf.writeUInt16LE(IRQ, at + 4)
}

// Tags are all exactly 16 bytes so they never shift what follows them.
const tag = (s) => {
  const b = Buffer.from(s, 'latin1')
  if (b.length !== 16) throw new Error(`tag ${JSON.stringify(s)} is ${b.length} bytes, need 16`)
  return b
}
const hex2 = (n) => n.toString(16).toUpperCase().padStart(2, '0')

// --- legacy.crt ------------------------------------------------------------
// A 32,768-byte ROM cart image spanning $8000-$FFFF.  The low half is the
// padding a 28C256 carries and the machine never reads; the top 16K is the
// cartridge.  Every byte in the cartridge half is the high byte of its own CPU
// address, so a hex dump says where you are and any misplacement is obvious.
function legacy() {
  const buf = Buffer.alloc(0x8000, 0x00)
  for (let i = 0x4000; i < 0x8000; i++) buf[i] = (0x8000 + i) >> 8
  tag('AC6502 LEGACY C0').copy(buf, 0x4000) // at $C000
  tag('AC6502 LEGACY E0').copy(buf, 0x6000) // at $E000
  putVectors(buf, 0x7ffa) // $FFFA
  return buf
}

// --- banked-128K.crt -------------------------------------------------------
// Sixteen 8 KB banks on an SST39SF010A.  Every byte of a bank is that bank's
// number, so reading the wrong bank is a wrong byte rather than a hang, and the
// 16-byte tags at each end catch an offset error inside a bank that a constant
// fill would hide.
//
// Bank 15 is the fixed bank: on a 128K part the high bank bits are not bonded,
// so register value $3F aliases down to it and $E000-$FFFF always reads here.
function banked128k() {
  const banks = 16
  const buf = Buffer.alloc(banks * BANK_SIZE)
  for (let b = 0; b < banks; b++) {
    const at = b * BANK_SIZE
    buf.fill(b, at, at + BANK_SIZE)
    if (b === banks - 1) {
      tag(`AC6502 FIXED $${hex2(b)}`).copy(buf, at)
      Buffer.from('FIXED END\n', 'latin1').copy(buf, at + BANK_SIZE - 16)
      putVectors(buf, at + BANK_SIZE - 6)
    } else {
      tag(`AC6502 BANK $${hex2(b)}\n`).copy(buf, at)
      tag(`END OF BANK $${hex2(b)}\n`).copy(buf, at + BANK_SIZE - 16)
    }
  }
  return buf
}

// --- sample.sav ------------------------------------------------------------
// Three dirty sectors against banked-128K.crt, deliberately not contiguous, to
// prove ascending-order writing and a low sector alongside high ones.  Sectors
// 28 and 29 are bank 14, the highest usable bank - where the 6502-CRT template
// tells a cartridge to keep its saves.
function sample(image) {
  const sector = (text) => {
    const s = Buffer.alloc(SECTOR_SIZE, 0xff)
    Buffer.from(text, 'latin1').copy(s)
    for (let i = 64; i < SECTOR_SIZE; i++) s[i] = i & 0xff
    return s
  }
  return sav.write(
    image,
    new Map([
      [29, sector('AC6502 SAVE SECTOR 29 - bank $0E, upper half\n')],
      [0, sector('AC6502 SAVE SECTOR 00 - bank $00, lowest sector\n')],
      [28, sector('AC6502 SAVE SECTOR 28 - bank $0E, lower half\n')]
    ])
  )
}

// ---------------------------------------------------------------------------
const legacyCrt = legacy()
const bankedCrt = banked128k()
const files = {
  'legacy.crt': legacyCrt,
  'legacy-512K.crt': legacyToFlash(legacyCrt, '512K'),
  'banked-128K.crt': bankedCrt,
  'sample.sav': sample(bankedCrt)
}

const check = process.argv.includes('--check')
let stale = 0
for (const [name, bytes] of Object.entries(files)) {
  const path = join(DIR, name)
  const current = existsSync(path) ? readFileSync(path) : null
  const same = current && current.equals(bytes)
  if (check) {
    if (!same) {
      console.error(`stale: ${name}`)
      stale++
    }
  } else if (!same) {
    writeFileSync(path, bytes)
  }
  console.log(
    `${same ? ' ' : check ? '!' : '*'} ${name.padEnd(17)} ` +
      `${bytes.length.toLocaleString().padStart(9)} bytes  crc32 ${crc32hex(bytes)}`
  )
}
if (check && stale) {
  console.error(`\n${stale} fixture(s) out of date. Run: npm run fixtures`)
  process.exit(1)
}
