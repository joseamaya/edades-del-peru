import type { MissionSiteLandmark } from '../../model/defs/siteLandmarks';

/**
 * Cusco and Quipaipán share one authored site: the site anchor is `cuscoIncaPoint({ x: 124.8, z: 130.6 })`,
 * which lands on the 256 m grid at the same point both missions use for the city. The bundled GLB is a bare
 * grey ushnu, so both missions hide it and draw the same civic centre instead of one showing the placeholder
 * and the other the finished composition.
 */
export const CUSCO_SITE_CITY = { x: 166, z: 174 } as const;
export const CUSCO_SITE_SACSAY = { x: 158, z: 141 } as const;

/** Plaza, tiered ushnu and the Sacsayhuamán wall front, anchored like the city. */
export function cuscoSiteLandmarks(): MissionSiteLandmark[] {
  return [
    { kind: 'cusco-plaza', x: CUSCO_SITE_CITY.x / 256, z: CUSCO_SITE_CITY.z / 256 },
    { kind: 'sacsayhuaman', x: CUSCO_SITE_SACSAY.x / 256, z: CUSCO_SITE_SACSAY.z / 256 },
  ];
}
