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
