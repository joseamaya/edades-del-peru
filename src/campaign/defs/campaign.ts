import type { MissionDef } from '../types';
import { m1Caral } from './missions/m1_caral';
import { m2Chavin } from './missions/m2_chavin';
import { m3MocheRecuay } from './missions/m3_moche_recuay';
import { m4Wari } from './missions/m4_wari';
import { mTambotoco } from './missions/m_tambotoco';
import { m5YahuarPampa } from './missions/m5_yahuar_pampa';
import { m6ChimuInca } from './missions/m6_chimu_inca';
import { m6bGuerraCivil } from './missions/m6b_guerra_civil';
import { mLima } from './missions/m_lima';
import { m7TupacAmaru } from './missions/m7_tupac_amaru';
import { mJuntaCusco } from './missions/m_junta_cusco';
import { m8Independencia } from './missions/m8_independencia';

/** Every released mission in campaign order; each one lives in its own file under `missions/`. */
export const MISSIONS: MissionDef[] = [
  m1Caral,
  m2Chavin,
  m3MocheRecuay,
  m4Wari,
  mTambotoco,
  m5YahuarPampa,
  m6ChimuInca,
  m6bGuerraCivil,
  mLima,
  m7TupacAmaru,
  mJuntaCusco,
  m8Independencia,
];

export function getMission(id: string): MissionDef | undefined {
  return MISSIONS.find((m) => m.id === id);
}
