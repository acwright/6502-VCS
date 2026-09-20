// The `.sav` sidecar: flash writes that must never reach a chip by accident.
//
// The whole point of this container is stated in 6502-VCS PLAN.md §4.  A `.crt`
// is opened read-only by every emulator, always; anything a running cartridge
// programs into its own flash accumulates here instead, beside the image and
// never inside it.  `6502-flash program` reads the `.crt` and nothing else, and
// the only path from a `.sav` back into an image is the explicit `merge`
// command, which writes a new file.
//
// Records are 4 KB because that is the SST39SF0x0's erase unit, so the
// container's granularity is the chip's granularity.
//
// Layout, little-endian throughout:
//
//   offset  size  field
//     0      4    magic      'A' 'C' 'S' 'V'
//     4      1    version    1
//     5      1    reserved   0
//     6      2    count      number of sector records
//     8      4    image_size the size of the .crt this belongs to
//    12      4    image_crc  CRC-32 of the whole .crt
//    16    ...    records    count x [ 4-byte sector index ][ 4096 bytes ]

import { crc32, crc32hex } from './crc32.js'
import { SECTOR_SIZE } from './image.js'

export const MAGIC = 'ACSV'
export const VERSION = 1
export const HEADER_SIZE = 16
export const RECORD_SIZE = 4 + SECTOR_SIZE

/** Thrown when a `.sav` does not belong to the image it is being applied to. */
export class SaveMismatchError extends Error {
  constructor(message, detail) {
    super(message)
    this.name = 'SaveMismatchError'
    Object.assign(this, detail)
  }
}

/**
 * Which 4 KB sectors of `modified` differ from `original`.
 * Returns a Map of sector index -> 4 KB Buffer, in ascending index order.
 */
export function diffSectors(original, modified) {
  if (original.length !== modified.length) {
    throw new Error('images differ in length; they are not the same cartridge')
  }
  const out = new Map()
  for (let i = 0; i < original.length; i += SECTOR_SIZE) {
    const a = original.subarray(i, i + SECTOR_SIZE)
    const b = modified.subarray(i, i + SECTOR_SIZE)
    if (!a.equals(b)) out.set(i / SECTOR_SIZE, Buffer.from(b))
  }
  return out
}

/**
 * Build a `.sav` for `sectors` against `image`.
 * `sectors` is a Map (or any iterable of [index, bytes]); order does not matter,
 * records are always written ascending.
 */
export function write(image, sectors) {
  const list = [...sectors].sort((a, b) => a[0] - b[0])
  for (const [index, bytes] of list) {
    if (bytes.length !== SECTOR_SIZE) {
      throw new Error(`sector ${index} is ${bytes.length} bytes, expected ${SECTOR_SIZE}`)
    }
    if (index < 0 || (index + 1) * SECTOR_SIZE > image.length) {
      throw new Error(`sector ${index} lies outside a ${image.length}-byte image`)
    }
  }
  const out = Buffer.alloc(HEADER_SIZE + list.length * RECORD_SIZE)
  out.write(MAGIC, 0, 'latin1')
  out.writeUInt8(VERSION, 4)
  out.writeUInt8(0, 5)
  out.writeUInt16LE(list.length, 6)
  out.writeUInt32LE(image.length, 8)
  out.writeUInt32LE(crc32(image), 12)
  let p = HEADER_SIZE
  for (const [index, bytes] of list) {
    out.writeUInt32LE(index, p)
    Buffer.from(bytes).copy(out, p + 4)
    p += RECORD_SIZE
  }
  return out
}

/** Parse a `.sav`. Throws on anything malformed; does not check it against an image. */
export function read(buf) {
  if (buf.length < HEADER_SIZE) throw new Error('save file is too short to hold a header')
  if (buf.toString('latin1', 0, 4) !== MAGIC) throw new Error('not a .sav file (bad magic)')
  const version = buf.readUInt8(4)
  if (version !== VERSION) throw new Error(`save file version ${version}, expected ${VERSION}`)
  const count = buf.readUInt16LE(6)
  const expected = HEADER_SIZE + count * RECORD_SIZE
  if (buf.length !== expected) {
    throw new Error(`save file is ${buf.length} bytes, expected ${expected} for ${count} sectors`)
  }
  const sectors = new Map()
  let last = -1
  for (let i = 0; i < count; i++) {
    const p = HEADER_SIZE + i * RECORD_SIZE
    const index = buf.readUInt32LE(p)
    if (index <= last) throw new Error('save file sectors are not in ascending order')
    last = index
    sectors.set(index, Buffer.from(buf.subarray(p + 4, p + 4 + SECTOR_SIZE)))
  }
  return {
    version,
    imageSize: buf.readUInt32LE(8),
    imageCrc: buf.readUInt32LE(12),
    sectors
  }
}

/**
 * Apply a `.sav` over a copy of `image`.
 *
 * The size and CRC in the header are what make this safe: rebuild the cartridge
 * and the CRC moves, so a stale save is refused rather than laid over new code.
 * Callers report the refusal and start the cartridge without the overlay - they
 * do not delete the file.
 */
export function apply(image, sav) {
  const save = Buffer.isBuffer(sav) ? read(sav) : sav
  if (save.imageSize !== image.length) {
    throw new SaveMismatchError(
      `save data belongs to a ${save.imageSize.toLocaleString()}-byte cartridge, ` +
        `not this ${image.length.toLocaleString()}-byte one`,
      { expectedSize: save.imageSize, actualSize: image.length }
    )
  }
  const actual = crc32(image)
  if (save.imageCrc !== actual) {
    throw new SaveMismatchError(
      'save data belongs to a different build of this cartridge ' +
        `(save ${save.imageCrc.toString(16).padStart(8, '0')}, ` +
        `image ${crc32hex(image)})`,
      { expectedCrc: save.imageCrc, actualCrc: actual }
    )
  }
  const out = Buffer.from(image)
  for (const [index, bytes] of save.sectors) {
    const at = index * SECTOR_SIZE
    if (at + SECTOR_SIZE > out.length) {
      throw new SaveMismatchError(`save sector ${index} lies outside the image`, { index })
    }
    bytes.copy(out, at)
  }
  return out
}
