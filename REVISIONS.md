# Revisions

Every revision of every board in this repository, and what is known about each. The audit date is at the end.

**Status** says what has happened to a revision:

- **Made, checked:** JLCPCB's own copy of the order is byte-identical to the production zip here. The revision's files match that board.
- **Made, not checked:** the board exists, but its files haven't been compared with an order.
- **Ordered:** placed, and not yet arrived.
- **Drawn:** the files are complete, and the board hasn't been ordered.
- **Never made**, or **To confirm** where nothing on record says either way.

**Holes** is how far the corner mounting holes sit from the board's edges. The standard is 6 mm, and 5 mm on the ACE Board, the CF Adapter and the Keyboard Helper. A dash means a card or cart, which has no corner holes.

| Board | Rev | Status | Order | Ordered | Made from | Tindie stock | Size (mm) | Holes | Top panel | Enclosure | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Flash Cart | 1.0 | To confirm |  |  |  | — | 81.8×57.62 | — | — | — |  |
| Flash Helper | 1.0 | To confirm |  |  |  | — | in footprint | — | — | — | symbol has pins the footprint lacks: Arduino Mega pads with no symbol pin |
| Input Board | 1.0 | To confirm |  |  |  | — | 100×100 | 6 mm | yes | — |  |
| Main Board | 1.0 | Made, not checked |  |  |  | — | 100×100 | 6 mm | yes | — | built and tested by the owner; J3's shell pads aren't in the GND fill; kept as made, USB power doesn't use them |
| Main Board | 1.1 | Drawn |  |  |  | — | 100×100 | 6 mm | yes | — |  |
| Output Board | 1.0 | To confirm |  |  |  | — | 100×100 | 6 mm | yes | — |  |
| ROM Cart | 1.0a | To confirm |  |  |  | — | 81.8×57.62 | — | — | — |  |
| ROM Cart | 1.0b | To confirm |  |  |  | — | 81.8×57.62 | — | — | — |  |

The audit last ran on 2026-11-04. Each production zip marked *Made, checked* was compared byte for byte with JLCPCB's copy, and its PCB regenerated to the same copper, mask, outline and holes. Tindie stock is from the listings as saved on 2026-10-23.
