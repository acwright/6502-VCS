// Finding and opening the Flash Helper.
//
// `--port` defaults to the only Arduino Mega present, and errors with a list if
// there is more than one (PLAN.md §5.4). The list is the important half: a
// wrong guess here talks to whatever else is plugged in, so when there is any
// doubt this refuses and shows what it saw.
//
// **Why the binding and not the `serialport` stream class.** `serialport` is
// two packages: `@serialport/bindings-cpp`, which is the native port, and a
// Node stream wrapped round it. The stream half reads nothing at all on Node 26
// and macOS 26 - the port opens, no error is raised, and no `data` event ever
// arrives - while the binding underneath returns bytes perfectly. So the
// transport below is a read loop over the binding, which is a dozen lines, is
// the same project and the same native code, and is the interface `link.js`
// already wanted: `write`, `data`, `error`, `close`. `fake.js` implements the
// same four things and neither one knows about the other.
//
// **And why the read loop calls `fs.read` rather than the binding's own.** Both
// halves of `serialport` reach the same place on a Unix port: a non-blocking
// `read`, and on `EAGAIN` a wait on libuv's `uv_poll` for the fd to become
// readable. On macOS 26 that poll never fires for a USB serial tty. The symptom
// is peculiar enough to be worth writing down, because it looks like a firmware
// fault and is not: reads work perfectly while the other end talks unprompted,
// and a request/response protocol hangs - every reply turns up only when the
// *next* request is written, because writing the fd is what finally wakes the
// poll. Every command times out by one round trip.
//
// So the loop below owns the waiting: `fs.read` on the binding's own fd, and on
// `EAGAIN` a 1 ms sleep rather than a poll. That sleep is not the cost it looks
// like. A round trip to the Helper measures 4 ms and a 256-byte page read 12 ms,
// both of them USB frame latency and wire time; spinning on `setImmediate`
// instead was measured against this board and changed neither figure. Windows
// has no fd and does not have the bug, so there the binding's own `read` is used
// unchanged.
//
// It is imported lazily. `layout`, `merge` and the simulated Helper need no
// hardware at all, and they are the commands that can run today, so a missing
// or unbuilt native binding must not stop them.

import { EventEmitter } from 'node:events'
import { read as fsRead, write as fsWrite } from 'node:fs'

/** The Helper's link speed. Exact at 16 MHz with U2X: UBRR = 3, 0% error. */
export const BAUD_RATE = 500000

/** Arduino's own USB vendor IDs. A genuine Mega 2560 R3 is 2341:0042. */
const ARDUINO_VENDORS = new Set(['2341', '2a03'])

/** The USB-serial bridges clone Megas are built with. */
const BRIDGE_VENDORS = new Set(['1a86', '0403', '10c4', '1b4f'])

async function bindings() {
  try {
    const { autoDetect } = await import('@serialport/bindings-cpp')
    return autoDetect()
  } catch (cause) {
    throw new Error(
      'the serial bindings are not installed, so no port can be opened. ' +
        'Run `npm install` in this directory. ' +
        '`layout`, `merge` and `--port fake:` need them for nothing.',
      { cause }
    )
  }
}

/**
 * On macOS a port is listed as `/dev/tty.*` but wants opening as `/dev/cu.*`.
 *
 * The `tty` node is the dial-in device and blocks on carrier detect; `cu` is the
 * call-out side of the same port and is what a programmer wants. They are the
 * same hardware, so this is a spelling correction, not a choice.
 */
export function calloutPath(path) {
  return process.platform === 'darwin' ? path.replace('/dev/tty.', '/dev/cu.') : path
}

export async function listPorts() {
  const ports = await (await bindings()).list()
  return ports.map((p) => ({
    path: calloutPath(p.path),
    vendorId: p.vendorId?.toLowerCase() ?? null,
    productId: p.productId?.toLowerCase() ?? null,
    manufacturer: p.manufacturer ?? null,
    serialNumber: p.serialNumber ?? null,
    arduino: ARDUINO_VENDORS.has(p.vendorId?.toLowerCase() ?? ''),
    bridge: BRIDGE_VENDORS.has(p.vendorId?.toLowerCase() ?? '')
  }))
}

/** One line per port, the way `ports` prints it and an error quotes it. */
export function describePort(port) {
  const id = port.vendorId ? `${port.vendorId}:${port.productId}` : 'no USB id'
  const who = port.manufacturer ? ` ${port.manufacturer}` : ''
  const note = port.arduino ? ' - an Arduino' : port.bridge ? ' - a USB-serial bridge' : ''
  return `${port.path}  (${id})${who}${note}`
}

/**
 * Pick the port to talk to, or say why it cannot be picked.
 *
 * A genuine Arduino wins outright. Failing that, a single USB-serial bridge is
 * taken as a clone Mega, because that is what a clone looks like - but only if
 * it is the only one, since a bridge chip is also every other cheap board on the
 * desk.
 */
export function chooseMega(ports) {
  const arduinos = ports.filter((p) => p.arduino)
  if (arduinos.length === 1) return arduinos[0]
  if (arduinos.length > 1) {
    throw new Error(
      'more than one Arduino is connected, so --port has to say which:\n' +
        arduinos.map((p) => `  ${describePort(p)}`).join('\n')
    )
  }

  const bridges = ports.filter((p) => p.bridge)
  if (bridges.length === 1) return bridges[0]

  const seen = ports.length
    ? `The ports here are:\n${ports.map((p) => `  ${describePort(p)}`).join('\n')}`
    : 'No serial ports are present at all.'
  throw new Error(`no Arduino Mega was found. ${seen}`)
}

/** How long to wait after an empty read before trying again. */
const READ_RETRY_MS = 1

/** Errors that mean "nothing to read yet", not "something went wrong". */
const WOULD_BLOCK = new Set(['EAGAIN', 'EWOULDBLOCK', 'EINTR'])

/**
 * An open port, as an event emitter: `write` bytes in, `data` events out.
 *
 * The read loop is the whole thing, and it spins rather than polls - see the
 * note at the top of this file for why. Closing makes the outstanding read fail
 * with `EBADF` or `canceled`, which is how the loop ends and is not an error to
 * report.
 */
export class SerialTransport extends EventEmitter {
  #port
  #buf = Buffer.alloc(4096)
  #closed = false
  #writing = Promise.resolve()

  constructor(port, path) {
    super()
    this.#port = port
    this.path = path
    void this.#loop()
  }

  async #loop() {
    while (!this.#closed) {
      const bytes = await this.#readOnce()
      if (bytes === null) return
      if (bytes > 0) this.emit('data', Buffer.from(this.#buf.subarray(0, bytes)))
      else await new Promise((r) => setTimeout(r, READ_RETRY_MS))
    }
  }

  /** Bytes read, 0 for "not yet", or null when the port has gone. */
  #readOnce() {
    if (this.#port.fd === undefined) return this.#readThroughBinding()
    return new Promise((resolve) => {
      fsRead(this.#port.fd, this.#buf, 0, this.#buf.length, null, (err, bytesRead) => {
        if (!err) return resolve(bytesRead)
        if (WOULD_BLOCK.has(err.code)) return resolve(0)
        if (!this.#closed && err.code !== 'EBADF') this.emit('error', err)
        resolve(null)
      })
    })
  }

  /** Windows has no fd, and no broken poll either. */
  async #readThroughBinding() {
    try {
      const { bytesRead } = await this.#port.read(this.#buf, 0, this.#buf.length)
      return bytesRead
    } catch (err) {
      if (!this.#closed && !err.canceled) this.emit('error', err)
      return null
    }
  }

  /**
   * Queue a write, so that two frames cannot interleave.
   *
   * `link.js` sends one command at a time and does not await this, so the queue
   * is what keeps a retry after a timeout from overtaking the frame it is
   * retrying.
   */
  write(chunk) {
    const data = Buffer.from(chunk)
    this.#writing = this.#writing.then(
      () => this.#writeAll(data),
      () => this.#writeAll(data)
    )
    this.#writing.catch((err) => {
      if (!this.#closed) this.emit('error', err)
    })
    return true
  }

  async #writeAll(data) {
    if (this.#port.fd === undefined) return void (await this.#port.write(data))
    let sent = 0
    while (sent < data.length && !this.#closed) {
      sent += await new Promise((resolve, reject) => {
        fsWrite(this.#port.fd, data, sent, data.length - sent, null, (err, written) => {
          if (!err) return resolve(written)
          if (WOULD_BLOCK.has(err.code)) return resolve(0)
          reject(err)
        })
      })
    }
  }

  async close() {
    if (this.#closed) return
    this.#closed = true
    try {
      await this.#port.close()
    } catch {
      // Closing a port that is already gone is not a failure worth reporting.
    }
  }
}

/** Open a port at the Helper's baud rate, resolved once it is actually open. */
export async function openSerial(path) {
  const resolved = calloutPath(path)
  const binding = await bindings()
  try {
    return new SerialTransport(await binding.open({ path: resolved, baudRate: BAUD_RATE }), resolved)
  } catch (err) {
    throw new Error(`${resolved}: ${err.message}`, { cause: err })
  }
}
