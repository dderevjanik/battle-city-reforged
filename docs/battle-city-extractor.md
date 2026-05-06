# Battle City (NES) — Level / Map Extraction Specification

This document describes how to read and extract the original **35 stages**
(plus 1 demo / construction stage = 36 entries total) from the Japanese
Famicom / NES ROM of _Battle City_ (Namco, 1985).

Every offset and formula in this document is taken from a working, verified
extractor (see `Classes/BCLevel.pas` and `Resources/BattleCityJ.ini` in this
repository). All offsets are **absolute byte offsets inside the `.nes` file**
(the 16-byte iNES header is **included** in the offset — do **not** subtract
0x10).

---

## 1. Target ROM

| Property         | Value                                           |
| ---------------- | ----------------------------------------------- |
| Title            | Battle City (Famicom / J)                       |
| Mapper           | 0 (NROM-128)                                    |
| PRG ROM size     | 16 384 bytes (0x4000)                           |
| CHR ROM size     | 8 192 bytes (0x2000)                            |
| Mirroring        | 0 (horizontal)                                  |
| Total file size  | 16 + 16 384 + 8 192 = **24 592 bytes**          |
| Number of stages | 36 (35 playable + 1 used for demo/construction) |

Verify before extracting:

1. Bytes 0..3 must be `4E 45 53 1A` (`"NES\x1A"`).
2. Byte 4 (PRG banks) must be `0x01`.
3. Byte 5 (CHR banks) must be `0x01`.
4. Byte 6 low nibble (mapper / flags) must be `0x00` (mapper 0, no trainer,
   horizontal mirroring).

If any of these differ, this specification does **not** apply — there are
many regional variants and hacks; their offsets will be different.

---

## 2. File layout overview

```
+----------------------+  0x0000
|  iNES header (16 B)  |
+----------------------+  0x0010
|                      |
|  PRG ROM (16 KiB)    |  ← all level / palette / TSA data lives here
|                      |
+----------------------+  0x4010
|                      |
|  CHR ROM (8 KiB)     |  ← tile pixel data (sprite + background banks)
|                      |
+----------------------+  0x6010   (= EOF)
```

Useful regions inside this file:

| Region                       | File offset (hex)   | Notes                                      |
| ---------------------------- | ------------------- | ------------------------------------------ |
| iNES header                  | 0x0000 – 0x000F     | 16 bytes                                   |
| PRG ROM                      | 0x0010 – 0x400F     |                                            |
| Block attribute table        | 0x1ACB – 0x1ADA     | 16 bytes, one palette index per block-type |
| TSA (block → 4 CHR tiles)    | 0x1ADB – 0x1B1A     | 16 entries × 4 bytes                       |
| Flag (eagle) TSA             | 0x137D – 0x1398     | 4 × 7 nametable bytes                      |
| Fortified-flag TSA           | 0x1399 – 0x13B4     | 4 × 7 nametable bytes                      |
| BG palette (4×4)             | 0x1585 – 0x1594     |                                            |
| Sprite palette (4×4)         | 0x1565 – 0x1574     |                                            |
| **Level (map) data**         | **0x308A – 0x3D55** | 36 × 91 bytes, contiguous                  |
| Tank starting positions      | 0x2484 – 0x248D     | Shared by every level                      |
| Enemy spawn lists            | 0x24FC – 0x2587     | 4 bytes per level × 36                     |
| Enemy spawn counts           | 0x2588 – 0x2613     | 4 bytes per level × 36                     |
| Sprite CHR pattern table     | 0x4010 – 0x500F     |                                            |
| Background CHR pattern table | 0x5010 – 0x600F     |                                            |

---

## 3. Stage / level data — the actual maps

### 3.1 Geometry

Each playfield is a **13 × 13 grid of "blocks"**.
On screen each block is rendered as 16 × 16 pixels (= 2 × 2 NES name-table
tiles), so the visible playfield is 208 × 208 pixels.

A **block** is encoded as a single 4-bit value (nibble) in the range 0..15.
The nibble is an index into the 16-entry **TSA table** at 0x1ADB, which in
turn gives 4 CHR tile IDs that draw the block. For map extraction you
normally only need the nibble itself — see §3.4 for the conventional
material meaning of each value.

### 3.2 Per-stage size

```
13 columns × 4 bits = 52 bits per row → stored in 7 bytes per row
                                         (the last 4 bits of byte 6 are padding)
13 rows × 7 bytes = 91 bytes per stage
```

### 3.3 Stage offsets

Stages are stored back-to-back starting at file offset **0x308A**.
Stage _N_ (0-based) begins at:

```
stage_offset(N) = 0x308A + N * 0x5B            ; 0x5B = 91
```

Verified offsets for every stage (matches `Resources/BattleCityJ.ini`):

| Stage | Offset | Stage | Offset | Stage | Offset | Stage | Offset |
| ----: | -----: | ----: | -----: | ----: | -----: | ----: | -----: |
|     0 | 0x308A |     9 | 0x33BD |    18 | 0x36F0 |    27 | 0x3A23 |
|     1 | 0x30E5 |    10 | 0x3418 |    19 | 0x374B |    28 | 0x3A7E |
|     2 | 0x3140 |    11 | 0x3473 |    20 | 0x37A6 |    29 | 0x3AD9 |
|     3 | 0x319B |    12 | 0x34CE |    21 | 0x3801 |    30 | 0x3B34 |
|     4 | 0x31F6 |    13 | 0x3529 |    22 | 0x385C |    31 | 0x3B8F |
|     5 | 0x3251 |    14 | 0x3584 |    23 | 0x38B7 |    32 | 0x3BEA |
|     6 | 0x32AC |    15 | 0x35DF |    24 | 0x3912 |    33 | 0x3C45 |
|     7 | 0x3307 |    16 | 0x363A |    25 | 0x396D |    34 | 0x3CA0 |
|     8 | 0x3362 |    17 | 0x3695 |    26 | 0x39C8 |    35 | 0x3CFB |

Stage 35 is the demo / construction screen used by the title sequence; the
35 playable stages are 0..34. (The original ROM also points stage 35 at the
same enemy data as stage 34 — see §4.2.)

### 3.4 Decoding one stage

For stage `N`, read the 91 bytes at `stage_offset(N)`. To recover the block
at row `y` (0..12), column `x` (0..12):

```
byte = ROM[ stage_offset(N) + y * 7 + (x div 2) ]

if (x mod 2) == 0:   block = (byte >> 4) & 0x0F     ; high nibble first
else:                block =  byte       & 0x0F     ; low nibble second
```

Equivalent reference implementation (Pascal, exactly as used in the editor —
see `Classes/BCLevel.pas` lines 88–104):

```pascal
LevelByte := ROM[LevelDataOffset + (pYCoord * 7) + (pXCoord div 2)];
if (pXCoord mod 2 = 1) then
  LevelByte :=  LevelByte        and $0F
else
  LevelByte := (LevelByte shr 4) and $0F;
```

So a row of 13 nibbles `n0 n1 n2 … n12` is packed as:

```
byte 0: n0 n1     byte 1: n2 n3     byte 2: n4 n5     byte 3: n6  n7
byte 4: n8 n9     byte 5: n10 n11   byte 6: n12 _     ; low nibble of byte 6 is unused padding
```

The unused low nibble in byte 6 should be preserved on round-trip writes,
but for read-only extraction it is ignored.

### 3.5 Block (material) values

Each nibble selects one of 16 entries in the TSA tile table. The Battle
City convention assigns the following materials. The first column is the
nibble; the second is the visual layout of the block's 4 quadrants
(`██` = solid material of that type, `..` = empty):

| Value | Material                                      | Visual (TL TR / BL BR) |
| ----: | --------------------------------------------- | ---------------------- |
|   0x0 | Empty (background)                            | `.. .. / .. ..`        |
|   0x1 | Brick — full                                  | `BB BB / BB BB`        |
|   0x2 | Brick — right half                            | `.. BB / .. BB`        |
|   0x3 | Brick — bottom half                           | `.. .. / BB BB`        |
|   0x4 | Brick — left half                             | `BB .. / BB ..`        |
|   0x5 | Brick — top half                              | `BB BB / .. ..`        |
|   0x6 | Steel — full                                  | `SS SS / SS SS`        |
|   0x7 | Steel — right half                            | `.. SS / .. SS`        |
|   0x8 | Steel — bottom half                           | `.. .. / SS SS`        |
|   0x9 | Steel — left half                             | `SS .. / SS ..`        |
|   0xA | Steel — top half                              | `SS SS / .. ..`        |
|   0xB | Water (impassable to tanks, bullets pass)     | `WW WW / WW WW`        |
|   0xC | Trees / forest (covers tank)                  | `TT TT / TT TT`        |
|   0xD | Ice (slippery)                                | `II II / II II`        |
|   0xE | (unused / second forest variant in some ROMs) | —                      |
|   0xF | (unused / second ice variant in some ROMs)    | —                      |

> The mapping above is established by convention (the canonical Japanese
> ROM uses these values). If you are extracting a hack, treat the nibble
> as opaque: read the four CHR tile IDs at `0x1ADB + nibble*4` and the
> palette index at `0x1ACB + nibble`, and render those instead.

### 3.6 The eagle / base

The eagle base is **not** stored inside the level data. It is rendered
unconditionally at fixed playfield coordinates `x = 6, y = 12` (in 16-px
blocks; pixel position = 80, 192). The visual layout of the eagle and its
fortified (stone-walled) variant is stored separately:

- Normal eagle TSA: 4 rows × 7 nametable bytes at **0x137D**, drawn at
  pixel (80, 176). Read with `ROM[0x137D + row*7 + col]`.
- Fortified eagle TSA: 4 × 7 bytes at **0x1399**.

When recreating the playfield image, draw the level data first, then
overlay the eagle on top.

---

## 4. Per-stage spawn data

### 4.1 Player and enemy starting positions (shared)

These are the same for every stage. They are stored as raw NES pixel
coordinates; the editor converts to block coordinates with
`block = (raw >> 4) - 1` (see `Classes/BCLevel.pas` line 114).

| Offset | Field                    |
| -----: | ------------------------ |
| 0x2484 | Enemy 1 (left) spawn X   |
| 0x2485 | Enemy 2 (middle) spawn X |
| 0x2486 | Enemy 3 (right) spawn X  |
| 0x2487 | Enemy 1 (left) spawn Y   |
| 0x2488 | Enemy 2 (middle) spawn Y |
| 0x2489 | Enemy 3 (right) spawn Y  |
| 0x248A | Player 1 spawn X         |
| 0x248B | Player 2 spawn X         |
| 0x248C | Player 1 spawn Y         |
| 0x248D | Player 2 spawn Y         |

### 4.2 Enemy waves (per stage)

Each stage has 4 enemy "slots". Two parallel arrays describe them:

- `EnemyData[stage][slot]` at `0x24FC + stage*4 + slot` — one byte each.
- `EnemyAmount[stage][slot]` at `0x2588 + stage*4 + slot` — how many of
  that enemy to spawn.

A single enemy-data byte is bit-packed as follows (see
`Classes/BCEnemy.pas`):

```
bit 7..5 : EnemyType        (0..7 — tank class)
bit 4    : (unused)
bit 3    : (unused)
bit 2    : Powerups          (0/1 — drops a power-up icon)
bit 1..0 : ShieldStrength    (0..3 — armor / hits required)
```

Per-stage offsets (verified, both arrays are 4 bytes per stage):

```
enemy_data_offset(N)   = 0x24FC + N * 4      ; for N = 0..35
enemy_amount_offset(N) = 0x2588 + N * 4      ; for N = 0..35
```

Note: in the original ROM, stage 35 reuses stage 34's enemy data
(`0x2584 / 0x2610`) — a known quirk, not a bug in this spec.

---

## 5. Reference extraction algorithm

Pseudo-code that produces a 13×13 nibble matrix for every stage:

```python
def extract_battle_city_levels(rom_bytes):
    assert rom_bytes[0:4] == b"NES\x1a"
    assert rom_bytes[4] == 1 and rom_bytes[5] == 1     # 16K PRG, 8K CHR
    NUM_STAGES = 36
    LEVEL_BASE = 0x308A
    STAGE_LEN  = 91          # 13 rows * 7 bytes

    stages = []
    for n in range(NUM_STAGES):
        base = LEVEL_BASE + n * STAGE_LEN
        grid = [[0]*13 for _ in range(13)]
        for y in range(13):
            row_base = base + y * 7
            for x in range(13):
                b = rom_bytes[row_base + (x >> 1)]
                grid[y][x] = (b >> 4) & 0x0F if (x & 1) == 0 else b & 0x0F
        stages.append(grid)
    return stages
```

To dump everything as plain text (one stage per file, one character per
block):

```python
GLYPH = {
    0x0: ' ',  0x1: 'B',  0x2: 'b',  0x3: 'b',  0x4: 'b',  0x5: 'b',
    0x6: 'S',  0x7: 's',  0x8: 's',  0x9: 's',  0xA: 's',
    0xB: '~',  0xC: '#',  0xD: '*',  0xE: '?',  0xF: '?',
}
for i, grid in enumerate(extract_battle_city_levels(rom)):
    with open(f"stage_{i:02d}.txt", "w") as f:
        for row in grid:
            f.write("".join(GLYPH[c] for c in row) + "\n")
```

For a higher-fidelity export, replace each block by its 4 quadrant tiles
(see §3.5) so the output is a 26 × 26 grid that preserves half-blocks.

---

## 6. Sanity checks

After extraction, verify:

1. Every stage is exactly 91 bytes long; the next stage starts immediately
   after.
2. For stage 0 (Stage 1 in-game), row 12 contains the eagle's surrounding
   bricks: nibble pattern around `(x=5..7, y=11..12)` should be brick
   half-blocks (values 1–5), not steel.
3. No nibble greater than 0xD should appear in the unmodified Japanese
   ROM. Values 0xE / 0xF showing up indicate either a hacked ROM or a
   reading-side bug (most often: nibble order reversed — see §3.4).
4. The 4 bytes at `0x24FC + 0` (stage 0 enemies) decode to plausible
   tank types (0..3) with non-zero counts at `0x2588 + 0`.

---

## 7. Files in this repository that implement the spec

- `Classes/BCLevel.pas` — read/write of the 4-bit packed map (formula in §3.4).
- `Classes/BCEnemy.pas` — bitfield decoding of enemy bytes (§4.2).
- `Classes/BCData.pas` — top-level loader that wires offsets to logic.
- `Resources/BattleCityJ.ini` — the canonical offset table; this document
  is derived from that file plus the Pascal sources above.
