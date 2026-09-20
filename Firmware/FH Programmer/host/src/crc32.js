// CRC-32, IEEE 802.3 / zlib: reflected, polynomial 0xEDB88320, init and final
// XOR of 0xFFFFFFFF.
//
// This is the checksum the `.sav` container carries to tie a save to the exact
// `.crt` it was written against (6502-VCS PLAN.md §4).  The Flash Helper
// firmware, the emulators and this tool all have to agree on it, so the
// implementation is deliberately the plainest possible one.

const TABLE = new Uint32Array(256)
for (let n = 0; n < 256; n++) {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  TABLE[n] = c >>> 0
}

/** CRC-32 of `bytes`, as an unsigned 32-bit number. */
export function crc32(bytes) {
  let c = 0xffffffff
  for (let i = 0; i < bytes.length; i++) c = TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

/** The same value as eight lowercase hex digits, which is how it is printed. */
export const crc32hex = (bytes) => crc32(bytes).toString(16).padStart(8, '0')
