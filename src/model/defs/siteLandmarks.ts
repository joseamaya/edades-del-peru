/**
 * Mission-scoped landmark compositions for authored sites whose bundled GLB is a labelled
 * abstraction from another place (Arica's battery for Callao, the Chanca pucará for Vilcabamba,
 * the bare ushnu platform for Cusco). The renderer draws them procedurally so the site keeps its
 * documented silhouette without shipping a new multi-megabyte model per mission.
 */
export type SiteLandmarkKind =
  | 'cusco-plaza'
  | 'sacsayhuaman'
  | 'real-felipe'
  | 'tarapaca-village'
  | 'tarapaca-heights'
  | 'tarapaca-pachica'
  | 'vilcabamba-refuge';

export interface MissionSiteLandmark {
  kind: SiteLandmarkKind;
  /** Normalized map centre (0..1). */
  x: number;
  z: number;
  /** Rotation around Y in radians. */
  yaw?: number;
  /** Uniform scale; defaults to 1. */
  scale?: number;
}
