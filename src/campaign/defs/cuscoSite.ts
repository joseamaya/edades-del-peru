import { CUSCO_INCA_MAP_SIZE, cuscoIncaPoint } from '../../model/defs/cuscoIncaSite';
import type { MissionSiteLandmark } from '../../model/defs/siteLandmarks';

/**
 * Cusco and Quipaipán share one authored site. Both missions anchor the city on the site's own point, and the
 * bundled GLB is a bare grey ushnu, so both hide it and draw the same civic centre instead of one campaign
 * showing the placeholder and the other the finished composition.
 */
export const CUSCO_SITE_POINT = cuscoIncaPoint({ x: 124.8, z: 130.6 });

/** Sacsayhuamán, north-west of the city, in the same former 192 m frame. */
export const CUSCO_SITE_SACSAY = cuscoIncaPoint({ x: 118.5, z: 105.75 });

/** Plaza, tiered ushnu and the Sacsayhuamán wall front, anchored like the city. */
export function cuscoSiteLandmarks(): MissionSiteLandmark[] {
  return [
    {
      kind: 'cusco-plaza',
      x: CUSCO_SITE_POINT.x / CUSCO_INCA_MAP_SIZE,
      z: CUSCO_SITE_POINT.z / CUSCO_INCA_MAP_SIZE,
    },
    {
      kind: 'sacsayhuaman',
      x: CUSCO_SITE_SACSAY.x / CUSCO_INCA_MAP_SIZE,
      z: CUSCO_SITE_SACSAY.z / CUSCO_INCA_MAP_SIZE,
    },
  ];
}
