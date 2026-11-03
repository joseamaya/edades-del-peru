function showBootLoader(message = 'Cargando Edades del Perú…'): void {
  const loader = document.createElement('div');
  loader.id = 'boot-loader';
  loader.innerHTML = `<div class="boot-mark"></div><p>${message}</p>`;
  document.body.appendChild(loader);
}

function hideBootLoader(): void {
  document.getElementById('boot-loader')?.remove();
}

async function loadGame(): Promise<void> {
  showBootLoader();
  try {
    const { boot } = await import('./boot');
    await boot();
  } catch (error) {
    console.error(error);
    const loader = document.getElementById('boot-loader');
    if (loader) loader.innerHTML = '<p>No se pudo cargar el juego. Recarga la página.</p>';
    return;
  }
  hideBootLoader();
}

function hasDirectEntry(): boolean {
  const params = new URLSearchParams(window.location.search);
  return [
    'play',
    'load',
    'replay',
    'seed',
    'mission',
    'city',
    'scenery',
    'rig',
    'probe',
    'era',
    'period',
    'menu',
    'low',
    'fog',
    'art',
    'aiart',
    'intro',
    'cine',
    'speed',
    'noloop',
    'civ',
    'map',
    'mod',
    'fps',
    'lod',
  ].some((key) => params.has(key));
}

function showLanding(): void {
  const style = document.createElement('style');
  style.textContent = `
    #landing { position: fixed; inset: 0; display: grid; place-items: center; overflow: hidden;
      background: radial-gradient(circle at 50% 15%, #3a2f18 0%, #14161b 55%, #090a0d 100%);
      color: #f1e6c8; font-family: system-ui, sans-serif; z-index: 1000; }
    #landing::before { content: ''; position: absolute; inset: 0;
      background: repeating-linear-gradient(115deg, transparent 0 46px, rgba(232,195,106,.05) 46px 48px); }
    #landing .panel { position: relative; max-width: 760px; padding: 48px 56px; text-align: center; }
    #landing .kicker { color: #e8c36a; letter-spacing: .28em; font-size: 12px; font-weight: 700; }
    #landing h1 { margin: 18px 0 10px; font: 900 clamp(48px, 9vw, 108px)/.86 Georgia, serif; letter-spacing: -.03em; color: #f6e7bf; }
    #landing h1 span { display: block; color: #e8c36a; }
    #landing p { max-width: 520px; margin: 22px auto 34px; color: #c9c1ab; line-height: 1.6; font-size: 15px; }
    #landing button { cursor: pointer; border: 1px solid #e8c36a; background: #e8c36a; color: #14161b;
      padding: 14px 34px; font: 800 13px/1 system-ui, sans-serif; letter-spacing: .16em; text-transform: uppercase; }
    #landing button:hover { background: #f6e7bf; }
    #landing small { display: block; margin-top: 26px; color: #7f7867; letter-spacing: .12em; font-size: 10px; }
  `;
  const panel = document.createElement('div');
  panel.id = 'landing';
  panel.innerHTML = `<div class="panel">
    <div class="kicker">LA SENDA DEL SOL · 3000 A.C. — HOY</div>
    <h1>EDADES <span>DEL PERÚ</span></h1>
    <p>Un juego de estrategia en tiempo real a través de cinco mil años de historia peruana.</p>
    <button type="button">Entrar</button>
    <small>Caral · Chavín · Moche · Wari · Incas · Virreinato · República</small>
  </div>`;
  document.body.appendChild(style);
  document.body.appendChild(panel);
  panel.querySelector('button')?.addEventListener('click', () => {
    panel.remove();
    style.remove();
    const url = new URL(location.href);
    url.searchParams.set('menu', '1');
    history.replaceState(null, '', url);
    void loadGame();
  });
}

function start(): void {
  if (navigator.webdriver || hasDirectEntry()) {
    void loadGame();
    return;
  }
  showLanding();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
else start();
