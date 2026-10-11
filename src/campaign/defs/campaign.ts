import { Era, CivId, UnitKind, BuildingKind } from '../../core/types';
import { MissionDef } from '../types';

export const CAMPAIGN_TITLE = 'La Senda del Sol';
export const CAMPAIGN_SUBTITLE = 'Nueve escenarios de la historia del Perú, de Caral a la República';

export const MISSIONS: MissionDef[] = [
  {
    id: 'm1_caral',
    titulo: 'La Ciudad Sagrada',
    subtitulo: 'Arcaico Tardío · c. 3000 a.C.',
    historia:
      'En el valle de Supe, entre el océano y los Andes, nace la primera ciudad de América. Caral se levanta con canales, plazas y pirámides.\n' +
      'Sostened el asentamiento, comerciad con el litoral de Áspero y defended el valle de los grupos rivales.',
    victoria:
      'Caral prospera durante siglos como centro de la civilización andina. Su legado guiará a las culturas del Perú durante milenios.',
    derrota: 'El valle queda en silencio. La primera ciudad de América no llega a consolidarse.',
    civJugador: CivId.CARAL,
    civEnemigo: CivId.CARAL,
    mapa: { seed: 3000, tipo: 'costa', tamano: 128 },
    horaDia: 'mañana',
    eraInicial: Era.FORMATIVO,
    recursosIniciales: { comida: 200, madera: 400, acero: 150, energia: 80 },
    inicio: {
      unidades: [{ kind: UnitKind.SOLDADO, dx: -6, dz: 6, tag: 'autoridad', cantidad: 1 }],
    },
    enemigo: { activo: true, dificultad: 'facil', agresion: 0.4 },
    objetivos: [
      { id: 'obj_food', kind: 'recolectar', resource: 'comida', cantidad: 300, titulo: 'Reúne 300 de comida' },
      { id: 'obj_survive', kind: 'sobrevivir', time: 360, titulo: 'Sostén el asentamiento 6 minutos' },
      { id: 'obj_autoridad', kind: 'proteger', entityTag: 'autoridad', titulo: 'Mantén con vida a la autoridad de Caral' },
    ],
    triggers: [
      { id: 't_dial_1', condicion: { tipo: 'tiempo', segundos: 40 }, efectos: [{ tipo: 'dialogo', texto: 'Autoridad: —El río Supe nos da vida. ¡Alzad los templos y tended los canales!' }] },
      { id: 't_wave_1', condicion: { tipo: 'tiempo', segundos: 140 }, efectos: [{ tipo: 'oleada', owner: 1, unidades: [{ kind: UnitKind.SOLDADO, cantidad: 3 }], pos: { ref: 'jugador', dx: 22, dz: 22 }, radio: 4 }, { tipo: 'dialogo', texto: '¡Grupos rivales al noreste! ¡A las armas!' }] },
      { id: 't_wave_2', condicion: { tipo: 'tiempo', segundos: 260 }, efectos: [{ tipo: 'oleada', owner: 1, unidades: [{ kind: UnitKind.SOLDADO, cantidad: 4 }], pos: { ref: 'jugador', dx: -20, dz: 24 }, radio: 4 }] },
    ],
  },
  {
    id: 'm2_chavin',
    titulo: 'El Oráculo de Chavín',
    subtitulo: 'Horizonte Temprano · c. 900–500 a.C.',
    historia:
      'Chavín de Huántar, a 3180 msnm en el Callejón de Conchucos, es el gran centro ceremonial de los Andes. Peregrinos de lejos traen ofrendas al oráculo.\n' +
      'Sostened el culto frente a la competencia de la costa sur (Paracas) y conservad vuestra influencia.',
    victoria:
      'La influencia de Chavín se extiende por buena parte de los Andes centrales. Su arte y su culto marcan una época.',
    derrota: 'El oráculo pierde su prestigio y el centro ceremonial declina antes de tiempo.',
    civJugador: CivId.CHAVIN,
    civEnemigo: CivId.PARACAS,
    mapa: { seed: 900, tipo: 'andes', tamano: 128 },
    horaDia: 'mediodía',
    eraInicial: Era.ESTADOS_REGIONALES,
    recursosIniciales: { comida: 500, madera: 500, acero: 150, energia: 60 },
    inicio: {
      unidades: [{ kind: UnitKind.SOLDADO, dx: -6, dz: 6, tag: 'oraculo', cantidad: 1 }],
    },
    enemigo: { activo: true, dificultad: 'facil', agresion: 0.5 },
    objetivos: [
      { id: 'obj_ofrendas', kind: 'recolectar', resource: 'comida', cantidad: 400, titulo: 'Reúne ofrendas (400 de comida)' },
      { id: 'obj_survive', kind: 'sobrevivir', time: 420, titulo: 'Sostén el centro ceremonial 7 minutos' },
      { id: 'obj_oraculo', kind: 'proteger', entityTag: 'oraculo', titulo: 'Mantén a salvo al guardián del oráculo' },
    ],
    triggers: [
      { id: 't_dial_0', condicion: { tipo: 'tiempo', segundos: 20 }, efectos: [{ tipo: 'dialogo', texto: 'Sacerdote: —El oráculo exige ofrendas. ¡Atended a los peregrinos y defended el templo!' }] },
      { id: 't_wave_1', condicion: { tipo: 'tiempo', segundos: 150 }, efectos: [{ tipo: 'oleada', owner: 1, unidades: [{ kind: UnitKind.SOLDADO, cantidad: 4 }], pos: { ref: 'jugador', dx: 24, dz: -10 }, radio: 5 }] },
      { id: 't_wave_2', condicion: { tipo: 'tiempo', segundos: 300 }, efectos: [{ tipo: 'oleada', owner: 1, unidades: [{ kind: UnitKind.SOLDADO, cantidad: 5 }, { kind: UnitKind.MOSQUETERO, cantidad: 2 }], pos: { ref: 'jugador', dx: -18, dz: 22 }, radio: 6 }] },
    ],
  },
  {
    id: 'm3_moche_recuay',
    titulo: 'La Frontera de los Valles',
    subtitulo: 'Intermedio Temprano · c. 300–600 d.C.',
    historia:
      'Los señores de Moche dominan los valles de Chicama, Moche y Virú. Desde el Callejón de Huaylas, los Recuay presionan la frontera.\n' +
      'Asegurad los valles y sus canales, y rechazad las incursiones desde la sierra.',
    victoria:
      'Moche impone su dominio sobre la costa norte. Sus huacas y su cerámica marcan el apogeo del Intermedio Temprano.',
    derrota: 'Los valles caen ante las incursiones de la sierra y el poder moche se desmorona.',
    civJugador: CivId.MOCHE,
    civEnemigo: CivId.RECUAY,
    mapa: { seed: 400, tipo: 'costa', tamano: 128 },
    horaDia: 'atardecer',
    eraInicial: Era.ESTADOS_REGIONALES,
    recursosIniciales: { comida: 700, madera: 600, acero: 200, energia: 200 },
    inicio: {
      edificios: [{ kind: BuildingKind.FORTALEZA, dx: 18, dz: 0, tag: 'huacas' }],
      unidades: [
        { kind: UnitKind.SOLDADO, dx: 12, dz: 4, cantidad: 6 },
        { kind: UnitKind.MOSQUETERO, dx: 10, dz: 10, cantidad: 4 },
      ],
    },
    marcar: [],
    enemigo: { activo: true, dificultad: 'normal', agresion: 1 },
    objetivos: [
      { id: 'obj_huacas', kind: 'defender', entityTag: 'huacas', time: 480, titulo: 'Mantén las huacas 8 minutos' },
      { id: 'obj_plata', kind: 'recolectar', resource: 'acero', cantidad: 250, titulo: 'Reúne 250 de plata' },
    ],
    triggers: [
      { id: 't_dial_0', condicion: { tipo: 'tiempo', segundos: 10 }, efectos: [{ tipo: 'dialogo', texto: 'Señor de Moche: —¡Las huacas son nuestro poder! ¡Formad en las plazas!' }] },
      { id: 't_wave_1', condicion: { tipo: 'tiempo', segundos: 80 }, efectos: [{ tipo: 'oleada', owner: 1, unidades: [{ kind: UnitKind.SOLDADO, cantidad: 5 }], pos: { ref: 'jugador', dx: 30, dz: 10 }, radio: 6 }] },
      { id: 't_wave_2', condicion: { tipo: 'tiempo', segundos: 200 }, efectos: [{ tipo: 'oleada', owner: 1, unidades: [{ kind: UnitKind.SOLDADO, cantidad: 4 }, { kind: UnitKind.HUSAR, cantidad: 2 }], pos: { ref: 'jugador', dx: -10, dz: 30 }, radio: 6 }, { tipo: 'dialogo', texto: '¡Guerreros de la sierra por el oeste! ¡Reforzad el flanco!' }] },
      { id: 't_wave_3', condicion: { tipo: 'tiempo', segundos: 360 }, efectos: [{ tipo: 'oleada', owner: 1, unidades: [{ kind: UnitKind.SOLDADO, cantidad: 6 }], pos: { ref: 'jugador', dx: 28, dz: -12 }, radio: 6 }] },
    ],
  },
  {
    id: 'm4_wari',
    titulo: 'El Horizonte Medio',
    subtitulo: 'Horizonte Medio · c. 600–1000 d.C.',
    historia:
      'Wari, desde Ayacucho, construye el primer imperio andino: ciudades planificadas, caminos y una religión estatal. Al sur, Tiahuanaco domina el altiplano.\n' +
      'Extiende la red de centros provinciales y asegura vuestros andenes frente a la esfera rival.',
    victoria:
      'Wari consolida su esfera de influencia. El Horizonte Medio unifica buena parte de los Andes centrales.',
    derrota: 'La expansión wari se detiene y sus centros provinciales se pierden.',
    civJugador: CivId.WARI,
    civEnemigo: CivId.TIAHUANACO,
    mapa: { seed: 800, tipo: 'andes', tamano: 160 },
    horaDia: 'mediodía',
    eraInicial: Era.TAHUANTINSUYO,
    recursosIniciales: { comida: 800, madera: 700, acero: 400, energia: 300 },
    inicio: {
      edificios: [{ kind: BuildingKind.CENTRO, dx: -12, dz: 0, tag: 'capital' }],
      unidades: [
        { kind: UnitKind.SOLDADO, dx: 6, dz: 4, cantidad: 6 },
        { kind: UnitKind.MOSQUETERO, dx: 8, dz: 10, cantidad: 4 },
      ],
    },
    marcar: [{ tag: 'centro_rival', kind: BuildingKind.CENTRO, owner: 1 }],
    enemigo: { activo: true, dificultad: 'normal', agresion: 1 },
    objetivos: [
      { id: 'obj_capital', kind: 'proteger', entityTag: 'capital', titulo: 'Protege la capital wari' },
      { id: 'obj_destroy', kind: 'destruir', entityTag: 'centro_rival', titulo: 'Toma el centro rival del altiplano' },
    ],
    triggers: [
      { id: 't_dial_0', condicion: { tipo: 'tiempo', segundos: 20 }, efectos: [{ tipo: 'dialogo', texto: 'Gobernante wari: —Nuestros caminos y andenes son la fuerza del imperio. ¡Adelante!' }] },
      { id: 't_cam_1', condicion: { tipo: 'tiempo', segundos: 60 }, efectos: [{ tipo: 'camara', pos: { ref: 'enemigo', dx: 0, dz: 0 } }] },
      { id: 't_wave_1', condicion: { tipo: 'tiempo', segundos: 220 }, efectos: [{ tipo: 'oleada', owner: 1, unidades: [{ kind: UnitKind.SOLDADO, cantidad: 6 }], pos: { ref: 'jugador', dx: 26, dz: 16 }, radio: 6 }] },
    ],
  },
  {
    id: 'm5_yahuar_pampa',
    titulo: 'Yahuar Pampa',
    subtitulo: 'Cusco · 1438',
    historia:
      'La confederación Chanca, al mando de Anccu Hualloc, marcha sobre el Cusco. El inca Viracocha y su heredero huyen; el príncipe Cusi Yupanqui organiza la defensa.\n' +
      'Resistid el asedio y repeled al ejército chanca. De esta batalla nacerá el Tahuantinsuyo.',
    victoria:
      'Cusi Yupanqui vence en Yahuar Pampa y asume el poder como Pachacútec, el que transforma el mundo. Comienza el imperio.',
    derrota: 'El Cusco cae ante los chancas y el imperio no llega a nacer.',
    civJugador: CivId.INCA,
    civEnemigo: CivId.CHANCA,
    mapa: { seed: 1438, tipo: 'andes', tamano: 160 },
    horaDia: 'atardecer',
    eraInicial: Era.TAHUANTINSUYO,
    recursosIniciales: { comida: 700, madera: 600, acero: 400, energia: 200 },
    inicio: {
      unidades: [
        { kind: UnitKind.FUSILERO, dx: -8, dz: 8, tag: 'cusi_yupanqui', cantidad: 1 },
        { kind: UnitKind.SOLDADO, dx: -6, dz: 10, cantidad: 6 },
        { kind: UnitKind.ARTILLERO_AA, dx: -10, dz: 10, cantidad: 2 },
      ],
    },
    marcar: [
      { tag: 'cusco', kind: BuildingKind.CENTRO, owner: 0 },
      { tag: 'centro_chanca', kind: BuildingKind.CENTRO, owner: 1 },
    ],
    enemigo: { activo: true, dificultad: 'dificil', agresion: 1.3 },
    objetivos: [
      { id: 'obj_defend', kind: 'defender', entityTag: 'cusco', time: 480, titulo: 'Defiende el Cusco 8 minutos' },
      { id: 'obj_kill', kind: 'destruir', entityTag: 'centro_chanca', titulo: 'Destruye el campamento chanca' },
      { id: 'obj_cusi', kind: 'proteger', entityTag: 'cusi_yupanqui', titulo: 'Mantén con vida a Cusi Yupanqui' },
    ],
    triggers: [
      { id: 't_dial_0', condicion: { tipo: 'tiempo', segundos: 15 }, efectos: [{ tipo: 'dialogo', texto: 'Cusi Yupanqui: —Los chancas creen que huiremos como los nobles. ¡Aquí se defiende el Cusco!' }] },
      { id: 't_wave_1', condicion: { tipo: 'tiempo', segundos: 90 }, efectos: [{ tipo: 'oleada', owner: 1, unidades: [{ kind: UnitKind.SOLDADO, cantidad: 6 }], pos: { ref: 'jugador', dx: 28, dz: 12 }, radio: 6 }, { tipo: 'dialogo', texto: '¡Anccu Hualloc ataca por el norte! ¡A las armas!' }] },
      { id: 't_wave_2', condicion: { tipo: 'tiempo', segundos: 200 }, efectos: [{ tipo: 'oleada', owner: 1, unidades: [{ kind: UnitKind.SOLDADO, cantidad: 5 }, { kind: UnitKind.HUSAR, cantidad: 2 }], pos: { ref: 'jugador', dx: -12, dz: 28 }, radio: 6 }] },
    ],
  },
  {
    id: 'm6_chimu_inca',
    titulo: 'La Guerra del Norte',
    subtitulo: 'Costa norte · c. 1470',
    historia:
      'El Tahuantinsuyo ya domina el Collao, Cajamarca y la costa sur. Solo falta el poderoso Reino Chimú de Minchancaman.\n' +
      'Al mando del auqui Túpac Yupanqui, avanzad por Paramonga y el valle del Santa hasta Chan Chan.',
    victoria:
      'Chan Chan capitula y Minchancaman es llevado al Cusco. El Tahuantinsuyo se extiende por toda la costa norte.',
    derrota: 'La resistencia chimú detiene al ejército inca y la costa norte permanece libre.',
    civJugador: CivId.INCA,
    civEnemigo: CivId.CHIMU,
    mapa: { seed: 1470, tipo: 'costa', tamano: 192 },
    horaDia: 'atardecer',
    eraInicial: Era.TAHUANTINSUYO,
    recursosIniciales: { comida: 1000, madera: 700, acero: 900, energia: 400 },
    inicio: {
      unidades: [
        { kind: UnitKind.TANQUE, dx: 10, dz: -4, cantidad: 2 },
        { kind: UnitKind.ARTILLERIA, dx: 6, dz: 10, cantidad: 2 },
        { kind: UnitKind.FUSILERO, dx: 4, dz: -6, cantidad: 4 },
      ],
    },
    marcar: [{ tag: 'chan_chan', kind: BuildingKind.CENTRO, owner: 1 }],
    enemigo: { activo: true, dificultad: 'dificil', agresion: 1.2 },
    objetivos: [
      { id: 'obj_kill', kind: 'destruir', entityTag: 'chan_chan', titulo: 'Toma Chan Chan' },
      { id: 'obj_hold', kind: 'sobrevivir', time: 600, titulo: 'Mantén tu campamento 10 minutos' },
    ],
    triggers: [
      { id: 't_dial_0', condicion: { tipo: 'tiempo', segundos: 20 }, efectos: [{ tipo: 'dialogo', texto: 'Túpac Yupanqui: —Minchancaman no se someterá. Avanzad por los valles y cortadle el agua a Chan Chan.' }] },
      { id: 't_cam_1', condicion: { tipo: 'tiempo', segundos: 60 }, efectos: [{ tipo: 'camara', pos: { ref: 'enemigo', dx: 0, dz: 0 } }] },
      { id: 't_wave_1', condicion: { tipo: 'tiempo', segundos: 260 }, efectos: [{ tipo: 'oleada', owner: 1, unidades: [{ kind: UnitKind.SOLDADO, cantidad: 6 }, { kind: UnitKind.MOSQUETERO, cantidad: 3 }], pos: { ref: 'jugador', dx: 20, dz: 20 }, radio: 7 }, { tipo: 'dialogo', texto: '¡Querrotumi contraataca desde Paramonga!' }] },
    ],
  },
  {
    id: 'm7_tupac_amaru',
    titulo: 'La Gran Rebelión',
    subtitulo: 'Virreinato · 1780–1781',
    historia:
      'José Gabriel Condorcanqui, Túpac Amaru II, se alza contra los abusos del Virreinato: la mita, el reparto y los obrajes. Micaela Bastidas organiza el avituallamiento.\n' +
      'Sostened la rebelión y tomad el centro de mando realista.',
    victoria:
      'El centro realista cae. La rebelión sacude el Virreinato y enciende el camino hacia la independencia.',
    derrota: 'La rebelión se ahoga en sangre. El Virreinato perdura una generación más.',
    civJugador: CivId.INCA,
    civEnemigo: CivId.REALISTAS,
    mapa: { seed: 1780, tipo: 'andes', tamano: 192 },
    horaDia: 'atardecer',
    eraInicial: Era.VIRREINATO,
    recursosIniciales: { comida: 1000, madera: 700, acero: 900, energia: 400 },
    inicio: {
      unidades: [
        { kind: UnitKind.TANQUE, dx: 10, dz: -4, cantidad: 2 },
        { kind: UnitKind.ARTILLERIA, dx: 6, dz: 10, cantidad: 2 },
        { kind: UnitKind.FUSILERO, dx: 4, dz: -6, tag: 'tupac_amaru', cantidad: 1 },
      ],
    },
    marcar: [{ tag: 'centro_realista', kind: BuildingKind.CENTRO, owner: 1 }],
    enemigo: { activo: true, dificultad: 'dificil', agresion: 1.3 },
    objetivos: [
      { id: 'obj_kill', kind: 'destruir', entityTag: 'centro_realista', titulo: 'Toma el centro de mando realista' },
      { id: 'obj_hold', kind: 'sobrevivir', time: 600, titulo: 'Mantén el cuartel rebelde 10 minutos' },
      { id: 'obj_tupac', kind: 'proteger', entityTag: 'tupac_amaru', titulo: 'Mantén con vida a Túpac Amaru II' },
    ],
    triggers: [
      { id: 't_dial_0', condicion: { tipo: 'tiempo', segundos: 20 }, efectos: [{ tipo: 'dialogo', texto: 'Túpac Amaru II: —¡Por el Sol y por el Perú! Abolid la mita y el reparto. ¡Adelante!' }] },
      { id: 't_cam_1', condicion: { tipo: 'tiempo', segundos: 60 }, efectos: [{ tipo: 'camara', pos: { ref: 'enemigo', dx: 0, dz: 0 } }] },
      { id: 't_wave_1', condicion: { tipo: 'tiempo', segundos: 300 }, efectos: [{ tipo: 'oleada', owner: 1, unidades: [{ kind: UnitKind.SOLDADO, cantidad: 6 }, { kind: UnitKind.MOSQUETERO, cantidad: 3 }], pos: { ref: 'jugador', dx: 22, dz: 18 }, radio: 7 }, { tipo: 'dialogo', texto: '¡Refuerzos realistas desde el Cusco!' }] },
    ],
  },
  {
    id: 'm8_independencia',
    titulo: 'La Independencia',
    subtitulo: 'Independencia · 1821–1824',
    historia:
      'San Martín proclama la independencia en Lima en 1821. La campaña continúa en la sierra con Bolívar y Sucre contra los realistas.\n' +
      'Sellad la independencia: tomad el centro realista y resistid hasta Ayacucho.',
    victoria:
      'La victoria sella la independencia del Perú. El poder español en el Perú llega a su fin.',
    derrota: 'La causa patriota se repliega y la independencia queda en suspenso.',
    civJugador: CivId.PATRIOTAS,
    civEnemigo: CivId.REALISTAS,
    mapa: { seed: 1824, tipo: 'andes', tamano: 192 },
    horaDia: 'mañana',
    eraInicial: Era.REPUBLICA,
    recursosIniciales: { comida: 1200, madera: 800, acero: 1200, energia: 500 },
    inicio: {
      unidades: [
        { kind: UnitKind.FUSILERO, dx: 6, dz: -6, cantidad: 5 },
        { kind: UnitKind.CABALLERIA, dx: 10, dz: -2, cantidad: 3 },
        { kind: UnitKind.ARTILLERIA, dx: 4, dz: 8, cantidad: 2 },
      ],
    },
    marcar: [{ tag: 'centro_realista', kind: BuildingKind.CENTRO, owner: 1 }],
    enemigo: { activo: true, dificultad: 'dificil', agresion: 1.3 },
    objetivos: [
      { id: 'obj_kill', kind: 'destruir', entityTag: 'centro_realista', titulo: 'Toma el centro realista' },
      { id: 'obj_hold', kind: 'sobrevivir', time: 600, titulo: 'Resiste hasta Ayacucho (10 minutos)' },
    ],
    triggers: [
      { id: 't_dial_0', condicion: { tipo: 'tiempo', segundos: 20 }, efectos: [{ tipo: 'dialogo', texto: 'General patriota: —La independencia se gana en la sierra. ¡Avanzad sobre el centro realista!' }] },
      { id: 't_cam_1', condicion: { tipo: 'tiempo', segundos: 55 }, efectos: [{ tipo: 'camara', pos: { ref: 'enemigo', dx: 0, dz: 0 } }] },
      { id: 't_wave_1', condicion: { tipo: 'tiempo', segundos: 320 }, efectos: [{ tipo: 'oleada', owner: 1, unidades: [{ kind: UnitKind.SOLDADO, cantidad: 6 }, { kind: UnitKind.CABALLERIA, cantidad: 3 }], pos: { ref: 'jugador', dx: 24, dz: 16 }, radio: 7 }, { tipo: 'dialogo', texto: '¡Contraataque realista! ¡Formad cuadro!' }] },
    ],
  },
  {
    id: 'm9_guerra_pacifico',
    titulo: 'El Caballero de los Mares',
    subtitulo: 'Guerra del Pacífico · 1879–1883',
    historia:
      'La Guerra del Pacífico enfrenta al Perú con Chile. Al mando del monitor Huáscar, el almirante Miguel Grau detiene a una escuadra superior con audaces correrías.\n' +
      'Proteged el puerto y destruid el centro de mando enemigo antes de que caiga la noche.',
    victoria:
      'La escuadra enemiga se retira y el puerto resiste. Como en Angamos, el ejemplo de Grau sostiene a la República.',
    derrota: 'El puerto cae y el monitor se pierde. La República entra en su hora más oscura.',
    civJugador: CivId.REPUBLICA,
    civEnemigo: CivId.CHILE,
    mapa: { seed: 1879, tipo: 'costa', tamano: 192 },
    horaDia: 'noche',
    eraInicial: Era.REPUBLICA,
    recursosIniciales: { comida: 1500, madera: 800, acero: 1500, energia: 1200 },
    inicio: {
      edificios: [{ kind: BuildingKind.MARAVILLA, dx: -10, dz: -6, tag: 'puerto' }],
      unidades: [
        { kind: UnitKind.MEC, dx: 8, dz: 0, cantidad: 2 },
        { kind: UnitKind.FUSILERO, dx: 4, dz: 8, cantidad: 4 },
      ],
    },
    marcar: [{ tag: 'centro_enemigo', kind: BuildingKind.CENTRO, owner: 1 }],
    enemigo: { activo: true, dificultad: 'dificil', agresion: 1.4 },
    objetivos: [
      { id: 'obj_puerto', kind: 'proteger', entityTag: 'puerto', titulo: 'Protege el puerto y el monitor' },
      { id: 'obj_kill', kind: 'destruir', entityTag: 'centro_enemigo', titulo: 'Destruye el centro de mando enemigo' },
    ],
    triggers: [
      { id: 't_dial_0', condicion: { tipo: 'tiempo', segundos: 15 }, efectos: [{ tipo: 'dialogo', texto: 'Miguel Grau: —El enemigo es superior, pero no pasará. ¡Tripulación, a vuestros puestos!' }] },
      { id: 't_cam_1', condicion: { tipo: 'tiempo', segundos: 45 }, efectos: [{ tipo: 'camara', pos: { ref: 'enemigo', dx: 0, dz: 0 } }] },
      { id: 't_wave_1', condicion: { tipo: 'tiempo', segundos: 240 }, efectos: [{ tipo: 'oleada', owner: 1, unidades: [{ kind: UnitKind.SOLDADO, cantidad: 4 }, { kind: UnitKind.FUSILERO, cantidad: 3 }], pos: { ref: 'jugador', dx: 16, dz: 16 }, radio: 6 }, { tipo: 'dialogo', texto: '¡Tropas de desembarco enemigas se dirigen al puerto!' }] },
    ],
  },
];

export function getMission(id: string): MissionDef | undefined {
  return MISSIONS.find((m) => m.id === id);
}
