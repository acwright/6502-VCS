# 6502-flash

The host side of the [FH Programmer](../README.md): the command line tool that drives the
Flash Helper over USB to program a Flash Cart in circuit.

Node 22 or later. No dependencies yet; `serialport` arrives with the serial transport.

```bash
npm test              # 37 tests, no network, no hardware
npm run fixtures      # regenerate test/fixtures
npm run fixtures:check
```

## What exists today

The library the tool is built from, and the shared test fixtures. **The CLI and the serial
transport are not written yet** — they wait on the firmware, which waits on the boards
coming back from fab.

| Module | What it is |
|---|---|
| [`src/crc32.js`](src/crc32.js) | CRC-32 (IEEE/zlib), the checksum the `.sav` container carries |
| [`src/image.js`](src/image.js) | What a `.crt` is: the five legal sizes, the mapper each one gets, and the name rules |
| [`src/sav.js`](src/sav.js) | The `.sav` sidecar — read, write, diff, and apply with its safety checks |
| [`src/layout.js`](src/layout.js) | Laying an existing 16K ROM cart image onto a flash cart |
| [`test/fixtures/`](test/fixtures/README.md) | The shared oracle for the whole rollout |

## Two rules worth knowing before reading the code

**The mapper comes from the size, never the name.** `Cart-512K.crt` that is 262,144 bytes
long loads as a 256K cart and says so. The five legal sizes cannot collide, so the byte
count is sound on its own; the name is a label for the human reading `ls`. See
`src/image.js`.

**A save can never reach a chip by accident.** Flash writes accumulate in a `<stem>.sav`
beside the image, never inside it. The container carries the size and CRC-32 of the exact
`.crt` it was written against, so a rebuilt cartridge refuses its old save rather than
laying stale sectors over new code. `program` will read the `.crt` and nothing else — there
is no flag to include a save, and the only path from a `.sav` into an image is an explicit
`merge` that writes a new file. See `src/sav.js`.

Both rules are specified in 6502-VCS `PLAN.md` §§1 and 4.

## The planned command set

```
6502-flash id                                  --port <path>
6502-flash erase                               --port <path> [--sector N]
6502-flash program <file.crt>                  --port <path> [--verify]
6502-flash verify  <file.crt>                  --port <path>
6502-flash read    <out.crt> --size 512K       --port <path>
6502-flash layout  <file.crt> -o <out.crt> --size 512K
6502-flash merge   <file.crt> <file.sav> -o <out.crt>
6502-flash ports
```

`layout` and `merge` need no hardware and are implemented in `src/` already.
