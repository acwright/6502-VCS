// The simulated cart is a second implementation of PLAN.md §§2 and 3, so these
// tests are really tests of the specification's corners - the same corners
// 6502-EMULATOR's `Cart.ts` tests from the other side. Where a number appears
// here it is the plan's number, not this file's.

import assert from 'node:assert/strict'
import test from 'node:test'

import { Cart, FlashChip } from '../src/fake.js'

const banked = (cart, bank) => {
  cart.busWrite(0xe000, bank)
  return cart
}

test('a byte program clears bits only', () => {
  // `new = old & data`. A program that expects a 0 bit to come back as a 1
  // without an erase is a bug on hardware, and this is where it shows up.
  const chip = new FlashChip(0x20000)
  program(chip, 0x1234, 0x0f)
  assert.equal(chip.data[0x1234], 0x0f)
  program(chip, 0x1234, 0xf0)
  assert.equal(chip.data[0x1234], 0x00, 'the two programs ANDed, they did not replace')
})

test('DQ7 polls the value that was written, not the one that landed', () => {
  // So a 0 asked to become a 1 never matches, and the caller gets a timeout
  // rather than a silently wrong byte. That is the hardware's answer.
  const chip = new FlashChip(0x20000)
  program(chip, 0, 0x00)
  drainBusy(chip)
  program(chip, 0, 0xff) // cannot set a bit back
  drainBusy(chip)
  assert.notEqual(chip.read(0) & 0x80, 0xff & 0x80)
})

test('while busy, every read returns status and DQ6 toggles', () => {
  const chip = new FlashChip(0x20000)
  program(chip, 0, 0x7f) // DQ7 of the written value is 0, so status DQ7 is 1
  const first = chip.read(0)
  const second = chip.read(0)
  assert.equal(first & 0x80, 0x80)
  assert.notEqual(first & 0x40, second & 0x40, 'DQ6 toggles on every read')
  assert.equal(first & 0x20, 0, 'DQ5 is 0')
})

test('sector erase covers 4 KB, aligned, and nothing else', () => {
  const chip = new FlashChip(0x20000)
  chip.data.fill(0x00)
  eraseSector(chip, 0x1abc)
  drainBusy(chip)
  assert.equal(chip.data[0x0fff], 0x00)
  assert.deepEqual([...chip.data.subarray(0x1000, 0x2000)], Array(0x1000).fill(0xff))
  assert.equal(chip.data[0x2000], 0x00)
})

test('chip erase writes $FF everywhere', () => {
  const chip = new FlashChip(0x20000)
  chip.data.fill(0x5a)
  eraseChip(chip)
  drainBusy(chip)
  assert.ok(chip.data.every((b) => b === 0xff))
})

test('the device ID comes from the size, so it agrees with the Helper', () => {
  assert.equal(new FlashChip(0x20000).deviceId, 0xb5) // SST39SF010A
  assert.equal(new FlashChip(0x40000).deviceId, 0xb6) // SST39SF020A
  assert.equal(new FlashChip(0x80000).deviceId, 0xb7) // SST39SF040
})

test('software ID answers $BF and the device ID, and $F0 leaves', () => {
  const chip = new FlashChip(0x80000)
  chip.data[0] = 0x11
  chip.data[1] = 0x22
  unlock(chip)
  chip.write(0x5555, 0x90)
  assert.equal(chip.read(0x0000), 0xbf)
  assert.equal(chip.read(0x0001), 0xb7)
  chip.write(0x0000, 0xf0)
  assert.equal(chip.read(0x0000), 0x11)
})

test('$F0 mid-program is data, not a command', () => {
  // The byte a program writes may itself be $F0. Treating it as a reset there
  // would drop the byte and leave the chip looking fine.
  const chip = new FlashChip(0x20000)
  program(chip, 0x40, 0xf0)
  drainBusy(chip)
  assert.equal(chip.data[0x40], 0xf0)
})

test('an unlock sequence only counts at $5555 and $2AAA, masked to 15 bits', () => {
  const chip = new FlashChip(0x80000)
  // $15555 is $5555 once masked to A14-A0, which is all the part decodes.
  chip.write(0x15555, 0xaa)
  chip.write(0x12aaa, 0x55)
  chip.write(0x15555, 0xa0)
  chip.write(0x300, 0x42)
  drainBusy(chip)
  assert.equal(chip.data[0x300], 0x42)

  // A wrong unlock address is just a swallowed write.
  chip.write(0x5554, 0xaa)
  chip.write(0x2aaa, 0x55)
  chip.write(0x5555, 0xa0)
  chip.write(0x301, 0x42)
  assert.equal(chip.data[0x301], 0xff)
})

test('the bank register selects the window and the fixed region ignores it', () => {
  const cart = new Cart(0x20000) // 16 banks
  for (let bank = 0; bank < 16; bank++) {
    cart.chips[0].data.fill(bank, bank * 0x2000, (bank + 1) * 0x2000)
  }
  for (let bank = 0; bank < 16; bank++) {
    banked(cart, bank)
    assert.equal(cart.busRead(0xc000), bank)
    assert.equal(cart.busRead(0xe000), 15, 'the fixed region is always the last bank')
  }
})

test('a write to $E000-$FFFF latches the register and reaches no flash', () => {
  const cart = new Cart(0x20000)
  cart.chips[0].data.fill(0x11)
  cart.busWrite(0xffff, 0x03)
  assert.equal(cart.bank, 0x03)
  assert.ok(cart.chips[0].data.every((b) => b === 0x11))
})

test('register values above the bank count alias down', () => {
  // On a 010A the flash's high address pins are not bonded, so the mask is the
  // part's own. This is a property of the board, not of the tooling.
  const cart = new Cart(0x20000) // BANK_MASK = $0F
  cart.chips[0].data.fill(0xab, 0x2000, 0x4000) // bank 1
  banked(cart, 0x11) // 17 & 0x0F = 1
  assert.equal(cart.busRead(0xc000), 0xab)
})

test('values 128-255 mirror 0-127: bit 7 is latched and goes nowhere', () => {
  const cart = new Cart(0x20000)
  cart.chips[0].data.fill(0xcd, 0x4000, 0x6000) // bank 2
  banked(cart, 0x82)
  assert.equal(cart.busRead(0xc000), 0xcd)
})

test('bit 6 with no U2 fitted reads open bus, which is $FF', () => {
  const cart = new Cart(0x80000) // one chip
  cart.chips[0].data.fill(0x5a)
  banked(cart, 0x40)
  assert.equal(cart.busRead(0xc000), 0xff)
  assert.equal(cart.busRead(0xdfff), 0xff)
  assert.notEqual(cart.busRead(0xe000), 0xff, 'the fixed region is always the primary chip')
})

test('on a 1M cart, U1 is the first 512 KB and U2 the second', () => {
  const cart = new Cart(0x100000)
  assert.equal(cart.chipCount, 2)
  cart.chips[0].data.fill(0x01)
  cart.chips[1].data.fill(0x02)
  banked(cart, 0)
  assert.equal(cart.busRead(0xc000), 0x01)
  banked(cart, 0x40)
  assert.equal(cart.busRead(0xc000), 0x02)
  assert.equal(cart.image().length, 0x100000)
  assert.equal(cart.image()[0x80000], 0x02, 'the file is linear across the pair')
})

test('the unlock addresses reach the chip through the bank register', () => {
  // PLAN.md §9's risk, and the one this whole rollout is most likely to get
  // wrong in two places at once: the JEDEC unlock addresses are bank-relative.
  // Flash $5555 is bank 2 at CPU $D555, and flash $2AAA is bank 1 at CPU $CAAA,
  // which is the table in DESIGN.md's *Flash commands*.
  //
  // So this drives a byte program the way the 6502 would - and the way the
  // firmware does - through CPU addresses only, and checks the chip took it as
  // a command rather than swallowing it.
  const cart = new Cart(0x80000)
  const write = (bank, cpu, value) => {
    cart.busWrite(0xe000, bank)
    cart.busWrite(cpu, value)
  }
  write(2, 0xd555, 0xaa)
  write(1, 0xcaaa, 0x55)
  write(2, 0xd555, 0xa0)
  write(9, 0xc345, 0x42) // flash $12345
  assert.equal(cart.chips[0].data[0x12345], 0x42)

  // One bank wrong anywhere in the sequence and nothing happens at all, which
  // is the failure this catches: a swallowed write, not a wrong byte.
  write(3, 0xd555, 0xaa)
  write(1, 0xcaaa, 0x55)
  write(2, 0xd555, 0xa0)
  write(9, 0xc346, 0x42)
  assert.equal(cart.chips[0].data[0x12346], 0xff)
})

test('for U2 every bank value in the sequence carries $40', () => {
  const cart = new Cart(0x100000)
  const write = (bank, cpu, value) => {
    cart.busWrite(0xe000, bank)
    cart.busWrite(cpu, value)
  }
  write(0x42, 0xd555, 0xaa)
  write(0x41, 0xcaaa, 0x55)
  write(0x42, 0xd555, 0xa0)
  write(0x40, 0xc001, 0x99)
  assert.equal(cart.chips[1].data[0x0001], 0x99)
  assert.equal(cart.chips[0].data[0x0001], 0xff, 'U1 was never selected, so it saw nothing')
})

test('every window address maps back to the flash byte it came from', () => {
  // The firmware turns a chip-relative flash address into a register value and
  // a CPU address; the board turns those back into a flash address through
  // `FA13-18 = Bn OR A13`. The two have to be exact inverses on every bank of
  // every part, so this walks all of them rather than spot-checking.
  for (const size of [0x20000, 0x40000, 0x80000]) {
    const cart = new Cart(size)
    for (let addr = 0; addr < size; addr += 0x1000) {
      cart.busWrite(0xe000, (addr >>> 13) & 0x3f)
      cart.chips[0].data[addr] = 0x5a
      assert.equal(cart.busRead(0xc000 | (addr & 0x1fff)), 0x5a, `${size} @ $${addr.toString(16)}`)
      cart.chips[0].data[addr] = 0xff
    }
  }
})

test('reset clears the register and takes a chip out of ID mode', () => {
  const cart = new Cart(0x20000)
  cart.chips[0].data[0] = 0x77
  banked(cart, 5)
  unlock(cart.chips[0])
  cart.chips[0].write(0x5555, 0x90)
  cart.reset()
  assert.equal(cart.bank, 0)
  assert.equal(cart.busRead(0xc000), 0x77)
})

// The command sequences, spelled out once so the tests above can be read.
const unlock = (chip) => {
  chip.write(0x5555, 0xaa)
  chip.write(0x2aaa, 0x55)
}
function program(chip, addr, value) {
  unlock(chip)
  chip.write(0x5555, 0xa0)
  chip.write(addr, value)
}
function eraseSector(chip, addr) {
  unlock(chip)
  chip.write(0x5555, 0x80)
  unlock(chip)
  chip.write(addr & ~0xfff, 0x30)
}
function eraseChip(chip) {
  unlock(chip)
  chip.write(0x5555, 0x80)
  unlock(chip)
  chip.write(0x5555, 0x10)
}
/** Read past the busy window, the way a poll loop would. */
const drainBusy = (chip) => {
  for (let i = 0; i < 8; i++) chip.read(0)
}
