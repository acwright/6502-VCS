# Bill of materials: 6502-VCS

Every part for every board in this repository, by revision, with supplier numbers.

## How to use this

1. **Find your board and revision** in [Which revision do I have?](#which-revision-do-i-have)
2. **Read the [known issues](#known-issues)** for that revision, because they change what you buy or fit.
3. **Order from the table for your revision.** Each revision links to files you can upload to Digi-Key and Mouser. Those files are for one board, so multiply the quantities if you're building more. If a site asks which column is which, the first column is its part number and the third is the quantity. A cart only holds what that supplier sells, so check the table for anything else, such as chips from Jameco.
4. **Set the jumpers** before the first power-up. The README's [Jumpers](README.md#jumpers) section says which ones each board needs, and the table for your revision lists the shunts.

**Pre-soldered parts.** Some boards on Tindie come with their surface-mount parts already soldered. Parts marked **Yes** under Pre-soldered are the ones soldered on those boards. Check your listing, because others are sold as a bare PCB. Each revision that has such parts also has a `through-hole` cart that leaves them out. To solder a bare board yourself, use the full cart.

**Suppliers.** Every part has one set of numbers, so the same resistor is the same order line on every board. The numbers were read from Digi-Key and Mouser on 2026-11-04, and stock changes. A blank supplier cell means that supplier doesn't sell the part, or only sells it in bulk.

**The `bom.csv` files** under `Production/` are for JLCPCB assembly. They list the same parts. A blank LCSC cell there means JLCPCB doesn't place that part, and JLCPCB's "missing parts" warning about it is expected.

## Which revision do I have?

Look on the board: the silk prints the revision next to the copyright line. [REVISIONS.md](REVISIONS.md) has the facts for each one, and its history lists what changed between them.

**To make a new board, make the newest revision**, and check its label first. The README's [Which revision to make](README.md#which-revision-to-make) explains the three labels: **Tested**, **Proven design** and **Untested**.

| Board | Revision | What the silk says | Status | Label |
|---|---|---|---|---|
| [Flash Cart](#flash-cart) | 1.0 | Rev 1.0 | Made, tested | **Tested** |
| [Flash Cart](#flash-cart) | 1.1 | Rev 1.1 | Drawn, not made yet | **Proven design**: the bare card edge and the shell's holes at their nominal places |
| [Flash Helper](#flash-helper) | 1.0 | Rev 1.0 | Made, tested | **Tested** |
| [Input Board](#input-board) | 1.0 | Rev 1.0 | Made, tested | **Tested** |
| [Input Board](#input-board) | 1.1 | Rev 1.1 | Drawn, not made yet | **Proven design**: silkscreen text only |
| [Main Board](#main-board) | 1.0 | Rev 1.0 | Made, tested | **Tested** |
| [Main Board](#main-board) | 1.1 | Rev 1.1 | Drawn, not made yet | **Proven design**: 10k pull-ups, small part moves and tracks rerouted. The jumpers are gone, and `HRDB` is wired as it is on the tested Rev 1.0 with them fitted |
| [Output Board](#output-board) | 1.0 | Rev 1.0 | Made, tested | **Tested** |
| [Output Board](#output-board) | 1.1 | Rev 1.1 | Drawn, not made yet | **Proven design**: silkscreen text, the `VDD` header removed, JP1 ships open, and JP2 and JP3 removed and wired as Rev 1.0 ships them |
| [ROM Cart](#rom-cart) | 1.0a | Rev 1.0. U1's label tells them apart: AT28C256 is Rev 1.0a | Made, tested | **Tested**: built and tested. Takes an AT28C256 EEPROM |
| [ROM Cart](#rom-cart) | 1.0b | Rev 1.0. U1's label tells them apart: AT27C256 is Rev 1.0b | Made, tested | **Tested**: built and tested. Takes an AT27C256 EPROM |
| [ROM Cart](#rom-cart) | 1.1 | Rev 1.1 | Drawn, not made yet | **Proven design**: the bare card edge and the shell's holes at their nominal places; it takes the AT28C256, as Rev 1.0a does |

## Known issues

These change what you buy or fit. The boards themselves stay as they were made.

| Board | Revision | Parts | Issue |
|---|---|---|---|
| Input Board | 1.0 | C2, C4 | The silk says 22 pF; fit 20 pF. A board built with 22 pF is fine. |
| Input Board | 1.0 | U2 | The silk says ATmega1284-P; fit the ATmega1284 listed here. |
| Main Board | 1.0 | R4, R10–R14 | Fit 10k, not 1k. If your board came with 1k soldered here, replace it. See the build notes. |
| Main Board | 1.0 | J10 | Fit a box header for a ribbon cable. The silk shows a plain header, but the holes are the same. Pin 1 is the square pad, and the notch faces the even-numbered pins. |
| Output Board | 1.0 | J1 | `VDD` is the supply for a real SID at pin 28: 12 V for a 6581, 9 V for an 8580. The standard build does not provide it, and it has never been tested. Leave it unconnected with an ARMSID. |
| Output Board | 1.0 | U2 | The silk says 6581; fit an ARMSID. |

### Build notes

How to build each board, where it needs more than its parts list.

<!-- Build notes: hand-written. Tools/bom/gen_bom.py keeps everything between these two markers. -->

**Input Board**

> **Joysticks**: there is no DB-9 in this BOM because the board does not carry one. The joysticks share the VIA ports with the keyboard encoder and connect through the `J1` PORT B and `J2` PORT A box headers, using a helper board from the [6502-COB](https://github.com/acwright/6502-COB) project — the **GPIO Helper** for a direct box-header connection, or the **Joystick Helper** to convert a port to a DB-9 with pull-ups fitted. Budget for one helper per stick.

**Flash Cart**

Fitted for the 512KB build. For 1MB, fit U2 and C2 as well; for 128/256KB, fit an SST39SF010A or SST39SF020A at U1.

> **Flash**: `SST39SF040-70-4I-TU`, `SST39SF040-55-4C-TU` and `SST39SF040-55-4I-TU` are the same package and
> pinout as the listed `-70-4C-TU`, so buy whichever is in stock. Stock of each comes and goes from day to day. The
> footprint is drawn for the `-TU` package, not the older `-WHE`. JLCPCB stocks the `-70-4C-TU` as LCSC C43083883.

**Assembly: the hardest board in the family to build by hand.** U1 and U2 are TSOP-32 parts with 0.5 mm pins. Having
the board assembled by JLCPCB is the preferred way to get one. The cart's `bom.csv` carries an LCSC number only for
U4 so far, so for now an assembled order needs the other parts chosen on JLCPCB's site.

A fault on a chip-select or output-enable pin shows up as reads that fail. A fault on an address pin, a bank-select
line or the write strobe doesn't: a new chip is blank, and a blank chip reads `$FF` at every address whatever those
pins are doing, so that kind only appears when the chip refuses a command. The first hand-built Rev 1.0 carts had both
kinds. One had a bridge between U1's pins 30 and 31 (`CE1B` and A10). Both needed rework before the chips took
commands reliably: at U1, U2 and U5, and on the 1MB cart at U3 and U6, where a bad joint left the bank-select line
FA13 floating.

After building one by hand, check U1's pins 6–8 and 30–32 (and U2's on a 1MB cart), U5, U3 and U6 under
magnification, and clean off the flux. Then run `6502-flash id` several times: a working chip answers `$BF $B7` every
time. Each run resets the Helper, and a joint that leaves an input floating can pass one run and fail the next.

**Building a Rev 1.0:** nothing to do. Rev 1.1 changes the card edge, which has no solder mask on its tab, and moves the shell's four holes to their nominal places, by up to 0.18 mm. A Rev 1.0's masked edge works in the slot, and the cart shell is drawn for its holes.

**Main Board**

**Pull-ups on Rev 1.0**

Fit 10kΩ for R4 and R10–R14, the pull-ups on the shared lines, not the 1kΩ in the files. With a 1kΩ pull-up, a device that pulls `IRQB` low sinks 5 mA, more than the 3.2 mA that the W65C22's and W65C21's IRQ outputs are rated for. R4, the `RESB` pull-up, isn't part of the reset circuit's timing: the circuit only pulls `RESB` low, through Q1. Rev 1.1 has 10kΩ on all six.

**Output Board**

**Building a Rev 1.0: cut JP1.** The pico9918 drives its `/INT` high as well as low. D1 is meant to let it only pull `IRQB` (or `NMIB`, through J6) low, but JP1, a solder jumper bridged on the board as made, shorts across D1. With JP1 bridged, the pico9918 holds `IRQB` high against the Input Board's VIA, so the VIA's interrupts don't reach the 65C02. Cut the trace between JP1's pads, and check with a meter that they no longer connect; Rev 1.1 ships JP1 open. Rev 1.1's other changes, its silkscreen and the `VDD` header it drops, need nothing on a built board: the ARMSID needs nothing at U2 pin 28. Leave JP2 and JP3 as shipped: Rev 1.1 drops them and is wired the way they ship.

**ROM Cart**

**Building a Rev 1.0a:** nothing to do. Rev 1.1 changes the card edge, which has no solder mask on its tab, and moves the shell's four holes to their nominal places, by up to 0.18 mm. A Rev 1.0a's masked edge works in the slot, and the cart shell is drawn for its holes. Rev 1.1 takes the AT28C256, as Rev 1.0a does.

**Building a Rev 1.0b:** nothing to do. Rev 1.1 changes the card edge, which has no solder mask on its tab, and moves the shell's four holes to their nominal places, by up to 0.18 mm. A Rev 1.0b's masked edge works in the slot, and the cart shell is drawn for its holes. Rev 1.1 takes the AT28C256, so a cart for the AT27C256 is still a Rev 1.0b.

<!-- End of build notes. -->

## Flash Cart

### Flash Cart Rev 1.1

Drawn, not made yet. **Proven design**: the bare card edge and the shell's holes at their nominal places.

Cart files: [digikey.csv](BOM/Flash%20Cart/Rev%201.1/digikey.csv), [mouser.csv](BOM/Flash%20Cart/Rev%201.1/mouser.csv), [digikey-through-hole.csv](BOM/Flash%20Cart/Rev%201.1/digikey-through-hole.csv), [mouser-through-hole.csv](BOM/Flash%20Cart/Rev%201.1/mouser-through-hole.csv)

| Reference | Qty | Value | Part | Digi-Key | Mouser | Other | Pre-soldered |
|---|---|---|---|---|---|---|---|
| C1, C3–C8 | 7 | 100nF | KEMET C0603C104K5RACTU | [399-C0603C104K5RACTUCT-ND](https://www.digikey.com/en/products/filter?keywords=399-C0603C104K5RACTUCT-ND) | [80-C0603C104K5R](https://www.mouser.com/ProductDetail/80-C0603C104K5R) |  | |
| C9 | 1 | 10uF | YAGEO CC0805KRX5R7BB106 | [311-3502-1-ND](https://www.digikey.com/en/products/filter?keywords=311-3502-1-ND) | [603-CC0805KRX57BB106](https://www.mouser.com/ProductDetail/603-CC0805KRX57BB106) |  | |
| U1 | 1 | SST39SF040 | Microchip Technology SST39SF040-70-4C-TU | [150-SST39SF040-70-4C-TU-ND](https://www.digikey.com/en/products/filter?keywords=150-SST39SF040-70-4C-TU-ND) |  |  | |
| U3 | 1 | 74HC273 | Nexperia USA Inc. 74HC273D,653 | [1727-2795-1-ND](https://www.digikey.com/en/products/filter?keywords=1727-2795-1-ND) | [771-74HC273D-T](https://www.mouser.com/ProductDetail/771-74HC273D-T) |  | |
| U4 | 1 | 74HC138 | Nexperia USA Inc. 74HC138D,653 | [1727-2781-1-ND](https://www.digikey.com/en/products/filter?keywords=1727-2781-1-ND) | [771-74HC138D-T](https://www.mouser.com/ProductDetail/771-74HC138D-T) | LCSC [C5602](https://www.lcsc.com/search?q=C5602) | Yes |
| U5 | 1 | 74HC139 | Nexperia USA Inc. 74HC139D,653 | [1727-5943-1-ND](https://www.digikey.com/en/products/filter?keywords=1727-5943-1-ND) | [771-74HC139D-T](https://www.mouser.com/ProductDetail/771-74HC139D-T) |  | |
| U6, U7 | 2 | 74HC32 | Nexperia USA Inc. 74HC32D,653 | [1727-2797-1-ND](https://www.digikey.com/en/products/filter?keywords=1727-2797-1-ND) | [771-74HC32D-T](https://www.mouser.com/ProductDetail/771-74HC32D-T) |  | |
| U8 | 1 | 74HC1G04 | Nexperia USA Inc. 74HC1G04GV,125 | [1727-6034-1-ND](https://www.digikey.com/en/products/filter?keywords=1727-6034-1-ND) | [771-74HC1G04GV](https://www.mouser.com/ProductDetail/771-74HC1G04GV) |  | |

**Do not fit** C2, U2: see the build notes.

### Flash Cart Rev 1.0

Made, tested. **Tested**.

Cart files: [digikey.csv](BOM/Flash%20Cart/Rev%201.0/digikey.csv), [mouser.csv](BOM/Flash%20Cart/Rev%201.0/mouser.csv), [digikey-through-hole.csv](BOM/Flash%20Cart/Rev%201.0/digikey-through-hole.csv), [mouser-through-hole.csv](BOM/Flash%20Cart/Rev%201.0/mouser-through-hole.csv)

| Reference | Qty | Value | Part | Digi-Key | Mouser | Other | Pre-soldered |
|---|---|---|---|---|---|---|---|
| C1, C3–C8 | 7 | 100nF | KEMET C0603C104K5RACTU | [399-C0603C104K5RACTUCT-ND](https://www.digikey.com/en/products/filter?keywords=399-C0603C104K5RACTUCT-ND) | [80-C0603C104K5R](https://www.mouser.com/ProductDetail/80-C0603C104K5R) |  | |
| C9 | 1 | 10uF | YAGEO CC0805KRX5R7BB106 | [311-3502-1-ND](https://www.digikey.com/en/products/filter?keywords=311-3502-1-ND) | [603-CC0805KRX57BB106](https://www.mouser.com/ProductDetail/603-CC0805KRX57BB106) |  | |
| U1 | 1 | SST39SF040 | Microchip Technology SST39SF040-70-4C-TU | [150-SST39SF040-70-4C-TU-ND](https://www.digikey.com/en/products/filter?keywords=150-SST39SF040-70-4C-TU-ND) |  |  | |
| U3 | 1 | 74HC273 | Nexperia USA Inc. 74HC273D,653 | [1727-2795-1-ND](https://www.digikey.com/en/products/filter?keywords=1727-2795-1-ND) | [771-74HC273D-T](https://www.mouser.com/ProductDetail/771-74HC273D-T) |  | |
| U4 | 1 | 74HC138 | Nexperia USA Inc. 74HC138D,653 | [1727-2781-1-ND](https://www.digikey.com/en/products/filter?keywords=1727-2781-1-ND) | [771-74HC138D-T](https://www.mouser.com/ProductDetail/771-74HC138D-T) | LCSC [C5602](https://www.lcsc.com/search?q=C5602) | Yes |
| U5 | 1 | 74HC139 | Nexperia USA Inc. 74HC139D,653 | [1727-5943-1-ND](https://www.digikey.com/en/products/filter?keywords=1727-5943-1-ND) | [771-74HC139D-T](https://www.mouser.com/ProductDetail/771-74HC139D-T) |  | |
| U6, U7 | 2 | 74HC32 | Nexperia USA Inc. 74HC32D,653 | [1727-2797-1-ND](https://www.digikey.com/en/products/filter?keywords=1727-2797-1-ND) | [771-74HC32D-T](https://www.mouser.com/ProductDetail/771-74HC32D-T) |  | |
| U8 | 1 | 74HC1G04 | Nexperia USA Inc. 74HC1G04GV,125 | [1727-6034-1-ND](https://www.digikey.com/en/products/filter?keywords=1727-6034-1-ND) | [771-74HC1G04GV](https://www.mouser.com/ProductDetail/771-74HC1G04GV) |  | |

**Do not fit** C2, U2: see the build notes.


## Flash Helper

### Flash Helper Rev 1.0

Made, tested. **Tested**.

Cart files: [digikey.csv](BOM/Flash%20Helper/Rev%201.0/digikey.csv), [mouser.csv](BOM/Flash%20Helper/Rev%201.0/mouser.csv)

| Reference | Qty | Value | Part | Digi-Key | Mouser | Other |
|---|---|---|---|---|---|---|
| A1 | 1 | Arduino Mega2560 R3 Shield | Arduino A000067 | [1050-1018-ND](https://www.digikey.com/en/products/filter?keywords=1050-1018-ND) | [782-A000067](https://www.mouser.com/ProductDetail/782-A000067) |  |
| J1 | 1 | 6502 Card Connector | TE Connectivity 5-5530843-4 | [A31723-ND](https://www.digikey.com/en/products/filter?keywords=A31723-ND) | [571-5-5530843-4](https://www.mouser.com/ProductDetail/571-5-5530843-4) |  |


## Input Board

### Input Board Rev 1.1

Drawn, not made yet. **Proven design**: silkscreen text only.

Cart files: [digikey.csv](BOM/Input%20Board/Rev%201.1/digikey.csv), [mouser.csv](BOM/Input%20Board/Rev%201.1/mouser.csv), [digikey-through-hole.csv](BOM/Input%20Board/Rev%201.1/digikey-through-hole.csv), [mouser-through-hole.csv](BOM/Input%20Board/Rev%201.1/mouser-through-hole.csv)

| Reference | Qty | Value | Part | Digi-Key | Mouser | Other | Pre-soldered |
|---|---|---|---|---|---|---|---|
| C1, C3, C5–C8 | 6 | 100nF | YAGEO CC0805KRX7R9BB104 | [311-1140-1-ND](https://www.digikey.com/en/products/filter?keywords=311-1140-1-ND) | [603-CC805KRX7R9BB104](https://www.mouser.com/ProductDetail/603-CC805KRX7R9BB104) | LCSC [C49678](https://www.lcsc.com/search?q=C49678) | Yes |
| C2, C4 | 2 | 20pF | KYOCERA AVX SR151A200JAR | [478-7724-ND](https://www.digikey.com/en/products/filter?keywords=478-7724-ND) | [581-SR151A200JAR](https://www.mouser.com/ProductDetail/581-SR151A200JAR) |  | |
| D1 | 1 | 1N914 | onsemi 1N914 | [1N914FS-ND](https://www.digikey.com/en/products/filter?keywords=1N914FS-ND) | [512-1N914](https://www.mouser.com/ProductDetail/512-1N914) |  | |
| J1 | 1 | PORT B | Adam Tech BHR-12-VUA | [2057-BHR-12-VUA-ND](https://www.digikey.com/en/products/filter?keywords=2057-BHR-12-VUA-ND) | [737-BHR-12-VUA](https://www.mouser.com/ProductDetail/737-BHR-12-VUA) | 2057-BHR-12-VUA-ND | |
| J2 | 1 | PORT A | Adam Tech BHR-12-VUA | [2057-BHR-12-VUA-ND](https://www.digikey.com/en/products/filter?keywords=2057-BHR-12-VUA-ND) | [737-BHR-12-VUA](https://www.mouser.com/ProductDetail/737-BHR-12-VUA) | 2057-BHR-12-VUA-ND | |
| J3 | 1 | PS/2 KEYBOARD | Kycon, Inc. KMDGX-6S-BS | [2092-KMDGX-6S-BS-ND](https://www.digikey.com/en/products/filter?keywords=2092-KMDGX-6S-BS-ND) | [806-KMDGX-6S-BS](https://www.mouser.com/ProductDetail/806-KMDGX-6S-BS) |  | |
| J4 | 1 | 6502 Bus | Würth Elektronik 61204021621 | [732-5401-ND](https://www.digikey.com/en/products/filter?keywords=732-5401-ND) | [710-61204021621](https://www.mouser.com/ProductDetail/710-61204021621) |  | |
| J5 | 1 | KEYBOARD | Amphenol D25P33E4GX00LF | [609-1505-ND](https://www.digikey.com/en/products/filter?keywords=609-1505-ND) | [649-D25P33E4GX00LF](https://www.mouser.com/ProductDetail/649-D25P33E4GX00LF) |  | |
| J6 | 1 | IO SELECT | Pin header 2×8, 2.54 mm, cut from a strip | [S2011EC-40-ND](https://www.digikey.com/en/products/filter?keywords=S2011EC-40-ND) | [649-67996-140HLF](https://www.mouser.com/ProductDetail/649-67996-140HLF) |  | |
| R1 | 1 | 1K | YAGEO RC0805FR-071KL | [311-1.00KCRCT-ND](https://www.digikey.com/en/products/filter?keywords=311-1.00KCRCT-ND) | [603-RC0805FR-071KL](https://www.mouser.com/ProductDetail/603-RC0805FR-071KL) | LCSC [C17513](https://www.lcsc.com/search?q=C17513) | Yes |
| U1 | 1 | 65C22 | Western Design Center (WDC) W65C22N6TPG-14 |  | [955-W65C22N6TPG-14](https://www.mouser.com/ProductDetail/955-W65C22N6TPG-14) |  | |
| U2 | 1 | ATmega1284 | Microchip Technology ATMEGA1284-PU | [ATMEGA1284-PU-ND](https://www.digikey.com/en/products/filter?keywords=ATMEGA1284-PU-ND) | [556-ATMEGA1284-PU](https://www.mouser.com/ProductDetail/556-ATMEGA1284-PU) |  | |
| U3 | 1 | 74HC138 | Nexperia USA Inc. 74HC138D,653 | [1727-2781-1-ND](https://www.digikey.com/en/products/filter?keywords=1727-2781-1-ND) | [771-74HC138D-T](https://www.mouser.com/ProductDetail/771-74HC138D-T) | LCSC [C5602](https://www.lcsc.com/search?q=C5602) | Yes |
| Y1 | 1 | 16 MHz | ECS Inc. ECS-160-20-4X | [X1103-ND](https://www.digikey.com/en/products/filter?keywords=X1103-ND) | [520-HCU1600-20X](https://www.mouser.com/ProductDetail/520-HCU1600-20X) |  | |
| U1, U2 | 2 | Socket | IC socket, 40-pin, 0.6 in | [3M5471-ND](https://www.digikey.com/en/products/filter?keywords=3M5471-ND) | [517-4840-6000-CP](https://www.mouser.com/ProductDetail/517-4840-6000-CP) | | |
| J6 | 1 | | Shunt, 2.54 mm | [S9337-ND](https://www.digikey.com/en/products/filter?keywords=S9337-ND) |  |  | |

Pin headers are cut from strips, and the cart files count whole strips.

- **J4:** Male box header with a keying notch, for a 40-way ribbon cable.

### Input Board Rev 1.0

Made, tested. **Tested**.

Cart files: [digikey.csv](BOM/Input%20Board/Rev%201.0/digikey.csv), [mouser.csv](BOM/Input%20Board/Rev%201.0/mouser.csv), [digikey-through-hole.csv](BOM/Input%20Board/Rev%201.0/digikey-through-hole.csv), [mouser-through-hole.csv](BOM/Input%20Board/Rev%201.0/mouser-through-hole.csv)

| Reference | Qty | Value | Part | Digi-Key | Mouser | Other | Pre-soldered |
|---|---|---|---|---|---|---|---|
| C1, C3, C5–C8 | 6 | 100nF | YAGEO CC0805KRX7R9BB104 | [311-1140-1-ND](https://www.digikey.com/en/products/filter?keywords=311-1140-1-ND) | [603-CC805KRX7R9BB104](https://www.mouser.com/ProductDetail/603-CC805KRX7R9BB104) | LCSC [C49678](https://www.lcsc.com/search?q=C49678) | Yes |
| C2, C4 | 2 | 22pF | KYOCERA AVX SR151A200JAR | [478-7724-ND](https://www.digikey.com/en/products/filter?keywords=478-7724-ND) | [581-SR151A200JAR](https://www.mouser.com/ProductDetail/581-SR151A200JAR) |  | |
| D1 | 1 | 1N914 | onsemi 1N914 | [1N914FS-ND](https://www.digikey.com/en/products/filter?keywords=1N914FS-ND) | [512-1N914](https://www.mouser.com/ProductDetail/512-1N914) |  | |
| J1 | 1 | PORT B | Adam Tech BHR-12-VUA | [2057-BHR-12-VUA-ND](https://www.digikey.com/en/products/filter?keywords=2057-BHR-12-VUA-ND) | [737-BHR-12-VUA](https://www.mouser.com/ProductDetail/737-BHR-12-VUA) | 2057-BHR-12-VUA-ND | |
| J2 | 1 | PORT A | Adam Tech BHR-12-VUA | [2057-BHR-12-VUA-ND](https://www.digikey.com/en/products/filter?keywords=2057-BHR-12-VUA-ND) | [737-BHR-12-VUA](https://www.mouser.com/ProductDetail/737-BHR-12-VUA) | 2057-BHR-12-VUA-ND | |
| J3 | 1 | PS/2 KEYBOARD | Kycon, Inc. KMDGX-6S-BS | [2092-KMDGX-6S-BS-ND](https://www.digikey.com/en/products/filter?keywords=2092-KMDGX-6S-BS-ND) | [806-KMDGX-6S-BS](https://www.mouser.com/ProductDetail/806-KMDGX-6S-BS) |  | |
| J4 | 1 | 6502 Bus | Würth Elektronik 61204021621 | [732-5401-ND](https://www.digikey.com/en/products/filter?keywords=732-5401-ND) | [710-61204021621](https://www.mouser.com/ProductDetail/710-61204021621) |  | |
| J5 | 1 | KEYBOARD | Amphenol D25P33E4GX00LF | [609-1505-ND](https://www.digikey.com/en/products/filter?keywords=609-1505-ND) | [649-D25P33E4GX00LF](https://www.mouser.com/ProductDetail/649-D25P33E4GX00LF) |  | |
| J6 | 1 | IO SELECT | Pin header 2×8, 2.54 mm, cut from a strip | [S2011EC-40-ND](https://www.digikey.com/en/products/filter?keywords=S2011EC-40-ND) | [649-67996-140HLF](https://www.mouser.com/ProductDetail/649-67996-140HLF) |  | |
| R1 | 1 | 1K | YAGEO RC0805FR-071KL | [311-1.00KCRCT-ND](https://www.digikey.com/en/products/filter?keywords=311-1.00KCRCT-ND) | [603-RC0805FR-071KL](https://www.mouser.com/ProductDetail/603-RC0805FR-071KL) | LCSC [C17513](https://www.lcsc.com/search?q=C17513) | Yes |
| U1 | 1 | 65C22 | Western Design Center (WDC) W65C22N6TPG-14 |  | [955-W65C22N6TPG-14](https://www.mouser.com/ProductDetail/955-W65C22N6TPG-14) |  | |
| U2 | 1 | ATmega1284-P | Microchip Technology ATMEGA1284-PU | [ATMEGA1284-PU-ND](https://www.digikey.com/en/products/filter?keywords=ATMEGA1284-PU-ND) | [556-ATMEGA1284-PU](https://www.mouser.com/ProductDetail/556-ATMEGA1284-PU) |  | |
| U3 | 1 | 74HC138 | Nexperia USA Inc. 74HC138D,653 | [1727-2781-1-ND](https://www.digikey.com/en/products/filter?keywords=1727-2781-1-ND) | [771-74HC138D-T](https://www.mouser.com/ProductDetail/771-74HC138D-T) | LCSC [C5602](https://www.lcsc.com/search?q=C5602) | Yes |
| Y1 | 1 | 16 MHz | ECS Inc. ECS-160-20-4X | [X1103-ND](https://www.digikey.com/en/products/filter?keywords=X1103-ND) | [520-HCU1600-20X](https://www.mouser.com/ProductDetail/520-HCU1600-20X) |  | |
| U1, U2 | 2 | Socket | IC socket, 40-pin, 0.6 in | [3M5471-ND](https://www.digikey.com/en/products/filter?keywords=3M5471-ND) | [517-4840-6000-CP](https://www.mouser.com/ProductDetail/517-4840-6000-CP) | | |
| J6 | 1 | | Shunt, 2.54 mm | [S9337-ND](https://www.digikey.com/en/products/filter?keywords=S9337-ND) |  |  | |

Pin headers are cut from strips, and the cart files count whole strips.

- **C2, C4:** 16 MHz crystal capacitors: fit 20 pF. Made boards whose silk says 22 pF keep it; a board built with 22 pF is fine. Mouser has none in stock today.
- **J4:** Male box header with a keying notch, for a 40-way ribbon cable.


## Main Board

### Main Board Rev 1.1

Drawn, not made yet. **Proven design**: 10k pull-ups, small part moves and tracks rerouted. The jumpers are gone, and `HRDB` is wired as it is on the tested Rev 1.0 with them fitted.

Cart files: [digikey.csv](BOM/Main%20Board/Rev%201.1/digikey.csv), [mouser.csv](BOM/Main%20Board/Rev%201.1/mouser.csv), [digikey-through-hole.csv](BOM/Main%20Board/Rev%201.1/digikey-through-hole.csv), [mouser-through-hole.csv](BOM/Main%20Board/Rev%201.1/mouser-through-hole.csv)

| Reference | Qty | Value | Part | Digi-Key | Mouser | Other | Pre-soldered |
|---|---|---|---|---|---|---|---|
| C1, C3–C11 | 10 | 100nF | YAGEO CC0805KRX7R9BB104 | [311-1140-1-ND](https://www.digikey.com/en/products/filter?keywords=311-1140-1-ND) | [603-CC805KRX7R9BB104](https://www.mouser.com/ProductDetail/603-CC805KRX7R9BB104) | LCSC [C49678](https://www.lcsc.com/search?q=C49678) | Yes |
| C2 | 1 | 10uF | KYOCERA AVX TAJA106K016RNJ | [478-1655-1-ND](https://www.digikey.com/en/products/filter?keywords=478-1655-1-ND) | [581-TAJA106K016R](https://www.mouser.com/ProductDetail/581-TAJA106K016R) | LCSC [C7171](https://www.lcsc.com/search?q=C7171) | Yes |
| D1 | 1 | 1N5819 | MCC (Micro Commercial Components) B5819WS-TP | [B5819WS-TPMSCT-ND](https://www.digikey.com/en/products/filter?keywords=B5819WS-TPMSCT-ND) |  | LCSC [C191023](https://www.lcsc.com/search?q=C191023) | Yes |
| D2 | 1 | LED | Lite-On Inc. LTST-C170KGKT | [160-1414-1-ND](https://www.digikey.com/en/products/filter?keywords=160-1414-1-ND) | [859-LTST-C170KGKT](https://www.mouser.com/ProductDetail/859-LTST-C170KGKT) | LCSC [C2297](https://www.lcsc.com/search?q=C2297) | Yes |
| J3 | 1 | USB_C_Receptacle_USB2.0 | G-Switch GT-USB-7010ASV |  |  | LCSC [C2988369](https://www.lcsc.com/search?q=C2988369) | Yes |
| J4 | 1 | RESET SW | JST Sales America Inc. B2B-XH-A | [455-B2B-XH-A-ND](https://www.digikey.com/en/products/filter?keywords=455-B2B-XH-A-ND) |  |  | |
| J9 | 1 | 6502 Card Connector | TE Connectivity 5-5530843-4 | [A31723-ND](https://www.digikey.com/en/products/filter?keywords=A31723-ND) | [571-5-5530843-4](https://www.mouser.com/ProductDetail/571-5-5530843-4) |  | |
| J10 | 1 | 6502 Bus | Würth Elektronik 61204021621 | [732-5401-ND](https://www.digikey.com/en/products/filter?keywords=732-5401-ND) | [710-61204021621](https://www.mouser.com/ProductDetail/710-61204021621) |  | |
| Q1 | 1 | SS8050 | Comchip Technology SS8050-G | [641-1790-1-ND](https://www.digikey.com/en/products/filter?keywords=641-1790-1-ND) | [750-SS8050-G](https://www.mouser.com/ProductDetail/750-SS8050-G) | LCSC [C2150](https://www.lcsc.com/search?q=C2150) | Yes |
| R2 | 1 | 1M | YAGEO RC0805FR-071ML | [311-1.00MCRCT-ND](https://www.digikey.com/en/products/filter?keywords=311-1.00MCRCT-ND) | [603-RC0805FR-071ML](https://www.mouser.com/ProductDetail/603-RC0805FR-071ML) | LCSC [C17514](https://www.lcsc.com/search?q=C17514) | Yes |
| R3 | 1 | 47k | YAGEO RC0805FR-0747KL | [311-47.0KCRCT-ND](https://www.digikey.com/en/products/filter?keywords=311-47.0KCRCT-ND) | [603-RC0805FR-0747KL](https://www.mouser.com/ProductDetail/603-RC0805FR-0747KL) | LCSC [C17713](https://www.lcsc.com/search?q=C17713) | Yes |
| R4, R8, R10–R14 | 7 | 10k | YAGEO RC0805FR-0710KL | [311-10.0KCRCT-ND](https://www.digikey.com/en/products/filter?keywords=311-10.0KCRCT-ND) | [603-RC0805FR-0710KL](https://www.mouser.com/ProductDetail/603-RC0805FR-0710KL) | LCSC [C17414](https://www.lcsc.com/search?q=C17414) | Yes |
| R5, R6 | 2 | 5.1k | YAGEO RC0805FR-075K1L | [311-5.10KCRCT-ND](https://www.digikey.com/en/products/filter?keywords=311-5.10KCRCT-ND) | [603-RC0805FR-075K1L](https://www.mouser.com/ProductDetail/603-RC0805FR-075K1L) | LCSC [C27834](https://www.lcsc.com/search?q=C27834) | Yes |
| R7 | 1 | 330 | YAGEO RC0805FR-07330RL | [311-330CRCT-ND](https://www.digikey.com/en/products/filter?keywords=311-330CRCT-ND) | [603-RC0805FR-07330RL](https://www.mouser.com/ProductDetail/603-RC0805FR-07330RL) | LCSC [C17630](https://www.lcsc.com/search?q=C17630) | Yes |
| R9 | 1 | 1k | YAGEO RC0805FR-071KL | [311-1.00KCRCT-ND](https://www.digikey.com/en/products/filter?keywords=311-1.00KCRCT-ND) | [603-RC0805FR-071KL](https://www.mouser.com/ProductDetail/603-RC0805FR-071KL) | LCSC [C17513](https://www.lcsc.com/search?q=C17513) | Yes |
| SW1 | 1 | Reset | TS-1187A-B-A-B |  |  | LCSC [C318884](https://www.lcsc.com/search?q=C318884) | |
| U1 | 1 | NE555 | Texas Instruments NE555DR | [296-6501-1-ND](https://www.digikey.com/en/products/filter?keywords=296-6501-1-ND) | [595-NE555DR](https://www.mouser.com/ProductDetail/595-NE555DR) | LCSC [C7593](https://www.lcsc.com/search?q=C7593) | Yes |
| U2 | 1 | AS6C62256 | Alliance Memory AS6C62256-55PCN | [1450-1033-ND](https://www.digikey.com/en/products/filter?keywords=1450-1033-ND) | [913-AS6C62256-55PCN](https://www.mouser.com/ProductDetail/913-AS6C62256-55PCN) |  | |
| U3 | 1 | AT28C256 | Microchip Technology AT28C256-15PU | [AT28C256-15PU-ND](https://www.digikey.com/en/products/filter?keywords=AT28C256-15PU-ND) | [556-AT28C25615PU](https://www.mouser.com/ProductDetail/556-AT28C25615PU) |  | |
| U4, U5, U7 | 3 | 74HC00 | Nexperia USA Inc. 74HC00D,653 | [1727-2773-1-ND](https://www.digikey.com/en/products/filter?keywords=1727-2773-1-ND) | [771-74HC00D-T](https://www.mouser.com/ProductDetail/771-74HC00D-T) | LCSC [C5586](https://www.lcsc.com/search?q=C5586) | Yes |
| U6 | 1 | 65C02 | Western Design Center (WDC) W65C02S6TPG-14 |  | [955-W65C02S6TPG-14](https://www.mouser.com/ProductDetail/955-W65C02S6TPG-14) |  | |
| X1 | 1 | 1 MHz | ECS Inc. ECS-100AX-010 | [X937-ND](https://www.digikey.com/en/products/filter?keywords=X937-ND) | [520-TCF100-X](https://www.mouser.com/ProductDetail/520-TCF100-X) |  | |
| U3 | 1 | Socket | 28-pin ZIF socket, or an ordinary 28-pin socket | [3M2802-ND](https://www.digikey.com/en/products/filter?keywords=3M2802-ND) | [517-228-1277-00](https://www.mouser.com/ProductDetail/517-228-1277-00) | | |
| U2 | 1 | Socket | IC socket, 28-pin, 0.6 in | [3M5481-ND](https://www.digikey.com/en/products/filter?keywords=3M5481-ND) | [517-4828-6004-CP](https://www.mouser.com/ProductDetail/517-4828-6004-CP) | | |
| U6 | 1 | Socket | IC socket, 40-pin, 0.6 in | [3M5471-ND](https://www.digikey.com/en/products/filter?keywords=3M5471-ND) | [517-4840-6000-CP](https://www.mouser.com/ProductDetail/517-4840-6000-CP) | | |

- **J3:** What LCSC C2988369 is. The footprint is HRO TYPE-C-31-M-12, and JLCPCB placed this part on the made boards.
- **J10:** Male box header with a keying notch, for a 40-way ribbon cable.

### Main Board Rev 1.0

Made, tested. **Tested**.

Cart files: [digikey.csv](BOM/Main%20Board/Rev%201.0/digikey.csv), [mouser.csv](BOM/Main%20Board/Rev%201.0/mouser.csv), [digikey-through-hole.csv](BOM/Main%20Board/Rev%201.0/digikey-through-hole.csv), [mouser-through-hole.csv](BOM/Main%20Board/Rev%201.0/mouser-through-hole.csv)

| Reference | Qty | Value | Part | Digi-Key | Mouser | Other | Pre-soldered |
|---|---|---|---|---|---|---|---|
| C1, C3–C11 | 10 | 100nF | YAGEO CC0805KRX7R9BB104 | [311-1140-1-ND](https://www.digikey.com/en/products/filter?keywords=311-1140-1-ND) | [603-CC805KRX7R9BB104](https://www.mouser.com/ProductDetail/603-CC805KRX7R9BB104) | LCSC [C49678](https://www.lcsc.com/search?q=C49678) | Yes |
| C2 | 1 | 10uF | KYOCERA AVX TAJA106K016RNJ | [478-1655-1-ND](https://www.digikey.com/en/products/filter?keywords=478-1655-1-ND) | [581-TAJA106K016R](https://www.mouser.com/ProductDetail/581-TAJA106K016R) | LCSC [C7171](https://www.lcsc.com/search?q=C7171) | Yes |
| D1 | 1 | 1N5819 | MCC (Micro Commercial Components) B5819WS-TP | [B5819WS-TPMSCT-ND](https://www.digikey.com/en/products/filter?keywords=B5819WS-TPMSCT-ND) |  | LCSC [C191023](https://www.lcsc.com/search?q=C191023) | Yes |
| D2 | 1 | LED | Lite-On Inc. LTST-C170KGKT | [160-1414-1-ND](https://www.digikey.com/en/products/filter?keywords=160-1414-1-ND) | [859-LTST-C170KGKT](https://www.mouser.com/ProductDetail/859-LTST-C170KGKT) | LCSC [C2297](https://www.lcsc.com/search?q=C2297) | Yes |
| J1 | 1 | PWR_SW | JST Sales America Inc. B2B-XH-A | [455-B2B-XH-A-ND](https://www.digikey.com/en/products/filter?keywords=455-B2B-XH-A-ND) |  |  | |
| J2 | 1 | ROM WE | Pin header 1×2, 2.54 mm, cut from a strip | [S1011EC-40-ND](https://www.digikey.com/en/products/filter?keywords=S1011EC-40-ND) | [200-TSW14007TS](https://www.mouser.com/ProductDetail/200-TSW14007TS) |  | |
| J3 | 1 | USB_C_Receptacle_USB2.0 | G-Switch GT-USB-7010ASV |  |  | LCSC [C2988369](https://www.lcsc.com/search?q=C2988369) | Yes |
| J4 | 1 | RESET_SW | JST Sales America Inc. B2B-XH-A | [455-B2B-XH-A-ND](https://www.digikey.com/en/products/filter?keywords=455-B2B-XH-A-ND) |  |  | |
| J5 | 1 | HRDB EN | Pin header 2×2, 2.54 mm, cut from a strip | [S2011EC-40-ND](https://www.digikey.com/en/products/filter?keywords=S2011EC-40-ND) | [649-67996-140HLF](https://www.mouser.com/ProductDetail/649-67996-140HLF) |  | |
| J6 | 1 | CLOCK_ENBL_SW | JST Sales America Inc. B2B-XH-A | [455-B2B-XH-A-ND](https://www.digikey.com/en/products/filter?keywords=455-B2B-XH-A-ND) |  |  | |
| J7 | 1 | 6502 EN | Pin header 1×2, 2.54 mm, cut from a strip | [S1011EC-40-ND](https://www.digikey.com/en/products/filter?keywords=S1011EC-40-ND) | [200-TSW14007TS](https://www.mouser.com/ProductDetail/200-TSW14007TS) |  | |
| J8 | 1 | EXP EN | Pin header 2×5, 2.54 mm, cut from a strip | [S2011EC-40-ND](https://www.digikey.com/en/products/filter?keywords=S2011EC-40-ND) | [649-67996-140HLF](https://www.mouser.com/ProductDetail/649-67996-140HLF) |  | |
| J9 | 1 | 6502 Card Connector | TE Connectivity 5-5530843-4 | [A31723-ND](https://www.digikey.com/en/products/filter?keywords=A31723-ND) | [571-5-5530843-4](https://www.mouser.com/ProductDetail/571-5-5530843-4) |  | |
| J10 | 1 | 6502 Bus | Pin header 2×20, 2.54 mm, cut from a strip | [732-5401-ND](https://www.digikey.com/en/products/filter?keywords=732-5401-ND) | [710-61204021621](https://www.mouser.com/ProductDetail/710-61204021621) |  | |
| Q1 | 1 | SS8050 | Comchip Technology SS8050-G | [641-1790-1-ND](https://www.digikey.com/en/products/filter?keywords=641-1790-1-ND) | [750-SS8050-G](https://www.mouser.com/ProductDetail/750-SS8050-G) | LCSC [C2150](https://www.lcsc.com/search?q=C2150) | Yes |
| R1, R9 | 2 | 1k | YAGEO RC0805FR-071KL | [311-1.00KCRCT-ND](https://www.digikey.com/en/products/filter?keywords=311-1.00KCRCT-ND) | [603-RC0805FR-071KL](https://www.mouser.com/ProductDetail/603-RC0805FR-071KL) | LCSC [C17513](https://www.lcsc.com/search?q=C17513) | Yes |
| R2 | 1 | 1M | YAGEO RC0805FR-071ML | [311-1.00MCRCT-ND](https://www.digikey.com/en/products/filter?keywords=311-1.00MCRCT-ND) | [603-RC0805FR-071ML](https://www.mouser.com/ProductDetail/603-RC0805FR-071ML) | LCSC [C17514](https://www.lcsc.com/search?q=C17514) | Yes |
| R3 | 1 | 47k | YAGEO RC0805FR-0747KL | [311-47.0KCRCT-ND](https://www.digikey.com/en/products/filter?keywords=311-47.0KCRCT-ND) | [603-RC0805FR-0747KL](https://www.mouser.com/ProductDetail/603-RC0805FR-0747KL) | LCSC [C17713](https://www.lcsc.com/search?q=C17713) | Yes |
| R4, R8, R10–R14 | 7 | 10k | YAGEO RC0805FR-0710KL | [311-10.0KCRCT-ND](https://www.digikey.com/en/products/filter?keywords=311-10.0KCRCT-ND) | [603-RC0805FR-0710KL](https://www.mouser.com/ProductDetail/603-RC0805FR-0710KL) | LCSC [C17414](https://www.lcsc.com/search?q=C17414) | Yes |
| R5, R6 | 2 | 5.1k | YAGEO RC0805FR-075K1L | [311-5.10KCRCT-ND](https://www.digikey.com/en/products/filter?keywords=311-5.10KCRCT-ND) | [603-RC0805FR-075K1L](https://www.mouser.com/ProductDetail/603-RC0805FR-075K1L) | LCSC [C27834](https://www.lcsc.com/search?q=C27834) | Yes |
| R7 | 1 | 330 | YAGEO RC0805FR-07330RL | [311-330CRCT-ND](https://www.digikey.com/en/products/filter?keywords=311-330CRCT-ND) | [603-RC0805FR-07330RL](https://www.mouser.com/ProductDetail/603-RC0805FR-07330RL) | LCSC [C17630](https://www.lcsc.com/search?q=C17630) | Yes |
| SW1 | 1 | Reset | TS-1187A-B-A-B |  |  | LCSC [C318884](https://www.lcsc.com/search?q=C318884) | |
| U1 | 1 | NE555 | Texas Instruments NE555DR | [296-6501-1-ND](https://www.digikey.com/en/products/filter?keywords=296-6501-1-ND) | [595-NE555DR](https://www.mouser.com/ProductDetail/595-NE555DR) | LCSC [C7593](https://www.lcsc.com/search?q=C7593) | Yes |
| U2 | 1 | AS6C62256 | Alliance Memory AS6C62256-55PCN | [1450-1033-ND](https://www.digikey.com/en/products/filter?keywords=1450-1033-ND) | [913-AS6C62256-55PCN](https://www.mouser.com/ProductDetail/913-AS6C62256-55PCN) |  | |
| U3 | 1 | AT28C256 | Microchip Technology AT28C256-15PU | [AT28C256-15PU-ND](https://www.digikey.com/en/products/filter?keywords=AT28C256-15PU-ND) | [556-AT28C25615PU](https://www.mouser.com/ProductDetail/556-AT28C25615PU) |  | |
| U4, U5, U7 | 3 | 74HC00 | Nexperia USA Inc. 74HC00D,653 | [1727-2773-1-ND](https://www.digikey.com/en/products/filter?keywords=1727-2773-1-ND) | [771-74HC00D-T](https://www.mouser.com/ProductDetail/771-74HC00D-T) | LCSC [C5586](https://www.lcsc.com/search?q=C5586) | Yes |
| U6 | 1 | 65C02 | Western Design Center (WDC) W65C02S6TPG-14 |  | [955-W65C02S6TPG-14](https://www.mouser.com/ProductDetail/955-W65C02S6TPG-14) |  | |
| X1 | 1 | 1 MHz | ECS Inc. ECS-100AX-010 | [X937-ND](https://www.digikey.com/en/products/filter?keywords=X937-ND) | [520-TCF100-X](https://www.mouser.com/ProductDetail/520-TCF100-X) |  | |
| U3 | 1 | Socket | 28-pin ZIF socket, or an ordinary 28-pin socket | [3M2802-ND](https://www.digikey.com/en/products/filter?keywords=3M2802-ND) | [517-228-1277-00](https://www.mouser.com/ProductDetail/517-228-1277-00) | | |
| U2 | 1 | Socket | IC socket, 28-pin, 0.6 in | [3M5481-ND](https://www.digikey.com/en/products/filter?keywords=3M5481-ND) | [517-4828-6004-CP](https://www.mouser.com/ProductDetail/517-4828-6004-CP) | | |
| U6 | 1 | Socket | IC socket, 40-pin, 0.6 in | [3M5471-ND](https://www.digikey.com/en/products/filter?keywords=3M5471-ND) | [517-4840-6000-CP](https://www.mouser.com/ProductDetail/517-4840-6000-CP) | | |
| J5 | 2 | | Shunt, 2.54 mm | [S9337-ND](https://www.digikey.com/en/products/filter?keywords=S9337-ND) |  |  | |

Pin headers are cut from strips, and the cart files count whole strips.

- **J3:** What LCSC C2988369 is. The footprint is HRO TYPE-C-31-M-12, and JLCPCB placed this part on the made boards.


## Output Board

### Output Board Rev 1.1

Drawn, not made yet. **Proven design**: silkscreen text, the `VDD` header removed, JP1 ships open, and JP2 and JP3 removed and wired as Rev 1.0 ships them.

Cart files: [digikey.csv](BOM/Output%20Board/Rev%201.1/digikey.csv), [mouser.csv](BOM/Output%20Board/Rev%201.1/mouser.csv), [digikey-through-hole.csv](BOM/Output%20Board/Rev%201.1/digikey-through-hole.csv), [mouser-through-hole.csv](BOM/Output%20Board/Rev%201.1/mouser-through-hole.csv)

| Reference | Qty | Value | Part | Digi-Key | Mouser | Other | Pre-soldered |
|---|---|---|---|---|---|---|---|
| C1 | 1 | 1uF | YAGEO CC0805KKX7R8BB105 | [311-1456-1-ND](https://www.digikey.com/en/products/filter?keywords=311-1456-1-ND) | [603-CC805KKX7R8BB105](https://www.mouser.com/ProductDetail/603-CC805KKX7R8BB105) | LCSC [C28323](https://www.lcsc.com/search?q=C28323) | Yes |
| C2, C3 | 2 | 2.2nF | Samsung Electro-Mechanics CL21C222JBFNNNE | [1276-2993-1-ND](https://www.digikey.com/en/products/filter?keywords=1276-2993-1-ND) | [187-CL21C222JBFNNNE](https://www.mouser.com/ProductDetail/187-CL21C222JBFNNNE) | LCSC [C28260](https://www.lcsc.com/search?q=C28260) | Yes |
| C5–C10 | 6 | 100nF | YAGEO CC0805KRX7R9BB104 | [311-1140-1-ND](https://www.digikey.com/en/products/filter?keywords=311-1140-1-ND) | [603-CC805KRX7R9BB104](https://www.mouser.com/ProductDetail/603-CC805KRX7R9BB104) | LCSC [C49678](https://www.lcsc.com/search?q=C49678) | Yes |
| D1 | 1 | 1N914 | onsemi 1N914 | [1N914FS-ND](https://www.digikey.com/en/products/filter?keywords=1N914FS-ND) | [512-1N914](https://www.mouser.com/ProductDetail/512-1N914) |  | |
| J2 | 1 | AUDIO | Switchcraft Inc. PJRAN1X1U02X | [PJRAN1X1U02X-ND](https://www.digikey.com/en/products/filter?keywords=PJRAN1X1U02X-ND) | [502-PJRAN1X1U02X](https://www.mouser.com/ProductDetail/502-PJRAN1X1U02X) |  | |
| J6 | 1 | INT Select | Pin header 1×3, 2.54 mm, cut from a strip | [S1011EC-40-ND](https://www.digikey.com/en/products/filter?keywords=S1011EC-40-ND) | [200-TSW14007TS](https://www.mouser.com/ProductDetail/200-TSW14007TS) |  | |
| J7 | 1 | IO SELECT | Pin header 2×8, 2.54 mm, cut from a strip | [S2011EC-40-ND](https://www.digikey.com/en/products/filter?keywords=S2011EC-40-ND) | [649-67996-140HLF](https://www.mouser.com/ProductDetail/649-67996-140HLF) |  | |
| J8 | 1 | 6502 Bus | Würth Elektronik 61204021621 | [732-5401-ND](https://www.digikey.com/en/products/filter?keywords=732-5401-ND) | [710-61204021621](https://www.mouser.com/ProductDetail/710-61204021621) |  | |
| R1 | 1 | 1k | YAGEO RC0805FR-071KL | [311-1.00KCRCT-ND](https://www.digikey.com/en/products/filter?keywords=311-1.00KCRCT-ND) | [603-RC0805FR-071KL](https://www.mouser.com/ProductDetail/603-RC0805FR-071KL) | LCSC [C17513](https://www.lcsc.com/search?q=C17513) | Yes |
| U1 | 1 | Pico9918A | Pico9918A, DIP_Socket-40_W11.9mm_W12.7mm_W15.24mm_W17.78mm_W18.5mm_3M_240-1280-00-0602J |  |  | [Tindie](https://www.tindie.com/products/visrealm/pico9918-pro/) | |
| U2 | 1 | ARMSID | Retrocomp ARMSID |  |  | [Retrocomp](https://retrocomp.cz/produkt?id=2) | |
| U3, U4 | 2 | 74HC138 | Nexperia USA Inc. 74HC138D,653 | [1727-2781-1-ND](https://www.digikey.com/en/products/filter?keywords=1727-2781-1-ND) | [771-74HC138D-T](https://www.mouser.com/ProductDetail/771-74HC138D-T) | LCSC [C5602](https://www.lcsc.com/search?q=C5602) | Yes |
| U1 | 1 | Socket | 40-pin ZIF socket, or an ordinary 40-pin socket | [3M4002-ND](https://www.digikey.com/en/products/filter?keywords=3M4002-ND) | [517-240-1280-00](https://www.mouser.com/ProductDetail/517-240-1280-00) | | |
| U2 | 1 | Socket | 28-pin ZIF socket, or an ordinary 28-pin socket | [3M2802-ND](https://www.digikey.com/en/products/filter?keywords=3M2802-ND) | [517-228-1277-00](https://www.mouser.com/ProductDetail/517-228-1277-00) | | |
| J6, J7 | 3 | | Shunt, 2.54 mm | [S9337-ND](https://www.digikey.com/en/products/filter?keywords=S9337-ND) |  |  | |

Pin headers are cut from strips, and the cart files count whole strips.

- **J8:** Male box header with a keying notch, for a 40-way ribbon cable.
- **U2:** A modern replacement for the MOS 6581 SID, which is out of production. Every tested build uses one. A real 6581 also needs 12 V at pin 28, which the standard build does not provide.

### Output Board Rev 1.0

Made, tested. **Tested**.

Cart files: [digikey.csv](BOM/Output%20Board/Rev%201.0/digikey.csv), [mouser.csv](BOM/Output%20Board/Rev%201.0/mouser.csv), [digikey-through-hole.csv](BOM/Output%20Board/Rev%201.0/digikey-through-hole.csv), [mouser-through-hole.csv](BOM/Output%20Board/Rev%201.0/mouser-through-hole.csv)

| Reference | Qty | Value | Part | Digi-Key | Mouser | Other | Pre-soldered |
|---|---|---|---|---|---|---|---|
| C1 | 1 | 1uF | YAGEO CC0805KKX7R8BB105 | [311-1456-1-ND](https://www.digikey.com/en/products/filter?keywords=311-1456-1-ND) | [603-CC805KKX7R8BB105](https://www.mouser.com/ProductDetail/603-CC805KKX7R8BB105) | LCSC [C28323](https://www.lcsc.com/search?q=C28323) | Yes |
| C2, C3 | 2 | 2.2nF | Samsung Electro-Mechanics CL21C222JBFNNNE | [1276-2993-1-ND](https://www.digikey.com/en/products/filter?keywords=1276-2993-1-ND) | [187-CL21C222JBFNNNE](https://www.mouser.com/ProductDetail/187-CL21C222JBFNNNE) | LCSC [C28260](https://www.lcsc.com/search?q=C28260) | Yes |
| C5–C10 | 6 | 100nF | YAGEO CC0805KRX7R9BB104 | [311-1140-1-ND](https://www.digikey.com/en/products/filter?keywords=311-1140-1-ND) | [603-CC805KRX7R9BB104](https://www.mouser.com/ProductDetail/603-CC805KRX7R9BB104) | LCSC [C49678](https://www.lcsc.com/search?q=C49678) | Yes |
| D1 | 1 | 1N914 | onsemi 1N914 | [1N914FS-ND](https://www.digikey.com/en/products/filter?keywords=1N914FS-ND) | [512-1N914](https://www.mouser.com/ProductDetail/512-1N914) |  | |
| J1 | 1 | VDD | JST Sales America Inc. B2B-XH-A | [455-B2B-XH-A-ND](https://www.digikey.com/en/products/filter?keywords=455-B2B-XH-A-ND) |  |  | |
| J2 | 1 | AUDIO | Switchcraft Inc. PJRAN1X1U02X | [PJRAN1X1U02X-ND](https://www.digikey.com/en/products/filter?keywords=PJRAN1X1U02X-ND) | [502-PJRAN1X1U02X](https://www.mouser.com/ProductDetail/502-PJRAN1X1U02X) |  | |
| J6 | 1 | INT Select | Pin header 1×3, 2.54 mm, cut from a strip | [S1011EC-40-ND](https://www.digikey.com/en/products/filter?keywords=S1011EC-40-ND) | [200-TSW14007TS](https://www.mouser.com/ProductDetail/200-TSW14007TS) |  | |
| J7 | 1 | IO SELECT | Pin header 2×8, 2.54 mm, cut from a strip | [S2011EC-40-ND](https://www.digikey.com/en/products/filter?keywords=S2011EC-40-ND) | [649-67996-140HLF](https://www.mouser.com/ProductDetail/649-67996-140HLF) |  | |
| J8 | 1 | 6502 Bus | Würth Elektronik 61204021621 | [732-5401-ND](https://www.digikey.com/en/products/filter?keywords=732-5401-ND) | [710-61204021621](https://www.mouser.com/ProductDetail/710-61204021621) |  | |
| R1 | 1 | 1k | YAGEO RC0805FR-071KL | [311-1.00KCRCT-ND](https://www.digikey.com/en/products/filter?keywords=311-1.00KCRCT-ND) | [603-RC0805FR-071KL](https://www.mouser.com/ProductDetail/603-RC0805FR-071KL) | LCSC [C17513](https://www.lcsc.com/search?q=C17513) | Yes |
| U1 | 1 | Pico9918A | Pico9918A, DIP_Socket-40_W11.9mm_W12.7mm_W15.24mm_W17.78mm_W18.5mm_3M_240-1280-00-0602J |  |  | [Tindie](https://www.tindie.com/products/visrealm/pico9918-pro/) | |
| U2 | 1 | 6581 | Retrocomp ARMSID |  |  | [Retrocomp](https://retrocomp.cz/produkt?id=2) | |
| U3, U4 | 2 | 74HC138 | Nexperia USA Inc. 74HC138D,653 | [1727-2781-1-ND](https://www.digikey.com/en/products/filter?keywords=1727-2781-1-ND) | [771-74HC138D-T](https://www.mouser.com/ProductDetail/771-74HC138D-T) | LCSC [C5602](https://www.lcsc.com/search?q=C5602) | Yes |
| U1 | 1 | Socket | 40-pin ZIF socket, or an ordinary 40-pin socket | [3M4002-ND](https://www.digikey.com/en/products/filter?keywords=3M4002-ND) | [517-240-1280-00](https://www.mouser.com/ProductDetail/517-240-1280-00) | | |
| U2 | 1 | Socket | 28-pin ZIF socket, or an ordinary 28-pin socket | [3M2802-ND](https://www.digikey.com/en/products/filter?keywords=3M2802-ND) | [517-228-1277-00](https://www.mouser.com/ProductDetail/517-228-1277-00) | | |
| J6, J7 | 3 | | Shunt, 2.54 mm | [S9337-ND](https://www.digikey.com/en/products/filter?keywords=S9337-ND) |  |  | |

Pin headers are cut from strips, and the cart files count whole strips.

- **J8:** Male box header with a keying notch, for a 40-way ribbon cable.
- **U2:** A modern replacement for the MOS 6581 SID, which is out of production. Every tested build uses one. A real 6581 also needs 12 V at pin 28, which the standard build does not provide.


## ROM Cart

### ROM Cart Rev 1.1

Drawn, not made yet. **Proven design**: the bare card edge and the shell's holes at their nominal places; it takes the AT28C256, as Rev 1.0a does.

Cart files: [digikey.csv](BOM/ROM%20Cart/Rev%201.1/digikey.csv), [mouser.csv](BOM/ROM%20Cart/Rev%201.1/mouser.csv)

| Reference | Qty | Value | Part | Digi-Key | Mouser | Other |
|---|---|---|---|---|---|---|
| C1, C2 | 2 | 100nF | KYOCERA AVX SR215C104KAR | [478-3188-ND](https://www.digikey.com/en/products/filter?keywords=478-3188-ND) | [581-SR215C104KAR](https://www.mouser.com/ProductDetail/581-SR215C104KAR) |  |
| U1 | 1 | AT28C256 | Microchip Technology AT28C256-15PU | [AT28C256-15PU-ND](https://www.digikey.com/en/products/filter?keywords=AT28C256-15PU-ND) | [556-AT28C25615PU](https://www.mouser.com/ProductDetail/556-AT28C25615PU) |  |
| U2 | 1 | 74HC138 | Texas Instruments SN74HC138N | [296-1575-5-ND](https://www.digikey.com/en/products/filter?keywords=296-1575-5-ND) | [595-SN74HC138N](https://www.mouser.com/ProductDetail/595-SN74HC138N) |  |
| U2 | 1 | Socket | IC socket, 16-pin, 0.3 in | [3M5475-ND](https://www.digikey.com/en/products/filter?keywords=3M5475-ND) | [517-4816-3004-CP](https://www.mouser.com/ProductDetail/517-4816-3004-CP) | |
| U1 | 1 | Socket | IC socket, 28-pin, 0.6 in | [3M5481-ND](https://www.digikey.com/en/products/filter?keywords=3M5481-ND) | [517-4828-6004-CP](https://www.mouser.com/ProductDetail/517-4828-6004-CP) | |

### ROM Cart Rev 1.0b

Made, tested. **Tested**: built and tested. Takes an AT27C256 EPROM.

Cart files: [digikey.csv](BOM/ROM%20Cart/Rev%201.0b/digikey.csv), [mouser.csv](BOM/ROM%20Cart/Rev%201.0b/mouser.csv)

| Reference | Qty | Value | Part | Digi-Key | Mouser | Other |
|---|---|---|---|---|---|---|
| C1, C2 | 2 | 100nF | KYOCERA AVX SR215C104KAR | [478-3188-ND](https://www.digikey.com/en/products/filter?keywords=478-3188-ND) | [581-SR215C104KAR](https://www.mouser.com/ProductDetail/581-SR215C104KAR) |  |
| U1 | 1 | AT27C256 | Microchip Technology AT27C256R-70PU | [AT27C256R-70PU-ND](https://www.digikey.com/en/products/filter?keywords=AT27C256R-70PU-ND) | [556-AT27C256R70PU](https://www.mouser.com/ProductDetail/556-AT27C256R70PU) |  |
| U2 | 1 | 74HC138 | Texas Instruments SN74HC138N | [296-1575-5-ND](https://www.digikey.com/en/products/filter?keywords=296-1575-5-ND) | [595-SN74HC138N](https://www.mouser.com/ProductDetail/595-SN74HC138N) |  |
| U2 | 1 | Socket | IC socket, 16-pin, 0.3 in | [3M5475-ND](https://www.digikey.com/en/products/filter?keywords=3M5475-ND) | [517-4816-3004-CP](https://www.mouser.com/ProductDetail/517-4816-3004-CP) | |
| U1 | 1 | Socket | IC socket, 28-pin, 0.6 in | [3M5481-ND](https://www.digikey.com/en/products/filter?keywords=3M5481-ND) | [517-4828-6004-CP](https://www.mouser.com/ProductDetail/517-4828-6004-CP) | |

### ROM Cart Rev 1.0a

Made, tested. **Tested**: built and tested. Takes an AT28C256 EEPROM.

Cart files: [digikey.csv](BOM/ROM%20Cart/Rev%201.0a/digikey.csv), [mouser.csv](BOM/ROM%20Cart/Rev%201.0a/mouser.csv)

| Reference | Qty | Value | Part | Digi-Key | Mouser | Other |
|---|---|---|---|---|---|---|
| C1, C2 | 2 | 100nF | KYOCERA AVX SR215C104KAR | [478-3188-ND](https://www.digikey.com/en/products/filter?keywords=478-3188-ND) | [581-SR215C104KAR](https://www.mouser.com/ProductDetail/581-SR215C104KAR) |  |
| U1 | 1 | AT28C256 | Microchip Technology AT28C256-15PU | [AT28C256-15PU-ND](https://www.digikey.com/en/products/filter?keywords=AT28C256-15PU-ND) | [556-AT28C25615PU](https://www.mouser.com/ProductDetail/556-AT28C25615PU) |  |
| U2 | 1 | 74HC138 | Texas Instruments SN74HC138N | [296-1575-5-ND](https://www.digikey.com/en/products/filter?keywords=296-1575-5-ND) | [595-SN74HC138N](https://www.mouser.com/ProductDetail/595-SN74HC138N) |  |
| U2 | 1 | Socket | IC socket, 16-pin, 0.3 in | [3M5475-ND](https://www.digikey.com/en/products/filter?keywords=3M5475-ND) | [517-4816-3004-CP](https://www.mouser.com/ProductDetail/517-4816-3004-CP) | |
| U1 | 1 | Socket | IC socket, 28-pin, 0.6 in | [3M5481-ND](https://www.digikey.com/en/products/filter?keywords=3M5481-ND) | [517-4828-6004-CP](https://www.mouser.com/ProductDetail/517-4828-6004-CP) | |
