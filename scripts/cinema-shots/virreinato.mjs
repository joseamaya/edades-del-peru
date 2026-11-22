/** Cinema intro stills for El Virreinato. See scripts/capture_cinema.mjs for the shot format. */
export const VIRREINATO_SHOTS = [
  {
    mission: 'm_lima',
    dir: 'lima',
    shots: [
      {
        id: 'cine-ciudad',
        // The traza beside the Rímac, looking up the valley to Quizu's hills.
        center: [90, 150],
        eye: [-40, 34, 44],
        look: [30, 0, -22],
        fov: 48,
        time: 0.3,
        stage: [],
      },
      {
        id: 'cine-llano',
        // The hueste on the llano below the bridge as Quizu's warriors come down to the Rímac.
        center: [112, 132],
        eye: [26, 16, 26],
        look: [0, 0, 0],
        fov: 42,
        time: 0.42,
        stage: [
          { kind: 'soldier', owner: 0, from: [100, 134], to: [110, 144], count: 10, rows: 2, face: [124, 122] },
          { kind: 'cavalry', owner: 0, from: [111, 146], to: [115, 150], count: 3, rows: 1, face: [124, 122] },
          { kind: 'inca_warrior', owner: 1, from: [114, 120], to: [124, 130], count: 10, rows: 2, face: [104, 140] },
        ],
      },
    ],
  },
  {
    mission: 'm_cusco_1536',
    dir: 'cusco-1536',
    shots: [
      {
        id: 'cine-ciudad',
        // The plaza of the besieged city at dusk, Sacsayhuamán on the hill behind it. Cusco's grass and
        // forest are noisy: a brighter hour or a wider frame pushes the still past the 160 KB budget.
        center: [166, 174],
        eye: [24, 42, 46],
        look: [-6, 0, -16],
        fov: 44,
        time: 0.26,
        stage: [],
      },
      {
        id: 'cine-fortaleza',
        // Manco's warriors on the Sacsayhuamán terraces as a Spanish sortie climbs from the plaza.
        center: [146, 160],
        eye: [-26, 30, 18],
        look: [2, 0, -4],
        fov: 36,
        time: 0.26,
        stage: [
          { kind: 'inca_warrior', owner: 0, from: [144, 155], to: [162, 155], count: 10, rows: 1, face: [146, 172] },
          { kind: 'soldier', owner: 1, from: [136, 168], to: [146, 171], count: 6, rows: 1, face: [152, 155] },
          { kind: 'cavalry', owner: 1, from: [131, 164], to: [133, 168], count: 2, rows: 1, face: [152, 155] },
        ],
      },
    ],
  },
  {
    mission: 'm_vilcabamba',
    dir: 'vilcabamba',
    shots: [
      {
        id: 'cine-selva',
        // Huayna Pucará and the refuge in the cloud forest at dusk.
        center: [180, 97],
        eye: [-40, 32, 40],
        look: [10, 0, -4],
        fov: 48,
        time: 0.3,
        stage: [],
      },
      {
        id: 'cine-pucara',
        // The garrison on the pucará facing Arbieto's vanguard on the Cusco road.
        center: [186, 76],
        eye: [-34, 30, 24],
        look: [2, 0, -2],
        fov: 42,
        time: 0.3,
        stage: [
          { kind: 'inca_warrior', owner: 0, from: [174, 84], to: [190, 84], count: 10, rows: 2, face: [186, 66] },
          { kind: 'soldier', owner: 1, from: [182, 71], to: [194, 72], count: 6, rows: 1, face: [184, 90] },
        ],
      },
    ],
  },
  {
    mission: 'm7_tupac_amaru',
    dir: 'cusco',
    shots: [
      {
        id: 'cine-valle',
        // The Vilcanota valley from Tinta, the Sangarará road leading toward Cusco.
        center: [92, 159],
        eye: [-40, 36, 44],
        look: [34, 0, -20],
        fov: 48,
        time: 0.32,
        stage: [],
      },
      {
        id: 'cine-rebelion',
        // The rebel army mustered at the Tinta camp, ready to march.
        center: [100, 154],
        eye: [-30, 17, 22],
        look: [12, 0, -10],
        fov: 42,
        time: 0.4,
        stage: [
          { kind: 'soldier', owner: 0, from: [100, 146], to: [112, 158], count: 10, rows: 2, face: [140, 107] },
          { kind: 'rifleman', owner: 0, from: [96, 152], to: [104, 160], count: 4, rows: 1, face: [140, 107] },
          { kind: 'cavalry', owner: 0, from: [110, 162], to: [114, 166], count: 2, rows: 1, face: [140, 107] },
        ],
      },
    ],
  },
];
