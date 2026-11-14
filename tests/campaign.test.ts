import { describe, it, expect } from 'vitest';
import { MISSIONS } from '../src/campaign/defs/campaign';
import { EDUCATIONAL, PROLOGUE, getEducational } from '../src/campaign/defs/educational';
import { tutorialForMission } from '../src/campaign/defs/tutorials';
import { getPeriod } from '../src/model/defs/periods';
import { getCiv } from '../src/model/defs/civs';
import { BuildingKind, CivId, HistoricalPeriod, UnitKind } from '../src/core/types';
import { BUILDING_DEFS } from '../src/model/defs/buildings';
import { COLONIAL_COMPOSITION_SCALE } from '../src/model/defs/colonialSite';
import { UNIT_ARCHETYPES, unitTrainableInPeriod } from '../src/model/defs/units';
import { getTech, techAvailable } from '../src/model/defs/techs';

describe('campaign educational content', () => {
  it('the prologue is not empty', () => {
    expect(PROLOGUE.length).toBeGreaterThan(40);
  });

  it('mission ids are unique', () => {
    const ids = MISSIONS.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every mission has educational content with cited sources', () => {
    for (const mis of MISSIONS) {
      const edu = getEducational(mis.id);
      expect(edu, `missing educational content for ${mis.id}`).toBeDefined();
      expect(edu!.context.length).toBeGreaterThan(20);
      expect(edu!.didYouKnow.length).toBeGreaterThan(10);
      expect(edu!.sources.length).toBeGreaterThan(0);
      for (const f of edu!.sources) expect(f.text.length).toBeGreaterThan(3);
    }
  });

  it('gives every campaign mission a closing epilogue', () => {
    for (const mis of MISSIONS) {
      const edu = getEducational(mis.id);
      expect(edu?.epilogue, `${mis.id} has no epilogue`).toBeTruthy();
      expect(edu!.epilogue!.length, `${mis.id} epilogue is too short`).toBeGreaterThan(80);
    }
  });

  it('there are no orphan educational entries', () => {
    for (const id of Object.keys(EDUCATIONAL)) {
      expect(
        MISSIONS.some((m) => m.id === id),
        `entry without a mission: ${id}`,
      ).toBe(true);
    }
  });

  it('every mission references a valid period and civilizations', () => {
    for (const mis of MISSIONS) {
      expect(getPeriod(mis.period), `invalid period in ${mis.id}`).toBeDefined();
      expect(getCiv(mis.playerCiv).id).toBe(mis.playerCiv);
      expect(getCiv(mis.enemyCiv).id).toBe(mis.enemyCiv);
    }
  });

  it('the first mission brings the guided tutorial', () => {
    expect(MISSIONS[0].tutorial).toBe(true);
  });

  it('the Caral model mission plays four acts, from Áspero to the sealing of the city', () => {
    const caral = MISSIONS.find((m) => m.id === 'm1_caral')!;
    const kinds = caral.objectives.map((o) => o.kind);
    expect(kinds).not.toContain('destroy');
    expect(kinds).not.toContain('survive');
    expect(caral.objectives.some((o) => o.buildingKind === BuildingKind.MARKET)).toBe(false);
    expect(caral.startingResources.silver).toBe(0);
    expect(caral.narrator).toBeTruthy();
    expect(caral.layout?.site?.phase).toBe('foundation');

    // Only the first goal is visible; every act unlocks the next one.
    const required = caral.objectives.filter((o) => !o.optional);
    expect(required[0]!.id).toBe('a1_pesca');
    expect(required[0]!.hidden).toBeFalsy();
    for (const o of required.slice(1)) expect(o.hidden, o.id).toBe(true);
    const activated = new Set(
      caral.triggers.flatMap((t) =>
        t.effects.flatMap((fx) => (fx.type === 'objective' && fx.state === 'activate' ? [fx.objectiveId] : [])),
      ),
    );
    // `requires` goals are started by the player from a field card (the communal assembly).
    for (const o of caral.objectives.filter((objective) => objective.hidden && !objective.requires)) {
      expect(activated.has(o.id), `${o.id} is never activated`).toBe(true);
    }

    // Acts II-IV open with a chapter card; act III builds the Pyramid Mayor through its phases.
    const acts = caral.triggers.flatMap((t) => t.effects.filter((fx) => fx.type === 'act'));
    expect(acts.map((fx) => (fx.type === 'act' ? fx.kicker.split(' ·')[0] : ''))).toEqual([
      'Acto II',
      'Acto III',
      'Acto IV',
    ]);
    const phases = caral.triggers.flatMap((t) =>
      t.effects.flatMap((fx) => (fx.type === 'site_phase' ? [fx.phase] : [])),
    );
    expect(phases).toEqual(['fill', 'finished', 'in_use', 'sealed']);
    const deliveries = caral.objectives.filter((o) => o.kind === 'deliver');
    for (const o of deliveries) expect(o.heritageId, o.id).toBe('caral_pyramid_mayor');

    const edu = getEducational('m1_caral')!;
    expect(edu.briefing?.length).toBeGreaterThan(20);
    expect(edu.epilogue).toContain('Vichama');
    expect(edu.didYouKnow).toContain('posible quipu');
  });

  it('mission atmosphere overrides stay within the supported range', () => {
    for (const mis of MISSIONS) {
      const a = mis.atmosphere;
      if (!a) continue;
      if (a.fogDensity !== undefined) {
        expect(a.fogDensity, `${mis.id} fogDensity`).toBeGreaterThanOrEqual(0);
        expect(a.fogDensity, `${mis.id} fogDensity`).toBeLessThanOrEqual(0.005);
      }
      if (a.skyTint !== undefined) expect(a.skyTint, `${mis.id} skyTint`).toMatch(/^#[0-9a-f]{6}$/i);
      if (a.sunWarmth !== undefined) expect(a.sunWarmth, `${mis.id} sunWarmth`).toBeGreaterThan(0);
    }
  });

  it('the coetaneous missions are construction scenarios (no documented war)', () => {
    const peaceful = ['m1_caral', 'm2_chavin', 'm4_wari'];
    for (const id of peaceful) {
      const mis = MISSIONS.find((m) => m.id === id)!;
      expect(mis.enemy.active, `${id} has an active enemy`).toBe(false);
      // no marked rival base (the enemy was removed, not merely disabled)
      expect(mis.mark ?? [], `${id} still marks a rival`).toEqual([]);
      // no starting combat units
      for (const u of mis.start.units ?? []) expect(u.kind, `${id} starts with a combat unit`).toBe(UnitKind.WORKER);
      // no pre-spawned building that a `build` objective would auto-satisfy
      const preBuilt = (mis.start.buildings ?? []).map((b) => b.kind);
      for (const o of mis.objectives) {
        if (o.kind === 'build' && o.buildingKind) expect(preBuilt, `${id}/${o.id}`).not.toContain(o.buildingKind);
      }
      // no scripted combat waves/reinforcements
      for (const t of mis.triggers) {
        for (const fx of t.effects) expect(['wave', 'reinforce'], `${id}/${t.id}`).not.toContain(fx.type);
      }
      // non-combat objectives only, and it teaches building
      const nonCombat =
        id === 'm1_caral'
          ? ['gather', 'build', 'reach', 'hold', 'inspect', 'canal_open', 'deliver', 'research', 'wait']
          : ['gather', 'build', 'survive', 'hold', 'deliver', 'network', 'reach', 'inspect', 'research'];
      for (const o of mis.objectives) expect(nonCombat, `${id}/${o.id}`).toContain(o.kind);
      expect(
        mis.objectives.some((o) => o.kind === 'build'),
        `${id} teaches building`,
      ).toBe(true);
    }
  });

  it('uses varied mechanics, not only defend/survive/destroy', () => {
    const kinds = new Set<string>();
    for (const mis of MISSIONS) for (const o of mis.objectives) kinds.add(o.kind);
    // the campaign introduces exploration (reach) and settlement (build)
    expect(kinds.has('reach')).toBe(true);
    expect(kinds.has('build')).toBe(true);
    expect(kinds.size).toBeGreaterThanOrEqual(7);
  });

  it('a mission roster restriction only lists valid units and keeps workers', () => {
    const kinds = new Set<string>(Object.values(UnitKind));
    for (const mis of MISSIONS) {
      if (!mis.allowedUnits) continue;
      for (const u of mis.allowedUnits) expect(kinds.has(u), `${mis.id} allows unknown unit ${u}`).toBe(true);
      expect(mis.allowedUnits.includes(UnitKind.WORKER), `${mis.id} restriction excludes workers`).toBe(true);
    }
    // the naval mission has no siege train
    const naval = MISSIONS.find((m) => m.id === 'm9_guerra_pacifico')!;
    expect(naval.allowedUnits).toBeDefined();
    expect(naval.allowedUnits!.includes(UnitKind.ARTILLERY)).toBe(false);
  });

  it('fields post-1532 unique units in the independence and republic campaigns', () => {
    const m7 = MISSIONS.find((m) => m.id === 'm7_tupac_amaru')!;
    const m8 = MISSIONS.find((m) => m.id === 'm8_independencia')!;
    const m9 = MISSIONS.find((m) => m.id === 'm9_guerra_pacifico')!;
    const waveKinds = (mission: (typeof MISSIONS)[number]): UnitKind[] =>
      mission.triggers.flatMap((t) => t.effects).flatMap((e) => (e.type === 'wave' ? e.units.map((u) => u.kind) : []));
    expect(m8.start.units?.some((u) => u.kind === UnitKind.PATRIOTA_MONTONERA)).toBe(true);
    expect(m9.start.units?.some((u) => u.kind === UnitKind.REPUBLICA_DEFENSOR)).toBe(true);
    expect(m9.allowedUnits?.includes(UnitKind.REPUBLICA_DEFENSOR)).toBe(true);
    expect(waveKinds(m7)).toContain(UnitKind.REALISTA_DRAGON);
    expect(waveKinds(m8)).toContain(UnitKind.REALISTA_DRAGON);
    expect(waveKinds(m9)).toContain(UnitKind.CHILE_INFANTE);
  });

  it('keeps documented unique units available and named in chapter I-II campaign missions', () => {
    const cases: Array<[string, UnitKind, UnitKind?]> = [
      ['m3_moche_recuay', UnitKind.MOCHE_WARRIOR, UnitKind.RECUAY_WARRIOR],
      ['m4_wari', UnitKind.WARI_GUARDIAN],
      ['m5_yahuar_pampa', UnitKind.INCA_WARRIOR, UnitKind.CHANCA_WARRIOR],
      ['m6_chimu_inca', UnitKind.INCA_WARRIOR, UnitKind.CHIMU_FIXI],
      ['m6b_guerra_civil', UnitKind.INCA_WARRIOR, UnitKind.INCA_WARRIOR],
    ];
    for (const [id, playerUnit, enemyUnit] of cases) {
      const mis = MISSIONS.find((m) => m.id === id)!;
      const edu = getEducational(id);
      expect(mis.allowedUnits, `${id} adds a mission restriction`).toBeUndefined();
      expect(unitTrainableInPeriod(playerUnit, mis.period, mis.playerCiv), `${id} player unique`).toBe(true);
      expect(BUILDING_DEFS[BuildingKind.BARRACKS].trainable, `${id} barracks roster`).toContain(playerUnit);
      expect(edu, `${id} briefing`).toBeDefined();
      expect(edu!.briefing, `${id} briefing names its player unique`).toContain(UNIT_ARCHETYPES[playerUnit].name);
      if (enemyUnit) {
        expect(unitTrainableInPeriod(enemyUnit, mis.period, mis.enemyCiv), `${id} enemy unique`).toBe(true);
        expect(BUILDING_DEFS[BuildingKind.BARRACKS].trainable, `${id} enemy barracks roster`).toContain(enemyUnit);
        expect(edu!.briefing, `${id} briefing names its enemy unique`).toContain(UNIT_ARCHETYPES[enemyUnit].name);
      } else {
        expect(mis.enemy.active, `${id} has no enemy unique but an active enemy`).toBe(false);
      }
    }
  });

  it('m9 follows the documented fall of Arica', () => {
    const m9 = MISSIONS.find((m) => m.id === 'm9_guerra_pacifico')!;
    expect(m9.start.buildings?.some((b) => b.kind === BuildingKind.FORTRESS)).toBe(true);
    // The player base (the cuartel) is the auto-built settlement centre; a second `center` here would
    // stack on top of it. Only the fort is authored.
    expect(m9.start.buildings?.some((b) => b.kind === BuildingKind.CENTER)).toBe(false);
    expect(m9.periodNote).toBeDefined();
    // Model mission: 256 m, a three-beat in-engine intro and its own epilogue capture.
    expect(m9.modelMission).toBe(true);
    expect(m9.map.size).toBe(256);
    expect(m9.unitSpeedScale).toBe(0.75);
    expect(m9.intro?.length).toBe(3);
    expect(m9.intro?.every((beat) => beat.image.startsWith('media/arica/'))).toBe(true);
    expect(m9.epilogueImage).toContain('media/arica/');
    // The defence is played, but its outcome is not rewritten: the final line ends the mission and the
    // epilogue tells the fall. No victory objective keeps Bolognesi alive for the whole mission and none
    // asks to destroy the Chilean command.
    expect(m9.objectives.some((o) => o.kind === 'destroy')).toBe(false);
    const bolognesi = m9.objectives.find((o) => o.kind === 'protect' && o.entityTag === 'bolognesi')!;
    expect(bolognesi.hidden).toBe(true);
    expect(
      m9.triggers.some((t) =>
        t.effects.some((fx) => fx.type === 'objective' && fx.objectiveId === bolognesi.id && fx.state === 'complete'),
      ),
      'Bolognesi is credited at the act transition, not at the fall',
    ).toBe(true);
    // Acts: the summons beat, the sappers' work turn, the bombardment and the final line.
    expect(m9.objectives.some((o) => o.id === 'a1_parlamento' && o.kind === 'wait')).toBe(true);
    const minas = m9.objectives.find((o) => o.id === 'a1_minas')!;
    expect(minas.kind).toBe('hold');
    expect(minas.unitKind).toBe(UnitKind.WORKER);
    expect(minas.consume?.resource, 'the sappers work a costed turn').toBe('food');
    expect(m9.objectives.some((o) => o.id === 'a2_bombardeo' && o.kind === 'hold')).toBe(true);
    expect(m9.objectives.some((o) => o.id === 'a3_asalto' && o.kind === 'hold')).toBe(true);
    expect(m9.triggers.some((t) => t.effects.some((fx) => fx.type === 'act'))).toBe(true);
    expect(m9.victory).toContain('historia');
    expect(m9.victory).not.toMatch(/Arica resiste/i);
    const edu = getEducational(m9.id)!;
    expect(edu.epilogue).toContain('cayó');
    expect(edu.context).toContain('Salvo');
  });

  it('scales the opening economy: a scarcity mission forces expansion', () => {
    const wari = MISSIONS.find((m) => m.id === 'm4_wari')!;
    // a lean start, well below the campaign's richer openers
    expect(wari.startingResources.food).toBeLessThan(500);
    // gathering is a stated goal, not merely implied by the low start
    expect(wari.objectives.some((o) => o.kind === 'gather')).toBe(true);
    // an expansion objective: a provincial center founded at the frontier
    const expand = wari.objectives.find((o) => o.id === 'obj_red')!;
    expect(expand.nodes?.length, 'network has no nodes').toBe(2);
    expect(expand.radius ?? 0).toBeGreaterThan(0);
  });

  it('m7 plays the documented rebellion, not a counterfactual', () => {
    const amaru = MISSIONS.find((m) => m.id === 'm7_tupac_amaru')!;
    // The city is not taken: no victory objective destroys the Cusco centre or survives a clock.
    expect(
      amaru.objectives.some((o) => o.kind === 'destroy'),
      'm7 wins by taking Cusco',
    ).toBe(false);
    expect(
      amaru.objectives.some((o) => o.kind === 'survive'),
      'm7 wins by holding a timer',
    ).toBe(false);
    expect(
      amaru.objectives.some((o) => o.group),
      'm7 still branches on a counterfactual',
    ).toBe(false);
    // Túpac is not a victory-gating protect; his death is an explicit scripted defeat.
    expect(amaru.objectives.some((o) => o.kind === 'protect' && o.entityTag === 'tupac_amaru')).toBe(false);
    expect(
      amaru.triggers.some(
        (t) =>
          t.condition.type === 'entity_dead' &&
          t.condition.entityTag === 'tupac_amaru' &&
          t.effects.some((fx) => fx.type === 'defeat'),
      ),
      'Túpac dying must end the mission',
    ).toBe(true);
    // Acts: muster and supply, Tungasuca, Sangarará, the failed siege and the retreat.
    expect(amaru.objectives.some((o) => o.id === 'a1_cuartel' && o.kind === 'build')).toBe(true);
    expect(amaru.objectives.some((o) => o.id === 'a1_avituallamiento' && o.kind === 'hold')).toBe(true);
    expect(amaru.objectives.some((o) => o.id === 'a1_tungasuca' && o.kind === 'reach')).toBe(true);
    expect(amaru.objectives.some((o) => o.id === 'a2_batalla' && o.kind === 'hold')).toBe(true);
    expect(amaru.objectives.some((o) => o.id === 'a3_sostener' && o.kind === 'hold')).toBe(true);
    const retreat = amaru.objectives.find((o) => o.id === 'a3_retirada')!;
    expect(retreat.kind).toBe('reach');
    expect(retreat.entityTag).toBe('tupac_amaru');
    expect(amaru.layout?.departure).toBeDefined();
    expect(amaru.periodNote).toBeDefined();
    // Model mission: 256 m, a three-beat in-engine intro and its own epilogue capture.
    expect(amaru.modelMission).toBe(true);
    expect(amaru.map.size).toBe(256);
    expect(amaru.unitSpeedScale).toBe(0.75);
    expect(amaru.intro?.length).toBe(3);
    expect(amaru.intro?.every((beat) => beat.image.startsWith('media/cusco/'))).toBe(true);
    expect(new Set(amaru.intro?.map((beat) => beat.image)).size, 'three distinct intro captures').toBe(3);
    expect(amaru.epilogueImage).toContain('media/cusco/');
    // The 4/3 composition scale reaches the mission anchors and hold radii, not only the heightfield.
    const scale = COLONIAL_COMPOSITION_SCALE;
    const tungsten = amaru.objectives.find((o) => o.id === 'a1_tungasuca')!.pos!;
    expect(tungsten.dx).toBeCloseTo(50 * scale);
    expect(tungsten.dz).toBeCloseTo(138 * scale);
    const sangarara = amaru.objectives.find((o) => o.id === 'a2_batalla')!.pos!;
    expect(sangarara.dx).toBeCloseTo(105 * scale);
    expect(sangarara.dz).toBeCloseTo(80 * scale);
    expect(amaru.objectives.find((o) => o.id === 'a1_avituallamiento')!.radius).toBeCloseTo(18 * scale);
    expect(amaru.objectives.find((o) => o.id === 'a2_batalla')!.radius).toBeCloseTo(18 * scale);
    expect(amaru.objectives.find((o) => o.id === 'a3_sostener')!.radius).toBeCloseTo(24 * scale);
    // Every chapter card carries its own image.
    for (const trigger of amaru.triggers) {
      for (const effect of trigger.effects) {
        if (effect.type === 'act') expect(effect.image, `${trigger.id} chapter card`).toBeTruthy();
      }
    }
    // 1780 rebels had no artillery train: the old roster's two cannon are gone.
    expect(amaru.allowedUnits).not.toContain(UnitKind.ARTILLERY);
    expect(amaru.victory).toMatch(/no toma la ciudad|retira/i);
    expect(amaru.victory).not.toMatch(/centro realista cae/i);
    const edu = getEducational(amaru.id)!;
    expect(edu.epilogue).toContain('Sangarará');
    expect(edu.context).toContain('Langui');
  });

  it('every objective group is a real choice (at least two members)', () => {
    const counts = new Map<string, number>();
    for (const mis of MISSIONS) {
      for (const o of mis.objectives) if (o.group) counts.set(o.group, (counts.get(o.group) ?? 0) + 1);
    }
    for (const [g, n] of counts) expect(n, `group ${g} has only ${n} objective(s)`).toBeGreaterThanOrEqual(2);
  });

  it('bonus objectives are optional and never the only goal', () => {
    const withBonus = MISSIONS.filter((m) => m.objectives.some((o) => o.optional));
    expect(withBonus.length, 'no mission has a bonus objective').toBeGreaterThanOrEqual(1);
    for (const mis of MISSIONS) {
      const bonus = mis.objectives.filter((o) => o.optional);
      for (const o of bonus) expect(o.group, `${mis.id}/${o.id} bonus is in a strategic group`).toBeUndefined();
      if (bonus.length) {
        expect(
          mis.objectives.some((o) => !o.optional),
          `${mis.id} has only optional objectives`,
        ).toBe(true);
      }
    }
    // the documented bonus goals are present
    expect(MISSIONS.find((m) => m.id === 'm2_chavin')!.objectives.some((o) => o.id === 'bonus_ofrenda_mayor')).toBe(
      true,
    );
    expect(MISSIONS.find((m) => m.id === 'm3_moche_recuay')!.objectives.some((o) => o.id === 'bonus_intercambio')).toBe(
      true,
    );
    expect(MISSIONS.find((m) => m.id === 'm4_wari')!.objectives.some((o) => o.id === 'bonus_red')).toBe(true);
  });

  it('m9 is the Arica land defense, not a naval promise', () => {
    const m9 = MISSIONS.find((m) => m.id === 'm9_guerra_pacifico')!;
    expect(m9.title).toContain('Arica');
    expect(m9.objectives.some((o) => o.entityTag === 'bolognesi')).toBe(true);
    expect(m9.start.units?.some((u) => u.tag === 'bolognesi')).toBe(true);
    expect(m9.objectives.map((o) => o.title).join(' ')).not.toMatch(/monitor|Huáscar|escuadra/i);
    expect(m9.defeat).toContain('Arica');
  });

  it('m2 has a pilgrimage hold, offerings and an oracle reward', () => {
    const m2 = MISSIONS.find((m) => m.id === 'm2_chavin')!;
    expect(m2.objectives.some((o) => o.id === 'a2_peregrinaje' && o.kind === 'hold')).toBe(true);
    expect(m2.objectives.some((o) => o.id === 'a1_ofrenda' && o.kind === 'deliver' && o.resource === 'silver')).toBe(
      true,
    );
    expect(m2.objectives.find((o) => o.id === 'a2_peregrinaje')?.hidden).toBe(true);
    expect(m2.objectives.find((o) => o.id === 'a2_feria')?.hidden).toBe(true);
    expect(m2.triggers.some((t) => t.id === 't_a1_ofrenda')).toBe(true);
    expect(m2.triggers.some((t) => t.id === 't_a2_peregrinaje')).toBe(true);
    expect(m2.layout?.site?.phase).toBe('old_temple_foundation');
    expect(m2.allowedBuildings).toContain(BuildingKind.MARKET);
    expect(m2.allowedUnits).toContain(UnitKind.WORKER);
    expect(m2.allowedTechs).toContain('chavin_pilgrimage');
    for (const id of m2.allowedTechs ?? []) {
      const tech = getTech(id);
      expect(tech, id).toBeDefined();
      expect(techAvailable(tech!, HistoricalPeriod.EARLY_HORIZON, CivId.CHAVIN), id).toBe(true);
    }
  });

  it('chapter IV has briefings and guided tutorials', () => {
    for (const [id, steps] of [
      ['m8_independencia', 4],
      ['m9_guerra_pacifico', 5],
    ] as const) {
      const mis = MISSIONS.find((m) => m.id === id)!;
      expect(mis.tutorial, `${id} tutorial flag`).toBe(true);
      expect(getEducational(id)?.briefing?.length, `${id} briefing`).toBeGreaterThan(40);
      expect(tutorialForMission(id)?.steps.length, `${id} tutorial steps`).toBe(steps);
    }
  });

  it('chapter III has a briefing and a six-step guided tutorial', () => {
    const mis = MISSIONS.find((m) => m.id === 'm7_tupac_amaru')!;
    expect(mis.tutorial).toBe(true);
    expect(getEducational(mis.id)?.briefing?.length).toBeGreaterThan(40);
    expect(tutorialForMission(mis.id)?.steps.length).toBe(6);
  });

  it('m3 briefing does not spoil its hidden huaca or exchange goals', () => {
    const m3 = MISSIONS.find((m) => m.id === 'm3_moche_recuay')!;
    const edu = getEducational('m3_moche_recuay')!;
    const briefing = `${edu.briefing ?? ''} ${edu.didYouKnow}`;
    for (const objective of m3.objectives.filter((o) => o.hidden)) {
      expect(briefing).not.toContain(objective.title);
    }
    expect(briefing).not.toMatch(/huacas|intercambio/i);
  });

  it('chapter II has briefings and guided tutorials', () => {
    for (const id of ['m5_yahuar_pampa', 'm6_chimu_inca', 'm6b_guerra_civil']) {
      const mis = MISSIONS.find((m) => m.id === id)!;
      expect(mis.tutorial, `${id} tutorial flag`).toBe(true);
      expect(getEducational(id)?.briefing?.length, `${id} briefing`).toBeGreaterThan(40);
      expect(tutorialForMission(id)?.steps.length, `${id} tutorial steps`).toBeGreaterThanOrEqual(3);
    }
  });

  it('m3 is a model mission with three acts and in-engine images', () => {
    const m3 = MISSIONS.find((m) => m.id === 'm3_moche_recuay')!;
    expect(m3.modelMission).toBe(true);
    expect(m3.narrator).toBe('Voz del valle');
    expect(m3.map.size).toBe(256);
    expect(m3.unitSpeedScale).toBe(0.75);
    expect(m3.intro?.length).toBe(3);
    expect(new Set(m3.intro?.map((beat) => beat.image)).size, 'three distinct intro captures').toBe(3);
    expect(m3.intro?.every((beat) => beat.image.startsWith('media/moche/'))).toBe(true);
    expect(m3.epilogueImage).toContain('media/moche/');
    for (const trigger of m3.triggers) {
      for (const effect of trigger.effects) {
        if (effect.type === 'act') expect(effect.image, `${trigger.id} act card`).toBeTruthy();
      }
    }
    const actTitles = m3.triggers.flatMap((t) => t.effects.flatMap((e) => (e.type === 'act' ? [e.title] : [])));
    expect(actTitles).toHaveLength(3);
    expect(actTitles[2]).toContain('intercambio');
  });

  it('m3 opens the canal, holds the huacas and sustains elite exchange', () => {
    const m3 = MISSIONS.find((m) => m.id === 'm3_moche_recuay')!;
    expect(m3.tutorial).toBe(true);
    expect(m3.layout?.site?.id).toBe('moche_site');
    expect(m3.layout?.canal?.heritageId).toBe('moche_canal');
    expect(m3.objectives.some((o) => o.id === 'obj_canal' && o.kind === 'canal_open')).toBe(true);
    expect(m3.objectives.some((o) => o.id === 'obj_huacas' && o.kind === 'hold')).toBe(true);
    expect(m3.objectives.some((o) => o.id === 'obj_intercambio' && o.kind === 'deliver')).toBe(true);
    expect(m3.objectives.find((o) => o.id === 'bonus_intercambio')?.optional).toBe(true);
    expect(m3.objectives.some((o) => o.id === 'obj_huacas' && o.hidden)).toBe(true);
    expect(m3.triggers.some((t) => t.id === 't_canal')).toBe(true);
    expect(m3.triggers.some((t) => t.id === 't_huacas')).toBe(true);
  });

  it('m6 closes the Chan Chan gate and m6b captures Huáscar on the pampa', () => {
    const m6 = MISSIONS.find((m) => m.id === 'm6_chimu_inca')!;
    expect(m6.layout?.canal?.heritageId).toBe('chimu_canal');
    expect(m6.layout?.canal?.initiallyOpen).toBe(true);
    expect(m6.layout?.canal?.lockedUntilObjective).toBe('obj_canal');
    const gate = m6.objectives.find((o) => o.id === 'obj_canal')!;
    expect(gate.kind).toBe('canal_closed');
    expect(gate.entityTag).toBeUndefined();
    expect(gate.pos).toEqual({ ref: 'canal', dx: 0, dz: 0 });
    expect(gate.radius).toBe(16);

    const m6b = MISSIONS.find((m) => m.id === 'm6b_guerra_civil')!;
    const battle = m6b.objectives.find((o) => o.id === 'obj_quipaipan')!;
    expect(battle.kind).toBe('hold');
    expect(battle.pos).toEqual({ ref: 'site', dx: 0, dz: 0 });
    expect(battle.radius).toBe(18);
    expect(battle.time).toBe(90);
    expect(battle.minUnits).toBe(6);
    expect(battle.unitKind).toBe(UnitKind.SOLDIER);
    expect(battle.entityTag).toBeUndefined();
    // The Cusco centre is not the victory: Quipaipan ends with Huáscar's capture.
    expect(m6b.mark).toBeUndefined();
    expect(m6b.objectives.some((o) => o.kind === 'destroy' && o.entityTag === 'huascar')).toBe(false);
  });

  it('m4 is a model mission with three acts and in-engine images', () => {
    const m4 = MISSIONS.find((m) => m.id === 'm4_wari')!;
    expect(m4.modelMission).toBe(true);
    expect(m4.narrator).toBe('Voz de los Andes');
    expect(m4.map.size).toBe(256);
    expect(m4.unitSpeedScale).toBe(0.75);
    expect(m4.intro?.length).toBe(3);
    expect(new Set(m4.intro?.map((beat) => beat.image)).size, 'three distinct intro captures').toBe(3);
    expect(m4.intro?.every((beat) => beat.image.startsWith('media/wari/'))).toBe(true);
    expect(m4.epilogueImage).toContain('media/wari/');
    const actTitles = m4.triggers.flatMap((t) => t.effects.flatMap((e) => (e.type === 'act' ? [e.title] : [])));
    expect(actTitles).toHaveLength(3);
    expect(actTitles[2]).toContain('Dos esferas');
  });

  it('m4 has a two-node network, a contested frontier and andenes', () => {
    const m4 = MISSIONS.find((m) => m.id === 'm4_wari')!;
    const network = m4.objectives.find((o) => o.id === 'obj_red')!;
    expect(network.kind).toBe('network');
    expect(network.nodes?.length).toBe(2);
    expect(m4.objectives.some((o) => o.id === 'obj_frontera' && o.kind === 'hold')).toBe(true);
    expect(m4.objectives.some((o) => o.id === 'obj_andenes' && o.buildingKind === BuildingKind.FARM)).toBe(true);
  });

  it('m8 has Junín and Ayacucho as two hold phases', () => {
    const m8 = MISSIONS.find((m) => m.id === 'm8_independencia')!;
    const junin = m8.objectives.find((o) => o.id === 'obj_junin');
    const ayacucho = m8.objectives.find((o) => o.id === 'obj_ayacucho');
    expect(junin?.kind).toBe('hold');
    expect(junin?.unitKind).toBe(UnitKind.CAVALRY);
    expect(ayacucho?.kind).toBe('hold');
    expect(ayacucho?.hidden).toBe(true);
    expect(m8.start.units?.some((u) => u.tag === 'sucre')).toBe(true);
    expect(m8.objectives.some((o) => o.entityTag === 'sucre')).toBe(true);
  });

  it('hold objectives declare a position, radius and positive time', () => {
    for (const mis of MISSIONS) {
      for (const o of mis.objectives) {
        if (o.kind !== 'hold') continue;
        expect(o.pos, `${mis.id}/${o.id} hold without pos`).toBeDefined();
        expect(o.radius, `${mis.id}/${o.id} hold without radius`).toBeGreaterThan(0);
        expect(o.time, `${mis.id}/${o.id} hold without time`).toBeGreaterThan(0);
      }
    }
  });

  it('every objective and trigger entityTag is declared by a start/mark tag', () => {
    for (const mis of MISSIONS) {
      const declared = new Set<string>();
      for (const u of mis.start.units ?? []) if (u.tag) declared.add(u.tag);
      for (const b of mis.start.buildings ?? []) if (b.tag) declared.add(b.tag);
      for (const m of mis.mark ?? []) declared.add(m.tag);
      for (const o of mis.objectives) {
        if (o.entityTag) {
          expect(declared.has(o.entityTag), `${mis.id} objective ${o.id} references unknown tag ${o.entityTag}`).toBe(
            true,
          );
        }
      }
      for (const t of mis.triggers) {
        const c = t.condition;
        if ((c.type === 'entity_dead' || c.type === 'unit_near') && c.entityTag) {
          expect(declared.has(c.entityTag), `${mis.id} trigger ${t.id} references unknown tag ${c.entityTag}`).toBe(
            true,
          );
        }
      }
    }
  });
});
