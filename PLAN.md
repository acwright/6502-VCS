# Flash Cart — the normative specification

> **This is the contract the Flash Cart rollout is written against**, and the reason it
> lives in this repository is that everything else in the workspace has to agree on it.
> Four independent implementations — 6502-EMULATOR (`src/core/Cart.ts`), the 6502-PICOCALC
> port (`src/machine/cart.c`), 6502-DEV's DB Emulator (`lib/6502/Cart/`) and the Flash
> Helper's own `6502-flash` (`Firmware/FH Programmer/host/`) — have to behave identically,
> bit for bit, so the rules are here rather than in any one of them.
>
> Source files across six repositories cite these sections by number. **They are numbered
> for citation: do not renumber them.**
>
> | | |
> |---|---|
> | [§1](#1-the-cart-file-naming-scheme) | the cart file naming scheme |
> | [§2](#2-the-mapper-contract) | the mapper contract |
> | [§3](#3-the-flash-command-set) | the flash command set |
> | [§4](#4-saves-never-reach-the-flash-helper) | saves, and the `.sav` container |
>
> The **hardware** is specified separately, in
> [`Hardware/Flash Cart/Rev 1.0/DESIGN.md`](./Hardware/Flash%20Cart/Rev%201.0/DESIGN.md) —
> the board, the decode logic, the bank register's wiring and the programming methods. This
> file is the software contract over it.
>
> **The ROM Cart is not replaced.** Rev 1.0a and Rev 1.0b stay in the README, stay in the
> BOM, and every existing `.crt` keeps building, loading and burning exactly as it does
> today. The Flash Cart is an addition.
>
> The shared oracle is
> [`Firmware/FH Programmer/host/test/fixtures/`](./Firmware/FH%20Programmer/host/test/fixtures/README.md).
> Every implementation checks against **those files** rather than against each other, which
> is the only way four readings of one contract end up agreeing rather than sharing a bug.
> **If a checksum there moves, every repository that keeps a copy has to be told.**
>
> Written 2026-09-20 as the root plan of the Flash Cart rollout; reduced to its four
> normative sections on 2026-09-21, when the rollout closed and the planning around them
> was spent.

---

## 1. The cart file naming scheme

```
<Name>[-VDP][-<target>].crt
```

| Target suffix | Bytes | Part | Mapper |
|---|---|---|---|
| *(none)* | 32,768 | 28C256 / 27C256 | flat |
| `-128K` | 131,072 | SST39SF010A | banked |
| `-256K` | 262,144 | SST39SF020A | banked |
| `-512K` | 524,288 | SST39SF040 | banked |
| `-1M` | 1,048,576 | SST39SF040 ×2 | banked |

Examples: `Cart.crt`, `Cart-VDP.crt`, `Cart-512K.crt`, `Cart-VDP-1M.crt`,
`HelloWorldCart-128K.crt`.

Five rules, and every repository in the rollout depends on all five:

1. **A `.crt` is a byte-exact image of the chip or chips on a cart.** No header, no
   footer, no metadata. What is in the file is what is on the silicon. This is the
   property the whole scheme exists to preserve, and it is why there is no container
   format.
2. **The mapper is decided by file size, not by the name.** 32,768 bytes is the flat
   16K mapper; 131,072 / 262,144 / 524,288 / 1,048,576 is the banked mapper. The sizes
   cannot collide — no 32K flash part is in the BOM and no 128K-and-up EEPROM cart
   exists — so size alone is sound. A loader that sees any other size rejects the file,
   exactly as `Cart.load()` does today.
3. **The name must agree with the size, and a disagreement is a warning, not an error.**
   `Foo-512K.crt` that is 262,144 bytes long loads as a 256K cart and says so. The name
   is for the human reading `ls`; the bytes are for the machine.
4. **On a `-1M` image, U1 is the first 512 KB and U2 is the second.** The register's
   bank numbering is linear across the pair (§2), so the file is linear too and the
   Flash Helper splits it at the halfway mark.
5. **No emulator ever writes a `.crt`.** Not on save, not on eject, not on quit. See §4.

### Where the VDP suffix goes

`-VDP` comes first, then the target: `Cart-VDP-512K.crt`, never `Cart-512K-VDP.crt`.
`-VDP` says which BIOS and video card the code needs; the target says which chip it is
burnt to. Build variant, then hardware target — and it keeps the existing `Cart-VDP.crt`
spelling untouched for the legacy path.

### What the suffix buys per target

| Target | 8K banks | Usable banks | Fixed bank | Code space |
|---|---|---|---|---|
| *(none)* | — | — | — | 16,378 bytes (`$C000–$FFF9`) |
| `-128K` | 16 | 0–14 | 15 | 120 KB banked + 8 KB fixed |
| `-256K` | 32 | 0–30 | 31 | 240 KB banked + 8 KB fixed |
| `-512K` | 64 | 0–62 | 63 | 504 KB banked + 8 KB fixed |
| `-1M` | 128 | 0–62, 64–127 | 63 | 1,016 KB banked + 8 KB fixed |

On a 128K or 256K part the flash's high address pins are not bonded, so register values
above the part's bank count alias down, and "bank 63" lands on the part's own last 8 KB.
That is a property of the board, not of the tooling — see
[`DESIGN.md`](./Hardware/Flash%20Cart/Rev%201.0/DESIGN.md), *Bank register*.

---

## 2. The mapper contract

Three emulators implement this: 6502-EMULATOR (`src/core/Cart.ts`), 6502-PICOCALC
(`src/machine/`), and 6502-DEV's DB Emulator (`lib/6502/Cart/`). They must agree
bit for bit, so the rules are here rather than in any one of them.

### Derived constants

```
SIZE      = file length in bytes
CHIPS     = SIZE > 0x80000 ? 2 : 1
CHIP_SIZE = SIZE / CHIPS                 ; always 0x20000, 0x40000 or 0x80000
BANKS     = CHIP_SIZE / 0x2000           ; 16, 32 or 64
BANK_MASK = BANKS - 1                    ; 0x0F, 0x1F or 0x3F
```

### The bank register

- Write-only, 8 bits, at **any** address in `$E000–$FFFF`. By convention `$E000`.
- Cleared to 0 by reset. Every emulator clears it on both cold and warm reset, because
  the register's `/MR` is on `RESB`.
- A write to `$E000–$FFFF` latches the register **and reaches no flash**. It is not also
  a flash write; `WEB` is not asserted there.
- Not readable. A read of `$E000–$FFFF` is a flash read (below).

Decode of the latched value `reg`:

```
chip = (reg >> 6) & 1
bank = reg & BANK_MASK        ; the NC high address pins on a 010A/020A
                              ; are exactly this mask
; bit 7 is latched and goes nowhere. Values 128-255 mirror 0-127.
```

### Reads

| CPU address | Flash byte |
|---|---|
| `$C000–$DFFF` | `chip*CHIP_SIZE + bank*0x2000 + (addr - 0xC000)` |
| `$E000–$FFFF` | `CHIP_SIZE - 0x2000 + (addr - 0xE000)` — primary chip, last 8 KB |

`chip == 1` while `CHIPS == 1` (a 512K image, or U2 unfitted) reads **open bus**, which
every emulator models as **`$FF`**. On the board the bus floats and would in practice hold
whatever it last carried; `$FF` is a deliberate simplification, chosen because all three
emulators can implement it identically and it is predictable to debug against. It is
recorded in 6502-DOCS `ACCURACY.md`.

The fixed region is always the **primary** chip. `chip` never applies to it.

### Writes

| CPU address | Effect |
|---|---|
| `$C000–$DFFF` | Flash `WEB`, at the translated address above, on the chip `chip` selects |
| `$E000–$FFFF` | Latches the bank register |

A flash write only does anything as part of a JEDEC command sequence (§3). A bare write to
`$C000–$DFFF` outside a sequence is swallowed.

### Reset

`RESB` clears the bank register to 0 and returns both chips to read mode (§3). It does not
clear flash contents and it does not discard a save overlay.

---

## 3. The flash command set

Each chip has its own independent state machine — the sequence is addressed through `/CE`,
and `B6` picks the chip, so programming U2 does not disturb U1.

Unlock addresses are compared against the **translated flash address, masked to 15 bits**
(`flashAddr & 0x7FFF`), because the SST39SF0x0 only decodes A14–A0 for commands. This
falls out for free once writes are translated through the same bank mapping as reads:
CPU `$D555` in bank 2 translates to flash `$5555`, and CPU `$CAAA` in bank 1 to `$2AAA`,
which is the table in `DESIGN.md`'s *Flash commands* section.

| Sequence (address ← data) | Operation |
|---|---|
| `5555←AA`, `2AAA←55`, `5555←A0`, `target←data` | Byte program |
| `5555←AA`, `2AAA←55`, `5555←80`, `5555←AA`, `2AAA←55`, `sector←30` | Sector erase (4 KB) |
| `5555←AA`, `2AAA←55`, `5555←80`, `5555←AA`, `2AAA←55`, `5555←10` | Chip erase |
| `5555←AA`, `2AAA←55`, `5555←90` | Software ID entry |
| `F0` (any address) | Reset to read mode |

**Byte program clears bits only.** `new = old & data`. A program that expects a `0` bit to
come back as `1` without an erase is a bug on hardware, and every emulator must reproduce
that, or the bug will not show up until the chip is real.

**Software ID** puts the chip in ID mode: flash `$0000` reads `$BF` (SST), flash `$0001`
reads the device ID. `F0` leaves.

| Part | Device ID |
|---|---|
| SST39SF010A | `$B5` |
| SST39SF020A | `$B6` |
| SST39SF040 | `$B7` |

An emulator derives the reported ID from `CHIP_SIZE`, so `id` over the Helper and `id` in
the emulator return the same pair.

**Erase writes `$FF`.** Sector erase covers 4 KB aligned on a 4 KB boundary.

### Busy, and the trap it protects against

`DESIGN.md` is explicit that a routine programming U1 must run from RAM with interrupts
off, because **while U1 is busy its reads return status bits everywhere, including the
fixed region where the vectors live**. An emulator that completes a program or erase
instantly will happily run a routine that would hang the real machine.

So: an emulator that has a cycle count available models a busy window — **20 µs for a
byte program, 25 ms for a sector erase, 100 ms for a chip erase** — during which every
read of that chip returns status rather than data:

```
DQ7 = complement of the value's DQ7 (for a program) / 0 (for an erase)
DQ6 = toggles on every read
DQ5 = 0
```

Both standard polling loops then terminate correctly: a DQ7 data-poll matches once the
window closes, and a DQ6 toggle-loop sees two equal reads.

6502-EMULATOR models the window (it has cycle counts, and it is where carts get written).
6502-PICOCALC and the DB Emulator may complete instantly; both record it as a known
divergence, because neither is where a self-programming cart is developed.

---

## 4. Saves never reach the Flash Helper

The requirement, stated plainly: **a save written while testing must not be able to end up
on a real chip by accident.** The mechanism is a sidecar, and the enforcement is that the
Flash Helper's `program` command has no option to include one.

- The `.crt` is opened read-only by every emulator, always.
- Flash writes accumulate in a **sector-granular overlay** alongside it:
  `<stem>.sav`, next to `<stem>.crt`. 4 KB records, matching the chip's erase unit.
- On load, the overlay is applied over the image in memory. On eject or quit, it is
  written back. The `.crt`'s mtime never changes.
- `6502-flash program` reads the `.crt` and nothing else. There is no `--with-saves`,
  no `--merge`, no environment variable.
- Baking an overlay in is a separate, explicit command that writes a **new file**:
  `6502-flash merge Cart-512K.crt Cart-512K.sav -o Cart-512K-shipped.crt`.

### The `.sav` container

Little-endian throughout. Both the host tool and every emulator implement this, so it is
specified here byte for byte.

```
offset  size  field
  0      4    magic      'A' 'C' 'S' 'V'  (41 43 53 56)
  4      1    version    1
  5      1    reserved   0
  6      2    count      number of sector records
  8      4    image_size the SIZE of the .crt this belongs to
 12      4    image_crc  CRC-32 (IEEE, the zlib polynomial) of the whole .crt
 16    ...    records    count × [ 4-byte sector index ][ 4096 bytes ]
```

Records are written in ascending sector index. `sector index` counts 4 KB units from the
start of the **image**, so on a `-1M` cart U2's first sector is index 128.

`image_size` and `image_crc` are what make the sidecar safe. Rebuild the cart and the CRC
moves; the loader then reports *"save data belongs to a different build of this cart"* and
starts the cart with the overlay ignored rather than applying stale sectors over new code.
The stale `.sav` is left on disk untouched, never silently deleted.

### Per-host storage

| Host | Where the overlay lives |
|---|---|
| Desktop / CLI | `<stem>.sav` beside the `.crt` |
| Web | A new key in the existing IndexedDB store, keyed by `image_crc`. **Never bump `DB_VERSION`**: the web host's CompactFlash images live in the same store, and a version bump runs a migration over them for the sake of a key that could simply be added |
| PicoCalc | The flash region is itself the working copy; `Carts/<name>.sav` on the SD on eject |
| DB Emulator | `Carts/<name>.sav` on the SD |

The PicoCalc case is worth stating out loud because it looks like an exception and is not:
the image the PicoCalc banks out of lives in its own flash, which *is* the cart's flash
chip in this metaphor. The file on the SD card — the one you would hand to the Flash Helper — is
never written. Reloading the cart from the SD is how you throw a save away.
