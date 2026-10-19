import { getCiv } from '../model/defs/civs';
import type { CommanderDef } from '../model/defs/commanders';
import type { EmblemId } from '../model/defs/civs';

const PORTRAIT_VIEW = 64;

/** Two significant initials ("José de San Martín" → "SM", "Miguel Grau" → "MG"). */
function initials(name: string): string {
  const words = name.split(/\s+/).filter((w) => !/^(de|del|la|las|los|y)$/i.test(w));
  const first = words[0]?.[0] ?? '?';
  const second = words[1]?.[0] ?? '';
  return (first + second).toUpperCase();
}

/** Tiny civ emblem badge (a stylized glyph, not a reconstruction). */
function emblem(emblem: EmblemId, x: number, y: number, color: string): string {
  const s = 3.2;
  switch (emblem) {
    case 'sun':
    case 'sunburst':
      return `<g fill="${color}"><circle cx="${x}" cy="${y}" r="${s}" />${[0, 45, 90, 135]
        .map(
          (a) =>
            `<rect x="${x - 0.6}" y="${y - s * 1.9}" width="1.2" height="${s}" transform="rotate(${a} ${x} ${y})" />`,
        )
        .join('')}</g>`;
    case 'wave':
      return `<path d="M${x - s * 1.4} ${y} q${s * 0.7} -${s} ${s * 1.4} 0 t${s * 1.4} 0" fill="none" stroke="${color}" stroke-width="1.4" stroke-linecap="round" />`;
    case 'cross':
      return `<path d="M${x - 1} ${y - s} h2 v${s * 0.6} h${s * 0.8} v2 h-${s * 0.8} v${s * 0.6} h-2 v-${s * 0.6} h-${s * 0.8} v-2 h${s * 0.8} z" fill="${color}" />`;
    case 'shield':
      return `<path d="M${x} ${y - s} l${s} ${s * 0.5} v${s * 0.6} q0 ${s * 0.9} -${s} ${s * 1.1} q-${s} -${s * 0.2} -${s} -${s * 1.1} v-${s * 0.6} z" fill="${color}" />`;
    case 'feline':
      return `<path d="M${x - s} ${y + s * 0.6} l${s * 0.6} -${s * 1.4} l${s * 0.4} ${s * 0.5} l${s * 0.4} -${s * 0.5} l${s * 0.6} ${s * 1.4} z" fill="${color}" />`;
    case 'condor':
      return `<path d="M${x - s * 1.3} ${y - s * 0.2} l${s * 1.3} ${s * 0.5} l${s * 1.3} -${s * 0.5} l-${s * 0.7} ${s * 1.1} l-${s * 0.6} -${s * 0.3} l-${s * 0.6} ${s * 0.3} z" fill="${color}" />`;
    case 'staff':
      return `<path d="M${x - 0.8} ${y - s} h1.6 v${s * 2} h-1.6 z M${x - s * 0.8} ${y - s * 0.7} h${s * 1.6} v1.4 h-${s * 1.6} z" fill="${color}" />`;
    case 'fret':
      return `<path d="M${x - s} ${y + s * 0.5} v-${s} h${s * 0.7} v${s * 0.5} h${s * 0.6} v-${s} h${s * 0.7} v${s}" fill="none" stroke="${color}" stroke-width="1.4" />`;
    default:
      return `<rect x="${x - s * 0.8}" y="${y - s * 0.8}" width="${s * 1.6}" height="${s * 1.6}" transform="rotate(45 ${x} ${y})" fill="${color}" />`;
  }
}

/**
 * Stylized commander medallion (SVG). Not a likeness: a bust silhouette framed
 * with the civilization palette and a small emblem. Safe to inject (data only).
 */
export function portraitSvg(cmd: CommanderDef, size = 64): string {
  const c = getCiv(cmd.civ).colors;
  const clip = `pc-${cmd.id}`;
  const label = `Retrato estilizado de ${cmd.name}`;
  return `<svg class="ed-portrait" width="${size}" height="${size}" viewBox="0 0 ${PORTRAIT_VIEW} ${PORTRAIT_VIEW}" role="img" aria-label="${label}">
    <defs>
      <clipPath id="${clip}"><polygon points="32,2 60,17 60,47 32,62 4,47 4,17" /></clipPath>
      <linearGradient id="${clip}-bg" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="${c.primary}" />
        <stop offset="1" stop-color="${c.accent}" />
      </linearGradient>
    </defs>
    <g clip-path="url(#${clip})">
      <rect width="${PORTRAIT_VIEW}" height="${PORTRAIT_VIEW}" fill="url(#${clip}-bg)" />
      <circle cx="32" cy="26" r="12" fill="${c.secondary}" opacity="0.92" />
      <path d="M12 62 q4 -18 20 -18 t20 18 z" fill="${c.secondary}" opacity="0.92" />
      <path d="M12 62 q4 -18 20 -18 t20 18 z" fill="#000" opacity="0.12" />
    </g>
    <polygon points="32,2 60,17 60,47 32,62 4,47 4,17" fill="none" stroke="${c.secondary}" stroke-width="1.6" opacity="0.85" />
    <text x="32" y="57" text-anchor="middle" font-family="Georgia, serif" font-size="10" font-weight="700" fill="${c.secondary}" opacity="0.95">${initials(cmd.name)}</text>
    ${emblem(getCiv(cmd.civ).visual.emblem, 52, 12, c.secondary)}
  </svg>`;
}
