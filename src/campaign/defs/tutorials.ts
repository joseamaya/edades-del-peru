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
  m6b_guerra_civil: {
    steps: [
      {
        id: 'select',
        text: 'Selecciona al ejército de Atahualpa. La guerra civil se decide avanzando hacia Quipaipan.',
        check: { type: 'selectUnit', unitKind: UnitKind.SOLDIER },
      },
      {
        id: 'quipaipan',
        text: 'Avanza hasta Quipaipan y presenta batalla contra el ejército de Huáscar.',
        highlight: '#ed-objectives',
        check: { type: 'objectiveCompleted', objectiveId: 'obj_avanzar' },
      },
      {
        id: 'huascar',
        text: 'Derrota el centro de Huáscar sin dejar caer a Atahualpa.',
        check: { type: 'objectiveCompleted', objectiveId: 'obj_quipaipan' },
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
        id: 'site',
        text: 'Lleva un obrero al centro ceremonial y observa la Plaza Circular y el Edificio B.',
        check: { type: 'approachSite', radius: 14, unitKind: UnitKind.WORKER },
      },
      {
        id: 'offer',
        text: 'Con un obrero junto al templo, selecciona el Edificio B y entrega una ofrenda de plata.',
        check: { type: 'objectiveCompleted', objectiveId: 'a1_ofrenda' },
      },
      {
        id: 'farm',
        text: 'Sostén a los peregrinos: construye un andén junto al valle para producir comida.',
        highlight: '#ed-bottom',
        check: { type: 'build', buildingKind: BuildingKind.FARM, baseline: 'farms' },
      },
      {
        id: 'old_temple',
        text: 'Entrega piedra en el Edificio B para completar el Templo Viejo.',
        check: { type: 'objectiveCompleted', objectiveId: 'a2_templo' },
      },
      {
        id: 'pilgrimage',
        text: 'Mantén un obrero en la Plaza Circular hasta completar la recepción de peregrinos.',
        gateObjective: 'a2_peregrinaje',
        check: { type: 'objectiveCompleted', objectiveId: 'a2_peregrinaje' },
      },
      {
        id: 'feria',
        text: 'Abre la feria de peregrinos: construye un mercado junto al templo.',
        highlight: '#ed-bottom',
        gateObjective: 'a2_feria',
        check: { type: 'build', buildingKind: BuildingKind.MARKET, baseline: 'markets' },
      },
      {
        id: 'new_temple',
        text: 'Entrega piedra en el Edificio A para levantar el Templo Nuevo.',
        check: { type: 'objectiveCompleted', objectiveId: 'a3_templo' },
      },
      {
        id: 'record',
        text: 'Recorre la Plaza, el Templo Viejo, el Templo Nuevo y la Portada para cerrar el registro.',
        check: { type: 'objectiveCompleted', objectiveId: 'a4_registro' },
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
        text: 'Los bancos de peces son los círculos de ondas en el agua, junto a la orilla. Lleva tu explorador hasta uno; luego selecciona obreros y haz clic derecho sobre los círculos para pescar.',
        check: { type: 'reachFishing', radius: 16 },
      },
      {
        id: 'house',
        text: 'Con obreros seleccionados, pulsa V (o el botón Vivienda) y haz clic en el suelo para construir una vivienda de quincha.',
        highlight: buildBottom,
        check: { type: 'build', buildingKind: BuildingKind.HOUSE, baseline: 'houses' },
      },
      {
        id: 'valley',
        text: 'Selecciona tu explorador y remonta el río Supe hacia el interior hasta la marca del valle.',
        gateObjective: 'a1_valle',
        check: { type: 'objectiveCompleted', objectiveId: 'a1_valle' },
      },
      {
        id: 'farm',
        text: 'Pulsa G (o el botón Chacra) y coloca los campos junto al canal: la tierra húmeda rinde más.',
        highlight: buildBottom,
        gateObjective: 'a2_campos',
        check: { type: 'build', buildingKind: BuildingKind.FARM, baseline: 'farms' },
      },
      {
        id: 'storage',
        text: 'Construye un depósito comunal (Troje) para guardar el excedente de la comunidad.',
        highlight: buildBottom,
        gateObjective: 'a2_troje',
        check: { type: 'build', buildingKind: BuildingKind.MILL, baseline: 'mills' },
      },
      {
        id: 'nets',
        text: 'Selecciona la Troje y pulsa «Redes de Algodón»: el algodón del valle se convierte en redes para Áspero.',
        gateObjective: 'a2_redes',
        check: { type: 'objectiveCompleted', objectiveId: 'a2_redes' },
      },
      {
        id: 'pyramid',
        text: 'Lleva un obrero a la Pirámide Mayor, haz clic sobre ella y pulsa «Entregar materiales». Cada entrega y cada turno de obra hacen crecer la pirámide.',
        gateObjective: 'a3_shicras',
        check: { type: 'objectiveCompleted', objectiveId: 'a3_shicras' },
      },
      {
        id: 'works',
        text: 'Mantén un obrero en la obra y la Troje con comida: si se vacía, la construcción se detiene hasta reponerla.',
        gateObjective: 'a3_obra_relleno',
        check: { type: 'objectiveCompleted', objectiveId: 'a3_obra_relleno' },
      },
    ],
  },
};

export function tutorialForMission(missionId: string): TutorialDef | undefined {
  return TUTORIALS[missionId];
}
