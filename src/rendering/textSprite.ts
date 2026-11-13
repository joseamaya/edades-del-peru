import * as THREE from 'three';

export interface TextTextureStyle {
  fontSize?: number;
  font?: string;
  color?: string;
  outline?: string;
  paddingX?: number;
  paddingY?: number;
}

/**
 * Canvas-backed text for world billboards. Kept out of the sprite so each caller owns its
 * material (opacity, depth test, fog) while the glyph raster stays identical.
 */
export function textTexture(
  text: string,
  style: TextTextureStyle = {},
): { texture: THREE.CanvasTexture; aspect: number } {
  const fontSize = style.fontSize ?? 64;
  const font = style.font ?? `600 ${fontSize}px Georgia, "Times New Roman", serif`;
  const color = style.color ?? '#f6e7bf';
  const outline = style.outline ?? 'rgba(6, 8, 10, 0.85)';
  const padX = style.paddingX ?? 22;
  const padY = style.paddingY ?? 10;
  const measure = document.createElement('canvas').getContext('2d')!;
  measure.font = font;
  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(measure.measureText(text).width) + padX * 2;
  canvas.height = fontSize + padY * 2;
  const ctx = canvas.getContext('2d')!;
  ctx.font = font;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineWidth = Math.max(2, fontSize * 0.09);
  ctx.strokeStyle = outline;
  ctx.strokeText(text, canvas.width / 2, canvas.height / 2);
  ctx.fillStyle = color;
  ctx.fillText(text, canvas.width / 2, canvas.height / 2);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  return { texture, aspect: canvas.width / canvas.height };
}

export interface LabelSpriteStyle extends TextTextureStyle {
  /** Starting opacity; nameplates fade in, permanent markers start visible. */
  opacity?: number;
}

export interface LabelSprite {
  readonly sprite: THREE.Sprite;
  readonly material: THREE.SpriteMaterial;
  readonly texture: THREE.CanvasTexture;
  readonly aspect: number;
}

/**
 * A ground-anchored name billboard: the shared setup for character nameplates and huaca markers.
 * The caller owns positioning, scale and visibility; opacity defaults to 0 so a nameplate can fade
 * in, while a permanent marker sets `opacity: 1`.
 */
export function labelSprite(text: string, style: LabelSpriteStyle = {}, renderOrder = 3): LabelSprite {
  const { texture, aspect } = textTexture(text, style);
  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    opacity: style.opacity ?? 0,
    depthWrite: false,
    depthTest: true,
    fog: false,
  });
  const sprite = new THREE.Sprite(material);
  sprite.center.set(0.5, 0);
  sprite.renderOrder = renderOrder;
  return { sprite, material, texture, aspect };
}
