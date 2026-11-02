function showBootLoader(): void {
  const loader = document.createElement('div');
  loader.id = 'boot-loader';
  loader.innerHTML = '<div class="boot-mark"></div><p>Cargando Edades del Perú…</p>';
  document.body.appendChild(loader);
}

function hideBootLoader(): void {
  document.getElementById('boot-loader')?.remove();
}

async function start(): Promise<void> {
  showBootLoader();
  const { boot } = await import('./boot');
  await boot();
  hideBootLoader();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => void start());
else void start();
