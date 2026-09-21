#include <Arduino.h>

#include "bus.h"
#include "flash.h"
#include "protocol.h"

static const char FW_NAME[] = "FH Programmer";

// Long enough that a host stall cannot truncate a frame, short enough that a
// half-sent frame does not wedge the Helper.  At 500 kbaud the longest frame is
// 267 bytes, or 5.3 ms on the wire.
#define BYTE_TIMEOUT_MS 250

static uint8_t rx[MAX_PAYLOAD];
static uint8_t tx[MAX_PAYLOAD + 8];

static inline uint16_t crc16_update(uint16_t crc, uint8_t byte) {
  crc ^= (uint16_t)byte << 8;
  for (uint8_t i = 0; i < 8; i++) {
    crc = (crc & 0x8000) ? (uint16_t)((crc << 1) ^ 0x1021) : (uint16_t)(crc << 1);
  }
  return crc;
}

uint16_t proto_crc16(const uint8_t *data, uint16_t len) {
  uint16_t crc = 0;
  for (uint16_t i = 0; i < len; i++) crc = crc16_update(crc, data[i]);
  return crc;
}

void proto_begin() {
  Serial.begin(500000);
}

static bool read_byte(uint8_t *out) {
  const uint32_t start = millis();
  while (Serial.available() <= 0) {
    if ((uint32_t)(millis() - start) > BYTE_TIMEOUT_MS) return false;
  }
  *out = (uint8_t)Serial.read();
  return true;
}

/** Build and send a response frame: the command echoed with bit 7 set, then status. */
static void reply(uint8_t cmd, uint8_t status, const uint8_t *payload, uint16_t len) {
  const uint16_t total = (uint16_t)(len + 1); // the status byte is payload[0]
  uint16_t n = 0;

  tx[n++] = FRAME_SYNC0;
  tx[n++] = FRAME_SYNC1;
  tx[n++] = (uint8_t)(cmd | FRAME_REPLY);
  tx[n++] = (uint8_t)(total & 0xFF);
  tx[n++] = (uint8_t)(total >> 8);
  tx[n++] = status;
  for (uint16_t i = 0; i < len; i++) tx[n++] = payload[i];

  const uint16_t crc = proto_crc16(&tx[2], (uint16_t)(n - 2));
  tx[n++] = (uint8_t)(crc & 0xFF);
  tx[n++] = (uint8_t)(crc >> 8);

  Serial.write(tx, n);
}

static inline void reply_status(uint8_t cmd, uint8_t status) {
  reply(cmd, status, NULL, 0);
}

/** The 24-bit little-endian chip-relative address every addressed command carries. */
static inline uint32_t payload_addr(const uint8_t *p) {
  return (uint32_t)p[0] | ((uint32_t)p[1] << 8) | ((uint32_t)p[2] << 16);
}

static void dispatch(uint8_t cmd, uint16_t len) {
  switch (cmd) {
    case CMD_PING:
      if (len != 0) return reply_status(cmd, ST_LEN);
      return reply_status(cmd, ST_OK);

    case CMD_VERSION: {
      if (len != 0) return reply_status(cmd, ST_LEN);
      uint8_t out[4 + sizeof(FW_NAME) - 1];
      out[0] = PROTO_VERSION;
      out[1] = FW_VERSION_MAJOR;
      out[2] = FW_VERSION_MINOR;
      out[3] = FW_VERSION_PATCH;
      memcpy(&out[4], FW_NAME, sizeof(FW_NAME) - 1); // no terminator; the length says
      return reply(cmd, ST_OK, out, (uint16_t)sizeof(out));
    }

    case CMD_ID: {
      if (len != 1) return reply_status(cmd, ST_LEN);
      if (rx[0] > FLASH_SECONDARY) return reply_status(cmd, ST_ARG);
      uint8_t out[2];
      flash_id(rx[0], &out[0], &out[1]);
      return reply(cmd, ST_OK, out, 2);
    }

    case CMD_ERASE_CHIP:
      if (len != 1) return reply_status(cmd, ST_LEN);
      if (rx[0] > FLASH_SECONDARY) return reply_status(cmd, ST_ARG);
      return reply_status(cmd, flash_erase_chip(rx[0]) ? ST_OK : ST_TIMEOUT);

    case CMD_ERASE_SECTOR: {
      if (len != 4) return reply_status(cmd, ST_LEN);
      if (rx[0] > FLASH_SECONDARY) return reply_status(cmd, ST_ARG);
      const uint32_t addr = payload_addr(&rx[1]);
      if (addr >= FLASH_MAX_SIZE) return reply_status(cmd, ST_ARG);
      if (addr % FLASH_SECTOR_SIZE) return reply_status(cmd, ST_ARG);
      return reply_status(cmd, flash_erase_sector(rx[0], addr) ? ST_OK : ST_TIMEOUT);
    }

    case CMD_PROGRAM_PAGE: {
      if (len != 4 + FLASH_PAGE_SIZE) return reply_status(cmd, ST_LEN);
      if (rx[0] > FLASH_SECONDARY) return reply_status(cmd, ST_ARG);
      const uint32_t addr = payload_addr(&rx[1]);
      if (addr >= FLASH_MAX_SIZE) return reply_status(cmd, ST_ARG);
      if (addr % FLASH_PAGE_SIZE) return reply_status(cmd, ST_ARG);
      return reply_status(cmd, flash_program_page(rx[0], addr, &rx[4]) ? ST_OK : ST_TIMEOUT);
    }

    case CMD_READ_PAGE: {
      if (len != 4) return reply_status(cmd, ST_LEN);
      if (rx[0] > FLASH_SECONDARY) return reply_status(cmd, ST_ARG);
      const uint32_t addr = payload_addr(&rx[1]);
      if (addr >= FLASH_MAX_SIZE) return reply_status(cmd, ST_ARG);
      if (addr % FLASH_PAGE_SIZE) return reply_status(cmd, ST_ARG);
      uint8_t page[FLASH_PAGE_SIZE];
      flash_read_page(rx[0], addr, page);
      return reply(cmd, ST_OK, page, FLASH_PAGE_SIZE);
    }

    case CMD_RESET_CART:
      if (len != 0) return reply_status(cmd, ST_LEN);
      // RESB clears the bank register; `F0` takes each chip out of ID mode or
      // out of a half-finished sequence, which RESB on its own does not.
      bus_reset_pulse();
      flash_reset(FLASH_PRIMARY);
      flash_reset(FLASH_SECONDARY);
      flash_set_bank(0);
      return reply_status(cmd, ST_OK);

    default:
      return reply_status(cmd, ST_CMD);
  }
}

void proto_poll() {
  if (Serial.available() <= 0) return;

  // Resync on AA 55.  The sync bytes can occur inside a payload, so this only
  // runs between frames; once a header is accepted the length decides where the
  // frame ends.  Carrying `prev` means AA AA 55 syncs on the second AA.
  uint8_t prev = 0;
  uint8_t byte = 0;
  for (;;) {
    if (!read_byte(&byte)) return;
    if (prev == FRAME_SYNC0 && byte == FRAME_SYNC1) break;
    prev = byte;
  }

  uint8_t cmd;
  uint8_t lo;
  uint8_t hi;
  if (!read_byte(&cmd)) return;
  if (!read_byte(&lo)) return reply_status(cmd, ST_FRAME);
  if (!read_byte(&hi)) return reply_status(cmd, ST_FRAME);

  const uint16_t len = (uint16_t)lo | ((uint16_t)hi << 8);
  if (len > MAX_PAYLOAD) {
    // Nothing sane sends this, so the length itself is the corruption. Answer
    // and resync rather than trying to swallow a length we do not believe.
    return reply_status(cmd, ST_LEN);
  }

  uint16_t crc = crc16_update(crc16_update(crc16_update(0, cmd), lo), hi);
  for (uint16_t i = 0; i < len; i++) {
    if (!read_byte(&rx[i])) return reply_status(cmd, ST_FRAME);
    crc = crc16_update(crc, rx[i]);
  }

  uint8_t c0;
  uint8_t c1;
  if (!read_byte(&c0)) return reply_status(cmd, ST_FRAME);
  if (!read_byte(&c1)) return reply_status(cmd, ST_FRAME);
  if ((uint16_t)((uint16_t)c0 | ((uint16_t)c1 << 8)) != crc) {
    return reply_status(cmd, ST_CRC);
  }

  dispatch(cmd, len);
}
