# Modding

Mods are **data patches** over the game's definitions: a JSON file can retune units, buildings and
technologies, or restyle a civilization, **without editing the source**. A mod is loaded at boot, before the
match is created.

> Mods are **unofficial**. The game's golden rule — do not invent history — is not enforced by the validator;
> keep new names, dates and battles historically grounded (see [`../historia/`](../historia/)).

## Where mods live and how to load them

- Put a file at `public/mods/<id>.json` (served as-is; no rebuild needed).
- Activate it with the `?mod=` URL parameter (comma-separated for several, later wins): `?mod=example`.
- Persist a set by listing ids in the `activeMods` field of the `peru-settings` `localStorage` key.
- An **invalid or missing mod is skipped** with a console warning (`[mods] …`); it never stops the game from
  booting. The load result is exposed at `window.__mods` (`{ loaded, errors }`).

The base game is not a mod; a mod only **overrides by `id`** (units, buildings, civs) or **adds a new tech**
(`techs[].id` is free-form). Adding new units, buildings or civilizations is not supported yet.

## Schema (`schemaVersion: 1`)

```jsonc
{
  "schemaVersion": 1,
  "name": "My mod",           // required, non-empty
  "description": "…",          // optional
  "units":     [ /* … */ ],
  "buildings": [ /* … */ ],
  "techs":     [ /* … */ ],
  "civs":      [ /* … */ ]
}
```

### `units[]` — override an existing unit

| Field | Type | Notes |
|---|---|---|
| `id` | string | an existing `UnitKind` (e.g. `soldier`) |
| `name`, `description` | string | shown to the player (Spanish) |
| `category` | `econ` \| `infantry` \| `ranged` \| `cavalry` \| `siege` \| `special` \| `unique` | |
| `stats` | object | absolute base stats: `hp`, `attack`, `range`, `lightArmor`, `heavyArmor`, `speed`, `los`, `attackSpeed`, `area`, `trainTime`, `population`, `cost` (`{food,wood,silver,stone}`), `damageType` (`light`/`heavy`/`fortified`), `projectile` |
| `eraStats` | object | per-era multipliers over the base stats, keyed `"0"`–`"5"` (e.g. `{ "1": { "hp": 1.2 } }`) |

### `buildings[]` — override an existing building

Same shape as `units[]` with `stats` = `hp`, `armor`, `los`, `cost`, `buildTime`, `size`, `providesPop`,
`isDropsite`, `garrisons`, `attack`, and `category` ∈ `economy` \| `military` \| `defense` \| `advance` \| `special`.

### `techs[]` — override by `id`, or add a new tech

An existing id is merged. A **new** id must include `name`, `description`, `cost`, `time`, `minPeriod`,
`building` and `effect`. Optional: `maxPeriod`, `unlocksUnits`, `requirements`, `icon`. `effect` supports
`attackMult`, `armorMult`, `gatheringMult`, `capacityBonus`, `speedBonus`, `losBonus`, `priceDiscount`,
`rangeBonus`.

### `civs[]` — override an existing civilization

`id` (an existing `CivId`), plus optional `colors` (`{primary,secondary,accent}` hex strings), `bonuses`
(string[]), `effects`, and `visual` (`{arch, emblem}` from the sets in
[`../../docs/historia/arquitectura.md`](../historia/arquitectura.md)).

## Validation rules

- `schemaVersion` must be `1`; `name` must be a non-empty string.
- Numeric fields must be numbers `>= 0`; eras are `0`–`5`; historical periods are `0`–`9`.
- Ids must exist for `units`/`buildings`/`civs` overrides; a tech `building` must be a known `BuildingKind`.
- `damageType`, `projectile`, `category`, `visual.arch` and `visual.emblem` must be known values.

## Example

[`public/mods/example.json`](../../public/mods/example.json) buffs the soldier, adds a `example_drill`
technology and reasserts the Moche visual identity. Try it with `?mod=example`.

## Replays and determinism

Mods change balance, so the active ids are stored in `GameSettings.activeMods`, which the **replay already
records** (the replay embeds the settings). To reproduce a modded match, load the same mods; if one is
missing, the game warns but keeps going. Data mods are deterministic (they only change constants), so they do
not affect the seeded RNG.
