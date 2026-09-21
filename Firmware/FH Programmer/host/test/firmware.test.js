// The firmware and this tool are two halves of one protocol, written in two
// languages, and nothing but agreement makes them work. So these tests read the
// firmware's own headers and check the numbers against `protocol.js`.
//
// It is a cheap guard against the one failure that would be miserable to chase:
// a command renumbered on one side only. The symptom would be a Helper
// answering the wrong thing to the right question, at a point where the obvious
// suspects are the cable, the board and the cart.
//
// It cannot check behaviour, only constants. The board is still the only thing
// that proves the board.

import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import { CMD, MAX_PAYLOAD, PAGE_SIZE, REPLY, STATUS, SYNC0, SYNC1 } from '../src/protocol.js'
import { SECTOR_SIZE } from '../src/image.js'

/** Every `#define NAME value` in a header, with the numbers parsed. */
/** The firmware's own headers live a directory up: `Firmware/FH Programmer/src/`. */
async function defines(name) {
  const source = await readFile(new URL(`../../src/${name}`, import.meta.url), 'utf8')
  const out = new Map()
  for (const [, key, value] of source.matchAll(/^#define\s+(\w+)\s+(0x[0-9a-fA-F]+|\d+)U?L?\b/gm)) {
    out.set(key, Number(value))
  }
  return out
}

test('the frame constants match', async () => {
  const fw = await defines('protocol.h')
  assert.equal(fw.get('FRAME_SYNC0'), SYNC0)
  assert.equal(fw.get('FRAME_SYNC1'), SYNC1)
  assert.equal(fw.get('FRAME_REPLY'), REPLY)
  assert.equal(fw.get('MAX_PAYLOAD'), MAX_PAYLOAD)
})

test('every command has the same number on both sides', async () => {
  const fw = await defines('protocol.h')
  for (const [name, value] of Object.entries(CMD)) {
    assert.equal(fw.get(`CMD_${name}`), value, `CMD_${name}`)
  }
  // And the firmware defines no command this tool has never heard of.
  const theirs = [...fw.keys()].filter((k) => k.startsWith('CMD_')).length
  assert.equal(theirs, Object.keys(CMD).length)
})

test('every status has the same number on both sides', async () => {
  const fw = await defines('protocol.h')
  const spelt = { OK: 'ST_OK', CRC: 'ST_CRC', LEN: 'ST_LEN', CMD: 'ST_CMD',
                  ARG: 'ST_ARG', TIMEOUT: 'ST_TIMEOUT', FRAME: 'ST_FRAME' }
  for (const [name, value] of Object.entries(STATUS)) {
    assert.equal(fw.get(spelt[name]), value, spelt[name])
  }
  assert.equal([...fw.keys()].filter((k) => k.startsWith('ST_')).length, Object.keys(STATUS).length)
})

test('the page and sector sizes match', async () => {
  const fw = await defines('flash.h')
  assert.equal(fw.get('FLASH_PAGE_SIZE'), PAGE_SIZE)
  assert.equal(fw.get('FLASH_SECTOR_SIZE'), SECTOR_SIZE)
  assert.equal(fw.get('FLASH_MAX_SIZE'), 0x80000, 'the largest SST39SF0x0 in the family')
})

test('the firmware calls the primary chip 0 and the secondary 1', async () => {
  const fw = await defines('flash.h')
  assert.equal(fw.get('FLASH_PRIMARY'), 0)
  assert.equal(fw.get('FLASH_SECONDARY'), 1)
})

test('the platformio.ini monitor speed is the protocol speed', async () => {
  const ini = await readFile(new URL('../../platformio.ini', import.meta.url), 'utf8')
  const { BAUD_RATE } = await import('../src/serial.js')
  assert.match(ini, new RegExp(`monitor_speed\\s*=\\s*${BAUD_RATE}`))
})
