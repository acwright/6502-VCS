// What a `.crt` is, and which mapper it gets.
//
// The rules are 6502-VCS PLAN.md §1, and the one that matters most is rule 2:
// **the mapper is decided by file size, not by the name.**  The sizes cannot
// collide - no 32K flash part is in the BOM and no 128K-and-up EEPROM cart
// exists - so the byte count is sound on its own.  The name is a label for the
// human reading `ls`, and a disagreement between the two is a warning, never an
// error (rule 3).

export const SECTOR_SIZE = 0x1000 // 4 KB, the SST39SF0x0 erase unit
export const BANK_SIZE = 0x2000 // 8 KB, the switchable window

/** Every size a `.crt` may legally be, and what it means. */
export const TARGETS = [
  { target: null,   bytes: 0x008000, part: '28C256 / 27C256', mapper: 'flat'   },
  { target: '128K', bytes: 0x020000, part: 'SST39SF010A',     mapper: 'banked' },
  { target: '256K', bytes: 0x040000, part: 'SST39SF020A',     mapper: 'banked' },
  { target: '512K', bytes: 0x080000, part: 'SST39SF040',      mapper: 'banked' },
  { target: '1M',   bytes: 0x100000, part: 'SST39SF040 x2',   mapper: 'banked' }
]

export const byTarget = (t) => TARGETS.find((x) => x.target === (t ?? null)) ?? null
export const bySize = (n) => TARGETS.find((x) => x.bytes === n) ?? null

/**
 * Pull the build variant and ROM target back out of a file name.
 *
 * `Cart-VDP-512K.crt` -> { stem: 'Cart', vdp: true, target: '512K' }
 *
 * `-VDP` always comes before the target (PLAN.md §1), so a name that spells it
 * the other way round parses as a stem of `Cart-512K` with no target, and the
 * size check then reports the disagreement.
 */
export function parseName(filename) {
  const base = filename.replace(/^.*[\\/]/, '').replace(/\.crt$/i, '')
  const m = base.match(/^(.*?)(-VDP)?(?:-(128K|256K|512K|1M))?$/i)
  return {
    stem: m[1],
    vdp: Boolean(m[2]),
    target: m[3] ? m[3].toUpperCase() : null
  }
}

/**
 * Describe an image: its mapper, its chips, and whether the name agrees.
 *
 * `warning` is set when the name claims a target the byte count contradicts.
 * The caller reports it and carries on with what the bytes say.
 */
export function describe(bytes, filename = '') {
  const spec = bySize(bytes.length)
  if (!spec) {
    const sizes = TARGETS.map((t) => t.bytes.toLocaleString()).join(', ')
    throw new Error(
      `${filename || 'image'} is ${bytes.length.toLocaleString()} bytes, ` +
        `which is not a cartridge image (expected one of ${sizes})`
    )
  }
  const chips = spec.bytes > 0x80000 ? 2 : 1
  const chipSize = spec.bytes / chips
  const info = {
    ...spec,
    chips,
    chipSize,
    banks: spec.mapper === 'banked' ? chipSize / BANK_SIZE : 0,
    /** The primary chip's last 8 KB: what $E000-$FFFF always reads. */
    fixedOffset: spec.mapper === 'banked' ? chipSize - BANK_SIZE : null,
    warning: null
  }
  if (filename) {
    const named = parseName(filename).target
    if (named !== spec.target) {
      info.warning =
        `${filename} is named for ${named ?? 'a 32K ROM cart'} but is ` +
        `${bytes.length.toLocaleString()} bytes, so it is ${spec.target ?? 'a 32K ROM cart'}. ` +
        `Going by the bytes.`
    }
  }
  return info
}
