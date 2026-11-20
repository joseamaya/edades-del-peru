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

- **20 escenarios de campaña** en cinco capítulos, con fecha, lugar, bandos y
  comandantes reales (Cusi Yupanqui, Túpac Yupanqui, Túpac Amaru II, Grau y Bolognesi…).
- **10 períodos históricos** y sus civilizaciones, con contenido educativo
  verificado y citado.
- **Modo educativo**: prólogo, briefing histórico, tutorial guiado y un códice
  con los dosieres reales.
- Mapas, arquitectura y audio **procedimentales**, con modelos CC0 de Quaternius
  para las unidades, iluminación cinematográfica, color por época y agua con
  refracción.

## Etiquetas sugeridas

`strategy`, `real-time`, `historical`, `rts`, `peru`, `singleplayer`, `low-poly`,
`procedural`, `educational`

## Ficha / assets

- **Portada/hero**: `docs/media/hero.jpg` (1600×900).
- **Capturas**: `docs/media/chavin.jpg`.
- **GIF de gameplay**: `docs/media/gameplay.gif` (intro de la misión de Caral).
- **Empaquetado**: `yarn build && yarn package:itch` → `review/edades-del-peru-itch.zip`;
  subir con `butler push review/edades-del-peru-itch.zip <usuario>/<juego>:html5`.
- **Motor**: Three.js + TypeScript (Vite). Navegador de escritorio; se degrada
  automáticamente en equipos modestos.
- **Idioma**: interfaz y contenido histórico en **español**.
- **Precio**: demo/pay-what-you-want (a decidir).

## Créditos y procedencia

- Terreno: mapas **CC0** de Poly Haven y la textura de pasto de Caral derivada de
  *Ciudades Sagradas*, José Amaya, **CC BY 4.0**.
- Modelos y animaciones: **Quaternius (CC0)**.
- Texturas de materiales: generadas para el proyecto con **Cloudflare Workers AI**.
- Textiles andinos: abstracciones de motivos atestiguados; imágenes de referencia
  de dominio público (The Met).
- Audio: **procedimental** (WebAudio).
- Licencia del código: **MIT**. Atribución completa en [`ATTRIBUTION.md`](../public/ATTRIBUTION.md)
  y [`PROVENANCE.md`](../PROVENANCE.md).

## Pendiente antes de publicar

- Confirmar los términos de uso comercial de Cloudflare Workers AI y del modelo
  de imagen; esta distribución es gratuita.
- Exportar el build de producción (`yarn build`) desde el commit del release y
  comprobar `yarn dist:check`.
- Capturas finales a 1920×1080 y un GIF corto de gameplay.
