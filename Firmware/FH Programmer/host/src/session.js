// Getting from a `--port` string to a Device that answers.
//
// Two things happen here that are not obvious from the command line.
//
// **Opening the port resets the board.** The Mega's USB bridge asserts DTR on
// open, which resets the ATmega2560, and its bootloader then listens for an
// upload before handing over to the firmware. So there is a fixed wait before
// the first `PING` and not only a retry after it, and the wait is the part that
// matters: the bootloader restarts its own timer whenever bytes arrive, so a
// host that starts knocking straight away keeps the board in the bootloader for
// as long as it keeps knocking. It looks exactly like firmware that will not
// answer. The retries after the wait are for the ordinary case of a board that
// is a little slower than this one.
//
// **`--port fake:` opens no port at all.** It builds the simulated Helper in
// `fake.js` instead: the whole stack in software, down to a modelled
// SST39SF0x0. Every command works against it, nothing it says is evidence about
// real hardware, and every path that prints uses `simulated` to say so out loud.

import { Device } from './device.js'
import { FakeHelper } from './fake.js'
import { byTarget } from './image.js'
import { Link } from './link.js'
import { chooseMega, describePort, listPorts, openSerial } from './serial.js'

/** How long the Mega's bootloader holds the line after a reset, in ms. */
const RESET_SETTLE_MS = 2000

/** How long to keep trying the opening PING after that, in ms, and how often. */
const HANDSHAKE_TIMEOUT = 4000
const HANDSHAKE_INTERVAL = 250

/** `fake`, or `fake:512K`. The size is the cart the simulation is built around. */
export function parseFakeSpec(spec) {
  const [, size] = spec.split(':', 2)
  if (!size) return 0x80000
  const target = byTarget(size.toUpperCase())
  if (!target || target.mapper !== 'banked') {
    throw new Error(`fake:${size} - the simulated cart must be 128K, 256K, 512K or 1M`)
  }
  return target.bytes
}

export const isFakeSpec = (spec) => spec === 'fake' || spec?.startsWith('fake:')

/**
 * Open a Flash Helper and wait until it answers.
 *
 * `onWait` is called once, if the handshake does not land immediately, so the
 * CLI can say what it is waiting for rather than appearing to hang for two
 * seconds on every single command.
 */
export async function openHelper(spec, { onWait = () => {} } = {}) {
  if (isFakeSpec(spec)) {
    const size = parseFakeSpec(spec)
    const stream = new FakeHelper({ size })
    const link = new Link(stream)
    return {
      device: new Device(link),
      simulated: true,
      description: `a simulated Flash Helper with a ${(size / 1024).toLocaleString()} KB cart`,
      close: () => link.close(),
      cart: stream.cart
    }
  }

  const path = spec ?? chooseMega(await listPorts()).path
  const port = await openSerial(path)
  const link = new Link(port)
  const device = new Device(link)

  try {
    onWait()
    await new Promise((r) => setTimeout(r, RESET_SETTLE_MS))
    await handshake(device)
  } catch (err) {
    link.close()
    throw err
  }

  return {
    device,
    simulated: false,
    description: path,
    close: () => link.close(),
    cart: null
  }
}

async function handshake(device) {
  const deadline = Date.now() + HANDSHAKE_TIMEOUT
  let last = null

  for (;;) {
    try {
      await device.ping()
      return
    } catch (err) {
      last = err
      if (Date.now() >= deadline) break
      await new Promise((r) => setTimeout(r, HANDSHAKE_INTERVAL))
    }
  }

  throw new Error(
    'the Flash Helper did not answer. The port opened, so the board is there - ' +
      'check that this firmware is the one running on it (`pio run -t upload`).',
    { cause: last }
  )
}

export { describePort, listPorts }
