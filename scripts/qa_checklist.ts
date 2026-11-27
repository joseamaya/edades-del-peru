import fs from 'node:fs';
import path from 'node:path';
import { MISSIONS } from '../src/campaign/defs/campaign';
import { buildChecklist, checklistProblems } from './qa_checklist_lib';

/**
 * Print the human playtest checklist for the released campaign, generated from the missions themselves so a
 * new objective, optional goal, fire or prepared strike shows up in the checklist without anyone editing it.
 *
 * The automated tiers already prove the missions are completable and deterministic (`yarn test:e2e:slow`,
 * `yarn sim --matrix --assert-balance`); this list is what only a person can judge: readability, pacing,
 * whether the art matches the card, and whether the fun holds for the whole act.
 *
 * Usage: yarn qa:checklist [--mission=ID] [--out=review/qa-checklist.md] [--no-copy]
 */
const arg = (name: string, fallback = ''): string => {
  const hit = process.argv.find((value) => value.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
};

const only = arg('mission');
const outFile = arg('out', 'review/qa-checklist.md');
const withCopy = !process.argv.includes('--no-copy');

const text = buildChecklist(MISSIONS, { only });
if (withCopy) console.log(text);
if (outFile) {
  const target = path.resolve(outFile);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, `${text}\n`);
  console.error(`wrote ${outFile}`);
}

const problems = checklistProblems(MISSIONS);
if (problems.length) {
  console.error(`checklist problems:\n  ${problems.join('\n  ')}`);
  process.exitCode = 1;
}
