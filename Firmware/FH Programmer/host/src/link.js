// One request, one reply, over anything that looks like a stream.
//
// The protocol is strictly call-and-response, so this serialises: a command
// waits for the previous one's reply before its bytes go out. That is not a
// performance compromise - the Helper has one flash chip and one bus, and a
// second command in flight would have nowhere to go - and it is what lets a
// failure name the page it happened on.
//
// The stream is anything with `write`, `on('data')` and `on('error')`, which is
// a `SerialPort` on a bench and `fake.js` in a test. Nothing below this line
// knows which.

import { CMD_NAME, FrameParser, HelperError, REPLY, STATUS, encode } from './protocol.js'

/** No reply at all, as opposed to a reply that said no. */
export class TimeoutError extends Error {
  constructor(cmd, ms) {
    super(
      `${CMD_NAME[cmd] ?? `command $${cmd.toString(16)}`}: no reply from the Flash Helper ` +
        `in ${ms} ms. Is the firmware running on it?`
    )
    this.name = 'TimeoutError'
    this.cmd = cmd
  }
}

export class Link {
  #stream
  #parser = new FrameParser()
  #pending = null
  #chain = Promise.resolve()
  #error = null
  #desynced = false

  /** Frames that arrived with nothing waiting for them - a late reply, or noise. */
  strayFrames = 0

  constructor(stream, { timeout = 2000 } = {}) {
    this.#stream = stream
    this.timeout = timeout

    stream.on('data', (chunk) => {
      for (const frame of this.#parser.push(chunk)) this.#deliver(frame)
    })
    stream.on('error', (err) => {
      this.#error = err
      this.#pending?.reject(err)
      this.#pending = null
    })
  }

  #deliver(frame) {
    const pending = this.#pending
    if (!pending || frame.cmd !== (pending.cmd | REPLY)) {
      this.strayFrames++
      return
    }
    this.#pending = null
    clearTimeout(pending.timer)

    if (!frame.crcOk) {
      pending.reject(new HelperError(frame.cmd, STATUS.CRC))
      return
    }
    if (frame.payload.length < 1) {
      pending.reject(new Error(`${CMD_NAME[pending.cmd]}: reply carried no status byte`))
      return
    }
    const status = frame.payload[0]
    if (status !== STATUS.OK) {
      pending.reject(new HelperError(frame.cmd, status))
      return
    }
    pending.resolve(frame.payload.subarray(1))
  }

  /**
   * Send one command and resolve with its reply payload, status byte removed.
   *
   * Throws `HelperError` when the Helper answered and said no, and
   * `TimeoutError` when it did not answer at all. The two mean quite different
   * things on a bench - the first is a cart problem, the second a link problem -
   * so they are different types.
   */
  send(cmd, payload, { timeout = this.timeout } = {}) {
    const run = async () => {
      if (this.#error) throw this.#error
      if (this.#desynced) await this.#resync()

      return await new Promise((resolve, reject) => {
        this.#pending = {
          cmd,
          resolve,
          reject,
          timer: setTimeout(() => {
            this.#pending = null
            // A reply may still be on its way. Anything already buffered is
            // now untrustworthy, and the next command drains before it sends.
            this.#desynced = true
            reject(new TimeoutError(cmd, timeout))
          }, timeout)
        }
        this.#stream.write(encode(cmd, payload))
      })
    }

    // Queue behind whatever is in flight, but do not inherit its failure.
    const result = this.#chain.then(run, run)
    this.#chain = result.then(
      () => undefined,
      () => undefined
    )
    return result
  }

  /** Throw away anything still arriving from a command that timed out. */
  async #resync() {
    this.#desynced = false
    this.#parser = new FrameParser()
    await new Promise((r) => setTimeout(r, 50))
    this.#parser = new FrameParser()
  }

  close() {
    clearTimeout(this.#pending?.timer)
    this.#pending = null
    return this.#stream.close?.() ?? this.#stream.destroy?.()
  }
}
