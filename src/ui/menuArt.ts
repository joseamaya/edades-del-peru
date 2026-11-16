/**
 * Menu art. It mixes in-engine captures with approved Blender renders; neither is a historical
 * photograph nor a reconstruction claim. Provenance: public/media/menu/PROVENANCE.md,
 * src/art/manifest.json and PROVENANCE.md (the Caral captures).
 */
import type { CampaignId } from '../campaign/defs/campaigns';
import { publicAsset } from '../util/publicAsset';

export const MENU_BACKDROP = publicAsset('media/menu/caral-dawn.webp');

export const CAMPAIGN_ART: Partial<Record<CampaignId, string>> = {
  preinca: publicAsset('media/caral/intro-ciudad.webp'),
  inca: publicAsset('media/tambotoco/intro-huanacaure.webp'),
  virreinato: publicAsset('media/lima/intro-ciudad.webp'),
  independencia: publicAsset('media/junta/intro-cabildo.webp'),
};

export const MISSION_ART: Partial<Record<string, string>> = {
  m1_caral: publicAsset('media/caral/intro-aspero.webp'),
  m2_chavin: publicAsset('media/generated/campaigns/la-senda-del-sol/m2_chavin/intro.webp'),
  m3_moche_recuay: publicAsset('media/moche/intro-valle.webp'),
  m4_wari: publicAsset('media/wari/intro-ayacucho.webp'),
  m5_yahuar_pampa: publicAsset('media/generated/campaigns/la-senda-del-sol/m5_yahuar/intro.webp'),
  m6_chimu_inca: publicAsset('media/chimu/intro-costa.webp'),
  m6b_guerra_civil: publicAsset('media/cusco-inca/intro-quipaipan.webp'),
  m8_independencia: publicAsset('media/independencia/intro-lima.webp'),
  m_junta_cusco: publicAsset('media/generated/campaigns/independencia/m_junta_cusco/intro.webp'),
  m_tambotoco: publicAsset('media/generated/campaigns/inca/m_tambotoco/intro.webp'),
  m_lima: publicAsset('media/generated/campaigns/virreinato/m_lima/intro.webp'),
  m7_tupac_amaru: publicAsset('media/cusco/intro-valle.webp'),
  m9_guerra_pacifico: publicAsset('media/generated/campaigns/republica/m9_guerra_pacifico/intro.webp'),
};
