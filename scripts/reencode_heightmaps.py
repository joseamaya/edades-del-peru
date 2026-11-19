#!/usr/bin/env python3
"""Re-encode authored heightmaps from 16-bit little-endian base64 to signed delta-varint base64.

Run once after a generator change, or when migrating a new ``*Heightmap.ts`` file. The decoded
values are identical; the generated TypeScript imports the shared ``decodeHeightmap`` codec.
"""

from __future__ import annotations

import base64
import re
import struct
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DEFS = ROOT / 'src/model/defs'
IMPORT = "import { decodeHeightmap } from './heightmapCodec';\n"


def encode(values: list[int]) -> str:
    out = bytearray()
    prev = 0
    for value in values:
        delta = int(value) - prev
        prev = int(value)
        zigzag = (delta << 1) ^ (delta >> 31)
        while zigzag >= 0x80:
            out.append((zigzag & 0x7F) | 0x80)
            zigzag >>= 7
        out.append(zigzag)
    return base64.b64encode(out).decode('ascii')


def main() -> None:
    files = sorted(DEFS.glob('*Heightmap.ts'))
    for path in files:
        text = path.read_text()
        if 'decodeHeightmap(' in text:
            print(f'skip {path.name}: already delta-varint')
            continue
        match = re.search(r"const B64 =\s*'([^']+)';", text, re.S)
        if not match:
            print(f'skip {path.name}: no B64')
            continue
        raw = base64.b64decode(match.group(1))
        values = list(struct.unpack('<' + 'H' * (len(raw) // 2), raw))
        encoded = encode(values)
        scale_match = re.search(r'export const (\w+_HEIGHTMAP_SCALE) = ([\d.]+);', text)
        if not scale_match:
            print(f'skip {path.name}: no scale')
            continue
        scale_name = scale_match.group(1)
        block = re.compile(
            r"const B64 =\s*'[^']+';.*?export const (\w+_HEIGHTMAP) = decode\(\);",
            re.S,
        )
        replaced, count = block.subn(
            lambda m: (
                f"const B64 =\n  '{encoded}';\n"
                f'export const {m.group(1)} = decodeHeightmap(B64, {len(values)}, {scale_name});'
            ),
            text,
            count=1,
        )
        if count != 1:
            print(f'skip {path.name}: decode block not found')
            continue
        if "from './heightmapCodec'" not in replaced:
            replaced = replaced.replace('\n', '\n' + IMPORT, 1)
        path.write_text(replaced)
        print(f'reencoded {path.name}: {len(match.group(1))} -> {len(encoded)} base64 chars')


if __name__ == '__main__':
    main()
