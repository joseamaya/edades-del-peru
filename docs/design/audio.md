# Audio design

**Status:** living · **Last updated:** 2026-11-24

The game ships **procedural audio only**: every sound is synthesised at runtime with WebAudio and no
external sample pack is required to start a match. This document fixes the mixer, the spatial rules, the
music layers, the ambience beds and the boundary for a future recorded-audio phase.

## Mixer buses

| Bus | Default | What it carries |
| --- | ---: | --- |
| Master | 0.90 | Everything; the last gain before the destination. |
| Effects | 0.80 | Combat, harvest, construction and UI sounds. |
| Music | 0.25 | The generative score (three layers). |
| Ambience | 0.60 | The biome bed (surf, wind, insects). |

- The four values live in `peru-settings` as `masterVolume`, `sfxVolume`, `musicVolume`,
  `ambienceVolume` (0..1). The settings schema is `SETTINGS_VERSION = 3`.
- `soundEnabled` and `musicEnabled` stay as mute shortcuts (M/F). A muted bus keeps its slider value.
- Sliders are in the options panel; a change applies immediately and persists without a restart.

## Spatial effects

World sounds (`fx:shot`, `fx:bow`, `fx:sling`, `fx:artillery`, `fx:explosion`, `fx:hit`, `fx:death`,
`fx:wood`, `fx:mine`) carry the position of the shooter or the impact. Each frame the game hands the
mixer a listener frame: the camera target, its right axis and the audible range (`max(18, zoom × 0.9)`).

- **Distance:** gain follows `(1 − d/range)^1.5`; at or beyond the range the sound is silent.
- **Pan:** the projection of the sound on the camera's right axis, normalised by the range and clamped to
  ±1.
- **Voice cap:** 12 simultaneous voices; a saturated mixer drops new sounds instead of piling up. Combat
  sounds are throttled (shots 80 ms, hits 50 ms, harvest 600 ms).
- UI and music are never spatialised.

## Music

The score is generative and period-aware (pentatonic flute for the archaic Andes, martial and later
modes for the following eras). It mixes three layers under the music bus:

| Layer | Calm | Tension | Combat |
| --- | ---: | ---: | ---: |
| Drone (low pulse) | 1.00 | 0.80 | 0.55 |
| Melody (flute/pluck) | 0.85 | 0.45 | 0.25 |
| Percussion (tinya-like) | 0.00 | 0.30 | 0.85 |

- Intensity comes from presentation events: a combat hit keeps `combat` for 3 s; a warning alert or a
  recent hit keeps `tension` for up to 8 s; otherwise it returns to `calm`.
- Layers crossfade (≈1.2 s), they never cut. The percussion is silent in `calm` and adds an answering
  stroke in `combat`.
- The melody is generative, **not a reconstruction**: the instruments are documented, the tunes are not.

## Ambience

One looping filtered-noise bed per biome, mixed under the ambience bus:

| Kind | Source | Character |
| --- | --- | --- |
| `coast` | low-pass noise with a 0.14 Hz swell | Surf; Caral fades it with the camera's distance to the shore. |
| `andes` | low-pass noise with a slow 0.08 Hz gust | High-valley wind. |
| `altiplano` | band-pass noise, 0.05 Hz | Dry, high wind. |
| `jungle` | band-pass noise, 4.5 Hz modulation | Insects and canopy. |

Campaign sites map to their bed by id (Caral/Áspero/Lima/Callao/Miraflores/Real Felipe/Arica/Chimú/Moche →
coast; Vilcabamba → jungle; Tarapacá → altiplano; the rest → Andes). A match without an authored site uses
`settings.mapType`. The mapping is presentation data and can be refined per site.

## What is not in this phase

- **No recorded samples, voices or licensed music.** Adding them needs a provenance entry per file, a
  licence review and a size-budget decision: the shipped build is close to the 28 MB `dist` cap, so audio
  must be compressed and lazy-loaded per period. That is a separate, explicitly approved phase.
- No audio in replay mode beyond what the match itself triggers; the mixer is presentation-only and never
  affects the simulation, the state hash or `REPLAY_VERSION`.

## Verification

- `tests/audio-mix.test.ts` covers the pure mixer rules (clamp, attenuation, pan, ambience mapping, layer
  gains, intensity state).
- `tests/settings.test.ts` covers the volume defaults and the schema bump.
- The settings panel is captured for evidence; audio itself is documented with a short clip because a
  screenshot cannot prove sound.

## Code map

- `src/audio/mix.ts`: pure rules (volumes, attenuation, pan, ambience, intensity).
- `src/audio/AudioEngine.ts`: buses, synthesis, layers, ambience and the voice cap.
- `src/core/Game.ts`: listener frame, combat clock, biome selection, volume persistence.
- `src/core/RuntimeController.ts`: world positions on the `fx:*` events.
