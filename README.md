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
    - [Revision History](#revision-history)
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
- [Libraries](#libraries)
- [Bill of Materials](#bill-of-materials)
  - [Main Board](#main-board-1)
  - [Input Board](#input-board-1)
  - [Output Board](#output-board-1)
  - [ROM Cart (Rev 1.0a)](#rom-cart-rev-10a)
  - [ROM Cart (Rev 1.0b)](#rom-cart-rev-10b)
  - [Flash Cart (Rev 1.0)](#flash-cart-rev-10)
  - [Flash Helper (Rev 1.0)](#flash-helper-rev-10)
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

#### Revision History

**Rev 1.1** (drawn, not yet made)

- Pull-up resistors changed from 1kΩ to 10kΩ.
- C6, C11, D1, J5, JP3, JP4, TP1 and TP3 move slightly. Those edits were made to the Rev 1.0 files after its order, in 2024.

**Rev 1.0**

- Initial release. Built and tested. `Hardware/Main Board/Rev 1.0/` and `Production/Main Board/Rev 1.0/` match the boards JLCPCB made (order Y38). The Gerbers and drill files in the production zip are byte-for-byte what JLCPCB received.
- This board used to live in the 6502-COB project, and it was ordered from there. It is now the VCS's CPU and memory board.
- The PCB file was restored to that layout on 2026-11-04. The later edits are kept in Rev 1.1. The schematic and BOM are today's, and they match this copper.

#### Pull-ups on Rev 1.0 and Rev 1.1

Fit 10kΩ pull-ups on every shared line. With a 1kΩ pull-up, a device that pulls `IRQB` low sinks 5 mA, more than the 3.2 mA that the W65C22's and W65C21's IRQ outputs are rated for.

- **Rev 1.1:** fit 10kΩ for R4, the `RESB` pull-up, not the 1kΩ in the files. The other pull-ups, R10–R14, are already 10kΩ. R4 isn't part of the reset circuit's timing: the circuit only pulls `RESB` low, through Q1.
- **Rev 1.0:** fit 10kΩ for R4 and R10–R14, not the 1kΩ in the files.


### Input Board
`Hardware/Input Board/`

Unified input board supporting a matrix keyboard, PS/2 keyboard, and Atari 2600-compatible joysticks. Uses a 65C22 VIA and an ATmega1284p microcontroller as the keyboard encoder controller.

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

Firmware for the ATmega1284p on the Input Board. Provides:

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

## Libraries
`Libraries/`

Shared KiCad symbol and footprint libraries used across all AC6502 hardware projects.

## Bill of Materials

Every part for every board, by revision, is in **[BOM.md](BOM.md)**, with supplier numbers, known issues and files to upload to Digi-Key and Mouser.

### Main Board

Parts list: [BOM.md](BOM.md#main-board).

### Input Board

#### Revision History

**Rev 1.0**

- Initial release. Built and tested. `Hardware/Input Board/Rev 1.0/` and `Production/Input Board/Rev 1.0/` match the boards JLCPCB made (order Y86). The Gerbers and drill files in the production zip are byte-for-byte what JLCPCB received.

> **Joysticks**: there is no DB-9 in this BOM because the board does not carry one. The joysticks share the VIA ports with the keyboard encoder and connect through the `J1` PORT B and `J2` PORT A box headers, using a helper board from the [6502-COB](https://github.com/acwright/6502-COB) project — the **GPIO Helper** for a direct box-header connection, or the **Joystick Helper** to convert a port to a DB-9 with pull-ups fitted. Budget for one helper per stick.

### Output Board

#### Revision History

**Rev 1.0**

- Initial release. Built and tested. `Hardware/Output Board/Rev 1.0/` and `Production/Output Board/Rev 1.0/` match the boards JLCPCB made (order Y85). The Gerbers and drill files in the production zip are byte-for-byte what JLCPCB received.

Parts list: [BOM.md](BOM.md#output-board).

### ROM Cart (Rev 1.0a)

#### Revision History

**Rev 1.0a**

- Initial release. Built and tested. `Hardware/ROM Cart/Rev 1.0a/` and `Production/ROM Cart/Rev 1.0a/` match the boards JLCPCB made (order Y60). The Gerbers and drill files in the production zip are byte-for-byte what JLCPCB received.
- The board's silkscreen says Rev 1.0, not Rev 1.0a. Its U1 label, `AT28C256`, tells it apart from Rev 1.0b.

### ROM Cart (Rev 1.0b)

#### Revision History

**Rev 1.0b**

- Initial release. Built and tested. `Hardware/ROM Cart/Rev 1.0b/` and `Production/ROM Cart/Rev 1.0b/` match the boards JLCPCB made (order Y87). The Gerbers and drill files in the production zip are byte-for-byte what JLCPCB received.
- The board's silkscreen says Rev 1.0, not Rev 1.0b. Its U1 label, `AT27C256`, tells it apart from Rev 1.0a.

Parts list: [BOM.md](BOM.md#rom-cart).

### Flash Cart (Rev 1.0)

#### Revision History

**Rev 1.0**

- Initial release. Boards are on hand, and not yet tested. `Hardware/Flash Cart/Rev 1.0/` and `Production/Flash Cart/Rev 1.0/` match the boards JLCPCB made (order Y97). The Gerbers and drill files in the production zip are byte-for-byte what JLCPCB received.

Fitted for the 512KB build. For 1MB, fit U2 and C2 as well; for 128/256KB, fit an SST39SF010A or SST39SF020A at U1.

> **Flash**: `SST39SF040-55-4C-TU` and `SST39SF040-55-4I-TU` are the same package and pinout at 55ns, so buy
> whichever variant is in stock.

### Flash Helper (Rev 1.0)

#### Revision History

**Rev 1.0**

- Initial release. Boards are on hand, and not yet tested. `Hardware/Flash Helper/Rev 1.0/` and `Production/Flash Helper/Rev 1.0/` match the boards JLCPCB made (order Y98). The Gerbers and drill files in the production zip are byte-for-byte what JLCPCB received.

Parts list: [BOM.md](BOM.md#flash-helper).

## License

Hardware designs are released under the [CERN Open Hardware Licence Version 2 – Permissive](https://ohwr.org/cern_ohl_p_v2.txt).  
Firmware is released under the [MIT License](./Firmware/IB%20Controller/LICENSE).
