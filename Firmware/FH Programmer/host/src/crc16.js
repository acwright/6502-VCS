// CRC-16/XMODEM: polynomial 0x1021, initial value 0, MSB first, no reflection
// and no final XOR.
//
// This is the frame check of the Helper's serial protocol (6502-VCS PLAN.md
// §5.3), and it is a different checksum from `crc32.js` on purpose: that one
// ties a `.sav` to the build of the cartridge it belongs to, this one catches a
// dropped byte on a 500 kbaud USB link. The firmware carries the same function
// in `src/protocol.cpp`, written the same way, so that a disagreement between
// them would be a transcription error and nothing subtler.

export function crc16(bytes) {
  let crc = 0
  for (let i = 0; i < bytes.length; i++) {
    crc ^= bytes[i] << 8
    for (let bit = 0; bit < 8; bit++) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff
    }
  }
  return crc
}
