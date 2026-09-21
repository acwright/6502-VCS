import assert from 'node:assert/strict'
import test from 'node:test'

import { crc16 } from '../src/crc16.js'

// The check value every CRC-16/XMODEM implementation is published with. If this
// one line passes, the parameters are right: polynomial $1021, initial value 0,
// MSB first, no reflection and no final XOR.
test('the published check value', () => {
  assert.equal(crc16(Buffer.from('123456789')), 0x31c3)
})

test('an empty buffer is 0, which is the initial value', () => {
  assert.equal(crc16(Buffer.alloc(0)), 0)
})

test('a zero initial value is blind to leading zero bytes', () => {
  // A known property of this parameter set, written down rather than worked
  // around: with an initial value of 0, any number of leading $00 bytes checks
  // the same as none at all.
  //
  // It cannot bite here, and it is worth being clear about why. The CRC is
  // computed from the command byte onwards, and every command is $01 to $08, so
  // the first byte covered is never zero. Padding a frame with leading zeros
  // would not sneak past the check either: the sync bytes come before the CRC's
  // first byte, so a zero there is not covered and is not framing.
  assert.equal(crc16(Buffer.alloc(8)), 0)
  assert.equal(crc16(Buffer.from([0x00, 0x01])), crc16(Buffer.from([0x01])))
  assert.notEqual(crc16(Buffer.from([0x01, 0x00])), crc16(Buffer.from([0x01])))
})

test('it is 16 bits wide, for every length', () => {
  for (let n = 0; n < 300; n++) {
    const crc = crc16(Buffer.alloc(n, 0xa5))
    assert.ok(crc >= 0 && crc <= 0xffff, `${n} bytes gave ${crc}`)
  }
})

test('one flipped bit changes it', () => {
  const clean = Buffer.from([0x06, 0x04, 0x01, 0xaa, 0x55])
  for (let i = 0; i < clean.length; i++) {
    for (let bit = 0; bit < 8; bit++) {
      const dirty = Buffer.from(clean)
      dirty[i] ^= 1 << bit
      assert.notEqual(crc16(dirty), crc16(clean))
    }
  }
})
