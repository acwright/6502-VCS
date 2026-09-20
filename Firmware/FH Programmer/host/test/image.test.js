import { test } from 'node:test'
import assert from 'node:assert/strict'
import { describe as describeImage, parseName, bySize, TARGETS } from '../src/image.js'

test('every legal size maps to exactly one target', () => {
  const sizes = TARGETS.map((t) => t.bytes)
  assert.equal(new Set(sizes).size, sizes.length, 'sizes must not collide')
  assert.deepEqual(sizes, [0x8000, 0x20000, 0x40000, 0x80000, 0x100000])
})

test('the mapper comes from the size, not the name', () => {
  // PLAN.md §1 rule 2. A 256K image named -512K still loads as 256K.
  const info = describeImage(Buffer.alloc(0x40000), 'Foo-512K.crt')
  assert.equal(info.target, '256K')
  assert.equal(info.mapper, 'banked')
  assert.match(info.warning, /named for 512K but is 262,144 bytes/)
  assert.match(info.warning, /Going by the bytes/)
})

test('a name that agrees produces no warning', () => {
  assert.equal(describeImage(Buffer.alloc(0x80000), 'Cart-512K.crt').warning, null)
  assert.equal(describeImage(Buffer.alloc(0x8000), 'Cart.crt').warning, null)
  assert.equal(describeImage(Buffer.alloc(0x100000), 'Cart-VDP-1M.crt').warning, null)
})

test('an illegal size is refused outright', () => {
  assert.throws(() => describeImage(Buffer.alloc(0x4000)), /not a cartridge image/)
  assert.throws(() => describeImage(Buffer.alloc(0x80001)), /not a cartridge image/)
  assert.throws(() => describeImage(Buffer.alloc(0)), /not a cartridge image/)
})

test('chips, banks and the fixed offset', () => {
  const k128 = describeImage(Buffer.alloc(0x20000))
  assert.deepEqual(
    [k128.chips, k128.banks, k128.fixedOffset],
    [1, 16, 0x1e000],
    '128K: 16 banks, fixed at the last 8K'
  )
  const m1 = describeImage(Buffer.alloc(0x100000))
  assert.equal(m1.chips, 2)
  assert.equal(m1.chipSize, 0x80000)
  assert.equal(m1.banks, 64, 'banks are per chip')
  assert.equal(m1.fixedOffset, 0x7e000, 'the fixed bank is the PRIMARY chip, not the pair')
})

test('a 32K ROM cart has no banks', () => {
  const flat = describeImage(Buffer.alloc(0x8000))
  assert.equal(flat.mapper, 'flat')
  assert.equal(flat.target, null)
  assert.equal(flat.fixedOffset, null)
})

test('-VDP comes before the target', () => {
  assert.deepEqual(parseName('Cart-VDP-512K.crt'), { stem: 'Cart', vdp: true, target: '512K' })
  assert.deepEqual(parseName('Cart-512K.crt'), { stem: 'Cart', vdp: false, target: '512K' })
  assert.deepEqual(parseName('Cart-VDP.crt'), { stem: 'Cart', vdp: true, target: null })
  assert.deepEqual(parseName('Cart.crt'), { stem: 'Cart', vdp: false, target: null })
  assert.deepEqual(parseName('HelloWorldCart-128K.crt'), {
    stem: 'HelloWorldCart', vdp: false, target: '128K'
  })
  // The wrong order is not silently accepted as a target.
  assert.equal(parseName('Cart-512K-VDP.crt').target, null)
})

test('a path is reduced to its basename', () => {
  assert.equal(parseName('/tmp/build/Cart-1M.crt').stem, 'Cart')
  assert.equal(parseName('build/Cart-1M.crt').target, '1M')
})

test('bySize is the inverse of the table', () => {
  for (const t of TARGETS) assert.equal(bySize(t.bytes).target, t.target)
  assert.equal(bySize(1234), null)
})
