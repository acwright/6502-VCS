// Putting an existing 16K cartridge image onto a flash cart.
//
// From Hardware/Flash Cart/Rev 1.0/DESIGN.md, "Legacy 16K images": the bank
// register resets to 0, so at power-on the CPU sees bank 0 at $C000 and the
// fixed bank at $E000.  Laying the two halves of a 16K image at those two
// places is all it takes for an existing cartridge to run unmodified.
//
//   image $0000-$1FFF ($C000-$DFFF)  ->  flash offset $00000, bank 0
//   image $2000-$3FFF ($E000-$FFFF)  ->  the primary chip's last 8 KB
//
// The caveat, worth repeating wherever this is used: a legacy game that writes
// to its own ROM area at $E000-$FFFF will change banks instead.

import { BANK_SIZE, byTarget, describe } from './image.js'

/** Where $E000-$FFFF lives in the file, for a given target. */
export const fixedOffsetFor = (target) => {
  const spec = byTarget(target)
  if (!spec || spec.mapper !== 'banked') throw new Error(`${target} is not a flash cart target`)
  const chipSize = spec.bytes > 0x80000 ? spec.bytes / 2 : spec.bytes
  return chipSize - BANK_SIZE
}

/**
 * Lay a 32,768-byte ROM cart image out as a flash cart image.
 *
 * The input spans $8000-$FFFF so it can be burnt straight to a 28C256; only the
 * top 16K is cartridge, the low half being padding the machine never reads.
 *
 * Everything not written is left at $FF, the erased state, so `program` can skip
 * those sectors outright after a chip erase.
 */
export function legacyToFlash(crt, target) {
  const info = describe(crt)
  if (info.mapper !== 'flat') {
    throw new Error('input is already a flash cart image; legacy layout takes a 32K ROM cart image')
  }
  const spec = byTarget(target)
  if (!spec || spec.mapper !== 'banked') throw new Error(`${target} is not a flash cart target`)

  const out = Buffer.alloc(spec.bytes, 0xff)
  crt.copy(out, 0, 0x4000, 0x6000) // $C000-$DFFF -> bank 0
  crt.copy(out, fixedOffsetFor(target), 0x6000, 0x8000) // $E000-$FFFF -> fixed bank
  return out
}
