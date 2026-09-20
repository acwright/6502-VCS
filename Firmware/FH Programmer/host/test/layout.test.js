import { test } from 'node:test'
import assert from 'node:assert/strict'
import { legacyToFlash, fixedOffsetFor } from '../src/layout.js'

// The offsets DESIGN.md names, under "Legacy 16K images".
test('the fixed bank is the primary chip last 8K', () => {
  assert.equal(fixedOffsetFor('128K'), 0x1e000)
  assert.equal(fixedOffsetFor('256K'), 0x3e000)
  assert.equal(fixedOffsetFor('512K'), 0x7e000)
  assert.equal(fixedOffsetFor('1M'), 0x7e000, 'U1 last 8K, not the end of the pair')
})

const legacy = () => {
  const b = Buffer.alloc(0x8000, 0x00)
  b.fill(0xc0, 0x4000, 0x6000) // $C000-$DFFF
  b.fill(0xe0, 0x6000, 0x8000) // $E000-$FFFF
  return b
}

test('the two halves land in bank 0 and the fixed bank', () => {
  const out = legacyToFlash(legacy(), '512K')
  assert.equal(out.length, 0x80000)
  assert.ok(out.subarray(0x00000, 0x02000).every((b) => b === 0xc0), 'bank 0')
  assert.ok(out.subarray(0x7e000, 0x80000).every((b) => b === 0xe0), 'fixed bank')
})

test('everything else is left erased', () => {
  const out = legacyToFlash(legacy(), '512K')
  assert.ok(out.subarray(0x02000, 0x7e000).every((b) => b === 0xff),
    '$FF so program can skip those sectors after a chip erase')
})

test('the padding half of the ROM image is dropped', () => {
  const src = legacy()
  src.fill(0x99, 0x0000, 0x4000) // the $8000-$BFFF pad the machine never reads
  const out = legacyToFlash(src, '512K')
  assert.equal(out.indexOf(0x99), -1, 'padding must not reach the flash')
})

test('every banked target works and sizes correctly', () => {
  for (const [t, size] of [['128K', 0x20000], ['256K', 0x40000], ['512K', 0x80000], ['1M', 0x100000]]) {
    const out = legacyToFlash(legacy(), t)
    assert.equal(out.length, size)
    assert.ok(out.subarray(0, 0x2000).every((b) => b === 0xc0), `${t} bank 0`)
    const f = fixedOffsetFor(t)
    assert.ok(out.subarray(f, f + 0x2000).every((b) => b === 0xe0), `${t} fixed bank`)
  }
})

test('a flash image is not a legal input, and neither is a bad target', () => {
  assert.throws(() => legacyToFlash(Buffer.alloc(0x80000), '512K'), /already a flash cart image/)
  assert.throws(() => legacyToFlash(legacy(), '64K'), /not a flash cart target/)
  assert.throws(() => legacyToFlash(legacy(), null), /not a flash cart target/)
})
