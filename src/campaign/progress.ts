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
