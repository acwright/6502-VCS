import assert from 'node:assert/strict'
import test from 'node:test'

import { crc16 } from '../src/crc16.js'
import {
  CMD,
  FrameParser,
  MAX_PAYLOAD,
  REPLY,
  STATUS,
  SYNC0,
  SYNC1,
  encode,
  encodeReply
} from '../src/protocol.js'

const parse = (...chunks) => {
  const parser = new FrameParser()
  return chunks.flatMap((chunk) => parser.push(Buffer.from(chunk)))
}

test('a PING frame is the seven bytes the firmware expects', () => {
  // Byte for byte, because this exact frame was sent to a Mega 2560 running
  // the firmware and answered: AA 55 | cmd | len:u16 | crc16.
  assert.equal(encode(CMD.PING).toString('hex'), 'aa550100003037')
})

test('the length is little-endian, like the .sav container', () => {
  const frame = encode(CMD.PROGRAM_PAGE, Buffer.alloc(260))
  assert.equal(frame[3], 260 & 0xff)
  assert.equal(frame[4], 260 >> 8)
})

test('the CRC covers the command and length, not the sync bytes', () => {
  const frame = encode(CMD.ID, Buffer.from([1]))
  const body = frame.subarray(2, frame.length - 2)
  assert.equal(frame.readUInt16LE(frame.length - 2), crc16(body))
})

test('a reply echoes its command with bit 7 set and leads with the status', () => {
  const frame = encodeReply(CMD.READ_PAGE, STATUS.OK, Buffer.alloc(256, 0x5a))
  const [got] = parse(frame)
  assert.equal(got.cmd, CMD.READ_PAGE | REPLY)
  assert.equal(got.payload[0], STATUS.OK)
  assert.equal(got.payload.length, 257)
  assert.ok(got.crcOk)
})

test('a frame survives being split anywhere', () => {
  const frame = encode(CMD.ERASE_SECTOR, Buffer.from([0, 0, 0x10, 0]))
  for (let at = 1; at < frame.length; at++) {
    const frames = parse(frame.subarray(0, at), frame.subarray(at))
    assert.equal(frames.length, 1, `split at ${at}`)
    assert.ok(frames[0].crcOk)
  }
})

test('several frames in one chunk all come out', () => {
  const frames = parse(Buffer.concat([encode(CMD.PING), encode(CMD.VERSION), encode(CMD.PING)]))
  assert.deepEqual(
    frames.map((f) => f.cmd),
    [CMD.PING, CMD.VERSION, CMD.PING]
  )
})

test('junk before a frame is skipped', () => {
  const [got] = parse(Buffer.concat([Buffer.alloc(64, 0x5a), encode(CMD.PING)]))
  assert.equal(got.cmd, CMD.PING)
  assert.ok(got.crcOk)
})

test('a lone $AA does not eat the sync that follows it', () => {
  // AA AA 55 has to sync on the second AA, which is why the parser carries the
  // previous byte rather than testing pairs. The firmware was checked against
  // this case on the bench and behaves the same way.
  const [got] = parse(Buffer.concat([Buffer.from([0xaa, 0xaa]), encode(CMD.PING)]))
  assert.equal(got.cmd, CMD.PING)
})

test('the sync bytes inside a payload are not mistaken for a header', () => {
  const payload = Buffer.alloc(260)
  payload.fill(0xaa)
  for (let i = 1; i < payload.length; i += 2) payload[i] = 0x55
  const [got] = parse(encode(CMD.PROGRAM_PAGE, payload))
  assert.equal(got.payload.length, 260)
  assert.ok(got.crcOk)
})

test('a bad CRC is delivered, not dropped', () => {
  // Dropping it silently would turn a bad cable into a timeout, which is a far
  // harder thing to diagnose than a reported bad frame.
  const frame = encode(CMD.PING)
  frame[frame.length - 1] ^= 0xff
  const [got] = parse(frame)
  assert.equal(got.cmd, CMD.PING)
  assert.equal(got.crcOk, false)
})

test('a length no frame could carry is treated as a corrupt header', () => {
  const frames = parse(
    Buffer.concat([Buffer.from([SYNC0, SYNC1, CMD.PING, 0xff, 0xff]), encode(CMD.VERSION)])
  )
  assert.equal(frames.length, 1)
  assert.equal(frames[0].cmd, CMD.VERSION)
})

test('a truncated frame takes the next one down with it, and then recovers', () => {
  // This is the parser behaving correctly, not a bug to fix here. A header is
  // believed: once its length says four more bytes are coming, the four bytes
  // that arrive next are that payload, whatever they were meant to be. So a
  // half-sent frame consumes the frame behind it and comes out with a bad CRC.
  //
  // Recovering is `link.js`'s job and it does it with time, which a parser over
  // a byte stream does not have: a command that gets no reply times out, and
  // the next one drains first. The firmware does the same thing from the other
  // end with its own inter-byte timeout - both halves were checked against a
  // Mega 2560, which answered the truncation with ST_FRAME and the very next
  // PING normally.
  const parser = new FrameParser()
  assert.deepEqual(parser.push(Buffer.from([SYNC0, SYNC1, CMD.READ_PAGE, 0x04, 0x00, 0x01])), [])

  const wreck = parser.push(encode(CMD.PING))
  assert.equal(wreck.length, 1)
  assert.equal(wreck[0].cmd, CMD.READ_PAGE)
  assert.equal(wreck[0].crcOk, false)

  const [recovered] = parser.push(encode(CMD.PING))
  assert.equal(recovered.cmd, CMD.PING)
  assert.ok(recovered.crcOk)
})

test('MAX_PAYLOAD is PROGRAM_PAGE, the longest command there is', () => {
  assert.equal(MAX_PAYLOAD, 1 + 3 + 256)
})
