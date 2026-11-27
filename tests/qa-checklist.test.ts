import { describe, expect, it } from 'vitest';
import { MISSIONS } from '../src/campaign/defs/campaign';
import { buildChecklist, checklistProblems, missionBrief } from '../scripts/qa_checklist_lib';

const mission = (id: string) => MISSIONS.find((def) => def.id === id)!;

describe('campaign playtest checklist', () => {
  it('finds no structural problems in the released campaign', () => {
    expect(checklistProblems(MISSIONS)).toEqual([]);
  });

  it('lists every mission with its own required objectives, and keeps the sign-off out of the worksheet', () => {
    const text = buildChecklist(MISSIONS);
    for (const def of MISSIONS) {
      expect(text, def.id).toContain(`(${def.id})`);
    }
    // `review/` is gitignored: the verdict belongs in the tracked table of docs/design/human-playtest.md.
    expect(text).toContain('The **sign-off is not written here**');
    expect(text).not.toContain('| Mission | Played by |');
    // Seven boxes every mission has (briefing, tutorial, objectives, audio, victory, save, viewports, jank),
    // plus the conditional beats.
    const boxes = text.match(/^- \[ \] /gm)?.length ?? 0;
    expect(boxes).toBeGreaterThanOrEqual(MISSIONS.length * 8);
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
    // Junín's charge breaks off with a `withdraw`; the checklist names it and asks for a box.
    expect(missionBrief(mission('m8_independencia')).withdrawals).toBeGreaterThan(0);
    expect(buildChecklist([mission('m8_independencia')])).toContain(
      '- [ ] The withdrawal pulls off the units it names',
    );
    // A mission without a withdrawal never gets that box.
    expect(buildChecklist([mission('m_cusco_1536')])).not.toContain('The withdrawal pulls off');
    // Campaign-level checks are listed once, not per mission.
    expect(buildChecklist(MISSIONS)).toContain('The unlock order opens missions in sequence');
  });

  it('narrows to one mission on request', () => {
    const text = buildChecklist(MISSIONS, { only: 'm1_caral' });
    expect(text).toContain('(m1_caral)');
    expect(text).not.toContain('(m2_chavin)');
  });

  it('flags a mission that could not be won, but accepts a grouped alternative', () => {
    const base = mission('m1_caral').objectives[0]!;
    const optionalOnly = { ...mission('m1_caral'), objectives: [{ ...base, optional: true }] };
    expect(checklistProblems([optionalOnly])).toContain('m1_caral: no required objective, so it cannot be won');
    const grouped = { ...mission('m1_caral'), objectives: [{ ...base, group: 'strategy' }] };
    expect(checklistProblems([grouped])).toEqual([]);
    const empty = { ...mission('m1_caral'), objectives: [] };
    expect(checklistProblems([empty])).toContain('m1_caral: no required objective, so it cannot be won');
  });

  it('flags a mission listed twice', () => {
    expect(checklistProblems([mission('m1_caral'), mission('m1_caral')])).toContain('m1_caral: listed twice');
  });
});
