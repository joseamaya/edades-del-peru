import { PERIODS } from '../model/defs/periods';
import { CIVS, civsForPeriod } from '../model/defs/civs';
import { RELEASED_MISSIONS } from '../campaign/defs/campaigns';
import { getEducational } from '../campaign/defs/educational';
import { MAP_LABEL } from '../core/Config';
import { artForMission } from '../art/manifest';
import { artFigureHtml, includeUnreviewedArt } from './ArtFigure';
import { techTreeHtml } from './TechTree';
import { uniqueTechsForCiv, uniqueUnitsForCiv } from '../model/defs/unique';
import { t } from '../i18n';

/**
 * Codex/educational encyclopedia. Gathers periods, civilizations and campaigns from the
 * game defs, and shows the **real historical dossiers** in `docs/historia/` (bundled
 * as text) to guarantee that what is shown matches the verified sources.
 */

const DOSSIERS = import.meta.glob('../../docs/historia/**/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

type Tab = 'periods' | 'civs' | 'campaigns' | 'tech' | 'dossiers';

interface CodexItem {
  id: string;
  title: string;
  render: () => string;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function inline(s: string): string {
  let t = escapeHtml(s);
  t = t.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  t = t.replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');
  t = t.replace(/`([^`]+)`/g, '<code>$1</code>');
  return t;
}

/** Minimal and safe markdown renderer (headings, lists, bold, links). */
function mdToHtml(md: string): string {
  const out: string[] = [];
  let inList = false;
  const closeList = (): void => {
    if (inList) {
      out.push('</ul>');
      inList = false;
    }
  };
  for (const raw of md.split('\n')) {
    const line = raw.replace(/\s+$/, '');
    if (!line.trim()) {
      closeList();
      continue;
    }
    const h = /^(#{1,6})\s+(.*)$/.exec(line);
    if (h) {
      closeList();
      const level = Math.min(h[1].length, 3);
      out.push(`<div class="md-h${level}">${inline(h[2])}</div>`);
      continue;
    }
    const li = /^[-*]\s+(.*)$/.exec(line);
    if (li) {
      if (!inList) {
        out.push('<ul>');
        inList = true;
      }
      out.push(`<li>${inline(li[1])}</li>`);
      continue;
    }
    closeList();
    out.push(`<p>${inline(line)}</p>`);
  }
  closeList();
  return out.join('');
}

function prettyName(base: string): string {
  return base.replace(/[-_]/g, ' ').replace(/^\w/, (c) => c.toUpperCase());
}

function dossierGroups(): { group: string; items: { key: string; title: string }[] }[] {
  const general: { key: string; title: string }[] = [];
  const civs: { key: string; title: string }[] = [];
  const campaigns: { key: string; title: string }[] = [];
  for (const key of Object.keys(DOSSIERS).sort()) {
    const base = key.split('/').pop()!.replace(/\.md$/, '');
    const entry = { key, title: prettyName(base) };
    if (key.includes('/civilizaciones/')) civs.push(entry);
    else if (key.includes('/campanas/')) campaigns.push(entry);
    else general.push(entry);
  }
  return [
    { group: t('hud.codex.group.general'), items: general },
    { group: t('hud.codex.group.civs'), items: civs },
    { group: t('hud.codex.group.campaigns'), items: campaigns },
  ];
}

function periodTab(): CodexItem[] {
  return PERIODS.map((p) => ({
    id: String(p.id),
    title: `${p.name} · ${p.dates}`,
    render: () => {
      const disp = civsForPeriod(p.id);
      const lista = disp
        .map((c) => `<li><b>${c.name}</b> (${MAP_LABEL[c.geography]}) — ${c.description}</li>`)
        .join('');
      return `
        <h3>${p.name}</h3>
        <p><b>${t('hud.codex.dates')}</b> ${p.dates} · <b>${t('hud.codex.map')}</b> ${MAP_LABEL[p.map]}</p>
        <h4>${t('hud.codex.coetaneousCivs')}</h4>
        <ul>${lista || '<li>—</li>'}</ul>
      `;
    },
  }));
}

function civTab(): CodexItem[] {
  return CIVS.map((c) => ({
    id: c.id,
    title: c.name,
    render: () => {
      const periods = c.periods.map((pid) => PERIODS.find((p) => p.id === pid)?.name ?? String(pid)).join(', ');
      const bonus = c.bonuses.map((b) => `<li>${b}</li>`).join('');
      const units = uniqueUnitsForCiv(c.id);
      const techs = uniqueTechsForCiv(c.id);
      const unitList = units.length
        ? units
            .map(
              (u) =>
                `<li><b>${u.name}</b> — ${u.description} <span class="src">${t('hud.codex.source')} ${u.source ?? '—'}</span></li>`,
            )
            .join('')
        : `<li>${t('hud.codex.noUniqueUnit')}</li>`;
      const techList = techs.length
        ? techs
            .map(
              (tech) =>
                `<li><b>${tech.name}</b> — ${tech.description} <span class="src">${t('hud.codex.source')} ${tech.source ?? '—'}</span></li>`,
            )
            .join('')
        : `<li>${t('hud.codex.noUniqueTech')}</li>`;
      return `
        <h3>${c.name}</h3>
        <p><b>${t('hud.codex.adjective')}</b> ${c.adjective} · <b>${t('hud.codex.geography')}</b> ${MAP_LABEL[c.geography]} · <b>${t('hud.codex.periods')}</b> ${periods}</p>
        <p>${c.description}</p>
        <h4>${t('hud.codex.bonuses')}</h4>
        <ul>${bonus || '<li>—</li>'}</ul>
        <h4>${t('hud.codex.uniqueUnit')}</h4>
        <ul>${unitList}</ul>
        <h4>${t('hud.codex.uniqueTech')}</h4>
        <ul>${techList}</ul>
      `;
    },
  }));
}

function campaignTab(): CodexItem[] {
  return RELEASED_MISSIONS.map((m) => ({
    id: m.id,
    title: m.title,
    render: () => {
      const edu = getEducational(m.id);
      const art = artForMission(m.id, { includeUnreviewed: includeUnreviewedArt() });
      const record =
        art.find((a) => a.type === 'campaign-intro') ?? art.find((a) => a.type === 'campaign-scene') ?? art[0];
      const figure = record ? artFigureHtml(record, '(max-width: 620px) 100vw, 420px') : '';
      const sources = edu?.sources.length
        ? `<h4>${t('hud.codex.sources')}</h4><ul>${edu.sources
            .map(
              (f) => `<li>${f.url ? `<a href="${f.url}" target="_blank" rel="noopener">${f.text}</a>` : f.text}</li>`,
            )
            .join('')}</ul>`
        : '';
      return `
        <h3>${m.title}</h3>
        <p><b>${m.subtitle}</b></p>
        ${figure}
        <p>${m.history.replace(/\n/g, '<br>')}</p>
        ${edu ? `<p>${edu.context}</p>` : ''}
        ${edu ? `<p>💡 <b>${t('hud.menu.briefing.didYouKnow')}</b> ${edu.didYouKnow}</p>` : ''}
        ${sources}
      `;
    },
  }));
}

function dossierTab(): CodexItem[] {
  return dossierGroups().flatMap((g) =>
    g.items.map((it) => ({
      id: it.key,
      title: it.title,
      render: () => `<div class="md">${mdToHtml(DOSSIERS[it.key] ?? '')}</div>`,
    })),
  );
}

const TABS: { id: Tab; label: string; items: () => CodexItem[] }[] = [
  { id: 'periods', label: t('hud.codex.tab.periods'), items: periodTab },
  { id: 'civs', label: t('hud.codex.tab.civs'), items: civTab },
  { id: 'campaigns', label: t('hud.codex.tab.campaigns'), items: campaignTab },
  {
    id: 'tech',
    label: t('hud.codex.tab.tech'),
    items: () => [{ id: 'tree', title: t('hud.techTree.itemTitle'), render: () => techTreeHtml() }],
  },
  { id: 'dossiers', label: t('hud.codex.tab.dossiers'), items: dossierTab },
];

/** Open the codex inside `root`. `onClose` returns to the menu. */
export function openCodex(root: HTMLElement, onClose: () => void): void {
  root.querySelector('#ed-codex')?.remove();
  const overlay = document.createElement('div');
  overlay.className = 'ed-overlay';
  overlay.id = 'ed-codex';
  const panel = document.createElement('div');
  panel.className = 'ed-panel';
  panel.innerHTML = `
    <h2>${t('hud.codex.title')}</h2>
    <div class="sub">${t('hud.codex.sub')}</div>
  `;
  const tabsEl = document.createElement('div');
  tabsEl.className = 'ed-codex-tabs';
  const body = document.createElement('div');
  body.className = 'ed-codex-body';
  const nav = document.createElement('div');
  nav.className = 'ed-codex-nav';
  const content = document.createElement('div');
  content.className = 'ed-codex-content';
  body.append(nav, content);
  const close = document.createElement('button');
  close.className = 'ed-primary';
  close.textContent = t('hud.codex.back');
  close.style.marginTop = '14px';
  close.addEventListener('click', onClose);
  panel.append(tabsEl, body, close);
  overlay.appendChild(panel);
  root.appendChild(overlay);

  let currentTab: Tab = 'periods';
  let selectedId: string | null = null;

  const renderTab = (): void => {
    const def = TABS.find((t) => t.id === currentTab)!;
    const items = def.items();
    if (!items.some((it) => it.id === selectedId)) selectedId = items[0]?.id ?? null;
    nav.innerHTML = '';
    for (const it of items) {
      const btn = document.createElement('button');
      btn.textContent = it.title;
      if (it.id === selectedId) btn.classList.add('active');
      btn.addEventListener('click', () => {
        selectedId = it.id;
        renderTab();
      });
      nav.appendChild(btn);
    }
    const sel = items.find((it) => it.id === selectedId);
    content.innerHTML = sel ? sel.render() : '<p>—</p>';
    content.scrollTop = 0;
  };

  for (const t of TABS) {
    const btn = document.createElement('button');
    btn.textContent = t.label;
    if (t.id === currentTab) btn.classList.add('active');
    btn.addEventListener('click', () => {
      currentTab = t.id;
      selectedId = null;
      for (const b of tabsEl.children) b.classList.toggle('active', b === btn);
      renderTab();
    });
    tabsEl.appendChild(btn);
  }

  renderTab();
}
