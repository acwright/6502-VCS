// FH Programmer - firmware for the AC6502 Flash Helper.
//
// An Arduino Mega 2560 R3 shield with one card edge connector on it, pretending
// to be a 65C02 so a Flash Cart can be programmed in circuit through the card
// edge with no chip ever removed - which matters, because the flash is a
// soldered-down TSOP part.
//
// Three layers, and each one knows nothing about the one above it:
//
//   bus.cpp       one read cycle and one write cycle, in direct port writes
//   flash.cpp     the SST39SF0x0 command set, and the bank translation
//   protocol.cpp  the framed protocol the `6502-flash` host tool speaks
//
// The contract all three implement is 6502-VCS `PLAN.md` §§2, 3 and 5.3, which
// is the normative copy - three emulators and this programmer have to agree bit
// for bit, so the rules live there rather than in any one implementation.
//
// Copyright (c) 2026 A.C. Wright Design. MIT; see LICENSE.

#include <Arduino.h>

#include "flash.h"
#include "protocol.h"

void setup() {
  // The bus first: until this runs the shield's pins are inputs, and a cart
  // sitting in the slot with a floating RESB has an undefined bank register.
  flash_begin();
  proto_begin();
}

void loop() {
  proto_poll();
}
