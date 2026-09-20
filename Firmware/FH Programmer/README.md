# FH Programmer

Firmware for the **Flash Helper**, the AC6502 [6502-VCS](../../README.md) cartridge
programmer. It turns an Arduino Mega 2560 R3 into a 65C02 on the far side of a cartridge
slot, so a Flash Cart is programmed in circuit through the card edge with no chip ever
removed — which matters, because the flash is a soldered-down TSOP part.

Hardware: [`Hardware/Flash Helper/Rev 1.0/`](../../Hardware/Flash%20Helper/Rev%201.0/).
Two parts — the Arduino, and one card edge connector.

The design it implements, including the flash command sequences, is
[`Hardware/Flash Cart/Rev 1.0/DESIGN.md`](../../Hardware/Flash%20Cart/Rev%201.0/DESIGN.md).

## Status

**The firmware is not written yet.** The board is designed and its gerbers are exported;
this project currently holds the PlatformIO scaffolding and the host tool.

| | |
|---|---|
| `src/` | The Mega 2560 firmware. Not written. |
| [`host/`](host/README.md) | `6502-flash`, the Node CLI that drives it. Library and test fixtures done; CLI pending. |

## Bus interface

The allocation is fixed by the schematic and is the same as 6502-COB's `Mega Helper`, so
bus-level code ports between the two adapters unchanged.

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

A bus cycle, from `DESIGN.md`:

- **Write:** `RWB` low, address out, data on PORTL as outputs → `PHI2` high → `PHI2` low
  (this is the edge that latches) → PORTL back to inputs.
- **Read:** `RWB` high, address out, PORTL as inputs → `PHI2` high → sample → `PHI2` low.

At 16 MHz every half-cycle is many times what the cart needs, so no delays are required
beyond the natural instruction timing.

### The one thing easiest to get wrong

**Set the bank register before every flash command cycle.** The JEDEC unlock addresses are
bank-relative: `$5555` means "bank 2, CPU `$D555`" and `$2AAA` means "bank 1, CPU `$CAAA`".
For the secondary chip, every bank value in the sequence also carries `$40`.

### Why `IRQB` and `NMIB` are wired

No cartridge uses them. They are there because the same board with different firmware is a
bench tester for any AC6502 card — every card in the family carries the same
`6502 Card Edge` fingers and drops into this socket, and the GPIO, LCD, Serial and Serial
Card Pro cards all assert `IRQB`. That firmware is a separate build and does not exist yet.

`EXP0` and `EXP1` are **not** connected, and must never be: cards tie them to GND, so an
Arduino pin driven high there is a short. `RDY`, `BE`, `SYNC`, `EXP2` and `EXP3` are simply
unused by every card.

## Building

```bash
pio run                 # build
pio run -t upload       # upload over the Arduino's own USB
pio device monitor      # 500000 baud
```

There is no bootloader to install and no ISP step. Program the board with no cartridge in
the slot, or with one — either is safe.

## License

MIT. See [LICENSE](LICENSE).
