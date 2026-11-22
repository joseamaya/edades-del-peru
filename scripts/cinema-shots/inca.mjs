/** Cinema intro stills for El Tahuantinsuyo. See scripts/capture_cinema.mjs for the shot format. */
export const INCA_SHOTS = [
  {
    mission: 'm_tambotoco',
    dir: 'tambotoco',
    shots: [
      {
        id: 'cine-cueva',
        // The cave mouth in its rocky ridge, seen from the east: the Ayar party already on the stony path.
        center: [44, 62],
        eye: [34, 16, 10],
        look: [-6, 2, -4],
        fov: 46,
        time: 0.42,
        stage: [],
      },
      {
        id: 'cine-partida',
        // The pilgrimage on the road past Tambo Quiro, with Huanacaure's huaca and huts on the rise ahead.
        center: [70, 98],
        eye: [-14, 14, 24],
        look: [16, 0, -4],
        fov: 46,
        time: 0.42,
        stage: [
          { kind: 'soldier', owner: 0, from: [66, 96], to: [78, 99], count: 7, rows: 1, face: [120, 106] },
          { kind: 'worker', owner: 0, from: [58, 93], to: [65, 98], count: 6, rows: 2, face: [120, 106] },
        ],
      },
    ],
  },
  {
    mission: 'm5_yahuar_pampa',
    dir: 'chanca',
    shots: [
      {
        id: 'cine-cusco',
        // Dusk over Cusco: the four pucarás around the centre, the pampa and the Chanca heights beyond.
        center: [92, 159],
        eye: [-34, 26, 30],
        look: [26, 0, -18],
        fov: 48,
        time: 0.62,
        stage: [],
      },
      {
        id: 'cine-defensa',
        // The Cusco line east of the pucarás as the first Chanca column crosses the pampa toward it.
        center: [123, 154],
        eye: [-4, 15, 28],
        look: [0, 0, -6],
        fov: 42,
        time: 0.6,
        stage: [
          { kind: 'soldier', owner: 0, from: [114, 146], to: [116, 162], count: 10, rows: 2, face: [150, 152] },
          { kind: 'chanca_warrior', owner: 1, from: [131, 144], to: [133, 160], count: 9, rows: 2, face: [100, 156] },
        ],
      },
    ],
  },
  {
    mission: 'm6_chimu_inca',
    dir: 'chimu',
    shots: [
      {
        id: 'cine-costa',
        // The adobe enclosures of Chan Chan on the desert coast, the Chimú capital the campaign marches on.
        center: [190, 87],
        eye: [-22, 20, 24],
        look: [6, 0, -4],
        fov: 46,
        time: 0.55,
        stage: [],
      },
      {
        id: 'cine-vanguardia',
        // The Inca vanguard on the coastal road from the camp toward Paramonga.
        center: [102, 146],
        eye: [18, 15, 22],
        look: [2, 0, -12],
        fov: 44,
        time: 0.5,
        stage: [
          { kind: 'soldier', owner: 0, from: [100, 142], to: [108, 148], count: 10, rows: 2, face: [150, 80] },
          { kind: 'musketeer', owner: 0, from: [94, 148], to: [100, 153], count: 6, rows: 2, face: [150, 80] },
        ],
      },
    ],
  },
  {
    mission: 'm6b_guerra_civil',
    dir: 'cusco-inca',
    shots: [
      {
        id: 'cine-cusco',
        // Morning over the Quipaipan site and Huáscar's headquarters beyond it: the throne the war is fought for.
        center: [166, 174],
        eye: [-30, 28, -22],
        look: [8, 0, 4],
        fov: 48,
        time: 0.4,
        stage: [],
      },
      {
        id: 'cine-quipaipan',
        // Atahualpa's line west of the Quipaipan enclosure, facing Huáscar's army drawn up beyond it.
        center: [150, 170],
        eye: [-30, 20, -6],
        look: [14, 0, 0],
        fov: 46,
        time: 0.42,
        stage: [
          { kind: 'soldier', owner: 0, from: [146, 160], to: [146, 180], count: 12, rows: 2, face: [190, 170] },
          { kind: 'soldier', owner: 1, from: [170, 148], to: [184, 150], count: 10, rows: 2, face: [150, 170] },
        ],
      },
    ],
  },
];
