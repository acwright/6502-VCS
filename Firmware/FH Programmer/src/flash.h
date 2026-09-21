// The SST39SF0x0 command set (6502-VCS PLAN.md §3), driven through bus.cpp.
//
// Addresses here are **chip-relative flash addresses**, 0 .. chip size - 1, not
// CPU addresses.  Turning one into a bus cycle is the bank register's job and
// is done in flash.cpp, in one place, because getting it wrong is the single
// easiest mistake in this firmware:
//
//   the JEDEC unlock addresses are bank-relative.  Flash $5555 is "bank 2, CPU
//   $D555"; flash $2AAA is "bank 1, CPU $CAAA".  Every write in a command
//   sequence needs its own bank set first, and for the secondary chip every one
//   of those bank values also carries $40.
//
// The Helper does not know which part is fitted, so nothing here bounds an
// address against a chip size.  The host knows the image size and decides; the
// protocol layer only refuses what no SST39SF0x0 could hold.

#pragma once

#include <stdint.h>

#define FLASH_PRIMARY 0
#define FLASH_SECONDARY 1

/** 256 bytes: the unit PROGRAM_PAGE and READ_PAGE move. */
#define FLASH_PAGE_SIZE 256

/** 4 KB: the erase unit, and the granularity of a `.sav` overlay. */
#define FLASH_SECTOR_SIZE 0x1000UL

/** The largest address any SST39SF0x0 in the family decodes. */
#define FLASH_MAX_SIZE 0x80000UL

/** Put both chips back in read mode and the bank register back to 0. */
void flash_begin();

/** Write the cart's bank register directly. Exposed for RESET_CART and tests. */
void flash_set_bank(uint8_t reg);

/** `F0`: back to read mode, mid-sequence or not. */
void flash_reset(uint8_t chip);

/** Software ID: `$BF` and one of `$B5`/`$B6`/`$B7`. Leaves the chip in read mode. */
void flash_id(uint8_t chip, uint8_t *manufacturer, uint8_t *device);

/** One byte, straight through the window. */
uint8_t flash_read(uint8_t chip, uint32_t addr);

/** 256 bytes from a page-aligned address. One bank select, then 256 reads. */
void flash_read_page(uint8_t chip, uint32_t addr, uint8_t *out);

/**
 * Program one page. `addr` must be page-aligned.
 *
 * `$FF` bytes are skipped, which is exact rather than an approximation: a byte
 * program clears bits only (`new = old & data`), so programming `$FF` cannot
 * change anything. Returns false if any byte's busy window did not close.
 */
bool flash_program_page(uint8_t chip, uint32_t addr, const uint8_t *data);

/** Erase the 4 KB sector containing `addr`. */
bool flash_erase_sector(uint8_t chip, uint32_t addr);

/** Erase the whole chip to `$FF`. */
bool flash_erase_chip(uint8_t chip);
