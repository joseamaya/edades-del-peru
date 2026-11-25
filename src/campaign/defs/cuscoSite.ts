import { CUSCO_CITY_PLAZA, CUSCO_CITY_SACSAY } from '../../model/defs/cuscoCity';

/**
 * Cusco and Quipaipán share one authored site. Both missions anchor the city on the site's own point and hide
 * the bundled GLB (a bare grey ushnu); the city itself is the Cusco architecture kit (`model/defs/cuscoCity.ts`).
 */
export const CUSCO_SITE_POINT = CUSCO_CITY_PLAZA;

/** Sacsayhuamán, north-west of the city, in the same former 192 m frame. */
export const CUSCO_SITE_SACSAY = CUSCO_CITY_SACSAY;
