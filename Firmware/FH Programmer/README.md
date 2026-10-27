# FH Programmer

Firmware for the **Flash Helper**, the AC6502 [6502-VCS](../../README.md) cartridge
programmer. It turns an Arduino Mega 2560 R3 into a 65C02 on the far side of a cartridge
slot, so a Flash Cart is programmed in circuit through the card edge with no chip ever
removed — which matters, because the flash is a soldered-down TSOP part.

Hardware: [`Hardware/Flash Helper/Rev 1.0/`](../../Hardware/Flash%20Helper/Rev%201.0/).
Two parts — the Arduino, and one card edge connector.

The contract it implements is 6502-VCS [`PLAN.md`](../../PLAN.md) §§2, 3 and 5.3, which is
normative for the whole rollout; the board it drives is
[`Hardware/Flash Cart/Rev 1.0/DESIGN.md`](../../Hardware/Flash%20Cart/Rev%201.0/DESIGN.md).

## Status

**Written, built, and talking to a Mega 2560. Never yet connected to a cartridge**, because
the Flash Helper and Flash Cart boards are still at fab. What that means in practice is set
out in [*What has and has not been proved*](#what-has-and-has-not-been-proved) below — read
it before trusting a number here.

| | |
|---|---|
| `src/` | The Mega 2560 firmware. 4,076 bytes of flash, 984 bytes of RAM. |
| [`host/`](host/README.md) | `6502-flash`, the Node CLI that drives it. 117 tests. |

## Bus interface

The allocation is fixed by the Rev 1.0 schematic and is the same as 6502-COB's `Mega
Helper`, so bus-level code ports between the two adapters unchanged.

| Port | Arduino pins | Signals |
|---|---|---|
| PORTA | D22–D29 | `D0–D7`, the data bus (PA0 = D0) |
| PORTC | D37–D30 | `A8–A15` (PC0 = A8; the header runs backwards) |
| PORTL | D49–D42 | `A0–A7` (PL0 = A0; likewise) |
| PB7, PB5, PG5 | D13, D11, D4 | `PHI2`, `RWB`, `RESB` |
| PE4, PE5 | D2, D3 | `IRQB`, `NMIB` — not used for programming; see below |

All three ports map straight through, so the address and data buses are single-byte port
writes with no bit shuffling. **Use direct port writes, not `digitalWrite`** — that is the
whole reason those three ports were chosen.

> Earlier revisions of this file and of `PLAN.md` §5.3 described the bus cycle as putting
> *data* on PORTL. That was a slip in the prose, not in the design: PORTL is `A0–A7` and
> PORTA is the data bus, as the table above and the schematic both have it. `bus.cpp`
> follows the schematic.

A bus cycle:

- **Write:** `RWB` low, address on PORTC/PORTL, data on PORTA as outputs → `PHI2` high →
  `PHI2` low → release PORTA.
- **Read:** `RWB` high, address out, PORTA as inputs → `PHI2` high → sample → `PHI2` low.

The falling edge of `PHI2` is the one that matters. The cart qualifies its write strobe with
`PHI2` (U4's G1), so `WEB` and `BANKCLK` *rise* as `PHI2` falls, and that rising edge is
what latches. The data therefore has to stay valid across it, which is why `bus_write` puts
PORTA back to inputs a delay after `PHI2` drops rather than at the same moment.

Each half-cycle is 8 CPU cycles, or 500 ns, which makes the Helper's `PHI2` a 1 MHz square
wave — the same speed the VCS runs the cart at, and about seven times what a 70 ns flash
needs. It is `-D BUS_DELAY_CYCLES=n` in `platformio.ini` because the first thing a bench
failure would want to try is a slower bus.

**`RESB` is open-drain.** The Helper pulls it low to reset the cart's bank register and
releases it to the AVR's internal pull-up; it never drives it high. `RESB` is shared with
whatever card is in the slot, and a card under test may pull it low itself. A Helper driving
it high would hold it against that card. On an AVR a pin drives high when both its `DDRG` and
`PORTG` bits are set, so `resb_assert` clears `PORTG` before making the pin an output, and
`resb_release` makes it an input before turning the pull-up on. A host test
(`firmware.test.js`) reads `bus.cpp` and fails if any write sequence could drive `RESB` high.

### The one thing easiest to get wrong

**Set the bank register before every flash command cycle.** The JEDEC unlock addresses are
bank-relative: `$5555` means "bank 2, CPU `$D555`" and `$2AAA` means "bank 1, CPU `$CAAA`".
For the secondary chip, every bank value in the sequence also carries `$40`.

`flash.cpp` does this in one place, `flash_write`, and deliberately does *not* optimise it
away behind a shadow of the current value. The sequences use banks 2, 1, 2 and then the
target, so consecutive writes almost never share a bank and a shadow would buy nothing —
while adding exactly the state `PLAN.md` §9 names as the thing two implementations get wrong
in different directions.

### Why `IRQB` and `NMIB` are wired

No cartridge uses them. They are there because the same board with different firmware is a
bench tester for any AC6502 card — every card in the family carries the same
`6502 Card Edge` fingers and drops into this socket, and the GPIO, LCD, Serial and Serial
Card Pro cards all assert `IRQB`. That firmware is a separate build and does not exist yet.

`EXP0` and `EXP1` are **not** connected, and must never be: cards tie them to GND, so an
Arduino pin driven high there is a short. `RDY`, `BE`, `SYNC`, `EXP2` and `EXP3` are simply
unused by every card.

## The serial protocol

A framed binary protocol on `Serial` — USB CDC through the on-board 16U2 — at **500 kbaud**,
which is exact on a 16 MHz Mega (`UBRR = 3` with `U2X`, 0% error).

```
request   AA 55 | cmd       | len:u16 | payload        | crc16
response  AA 55 | cmd | $80 | len:u16 | status payload | crc16
```

Little-endian, like the `.sav` container. The CRC is **CRC-16/XMODEM** — polynomial `$1021`,
initial value 0, no reflection, no final XOR — over the command byte, the length and the
payload, but not the sync bytes.

**Every command answers with a frame**, and a response always carries at least its status
byte. Nothing is fire-and-forget: a 512 KB program is 2,048 acknowledged pages, which is
what makes a progress bar honest and what lets the host stop on the page that failed rather
than at the end.

A response echoes its command with bit 7 set. That costs one bit and buys two things: a host
that has lost its place can tell a reply from a request, and a reply to the wrong command is
an error rather than a misread payload.

| Command | | Request payload | Reply payload |
|---|---|---|---|
| `PING` | `$01` | — | — |
| `VERSION` | `$02` | — | protocol, major, minor, patch, name |
| `ID` | `$03` | chip | manufacturer, device |
| `ERASE_CHIP` | `$04` | chip | — |
| `ERASE_SECTOR` | `$05` | chip, addr:u24 | — |
| `PROGRAM_PAGE` | `$06` | chip, addr:u24, 256 bytes | — |
| `READ_PAGE` | `$07` | chip, addr:u24 | 256 bytes |
| `RESET_CART` | `$08` | — | — |

| Status | | Meaning |
|---|---|---|
| `OK` | `$00` | |
| `CRC` | `$01` | the frame's CRC did not match |
| `LEN` | `$02` | payload length wrong for this command |
| `CMD` | `$03` | unknown command |
| `ARG` | `$04` | an argument out of range, or a misaligned address |
| `TIMEOUT` | `$05` | the chip stayed busy past its window |
| `FRAME` | `$06` | a frame arrived truncated |

`chip` is 0 for U1 and 1 for U2. **Addresses are chip-relative**, 0 to the chip's size, and
`PROGRAM_PAGE`/`READ_PAGE` want them page-aligned, `ERASE_SECTOR` sector-aligned. The Helper
has no idea how big a cart is — it only ever sees one bus, and the parts are soldered down —
so splitting a `-1M` image at the halfway mark is the host's job (`PLAN.md` §1 rule 4).

`host/test/firmware.test.js` reads `src/protocol.h` and `src/flash.h` and checks every one
of these numbers against the host's copy, so a command renumbered on one side only fails a
test rather than a bench session.

## What has and has not been proved

Verified on an Arduino Mega 2560 R3 (`2341:0042`) running this firmware, **with an empty
slot**:

- the handshake, `VERSION` (`protocol 1, 1.0.0, FH Programmer`), and 500 consecutive `PING`s
  with no stray or dropped frame;
- a 267-byte `PROGRAM_PAGE` frame received intact, and the busy-poll timeout reporting
  `TIMEOUT` rather than hanging, which is the correct answer when no chip is there to
  answer `DQ7`;
- `ERASE_CHIP` likewise;
- `ARG` for a misaligned page address, a misaligned sector address, an address past 512 KB,
  and a chip index above 1; `CMD` for an unknown command;
- framing: a corrupt CRC answered `CRC`, a truncated frame answered `FRAME`, an absurd
  length field answered `LEN`, 64 bytes of junk and a lone `$AA` both resynced — and a clean
  `PING` worked immediately after each one;
- round trip 4.1 ms, and 12.2 ms per 256-byte `READ_PAGE`, which is about 25 seconds to read
  a 512 KB cart back.

**Not proved, and not claimed.** Everything below the protocol: the bus cycles against a
real cart, the bank register, the address translation, the JEDEC sequences, programming,
erasing, and reading anything that is not an empty slot. Those wait on the boards. The host
tool's `--port fake:` runs the same commands against a simulated cart, which is a second
reading of the same specification and not evidence about silicon.

## Building

```bash
pio run                 # build
pio run -t upload       # upload over the Arduino's own USB
```

There is no bootloader to install and no ISP step. Program the board with no cartridge in
the slot, or with one — either is safe.

`pio device monitor` will connect at 500000 baud but shows nothing useful: this is a binary
protocol, and the Helper never speaks first. Use `6502-flash` in [`host/`](host/README.md).

## License

MIT. See [LICENSE](LICENSE).
