6502-VCS
========

![6502-VCS.png](./Images/6502-VCS.png)

An **AC6502** retro-style 8-bit computer based on the **65C02** microprocessor.

> 📖 **Guide:** [AC6502 Documentation](https://acwright.github.io/6502-DOCS/) — the user's and programmer's guide for the whole family.
> See [VCS's page in the family appendix](https://acwright.github.io/6502-DOCS/family/vcs).

---

**Building one? Every part you need, with supplier numbers and known issues, is in [BOM.md](BOM.md).**

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Systems](#systems)
- [Software](#software)
- [Hardware](#hardware)
  - [Main Board](#main-board)
  - [Input Board](#input-board)
  - [Output Board](#output-board)
  - [ROM Cart](#rom-cart)
  - [Flash Cart](#flash-cart)
  - [Flash Helper](#flash-helper)
- [Firmware](#firmware)
  - [IB Controller](#ib-controller)
- [CAD](#cad)
- [Production](#production)
- [Schematics](#schematics)
- [Shared lines](#shared-lines)
- [Extra pins: `EXP0`–`EXP3` and `HRDB`](#extra-pins-exp0exp3-and-hrdb)
- [Libraries](#libraries)
- [Bill of Materials](#bill-of-materials)
- [License](#license)

---

## Overview

The AC6502 ecosystem is a family of open-source, 65C02-based computers sharing a common architecture, memory map, and [BIOS](https://github.com/acwright/6502-BIOS). Each computer in the family is purpose-built for a different use case but runs the same software and firmware.

The **VCS** is a cartridge-based retro gaming console. It features a real 65C02 CPU, swappable ROM cartridges, VGA video output via [Pico9918](https://github.com/visrealm/pico9918), SID audio via ARMSID, and support for PS/2 keyboards, matrix keyboards, and Atari 2600-compatible joysticks.

## Architecture

All AC6502 computers share:

- **CPU**: 65C02 (or accurate emulation)
- **Memory**: 32KB RAM + 32KB ROM, with optional banked RAM expansion
- **Memory Map**: Standardized across the ecosystem — zero page, stack, I/O space ($8000–$9FFF), system ROM, and interrupt vectors at $FFFA–$FFFF
- **Bus**: 16-bit address bus, 8-bit bidirectional data bus, standard 65C02 control signals (RW, PHI2, RESET, IRQ, NMI, RDY, SYNC)
- **BIOS**: A common [BIOS](https://github.com/acwright/6502-BIOS) provides the kernel, monitor, and BASIC interpreter across all systems

## Systems

| Project | Description |
|---------|-------------|
| [6502-ACE](https://github.com/acwright/6502-ACE) | All-in-one Computer Experience — A single board computer |
| [6502-COB](https://github.com/acwright/6502-COB) | Computer On a Backplane — Modular desktop computer with expandable card slots |
| [6502-DEV](https://github.com/acwright/6502-DEV) | Development Environment Vehicle — Emulation-based dev system |
| [6502-KIM](https://github.com/acwright/6502-KIM) | Keypad Input Monitor - KIM-1 inspired minimal computer |
| [6502-VCS](https://github.com/acwright/6502-VCS) | Video Computer System — Cartridge-based retro gaming console (YOU ARE HERE) |

## Software

| Project | Description |
|---------|-------------|
| [6502-BIOS](https://github.com/acwright/6502-BIOS) | The shared BIOS (kernel, monitor, BASIC) for all AC6502 computers |
| [6502-EMULATOR](https://github.com/acwright/6502-EMULATOR) | Emulator for the whole family — desktop app, browser build, and a command line for scripted runs |
| [6502-PRG](https://github.com/acwright/6502-PRG) | Template project for writing assembly language programs |
| [6502-CRT](https://github.com/acwright/6502-CRT) | Template project for writing assembly language cartridges |
| [6502-ASM](https://github.com/acwright/6502-ASM) | Assembly language example programs and demos |
| [6502-BAS](https://github.com/acwright/6502-BAS) | BASIC program listings |
| [6502-WOZMON](https://github.com/acwright/6502-WOZMON) | Wozmon as a standalone ROM |
| [6502-NOP](https://github.com/acwright/6502-NOP) | An all-NOP ROM, for probing a board during bring-up |
| [6502-DOCS](https://github.com/acwright/6502-DOCS) | The documentation site — the guide, the printable reference cards, branding and label artwork |
| [cffs](https://github.com/acwright/cffs) | Builds CompactFlash disk images for the BIOS filesystem |
| [bastok](https://github.com/acwright/bastok) | Tokenizes BASIC listings into `.prg` images, and back |
| [bin2woz](https://github.com/acwright/bin2woz) | Converts a binary into a Wozmon serial upload |

## Hardware

This repository contains KiCad 7.0+ PCB designs for the boards that make up the VCS system.

### Main Board
`Hardware/Main Board/`

The core board containing the 65C02 CPU, 32KB SRAM, 32KB EEPROM, clock, and reset circuitry. Runs at 1 MHz and provides the bus connection for the Input and Output boards.

### Input Board
`Hardware/Input Board/`

Unified input board supporting a matrix keyboard, PS/2 keyboard, and Atari 2600-compatible joysticks. Uses a 65C22 VIA and an ATmega1284 microcontroller as the keyboard encoder controller.

The joysticks share the VIA ports with the keyboard encoder rather than having connectors of their own: they come in on the `J1` PORT B and `J2` PORT A box headers, with `JOY(1)` reading PORT B and `JOY(2)` reading PORT A. See [Joystick Interface](./Firmware/IB%20Controller/README.md#joystick-interface) for the wiring options and the bitmask the BIOS returns.

### Output Board
`Hardware/Output Board/`

Combined VGA video output (via Raspberry Pi Pico running [Pico9918](https://github.com/visrealm/pico9918)) and SID audio output (via ARMSID). Provides TMS9918A-compatible graphics modes at 640×480 VGA and 3-voice SID synthesis.

### ROM Cart
`Hardware/ROM Cart/`

Swappable ROM cartridge for the VCS system. Comes in two versions:

- **Rev 1.0a** — Uses the **28C256** 32KB EEPROM (electrically erasable, no UV eraser required).
- **Rev 1.0b** — Uses the **27C256** 32KB EPROM (UV-erasable).

### Flash Cart
`Hardware/Flash Cart/`

Banked flash cartridge, and the successor to the fixed 16K ROM Cart. One all-SMD board covers 128KB to 1MB,
depending on which parts are populated, and the flash is programmed in circuit through the card edge, either by
the Flash Helper (an Arduino Mega 2560 shield with one connector on it) or by the 6502 itself.

- `$C000–$DFFF` is a switchable 8K window, selected by a write-only bank register at `$E000–$FFFF`.
- `$E000–$FFFF` is fixed to the last 8K of the primary flash, so the vectors and the bank-switching code can
  never be mapped out.
- Existing 16K cart images run unmodified.

See [DESIGN.md](./Hardware/Flash%20Cart/Rev%201.0/DESIGN.md) for the memory map, the logic, the programming
sequences and the build variants.

### Flash Helper
`Hardware/Flash Helper/`

The programmer for the Flash Cart: an Arduino Mega 2560 R3 shield with a cartridge slot on it, and
nothing else. It pretends to be the 65C02 on the far side of the card edge, so a cart is programmed
in circuit with no chip ever removed — which matters, because the flash is a soldered-down TSOP part.

- Two parts: the Arduino, and the same TE card edge connector the Main Board fits as J9.
- Thirty-seven of the forty card edge pins: `A0–A15`, `D0–D7`, `RWB`, `PHI2`, `RESB`, `IRQB`, `NMIB`,
  `VCC` and `GND`.
- `EXP0` and `EXP1` are deliberately **not** connected. Cartridges tie them to GND to disable the
  system ROM, so driving them would be a short.
- Host side is `6502-flash`, a Node CLI. See [DESIGN.md](./Hardware/Flash%20Cart/Rev%201.0/DESIGN.md).

**As a card tester.** Every card in the AC6502 family — the [COB](https://github.com/acwright/6502-COB)
cards, the [KIM](https://github.com/acwright/6502-KIM) Keypad Card and both VCS carts — carries the same
`6502 Card Edge` fingers and drops into this socket. `IRQB` and `NMIB` are wired for that reason rather
than for programming: the GPIO, LCD, Serial and Serial Card Pro cards all assert `IRQB`, and a tester
that could not see it would miss most of what they do. That firmware is a separate build and does not
exist yet.

## Firmware

This repository contains [PlatformIO](https://platformio.org/)-based firmware for the Input Board.

### IB Controller
`Firmware/IB Controller/`

Firmware for the ATmega1284 on the Input Board. Provides:

- Matrix keyboard scanning and encoding
- PS/2 keyboard interface
- Atari 2600-compatible joystick input
- Parallel I/O to the AC6502 bus via 65C22 VIA

See [Firmware/IB Controller/README.md](./Firmware/IB%20Controller/README.md) for setup and usage instructions.

## CAD
`CAD/`

3D-printable enclosure parts and laser-cut top panels for the VCS system.

**Board images** are in `CAD/Images/<Board>/Rev X/`: `Front.png` and `Back.png` on white, and `Front Transparent.png` and `Back Transparent.png` with no background. Every image is a 3D render at the same size, with the black solder mask and white silkscreen the boards are made with. Bare-board photos may differ, because the renders show parts fitted.

**Top panels are versioned by board revision**, like `Hardware/`: `CAD/Tops/<Board>/Rev X/`. Each revision has its own complete folder, even when two revisions share the same files. `Bases/` holds the parts for a whole computer, not for one board, so it isn't versioned.

The **[plate mounting drawing](CAD/Bases/Plate%20Mounting%20Drawing.png)** ([SVG](CAD/Bases/Plate%20Mounting%20Drawing.svg)) shows where the Output Board, the Main Board and the Input Board mount on the base plate, with every hole's position and the hardware the build needs. The plate is a stack of three 3 mm acrylic layers.

## Production
`Production/`

[REVISIONS.md](REVISIONS.md) lists every board revision: whether it was made, its JLCPCB order, the commit it was made from, and what fits it.

JLCPCB-ready Gerber files and BOM/CPL for PCB fabrication and assembly.

## Schematics
`Schematics/`

PDF schematics for each board.

## Shared lines

Five lines of the 6502 bus are shared by every board on it: `RESB`, `IRQB`, `NMIB`, `RDY` and `BE`. A board may pull one of these lines low, and nothing drives one high. Each line is held high by one 10kΩ pull-up resistor to VCC, on the board with the CPU: the ACE Board, the KIM Board, the VCS Main Board, the COB CPU Card or CPU Card Pro, or the DEV Board. No other board has one. Two pull-ups on the same line would sit in parallel and lower its resistance, so a card that adds its own pull-up changes the machine for every other board. The VIAs and PIAs in the BOMs, the W65C22N and W65C21N, have open-drain interrupt outputs for this reason. A W65C22S drives `IRQB` high as well as low, so it can't share the line without a diode.

The same holds where a board has its own reset circuit. A reset switch, its timer and the transistor that pulls `RESB` low can be on any board, such as the COB Backplane Pro or the Clock Card, but the `RESB` pull-up is only ever on the board with the CPU. Each of those boards draws its pull-ups together, in one group on its schematic.

`SOB` is a CPU pin that isn't on the bus. It is tied to VCC, directly or through a 10kΩ resistor.

A few chips have a pull-up of their own inside the chip, such as an ATmega's reset pin. Where such a pin is wired to `RESB`, its pull-up of 30–60kΩ sits in parallel with the 10kΩ one. That's harmless, because whatever pulls `RESB` low can sink the extra current many times over.

A revision that doesn't follow this yet says so in its known issues in [BOM.md](BOM.md), with what to fit or remove.

## Extra pins: `EXP0`–`EXP3` and `HRDB`

`EXP` stands for "extra pin". Four pins of the 6502 bus are left for a builder's own use: pin 4 is `EXP1`, pin 6 is `EXP0`, pin 19 is `EXP3` and pin 21 is `EXP2`.

Pins 4 and 6 have a second job. A cartridge ties both of them to GND. That pulls `HRDB` ("High ROM disable bar", active low) low on the board with the ROM, which takes `$C000–$FFFF` away from the ROM so that the cartridge answers there instead. So in a build that uses cartridges, pins 4 and 6 are reserved for `HRDB`, and nothing else may drive them. They are free as `EXP1` and `EXP0` only in a build that never uses cartridges. `EXP2` and `EXP3` are always free.

How the boards treat pins 4 and 6:

- **The ACE Board and the KIM Board** join them to their ROM's `HRDB` input, and their silk says `HRDB`. The VCS Main Board joins them the same way from Rev 1.1.
- **The COB Memory Card** joins them to its `HRDB` only through jumpers: fit two shunts on J2, or bridge JP1 and JP2, in a COB that takes cartridges. It is the only board with these jumpers, because the COB is the experimenter's build. The VCS Main Board Rev 1.0 had them too (J5, or JP3 and JP4); fit them, because the VCS always takes cartridges.
- **A cartridge** (the ROM Cart, the Flash Cart, the KIM Keypad Card) ties them to GND.
- **A board that only carries the bus through**, such as a backplane or a helper, calls them `EXP1` and `EXP0`, as its silk does, and a note on its schematic says what they carry.

## Libraries
`Libraries/`

Shared KiCad symbol and footprint libraries used across all AC6502 hardware projects, with their 3D models in `Models/`. A part is named for what it is and its shape, such as `RJ45 Jack LED` or `CR2032 Holder`, never for a manufacturer's part number, so a replacement part with the same footprint fits without renaming anything. The part numbers to buy are in [BOM.md](BOM.md). Every AC6502 repository carries the same copy of each part.

## Bill of Materials

Every part for every board, by revision, is in **[BOM.md](BOM.md)**, with supplier numbers, known issues, build notes and files to upload to Digi-Key and Mouser. What changed in each revision, and what is known about each one, is in **[REVISIONS.md](REVISIONS.md)**.

## License

Hardware designs are released under the [CERN Open Hardware Licence Version 2 – Permissive](https://ohwr.org/cern_ohl_p_v2.txt).  
Firmware is released under the [MIT License](./Firmware/IB%20Controller/LICENSE).
