/** Cinema intro stills for Culturas Preincas. See scripts/capture_cinema.mjs for the shot format. */
export const PREINCA_SHOTS = [
  {
    mission: 'm1_caral',
    dir: 'caral',
    shots: [
      {
        id: 'cine-aspero',
        // Morning at Áspero: the beach and the anchoveta shoals, the Huaca de los Ídolos on its rise.
        center: [36, 166],
        eye: [16, 20, 30],
        look: [-10, 0, -18],
        fov: 48,
        time: 0.3,
        stage: [{ kind: 'worker', owner: 0, from: [24, 168], to: [28, 176], count: 6, rows: 2, face: [14, 170] }],
      },
      {
        id: 'cine-obra',
        // The platform half-built: the community at work, not the finished pyramid.
        phase: 'fill',
        // The crew at the foot of the Pyramid Mayor's first platform, the city's terrace behind.
        center: [163.84, 53.184],
        eye: [32, 14, -2],
        look: [-20, 2, 14],
        fov: 44,
        time: 0.62,
        stage: [{ kind: 'worker', owner: 0, from: [164, 52], to: [164, 68], count: 12, rows: 2, face: [178, 40] }],
      },
    ],
  },
  {
    mission: 'm2_chavin',
    dir: 'chavin',
    shots: [
      {
        id: 'cine-valle',
        // The Old Temple standing, not its opening foundation slabs.
        phase: 'old_temple',
        // The ceremonial terrace in the Mosna valley, the mountains of the Callejón de Conchucos behind.
        center: [130.56, 116.74],
        eye: [-46, 44, 50],
        look: [6, 0, -12],
        fov: 48,
        time: 0.4,
        stage: [],
      },
      {
        id: 'cine-plaza',
        // The pilgrims reach the Old Temple.
        phase: 'old_temple',
        // Pilgrims arriving at the Old Temple with their offerings.
        center: [126, 124],
        eye: [-30, 24, 38],
        look: [0, 0, 0],
        fov: 44,
        time: 0.55,
        stage: [{ kind: 'worker', owner: 0, from: [104, 131], to: [116, 136], count: 12, rows: 2, face: [124, 118] }],
      },
    ],
  },
  {
    mission: 'm3_moche_recuay',
    dir: 'moche',
    shots: [
      {
        id: 'cine-huacas',
        // Dusk over the Huacas del Sol y de la Luna, seen from the sierra side toward the valley.
        center: [158.72, 97.28],
        eye: [46, 34, -42],
        look: [-10, 0, 12],
        fov: 48,
        time: 0.6,
        stage: [],
      },
      {
        id: 'cine-plaza',
        // The Moche line holds the plaza below the huacas as the first Recuay column comes through the gap.
        center: [164, 108],
        eye: [34, 20, 30],
        look: [-8, 0, -8],
        fov: 44,
        time: 0.58,
        stage: [
          { kind: 'soldier', owner: 0, from: [152, 112], to: [174, 112], count: 10, rows: 2, face: [163, 92] },
          { kind: 'musketeer', owner: 0, from: [156, 118], to: [170, 118], count: 4, rows: 1, face: [163, 92] },
          { kind: 'soldier', owner: 1, from: [161, 98], to: [166, 98], count: 6, rows: 3, face: [163, 112] },
        ],
      },
    ],
  },
  {
    mission: 'm4_wari',
    dir: 'wari',
    shots: [
      {
        id: 'cine-complejo',
        // The Wari complex at noon: the D-shaped temple, the plaza and the galleries among the andenes.
        center: [143.36, 115.2],
        eye: [-44, 30, 44],
        look: [8, 0, -8],
        fov: 48,
        time: 0.45,
        stage: [],
      },
      {
        id: 'cine-camino',
        // A crew on the road from Ayacucho toward the complex and the provincial nodes.
        center: [112, 150],
        eye: [-26, 18, 24],
        look: [12, 0, -8],
        fov: 44,
        time: 0.5,
        stage: [
          { kind: 'worker', owner: 0, from: [104, 154], to: [120, 146], count: 10, rows: 2, face: [143, 134] },
          { kind: 'wari_guardian', owner: 0, from: [122, 150], to: [126, 148], count: 2, rows: 1, face: [143, 134] },
        ],
      },
    ],
  },
];
