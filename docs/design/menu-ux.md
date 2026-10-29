# Epic onboarding and campaign flow

Player-facing UX for the title movie, main menu, skirmish setup and the La Senda del Sol
campaign. The visual language is Andean codex/epic: obsidian and gold, textile geometry,
large landscape, restrained motion. Age of Empires and 0 A.D. are used as **UX references
only**; no assets or text are copied.

## First launch

1. Title screen with **Entrar** (the click is also the WebAudio gesture).
2. Short saga movie (`SERIES_INTRO`): Caral, the long history and the four campaigns.
   It is skippable with **Saltar** or `Esc`.
3. Main menu. The movie is remembered in `peru-title-intro` and can be replayed from
   **Ver introducción**.

Returning players go straight to the main menu. `?menu=1`, `?play=1`, `?mission=...` and the
other debug entry points bypass the title movie.

## Main menu

Full-screen `media/menu/caral-dawn.webp` backdrop with a slow Ken Burns effect, dark left
gradient and a vertical action column:

- Continuar partida (when a save exists)
- Campañas
- Escaramuza
- Códice
- Cómo jugar
- Opciones

The skirmish configuration form lives in its own screen. The side card shows the available
campaign progress and links to the campaign map.

## Campaign map

`Culturas Preincas`, `El Tahuantinsuyo`, `El Virreinato` and `Independencia y República` are
the four chapters. The first chapter is fully playable (Caral, Chavín, Moche/Recuay, Wari);
the other campaigns are shown as **En preparación**, with no invented release dates. Authored
mission ids for those chapters stay in the data but are hidden from player-facing menus,
Codex and progress.

Progress lives in `peru-campaign` as a versioned JSON object. The old numeric value is
migrated to the released mission order (legacy `2` becomes Caral + Chavín); old draft missions are not deleted from the code, but they do
not carry into release progress.

## Mission flow

Campaign prologue → campaign map → mission briefing → chapter title card → existing camera
flyover → gameplay. The victory screen is an epilogue page; the preinca chain continues
from Caral through Chavín and Moche/Recuay to Wari, which closes the chapter.

## Asset provenance

`public/media/menu/caral-dawn.webp` is a UI-only grade of a runtime capture of the Caral
scene in `m1_caral`; the title and prologues use that engine capture with a slow pan. It is
an atmospheric menu backdrop, **not** a historical photograph and **not** a campaign-art
claim. It is a runtime capture, not a Blender render, so the manifest review gate does not apply;
see `public/media/menu/PROVENANCE.md`.

## Accessibility

- Skip button and `Esc` for every cinematic; `Enter`/`Space` advances.
- `prefers-reduced-motion` removes the Ken Burns/menu transitions.
- Keyboard focus starts on **Entrar**; menu controls are real buttons.
- The background is a static WebP, so the menu does not add a second 3D render.
