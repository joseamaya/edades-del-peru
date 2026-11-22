import { PREINCA_SHOTS } from './preinca.mjs';
import { INCA_SHOTS } from './inca.mjs';
import { VIRREINATO_SHOTS } from './virreinato.mjs';
import { INDEPENDENCIA_SHOTS } from './independencia.mjs';
import { REPUBLICA_SHOTS } from './republica.mjs';

/** Every mission's cinema stills, one file per campaign. */
export const CINEMA_SHOTS = [
  ...PREINCA_SHOTS,
  ...INCA_SHOTS,
  ...VIRREINATO_SHOTS,
  ...INDEPENDENCIA_SHOTS,
  ...REPUBLICA_SHOTS,
];
