import { CAMPAIGNS, type CampaignId } from './defs/campaigns';

export interface CampaignProgress {
  version: 2;
  completed: Record<string, string[]>;
}

const EMPTY: CampaignProgress = { version: 2, completed: {} };

function validCompleted(value: unknown): value is Record<string, string[]> {
  if (!value || typeof value !== 'object') return false;
  return Object.values(value as Record<string, unknown>).every(
    (list) => Array.isArray(list) && list.every((id) => typeof id === 'string'),
  );
}

/** Parse the stored progress, including the legacy numeric campaign index. */
export function parseCampaignProgress(raw: string | null): CampaignProgress {
  if (!raw) return { ...EMPTY, completed: {} };
  try {
    const parsed: unknown = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      const record = parsed as Record<string, unknown>;
      if (record.version === 2 && validCompleted(record.completed)) {
        return { version: 2, completed: record.completed };
      }
    }
  } catch {
    // legacy value is a plain number
  }
  const legacyText = raw.trim();
  if (!/^\d+$/.test(legacyText)) return { ...EMPTY, completed: {} };
  const legacy = Number.parseInt(legacyText, 10);
  if (!Number.isFinite(legacy) || legacy < 1) return { ...EMPTY, completed: {} };
  const preinca = CAMPAIGNS.find((c) => c.id === 'preinca');
  const completed = preinca ? preinca.releasedMissionIds.slice(0, legacy) : [];
  return { version: 2, completed: { preinca: completed } };
}

export function completedMissions(progress: CampaignProgress, campaignId: CampaignId): string[] {
  return progress.completed[campaignId] ?? [];
}

export function markMissionComplete(
  progress: CampaignProgress,
  campaignId: CampaignId,
  missionId: string,
): CampaignProgress {
  const current = completedMissions(progress, campaignId);
  if (current.includes(missionId)) return progress;
  return {
    version: 2,
    completed: { ...progress.completed, [campaignId]: [...current, missionId] },
  };
}

/** One playable mission on the series path, in play order. */
export interface SeriesMission {
  readonly campaignId: CampaignId;
  readonly missionId: string;
}

/** Every released mission of the series in play order: campaign by campaign, mission by mission. */
export function seriesMissions(): SeriesMission[] {
  return CAMPAIGNS.filter((c) => c.status === 'available').flatMap((c) =>
    c.releasedMissionIds.map((missionId) => ({ campaignId: c.id, missionId })),
  );
}

export function isMissionCompleted(progress: CampaignProgress, missionId: string): boolean {
  return Object.values(progress.completed).some((list) => list.includes(missionId));
}

/**
 * Missions open in order inside their campaign, and every campaign opens with its first mission: a fresh
 * profile can start any chapter, then each mission there opens once the previous one is completed. A
 * completed mission always stays open to replay.
 */
export function isMissionUnlocked(progress: CampaignProgress, missionId: string): boolean {
  const path = seriesMissions();
  const index = path.findIndex((m) => m.missionId === missionId);
  if (index < 0) return false;
  if (isMissionCompleted(progress, missionId)) return true;
  if (isCampaignOpening(missionId)) return true;
  return isMissionCompleted(progress, path[index - 1].missionId);
}

/** Whether this is the first released mission of its campaign. */
function isCampaignOpening(missionId: string): boolean {
  return CAMPAIGNS.some((campaign) => campaign.releasedMissionIds[0] === missionId);
}

/** A campaign is open once its first mission is; every campaign has an open first mission. */
export function isCampaignUnlocked(progress: CampaignProgress, campaignId: CampaignId): boolean {
  const first = seriesMissions().find((m) => m.campaignId === campaignId);
  return !!first && isMissionUnlocked(progress, first.missionId);
}

/**
 * The next mission of the main line: the first unfinished mission whose predecessor is completed, or null
 * once the whole path is done. The campaign openings are shortcuts for the menu, not the main line.
 */
export function nextSeriesMission(progress: CampaignProgress): SeriesMission | null {
  const path = seriesMissions();
  for (let i = 0; i < path.length; i++) {
    const mission = path[i]!;
    if (isMissionCompleted(progress, mission.missionId)) continue;
    if (i === 0 || isMissionCompleted(progress, path[i - 1]!.missionId)) return mission;
  }
  return null;
}
