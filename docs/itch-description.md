# itch.io — borrador de página

Borrador para publicar la demo (no subir sin revisar). Capturas en `docs/media/`
(generadas con `yarn shots:media`).

> *Copy en español a propósito: es texto orientado al jugador (ficha de tienda). El resto
> de `docs/**` (salvo `docs/historia/**`) se mantiene en inglés.*

## Título

**Edades del Perú — RTS de la historia peruana**

## Descripción corta (tagline)

Del Arcaico de Caral a la República: un RTS estilo Age of Empires II sobre la
historia del Perú, jugado **por épocas históricas** y solo entre civilizaciones
**coetáneas**.

## Descripción

Edades del Perú es un juego de estrategia en tiempo real que recorre la historia
del Perú desde Caral hasta la actualidad. Cada partida se juega en un **período
histórico** y solo puedes enfrentar civilizaciones **coetáneas**: Moche contra
Recuay, Chanca contra Inca; nunca Moche contra Chimú.

- **9 escenarios de campaña** con fecha, lugar, bandos y comandantes reales
  (Cusi Yupanqui, Túpac Yupanqui, Túpac Amaru II, Grau y Bolognesi…).
- **10 períodos históricos** y sus civilizaciones, con contenido educativo
  verificado y citado.
- **Modo educativo**: prólogo, briefing histórico, tutorial guiado y un códice
  con los dosieres reales.
- Generado de forma **procedimental** (mapas, modelos y audio) con iluminación
  cinematográfica, color por época y agua con refracción.

## Etiquetas sugeridas

`strategy`, `real-time`, `historical`, `rts`, `peru`, `singleplayer`, `low-poly`,
`procedural`, `educational`

## Ficha / assets

- **Portada/hero**: `docs/media/hero.jpg` (1600×900).
- **Capturas**: `docs/media/chavin.jpg`.
- **Motor**: Three.js + TypeScript (Vite). Navegador de escritorio; se degrada
  automáticamente en equipos modestos.
- **Idioma**: interfaz y contenido histórico en **español**.
- **Precio**: demo/pay-what-you-want (a decidir).

## Créditos y procedencia

- Texturas de terreno/material: generadas con IA (Cloudflare Workers AI); detalle
  y licencias en [`PROVENANCE.md`](../PROVENANCE.md).
- Textiles andinos: abstracciones de motivos atestiguados; imágenes de referencia
  de dominio público (The Met).
- Modelos y audio: **procedimentales** (sin assets de terceros).
- Licencia del código: **MIT**.

## Pendiente antes de publicar

- Revisar términos de uso comercial de Cloudflare Workers AI para las texturas.
- Exportar un build de producción (`yarn build`) y comprimir `dist/`.
- Capturas finales a 1920×1080 y un GIF corto de gameplay.
