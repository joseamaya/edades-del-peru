import { Era, CivId, UnitKind, BuildingKind, Resources, MapType } from '../core/types';

/** Punto del mundo. `ref` ancla al centro del jugador/enemigo; sin `ref` es absoluto. */
export interface MissionPoint {
  ref?: 'jugador' | 'enemigo';
  dx: number;
  dz: number;
}

export type ObjectiveKind =
  | 'destruir'
  | 'eliminar_todos'
  | 'sobrevivir'
  | 'alcanzar'
  | 'defender'
  | 'proteger'
  | 'construir'
  | 'recolectar'
  | 'alcanzar_era';

export interface ObjectiveDef {
  id: string;
  kind: ObjectiveKind;
  titulo: string;
  cantidad?: number;
  entityTag?: string;
  pos?: MissionPoint;
  radio?: number;
  time?: number;
  buildingKind?: BuildingKind;
  resource?: keyof Resources;
  era?: Era;
  oculto?: boolean;
}

export type TriggerCond =
  | { tipo: 'tiempo'; segundos: number }
  | { tipo: 'objetivo'; objetivoId: string; estado: 'activar' | 'completado' | 'fallado' }
  | { tipo: 'entidad_muerta'; entityTag: string }
  | { tipo: 'unidad_cerca'; entityTag: string; pos: MissionPoint; radio: number };

export type TriggerEffect =
  | { tipo: 'oleada'; owner: 0 | 1; unidades: { kind: UnitKind; cantidad: number }[]; pos: MissionPoint; radio?: number; objetivo?: 'base' | 'posicion' }
  | { tipo: 'reforzar'; owner: 0 | 1; unidades: { kind: UnitKind; cantidad: number }[]; pos: MissionPoint; radio?: number; objetivo?: 'base' | 'posicion' }
  | { tipo: 'dialogo'; texto: string; duracion?: number }
  | { tipo: 'objetivo'; objetivoId: string; estado: 'activar' | 'completar' | 'fallar' }
  | { tipo: 'camara'; pos: MissionPoint }
  | { tipo: 'victoria' }
  | { tipo: 'derrota'; texto: string };

export interface TriggerDef {
  id: string;
  condicion: TriggerCond;
  efectos: TriggerEffect[];
  /** Si es true, el trigger puede volver a dispararse tras `cooldown` segundos. */
  repetir?: boolean;
  cooldown?: number;
}

export interface MissionDef {
  id: string;
  titulo: string;
  subtitulo: string;
  historia: string;
  victoria: string;
  derrota: string;
  civJugador: CivId;
  civEnemigo: CivId;
  mapa: { seed: number; tipo: MapType; tamano: number };
  horaDia: 'mañana' | 'mediodía' | 'atardecer' | 'noche';
  eraInicial: Era;
  recursosIniciales: Resources;
  inicio: {
    edificios?: { kind: BuildingKind; dx: number; dz: number; tag?: string }[];
    unidades?: { kind: UnitKind; dx: number; dz: number; tag?: string; cantidad?: number }[];
  };
  /** Etiqueta edificios existentes al comenzar (p. ej. el centro enemigo). */
  marcar?: { tag: string; kind: BuildingKind; owner: 0 | 1 }[];
  enemigo: { activo: boolean; dificultad: 'facil' | 'normal' | 'dificil' | 'legendario'; agresion: number };
  objetivos: ObjectiveDef[];
  triggers: TriggerDef[];
}
