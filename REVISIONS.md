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
- **Proven design:** Not built at this revision, but its circuit is a tested revision's. The only changes are silkscreen text, part values, mounting holes, outline clean-up, parts moved a fraction of a millimetre onto their grid, capacitor pitch, socket outlines, a footprint swap with the same holes, a solder jumper's default, the solder mask or paste at a card edge, or tracks rerouted or pours refilled with DRC and the netlist check passing. A builder can treat it as tested.
- **Untested:** The circuit, the power path or the layout changed in a way that only a built board proves, or the board has never been built at all.

**Holes** is how far the corner mounting holes sit from the board's edges. The standard is 6 mm, and 5 mm on the ACE Board, the CF Adapter and the Keyboard Helper. A dash means a card or cart, which has no corner holes.

| Board | Rev | Status | Label | Order | Ordered | Made from | Tindie stock | Size (mm) | Holes | Top panel | Enclosure | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Flash Cart | 1.0 | Made, matches order | **Tested** | Y97 | 2026-09-20 | `3680cff` | — | 81.8×57.62 | — | — | — |  |
| Flash Cart | 1.1 | Drawn | **Proven design**: the bare card edge and the shell's holes at their nominal places |  |  |  | — | 81.8×57.62 | — | — | — |  |
| Flash Helper | 1.0 | Made, matches order | **Tested** | Y98 | 2026-09-20 | `3680cff` | — | in footprint | — | — | — | symbol has pins the footprint lacks: Arduino Mega pads with no symbol pin |
| Input Board | 1.0 | Made, matches order | **Tested** | Y86 | 2026-03-13 | `6502-COB 0b0efc6` | — | 100×100 | 6 mm | yes | — |  |
| Input Board | 1.1 | Drawn | **Proven design**: silkscreen text only |  |  |  | — | 100×100 | 6 mm | yes | — |  |
| Main Board | 1.0 | Made, matches order | **Tested** | Y38 | 2024-06-08 | `6502-COB 7d050b0` | — | 100×100 | 6 mm | yes | — | symbol has pins the footprint lacks: J3 shield pads; ordered when this board lived in the COB project |
| Main Board | 1.1 | Drawn | **Proven design**: 10k pull-ups, small part moves and tracks rerouted, and a 74HCT00 at U5. The jumpers are gone, and `HRDB` is wired as it is on the tested Rev 1.0 with them fitted |  |  |  | — | 100×100 | 6 mm | yes | — |  |
| Output Board | 1.0 | Made, matches order | **Tested** | Y85 | 2026-01-14 | `6502-COB 379abb8` | — | 100×100 | 6 mm | yes | — |  |
| Output Board | 1.1 | Drawn | **Proven design**: silkscreen text, the `VDD` header removed, JP1 ships open, and JP2 and JP3 removed and wired as Rev 1.0 ships them |  |  |  | — | 100×100 | 6 mm | yes | — |  |
| ROM Cart | 1.0a | Made, matches order | **Tested**: built and tested. Takes an AT28C256 EEPROM | Y60 | 2025-10-06 | `6502-COB 0969243` | — | 81.8×57.62 | — | — | — | the board's silk says Rev 1.0; its U1 label, AT28C256, marks it as 1.0a |
| ROM Cart | 1.0b | Made, matches order | **Tested**: built and tested. Takes an AT27C256 EPROM | Y87 | 2026-03-22 | `6502-COB ab85186` | — | 81.8×57.62 | — | — | — | the board's silk says Rev 1.0; its U1 label, AT27C256, marks it as 1.0b |
| ROM Cart | 1.1 | Drawn | **Proven design**: either ROM chip through two solder jumpers, each setting a tested board's wiring; a ROM bank option, not fitted, whose pull-up reads the half Rev 1.0 reads; capacitor pitch; the bare card edge and the shell's holes at their nominal places |  |  |  | — | 81.8×57.62 | — | — | — |  |

JLCPCB's orders were checked on 2026-11-04: each production zip marked *Made, matches order* was compared byte for byte with JLCPCB's copy, and its PCB regenerated to the same copper, mask, outline and holes. Each time this table is written, every PCB is checked again against its production zip, for copper and drill holes. Tindie stock is from the listings as saved on 2026-10-23.

<!-- History: hand-written. Tools/revision-audit/register.py keeps everything from here to the end. -->

## History

What changed in each revision of each board, newest first. The table above has the facts about each one.

**Reference text size, 2026-11-14.** Every reference printed on the silkscreen of a revision not yet made is 1.0 mm high and wide, with a 0.15 mm stroke, as 970 of the family's 991 already were. `Tools/revision-audit/audit.py` checks it. Every reference here already was.

**IC designators and values, 2026-11-13.** On every revision not yet made, each IC's designator sits centred at one short end of its footprint, the text running along that end, and a through-hole IC's value sits at the other end. Where the centre is taken, the text is aligned to the end's left or right edge. A surface-mount IC's value is hidden, because a small package leaves no room for it, and a module whose outline names it keeps its silk as it is. A ZIF socket's texts sit on its silk outline, not its lever. `Tools/revision-audit/audit.py` checks the values. Moved: Input Board 1.1, Main Board 1.1 (its U2 designator by pin 1, clear of R2) and ROM Cart 1.1. Values shown: the Main Board 1.1's U3, which Rev 1.1 had moved to F.Fab. Values hidden: the Flash Cart 1.1's eight. Silk only: no copper moved, and no label changed. The made revisions keep their silk as made.

**The board logo's place, 2026-11-13.** Every board logo on a revision not yet made sits in one place for its kind of board. A card's or cart's logo reads bottom to top on the left, 2.5 mm from the edge and centred on the body; any other board's runs along its edge on the line of that edge's corner holes, centred or with its end 11.5 mm from the corner (`Tools/logos/standard.json`, checked by `Tools/logos/placement.py`). Moved, each by at most 2.5 mm: Input Board 1.1, Output Board 1.1 and ROM Cart 1.1. The Main Board 1.1's moved too, with its open hardware logo (see its History). The Flash Cart 1.1 keeps its logo where it is: C5 and its references fill the rule's place, and the owner ruled it an exception (`Tools/data/logos.json`). Silk only: no copper moved, DRC is unchanged, and no label changed. The made revisions keep their logos where they are.

**JLCPCB's order-number marker, 2026-11-13.** The `JLCJLCJLCJLC` text is gone from the silkscreen of every revision not yet made: Input Board 1.1, Main Board 1.1, Output Board 1.1 and ROM Cart 1.1. It told JLCPCB where to print its order number. JLCPCB stopped printing order numbers in May 2026, and its help page now asks for the text not to be there. Only the front silkscreen changed, so no label did. The made revisions keep the text, which JLCPCB ignores.

**Schematic drawing, 2026-11-06.** Every schematic's 6502 bus, cart and card connectors are drawn one way, made revisions included: a short wire and a global label on each used pin, a no-connect flag on each unused one, and GND and VCC as global labels. Bus lines, bus entries and local labels for the bus are gone. Each label's name matches the board's silk. Where pins 4 and 6 carry `EXP1` and `EXP0`, or a cartridge grounds them, a note on the schematic says what `HRDB` does with them (see the README's *Extra pins*). No netlist changed, so no board did: the schematic PDFs are regenerated, and a few PCB files carry the new net names, as text only.

### Input Board

**Rev 1.1** (drawn, not yet made)

- The silkscreen says `ATmega1284` at U2, the part the BOM lists. Rev 1.0's says `ATmega1284-P`. C2 and C4 stay 22 pF as on Rev 1.0, the value every made board was built and tested with (2026-11-11). Rev 1.1 was drawn with 20 pF from 2026-11-04 to 2026-11-11, and never made that way. Nothing else changed: the copper, mask, holes and outline are Rev 1.0's, so Rev 1.0's top panel fits.

**Rev 1.0**

- Initial release. Built and tested. `Hardware/Input Board/Rev 1.0/` and `Production/Input Board/Rev 1.0/` match the boards JLCPCB made (order Y86). The Gerbers and drill files in the production zip are byte-for-byte what JLCPCB received.

### Output Board

**Rev 1.1** (drawn, not yet made)

- J1, the `VDD` header for a real SID's supply at U2 pin 28, is removed, with its track and two vias, as on the ACE Board Rev 1.1. U2 pin 28 is left unconnected: the ARMSID needs nothing there. No standard build supplied that pin, and it was never tested. The ground pour fills the space.
- The silkscreen says `ARMSID` at U2. Rev 1.0's says `6581`.
- The holes and outline are Rev 1.0's. The top panel in `CAD/Tops/Output Board/Rev 1.1/` is Rev 1.0's without the opening over J1.
- JP1 ships open, so D1 stays in the pico9918's interrupt line, as on the VGA Card 1.1 (2026-11-06). The pico9918 drives its interrupt high as well as low; with JP1 bridged, as on Rev 1.0, it can hold `IRQB` high against the Input Board. The footprint is the open solder jumper on the same pads.
- `JP2` and `JP3` are removed. They chose whether `PHI2` or the supply drives E2, an enable of U3, the 74HC138 that makes the card's read and write strobes. With `PHI2` there, as Rev 1.0 ships, the strobes last only while `PHI2` is high, when the 6502's address and data are valid; tied high, they would run through the whole cycle and glitch while the address settles. So Rev 1.1 wires `PHI2` straight to E2. JP3's copper strip is a short track now, and JP2 goes with its feed from the supply.

**Rev 1.0**

- Initial release. Built and tested. `Hardware/Output Board/Rev 1.0/` and `Production/Output Board/Rev 1.0/` match the boards JLCPCB made (order Y85). The Gerbers and drill files in the production zip are byte-for-byte what JLCPCB received.

### ROM Cart

**Rev 1.1** (drawn, not yet made; Rev 1.0a is sold first)

- The card edge is bare: no solder mask on the tab, front or back, from where its fillets end, so the fingers seat better in the slot and make better contact. Rev 1.0a has mask between the fingers. The fingers carry no solder paste, so no stencil prints paste onto them. The outline is redrawn to the one cart shape every cart shares, placed by the fingers: it moved 0.04 mm from Rev 1.0a's, its corners are 5 mm (Rev 1.0a's are 5.036 mm) and its width is 81.8 mm (81.799 mm), and no track or pad moved. The ground pours are refilled to suit.
- The four holes for the cart shell are at their nominal places, each pair centred on the cart: the M3 holes 5.0 mm from the top edge and the sides, the M2 holes 13.0 mm from the sides. Rev 1.0a's were 4.849 mm and 12.95 mm from the sides, a slip in the drawing, so the holes moved by up to 0.18 mm.
- U1 takes either ROM chip, set by two three-pad solder jumpers. JP1 joins U1 pin 1 to `A14` for an AT28C256, or to `VCC` for an AT27C256, whose pin 1 is VPP. JP2 joins pin 27 to `VCC` for an AT28C256, holding its `/WE` high so it is never written, or to `A14` for an AT27C256. Both ship bridged 1–2, marked `28C`, so a Rev 1.1 as made is wired as Rev 1.0a. Cut and bridged 2–3, marked `27C`, it is wired as Rev 1.0b, except that VPP is on `VCC` rather than left open: the AT27C256R's datasheet gives VPP at VCC for reading, and allows the two to be joined except while programming. The shipped setting is the safe one: an AT27C256 fitted in it only reads the wrong half of the chip, where an AT28C256 on `27C` would have `/WE` on `A14` and could be overwritten. U1's silkscreen reads `AT28C256 / AT27C256`, and each jumper's ends are marked `28C` and `27C`.
- U1's A14 comes from `ROM_A14`, not the bus's `A14`. The cart is only selected at `$C000`–`$FFFF`, where `A14` is always high, so Rev 1.0a and 1.0b only ever read the upper 16K of their 32K chip. R1 (10k) holds `ROM_A14` high, so a Rev 1.1 as made reads the upper 16K too. J2, `ROM BANK`, is not fitted: a builder who fits it, with a shunt on `LO`, reads the lower 16K instead, so one chip can hold two 16K programs. Its ends are marked `HI` and `LO`. JP1's `28C` side and JP2's `27C` side take `ROM_A14`.
- C1 and C2 are 2.5 mm pitch disc capacitors, the family's standard part, where Rev 1.0a has 5 mm. Each keeps its pin 1 where Rev 1.0a has it.
- Routed by the owner: JP1 sits below U1 and JP2 above it, and J2 and R1 to the right of U1. `ROM_A14` joins R1 and J2 to the jumpers, and the `A14`, `A15` and `PHI2` tracks round them are rerouted. The `A6` track and the ground beside C2 are rerouted to clear C2's new pad. DRC, the netlist check and connectivity are clean.
- The silkscreen's revision reads Rev 1.1.

**Rev 1.0a**

- Initial release. Built and tested. `Hardware/ROM Cart/Rev 1.0a/` and `Production/ROM Cart/Rev 1.0a/` match the boards JLCPCB made (order Y60). The Gerbers and drill files in the production zip are byte-for-byte what JLCPCB received.
- The board's silkscreen says Rev 1.0, not Rev 1.0a. Its U1 label, `AT28C256`, tells it apart from Rev 1.0b.

**Rev 1.0b**

- Initial release. Built and tested. `Hardware/ROM Cart/Rev 1.0b/` and `Production/ROM Cart/Rev 1.0b/` match the boards JLCPCB made (order Y87). The Gerbers and drill files in the production zip are byte-for-byte what JLCPCB received.
- The board's silkscreen says Rev 1.0, not Rev 1.0b. Its U1 label, `AT27C256`, tells it apart from Rev 1.0a.

### Flash Cart

**Rev 1.1** (drawn, not yet made; Rev 1.0 is tested first)

- The card edge is bare: no solder mask on the tab, front or back, from where its fillets end, so the fingers seat better in the slot and make better contact. Rev 1.0 has mask between the fingers. The fingers carry no solder paste, so no stencil prints paste onto them. The outline is redrawn to the one cart shape every cart shares, placed by the fingers: it moved 0.04 mm from Rev 1.0's, its corners are 5 mm (Rev 1.0's are 5.036 mm) and its width is 81.8 mm (81.799 mm), and no track or pad moved. The ground pours are refilled to suit.
- The four holes for the cart shell are at their nominal places, each pair centred on the cart: the M3 holes 5.0 mm from the top edge and the sides, the M2 holes 13.0 mm from the sides. Rev 1.0's were 4.849 mm and 12.95 mm from the sides, a slip in the drawing, so the holes moved by up to 0.18 mm.
- The silkscreen's revision reads Rev 1.1. Nothing else changed: the circuit, parts, tracks and pads are Rev 1.0's.
- Rev 1.0 passed its tests on 2026-11-09, so Rev 1.1, with the same circuit, is labelled **Proven design**.

**Rev 1.0**

- Initial release. Tested on 2026-11-09 in both builds, 512 KB and 1 MB: identified, programmed and verified on the Flash Helper, and run on an ACE, banking and saving included. `Hardware/Flash Cart/Rev 1.0/` and `Production/Flash Cart/Rev 1.0/` match the boards JLCPCB made (order Y97). The Gerbers and drill files in the production zip are byte-for-byte what JLCPCB received.

### Flash Helper

**Rev 1.0**

- Initial release. Tested on 2026-11-09: it identified, erased, programmed and verified both Flash Cart builds. `Hardware/Flash Helper/Rev 1.0/` and `Production/Flash Helper/Rev 1.0/` match the boards JLCPCB made (order Y98). The Gerbers and drill files in the production zip are byte-for-byte what JLCPCB received.

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
- U5, the 74HC00 that makes the RAM's and ROM's `RB` and `WB` from `PHI2` and `RWB`, is a 74HCT00 (SN74HCT00DR, LCSC C6764, 2026-11-11). Its TTL input threshold ends `RB` and `WB` a few nanoseconds later after `PHI2` falls. An Alliance AS6C62256 with a fast-releasing 74HC00 lot in this gate misread at 2 MHz; a 74HCT00 there cured it in the ACE, writes included. Rev 1.0 keeps its 74HC00. Same footprint, so no track moved.
- The switch headers' values are `POWER SW`, `RESET SW` and `CLOCK ENBL SW` at `J1`, `J4` and `J6`, as on the COB's boards, in place of `PWR_SW`, `RESET_SW` and `CLOCK_ENBL_SW`. The values aren't printed, so the board is unchanged: its silkscreen already says `POWER SW`, `RESET SW` and `CLOCK ENBL`.
- The board logo moved 0.4 mm right and 0.1 mm down, to the family's place for it: centred on the top holes' line, its end 11.5 mm from the corner (2026-11-13). The open hardware logo it ran onto moved to the bottom left, centred below the ROM socket on the bottom holes' line (owner, 2026-11-13). Silk only: no copper moved.

**Rev 1.0**

- Initial release. Built and tested. `Hardware/Main Board/Rev 1.0/` and `Production/Main Board/Rev 1.0/` match the boards JLCPCB made (order Y38). The Gerbers and drill files in the production zip are byte-for-byte what JLCPCB received.
- This board used to live in the 6502-COB project, and it was ordered from there. It is now the VCS's CPU and memory board.
- The PCB file was restored to that layout on 2026-11-04. The later edits are kept in Rev 1.1. The schematic and BOM are today's, and they match this copper.
- The schematic draws R4, the `RESB` pull-up, with the other pull-ups, R10–R14, as Rev 1.1's does. The netlist is unchanged, so the board is the same (2026-11-06).
