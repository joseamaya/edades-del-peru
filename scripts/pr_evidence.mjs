import { execFileSync } from 'child_process';
import { cliArg } from './lib.mjs';
import { formatEvidence } from './pr_evidence_lib.mjs';

const USAGE = `Print the visual evidence a branch needs, as a PR-ready markdown block.

Usage:
  yarn evidence [--base=<ref>] [--staged]

  --base=<ref>   Diff against <ref> (default: origin/main, then main)
  --staged       Inspect the index plus untracked files (pre-commit check)
  --help         This text

Warns only: it never judges the diff. It exits non-zero only when it cannot run
(not a git repository, unknown base).`;

if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(USAGE);
  process.exit(0);
}

const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim();
const toPaths = (output) => output.split('\n').filter(Boolean);

const fallible = (run) => {
  try {
    return run();
  } catch {
    return null;
  }
};

const resolves = (ref) => fallible(() => git('rev-parse', '--verify', '--quiet', `${ref}^{commit}`)) !== null;

if (fallible(() => git('rev-parse', '--is-inside-work-tree')) === null) {
  console.error('yarn evidence: not a git repository.');
  process.exit(1);
}

if (process.argv.includes('--staged')) {
  const staged = toPaths(git('diff', '--cached', '--name-only'));
  const untracked = toPaths(git('ls-files', '--others', '--exclude-standard'));
  console.log(formatEvidence([...new Set([...staged, ...untracked])], { base: 'the index' }));
  process.exit(0);
}

const base = cliArg('base', resolves('origin/main') ? 'origin/main' : 'main');
if (!resolves(base)) {
  console.error(`yarn evidence: unknown base "${base}". Pass --base=<ref>.`);
  process.exit(1);
}

console.log(formatEvidence(toPaths(git('diff', '--name-only', `${base}...HEAD`)), { base }));
