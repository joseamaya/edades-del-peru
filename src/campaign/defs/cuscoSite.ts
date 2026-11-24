import { cuscoIncaPoint } from '../../model/defs/cuscoIncaSite';

/**
 * Cusco and Quipaipán share one authored site. Both missions anchor the city on the site's own point and hide
 * the bundled GLB (a bare grey ushnu); the city itself is the Cusco architecture kit (`model/defs/cuscoCity.ts`).
 */
export const CUSCO_SITE_POINT = cuscoIncaPoint({ x: 124.8, z: 130.6 });

/** Sacsayhuamán, north-west of the city, in the same former 192 m frame. */
export const CUSCO_SITE_SACSAY = cuscoIncaPoint({ x: 118.5, z: 105.75 });
