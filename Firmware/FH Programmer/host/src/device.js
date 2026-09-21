// The eight commands, with names and arguments instead of byte payloads.
//
// Addresses here are **chip-relative**: 0 .. chip size - 1, on the chip named by
// `chip` (0 = U1, 1 = U2). The Helper has no idea how big a cart is or how many
// chips are fitted - it cannot, the part is soldered down and it only ever sees
// one bus - so splitting a `-1M` image at the halfway mark is this side's job
// (PLAN.md §1 rule 4), done in `ops.js`.

import { CMD, PAGE_SIZE } from './protocol.js'

/** SST's manufacturer code, which a present and healthy chip always answers. */
export const SST = 0xbf

/** §3's table: the device ID each part reports, and the chip size it implies. */
export const DEVICE_IDS = new Map([
  [0xb5, { part: 'SST39SF010A', chipSize: 0x20000 }],
  [0xb6, { part: 'SST39SF020A', chipSize: 0x40000 }],
  [0xb7, { part: 'SST39SF040', chipSize: 0x80000 }]
])

/** Erases are slow by design; the Helper's own windows are 0.2 s and 1 s. */
const ERASE_TIMEOUT = 3000

export class Device {
  constructor(link) {
    this.link = link
  }

  async ping() {
    await this.link.send(CMD.PING)
  }

  /** `{ protocol, version, name }` - the handshake that proves it is a Helper. */
  async version() {
    const p = await this.link.send(CMD.VERSION)
    if (p.length < 4) throw new Error('VERSION reply was too short to be a Flash Helper')
    return {
      protocol: p[0],
      version: `${p[1]}.${p[2]}.${p[3]}`,
      name: p.subarray(4).toString('latin1')
    }
  }

  /**
   * Software ID: `$BF` and one of `$B5`/`$B6`/`$B7`.
   *
   * `present` is the one thing worth reading off this. An empty slot floats the
   * bus, which the cart's own pull-ups and the open-bus convention alike report
   * as `$FF` - so a manufacturer byte that is not `$BF` means no chip answered,
   * not a chip that answered wrongly.
   */
  async id(chip = 0) {
    const [manufacturer, device] = await this.link.send(CMD.ID, Buffer.from([chip]))
    const known = DEVICE_IDS.get(device)
    return {
      chip,
      manufacturer,
      device,
      present: manufacturer === SST && known !== undefined,
      part: known?.part ?? null,
      chipSize: known?.chipSize ?? null
    }
  }

  async eraseChip(chip = 0) {
    await this.link.send(CMD.ERASE_CHIP, Buffer.from([chip]), { timeout: ERASE_TIMEOUT })
  }

  async eraseSector(chip, addr) {
    await this.link.send(CMD.ERASE_SECTOR, addressed(chip, addr), { timeout: ERASE_TIMEOUT })
  }

  async programPage(chip, addr, data) {
    if (data.length !== PAGE_SIZE) throw new Error(`a page is ${PAGE_SIZE} bytes, not ${data.length}`)
    await this.link.send(CMD.PROGRAM_PAGE, Buffer.concat([addressed(chip, addr), Buffer.from(data)]))
  }

  async readPage(chip, addr) {
    const page = await this.link.send(CMD.READ_PAGE, addressed(chip, addr))
    if (page.length !== PAGE_SIZE) throw new Error(`READ_PAGE returned ${page.length} bytes`)
    return Buffer.from(page)
  }

  /** Pulse RESB, take both chips out of ID mode, and put the window back to bank 0. */
  async resetCart() {
    await this.link.send(CMD.RESET_CART)
  }
}

/** `chip` then a 24-bit little-endian chip-relative address. */
function addressed(chip, addr) {
  return Buffer.from([chip, addr & 0xff, (addr >> 8) & 0xff, (addr >> 16) & 0xff])
}
