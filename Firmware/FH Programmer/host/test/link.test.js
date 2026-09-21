import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import test from 'node:test'

import { Device } from '../src/device.js'
import { FakeHelper } from '../src/fake.js'
import { Link, TimeoutError } from '../src/link.js'
import { CMD, HelperError, STATUS, encodeReply } from '../src/protocol.js'

/** A stream that answers however a test tells it to. */
class Scripted extends EventEmitter {
  sent = []
  constructor(reply) {
    super()
    this.reply = reply
  }
  write(chunk) {
    this.sent.push(Buffer.from(chunk))
    const answer = this.reply(chunk, this.sent.length - 1)
    if (answer) setImmediate(() => this.emit('data', answer))
    return true
  }
  close() {}
}

test('a command resolves with its reply, status byte removed', async () => {
  const link = new Link(new Scripted(() => encodeReply(CMD.ID, STATUS.OK, Buffer.from([0xbf, 0xb7]))))
  assert.deepEqual([...(await link.send(CMD.ID, Buffer.from([0])))], [0xbf, 0xb7])
})

test('a status other than OK becomes a HelperError that names both', async () => {
  const link = new Link(new Scripted(() => encodeReply(CMD.ERASE_CHIP, STATUS.TIMEOUT)))
  await assert.rejects(() => link.send(CMD.ERASE_CHIP, Buffer.from([0])), (err) => {
    assert.ok(err instanceof HelperError)
    assert.equal(err.status, STATUS.TIMEOUT)
    assert.match(err.message, /ERASE_CHIP/)
    assert.match(err.message, /is a cart in the slot/)
    return true
  })
})

test('silence is a TimeoutError, which is a different thing from a refusal', async () => {
  // On a bench these mean opposite things: a HelperError is a cart problem and
  // a TimeoutError is a link problem. Conflating them would send someone
  // looking at the wrong end of the cable.
  const link = new Link(new Scripted(() => null), { timeout: 40 })
  await assert.rejects(() => link.send(CMD.PING), TimeoutError)
})

test('a reply to the wrong command is not accepted as this one', async () => {
  const link = new Link(new Scripted(() => encodeReply(CMD.VERSION, STATUS.OK)), { timeout: 40 })
  await assert.rejects(() => link.send(CMD.PING), TimeoutError)
  assert.equal(link.strayFrames, 1)
})

test('a corrupt reply is reported as corrupt, not as silence', async () => {
  const link = new Link(
    new Scripted(() => {
      const frame = encodeReply(CMD.PING, STATUS.OK)
      frame[frame.length - 1] ^= 0xff
      return frame
    }),
    { timeout: 200 }
  )
  await assert.rejects(() => link.send(CMD.PING), (err) => err.status === STATUS.CRC)
})

test('commands are serialised, and one failing does not sink the next', async () => {
  const stream = new Scripted((chunk, n) => (n === 0 ? null : encodeReply(CMD.PING, STATUS.OK)))
  const link = new Link(stream, { timeout: 60 })

  const first = link.send(CMD.PING)
  const second = link.send(CMD.PING)
  await assert.rejects(() => first, TimeoutError)
  await second // the queue carried on

  assert.equal(stream.sent.length, 2)
})

test('the whole stack answers over the simulated Helper', async () => {
  const device = new Device(new Link(new FakeHelper({ size: 0x20000 })))
  assert.deepEqual(await device.version(), {
    protocol: 1,
    version: '1.0.0',
    name: 'FH Programmer (simulated)'
  })
  const id = await device.id(0)
  assert.equal(id.present, true)
  assert.equal(id.part, 'SST39SF010A')

  await device.eraseChip(0)
  await device.programPage(0, 0x3f00, Buffer.alloc(256, 0x5a))
  assert.ok((await device.readPage(0, 0x3f00)).every((b) => b === 0x5a))
})

test('an absent U2 answers open bus, and `present` says so', async () => {
  const device = new Device(new Link(new FakeHelper({ size: 0x80000 })))
  const u2 = await device.id(1)
  assert.equal(u2.manufacturer, 0xff)
  assert.equal(u2.present, false)
  assert.equal(u2.part, null)
})

test('the Helper refuses a misaligned or out-of-range address', async () => {
  const device = new Device(new Link(new FakeHelper({ size: 0x80000 })))
  for (const call of [
    () => device.readPage(0, 0x80),
    () => device.readPage(0, 0x80000),
    () => device.eraseSector(0, 0x1001),
    () => device.programPage(0, 0x101, Buffer.alloc(256))
  ]) {
    await assert.rejects(call, (err) => err.status === STATUS.ARG)
  }
})

test('a page a program cannot deliver comes back as a timeout', async () => {
  // Programming over a byte without erasing it first: the chip clears bits
  // only, so DQ7 never matches and the Helper gives up. The wrong answer here
  // would be a quiet success and a cart that does not run.
  const helper = new FakeHelper({ size: 0x20000 })
  const device = new Device(new Link(helper))
  await device.programPage(0, 0x1000, Buffer.alloc(256, 0x00))
  await assert.rejects(
    () => device.programPage(0, 0x1000, Buffer.alloc(256, 0xa5)),
    (err) => err.status === STATUS.TIMEOUT
  )
})
