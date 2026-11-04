import { es, type TranslationKey } from './es';

export type TranslationParams = Record<string, string | number>;

/** Interpolate `{name}` placeholders in a Spanish string. */
export function t(key: TranslationKey, params?: TranslationParams): string {
  let value: string = es[key];
  if (!params) return value;
  for (const [name, replacement] of Object.entries(params)) {
    value = value.replaceAll(`{${name}}`, String(replacement));
  }
  return value;
}

export { es };
export type { TranslationKey };
