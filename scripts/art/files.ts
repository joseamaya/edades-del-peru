import fs from 'node:fs';
import path from 'node:path';

/** Collect files with the given extension under `dir`, recursively and sorted. */
export function collectFiles(dir: string, extension: string): string[] {
  const out: string[] = [];
  const walk = (current: string): void => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.isFile() && entry.name.toLowerCase().endsWith(extension)) out.push(full);
    }
  };
  walk(dir);
  return out.sort();
}
