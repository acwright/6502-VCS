#include <Arduino.h>

#include "bus.h"
#include "flash.h"

// The bank register: write-only, at any address in $E000-$FFFF, $E000 by
// convention (PLAN.md §2).  A write there latches the register and reaches no
// flash, so it is always safe - including while a chip is busy.
#define BANK_REG 0xE000

// The switchable window, $C000-$DFFF.
#define WINDOW 0xC000
#define WINDOW_MASK 0x1FFF

// Timeouts, generously over the data sheet's maxima (20 us program, 25 ms
// sector, 100 ms chip).  They exist so a missing or dead cart reports a fault
// instead of hanging the Helper; they are not a timing model.
#define PROGRAM_TIMEOUT_US 1000UL
#define SECTOR_TIMEOUT_US 200000UL
#define CHIP_TIMEOUT_US 1000000UL

static inline uint8_t chip_bit(uint8_t chip) {
  return chip ? 0x40 : 0x00;
}

// The bank a chip-relative flash address lives in, with the chip select folded
// in: bits 0-5 are the 8 KB bank, bit 6 picks U1 or U2.
static inline uint8_t bank_for(uint8_t chip, uint32_t addr) {
  return (uint8_t)(((addr >> 13) & 0x3F) | chip_bit(chip));
}

static inline uint16_t cpu_for(uint32_t addr) {
  return (uint16_t)(WINDOW | (addr & WINDOW_MASK));
}

void flash_set_bank(uint8_t reg) {
  bus_write(BANK_REG, reg);
}

// Every write in a command sequence sets its own bank first.  This is
// deliberately not optimised away behind a shadow of the current value: the
// sequences use banks 2, 1, 2 and then the target, so consecutive writes almost
// never share a bank, and a shadow would buy nothing while adding exactly the
// state that PLAN.md §9 names as the thing two implementations get wrong in
// different directions.
static void flash_write(uint8_t chip, uint32_t addr, uint8_t data) {
  flash_set_bank(bank_for(chip, addr));
  bus_write(cpu_for(addr), data);
}

uint8_t flash_read(uint8_t chip, uint32_t addr) {
  flash_set_bank(bank_for(chip, addr));
  return bus_read(cpu_for(addr));
}

static void flash_unlock(uint8_t chip) {
  flash_write(chip, 0x5555, 0xAA);
  flash_write(chip, 0x2AAA, 0x55);
}

/**
 * Wait out a busy window by data polling DQ7.
 *
 * While the chip is busy every read of it returns status, so this reads the
 * address the operation targeted and waits for DQ7 to match what should be
 * there: the programmed byte, or `$FF` after an erase.  Two consecutive
 * matching reads are required because DQ7 becomes true one read before the data
 * is guaranteed valid.
 *
 * The bank is set once, outside the loop - the register write is harmless while
 * busy, but doing it 20,000 times during a chip erase is not free.
 *
 * A byte a program could not deliver - a `0` asked to become a `1` with no
 * erase first - never matches, and comes back as a timeout rather than as a
 * silent wrong byte. That is the right answer: it is the hardware's answer.
 */
static bool flash_wait(uint8_t chip, uint32_t addr, uint8_t expect, uint32_t timeout_us) {
  flash_set_bank(bank_for(chip, addr));
  const uint16_t cpu = cpu_for(addr);
  const uint32_t start = micros();

  for (;;) {
    if (((bus_read(cpu) ^ expect) & 0x80) == 0) {
      if (((bus_read(cpu) ^ expect) & 0x80) == 0) return true;
    }
    if ((uint32_t)(micros() - start) > timeout_us) return false;
  }
}

void flash_reset(uint8_t chip) {
  // `F0` at any address, and a bare one: the emulators treat it as a command
  // wherever it lands, so the three-byte AA/55/F0 spelling would leave them
  // mid-sequence. PLAN.md §3's table is the contract.
  flash_write(chip, 0x0000, 0xF0);
}

void flash_begin() {
  bus_begin(); // pulses RESB, which clears the bank register
  flash_reset(FLASH_PRIMARY);
  flash_reset(FLASH_SECONDARY);
  flash_set_bank(0);
}

void flash_id(uint8_t chip, uint8_t *manufacturer, uint8_t *device) {
  flash_unlock(chip);
  flash_write(chip, 0x5555, 0x90);
  delayMicroseconds(10); // Tida

  *manufacturer = flash_read(chip, 0x0000); // $BF, SST
  *device = flash_read(chip, 0x0001);       // $B5 / $B6 / $B7

  flash_reset(chip);
}

void flash_read_page(uint8_t chip, uint32_t addr, uint8_t *out) {
  // A 256-byte page never straddles an 8 KB bank, so one bank select covers the
  // whole page.
  flash_set_bank(bank_for(chip, addr));
  const uint16_t base = cpu_for(addr);
  for (uint16_t i = 0; i < FLASH_PAGE_SIZE; i++) {
    out[i] = bus_read((uint16_t)(base + i));
  }
}

static bool flash_program_byte(uint8_t chip, uint32_t addr, uint8_t data) {
  flash_unlock(chip);
  flash_write(chip, 0x5555, 0xA0);
  flash_write(chip, addr, data);
  return flash_wait(chip, addr, data, PROGRAM_TIMEOUT_US);
}

bool flash_program_page(uint8_t chip, uint32_t addr, const uint8_t *data) {
  for (uint16_t i = 0; i < FLASH_PAGE_SIZE; i++) {
    if (data[i] == 0xFF) continue; // a program clears bits only; $FF is a no-op
    if (!flash_program_byte(chip, addr + i, data[i])) return false;
  }
  return true;
}

bool flash_erase_sector(uint8_t chip, uint32_t addr) {
  const uint32_t sector = addr & ~(FLASH_SECTOR_SIZE - 1);

  flash_unlock(chip);
  flash_write(chip, 0x5555, 0x80);
  flash_unlock(chip);
  flash_write(chip, sector, 0x30);

  return flash_wait(chip, sector, 0xFF, SECTOR_TIMEOUT_US);
}

bool flash_erase_chip(uint8_t chip) {
  flash_unlock(chip);
  flash_write(chip, 0x5555, 0x80);
  flash_unlock(chip);
  flash_write(chip, 0x5555, 0x10);

  return flash_wait(chip, 0x0000, 0xFF, CHIP_TIMEOUT_US);
}
