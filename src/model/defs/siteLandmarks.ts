/**
 * Mission-scoped landmark compositions for authored sites whose bundled GLB is a labelled
 * abstraction from another place (the Chanca pucará for Vilcabamba). The renderer draws them
 * procedurally so the site keeps its documented silhouette without shipping a new multi-megabyte
 * model per mission.
 */
export type SiteLandmarkKind = 'vilcabamba-refuge';

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
