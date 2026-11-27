import fs from 'node:fs';
import path from 'node:path';
import { MISSIONS } from '../src/campaign/defs/campaign';
import { buildChecklist, checklistProblems } from './qa_checklist_lib';

/**
 * Print the human playtest worksheet for the released campaign, generated from the missions themselves so a new
 * objective, optional goal, fire, prepared strike or withdrawal shows up without anyone editing a document.
 *
 * The automated tiers prove the missions are playable and deterministic (`yarn verify:fast`,
 * `yarn test:e2e:slow`); this list is what only a person can judge: readability, pacing, art-to-beat match, audio,
 * the three HUD viewports and whether the act is fun. The sign-off lives in `docs/design/human-playtest.md`.
 *
 * Usage: yarn qa:checklist [--mission=ID] [--out=review/qa-checklist.md] [--no-copy]
 *   `--out=` (empty) prints without writing a file.
 */
const arg = (name: string, fallback: string | undefined = ''): string => {
  const hit = process.argv.find((value) => value.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : (fallback ?? '');
};

const only = arg('mission');
const outFile = process.argv.includes('--out=') ? '' : arg('out', 'review/qa-checklist.md');
const withCopy = !process.argv.includes('--no-copy');

const selected = MISSIONS.filter((mission) => !only || mission.id === only);
const problems = checklistProblems(selected);
const text = buildChecklist(MISSIONS, { only });
if (withCopy) console.log(text);
if (outFile) {
  const target = path.resolve(outFile);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, `${text}\n`);
  console.error(`wrote ${outFile}`);
}

if (problems.length) {
  console.error(`checklist problems:\n  ${problems.join('\n  ')}`);
  process.exitCode = 1;
}
