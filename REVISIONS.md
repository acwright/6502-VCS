# Revisions

Every revision of every board in this repository, and what is known about each. The dates of the checks are at the end.

**Status** says what has happened to a revision:

- **Made, matches order:** JLCPCB's own copy of the order is byte-identical to the production zip here, and the PCB file regenerates the same copper, mask, outline and holes. This compares files with the order. It says nothing about whether the board works: that's the **Label**.
- **Made, not compared:** the board exists, but its files haven't been compared with an order.
- **Ordered:** placed, and not yet arrived.
- **Drawn:** the files are complete, and the board hasn't been ordered.
- **Never made**, or **To confirm** where nothing on record says either way.

**Label** says whether a builder can rely on a revision. Make the newest revision of a board, and check its label first:

- **Tested:** This revision was built and tested.
- **Proven design:** Not built at this revision, but its circuit is a tested revision's. The only changes are silkscreen text, part values, mounting holes, outline clean-up, capacitor pitch, socket outlines, a footprint swap with the same holes, a solder jumper's default, or tracks rerouted with DRC and the netlist check passing. A builder can treat it as tested.
- **Untested:** The circuit, the power path or the layout changed in a way that only a built board proves, or the board has never been built at all.

**Holes** is how far the corner mounting holes sit from the board's edges. The standard is 6 mm, and 5 mm on the ACE Board, the CF Adapter and the Keyboard Helper. A dash means a card or cart, which has no corner holes.

| Board | Rev | Status | Label | Order | Ordered | Made from | Tindie stock | Size (mm) | Holes | Top panel | Enclosure | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Flash Cart | 1.0 | Made, matches order | **Untested**: made, and not tested yet | Y97 | 2026-09-20 | `3680cff` | — | 81.8×57.62 | — | — | — |  |
| Flash Helper | 1.0 | Made, matches order | **Untested**: made, and not tested yet | Y98 | 2026-09-20 | `3680cff` | — | in footprint | — | — | — | symbol has pins the footprint lacks: Arduino Mega pads with no symbol pin |
| Input Board | 1.0 | Made, matches order | **Tested** | Y86 | 2026-03-13 | `6502-COB 0b0efc6` | — | 100×100 | 6 mm | yes | — |  |
| Input Board | 1.1 | Drawn | **Proven design**: silkscreen text only |  |  |  | — | 100×100 | 6 mm | yes | — |  |
| Main Board | 1.0 | Made, matches order | **Tested** | Y38 | 2024-06-08 | `6502-COB 7d050b0` | — | 100×100 | 6 mm | yes | — | symbol has pins the footprint lacks: J3 shield pads; ordered when this board lived in the COB project |
| Main Board | 1.1 | Drawn | **Proven design**: 10k pull-ups, small part moves and tracks rerouted. The jumpers are gone, and `HRDB` is wired as it is on the tested Rev 1.0 with them fitted |  |  |  | — | 100×100 | 6 mm | yes | — |  |
| Output Board | 1.0 | Made, matches order | **Tested** | Y85 | 2026-01-14 | `6502-COB 379abb8` | — | 100×100 | 6 mm | yes | — |  |
| Output Board | 1.1 | Drawn | **Proven design**: silkscreen text, and the `VDD` header removed |  |  |  | — | 100×100 | 6 mm | yes | — |  |
| ROM Cart | 1.0a | Made, matches order | **Tested**: built and tested. Takes an AT28C256 EEPROM | Y60 | 2025-10-06 | `6502-COB 0969243` | — | 81.8×57.62 | — | — | — | the board's silk says Rev 1.0; its U1 label, AT28C256, marks it as 1.0a |
| ROM Cart | 1.0b | Made, matches order | **Tested**: built and tested. Takes an AT27C256 EPROM | Y87 | 2026-03-22 | `6502-COB ab85186` | — | 81.8×57.62 | — | — | — | the board's silk says Rev 1.0; its U1 label, AT27C256, marks it as 1.0b |

JLCPCB's orders were checked on 2026-11-04: each production zip marked *Made, matches order* was compared byte for byte with JLCPCB's copy, and its PCB regenerated to the same copper, mask, outline and holes. Each time this table is written, every PCB is checked again against its production zip, for copper and drill holes. Tindie stock is from the listings as saved on 2026-10-23.

<!-- History: hand-written. tools/revision-audit/register.py keeps everything from here to the end. -->

## History

What changed in each revision of each board, newest first. The table above has the facts about each one.

**Schematic drawing, 2026-11-06.** Every schematic's 6502 bus, cart and card connectors are drawn one way, made revisions included: a short wire and a global label on each used pin, a no-connect flag on each unused one, and GND and VCC as global labels. Bus lines, bus entries and local labels for the bus are gone. Each label's name matches the board's silk. Where pins 4 and 6 carry `EXP1` and `EXP0`, or a cartridge grounds them, a note on the schematic says what `HRDB` does with them (see the README's *Extra pins*). No netlist changed, so no board did: the schematic PDFs are regenerated, and a few PCB files carry the new net names, as text only.

### Input Board

**Rev 1.1** (drawn, not yet made)

- The silkscreen says `20pF` at C2 and C4 and `ATmega1284` at U2, the parts the BOM lists. Rev 1.0's says `22pF` and `ATmega1284-P`. Nothing else changed: the copper, mask, holes and outline are Rev 1.0's, so Rev 1.0's top panel fits.

**Rev 1.0**

- Initial release. Built and tested. `Hardware/Input Board/Rev 1.0/` and `Production/Input Board/Rev 1.0/` match the boards JLCPCB made (order Y86). The Gerbers and drill files in the production zip are byte-for-byte what JLCPCB received.

### Output Board

**Rev 1.1** (drawn, not yet made)

- J1, the `VDD` header for a real SID's supply at U2 pin 28, is removed, with its track and two vias, as on the ACE Board Rev 1.1. U2 pin 28 is left unconnected: the ARMSID needs nothing there. No standard build supplied that pin, and it was never tested. The ground pour fills the space.
- The silkscreen says `ARMSID` at U2. Rev 1.0's says `6581`.
- The holes and outline are Rev 1.0's. The top panel in `CAD/Tops/Output Board/Rev 1.1/` is Rev 1.0's without the opening over J1.
- JP1 ships open, so D1 stays in the pico9918's interrupt line, as on the VGA Card 1.1 (2026-11-06). The pico9918 drives its interrupt high as well as low; with JP1 bridged, as on Rev 1.0, it can hold `IRQB` high against the Input Board. The footprint is the open solder jumper on the same pads.

**Rev 1.0**

- Initial release. Built and tested. `Hardware/Output Board/Rev 1.0/` and `Production/Output Board/Rev 1.0/` match the boards JLCPCB made (order Y85). The Gerbers and drill files in the production zip are byte-for-byte what JLCPCB received.

### ROM Cart

**Rev 1.0a**

- Initial release. Built and tested. `Hardware/ROM Cart/Rev 1.0a/` and `Production/ROM Cart/Rev 1.0a/` match the boards JLCPCB made (order Y60). The Gerbers and drill files in the production zip are byte-for-byte what JLCPCB received.
- The board's silkscreen says Rev 1.0, not Rev 1.0a. Its U1 label, `AT28C256`, tells it apart from Rev 1.0b.

**Rev 1.0b**

- Initial release. Built and tested. `Hardware/ROM Cart/Rev 1.0b/` and `Production/ROM Cart/Rev 1.0b/` match the boards JLCPCB made (order Y87). The Gerbers and drill files in the production zip are byte-for-byte what JLCPCB received.
- The board's silkscreen says Rev 1.0, not Rev 1.0b. Its U1 label, `AT27C256`, tells it apart from Rev 1.0a.

### Flash Cart

**Rev 1.0**

- Initial release. Boards are on hand, and not yet tested. `Hardware/Flash Cart/Rev 1.0/` and `Production/Flash Cart/Rev 1.0/` match the boards JLCPCB made (order Y97). The Gerbers and drill files in the production zip are byte-for-byte what JLCPCB received.

### Flash Helper

**Rev 1.0**

- Initial release. Boards are on hand, and not yet tested. `Hardware/Flash Helper/Rev 1.0/` and `Production/Flash Helper/Rev 1.0/` match the boards JLCPCB made (order Y98). The Gerbers and drill files in the production zip are byte-for-byte what JLCPCB received.

### Main Board

**Rev 1.1** (drawn, not yet made)

- Pull-up resistors changed from 1kΩ to 10kΩ. R4, the `RESB` pull-up, was still 1kΩ when this revision was first drawn, and it is 10kΩ now. It was fixed in place, keeping the revision number, because Rev 1.1 has never been ordered.
- The schematic draws R4 with the other pull-ups, R10–R14, in one group, as every CPU board does. It used to sit in the reset circuit beside Q1. The netlist is unchanged (2026-11-06).
- Bus pins 4 and 6 on J9 and J10 are wired to `HRDB`, as on the ACE and the KIM, and J5 (`HRDB EN`), JP3 and JP4 are gone: the Main Board is for the VCS, which always takes cartridges (2026-11-06). Rev 1.0 needs those jumpers fitted to run a cartridge. The silk by J10 says `HRDB` for pins 4 and 6.
- J8 (`EXP EN`) is gone too. It could jumper `EXP0` to VPB and `EXP1` to MLB, which would drive the ROM disable now that those pins are `HRDB`. MLB, PHI1O and PHI2O are left unconnected, and `EXP2` and `EXP3` pass between J9 and J10 unused.
- The jumpers for experimenting are gone, because the VCS is the family's game console: plug in USB power and a cartridge, and it runs (owner, 2026-11-06). The COB keeps them, as the experimenter's build.
  - J7 and JP5, the jumper for an original 6502. VPB (U6 pin 1) is left unconnected, as on the ACE and the KIM.
  - J2, JP1 and R1, the ROM write-enable jumper. The ROM's `/WE` is tied to VCC, as on the ACE and the KIM.
  - J1 (`POWER SW`) and JP2. USB power reaches D1 directly, so the board powers on when it is plugged in. Rev 1.0 needs a switch on J1 or JP2 bridged.
  - J6 (`CLOCK ENBL SW`) and JP6. The oscillator drives `PHI2` directly. Rev 1.0 needs a switch on J6 or JP6 bridged.
- The silk that named the removed parts goes with them: `6502`, `CLOCK ENBL`, `POWER SW`, `HI ROM DISABLE` and `IC2 RAM`.
- The joins are routed by hand (owner, 2026-11-06). One new via, 0.6/0.3 mm at (118.25, 112.25), stitches a ground island around C9 to the rest of `GND`; a standard 0.8/0.4 via has no room there except inside C9's pad.
- The top panel loses its windows over J1, J2, J6, J7 and J8, and its notch over J5.
- C6, C11, D1, J5, JP3, JP4, TP1 and TP3 move slightly. Those edits were made to the Rev 1.0 files after its order, in 2024.
- The switch headers' values are `POWER SW`, `RESET SW` and `CLOCK ENBL SW` at `J1`, `J4` and `J6`, as on the COB's boards, in place of `PWR_SW`, `RESET_SW` and `CLOCK_ENBL_SW`. The values aren't printed, so the board is unchanged: its silkscreen already says `POWER SW`, `RESET SW` and `CLOCK ENBL`.

**Rev 1.0**

- Initial release. Built and tested. `Hardware/Main Board/Rev 1.0/` and `Production/Main Board/Rev 1.0/` match the boards JLCPCB made (order Y38). The Gerbers and drill files in the production zip are byte-for-byte what JLCPCB received.
- This board used to live in the 6502-COB project, and it was ordered from there. It is now the VCS's CPU and memory board.
- The PCB file was restored to that layout on 2026-11-04. The later edits are kept in Rev 1.1. The schematic and BOM are today's, and they match this copper.
- The schematic draws R4, the `RESB` pull-up, with the other pull-ups, R10–R14, as Rev 1.1's does. The netlist is unchanged, so the board is the same (2026-11-06).
