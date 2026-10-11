import { PERIODS } from '../model/defs/periods';
import { CIVS, civsForPeriod } from '../model/defs/civs';
import { MISSIONS } from '../campaign/defs/campaign';
import { getEducational } from '../campaign/defs/educational';

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

type Tab = 'periods' | 'civs' | 'campaigns' | 'dossiers';

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
    { group: 'General', items: general },
    { group: 'Civilizaciones', items: civs },
    { group: 'Campañas', items: campaigns },
  ];
}

function periodTab(): CodexItem[] {
  return PERIODS.map((p) => ({
    id: String(p.id),
    title: `${p.name} · ${p.dates}`,
    render: () => {
      const disp = civsForPeriod(p.id);
      const lista = disp
        .map((c) => `<li><b>${c.name}</b> (${c.geography}) — ${c.description}</li>`)
        .join('');
      return `
        <h3>${p.name}</h3>
        <p><b>Fechas:</b> ${p.dates} · <b>Mapa:</b> ${p.map}</p>
        <h4>Civilizaciones coetáneas</h4>
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
      return `
        <h3>${c.name}</h3>
        <p><b>Adjetivo:</b> ${c.adjective} · <b>Geografía:</b> ${c.geography} · <b>Periodos:</b> ${periods}</p>
        <p>${c.description}</p>
        <h4>Bonificaciones</h4>
        <ul>${bonus || '<li>—</li>'}</ul>
      `;
    },
  }));
}

function campaignTab(): CodexItem[] {
  return MISSIONS.map((m) => ({
    id: m.id,
    title: m.title,
    render: () => {
      const edu = getEducational(m.id);
      const sources = edu?.sources.length
        ? `<h4>Fuentes</h4><ul>${edu.sources
            .map((f) => `<li>${f.url ? `<a href="${f.url}" target="_blank" rel="noopener">${f.text}</a>` : f.text}</li>`)
            .join('')}</ul>`
        : '';
      return `
        <h3>${m.title}</h3>
        <p><b>${m.subtitle}</b></p>
        <p>${m.history.replace(/\n/g, '<br>')}</p>
        ${edu ? `<p>${edu.context}</p>` : ''}
        ${edu ? `<p>💡 <b>¿Sabías que…?</b> ${edu.didYouKnow}</p>` : ''}
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
  { id: 'periods', label: '🕰 Periodos', items: periodTab },
  { id: 'civs', label: '🏛 Civilizaciones', items: civTab },
  { id: 'campaigns', label: '📜 Campañas', items: campaignTab },
  { id: 'dossiers', label: '📖 Dossiers', items: dossierTab },
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
    <h2>📖 Códice del Perú</h2>
    <div class="sub">Periodos, civilizaciones y campañas, con los dossiers históricos y sus fuentes.</div>
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
  close.textContent = '← Volver al menú';
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
