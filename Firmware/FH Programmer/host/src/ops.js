// Program, verify and read back: the three things that move a whole image.
//
// Two rules from PLAN.md shape all of this.
//
// **§1 rule 4 - on a `-1M` image, U1 is the first 512 KB and U2 is the second.**
// The Helper has no idea how big a cart is; it only ever sees one bus and the
// part is soldered down. So the split is here, in `locate`, and it is the only
// place in the tool that knows a chip boundary exists.
//
// **Skip erased pages.** Cart configs fill with `$FF` (6502-CRT PLAN.md §2), so
// a 512K image from a small cart is mostly `$FF` and is mostly already correct
// after a chip erase. Skipping is exact rather than an approximation, and for
// two independent reasons: a chip erase leaves `$FF` everywhere, and a byte
// program clears bits only, so programming `$FF` could not change anything even
// if the sector had not been erased. The plan states the rule per 4 KB sector;
// doing it per 256-byte page is the same rule at a finer grain, and it saves the
// round trip as well as the programming.

import { SECTOR_SIZE } from './image.js'
import { PAGE_SIZE } from './protocol.js'

/** Which chip a byte offset lands on, and where on it. */
export function locate(offset, chipSize) {
  return { chip: Math.floor(offset / chipSize), addr: offset % chipSize }
}

/** True when a page is already what an erased chip would read. */
export function isErased(page) {
  for (let i = 0; i < page.length; i++) if (page[i] !== 0xff) return false
  return true
}

/** How many 4 KB sectors of an image hold anything but `$FF`. */
export function sectorsWithData(image) {
  let n = 0
  for (let at = 0; at < image.length; at += SECTOR_SIZE) {
    if (!isErased(image.subarray(at, at + SECTOR_SIZE))) n++
  }
  return n
}

/**
 * Erase every fitted chip, then program the pages that hold data.
 *
 * `onProgress({ done, total, offset, phase })` is called per page and per
 * erase. It is driven by acknowledged pages, not by bytes handed to a buffer,
 * because every page is acknowledged - that is the point of the protocol.
 */
export async function programImage(device, image, info, { onProgress = () => {} } = {}) {
  const { chips, chipSize } = info
  const total = image.length / PAGE_SIZE

  for (let chip = 0; chip < chips; chip++) {
    onProgress({ phase: 'erase', chip, done: 0, total })
    await device.eraseChip(chip)
  }

  let done = 0
  let programmed = 0
  for (let offset = 0; offset < image.length; offset += PAGE_SIZE) {
    const page = image.subarray(offset, offset + PAGE_SIZE)
    if (!isErased(page)) {
      const { chip, addr } = locate(offset, chipSize)
      await device.programPage(chip, addr, page)
      programmed++
    }
    done++
    onProgress({ phase: 'program', done, total, offset })
  }

  return { pages: total, programmed, skipped: total - programmed }
}

/**
 * Read the cart back and compare it with the image, every byte of it.
 *
 * Erased pages are read too. A verify that skipped them would not notice a
 * sector that failed to erase, which is the most likely way a tired chip fails.
 */
export async function verifyImage(device, image, info, { onProgress = () => {} } = {}) {
  const { chipSize } = info
  const total = image.length / PAGE_SIZE

  let done = 0
  for (let offset = 0; offset < image.length; offset += PAGE_SIZE) {
    const { chip, addr } = locate(offset, chipSize)
    const actual = await device.readPage(chip, addr)
    const expected = image.subarray(offset, offset + PAGE_SIZE)
    done++
    onProgress({ phase: 'verify', done, total, offset })

    if (!actual.equals(expected)) {
      for (let i = 0; i < PAGE_SIZE; i++) {
        if (actual[i] !== expected[i]) {
          return { ok: false, offset: offset + i, expected: expected[i], actual: actual[i] }
        }
      }
    }
  }
  return { ok: true }
}

/** Read a whole cart of a known size into a `.crt` image. */
export async function readImage(device, info, { onProgress = () => {} } = {}) {
  const { bytes, chipSize } = info
  const out = Buffer.alloc(bytes)
  const total = bytes / PAGE_SIZE

  let done = 0
  for (let offset = 0; offset < bytes; offset += PAGE_SIZE) {
    const { chip, addr } = locate(offset, chipSize)
    const page = await device.readPage(chip, addr)
    page.copy(out, offset)
    done++
    onProgress({ phase: 'read', done, total, offset })
  }
  return out
}
