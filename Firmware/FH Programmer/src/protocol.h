// The framed binary protocol on Serial (PLAN.md §5.3), at 500 kbaud.
//
//   request   AA 55 | cmd        | len:u16 | payload        | crc16
//   response  AA 55 | cmd | $80  | len:u16 | status payload | crc16
//
// Little-endian, like the `.sav` container.  The CRC is CRC-16/XMODEM
// (polynomial $1021, initial value 0) over everything between the sync bytes
// and the CRC itself - the command byte, the length and the payload.
//
// Nothing is fire-and-forget: **every command answers with a frame**, and a
// response always carries at least its status byte.  A 512 KB program is 2,048
// acknowledged pages, which is what makes a progress bar honest, and what lets
// the host stop on the page that failed rather than at the end.
//
// A response echoes its command with bit 7 set.  That costs one bit and buys
// two things: a host that has lost its place can tell a reply from a request,
// and a reply to the wrong command is an error rather than a misread payload.

#pragma once

#include <stdint.h>

#define PROTO_VERSION 1

#define FW_VERSION_MAJOR 1
#define FW_VERSION_MINOR 0
#define FW_VERSION_PATCH 0

#define FRAME_SYNC0 0xAA
#define FRAME_SYNC1 0x55
#define FRAME_REPLY 0x80

#define CMD_PING 0x01
#define CMD_VERSION 0x02
#define CMD_ID 0x03
#define CMD_ERASE_CHIP 0x04
#define CMD_ERASE_SECTOR 0x05
#define CMD_PROGRAM_PAGE 0x06
#define CMD_READ_PAGE 0x07
#define CMD_RESET_CART 0x08

#define ST_OK 0x00
#define ST_CRC 0x01     // the frame's CRC did not match
#define ST_LEN 0x02     // payload length wrong for this command
#define ST_CMD 0x03     // unknown command
#define ST_ARG 0x04     // an argument out of range, or a misaligned address
#define ST_TIMEOUT 0x05 // the chip stayed busy past its window
#define ST_FRAME 0x06   // a frame arrived truncated

/** The longest payload either way: PROGRAM_PAGE's chip + 3-byte address + 256 bytes. */
#define MAX_PAYLOAD 260

/** CRC-16/XMODEM. The host has the same function, byte for byte. */
uint16_t proto_crc16(const uint8_t *data, uint16_t len);

void proto_begin();

/** Read at most one frame and answer it. Called from `loop()`. */
void proto_poll();
