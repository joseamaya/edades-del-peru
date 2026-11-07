/**
 * Menu art. All of it is captured from the running game (in-engine recreations): never a Blender
 * render, a historical photograph or a reconstruction claim. Provenance: public/media/menu/PROVENANCE.md
 * and PROVENANCE.md (the Caral captures). Campaigns without art fall back to their accent colour.
 */
import type { CampaignId } from '../campaign/defs/campaigns';
import { publicAsset } from '../util/publicAsset';

export const MENU_BACKDROP = publicAsset('media/menu/caral-dawn.webp');

export const CAMPAIGN_ART: Partial<Record<CampaignId, string>> = {
  preinca: publicAsset('media/caral/intro-ciudad.webp'),
};

export const MISSION_ART: Partial<Record<string, string>> = {
  m1_caral: publicAsset('media/caral/intro-aspero.webp'),
};
