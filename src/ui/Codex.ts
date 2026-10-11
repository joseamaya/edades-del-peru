import { PERIODOS } from '../model/defs/periodos';
import { CIVS, civsDePeriodo } from '../model/defs/civs';
import { MISSIONS } from '../campaign/defs/campaign';
import { getEducativo } from '../campaign/defs/educativo';

/**
 * Códice/enciclopedia educativa. Reúne periodos, civilizaciones y campañas a partir de los
 * defs del juego, y muestra los **dossiers históricos reales** de `docs/historia/` (bundleados
 * como texto) para garantizar que lo mostrado coincide con las fuentes verificadas.
 */

const DOSSIERS = import.meta.glob('../../docs/historia/**/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

type Tab = 'periodos' | 'civs' | 'campanas' | 'dossiers';

interface CodexItem {
  id: string;
  titulo: string;
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

/** Renderizador de markdown mínimo y seguro (encabezados, listas, negrita, enlaces). */
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

function dossierGroups(): { grupo: string; items: { key: string; titulo: string }[] }[] {
  const general: { key: string; titulo: string }[] = [];
  const civs: { key: string; titulo: string }[] = [];
  const campanas: { key: string; titulo: string }[] = [];
  for (const key of Object.keys(DOSSIERS).sort()) {
    const base = key.split('/').pop()!.replace(/\.md$/, '');
    const entry = { key, titulo: prettyName(base) };
    if (key.includes('/civilizaciones/')) civs.push(entry);
    else if (key.includes('/campanas/')) campanas.push(entry);
    else general.push(entry);
  }
  return [
    { grupo: 'General', items: general },
    { grupo: 'Civilizaciones', items: civs },
    { grupo: 'Campañas', items: campanas },
  ];
}

function periodoTab(): CodexItem[] {
  return PERIODOS.map((p) => ({
    id: String(p.id),
    titulo: `${p.nombre} · ${p.fechas}`,
    render: () => {
      const disp = civsDePeriodo(p.id);
      const lista = disp
        .map((c) => `<li><b>${c.nombre}</b> (${c.geografia}) — ${c.descripcion}</li>`)
        .join('');
      return `
        <h3>${p.nombre}</h3>
        <p><b>Fechas:</b> ${p.fechas} · <b>Mapa:</b> ${p.mapa}</p>
        <h4>Civilizaciones coetáneas</h4>
        <ul>${lista || '<li>—</li>'}</ul>
      `;
    },
  }));
}

function civTab(): CodexItem[] {
  return CIVS.map((c) => ({
    id: c.id,
    titulo: c.nombre,
    render: () => {
      const periodos = c.periodos.map((pid) => PERIODOS.find((p) => p.id === pid)?.nombre ?? String(pid)).join(', ');
      const bonus = c.bonuses.map((b) => `<li>${b}</li>`).join('');
      return `
        <h3>${c.nombre}</h3>
        <p><b>Adjetivo:</b> ${c.adjetivo} · <b>Geografía:</b> ${c.geografia} · <b>Periodos:</b> ${periodos}</p>
        <p>${c.descripcion}</p>
        <h4>Bonificaciones</h4>
        <ul>${bonus || '<li>—</li>'}</ul>
      `;
    },
  }));
}

function campanaTab(): CodexItem[] {
  return MISSIONS.map((m) => ({
    id: m.id,
    titulo: m.titulo,
    render: () => {
      const edu = getEducativo(m.id);
      const fuentes = edu?.fuentes.length
        ? `<h4>Fuentes</h4><ul>${edu.fuentes
            .map((f) => `<li>${f.url ? `<a href="${f.url}" target="_blank" rel="noopener">${f.texto}</a>` : f.texto}</li>`)
            .join('')}</ul>`
        : '';
      return `
        <h3>${m.titulo}</h3>
        <p><b>${m.subtitulo}</b></p>
        <p>${m.historia.replace(/\n/g, '<br>')}</p>
        ${edu ? `<p>${edu.contexto}</p>` : ''}
        ${edu ? `<p>💡 <b>¿Sabías que…?</b> ${edu.sabiasQue}</p>` : ''}
        ${fuentes}
      `;
    },
  }));
}

function dossierTab(): CodexItem[] {
  return dossierGroups().flatMap((g) =>
    g.items.map((it) => ({
      id: it.key,
      titulo: it.titulo,
      render: () => `<div class="md">${mdToHtml(DOSSIERS[it.key] ?? '')}</div>`,
    })),
  );
}

const TABS: { id: Tab; label: string; items: () => CodexItem[] }[] = [
  { id: 'periodos', label: '🕰 Periodos', items: periodoTab },
  { id: 'civs', label: '🏛 Civilizaciones', items: civTab },
  { id: 'campanas', label: '📜 Campañas', items: campanaTab },
  { id: 'dossiers', label: '📖 Dossiers', items: dossierTab },
];

/** Abre el códice dentro de `root`. `onClose` vuelve al menú. */
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

  let currentTab: Tab = 'periodos';
  let selectedId: string | null = null;

  const renderTab = (): void => {
    const def = TABS.find((t) => t.id === currentTab)!;
    const items = def.items();
    if (!items.some((it) => it.id === selectedId)) selectedId = items[0]?.id ?? null;
    nav.innerHTML = '';
    for (const it of items) {
      const btn = document.createElement('button');
      btn.textContent = it.titulo;
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
