import { getCiv } from '../model/defs/civs';
import type { CommanderDef } from '../model/defs/commanders';
import type { EmblemId } from '../model/defs/civs';
import { HUMAN_HAIR } from '../model/defs/people';
import { escapeHtml as escapeXml } from '../util/escapeHtml';

const PORTRAIT_VIEW = 64;
let portraitSeq = 0;

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
  const accent = cmd.accent ?? c.accent;
  const female = cmd.gender === 'female';
  const clip = `pc-${cmd.id}-${portraitSeq++}`;
  const label = escapeXml(`Retrato estilizado de ${cmd.name}`);
  const initialsText = escapeXml(initials(cmd.name));
  // A silhouette cue, not a likeness: long hair and a shoulder cloth for the Mamas, a short crop for the men.
  const hair = female
    ? `<path d="M19 30 q0 -18 13 -18 t13 18 v12 q-4 -7 -13 -7 t-13 7 z" fill="${HUMAN_HAIR}" opacity="0.95" />`
    : `<path d="M20 24 q2 -11 12 -11 t12 11 q-6 -4 -12 -4 t-12 4 z" fill="${HUMAN_HAIR}" opacity="0.9" />`;
  const shawl = female ? `<path d="M8 62 q3 -21 24 -21 t24 21 z" fill="${accent}" opacity="0.3" />` : '';
  const headwear = portraitHeadwear(cmd, accent, c.secondary);
  const beard = cmd.beard ? `<path d="M24 28 q8 9 16 0 q-1 9 -8 9 t-8 -9 z" fill="${HUMAN_HAIR}" opacity="0.9" />` : '';
  const uniform =
    cmd.uniform === 'military'
      ? `<path d="M18 62 q0 -8 14 -8 t14 8 z" fill="${c.secondary}" opacity="0.95" />
         <rect x="17" y="52" width="5" height="2" rx="1" fill="${accent}" />
         <rect x="42" y="52" width="5" height="2" rx="1" fill="${accent}" />`
      : cmd.uniform === 'cloth'
        ? `<path d="M16 62 q2 -12 16 -12 t16 12 z" fill="${accent}" opacity="0.35" />`
        : '';
  return `<svg class="ed-portrait" data-gender="${cmd.gender}" width="${size}" height="${size}" viewBox="0 0 ${PORTRAIT_VIEW} ${PORTRAIT_VIEW}" role="img" aria-label="${label}">
    <defs>
      <clipPath id="${clip}"><polygon points="32,2 60,17 60,47 32,62 4,47 4,17" /></clipPath>
      <linearGradient id="${clip}-bg" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="${c.primary}" />
        <stop offset="1" stop-color="${accent}" />
      </linearGradient>
    </defs>
    <g clip-path="url(#${clip})">
      <rect width="${PORTRAIT_VIEW}" height="${PORTRAIT_VIEW}" fill="url(#${clip}-bg)" />
      ${hair}
      <circle cx="32" cy="26" r="12" fill="${c.secondary}" opacity="0.92" />
      <path d="M12 62 q4 -18 20 -18 t20 18 z" fill="${c.secondary}" opacity="0.92" />
      <path d="M12 62 q4 -18 20 -18 t20 18 z" fill="#000" opacity="0.12" />
      ${shawl}
      ${uniform}
      ${beard}
      ${headwear}
    </g>
    <polygon points="32,2 60,17 60,47 32,62 4,47 4,17" fill="none" stroke="${accent}" stroke-width="1.8" opacity="0.9" />
    <text x="32" y="57" text-anchor="middle" font-family="Georgia, serif" font-size="8" font-weight="700" fill="${c.secondary}" opacity="0.8">${initialsText}</text>
    ${emblem(getCiv(cmd.civ).visual.emblem, 52, 12, c.secondary)}
  </svg>`;
}

/** Presentation-only headwear silhouettes; none of these claim a documented likeness. */
function portraitHeadwear(cmd: CommanderDef, accent: string, secondary: string): string {
  const kind = cmd.headwear ?? (cmd.headdress ? 'headdress' : undefined);
  switch (kind) {
    case 'bicorne':
      return `<path d="M13 20 q19 -11 38 0 q-7 6 -19 6 t-19 -6 z" fill="${secondary}" stroke="${accent}" stroke-width="1.1" />`;
    case 'morion':
      return `<path d="M17 23 q15 -15 30 0 v3 h-30 z" fill="${secondary}" stroke="${accent}" stroke-width="1" />
        <path d="M29 10 q3 -5 6 0 v10 h-6 z" fill="${accent}" opacity="0.8" />`;
    case 'helmet':
      return `<path d="M17 24 q15 -13 30 0 v3 h-30 z" fill="${secondary}" stroke="${accent}" stroke-width="1" />
        <rect x="15" y="25" width="34" height="2.4" rx="1" fill="${accent}" />`;
    case 'hat':
      return `<path d="M11 22 h42 v2.6 h-42 z" fill="${secondary}" stroke="${accent}" stroke-width="0.8" />
        <path d="M21 22 q11 -11 22 0 z" fill="${secondary}" stroke="${accent}" stroke-width="0.8" />`;
    case 'headdress':
      return `<path d="M19 16 q13 -9 26 0 v2.5 h-26 z" fill="${accent}" opacity="0.85" />
        <path d="M22 16 l-3 -8 l5 3 l3 -7 l3 7 l5 -3 l-3 8 z" fill="${accent}" opacity="0.7" />`;
    default:
      return '';
  }
}
