let nextId = 1;

export function allocId(): number {
  return nextId++;
}

/** Ensure future ids are greater than `maxId` (used when restoring a save). */
export function reserveIds(maxId: number): void {
  if (maxId >= nextId) nextId = maxId + 1;
}
