// The two bus primitives, and nothing above them knows about flash.
//
// The Flash Helper is an Arduino Mega 2560 R3 shield that pretends to be a
// 65C02 on the far side of a cartridge slot (6502-VCS PLAN.md §5).  Everything
// it can do is built out of one read cycle and one write cycle, both of them
// here.
//
// The pin allocation is fixed by the Rev 1.0 schematic.  Three whole ports and
// five single lines, chosen so that the address and the data buses are single
// byte port writes with no bit shuffling:
//
//   PORTA   D22-D29   D0-D7, the data bus          (PA0 = D0)
//   PORTC   D37-D30   A8-A15                       (PC0 = A8; the header runs backwards)
//   PORTL   D49-D42   A0-A7                        (PL0 = A0; likewise)
//   PB7     D13       PHI2                         (also the on-board LED)
//   PB5     D11       RWB
//   PG5     D4        RESB
//   PE4/PE5 D2/D3     IRQB/NMIB - never driven here; they are for the card tester
//
// PLAN.md §5.3 and this project's README both describe the data bus as PORTL.
// That is a slip in the prose: the schematic puts D0-D7 on PORTA and A0-A7 on
// PORTL, and this file follows the schematic.

#pragma once

#include <stdint.h>

/** Take the bus, park it idle, and pulse RESB so the cart's bank register is 0. */
void bus_begin();

/** One write cycle. `addr` is a CPU address; the cart decodes $C000-$FFFF. */
void bus_write(uint16_t addr, uint8_t data);

/** One read cycle. */
uint8_t bus_read(uint16_t addr);

/** Pulse RESB low. This is what clears the cart's bank register to 0. */
void bus_reset_pulse();
