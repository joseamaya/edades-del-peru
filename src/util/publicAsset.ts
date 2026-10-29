/** Join a Vite public base with a path below `public/`. */
export function joinPublicBase(base: string, path: string): string {
  const prefix = base.endsWith('/') ? base : `${base}/`;
  return `${prefix}${path.replace(/^\/+/, '')}`;
}

/** Resolve a file under `public/` for the current Vite base. */
export function publicAsset(path: string): string {
  return joinPublicBase(import.meta.env.BASE_URL || '/', path);
}

/** Directory used by Three's DRACOLoader (must keep its trailing slash). */
export const DRACO_DECODER_PATH = publicAsset('draco/');
