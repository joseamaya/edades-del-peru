import { BuildingKind, UnitKind } from '../../core/types';
import type { TutorialDef } from '../types';

const buildBottom = '#ed-bottom';

const TUTORIALS: Record<string, TutorialDef> = {
  m8_independencia: {
    steps: [
      {
        id: 'select',
        text: 'Selecciona a la caballería patriota: será la punta de lanza en Junín.',
        check: { type: 'selectUnit', unitKind: UnitKind.CAVALRY },
      },
      {
        id: 'junin',
        text: 'Sostén la posición de Junín con la caballería durante 90 segundos. Sucre debe seguir con vida.',
        highlight: '#ed-objectives',
        check: { type: 'objectiveCompleted', objectiveId: 'obj_junin' },
      },
      {
        id: 'ayacucho',
        text: 'Avanza a Ayacucho y sostén el campo 120 segundos para sellar la independencia.',
        check: { type: 'objectiveCompleted', objectiveId: 'obj_ayacucho' },
      },
    ],
  },
  m9_guerra_pacifico: {
    steps: [
      {
        id: 'select',
        text: 'Selecciona a los defensores de Arica. Bolognesi y el puerto deben resistir el asalto.',
        check: { type: 'selectUnit', unitKind: UnitKind.RIFLEMAN },
      },
      {
        id: 'resist',
        text: 'Defiende el puerto y mantén con vida a Bolognesi hasta que termine el asalto, a los 10 minutos.',
        highlight: '#ed-objectives',
        check: { type: 'objectiveCompleted', objectiveId: 'obj_resistir' },
      },
    ],
  },
  m7_tupac_amaru: {
    steps: [
      {
        id: 'select',
        text: 'Selecciona a Túpac Amaru II y su ejército. La rebelión se decide en el sur andino, no esperando en la base.',
        check: { type: 'selectUnit', unitKind: UnitKind.RIFLEMAN },
      },
      {
        id: 'victory',
        text: 'Túpac Amaru II debe sobrevivir. Asalta el centro realista del Cusco o resiste el cerco diez minutos: ambas rutas ganan.',
        highlight: '#ed-objectives',
        check: { type: 'objectiveGroupCompleted', group: 'victoria' },
      },
    ],
  },
  m5_yahuar_pampa: {
    steps: [
      {
        id: 'select',
        text: 'Selecciona a tus defensores: haz clic izquierdo sobre un soldado o arrastra un recuadro.',
        check: { type: 'selectUnit', unitKind: UnitKind.SOLDIER },
      },
      {
        id: 'defend',
        text: 'Sostén el Cusco durante ocho minutos. Las oleadas chancas atacarán por el norte y por el oeste.',
        highlight: '#ed-objectives',
        check: { type: 'objectiveCompleted', objectiveId: 'obj_defend' },
      },
      {
        id: 'counter',
        text: 'Cuando la defensa resista, contraataca y destruye el campamento chanca. Cusi Yupanqui debe seguir con vida.',
        check: { type: 'objectiveCompleted', objectiveId: 'obj_kill' },
      },
    ],
  },
  m6_chimu_inca: {
    steps: [
      {
        id: 'select',
        text: 'Selecciona a Túpac Yupanqui y su ejército. La campaña se decide avanzando, no esperando en la base.',
        check: { type: 'selectUnit', unitKind: UnitKind.RIFLEMAN },
      },
      {
        id: 'paramonga',
        text: 'Avanza con Túpac Yupanqui hasta Paramonga, al norte del campamento chimú.',
        highlight: '#ed-objectives',
        check: { type: 'objectiveCompleted', objectiveId: 'obj_avanzar' },
      },
      {
        id: 'canal',
        text: 'Llega al canal que abastece Chan Chan. Cortar el agua fuerza la rendición chimú.',
        check: { type: 'objectiveCompleted', objectiveId: 'obj_canal' },
      },
    ],
  },
  m2_chavin: {
    steps: [
      {
        id: 'select',
        text: 'Selecciona a tus obreros: haz clic izquierdo sobre uno o arrastra un recuadro para seleccionar varios.',
        check: { type: 'selectUnit', unitKind: UnitKind.WORKER },
      },
      {
        id: 'temple',
        text: 'Lleva un obrero al conjunto ceremonial y observa la Plaza Circular y el Templo del Lanzón.',
        check: { type: 'approachSite', radius: 14, unitKind: UnitKind.WORKER },
      },
      {
        id: 'offer',
        text: 'Con un obrero junto al templo, selecciona el Edificio B y entrega una ofrenda de plata.',
        check: { type: 'objectiveCompleted', objectiveId: 'obj_ofrendas' },
      },
      {
        id: 'market',
        text: 'Abre la feria de peregrinos: construye un mercado junto al templo.',
        highlight: '#ed-bottom',
        gateObjective: 'obj_feria',
        check: { type: 'build', buildingKind: BuildingKind.MARKET, baseline: 'markets' },
      },
      {
        id: 'pilgrimage',
        text: 'Mantén un obrero en la Plaza Circular hasta completar la recepción de peregrinos.',
        gateObjective: 'obj_peregrinaje',
        check: { type: 'objectiveCompleted', objectiveId: 'obj_peregrinaje' },
      },
    ],
  },
  m4_wari: {
    steps: [
      {
        id: 'select',
        text: 'Selecciona a tus obreros: haz clic izquierdo sobre uno o arrastra un recuadro para seleccionar varios.',
        check: { type: 'selectUnit', unitKind: UnitKind.WORKER },
      },
      {
        id: 'farm',
        text: 'Acondiciona un andén cerca de la base: la red wari necesita alimentos antes de expandirse.',
        highlight: buildBottom,
        check: { type: 'build', buildingKind: BuildingKind.FARM, baseline: 'farms' },
      },
      {
        id: 'network',
        text: 'Funda dos centros provinciales en los nodos de la frontera. La red se mide en centros conectados, no en batallas.',
        check: { type: 'objectiveCompleted', objectiveId: 'obj_red' },
      },
      {
        id: 'frontier',
        text: 'Mantén una unidad en el primer centro provincial para sostener la frontera frente a Tiahuanaco.',
        check: { type: 'objectiveCompleted', objectiveId: 'obj_frontera' },
      },
    ],
  },
  m3_moche_recuay: {
    steps: [
      {
        id: 'select',
        text: 'Selecciona a tus obreros: haz clic izquierdo sobre uno o arrastra un recuadro para seleccionar varios.',
        check: { type: 'selectUnit', unitKind: UnitKind.WORKER },
      },
      {
        id: 'canal',
        text: 'Selecciona el canal del valle y abre su compuerta: el agua sostiene los andenes y las huacas.',
        check: { type: 'objectiveCompleted', objectiveId: 'obj_canal' },
      },
      {
        id: 'plaza',
        text: 'Lleva una unidad a la plaza entre las huacas y mantén la posición mientras llegan las incursiones recuay.',
        check: { type: 'objectiveCompleted', objectiveId: 'obj_huacas' },
      },
      {
        id: 'trade',
        text: 'Con un obrero junto a las huacas, selecciona la Huaca de la Luna e intercambia plata con la sierra.',
        check: { type: 'objectiveCompleted', objectiveId: 'obj_intercambio' },
      },
    ],
  },
  m1_caral: {
    steps: [
      {
        id: 'select',
        text: 'Selecciona a tus obreros: haz clic izquierdo sobre uno o arrastra un recuadro para seleccionar varios.',
        check: { type: 'selectUnit', unitKind: UnitKind.WORKER },
      },
      {
        id: 'coast',
        text: 'Selecciona tu explorador y recorre el valle hacia el litoral hasta descubrir un banco de peces.',
        check: { type: 'reachFishing', radius: 16 },
      },
      {
        id: 'house',
        text: 'Con obreros seleccionados, pulsa V (o el botón Vivienda) y haz clic en el suelo para construir una vivienda.',
        highlight: buildBottom,
        check: { type: 'build', buildingKind: BuildingKind.HOUSE, baseline: 'houses' },
      },
      {
        id: 'farm',
        text: 'Pulsa G (o el botón Andén) y coloca el cultivo cerca del agua o de un canal: la tierra húmeda rinde más.',
        highlight: buildBottom,
        check: { type: 'build', buildingKind: BuildingKind.FARM, baseline: 'farms' },
      },
      {
        id: 'landmark',
        text: 'Acércate al complejo ceremonial y observa sus plazas y pirámides: la monumentalidad nace del trabajo comunal.',
        check: { type: 'approachSite', radius: 12, unitKind: UnitKind.SCOUT },
      },
      {
        id: 'storage',
        text: 'Construye un depósito comunal (Troje) para guardar el excedente de la comunidad.',
        highlight: buildBottom,
        gateObjective: 'obj_almacenamiento',
        check: { type: 'build', buildingKind: BuildingKind.MILL, baseline: 'mills' },
      },
    ],
  },
};

export function tutorialForMission(missionId: string): TutorialDef | undefined {
  return TUTORIALS[missionId];
}
