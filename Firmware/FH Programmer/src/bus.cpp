#include <Arduino.h>

#include "bus.h"

// Direct port writes, not digitalWrite - that is the whole reason these three
// ports were chosen.  digitalWrite on a Mega is a table lookup, an interrupt
// disable and a read-modify-write per pin; sixteen of those per bus cycle would
// make a 512 KB program take minutes instead of seconds.

#define PHI2_BIT _BV(PB7) // D13
#define RWB_BIT _BV(PB5)  // D11
#define RESB_BIT _BV(PG5) // D4

// Half a bus cycle, in CPU cycles at 16 MHz.  Eight is 500 ns, which makes the
// Helper's PHI2 a 1 MHz square wave - the same speed the VCS runs the cart at,
// and about seven times the 70 ns flash's requirement.  It is a build flag
// because the one thing a bench failure would want to try first is a slower
// bus.
#ifndef BUS_DELAY_CYCLES
#define BUS_DELAY_CYCLES 8
#endif

static inline void bus_delay() {
  __builtin_avr_delay_cycles(BUS_DELAY_CYCLES);
}

static inline void bus_address(uint16_t addr) {
  PORTL = (uint8_t)(addr & 0xFF); // A0-A7
  PORTC = (uint8_t)(addr >> 8);   // A8-A15
}

void bus_begin() {
  DDRA = 0x00; // data bus: input, no pull-ups, until a write drives it
  PORTA = 0x00;

  DDRC = 0xFF; // A8-A15
  PORTC = 0x00;
  DDRL = 0xFF; // A0-A7
  PORTL = 0x00;

  // PHI2 low, RWB high (a read): the state the bus rests in between cycles.
  PORTB = (uint8_t)((PORTB & ~PHI2_BIT) | RWB_BIT);
  DDRB |= PHI2_BIT | RWB_BIT;

  PORTG |= RESB_BIT; // RESB idles high
  DDRG |= RESB_BIT;

  // IRQB and NMIB are wired for the card tester and are never driven here.
  // Leave them inputs with no pull-up so nothing fights a card that asserts
  // them.
  DDRE &= (uint8_t)~(_BV(PE4) | _BV(PE5));
  PORTE &= (uint8_t)~(_BV(PE4) | _BV(PE5));

  bus_reset_pulse();
}

// Write: RWB low, address and data out -> PHI2 high -> PHI2 low -> release.
//
// The falling edge of PHI2 is the one that matters.  The cart qualifies its
// write strobe with PHI2 (U4's G1), so WEB and BANKCLK *rise* as PHI2 falls,
// and that rising edge is what latches into the flash or the bank register.
// The data therefore has to stay valid across it, which is why the bus goes
// back to inputs a delay after PHI2 drops rather than at the same moment.
void bus_write(uint16_t addr, uint8_t data) {
  PORTB &= (uint8_t)~RWB_BIT;
  bus_address(addr);
  PORTA = data;
  DDRA = 0xFF;
  bus_delay();

  PORTB |= PHI2_BIT;
  bus_delay();
  PORTB &= (uint8_t)~PHI2_BIT;
  bus_delay(); // data hold across the latching edge

  DDRA = 0x00;
  PORTA = 0x00;
  PORTB |= RWB_BIT;
}

// Read: RWB high, address out, data bus as inputs -> PHI2 high -> sample ->
// PHI2 low.  The cart's OEB is qualified by PHI2 too, so nothing drives the bus
// until PHI2 rises; the delay after it is the flash's access time.
uint8_t bus_read(uint16_t addr) {
  PORTB |= RWB_BIT;
  DDRA = 0x00;
  PORTA = 0x00;
  bus_address(addr);
  bus_delay();

  PORTB |= PHI2_BIT;
  bus_delay();
  uint8_t value = PINA;
  PORTB &= (uint8_t)~PHI2_BIT;
  bus_delay();

  return value;
}

// RESB is the cart's bank register /MR, so this is the only way to put the
// window back to bank 0 without writing the register.  10 us is far longer than
// a 74HC273 needs and is imperceptible next to a program.
void bus_reset_pulse() {
  PORTG &= (uint8_t)~RESB_BIT;
  delayMicroseconds(10);
  PORTG |= RESB_BIT;
  delayMicroseconds(10);
}
