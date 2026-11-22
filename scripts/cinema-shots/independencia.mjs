/** Cinema intro stills for La Independencia. See scripts/capture_cinema.mjs for the shot format. */
export const INDEPENDENCIA_SHOTS = [
  {
    mission: 'm_junta_cusco',
    dir: 'junta',
    shots: [
      {
        id: 'cine-cusco',
        // Morning over the colonial Cusco: the plaza and the cabildo, the valley opening south-east behind.
        center: [72, 58],
        eye: [-30, 34, -26],
        look: [26, 0, 24],
        fov: 48,
        time: 0.3,
        stage: [],
      },
      {
        id: 'cine-apacheta',
        // The Junta's column on the Apacheta pass as the royalist vanguard climbs from the south-east.
        center: [140, 168],
        eye: [-20, 16, -22],
        look: [14, 0, 14],
        fov: 40,
        time: 0.42,
        stage: [
          {
            kind: 'patriota_montonera',
            owner: 0,
            from: [134, 168],
            to: [146, 160],
            count: 8,
            rows: 2,
            face: [168, 192],
          },
          { kind: 'soldier', owner: 0, from: [132, 174], to: [142, 166], count: 8, rows: 2, face: [168, 192] },
          { kind: 'soldier', owner: 1, from: [150, 184], to: [160, 176], count: 7, rows: 2, face: [138, 168] },
          { kind: 'realista_dragon', owner: 1, from: [160, 186], to: [164, 182], count: 2, rows: 1, face: [138, 168] },
        ],
      },
    ],
  },
  {
    mission: 'm_lima_1821',
    dir: 'lima-1821',
    shots: [
      {
        id: 'cine-lima',
        // The capital on the Rímac plain, seen from the coast road with the valley behind it.
        center: [90, 150],
        eye: [-30, 38, 30],
        look: [6, 0, -6],
        fov: 48,
        time: 0.3,
        stage: [],
      },
      {
        id: 'cine-lurin',
        // The montoneras astride the Lurín road, the supply line of Lima.
        center: [128, 184],
        eye: [22, 17, 22],
        look: [-10, 0, -10],
        fov: 44,
        time: 0.45,
        stage: [
          {
            kind: 'patriota_montonera',
            owner: 0,
            from: [121, 191],
            to: [133, 177],
            count: 8,
            rows: 2,
            face: [96, 156],
          },
          { kind: 'soldier', owner: 0, from: [127, 196], to: [139, 182], count: 6, rows: 2, face: [96, 156] },
        ],
      },
    ],
  },
  {
    mission: 'm8_independencia',
    dir: 'independencia',
    shots: [
      {
        id: 'cine-ayacucho',
        // The high pampa of Ayacucho and the royalist field below the ridges.
        center: [180, 95],
        eye: [-40, 40, 34],
        look: [4, 0, -4],
        fov: 48,
        time: 0.3,
        stage: [],
      },
      {
        id: 'cine-junin',
        // The patriot cavalry formed on the Junín pampa, facing the royalist charge from the east.
        center: [132, 161],
        eye: [30, 18, 26],
        look: [-6, 0, -4],
        fov: 42,
        time: 0.42,
        stage: [
          { kind: 'cavalry', owner: 0, from: [128, 152], to: [128, 168], count: 8, rows: 2, face: [160, 170] },
          {
            kind: 'patriota_montonera',
            owner: 0,
            from: [122, 170],
            to: [128, 176],
            count: 4,
            rows: 1,
            face: [160, 170],
          },
          { kind: 'realista_dragon', owner: 1, from: [146, 156], to: [150, 170], count: 6, rows: 2, face: [124, 160] },
        ],
      },
    ],
  },
  {
    mission: 'm_real_felipe',
    dir: 'real-felipe',
    shots: [
      {
        id: 'cine-bastion',
        // The Real Felipe at dusk, its bastions over the bay of the Callao.
        center: [180, 97],
        eye: [34, 30, -32],
        look: [-6, 0, 6],
        fov: 46,
        time: 0.33,
        stage: [],
      },
      {
        id: 'cine-baterias',
        // A siege battery on the approaches, its guns turned on the fortress.
        center: [141, 123],
        eye: [-26, 16, 24],
        look: [14, 0, -10],
        fov: 42,
        time: 0.4,
        stage: [
          { kind: 'artillery', owner: 0, from: [138, 120], to: [146, 126], count: 3, rows: 1, face: [180, 97] },
          { kind: 'rifleman', owner: 0, from: [132, 126], to: [142, 132], count: 8, rows: 2, face: [180, 97] },
        ],
      },
    ],
  },
];
