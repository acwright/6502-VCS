import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import { crc32hex } from '../src/crc32.js'
import { Device } from '../src/device.js'
import { FakeHelper } from '../src/fake.js'
import { describe } from '../src/image.js'
import { Link } from '../src/link.js'
import { isErased, locate, programImage, readImage, sectorsWithData, verifyImage } from '../src/ops.js'

const fixture = (name) => readFile(new URL(`./fixtures/${name}`, import.meta.url))

function rig(size) {
  const helper = new FakeHelper({ size })
  return { helper, device: new Device(new Link(helper)) }
}

test('locate splits a 1M image at the halfway mark', () => {
  // PLAN.md §1 rule 4. The Helper cannot know this - it only ever sees one bus
  // and the parts are soldered down - so it is the host that has to.
  const chipSize = 0x80000
  assert.deepEqual(locate(0, chipSize), { chip: 0, addr: 0 })
  assert.deepEqual(locate(0x7ffff, chipSize), { chip: 0, addr: 0x7ffff })
  assert.deepEqual(locate(0x80000, chipSize), { chip: 1, addr: 0 })
  assert.deepEqual(locate(0xfffff, chipSize), { chip: 1, addr: 0x7ffff })
})

test('sector 128 of a 1M image is U2 s first sector', () => {
  assert.deepEqual(locate(128 * 0x1000, 0x80000), { chip: 1, addr: 0 })
})

test('isErased is exactly the erased state and nothing looser', () => {
  assert.equal(isErased(Buffer.alloc(256, 0xff)), true)
  const almost = Buffer.alloc(256, 0xff)
  almost[255] = 0xfe
  assert.equal(isErased(almost), false)
})

test('programming writes every byte of a fixture and reads it back', async () => {
  const image = await fixture('banked-128K.crt')
  assert.equal(crc32hex(image), 'e0e4f83c', 'the committed oracle has moved')

  const { helper, device } = rig(0x20000)
  const info = describe(image)
  const result = await programImage(device, image, info)

  assert.equal(result.pages, 512)
  assert.equal(result.skipped, 0, 'every bank of this fixture holds its own number')
  assert.deepEqual([...helper.cart.image()], [...image])
  assert.deepEqual(await verifyImage(device, image, info), { ok: true })
})

test('an all-$FF image programs nothing at all', async () => {
  // Cart configs fill with $FF, so a small game on a big cart is mostly this.
  // Skipping is exact, not an approximation: a chip erase leaves $FF, and a
  // byte program clears bits only, so writing $FF could not change anything.
  const image = Buffer.alloc(0x20000, 0xff)
  const { device } = rig(0x20000)
  const result = await programImage(device, image, describe(image))
  assert.equal(result.programmed, 0)
  assert.equal(result.skipped, 512)
  assert.deepEqual(await verifyImage(device, image, describe(image)), { ok: true })
})

test('a mostly empty image only programs the sectors that hold data', async () => {
  const image = Buffer.alloc(0x20000, 0xff)
  image.fill(0x42, 0x5000, 0x5400) // one sector, part of it
  image[0x1e000] = 0x01 // the fixed bank's first byte

  assert.equal(sectorsWithData(image), 2)
  const { device, helper } = rig(0x20000)
  const result = await programImage(device, image, describe(image))
  assert.equal(result.programmed, 5, '4 pages of $42, and the one in the fixed bank')
  assert.deepEqual([...helper.cart.image()], [...image])
})

test('a 1M image lands on both chips, in order', async () => {
  const image = Buffer.alloc(0x100000, 0xff)
  image.fill(0x11, 0x00000, 0x00100)
  image.fill(0x22, 0x80000, 0x80100) // the first page of U2
  image.fill(0x33, 0xfff00, 0x100000)

  const { device, helper } = rig(0x100000)
  const info = describe(image)
  assert.equal(info.chips, 2)
  await programImage(device, image, info)

  assert.equal(helper.cart.chips[0].data[0], 0x11)
  assert.equal(helper.cart.chips[1].data[0], 0x22)
  assert.equal(helper.cart.chips[1].data[0x7ffff], 0x33)
  assert.deepEqual(await verifyImage(device, image, info), { ok: true })
})

test('verify names the first byte that differs', async () => {
  const image = Buffer.alloc(0x20000, 0xff)
  image.fill(0x5a, 0x9000, 0xa000)

  const { device, helper } = rig(0x20000)
  const info = describe(image)
  await programImage(device, image, info)

  helper.cart.chips[0].data[0x9123] = 0x5b // a bit that failed to program
  const check = await verifyImage(device, image, info)
  assert.deepEqual(check, { ok: false, offset: 0x9123, expected: 0x5a, actual: 0x5b })
})

test('verify reads erased pages too, so a sector that did not erase is caught', async () => {
  const image = Buffer.alloc(0x20000, 0xff)
  const { device, helper } = rig(0x20000)
  const info = describe(image)
  await programImage(device, image, info)

  helper.cart.chips[0].data[0x4000] = 0x00
  const check = await verifyImage(device, image, info)
  assert.equal(check.ok, false)
  assert.equal(check.offset, 0x4000)
})

test('read pulls a whole cart back, byte for byte', async () => {
  const image = await fixture('banked-128K.crt')
  const { device } = rig(0x20000)
  const info = describe(image)
  await programImage(device, image, info)

  const back = await readImage(device, info)
  assert.equal(back.length, image.length)
  assert.equal(crc32hex(back), 'e0e4f83c')
})

test('progress is reported per acknowledged page', async () => {
  const image = Buffer.alloc(0x20000, 0xff)
  const { device } = rig(0x20000)
  const seen = []
  await programImage(device, image, describe(image), { onProgress: (p) => seen.push(p) })

  assert.equal(seen.filter((p) => p.phase === 'erase').length, 1)
  const pages = seen.filter((p) => p.phase === 'program')
  assert.equal(pages.length, 512)
  assert.equal(pages.at(-1).done, 512)
  assert.equal(pages.at(-1).total, 512)
})
