/** Cinema intro stills for La República. See scripts/capture_cinema.mjs for the shot format. */
export const REPUBLICA_SHOTS = [
  {
    mission: 'm_tarapaca',
    dir: 'tarapaca',
    shots: [
      {
        id: 'cine-quebrada',
        // Dawn over the quebrada: the village on the valley floor, the heights and Pachica behind it.
        center: [96, 168],
        eye: [-38, 24, 40],
        look: [34, 0, -26],
        fov: 48,
        time: 0.27,
        stage: [],
      },
      {
        id: 'cine-linea',
        // The Peruvian line east of the village as the first column crosses the plain toward it.
        center: [122, 168],
        eye: [-26, 17, 22],
        look: [16, 0, -4],
        fov: 42,
        time: 0.42,
        stage: [
          {
            kind: 'republica_defensor',
            owner: 0,
            from: [124, 161],
            to: [125, 175],
            count: 10,
            rows: 2,
            face: [160, 168],
          },
          { kind: 'chile_infante', owner: 1, from: [146, 160], to: [148, 174], count: 8, rows: 2, face: [100, 168] },
        ],
      },
    ],
  },
  {
    mission: 'm9_guerra_pacifico',
    dir: 'arica',
    shots: [
      {
        id: 'cine-puerto',
        // The port terrace above the Pacific at morning: the cuartel and the fort, the sea to the west.
        center: [97, 153],
        eye: [44, 40, 34],
        look: [-30, 0, -22],
        fov: 48,
        time: 0.36,
        stage: [],
      },
      {
        id: 'cine-linea',
        // The garrison on the cuartel line as the first Chilean column crests the northern approach.
        center: [100, 116],
        eye: [36, 22, 8],
        look: [-10, 0, 0],
        fov: 44,
        time: 0.42,
        stage: [
          {
            kind: 'republica_defensor',
            owner: 0,
            from: [90, 127],
            to: [108, 127],
            count: 10,
            rows: 2,
            face: [100, 104],
          },
          { kind: 'chile_infante', owner: 1, from: [92, 104], to: [108, 102], count: 8, rows: 2, face: [100, 127] },
        ],
      },
    ],
  },
  {
    mission: 'm_miraflores',
    dir: 'miraflores',
    shots: [
      {
        id: 'cine-lima',
        // Lima from the south at morning, the open ground of the Miraflores line in front of it.
        center: [90, 150],
        eye: [36, 32, 36],
        look: [-10, 0, -10],
        fov: 48,
        time: 0.36,
        stage: [],
      },
      {
        id: 'cine-linea',
        // Reservists on the Miraflores line as the Chilean infantry comes up from San Juan.
        center: [112, 197],
        eye: [36, 22, 12],
        look: [-8, 0, 0],
        fov: 44,
        time: 0.42,
        stage: [
          {
            kind: 'republica_defensor',
            owner: 0,
            from: [102, 188],
            to: [122, 188],
            count: 10,
            rows: 2,
            face: [112, 210],
          },
          { kind: 'chile_infante', owner: 1, from: [104, 207], to: [120, 209], count: 8, rows: 2, face: [112, 188] },
        ],
      },
    ],
  },
  {
    mission: 'm_brena',
    dir: 'brena',
    shots: [
      {
        id: 'cine-mantaro',
        // The Mantaro valley at morning: the camp on the valley floor and the passes toward the north-east.
        center: [90, 161],
        eye: [-40, 44, 6],
        look: [36, 0, -6],
        fov: 46,
        time: 0.28,
        stage: [],
      },
      {
        id: 'cine-paso',
        // Guerrillas meeting a Chilean column in the open valley north-west of the camp (on the pass itself,
        // live fire left blast rings in the frame); Huamachuco and the camp sit in the background.
        center: [64, 126],
        eye: [-34, 24, 10],
        look: [8, 0, -2],
        fov: 44,
        time: 0.42,
        stage: [
          { kind: 'republica_defensor', owner: 0, from: [54, 134], to: [72, 134], count: 10, rows: 2, face: [63, 116] },
          { kind: 'chile_infante', owner: 1, from: [56, 117], to: [72, 117], count: 8, rows: 2, face: [63, 134] },
        ],
      },
    ],
  },
];
