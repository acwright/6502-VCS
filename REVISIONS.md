# Revisions

Every revision of every board in this repository, and what is known about each. The audit date is at the end.

**Status** says what has happened to a revision:

- **Made, matches order:** JLCPCB's own copy of the order is byte-identical to the production zip here, and the PCB file regenerates the same copper, mask, outline and holes. This compares files with the order. It says nothing about whether the board works: that's **Tested**.
- **Made, not compared:** the board exists, but its files haven't been compared with an order.
- **Ordered:** placed, and not yet arrived.
- **Drawn:** the files are complete, and the board hasn't been ordered.
- **Never made**, or **To confirm** where nothing on record says either way.

**Holes** is how far the corner mounting holes sit from the board's edges. The standard is 6 mm, and 5 mm on the ACE Board, the CF Adapter and the Keyboard Helper. A dash means a card or cart, which has no corner holes.

| Board | Rev | Status | Tested | Order | Ordered | Made from | Tindie stock | Size (mm) | Holes | Top panel | Enclosure | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Flash Cart | 1.0 | Made, matches order | Not yet | Y97 | 2026-09-20 | `3680cff` | — | 81.8×57.62 | — | — | — |  |
| Flash Helper | 1.0 | Made, matches order | Not yet | Y98 | 2026-09-20 | `3680cff` | — | in footprint | — | — | — | symbol has pins the footprint lacks: Arduino Mega pads with no symbol pin |
| Input Board | 1.0 | Made, matches order | Yes | Y86 | 2026-03-13 | `6502-COB 0b0efc6` | — | 100×100 | 6 mm | yes | — |  |
| Main Board | 1.0 | Made, not compared | Yes |  |  |  | — | 100×100 | 6 mm | yes | — | on hand; JLCPCB's files not yet supplied; J3's shell pads aren't in the GND fill; kept as made, USB power doesn't use them |
| Main Board | 1.1 | Drawn | — |  |  |  | — | 100×100 | 6 mm | yes | — |  |
| Output Board | 1.0 | Made, matches order | Yes | Y85 | 2026-01-14 | `6502-COB 379abb8` | — | 100×100 | 6 mm | yes | — |  |
| ROM Cart | 1.0a | Made, matches order | Yes | Y60 | 2025-10-06 | `6502-COB 0969243` | — | 81.8×57.62 | — | — | — | the board's silk says Rev 1.0; its U1 label, AT28C256, marks it as 1.0a |
| ROM Cart | 1.0b | Made, matches order | Yes | Y87 | 2026-03-22 | `6502-COB ab85186` | — | 81.8×57.62 | — | — | — | the board's silk says Rev 1.0; its U1 label, AT27C256, marks it as 1.0b |

The audit last ran on 2026-11-04. Each production zip marked *Made, matches order* was compared byte for byte with JLCPCB's copy, and its PCB regenerated to the same copper, mask, outline and holes. Tindie stock is from the listings as saved on 2026-10-23.
