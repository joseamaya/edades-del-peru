import { Era, CivId, HistoricalPeriod, UnitKind, BuildingKind } from '../../core/types';
import { MissionDef } from '../types';

export const CAMPAIGN_TITLE = 'La Senda del Sol';
export const CAMPAIGN_SUBTITLE = 'Nueve escenarios de la historia del Perú, de Caral a la República';

export const MISSIONS: MissionDef[] = [
  {
    id: 'm1_caral',
    title: 'La Ciudad Sagrada',
    subtitle: 'Arcaico Tardío · c. 3000 a.C.',
    history:
      'En el valle de Supe, entre el océano y los Andes, nace la primera ciudad de América. Caral se levanta con canales, plazas y pirámides.\n' +
      'Sostened el asentamiento, comerciad con el litoral de Áspero y defended el valle de los grupos rivales.',
    victory:
      'Caral prospera durante siglos como centro de la civilización andina. Su legado guiará a las culturas del Perú durante milenios.',
    defeat: 'El valle queda en silencio. La primera ciudad de América no llega a consolidarse.',
    period: HistoricalPeriod.ARCHAIC,
    tutorial: true,
    playerCiv: CivId.CARAL,
    enemyCiv: CivId.CARAL,
    map: { seed: 3000, type: 'coast', size: 128 },
    timeOfDay: 'morning',
    startingEra: Era.FORMATIVE,
    startingResources: { food: 200, wood: 400, silver: 150, stone: 80 },
    start: {
      units: [{ kind: UnitKind.SOLDIER, dx: -6, dz: 6, tag: 'autoridad', count: 1 }],
    },
    enemy: { active: true, difficulty: 'easy', aggression: 0.4 },
    objectives: [
      { id: 'obj_food', kind: 'gather', resource: 'food', count: 300, title: 'Reúne 300 de comida' },
      { id: 'obj_survive', kind: 'survive', time: 360, title: 'Sostén el asentamiento 6 minutos' },
      {
        id: 'obj_autoridad',
        kind: 'protect',
        entityTag: 'autoridad',
        title: 'Mantén con vida a la autoridad de Caral',
      },
    ],
    triggers: [
      {
        id: 't_dial_1',
        condition: { type: 'time', seconds: 40 },
        effects: [
          { type: 'dialogue', text: 'Autoridad: —El río Supe nos da vida. ¡Alzad los templos y tended los canales!' },
        ],
      },
      {
        id: 't_wave_1',
        condition: { type: 'time', seconds: 140 },
        effects: [
          {
            type: 'wave',
            owner: 1,
            units: [{ kind: UnitKind.SOLDIER, count: 3 }],
            pos: { ref: 'player', dx: 22, dz: 22 },
            radius: 4,
          },
          { type: 'dialogue', text: '¡Grupos rivales al noreste! ¡A las armas!' },
        ],
      },
      {
        id: 't_wave_2',
        condition: { type: 'time', seconds: 260 },
        effects: [
          {
            type: 'wave',
            owner: 1,
            units: [{ kind: UnitKind.SOLDIER, count: 4 }],
            pos: { ref: 'player', dx: -20, dz: 24 },
            radius: 4,
          },
        ],
      },
    ],
  },
  {
    id: 'm2_chavin',
    title: 'El Oráculo de Chavín',
    subtitle: 'Horizonte Temprano · c. 900–500 a.C.',
    history:
      'Chavín de Huántar, a 3180 msnm en el Callejón de Conchucos, es el gran centro ceremonial de los Andes. Peregrinos de lejos traen ofrendas al oráculo.\n' +
      'Sostened el culto frente a la competencia de la costa sur (Paracas) y conservad vuestra influencia.',
    victory:
      'La influencia de Chavín se extiende por buena parte de los Andes centrales. Su arte y su culto marcan una época.',
    defeat: 'El oráculo pierde su prestigio y el centro ceremonial declina antes de tiempo.',
    period: HistoricalPeriod.EARLY_HORIZON,
    playerCiv: CivId.CHAVIN,
    enemyCiv: CivId.PARACAS,
    map: { seed: 900, type: 'andes', size: 128 },
    timeOfDay: 'noon',
    startingEra: Era.REGIONAL_STATES,
    startingResources: { food: 500, wood: 500, silver: 150, stone: 60 },
    start: {
      units: [{ kind: UnitKind.SOLDIER, dx: -6, dz: 6, tag: 'oraculo', count: 1 }],
    },
    enemy: { active: true, difficulty: 'easy', aggression: 0.5 },
    objectives: [
      { id: 'obj_ofrendas', kind: 'gather', resource: 'food', count: 400, title: 'Reúne ofrendas (400 de comida)' },
      { id: 'obj_survive', kind: 'survive', time: 420, title: 'Sostén el centro ceremonial 7 minutos' },
      { id: 'obj_oraculo', kind: 'protect', entityTag: 'oraculo', title: 'Mantén a salvo al guardián del oráculo' },
    ],
    triggers: [
      {
        id: 't_dial_0',
        condition: { type: 'time', seconds: 20 },
        effects: [
          {
            type: 'dialogue',
            text: 'Sacerdote: —El oráculo exige ofrendas. ¡Atended a los peregrinos y defended el templo!',
          },
        ],
      },
      {
        id: 't_wave_1',
        condition: { type: 'time', seconds: 150 },
        effects: [
          {
            type: 'wave',
            owner: 1,
            units: [{ kind: UnitKind.SOLDIER, count: 4 }],
            pos: { ref: 'player', dx: 24, dz: -10 },
            radius: 5,
          },
        ],
      },
      {
        id: 't_wave_2',
        condition: { type: 'time', seconds: 300 },
        effects: [
          {
            type: 'wave',
            owner: 1,
            units: [
              { kind: UnitKind.SOLDIER, count: 5 },
              { kind: UnitKind.MUSKETEER, count: 2 },
            ],
            pos: { ref: 'player', dx: -18, dz: 22 },
            radius: 6,
          },
        ],
      },
    ],
  },
  {
    id: 'm3_moche_recuay',
    title: 'La Frontera de los Valles',
    subtitle: 'Intermedio Temprano · c. 300–600 d.C.',
    history:
      'Los señores de Moche dominan los valles de Chicama, Moche y Virú. Desde el Callejón de Huaylas, los Recuay presionan la frontera.\n' +
      'Asegurad los valles y sus canales, y rechazad las incursiones desde la sierra.',
    victory:
      'Moche impone su dominio sobre la costa norte. Sus huacas y su cerámica marcan el apogeo del Intermedio Temprano.',
    defeat: 'Los valles caen ante las incursiones de la sierra y el poder moche se desmorona.',
    period: HistoricalPeriod.EARLY_INTERMEDIATE,
    playerCiv: CivId.MOCHE,
    enemyCiv: CivId.RECUAY,
    map: { seed: 400, type: 'coast', size: 128 },
    timeOfDay: 'dusk',
    startingEra: Era.REGIONAL_STATES,
    startingResources: { food: 700, wood: 600, silver: 200, stone: 200 },
    start: {
      buildings: [{ kind: BuildingKind.FORTRESS, dx: 18, dz: 0, tag: 'huacas' }],
      units: [
        { kind: UnitKind.SOLDIER, dx: 12, dz: 4, count: 6 },
        { kind: UnitKind.MUSKETEER, dx: 10, dz: 10, count: 4 },
      ],
    },
    mark: [],
    enemy: { active: true, difficulty: 'normal', aggression: 1 },
    objectives: [
      { id: 'obj_huacas', kind: 'defend', entityTag: 'huacas', time: 480, title: 'Mantén las huacas 8 minutos' },
      { id: 'obj_plata', kind: 'gather', resource: 'silver', count: 250, title: 'Reúne 250 de plata' },
    ],
    triggers: [
      {
        id: 't_dial_0',
        condition: { type: 'time', seconds: 10 },
        effects: [{ type: 'dialogue', text: 'Señor de Moche: —¡Las huacas son nuestro poder! ¡Formad en las plazas!' }],
      },
      {
        id: 't_wave_1',
        condition: { type: 'time', seconds: 80 },
        effects: [
          {
            type: 'wave',
            owner: 1,
            units: [{ kind: UnitKind.SOLDIER, count: 5 }],
            pos: { ref: 'player', dx: 30, dz: 10 },
            radius: 6,
          },
        ],
      },
      {
        id: 't_wave_2',
        condition: { type: 'time', seconds: 200 },
        effects: [
          {
            type: 'wave',
            owner: 1,
            units: [
              { kind: UnitKind.SOLDIER, count: 4 },
              { kind: UnitKind.MUSKETEER, count: 2 },
            ],
            pos: { ref: 'player', dx: -10, dz: 30 },
            radius: 6,
          },
          { type: 'dialogue', text: '¡Guerreros de la sierra por el oeste! ¡Reforzad el flanco!' },
        ],
      },
      {
        id: 't_wave_3',
        condition: { type: 'time', seconds: 360 },
        effects: [
          {
            type: 'wave',
            owner: 1,
            units: [{ kind: UnitKind.SOLDIER, count: 6 }],
            pos: { ref: 'player', dx: 28, dz: -12 },
            radius: 6,
          },
        ],
      },
    ],
  },
  {
    id: 'm4_wari',
    title: 'El Horizonte Medio',
    subtitle: 'Horizonte Medio · c. 600–1000 d.C.',
    history:
      'Wari, desde Ayacucho, construye el primer imperio andino: ciudades planificadas, caminos y una religión estatal. Al sur, Tiahuanaco domina el altiplano.\n' +
      'Extiende la red de centros provinciales y asegura vuestros andenes frente a la esfera rival.',
    victory: 'Wari consolida su esfera de influencia. El Horizonte Medio unifica buena parte de los Andes centrales.',
    defeat: 'La expansión wari se detiene y sus centros provinciales se pierden.',
    period: HistoricalPeriod.MIDDLE_HORIZON,
    playerCiv: CivId.WARI,
    enemyCiv: CivId.TIAHUANACO,
    map: { seed: 800, type: 'andes', size: 160 },
    timeOfDay: 'noon',
    startingEra: Era.TAHUANTINSUYO,
    startingResources: { food: 350, wood: 160, silver: 60, stone: 40 },
    start: {
      buildings: [{ kind: BuildingKind.CENTER, dx: -12, dz: 0, tag: 'capital' }],
      units: [
        { kind: UnitKind.SOLDIER, dx: 6, dz: 4, count: 6 },
        { kind: UnitKind.MUSKETEER, dx: 8, dz: 10, count: 4 },
      ],
    },
    mark: [{ tag: 'centro_rival', kind: BuildingKind.CENTER, owner: 1 }],
    enemy: { active: true, difficulty: 'normal', aggression: 1 },
    objectives: [
      { id: 'obj_capital', kind: 'protect', entityTag: 'capital', title: 'Protege la capital wari' },
      {
        id: 'obj_suministros',
        kind: 'gather',
        resource: 'food',
        count: 600,
        title: 'Reúne suministros para la expansión (600 de comida)',
      },
      { id: 'obj_destroy', kind: 'destroy', entityTag: 'centro_rival', title: 'Toma el centro rival del altiplano' },
      {
        id: 'obj_centro',
        kind: 'build',
        buildingKind: BuildingKind.MARKET,
        count: 1,
        pos: { ref: 'enemy', dx: -30, dz: 0 },
        radius: 16,
        title: 'Funda un centro provincial en la frontera',
      },
    ],
    triggers: [
      {
        id: 't_dial_0',
        condition: { type: 'time', seconds: 20 },
        effects: [
          {
            type: 'dialogue',
            text: 'Gobernante wari: —La despensa está corta, pero nuestros caminos no. Reunid suministros y fundad un centro provincial en la frontera.',
          },
        ],
      },
      {
        id: 't_cam_1',
        condition: { type: 'time', seconds: 60 },
        effects: [{ type: 'camera', pos: { ref: 'enemy', dx: 0, dz: 0 } }],
      },
      {
        id: 't_wave_1',
        condition: { type: 'time', seconds: 220 },
        effects: [
          {
            type: 'wave',
            owner: 1,
            units: [{ kind: UnitKind.SOLDIER, count: 6 }],
            pos: { ref: 'player', dx: 26, dz: 16 },
            radius: 6,
          },
        ],
      },
    ],
  },
  {
    id: 'm5_yahuar_pampa',
    title: 'Yahuar Pampa',
    subtitle: 'Cusco · 1438',
    history:
      'La confederación Chanca, al mando de Anccu Hualloc, marcha sobre el Cusco. El inca Viracocha y su heredero huyen; el príncipe Cusi Yupanqui organiza la defensa.\n' +
      'Resistid el asedio y repeled al ejército chanca. De esta batalla nacerá el Tahuantinsuyo.',
    victory:
      'Cusi Yupanqui vence en Yahuar Pampa y asume el poder como Pachacútec, el que transforma el mundo. Comienza el imperio.',
    defeat: 'El Cusco cae ante los chancas y el imperio no llega a nacer.',
    period: HistoricalPeriod.LATE_HORIZON,
    playerCiv: CivId.INCA,
    enemyCiv: CivId.CHANCA,
    map: { seed: 1438, type: 'andes', size: 160 },
    timeOfDay: 'dusk',
    startingEra: Era.TAHUANTINSUYO,
    startingResources: { food: 700, wood: 600, silver: 400, stone: 200 },
    start: {
      units: [
        { kind: UnitKind.RIFLEMAN, dx: -8, dz: 8, tag: 'cusi_yupanqui', count: 1 },
        { kind: UnitKind.SOLDIER, dx: -6, dz: 10, count: 6 },
        { kind: UnitKind.MUSKETEER, dx: -10, dz: 10, count: 2 },
      ],
    },
    mark: [
      { tag: 'cusco', kind: BuildingKind.CENTER, owner: 0 },
      { tag: 'centro_chanca', kind: BuildingKind.CENTER, owner: 1 },
    ],
    enemy: { active: true, difficulty: 'hard', aggression: 1.3 },
    objectives: [
      { id: 'obj_defend', kind: 'defend', entityTag: 'cusco', time: 480, title: 'Defiende el Cusco 8 minutos' },
      { id: 'obj_kill', kind: 'destroy', entityTag: 'centro_chanca', title: 'Destruye el campamento chanca' },
      { id: 'obj_cusi', kind: 'protect', entityTag: 'cusi_yupanqui', title: 'Mantén con vida a Cusi Yupanqui' },
    ],
    triggers: [
      {
        id: 't_dial_0',
        condition: { type: 'time', seconds: 15 },
        effects: [
          {
            type: 'dialogue',
            text: 'Cusi Yupanqui: —Los chancas creen que huiremos como los nobles. ¡Aquí se defiende el Cusco!',
          },
        ],
      },
      {
        id: 't_wave_1',
        condition: { type: 'time', seconds: 90 },
        effects: [
          {
            type: 'wave',
            owner: 1,
            units: [{ kind: UnitKind.SOLDIER, count: 6 }],
            pos: { ref: 'player', dx: 28, dz: 12 },
            radius: 6,
          },
          { type: 'dialogue', text: '¡Anccu Hualloc ataca por el norte! ¡A las armas!' },
        ],
      },
      {
        id: 't_wave_2',
        condition: { type: 'time', seconds: 200 },
        effects: [
          {
            type: 'wave',
            owner: 1,
            units: [
              { kind: UnitKind.SOLDIER, count: 5 },
              { kind: UnitKind.MUSKETEER, count: 2 },
            ],
            pos: { ref: 'player', dx: -12, dz: 28 },
            radius: 6,
          },
        ],
      },
    ],
  },
  {
    id: 'm6_chimu_inca',
    title: 'La Guerra del Norte',
    subtitle: 'Costa norte · c. 1470',
    history:
      'El Tahuantinsuyo ya domina el Collao, Cajamarca y la costa sur. Solo falta el poderoso Reino Chimú de Minchancaman.\n' +
      'Al mando del auqui Túpac Yupanqui, avanzad por Paramonga y el valle del Santa hasta Chan Chan.',
    victory:
      'Chan Chan capitula y Minchancaman es llevado al Cusco. El Tahuantinsuyo se extiende por toda la costa norte.',
    defeat: 'La resistencia chimú detiene al ejército inca y la costa norte permanece libre.',
    period: HistoricalPeriod.LATE_HORIZON,
    playerCiv: CivId.INCA,
    enemyCiv: CivId.CHIMU,
    map: { seed: 1470, type: 'coast', size: 192 },
    timeOfDay: 'dusk',
    startingEra: Era.TAHUANTINSUYO,
    startingResources: { food: 1000, wood: 700, silver: 900, stone: 400 },
    start: {
      units: [
        { kind: UnitKind.RIFLEMAN, dx: 10, dz: -4, count: 1, tag: 'tupac_yupanqui' },
        { kind: UnitKind.RIFLEMAN, dx: 12, dz: -8, count: 1 },
        { kind: UnitKind.MUSKETEER, dx: 6, dz: 10, count: 2 },
        { kind: UnitKind.RIFLEMAN, dx: 4, dz: -6, count: 4 },
      ],
    },
    mark: [{ tag: 'chan_chan', kind: BuildingKind.CENTER, owner: 1 }],
    enemy: { active: true, difficulty: 'hard', aggression: 1.2 },
    objectives: [
      { id: 'obj_kill', kind: 'destroy', entityTag: 'chan_chan', title: 'Toma Chan Chan' },
      { id: 'obj_hold', kind: 'survive', time: 600, title: 'Mantén tu campamento 10 minutos' },
      {
        id: 'obj_avanzar',
        kind: 'reach',
        entityTag: 'tupac_yupanqui',
        pos: { ref: 'enemy', dx: -18, dz: 0 },
        radius: 8,
        title: 'Avanzad hasta Paramonga',
      },
      {
        id: 'obj_comandante',
        kind: 'protect',
        entityTag: 'tupac_yupanqui',
        title: 'Mantén con vida a Túpac Yupanqui',
      },
    ],
    triggers: [
      {
        id: 't_dial_0',
        condition: { type: 'time', seconds: 20 },
        effects: [
          {
            type: 'dialogue',
            text: 'Túpac Yupanqui: —Minchancaman no se someterá. Avanzad por los valles y cortadle el agua a Chan Chan.',
          },
        ],
      },
      {
        id: 't_cam_1',
        condition: { type: 'time', seconds: 60 },
        effects: [{ type: 'camera', pos: { ref: 'enemy', dx: 0, dz: 0 } }],
      },
      {
        id: 't_wave_1',
        condition: { type: 'time', seconds: 260 },
        effects: [
          {
            type: 'wave',
            owner: 1,
            units: [
              { kind: UnitKind.SOLDIER, count: 6 },
              { kind: UnitKind.MUSKETEER, count: 3 },
            ],
            pos: { ref: 'player', dx: 20, dz: 20 },
            radius: 7,
          },
          { type: 'dialogue', text: '¡Querrotumi contraataca desde Paramonga!' },
        ],
      },
      {
        id: 't_paramonga',
        condition: { type: 'unit_near', entityTag: 'tupac_yupanqui', pos: { ref: 'enemy', dx: -18, dz: 0 }, radius: 8 },
        effects: [
          {
            type: 'dialogue',
            text: 'Túpac Yupanqui: —¡Paramonga ha caído! Avanzad por el valle del Santa hacia Chan Chan.',
          },
        ],
      },
    ],
  },
  {
    id: 'm7_tupac_amaru',
    title: 'La Gran Rebelión',
    subtitle: 'Virreinato · 1780–1781',
    history:
      'José Gabriel Condorcanqui, Túpac Amaru II, se alza contra los abusos del Virreinato: la mita, el reparto y los obrajes. Micaela Bastidas organiza el avituallamiento.\n' +
      'Sostened la rebelión y tomad el centro de mando realista.',
    victory: 'El centro realista cae. La rebelión sacude el Virreinato y enciende el camino hacia la independencia.',
    defeat: 'La rebelión se ahoga en sangre. El Virreinato perdura una generación más.',
    period: HistoricalPeriod.VICEROYALTY,
    playerCiv: CivId.INCA,
    enemyCiv: CivId.REALISTAS,
    map: { seed: 1780, type: 'andes', size: 192 },
    timeOfDay: 'dusk',
    startingEra: Era.VICEROYALTY,
    startingResources: { food: 1000, wood: 700, silver: 900, stone: 400 },
    start: {
      units: [
        { kind: UnitKind.CAVALRY, dx: 10, dz: -4, count: 2 },
        { kind: UnitKind.ARTILLERY, dx: 6, dz: 10, count: 2 },
        { kind: UnitKind.RIFLEMAN, dx: 4, dz: -6, tag: 'tupac_amaru', count: 1 },
      ],
    },
    mark: [{ tag: 'centro_realista', kind: BuildingKind.CENTER, owner: 1 }],
    enemy: { active: true, difficulty: 'hard', aggression: 1.3 },
    objectives: [
      { id: 'obj_kill', kind: 'destroy', entityTag: 'centro_realista', title: 'Toma el centro de mando realista' },
      { id: 'obj_hold', kind: 'survive', time: 600, title: 'Mantén el cuartel rebelde 10 minutos' },
      { id: 'obj_tupac', kind: 'protect', entityTag: 'tupac_amaru', title: 'Mantén con vida a Túpac Amaru II' },
    ],
    triggers: [
      {
        id: 't_dial_0',
        condition: { type: 'time', seconds: 20 },
        effects: [
          {
            type: 'dialogue',
            text: 'Túpac Amaru II: —¡Por el Sol y por el Perú! Abolid la mita y el reparto. ¡Adelante!',
          },
        ],
      },
      {
        id: 't_cam_1',
        condition: { type: 'time', seconds: 60 },
        effects: [{ type: 'camera', pos: { ref: 'enemy', dx: 0, dz: 0 } }],
      },
      {
        id: 't_wave_1',
        condition: { type: 'time', seconds: 300 },
        effects: [
          {
            type: 'wave',
            owner: 1,
            units: [
              { kind: UnitKind.SOLDIER, count: 6 },
              { kind: UnitKind.MUSKETEER, count: 3 },
            ],
            pos: { ref: 'player', dx: 22, dz: 18 },
            radius: 7,
          },
          { type: 'dialogue', text: '¡Refuerzos realistas desde el Cusco!' },
        ],
      },
    ],
  },
  {
    id: 'm8_independencia',
    title: 'La Independencia',
    subtitle: 'Independencia · 1821–1824',
    history:
      'San Martín proclama la independencia en Lima en 1821. La campaña continúa en la sierra con Bolívar y Sucre contra los realistas.\n' +
      'Sellad la independencia: tomad el centro realista y resistid hasta Ayacucho.',
    victory: 'La victoria sella la independencia del Perú. El poder español en el Perú llega a su fin.',
    defeat: 'La causa patriota se repliega y la independencia queda en suspenso.',
    period: HistoricalPeriod.INDEPENDENCE,
    playerCiv: CivId.PATRIOTAS,
    enemyCiv: CivId.REALISTAS,
    map: { seed: 1824, type: 'andes', size: 192 },
    timeOfDay: 'morning',
    startingEra: Era.REPUBLIC,
    startingResources: { food: 1200, wood: 800, silver: 1200, stone: 500 },
    start: {
      units: [
        { kind: UnitKind.RIFLEMAN, dx: 6, dz: -6, count: 5 },
        { kind: UnitKind.CAVALRY, dx: 10, dz: -2, count: 3 },
        { kind: UnitKind.ARTILLERY, dx: 4, dz: 8, count: 2 },
      ],
    },
    mark: [{ tag: 'centro_realista', kind: BuildingKind.CENTER, owner: 1 }],
    enemy: { active: true, difficulty: 'hard', aggression: 1.3 },
    objectives: [
      { id: 'obj_kill', kind: 'destroy', entityTag: 'centro_realista', title: 'Toma el centro realista' },
      { id: 'obj_hold', kind: 'survive', time: 600, title: 'Resiste hasta Ayacucho (10 minutos)' },
    ],
    triggers: [
      {
        id: 't_dial_0',
        condition: { type: 'time', seconds: 20 },
        effects: [
          {
            type: 'dialogue',
            text: 'General patriota: —La independencia se gana en la sierra. ¡Avanzad sobre el centro realista!',
          },
        ],
      },
      {
        id: 't_cam_1',
        condition: { type: 'time', seconds: 55 },
        effects: [{ type: 'camera', pos: { ref: 'enemy', dx: 0, dz: 0 } }],
      },
      {
        id: 't_wave_1',
        condition: { type: 'time', seconds: 320 },
        effects: [
          {
            type: 'wave',
            owner: 1,
            units: [
              { kind: UnitKind.SOLDIER, count: 6 },
              { kind: UnitKind.CAVALRY, count: 3 },
            ],
            pos: { ref: 'player', dx: 24, dz: 16 },
            radius: 7,
          },
          { type: 'dialogue', text: '¡Contraataque realista! ¡Formad cuadro!' },
        ],
      },
    ],
  },
  {
    id: 'm9_guerra_pacifico',
    title: 'El Caballero de los Mares',
    subtitle: 'Guerra del Pacífico · 1879–1883',
    history:
      'La Guerra del Pacífico enfrenta al Perú con Chile. Al mando del monitor Huáscar, el almirante Miguel Grau detiene a una escuadra superior con audaces correrías.\n' +
      'Proteged el puerto y destruid el centro de mando enemigo antes de que caiga la noche.',
    victory:
      'La escuadra enemiga se retira y el puerto resiste. Como en Angamos, el ejemplo de Grau sostiene a la República.',
    defeat: 'El puerto cae y el monitor se pierde. La República entra en su hora más oscura.',
    period: HistoricalPeriod.REPUBLIC,
    playerCiv: CivId.REPUBLIC,
    enemyCiv: CivId.CHILE,
    map: { seed: 1879, type: 'coast', size: 192 },
    timeOfDay: 'night',
    startingEra: Era.REPUBLIC,
    startingResources: { food: 1500, wood: 800, silver: 1500, stone: 1200 },
    start: {
      buildings: [{ kind: BuildingKind.WONDER, dx: -10, dz: -6, tag: 'puerto' }],
      units: [
        { kind: UnitKind.RIFLEMAN, dx: 6, dz: 2, count: 1, tag: 'grau' },
        { kind: UnitKind.CAVALRY, dx: 8, dz: 0, count: 2 },
        { kind: UnitKind.RIFLEMAN, dx: 4, dz: 8, count: 4 },
      ],
    },
    mark: [{ tag: 'centro_enemigo', kind: BuildingKind.CENTER, owner: 1 }],
    enemy: { active: true, difficulty: 'hard', aggression: 1.4 },
    // a naval/coastal campaign: the Republic has no siege train
    allowedUnits: [
      UnitKind.WORKER,
      UnitKind.SOLDIER,
      UnitKind.MUSKETEER,
      UnitKind.RIFLEMAN,
      UnitKind.SNIPER,
      UnitKind.HUSSAR,
      UnitKind.CAVALRY,
      UnitKind.SCOUT,
    ],
    objectives: [
      { id: 'obj_puerto', kind: 'protect', entityTag: 'puerto', title: 'Protege el puerto y el monitor' },
      { id: 'obj_kill', kind: 'destroy', entityTag: 'centro_enemigo', title: 'Destruye el centro de mando enemigo' },
      {
        id: 'obj_correria',
        kind: 'reach',
        entityTag: 'grau',
        pos: { ref: 'enemy', dx: -14, dz: 0 },
        radius: 8,
        title: 'Lleva a Grau en correría hasta la escuadra enemiga',
      },
      { id: 'obj_grau', kind: 'protect', entityTag: 'grau', title: 'Mantén con vida a Miguel Grau' },
    ],
    triggers: [
      {
        id: 't_dial_0',
        condition: { type: 'time', seconds: 15 },
        effects: [
          {
            type: 'dialogue',
            text: 'Miguel Grau: —El enemigo es superior, pero no pasará. ¡Tripulación, a vuestros puestos!',
          },
        ],
      },
      {
        id: 't_cam_1',
        condition: { type: 'time', seconds: 45 },
        effects: [{ type: 'camera', pos: { ref: 'enemy', dx: 0, dz: 0 } }],
      },
      {
        id: 't_wave_1',
        condition: { type: 'time', seconds: 240 },
        effects: [
          {
            type: 'wave',
            owner: 1,
            units: [
              { kind: UnitKind.SOLDIER, count: 4 },
              { kind: UnitKind.RIFLEMAN, count: 3 },
            ],
            pos: { ref: 'player', dx: 16, dz: 16 },
            radius: 6,
          },
          { type: 'dialogue', text: '¡Tropas de desembarco enemigas se dirigen al puerto!' },
        ],
      },
      {
        id: 't_correria',
        condition: { type: 'unit_near', entityTag: 'grau', pos: { ref: 'enemy', dx: -14, dz: 0 }, radius: 8 },
        effects: [
          {
            type: 'dialogue',
            text: 'Miguel Grau: —¡Ahí está la escuadra! Una correría más y el puerto respira.',
          },
        ],
      },
    ],
  },
];

export function getMission(id: string): MissionDef | undefined {
  return MISSIONS.find((m) => m.id === id);
}
