# Mission decor sources

Project-owned low-poly abstractions for m5-m9. Rebuild with:

```bash
blender --background --python scripts/blender/build_mission_decor.py
```

The `.blend` masters and LODs are Git LFS; runtime GLBs are in
`src/assets/sites/{chanca,chimu,colonial,independence,arica}/`. They are
visual-only: terrain, collision and pathfinding remain owned by the mission
layout. `?lod=0` previews the master.

| Model | LOD | Bytes | SHA-256 |
| --- | --- | ---: | --- |
| chanca_fortress | LOD0 | 19008 | `5757f1ca0787cd0b08420afe50cff1cf3a5418e5cb0a6940e16bc28e54b714a9` |
| chanca_fortress | LOD1 | 15648 | `73cfdd46433cca51cbf6bbea31ccdf07819dbd111722ac6e30a1ffd2ab5b48ae` |
| chimu_compound | LOD0 | 17296 | `bf522d9a8a60af35ddc065b7d0102f8458a6ee71389302aa8c13ad45201e24cd` |
| chimu_compound | LOD1 | 11384 | `308f52248b3f5ad68ff17cc026a75fe19f1eb5b211a5bc90c639b3f8095bfde1` |
| colonial_church | LOD0 | 12584 | `6c2bae5b10d3f07f5ffc32b8d105bb973e5b2d064270a89e46a8c10fc70fb612` |
| colonial_church | LOD1 | 8944 | `e01ddadc0a40acf764e3d8031b8597746b1aad08e2bcdabf3bfe87d2fa40fc2c` |
| independence_chapel | LOD0 | 17900 | `d1905bb80149acdcf57bdc4fc721b424d823c4ec98cf66a53bd75287a0c6e2f4` |
| independence_chapel | LOD1 | 12760 | `77d8df2fa7cdf373e0b8dc527ac9dbad27a6ce0f4af25a2a38f042ee0fcb43cc` |
| arica_battery | LOD0 | 20956 | `d06d5ad8853960dac6acfe38b33e4c6f18ea0bc659b0df7fcd623c3bd2cf39ae` |
| arica_battery | LOD1 | 17596 | `efe5d29daee3887255ab38d68b006db68747eb272f6635ba8c7dc8b44274b85a` |


## Campaign intro renders

`renders/*.png` are 1600×900 draft hero renders produced by
`scripts/blender/render_mission_decor.py`. Ingest them with:

```bash
yarn art:blender --manifest=art-src/blender/mission-decor/renders.json
```

The resulting records start `reviewed: false` and stay hidden until approved.
