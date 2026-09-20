import { test } from 'node:test'
import assert from 'node:assert/strict'
import { crc32, crc32hex } from '../src/crc32.js'

// The published check values for CRC-32/ISO-HDLC. If these pass, an AVR or C
// implementation that also passes them will agree with this one.
test('known check vectors', () => {
  assert.equal(crc32(Buffer.from('123456789')), 0xcbf43926)
  assert.equal(crc32(Buffer.alloc(0)), 0x00000000)
  assert.equal(crc32(Buffer.from([0x00])), 0xd202ef8d)
  assert.equal(crc32(Buffer.alloc(32, 0xff)), 0xff6cab0b)
})

test('hex form is eight lowercase digits', () => {
  assert.equal(crc32hex(Buffer.from('123456789')), 'cbf43926')
  assert.equal(crc32hex(Buffer.alloc(0)), '00000000')
})

test('a single flipped bit changes the checksum', () => {
  const a = Buffer.alloc(4096, 0x5a)
  const b = Buffer.from(a)
  b[2048] ^= 0x01
  assert.notEqual(crc32(a), crc32(b))
})
