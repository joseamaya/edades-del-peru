import { TECHS } from '../model/defs/techs';
import { ERA_DEFS } from '../model/defs/eras';
import { RESOURCE_KEYS, type Resources } from '../core/types';
import type { MatchSnapshot, PlayerSnapshot } from '../game/matchStats';
import { t } from '../i18n';

export interface MatchStatsPlayerMeta {
  id: number;
  name: string;
  civ: string;
  colorHex: string;
}

const RESOURCE_LABEL: Record<keyof Resources, string> = {
  food: t('resource.food'),
  wood: t('resource.wood'),
  silver: t('resource.silver'),
  stone: t('resource.stone'),
};

const RESOURCE_COLOR: Record<keyof Resources, string> = {
  food: 'var(--stats-food)',
  wood: 'var(--stats-wood)',
  silver: 'var(--stats-silver)',
  stone: 'var(--stats-stone)',
};

const ARMY_COLORS = ['#e8c36a', '#e05a5a', '#5aa8e8', '#5fd08a'];

type Tab = 'summary' | 'economy' | 'military' | 'tech' | 'timeline';

const TABS: { id: Tab; label: string }[] = [
  { id: 'summary', label: t('hud.stats.tab.summary') },
  { id: 'economy', label: t('hud.stats.tab.economy') },
  { id: 'military', label: t('hud.stats.tab.military') },
  { id: 'tech', label: t('hud.stats.tab.tech') },
  { id: 'timeline', label: t('hud.stats.tab.timeline') },
];

function esc(value: string): string {
  return value.replace(/[&<>"']/g, (char) => {
    const map: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
    return map[char] ?? char;
  });
}

function latest(samples: MatchSnapshot[], playerId: number): PlayerSnapshot | undefined {
  for (let i = samples.length - 1; i >= 0; i--) {
    const row = samples[i].players.find((p) => p.id === playerId);
    if (row) return row;
  }
  return undefined;
}

function seriesFor(samples: MatchSnapshot[], playerId: number, value: (p: PlayerSnapshot) => number): number[] {
  const out: number[] = [];
  for (const sample of samples) {
    const row = sample.players.find((p) => p.id === playerId);
    if (row) out.push(value(row));
  }
  return out;
}

function chart(series: { label: string; color: string; values: number[] }[], times: number[], unit = ''): string {
  const usable = series.filter((s) => s.values.length > 0);
  if (times.length < 2 || usable.length === 0) {
    return `<div class="ed-stats-empty">${t('hud.stats.noChart')}</div>`;
  }
  const width = 560;
  const height = 160;
  const left = 34;
  const right = 10;
  const top = 12;
  const bottom = 22;
  const dataMax = Math.max(0, ...usable.flatMap((s) => s.values));
  if (dataMax <= 0) return `<div class="ed-stats-empty">${t('hud.stats.noGather')}</div>`;
  const max = Math.max(1, dataMax);
  const x = (index: number): number => left + (index / (times.length - 1)) * (width - left - right);
  const y = (value: number): number => top + (1 - value / max) * (height - top - bottom);
  const grid = [0, 0.25, 0.5, 0.75, 1]
    .map((fraction) => {
      const gy = top + fraction * (height - top - bottom);
      const value = max * (1 - fraction);
      const label = max < 10 ? value.toFixed(1) : String(Math.round(value));
      return `<line class="grid" x1="${left}" x2="${width - right}" y1="${gy}" y2="${gy}" />
        <text class="axis" x="${left - 5}" y="${gy + 3}" text-anchor="end">${label}${unit}</text>`;
    })
    .join('');
  const lines = usable
    .map((s) => {
      const points = s.values.map((value, index) => `${x(index).toFixed(1)},${y(value).toFixed(1)}`).join(' ');
      return `<polyline fill="none" style="stroke:${s.color}" stroke-width="2" stroke-linejoin="round" points="${points}" />`;
    })
    .join('');
  const legend = usable
    .map((s) => `<span class="ed-stats-legend"><i style="background:${s.color}"></i>${esc(s.label)}</span>`)
    .join('');
  return `<div class="ed-stats-chart"><svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${t('hud.stats.chartAria')}">
      ${grid}
      <line class="axis-line" x1="${left}" x2="${width - right}" y1="${height - bottom}" y2="${height - bottom}" />
      ${lines}
      <text class="axis" x="${left}" y="${height - 6}">${Math.round(times[0])}s</text>
      <text class="axis" x="${width - right}" y="${height - 6}" text-anchor="end">${Math.round(times[times.length - 1])}s</text>
    </svg><div class="ed-stats-legends">${legend}</div></div>`;
}

function table(rows: { label: string; values: string[] }[], players: PlayerSnapshot[]): string {
  return `<table class="ed-stats-table"><thead><tr><th></th>${players
    .map((p) => `<th style="--player-color:${p.colorHex}">${esc(p.name)}<small>${esc(p.civ)}</small></th>`)
    .join('')}</tr></thead><tbody>${rows
    .map((row) => `<tr><th>${esc(row.label)}</th>${row.values.map((value) => `<td>${value}</td>`).join('')}</tr>`)
    .join('')}</tbody></table>`;
}

function summary(samples: MatchSnapshot[], players: PlayerSnapshot[]): string {
  const rows = [
    {
      label: t('hud.stats.kills'),
      values: players.map((p) => String(p.kills)),
    },
    { label: t('hud.stats.losses'), values: players.map((p) => String(p.lost)) },
    { label: t('hud.stats.army'), values: players.map((p) => String(p.army)) },
    { label: t('hud.stats.workers'), values: players.map((p) => String(p.workers)) },
    { label: t('hud.stats.buildings'), values: players.map((p) => String(p.buildings)) },
    {
      label: t('hud.stats.techs'),
      values: players.map((p) => String(p.techs.length)),
    },
    {
      label: t('hud.stats.era'),
      values: players.map((p) => esc(ERA_DEFS[p.era]?.name ?? '—')),
    },
  ];
  const cards = players
    .map(
      (p) => `<div class="ed-stats-card">
        <b style="--player-color:${p.colorHex}">${esc(p.name)}</b>
        <span>${esc(p.civ)} · ${esc(ERA_DEFS[p.era]?.name ?? '—')}</span>
        <strong>${p.kills}</strong><span>${t('hud.stats.killsShort', { lost: p.lost })}</span>
      </div>`,
    )
    .join('');
  void samples;
  return `<div class="ed-stats-grid">${cards}</div>${table(rows, players)}`;
}

function economy(samples: MatchSnapshot[], players: PlayerSnapshot[], playerId: number): string {
  const player = players.find((p) => p.id === playerId) ?? players[0];
  if (!player) return `<div class="ed-stats-empty">${t('hud.stats.noEconomy')}</div>`;
  const gatherRows = RESOURCE_KEYS.map(
    (key) =>
      `<div class="ed-stats-card"><b>${RESOURCE_LABEL[key]}</b><strong>${Math.round(
        player.gathered[key],
      )}</strong><span>${t('hud.stats.gathered')}</span></div>`,
  ).join('');
  const times = samples.map((s) => s.t);
  const series = RESOURCE_KEYS.map((key) => ({
    label: RESOURCE_LABEL[key],
    color: RESOURCE_COLOR[key],
    values: seriesFor(samples, player.id, (p) => p.gathered[key]),
  }));
  return `<div class="ed-stats-grid">${gatherRows}</div>${chart(series, times)}`;
}

function military(samples: MatchSnapshot[], players: PlayerSnapshot[]): string {
  const rows = [
    { label: t('hud.stats.kills'), values: players.map((p) => String(p.kills)) },
    { label: t('hud.stats.losses'), values: players.map((p) => String(p.lost)) },
    { label: t('hud.stats.currentArmy'), values: players.map((p) => String(p.army)) },
    { label: t('hud.stats.buildings'), values: players.map((p) => String(p.buildings)) },
  ];
  const times = samples.map((s) => s.t);
  const series = players.map((p, index) => ({
    label: p.name,
    color: p.colorHex || ARMY_COLORS[index % ARMY_COLORS.length],
    values: seriesFor(samples, p.id, (row) => row.army),
  }));
  return `${table(rows, players)}${chart(series, times)}`;
}

function tech(samples: MatchSnapshot[], players: PlayerSnapshot[]): string {
  return (
    players
      .map((p) => {
        const list = p.techs.length
          ? p.techs.map((id) => `<li>${esc(TECHS.find((entry) => entry.id === id)?.name ?? id)}</li>`).join('')
          : `<li class="ed-stats-empty">${t('hud.stats.noTech')}</li>`;
        return `<div class="ed-stats-card ed-stats-tech"><b style="--player-color:${p.colorHex}">${esc(
          p.name,
        )}</b><span>${esc(ERA_DEFS[p.era]?.name ?? '—')} · ${t('hud.stats.techCount', { count: p.techs.length })}</span><ul>${list}</ul></div>`;
      })
      .join('') + (samples.length ? '' : `<div class="ed-stats-empty">${t('hud.stats.noData')}</div>`)
  );
}

function timeline(samples: MatchSnapshot[], players: PlayerSnapshot[]): string {
  const rows = players
    .map((p) => {
      const eras: string[] = [];
      let last = -1;
      for (const sample of samples) {
        const row = sample.players.find((entry) => entry.id === p.id);
        if (!row || row.era === last) continue;
        last = row.era;
        eras.push(`${Math.round(sample.t)}s · ${esc(ERA_DEFS[row.era]?.name ?? '—')}`);
      }
      return `<div class="ed-stats-card"><b style="--player-color:${p.colorHex}">${esc(p.name)}</b><ul>${
        eras.length ? eras.map((entry) => `<li>${entry}</li>`).join('') : `<li>${t('hud.stats.noEraChange')}</li>`
      }</ul></div>`;
    })
    .join('');
  const times = samples.map((s) => s.t);
  const series = players.map((p, index) => ({
    label: p.name,
    color: p.colorHex || ARMY_COLORS[index % ARMY_COLORS.length],
    values: seriesFor(samples, p.id, (row) => row.populationUsed),
  }));
  return `<div class="ed-stats-grid">${rows}</div>${chart(series, times)}`;
}

export function mountMatchStats(
  root: HTMLElement,
  samples: MatchSnapshot[],
  metas: MatchStatsPlayerMeta[],
  playerId = 0,
): void {
  const players = metas
    .map((meta) => latest(samples, meta.id) ?? null)
    .filter((player): player is PlayerSnapshot => player !== null);
  if (players.length === 0) {
    root.innerHTML = `<div class="ed-stats-empty">${t('hud.stats.empty')}</div>`;
    return;
  }
  const tabs = document.createElement('div');
  tabs.className = 'ed-stats-tabs';
  tabs.setAttribute('role', 'tablist');
  const body = document.createElement('div');
  body.className = 'ed-stats-body';
  body.setAttribute('role', 'tabpanel');
  const render = (tab: Tab): void => {
    tabs.querySelectorAll<HTMLButtonElement>('button').forEach((button) => {
      const active = button.dataset.tab === tab;
      button.classList.toggle('active', active);
      button.setAttribute('aria-selected', String(active));
    });
    if (tab === 'summary') body.innerHTML = summary(samples, players);
    else if (tab === 'economy') body.innerHTML = economy(samples, players, playerId);
    else if (tab === 'military') body.innerHTML = military(samples, players);
    else if (tab === 'tech') body.innerHTML = tech(samples, players);
    else body.innerHTML = timeline(samples, players);
  };
  for (const tab of TABS) {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.tab = tab.id;
    button.textContent = tab.label;
    button.setAttribute('role', 'tab');
    button.addEventListener('click', () => render(tab.id));
    tabs.appendChild(button);
  }
  root.replaceChildren(tabs, body);
  render('summary');
}
