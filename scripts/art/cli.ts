import path from 'node:path';
import { ingestBlenderRenders, loadManifest, saveManifest } from './ingest';
import { formatIssues, validateManifestFiles } from './validate';
import { MANIFEST_PATH, REPO_ROOT } from './paths';

type FlagValue = string | true | undefined;
type Flags = Record<string, FlagValue>;

interface ParsedArgs {
  command: string;
  positional: string[];
  flags: Flags;
}

function parseArgs(argv: string[]): ParsedArgs {
  const [command = 'help', ...rest] = argv;
  const positional: string[] = [];
  const flags: Flags = {};
  for (const arg of rest) {
    if (!arg.startsWith('--')) {
      positional.push(arg);
      continue;
    }
    const body = arg.slice(2);
    const separator = body.indexOf('=');
    const key = separator >= 0 ? body.slice(0, separator) : body;
    flags[key] = separator >= 0 ? body.slice(separator + 1) : true;
  }
  return { command, positional, flags };
}

function str(flags: Flags, key: string): string | undefined {
  const value = flags[key];
  return typeof value === 'string' ? value : undefined;
}

function bool(flags: Flags, key: string): boolean {
  const value = flags[key];
  return value === true || value === '1' || value === 'true';
}

function onlyArg(flags: Flags): Set<string> | undefined {
  const value = str(flags, 'only');
  if (!value) return undefined;
  return new Set(
    value
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean),
  );
}

function printUsage(): void {
  console.log(`Edades del Perú — Blender art pipeline

Usage:
  yarn art:blender [--manifest=art-src/blender/caral/renders.json]
                   [--source-root=art-src/blender]
                   [--only=id1,id2] [--force] [--dry-run]
  yarn art:validate
  yarn art:review --id=ASSET_ID --reviewer=NAME --approve|--reject

The Blender sources live in art-src/blender (LFS for .blend/.xcf). The ingestion
verifies the source PNG SHA-256, converts it to budgeted WebP and writes the manifest.
`);
}

async function main(): Promise<void> {
  const parsed = parseArgs(process.argv.slice(2));
  const flags = parsed.flags;

  switch (parsed.command) {
    case 'help':
    case '--help':
    case '-h':
      printUsage();
      return;
    case 'blender': {
      const result = await ingestBlenderRenders({
        manifestPath: str(flags, 'manifest'),
        sourceRoot: str(flags, 'source-root'),
        only: onlyArg(flags),
        force: bool(flags, 'force'),
        dryRun: bool(flags, 'dry-run'),
        onProgress: (message) => console.log(message),
      });
      console.log('');
      if (result.generated.length) console.log(`Ingested: ${result.generated.length}`);
      if (result.skipped.length) console.log(`Skipped: ${result.skipped.length}`);
      if (result.errors.length) {
        console.error(result.errors.join('\n'));
        process.exitCode = 1;
      }
      if (result.issues.length) {
        console.error(formatIssues(result.issues));
        process.exitCode = 1;
      }
      if (result.ok && !bool(flags, 'dry-run')) console.log(`Manifest: ${path.relative(REPO_ROOT, MANIFEST_PATH)}`);
      return;
    }
    case 'validate': {
      const issues = await validateManifestFiles(loadManifest(), REPO_ROOT);
      if (issues.length) {
        console.error(formatIssues(issues));
        process.exitCode = 1;
        return;
      }
      console.log('Manifest and Blender render assets are valid.');
      return;
    }
    case 'review': {
      const id = str(flags, 'id');
      if (!id) throw new Error('review requires --id=ASSET_ID');
      const approve = bool(flags, 'approve');
      const reject = bool(flags, 'reject');
      if (approve === reject) throw new Error('review requires exactly one of --approve or --reject');
      const reviewer = str(flags, 'reviewer') ?? 'human';
      const manifest = loadManifest();
      const record = manifest.assets.find((asset) => asset.id === id);
      if (!record) throw new Error(`Unknown asset "${id}"`);
      record.reviewed = approve;
      record.reviewer = approve ? reviewer : null;
      record.reviewedAt = approve ? new Date().toISOString() : null;
      saveManifest(manifest);
      console.log(`${record.id}: reviewed=${record.reviewed} reviewer=${record.reviewer ?? '—'}`);
      return;
    }
    default:
      printUsage();
      process.exitCode = 1;
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
