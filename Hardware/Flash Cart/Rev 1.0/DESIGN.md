# Flash Cart — Design Spec

Banked flash cartridge for the 6502-VCS. Replaces the fixed 16K ROM Cart (Rev 1.0a / 1.0b) with an in-circuit-programmable, bank-switched cart from 128KB up to 1MB, built entirely from surface-mount parts, sourced from Digi-Key and assembled at home with a stencil.

Location: `Hardware/Flash Cart/Rev 1.0/` (schematic: `Flash Cart.kicad_sch`)

## Goals

- One PCB covering cart sizes from 128KB to 1MB, chosen at order time by which parts are populated.
- All SMD, and a small enough part count to assemble at home with a stencil. **No part on the cart needs programming before or after assembly** (no GAL/CPLD).
- Flash is programmed in-circuit through the card edge, either by the Flash Helper or by the 6502 itself.
- Existing 16K cart images run unmodified (see *Legacy 16K images*).
- Optional game saves in flash sectors. No FRAM or battery.

## System context

- VCS: 65C02 at 1 MHz. Timing margins are very large.
- The cart owns `$C000–$FFFF`. The system ROM is disabled by grounding EXP0/EXP1 on the card edge, the same as Rev 1.0b.
- All signals used are on the 6502 card edge: `A0–A15`, `D0–D7`, `RWB`, `PHI2`, `RESB`, `VCC`, `GND`, `EXP0`, `EXP1`.
- Board outline and card-edge footprint are reused from the ROM Cart (Rev 1.0a and 1.0b share the same outline, about 82 × 58 mm including fingers).

## Memory map

| CPU range | Read | Write |
|---|---|---|
| `$C000–$DFFF` | Switchable 8K window (selected by bank register) | Flash `WEB` (only effective with a JEDEC command sequence) |
| `$E000–$FFFF` | Fixed: always bank 63 of the primary flash | Latches `D0–D7` into the bank register |

The vectors, interrupt handlers and bank-switch code live in the fixed region, so bank switching can never unmap the running code or the vectors.

## Bank register

Write-only. Any write to `$E000–$FFFF` latches it; by convention, use `$E000`. It is cleared to 0 by `RESB`.

| Bits | Function |
|---|---|
| B0–B5 | 8K bank within a flash chip (64 banks = 512KB) |
| B6 | 0 = primary flash (U1), 1 = secondary flash (U2) |
| B7 | Unused. Latched but not brought out; reserved for a future 2MB variant |

| Register value | Window contents |
|---|---|
| 0–63 | Primary flash banks 0–63 |
| 64–127 | Secondary flash banks 0–63 (reads open bus if U2 not fitted) |
| 128–255 | Mirror of 0–127 |

The fixed region always maps to **primary bank 63**, the last 8K of U1. With a smaller part fitted in U1 (SST39SF010A/020A), the unused high address pins are NC, so "bank 63" aliases to that chip's last 8K automatically.

Software should keep a RAM shadow of the current bank value, because the register can't be read back.

## Build variants

| Variant | U1 | U2 | Size |
|---|---|---|---|
| Standard | SST39SF040 | DNP | 512KB |
| Large | SST39SF040 | SST39SF040 | 1MB |
| Small (optional) | SST39SF010A / 020A | DNP | 128 / 256KB |

In KiCad, mark U2 and its decoupling cap as **Do not populate** so the fabrication toolkit omits them from the BOM and placement files.

## Bill of materials

| Ref | Part | Package | Fitted | Digi-Key | Notes |
|---|---|---|---|---|---|
| U1 | SST39SF040-70-4C-TU | TSOP-32 (8 × 13.4 mm) | Always | 150-SST39SF040-70-4C-TU-ND | Primary flash |
| U2 | SST39SF040-70-4C-TU | TSOP-32 (8 × 13.4 mm) | DNP by default | 150-SST39SF040-70-4C-TU-ND | Secondary flash |
| U3 | 74HC273D,653 | SOIC-20 | Always | 1727-2795-1-ND | Bank register |
| U4 | 74HC138D,653 | SOIC-16 | Always | 1727-2781-1-ND | Read/write strobes |
| U5 | 74HC139D,653 | SOIC-16 | Always | 1727-5943-1-ND | Write split and chip select |
| U6, U7 | 74HC32D,653 | SOIC-14 | Always | 1727-2797-1-ND | High address lines |
| U8 | 74HC1G04GV,125 | SOT-23-5 (SOT-753) | Always | 1727-6034-1-ND | Primary `CE1B` inverter |
| C1–C8 | 100nF 50V X7R (C0603C104K5RACTU) | 0603 | Always (the one for U2 is DNP) | 399-C0603C104K5RACTUCT-ND | One per IC, placed close to VCC pin |
| C9 | 10µF 16V X5R (CC0805KRX5R7BB106) | 0805 | Always | 311-3502-1-ND | Bulk decoupling near the card edge |
| J1 | 6502 Card Edge | existing footprint | n/a | — | Board edge fingers, from Rev 1.0b |

The flash is also sold as **SST39SF040-55-4C-TU** and **SST39SF040-55-4I-TU** (55 ns, commercial and industrial). All three share the TU package and pinout, and any of them is far quicker than this bus needs, so buy whichever is in stock.

The logic is all Nexperia 74HC, which Digi-Key stocks deeply; TI's HC parts in these packages are largely obsolete. U8 is the one part where vendors disagree on pin numbering, so check before substituting: Nexperia's 74HC1G04GV and TI's SN74LVC1G04DBVR both use pin 1 = n.c., 2 = A, 3 = GND, 4 = Y, 5 = VCC, which is what the symbol expects.

## Logic

### Signal summary

| Net | Source | Meaning |
|---|---|---|
| `OEB` | U4 Y7 | Read of `$C000–$FFFF` during PHI2 |
| `CWR` | U4 Y6 | Write to `$C000–$FFFF` during PHI2 (internal) |
| `WEB` | U5 1Y0 | Write to `$C000–$DFFF` during PHI2 |
| `BANKCLK` | U5 1Y1 | Write to `$E000–$FFFF` during PHI2. Rising edge at PHI2 fall latches the register |
| `B0–B7` | U3 Q0–Q7 | Bank register outputs |
| `FA13–FA18` | U6/U7 | Flash high address: `Bn OR A13` |
| `CE2B` | U5 2Y1 | Secondary flash select: `B6 AND NOT A13` |
| `CE1B` | U8 Y | Primary flash select: `NOT CE2B` |

In the fixed region A13 = 1, which forces FA13–FA18 high (bank 63) and deselects U2. In the window, A13 = 0, so the bank register drives FA13–FA18 and B6 picks the chip.

`CE1B` sits low whenever U2 isn't selected, including outside cart space. This is intentional and harmless: `OEB` and `WEB` are already limited to cart addresses and PHI2, so U1 never drives the bus or accepts writes outside its window. The cost is U1's active supply current (10 mA typical) instead of standby.

The bank register and the flash both latch data on the rising edge of a PHI2-qualified strobe, which lands one or two gate delays after PHI2 falls. The 65C02 only guarantees 10 ns of write-data hold, so this relies on the data bus keeping its value while nothing drives it during PHI2 low. That holds in this system, because every read on the bus is qualified by PHI2, and it's the same approach the Main Board's RAM write strobe uses.

### U4 — 74HC138 (same wiring as ROM Cart Rev 1.0b)

| Pin | Name | Net |
|---|---|---|
| 1 | A | RWB |
| 2 | B | A14 |
| 3 | C | A15 |
| 4 | /G2A | GND |
| 5 | /G2B | GND |
| 6 | G1 | PHI2 |
| 7 | Y7 | `OEB` |
| 9 | Y6 | `CWR` |
| 10–15 | Y5–Y0 | NC |
| 8 / 16 | GND / VCC | |

### U5 — 74HC139

| Pin | Name | Net |
|---|---|---|
| 1 | 1/G | `CWR` |
| 2 | 1A | A13 |
| 3 | 1B | GND |
| 4 | 1Y0 | `WEB` |
| 5 | 1Y1 | `BANKCLK` |
| 6, 7 | 1Y2, 1Y3 | NC |
| 15 | 2/G | GND |
| 14 | 2A | B6 |
| 13 | 2B | A13 |
| 11 | 2Y1 | `CE2B` |
| 12, 10, 9 | 2Y0, 2Y2, 2Y3 | NC |
| 8 / 16 | GND / VCC | |

### U3 — 74HC273

| Pin | Name | Net |
|---|---|---|
| 1 | /MR | RESB |
| 11 | CLK | `BANKCLK` |
| 3, 4, 7, 8, 13, 14, 17, 18 | D0–D7 | D0–D7 |
| 2, 5, 6, 9, 12, 15, 16, 19 | Q0–Q7 | B0–B7 |
| 10 / 20 | GND / VCC | |

### U6, U7 — 74HC32

| Chip | Gate | Inputs | Output |
|---|---|---|---|
| U6 | 1 (pins 1, 2 → 3) | B0, A13 | FA13 |
| U6 | 2 (pins 4, 5 → 6) | B1, A13 | FA14 |
| U6 | 3 (pins 9, 10 → 8) | B2, A13 | FA15 |
| U6 | 4 (pins 12, 13 → 11) | B3, A13 | FA16 |
| U7 | 1 (pins 1, 2 → 3) | B4, A13 | FA17 |
| U7 | 2 (pins 4, 5 → 6) | B5, A13 | FA18 |
| U7 | 3, 4 | tie inputs to GND | NC |

### U8 — 74HC1G04 (SOT-23-5)

| Pin | Name | Net |
|---|---|---|
| 2 | A | `CE2B` |
| 4 | Y | `CE1B` |
| 3 / 5 | GND / VCC | |
| 1 | NC | |

### U1, U2 — SST39SF040

Use the `6502 Parts:SST39SF040-TSOP` symbol with the `Package_SO:TSOP-I-32_11.8x8mm_P0.5mm` footprint. The TU package is 8 × 13.4 mm overall (body 11.80 × 8.00 mm, 0.50 mm pitch, land pattern C = 12.90 mm; Microchip drawings C04-628 and C04-2628), so the 12.4 × 8 mm footprint, which suits the older 8 × 14 mm package, sits too far out. **Don't use the stock `Memory_Flash:SST39SF040` symbol with a TSOP footprint:** its pin numbers are the PDIP/PLCC ones (pin 1 = A18, 16 = VSS, 32 = VDD), which don't match the TSOP package.

TSOP-32 pinout (datasheet DS20005022F, Figure 2-1):

| Pins | Signals |
|---|---|
| 1–8 | A11, A9, A8, A13, A14, A17, /WE, VDD |
| 9–16 | A18, A16, A15, A12, A7, A6, A5, A4 |
| 17–24 | A3, A2, A1, A0, DQ0, DQ1, DQ2, VSS |
| 25–32 | DQ3, DQ4, DQ5, DQ6, DQ7, /CE, A10, /OE |

Connections by signal name:

| Flash pin | U1 net | U2 net |
|---|---|---|
| A0–A12 | A0–A12 | A0–A12 |
| A13–A18 | FA13–FA18 | FA13–FA18 |
| DQ0–DQ7 | D0–D7 | D0–D7 |
| /CE | `CE1B` | `CE2B` |
| /OE | `OEB` | `OEB` |
| /WE | `WEB` | `WEB` |
| VDD / VSS | VCC / GND | VCC / GND |

### Card edge J1

Same as Rev 1.0b: EXP0 and EXP1 tied to GND. RESB is now used (U3 /MR). IRQB, NMIB, RDY, BE, SYNC, EXP2 and EXP3 stay unconnected.

## Software notes

### Bank switching

```asm
BANK      = $E000        ; any address $E000-$FFFF works
BANKSHDW  = $xx          ; zero-page shadow of current bank

setbank:  sta BANKSHDW
          sta BANK
          rts
```

`setbank` must live in the fixed region.

### Flash commands (SST39SF0x0)

Command addresses only decode A14–A0, so they map to fixed CPU addresses:

| Flash address | Bank | CPU address |
|---|---|---|
| `$5555` | 2 | `$D555` |
| `$2AAA` | 1 | `$CAAA` |

Byte program:
`bank 2: $D555←$AA` → `bank 1: $CAAA←$55` → `bank 2: $D555←$A0` → `target bank: addr←data`, then poll DQ6 (toggle bit) or DQ7 (data polling) until done. Typical time is 14 µs, maximum 20 µs.

Sector erase (4KB):
`$5555←$AA, $2AAA←$55, $5555←$80, $5555←$AA, $2AAA←$55, sector←$30`. Typical time is 18 ms.

Writing the bank register between command cycles is fine, because those writes go to `$E000+` and never assert flash `WEB`. The 6502 must set the bank before every command cycle; the Flash Helper does the same.

For the *secondary* chip, set B6 in every bank value used during the sequence.

**Programming from the 6502:** the routine must run from system RAM with interrupts off (`SEI`, and the TMS9918 interrupt disabled). While U1 is programming or erasing, its reads return status bits, including in the fixed region where the vectors and normal code live.

Programming U2 is less strict: U2 only sees bus cycles while `CE2B` is low, so the routine can run from U1's fixed bank, and U1 stays readable while U2 is busy.

### Save data

Reserve one or more 4K sectors (for example, the top half of a bank) for saves. Endurance is about 100k cycles per sector. Use the RAM-resident routine above to erase and program.

## Legacy 16K images

The register resets to 0, so at power-on the CPU sees bank 0 at `$C000` and bank 63 at `$E000`. To run an existing 16K image:

- Image bytes `$0000–$1FFF` → flash offset `$00000` (bank 0)
- Image bytes `$2000–$3FFF` → bank 63, the last 8K of the chip: flash offset `$7E000` on an SST39SF040 (`$3E000` on an 020A, `$1E000` on an 010A)

`6502-flash layout` does this automatically for 16K inputs. The one caveat: a legacy game that writes to its own ROM area at `$E000–$FFFF` will change banks.

## Programming

### Flash Helper (primary method)

An Arduino Mega 2560 shield that pretends to be the 6502. It drives the cart's bus through J1, so the cart needs no extra parts.

It is two parts, and one of them is an Arduino:

| Ref | Qty | Value | Description | DigiKey | Mouser |
|---|---|---|---|---|---|
| A1 | 1 | Arduino Mega 2560 | Arduino Mega2560 R3 Shield | — | — |
| J1 | 1 | 6502 Card Connector | Card Edge 2×20 | A31723-ND | 571-5-5530843-4 |

The card edge connector is the same TE 5-5530843-4 the Main Board already fits as J9, so nothing new has to be sourced or drawn. The Mega supplies the MCU, the 16 MHz clock, USB and its own 5 V rail; there is no CH340, no crystal, no bootloader to install and no ISP header. 6502-COB's `Hardware/Mega Helper/` is the same pattern for the COB bus.

**Power:** cart VCC from the Mega's 5 V rail, already fused at 500 mA on USB. The cart draws on the order of 10–30 mA.

Pin allocation:

| Port | Arduino pins | Signals |
|---|---|---|
| PORTA | D22-D29 | D0-D7, the data bus (PA0 = D0) |
| PORTC | D37-D30 | A8-A15 (PC0 = A8; the header runs backwards) |
| PORTL | D49-D42 | A0-A7 (PL0 = A0; likewise) |
| PB7, PB5, PG5 | D13, D11, D4 | PHI2, RWB, RESB |
| PE4, PE5 | D2, D3 | IRQB, NMIB - not used by any cart; see *Card tester* below |

Thirty-seven pins: three whole ports and five single lines. All three ports map straight
through, so the address and data buses are single-byte port writes with no bit shuffling.

**The rest of the card edge is left unconnected**, for three different reasons:

| Edge pin | Why not |
|---|---|
| EXP0, EXP1 | Tied to GND *on the card* - by both VCS carts and the KIM Keypad Card, which use it to disable the system ROM. An Arduino pin driven high into that is a short, so these must **never** be wired. |
| RDY, BE, SYNC | Only the COB CPU Cards and the Blinkenlights Card touch these, and neither is something a bus master would drive. |
| EXP2, EXP3 | Floating on every board in the family. |

Three things the allocation avoids:

- **D0/D1 are the USB serial pins** (PE0/PE1, through the on-board 16U2). Not used.
- **No analog pin is used at all**, which matters because JTAG is fused on from the factory
  on an ATmega2560 and owns PF4-PF7 (A4-A7). No fuse has to be changed; a stock Arduino
  works untouched.
- **SPI and the ICSP header are on PB0-PB3** (D50-D53) and are left alone. Only PB5 and PB7
  are used, which is safe on a Mega.

**PHI2 is D13, the on-board LED pin.** Harmless, and it doubles as a free activity light.

### Card tester

`IRQB` and `NMIB` are wired although no cartridge uses them, because the same board with
different firmware is a bench tester for any AC6502 card. Every card in the family - all
nineteen COB cards, the KIM Keypad Card and both VCS carts - carries the same
`6502 Card Edge` fingers and drops into this socket.

Interrupts are what make that worth doing: **`IRQB` is asserted by the GPIO Card, the LCD
Card, the Serial Card, the Serial Card Pro and the KIM Keypad Card**, so a tester without
it could not see a card raise an interrupt, which is most of what those cards do. `NMIB` is
one more pin and completes the pair.

The tester firmware is a separate build and is not specified here.

**Bus cycle emulation:**
- Write: set RWB = 0, address and data → PHI2 high → PHI2 low (latches) → release data.
- Read: set RWB = 1, address → PHI2 high → sample data → PHI2 low.

Use direct port writes, not `digitalWrite` — that is the whole reason for choosing these ports.

**Firmware:** PlatformIO, `megaatmega2560`, in `Firmware/FH Programmer/`. Updates are an ordinary upload over the Arduino's own USB.

**Host tool:** `6502-flash`, a Node.js CLI using `serialport`, in `Firmware/FH Programmer/host/`. Commands: identify (read the JEDEC ID), erase chip or sector, program, verify, read back, 16K legacy layout, and merge a save overlay. `program` reads the `.crt` and nothing else — a `.sav` can never reach a chip by accident.

### 6502 self-update (secondary method)

Once a cart holds a loader in the fixed bank (for example, hold a key at reset), the VCS can update its own cart over a serial card, using the RAM-resident routine above.

### TL866 (fallback)

Only possible by removing the flash from the board. Not a normal workflow for an SMD build.

## Open items

- Decide whether B7 gets brought out at all (test pad or debug LED). It is currently latched and left unconnected.
- ~~Draw and lay out the Flash Helper PCB.~~ Done: `Hardware/Flash Helper/Rev 1.0/`, DRC clean, gerbers exported, boards ordered.
- ~~Write the Flash Helper firmware and the `6502-flash` host tool.~~ Written: `Firmware/FH Programmer/` and its `host/`. Both are complete and both have been run — the firmware against a Mega 2560 with an empty slot, the tool against that and against a simulated cart. **Neither has met a cartridge**, so everything below the serial protocol is unproven: the bus cycles, the bank register, the JEDEC sequences, programming and erasing. See the firmware README's *What has and has not been proved*.
