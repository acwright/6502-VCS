# 6502-flash

The host side of the [FH Programmer](../README.md): the command line tool that drives the
Flash Helper over USB to program a Flash Cart in circuit.

Node 22 or later. One dependency, `@serialport/bindings-cpp`, and only `id`, `erase`,
`program`, `verify` and `read` need it.

```bash
npm install
npm test              # 117 tests, no network, no hardware
npm run fixtures:check
```

## Status

The command set is complete and every command runs. **No command has ever reached a
cartridge**, because the boards are still at fab — see
[*What has and has not been proved*](../README.md#what-has-and-has-not-been-proved) in the
firmware's README, which covers both halves. The version stays below 1.0 until a cart has
been programmed and read back.

## Commands

```
6502-flash id                                  --port <path>
6502-flash erase                               --port <path> [--sector N] [--chip N]
6502-flash program <file.crt>                  --port <path> [--verify]
6502-flash verify  <file.crt>                  --port <path>
6502-flash read    <out.crt> --size 512K       --port <path>
6502-flash layout  <file.crt> -o <out.crt> --size 512K
6502-flash merge   <file.crt> <file.sav> -o <out.crt>
6502-flash ports
```

`--port` defaults to the only Arduino Mega present and errors with a list if there is more
than one. `layout` and `merge` need no hardware at all.

## Two rules worth knowing before reading the code

**The mapper comes from the size, never the name.** `Cart-512K.crt` that is 262,144 bytes
long loads as a 256K cart and says so. The five legal sizes cannot collide, so the byte
count is sound on its own; the name is a label for the human reading `ls`. See
`src/image.js`.

**A save can never reach a chip by accident.** Flash writes accumulate in a `<stem>.sav`
beside the image, never inside it. `program` reads the `.crt` and nothing else — there is no
`--with-saves`, no `--merge` and no environment variable — and the only path from a `.sav`
into an image is `merge`, which always writes a new file and refuses to write over either
input. See `src/sav.js`.

Both are 6502-VCS [`PLAN.md`](../../../PLAN.md) §§1 and 4.

## The modules

| Module | What it is |
|---|---|
| [`src/crc32.js`](src/crc32.js) | CRC-32 (IEEE/zlib), the checksum the `.sav` container carries |
| [`src/crc16.js`](src/crc16.js) | CRC-16/XMODEM, the serial protocol's frame check |
| [`src/image.js`](src/image.js) | What a `.crt` is: the five legal sizes, the mapper each gets, the name rules |
| [`src/sav.js`](src/sav.js) | The `.sav` sidecar — read, write, diff, and apply with its safety checks |
| [`src/layout.js`](src/layout.js) | Laying an existing 16K ROM cart image onto a flash cart |
| [`src/protocol.js`](src/protocol.js) | Frames in and out: encode, and a parser that resyncs |
| [`src/link.js`](src/link.js) | One request, one reply, over anything that looks like a stream |
| [`src/device.js`](src/device.js) | The eight commands, with names instead of byte payloads |
| [`src/ops.js`](src/ops.js) | Program, verify and read back — the chip split and the erased-page skip |
| [`src/serial.js`](src/serial.js) | Finding and opening the Helper |
| [`src/session.js`](src/session.js) | `--port` to a Device that answers, real or simulated |
| [`src/fake.js`](src/fake.js) | A Flash Helper with no Flash Helper |
| [`src/cli.js`](src/cli.js) | The command line |
| [`test/fixtures/`](test/fixtures/README.md) | The shared oracle for the whole rollout |

## `--port fake:`, and what it is worth

`--port fake:512K` runs the whole tool against a simulated Flash Helper: the framed
protocol, the firmware's own bank translation and `DQ7` polling, the `$C000–$FFFF` mapper,
and a modelled SST39SF0x0 whose byte program clears bits only. Every command works.

```bash
6502-flash program Cart-512K.crt --port fake:512K --verify
```

It exists because the boards are on order and the tool was not allowed to wait for them, and
it earns its keep: `program` really does split a 1M image across two chips, really does skip
the erased pages, and really does get a timeout rather than a wrong byte if it tries to
program over unerased data.

**It is not evidence about hardware.** It is a second implementation of the same
specification, so the two agreeing means the spec was read the same way twice. Every command
run against it says so on stderr.

## Why the serial code uses the binding and not the `serialport` stream

`serialport` is two packages: `@serialport/bindings-cpp`, which is the native port, and a
Node stream wrapped round it. On Node 26 and macOS 26 the stream half reads nothing at all —
the port opens, no error is raised, and no `data` event arrives — while the binding
underneath returns bytes perfectly.

Underneath both, a Unix read is non-blocking and falls back on `EAGAIN` to a wait on libuv's
`uv_poll`. That poll never fires for a USB serial tty on macOS 26. The symptom is worth
writing down, because it looks exactly like firmware that will not answer: reads work
perfectly while the other end talks unprompted, and a request/response protocol hangs, with
every reply turning up only when the *next* request is written — because writing the fd is
what finally wakes the poll.

So `src/serial.js` owns the waiting: `fs.read` on the binding's own fd, and a 1 ms sleep
rather than a poll. Windows has no fd and does not have the bug, so there the binding's own
`read` is used unchanged. The whole workaround is about thirty lines, and it measured the
same as spinning on `setImmediate` against a real board.

One more thing that is not a bug but looks like one: **opening the port resets the Mega**,
and its bootloader restarts its own timer whenever bytes arrive. A host that starts knocking
straight away keeps the board in the bootloader for as long as it keeps knocking. `session.js`
therefore waits two seconds *before* the first `PING`, and retries only after that.
