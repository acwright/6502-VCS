// A Flash Helper with no Flash Helper: the whole stack in software, from the
// serial bytes down to the silicon.
//
// This exists because the boards are on order and the tool is not allowed to
// wait for them. Four layers, each the counterpart of a real one:
//
//   FlashChip   the SST39SF0x0 command state machine (PLAN.md §3), addressed in
//               flash space - the part on the cart
//   Cart        the bank register and the address translation (§2) - the 74HC
//               logic around it
//   Helper      the firmware's own algorithm: set the bank before every write in
//               a command cycle, then data-poll DQ7 - `src/flash.cpp` in JS
//   FakeHelper  the framed protocol on a stream interface - `src/protocol.cpp`
//
// What that buys: `6502-flash program --port fake:512K Cart-512K.crt` runs the
// real tool, with its real framing, its real chip split and its real erased-page
// skipping, against something that refuses a program the silicon would refuse.
// What it does not buy is any check on the C++: this is a second implementation
// of the same specification, so the two agreeing means the spec was read the
// same way twice, not that the firmware was transcribed correctly. The board is
// still the only thing that proves the board.
//
// FlashChip is deliberately the same shape as 6502-EMULATOR's `Flash` in
// `src/core/Cart.ts`. They implement one normative section between them.

import { EventEmitter } from 'node:events'

import {
  CMD,
  FrameParser,
  MAX_PAYLOAD,
  PAGE_SIZE,
  STATUS,
  encodeReply
} from './protocol.js'

export const BANK_SIZE = 0x2000
export const SECTOR_SIZE = 0x1000

/**
 * How many reads a program or erase stays busy for.
 *
 * The emulator measures its busy window in CPU cycles because it has one; here
 * there is no clock to measure against, so the window is counted in reads
 * instead. Any number above one does the job, which is to make the poll loop
 * actually loop: a Helper that read data back on its first try would never
 * exercise the two-consecutive-matches rule that DQ7 requires.
 */
const BUSY_READS = 3

/** Where the unlock state machine has got to. */
const Seq = {
  Idle: 0,
  Unlock1: 1,
  Unlock2: 2,
  Program: 3,
  Erase1: 4,
  Erase2: 5,
  Erase3: 6
}

/** One SST39SF0x0, addressed in flash space. It knows nothing about banks. */
export class FlashChip {
  #seq = Seq.Idle
  #idMode = false
  #busy = 0
  #busyDQ7 = 0
  #toggle = 0

  constructor(size) {
    if (size !== 0x20000 && size !== 0x40000 && size !== 0x80000) {
      throw new RangeError(`${size} is not an SST39SF0x0 size`)
    }
    this.size = size
    this.deviceId = size === 0x20000 ? 0xb5 : size === 0x40000 ? 0xb6 : 0xb7
    this.data = Buffer.alloc(size, 0xff) // the erased state
  }

  load(bytes) {
    bytes.copy(this.data, 0, 0, Math.min(bytes.length, this.size))
  }

  read(addr) {
    if (this.#busy > 0) {
      this.#busy--
      this.#toggle ^= 1
      return (this.#busyDQ7 << 7) | (this.#toggle << 6) // DQ5 = 0
    }
    if (this.#idMode) return addr & 1 ? this.deviceId : 0xbf
    return this.data[addr & (this.size - 1)]
  }

  write(addr, value) {
    const a = addr & 0x7fff // the part decodes only A14-A0 for commands
    const v = value & 0xff

    // `F0` at any address returns the chip to read mode - but only when a
    // program is not pending, because the byte a program writes may be $F0.
    if (this.#seq !== Seq.Program && v === 0xf0) {
      this.#idMode = false
      this.#seq = Seq.Idle
      return
    }

    switch (this.#seq) {
      case Seq.Idle:
        this.#seq = a === 0x5555 && v === 0xaa ? Seq.Unlock1 : Seq.Idle
        return
      case Seq.Unlock1:
        this.#seq = a === 0x2aaa && v === 0x55 ? Seq.Unlock2 : Seq.Idle
        return
      case Seq.Unlock2:
        if (a !== 0x5555) return void (this.#seq = Seq.Idle)
        if (v === 0xa0) this.#seq = Seq.Program
        else if (v === 0x80) this.#seq = Seq.Erase1
        else {
          if (v === 0x90) this.#idMode = true
          this.#seq = Seq.Idle
        }
        return
      case Seq.Program:
        this.#seq = Seq.Idle
        this.#program(addr, v)
        return
      case Seq.Erase1:
        this.#seq = a === 0x5555 && v === 0xaa ? Seq.Erase2 : Seq.Idle
        return
      case Seq.Erase2:
        this.#seq = a === 0x2aaa && v === 0x55 ? Seq.Erase3 : Seq.Idle
        return
      case Seq.Erase3:
        this.#seq = Seq.Idle
        if (a === 0x5555 && v === 0x10) this.#eraseChip()
        else if (v === 0x30) this.#eraseSector(addr)
        return
    }
  }

  /**
   * Byte program: **clears bits only**, `new = old & data`.
   *
   * DQ7 polls the complement of the *written* value, not of what landed, so a
   * `0` asked to become a `1` with no erase first never matches and comes back
   * as a timeout. That is the point of modelling it: it is what the silicon
   * does, and a tool that quietly wrote the wrong byte instead would be found
   * out on a bench rather than here.
   */
  #program(addr, value) {
    const a = addr & (this.size - 1)
    this.data[a] &= value
    this.#startBusy((~value >> 7) & 1)
  }

  #eraseSector(addr) {
    const sector = Math.floor((addr & (this.size - 1)) / SECTOR_SIZE)
    this.data.fill(0xff, sector * SECTOR_SIZE, (sector + 1) * SECTOR_SIZE)
    this.#startBusy(0)
  }

  #eraseChip() {
    this.data.fill(0xff)
    this.#startBusy(0)
  }

  #startBusy(dq7) {
    this.#busy = BUSY_READS
    this.#busyDQ7 = dq7
    this.#toggle = 0
  }

  /** `RESB`: back to read mode, mid-sequence or not. Contents are untouched. */
  reset() {
    this.#seq = Seq.Idle
    this.#idMode = false
    this.#busy = 0
  }
}

/** The bank register and the address translation of PLAN.md §2. */
export class Cart {
  constructor(size) {
    this.size = size
    this.chipCount = size > 0x80000 ? 2 : 1
    this.chipSize = size / this.chipCount
    this.chips = Array.from({ length: this.chipCount }, () => new FlashChip(this.chipSize))
    this.bank = 0
  }

  /** The image as one linear buffer: U1 then U2 (§1 rule 4). */
  image() {
    return Buffer.concat(this.chips.map((c) => c.data))
  }

  load(image) {
    for (let i = 0; i < this.chipCount; i++) {
      this.chips[i].load(image.subarray(i * this.chipSize, (i + 1) * this.chipSize))
    }
  }

  reset() {
    this.bank = 0
    for (const chip of this.chips) chip.reset()
  }

  #select() {
    const index = (this.bank >> 6) & 1
    const bank = this.bank & (this.chipSize / BANK_SIZE - 1)
    return { chip: this.chips[index] ?? null, base: bank * BANK_SIZE }
  }

  busWrite(addr, data) {
    if (addr >= 0xe000) {
      this.bank = data & 0xff // latched, and reaching no flash
      return
    }
    if (addr < 0xc000) return
    const { chip, base } = this.#select()
    chip?.write(base + (addr - 0xc000), data)
  }

  busRead(addr) {
    if (addr >= 0xe000) {
      // The fixed region is always the primary chip's last 8 KB.
      return this.chips[0].read(this.chipSize - BANK_SIZE + (addr - 0xe000))
    }
    if (addr < 0xc000) return 0xff
    const { chip, base } = this.#select()
    return chip ? chip.read(base + (addr - 0xc000)) : 0xff // open bus
  }
}

/** Give up on a poll after this many reads, the way the firmware gives up on time. */
const POLL_LIMIT = 200

/** `src/flash.cpp` in JavaScript: bank translation and DQ7 polling. */
class Helper {
  constructor(cart) {
    this.cart = cart
  }

  setBank(reg) {
    this.cart.busWrite(0xe000, reg)
  }

  #write(chip, addr, data) {
    this.setBank(((addr >>> 13) & 0x3f) | (chip ? 0x40 : 0))
    this.cart.busWrite(0xc000 | (addr & 0x1fff), data)
  }

  #read(chip, addr) {
    this.setBank(((addr >>> 13) & 0x3f) | (chip ? 0x40 : 0))
    return this.cart.busRead(0xc000 | (addr & 0x1fff))
  }

  #unlock(chip) {
    this.#write(chip, 0x5555, 0xaa)
    this.#write(chip, 0x2aaa, 0x55)
  }

  #wait(chip, addr, expect) {
    this.setBank(((addr >>> 13) & 0x3f) | (chip ? 0x40 : 0))
    const cpu = 0xc000 | (addr & 0x1fff)
    for (let i = 0; i < POLL_LIMIT; i++) {
      if (((this.cart.busRead(cpu) ^ expect) & 0x80) === 0) {
        if (((this.cart.busRead(cpu) ^ expect) & 0x80) === 0) return true
      }
    }
    return false
  }

  reset(chip) {
    this.#write(chip, 0x0000, 0xf0)
  }

  id(chip) {
    this.#unlock(chip)
    this.#write(chip, 0x5555, 0x90)
    const manufacturer = this.#read(chip, 0x0000)
    const device = this.#read(chip, 0x0001)
    this.reset(chip)
    return [manufacturer, device]
  }

  readPage(chip, addr) {
    this.setBank(((addr >>> 13) & 0x3f) | (chip ? 0x40 : 0))
    const base = 0xc000 | (addr & 0x1fff)
    const out = Buffer.alloc(PAGE_SIZE)
    for (let i = 0; i < PAGE_SIZE; i++) out[i] = this.cart.busRead(base + i)
    return out
  }

  programPage(chip, addr, data) {
    for (let i = 0; i < PAGE_SIZE; i++) {
      if (data[i] === 0xff) continue // a program clears bits only; $FF is a no-op
      this.#unlock(chip)
      this.#write(chip, 0x5555, 0xa0)
      this.#write(chip, addr + i, data[i])
      if (!this.#wait(chip, addr + i, data[i])) return false
    }
    return true
  }

  eraseSector(chip, addr) {
    const sector = addr & ~(SECTOR_SIZE - 1)
    this.#unlock(chip)
    this.#write(chip, 0x5555, 0x80)
    this.#unlock(chip)
    this.#write(chip, sector, 0x30)
    return this.#wait(chip, sector, 0xff)
  }

  eraseChip(chip) {
    this.#unlock(chip)
    this.#write(chip, 0x5555, 0x80)
    this.#unlock(chip)
    this.#write(chip, 0x5555, 0x10)
    return this.#wait(chip, 0x0000, 0xff)
  }
}

/** The firmware's own version, so `6502-flash id` says something truthful. */
export const FAKE_VERSION = { protocol: 1, version: '1.0.0', name: 'FH Programmer (simulated)' }

/**
 * A stand-in for an open serial port: `write` frames in, `data` frames out.
 *
 * It answers asynchronously, on `setImmediate`, because a fake that replied
 * inside the caller's own `write` would make the request queue in `link.js`
 * look correct whether or not it was.
 */
export class FakeHelper extends EventEmitter {
  #parser = new FrameParser()
  #closed = false

  constructor({ size = 0x80000, cart = null } = {}) {
    super()
    this.cart = cart ?? new Cart(size)
    this.helper = new Helper(this.cart)
  }

  write(chunk) {
    if (this.#closed) throw new Error('the simulated Flash Helper is closed')
    for (const frame of this.#parser.push(chunk)) {
      const reply = this.#answer(frame)
      setImmediate(() => {
        if (!this.#closed) this.emit('data', reply)
      })
    }
    return true
  }

  #answer(frame) {
    const { cmd, payload, crcOk } = frame
    const reply = (status, body) => encodeReply(cmd, status, body)
    if (!crcOk) return reply(STATUS.CRC)
    if (payload.length > MAX_PAYLOAD) return reply(STATUS.LEN)

    const chip = payload[0]
    const addr = payload.length >= 4 ? payload.readUIntLE(1, 3) : 0
    const badChip = () => chip > 1
    const badAddr = (align) => addr >= 0x80000 || addr % align !== 0

    switch (cmd) {
      case CMD.PING:
        return payload.length !== 0 ? reply(STATUS.LEN) : reply(STATUS.OK)

      case CMD.VERSION: {
        if (payload.length !== 0) return reply(STATUS.LEN)
        const { protocol, version, name } = FAKE_VERSION
        const [major, minor, patch] = version.split('.').map(Number)
        return reply(
          STATUS.OK,
          Buffer.concat([Buffer.from([protocol, major, minor, patch]), Buffer.from(name, 'latin1')])
        )
      }

      case CMD.ID:
        if (payload.length !== 1) return reply(STATUS.LEN)
        if (badChip()) return reply(STATUS.ARG)
        return reply(STATUS.OK, Buffer.from(this.helper.id(chip)))

      case CMD.ERASE_CHIP:
        if (payload.length !== 1) return reply(STATUS.LEN)
        if (badChip()) return reply(STATUS.ARG)
        return reply(this.helper.eraseChip(chip) ? STATUS.OK : STATUS.TIMEOUT)

      case CMD.ERASE_SECTOR:
        if (payload.length !== 4) return reply(STATUS.LEN)
        if (badChip()) return reply(STATUS.ARG)
        if (badAddr(SECTOR_SIZE)) return reply(STATUS.ARG)
        return reply(this.helper.eraseSector(chip, addr) ? STATUS.OK : STATUS.TIMEOUT)

      case CMD.PROGRAM_PAGE:
        if (payload.length !== 4 + PAGE_SIZE) return reply(STATUS.LEN)
        if (badChip()) return reply(STATUS.ARG)
        if (badAddr(PAGE_SIZE)) return reply(STATUS.ARG)
        return reply(
          this.helper.programPage(chip, addr, payload.subarray(4)) ? STATUS.OK : STATUS.TIMEOUT
        )

      case CMD.READ_PAGE:
        if (payload.length !== 4) return reply(STATUS.LEN)
        if (badChip()) return reply(STATUS.ARG)
        if (badAddr(PAGE_SIZE)) return reply(STATUS.ARG)
        return reply(STATUS.OK, this.helper.readPage(chip, addr))

      case CMD.RESET_CART:
        if (payload.length !== 0) return reply(STATUS.LEN)
        this.cart.reset()
        return reply(STATUS.OK)

      default:
        return reply(STATUS.CMD)
    }
  }

  close() {
    this.#closed = true
  }
}
