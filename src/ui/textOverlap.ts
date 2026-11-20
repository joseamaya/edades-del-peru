/** Normalized token overlap for two player-facing texts (0..1). Used to avoid repeating an epilogue. */
export function textOverlap(a: string, b: string): number {
  const tokens = (value: string): Set<string> =>
    new Set(
      value
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .match(/[a-z0-9]{4,}/g) ?? [],
    );
  const left = tokens(a);
  const right = tokens(b);
  if (left.size === 0 || right.size === 0) return 0;
  let common = 0;
  for (const token of left) if (right.has(token)) common++;
  return common / Math.min(left.size, right.size);
}
