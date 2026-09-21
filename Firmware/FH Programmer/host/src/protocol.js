// The Flash Helper's framed serial protocol (6502-VCS PLAN.md §5.3).
//
//   request   AA 55 | cmd       | len:u16 | payload        | crc16
//   response  AA 55 | cmd | $80 | len:u16 | status payload | crc16
//
// Little-endian, like the `.sav` container. The CRC covers everything between
// the sync bytes and the CRC itself - the command byte, the length and the
// payload - and is CRC-16/XMODEM.
//
// **Every command answers with a frame**, and a response always carries at
// least its status byte. Nothing is fire-and-forget: a 512 KB program is 2,048
// acknowledged pages, which is what makes a progress bar honest and what lets
// this tool stop on the page that failed rather than at the end.
//
// A response echoes its command with bit 7 set, so a host that has lost its
// place can tell a reply from a request, and a reply to the wrong command is an
// error rather than a misread payload.
//
// This module is pure: frames in, frames out, no I/O. `link.js` puts it on a
// stream and `fake.js` answers it without one.

import { crc16 } from './crc16.js'

export const SYNC0 = 0xaa
export const SYNC1 = 0x55
export const REPLY = 0x80

/** The fixed part of a frame: two sync bytes, a command, a length, a CRC. */
export const FRAME_OVERHEAD = 7

/** PROGRAM_PAGE's chip + 3-byte address + 256 bytes, the longest either way. */
export const MAX_PAYLOAD = 260

/** 256 bytes: the unit PROGRAM_PAGE and READ_PAGE move. */
export const PAGE_SIZE = 256

export const CMD = {
  PING: 0x01,
  VERSION: 0x02,
  ID: 0x03,
  ERASE_CHIP: 0x04,
  ERASE_SECTOR: 0x05,
  PROGRAM_PAGE: 0x06,
  READ_PAGE: 0x07,
  RESET_CART: 0x08
}

export const CMD_NAME = Object.fromEntries(Object.entries(CMD).map(([k, v]) => [v, k]))

export const STATUS = {
  OK: 0x00,
  CRC: 0x01,
  LEN: 0x02,
  CMD: 0x03,
  ARG: 0x04,
  TIMEOUT: 0x05,
  FRAME: 0x06
}

/** What each status means, in the words the CLI prints. */
export const STATUS_TEXT = {
  [STATUS.OK]: 'ok',
  [STATUS.CRC]: 'the Helper saw a corrupt frame',
  [STATUS.LEN]: 'the Helper rejected the payload length',
  [STATUS.CMD]: 'the Helper does not know that command',
  [STATUS.ARG]: 'an argument was out of range or misaligned',
  [STATUS.TIMEOUT]: 'the flash stayed busy past its window - is a cart in the slot?',
  [STATUS.FRAME]: 'a frame reached the Helper truncated'
}

/** A command answered with a status other than OK. */
export class HelperError extends Error {
  constructor(cmd, status) {
    const name = CMD_NAME[cmd & ~REPLY] ?? `command $${(cmd & ~REPLY).toString(16)}`
    super(`${name}: ${STATUS_TEXT[status] ?? `status $${status.toString(16).padStart(2, '0')}`}`)
    this.name = 'HelperError'
    this.cmd = cmd & ~REPLY
    this.status = status
  }
}

/** Build a frame. Used for requests here, and for replies by `fake.js`. */
export function encode(cmd, payload = Buffer.alloc(0)) {
  const body = Buffer.alloc(3 + payload.length)
  body.writeUInt8(cmd, 0)
  body.writeUInt16LE(payload.length, 1)
  Buffer.from(payload).copy(body, 3)

  const out = Buffer.alloc(2 + body.length + 2)
  out[0] = SYNC0
  out[1] = SYNC1
  body.copy(out, 2)
  out.writeUInt16LE(crc16(body), out.length - 2)
  return out
}

/** Build a reply: the command echoed with bit 7 set, then the status byte. */
export function encodeReply(cmd, status, payload = Buffer.alloc(0)) {
  return encode(cmd | REPLY, Buffer.concat([Buffer.from([status]), Buffer.from(payload)]))
}

/**
 * Turn a byte stream into frames.
 *
 * Resyncing is the whole job. The sync bytes can occur inside a payload, so
 * they are only looked for between frames; once a header is accepted the length
 * decides where the frame ends. A length no frame could carry is treated as
 * corruption of the header itself, and the scan restarts past that sync pair
 * rather than swallowing a count it does not believe.
 *
 * A frame whose CRC fails is still delivered, with `crcOk: false`. Dropping it
 * silently would turn a bad cable into a timeout, which is a much harder thing
 * to diagnose than a reported bad frame.
 */
export class FrameParser {
  #buf = Buffer.alloc(0)

  push(chunk) {
    this.#buf = this.#buf.length ? Buffer.concat([this.#buf, chunk]) : Buffer.from(chunk)
    const frames = []
    for (;;) {
      let i = 0
      while (i + 1 < this.#buf.length && !(this.#buf[i] === SYNC0 && this.#buf[i + 1] === SYNC1)) i++
      if (i > 0) this.#buf = this.#buf.subarray(i)
      if (this.#buf.length < FRAME_OVERHEAD) return frames
      if (!(this.#buf[0] === SYNC0 && this.#buf[1] === SYNC1)) return frames

      const len = this.#buf.readUInt16LE(3)
      if (len > MAX_PAYLOAD + 1) {
        this.#buf = this.#buf.subarray(2) // the header is the corruption; resync past it
        continue
      }
      const total = 5 + len + 2
      if (this.#buf.length < total) return frames

      const body = this.#buf.subarray(2, 5 + len)
      frames.push({
        cmd: this.#buf[2],
        payload: Buffer.from(this.#buf.subarray(5, 5 + len)),
        crcOk: crc16(body) === this.#buf.readUInt16LE(5 + len)
      })
      this.#buf = this.#buf.subarray(total)
    }
  }
}
