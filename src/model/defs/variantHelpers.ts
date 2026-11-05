export function cultureForVariant<C extends string>(cultures: readonly C[], variant: string): C | null {
  return cultures.find((culture) => variant.startsWith(`${culture}_`)) ?? null;
}

export function roleForVariant<R extends string>(roles: readonly R[], variant: string): R | null {
  return roles.find((role) => variant.includes(`_${role}_`)) ?? null;
}
