import { test } from 'node:test'
import assert from 'node:assert/strict'
import { crc32 } from '../src/crc32.js'
import { SECTOR_SIZE } from '../src/image.js'
import * as sav from '../src/sav.js'

const image = (n = 0x20000, fill = 0x11) => Buffer.alloc(n, fill)
const sector = (fill) => Buffer.alloc(SECTOR_SIZE, fill)

test('header layout is exactly as specified', () => {
  const img = image()
  const buf = sav.write(img, new Map([[3, sector(0xaa)]]))
  assert.equal(buf.toString('latin1', 0, 4), 'ACSV')
  assert.equal(buf.readUInt8(4), 1, 'version')
  assert.equal(buf.readUInt8(5), 0, 'reserved')
  assert.equal(buf.readUInt16LE(6), 1, 'count')
  assert.equal(buf.readUInt32LE(8), img.length, 'image_size')
  assert.equal(buf.readUInt32LE(12), crc32(img), 'image_crc')
  assert.equal(buf.readUInt32LE(16), 3, 'first record index')
  assert.equal(buf.length, 16 + 4 + SECTOR_SIZE)
})

test('records are written ascending whatever order they arrive in', () => {
  const buf = sav.write(image(), new Map([[9, sector(9)], [1, sector(1)], [5, sector(5)]]))
  assert.deepEqual([...sav.read(buf).sectors.keys()], [1, 5, 9])
  assert.equal(buf.readUInt32LE(16), 1)
})

test('round-trips', () => {
  const img = image()
  const sectors = new Map([[0, sector(0x01)], [7, sector(0x77)], [31, sector(0xff)]])
  const back = sav.read(sav.write(img, sectors))
  assert.equal(back.imageSize, img.length)
  assert.equal(back.imageCrc, crc32(img))
  assert.equal(back.sectors.size, 3)
  for (const [i, bytes] of sectors) assert.ok(back.sectors.get(i).equals(bytes))
})

test('apply lays the sectors over a copy, leaving the original alone', () => {
  const img = image()
  const before = Buffer.from(img)
  const out = sav.apply(img, sav.write(img, new Map([[2, sector(0xbb)]])))
  assert.ok(img.equals(before), 'the image must not be mutated')
  assert.ok(out.subarray(2 * SECTOR_SIZE, 3 * SECTOR_SIZE).equals(sector(0xbb)))
  assert.ok(out.subarray(0, SECTOR_SIZE).equals(before.subarray(0, SECTOR_SIZE)))
})

test('a save from a different build is refused, not applied', () => {
  // This is the guarantee in PLAN.md §4: rebuild the cartridge and the CRC
  // moves, so stale sectors are never laid over new code.
  const img = image()
  const file = sav.write(img, new Map([[2, sector(0xbb)]]))
  const rebuilt = Buffer.from(img)
  rebuilt[1234] ^= 0xff
  assert.throws(
    () => sav.apply(rebuilt, file),
    (e) => e instanceof sav.SaveMismatchError && /different build/.test(e.message)
  )
})

test('a save for a different size cartridge is refused', () => {
  const file = sav.write(image(0x20000), new Map([[2, sector(0xbb)]]))
  assert.throws(
    () => sav.apply(image(0x80000), file),
    (e) => e instanceof sav.SaveMismatchError && /belongs to a 131,072-byte cartridge/.test(e.message)
  )
})

test('malformed files are rejected', () => {
  const img = image()
  const good = sav.write(img, new Map([[1, sector(1)]]))
  assert.throws(() => sav.read(Buffer.alloc(8)), /too short/)
  const badMagic = Buffer.from(good); badMagic.write('XXXX', 0, 'latin1')
  assert.throws(() => sav.read(badMagic), /bad magic/)
  const badVer = Buffer.from(good); badVer.writeUInt8(2, 4)
  assert.throws(() => sav.read(badVer), /version 2/)
  assert.throws(() => sav.read(good.subarray(0, good.length - 1)), /expected/)
  const unsorted = sav.write(img, new Map([[1, sector(1)], [2, sector(2)]]))
  unsorted.writeUInt32LE(5, 16) // make the first index higher than the second
  assert.throws(() => sav.read(unsorted), /ascending order/)
})

test('a sector outside the image is refused at write time', () => {
  assert.throws(() => sav.write(image(0x20000), new Map([[32, sector(1)]])), /outside/)
  assert.throws(() => sav.write(image(), new Map([[0, Buffer.alloc(16)]])), /expected 4096/)
})

test('diffSectors finds exactly the changed sectors', () => {
  const a = image()
  const b = Buffer.from(a)
  b[0] = 0xff
  b[10 * SECTOR_SIZE + 5] = 0xff
  const d = sav.diffSectors(a, b)
  assert.deepEqual([...d.keys()], [0, 10])
  assert.equal(sav.diffSectors(a, Buffer.from(a)).size, 0, 'no writes, no sectors')
})

test('diff then write then apply reproduces the modified image', () => {
  const a = image()
  const b = Buffer.from(a)
  b.fill(0x5a, 4 * SECTOR_SIZE, 6 * SECTOR_SIZE)
  assert.ok(sav.apply(a, sav.write(a, sav.diffSectors(a, b))).equals(b))
})
