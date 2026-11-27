import { describe, expect, it } from 'vitest';
import { MISSIONS } from '../src/campaign/defs/campaign';
import { buildChecklist, checklistProblems, missionBrief } from '../scripts/qa_checklist_lib';

const mission = (id: string) => MISSIONS.find((def) => def.id === id)!;

describe('campaign playtest checklist', () => {
  it('finds no structural problems in the released campaign', () => {
    expect(checklistProblems(MISSIONS)).toEqual([]);
  });

  it('lists every mission with its own required objectives and sign-off row', () => {
    const text = buildChecklist(MISSIONS);
    for (const def of MISSIONS) {
      expect(text, def.id).toContain(`(${def.id})`);
      expect(text).toContain(`| ${def.title} | | | | |`);
    }
    // Five boxes every mission has (briefing, objectives, victory, save, jank), plus the conditional beats.
    const boxes = text.match(/^- \[ \] /gm)?.length ?? 0;
    expect(boxes).toBeGreaterThanOrEqual(MISSIONS.length * 5);
    expect(boxes).toBeLessThanOrEqual(MISSIONS.length * 8);
  });

  it('derives the beats a person has to watch from the mission, not from prose', () => {
    // Fires are objective-bound presentation (ADR 0011).
    expect(missionBrief(mission('m_cusco_1536')).fires).toBeGreaterThan(0);
    expect(buildChecklist([mission('m_cusco_1536')])).toContain('- [ ] The fire lights when its objective completes');
    // Arica's mines and Breña's galgas are prepared strikes with their own condition.
    expect(missionBrief(mission('m9_guerra_pacifico')).strikes).toBeGreaterThan(0);
    expect(buildChecklist([mission('m9_guerra_pacifico')])).toContain('- [ ] The prepared strike fires once');
    // The Moche exchange still has its elite optional after the closing objective landed.
    const moche = missionBrief(mission('m3_moche_recuay'));
    expect(moche.optional.length).toBeGreaterThan(0);
    expect(buildChecklist([mission('m3_moche_recuay')])).toContain('- [ ] The optional goal is achievable');
    // Junín's charge breaks off with a `withdraw`; the checklist names it.
    expect(missionBrief(mission('m8_independencia')).withdrawals).toBeGreaterThan(0);
  });

  it('narrows to one mission on request', () => {
    const text = buildChecklist(MISSIONS, { only: 'm1_caral' });
    expect(text).toContain('(m1_caral)');
    expect(text).not.toContain('(m2_chavin)');
  });

  it('flags a mission that could not be won', () => {
    const broken = { ...mission('m1_caral'), objectives: [{ ...mission('m1_caral').objectives[0]!, optional: true }] };
    expect(checklistProblems([broken])).toContain('m1_caral: no required objective');
  });
});
