import * as THREE from 'three';

/**
 * Paint the shared body under rigid garments in the garment's colour.
 *
 * Sleeves, breeches and the coat yoke are rigid shells on the bones, while the skinned body under them bulges
 * as a limb bends (biceps, hips, shoulders). Where the body breaks through a shell it showed bare skin in
 * patches over the coat. With the covered region painted, whatever pokes through is the cloth's colour.
 *
 * Each vertex takes the colour of the region its strongest covered bone belongs to (`regionOf`). The painted
 * geometry shares every attribute with the asset's body and adds one `paint` attribute; it is cached per body
 * and key for the session and never disposed, because disposing it would release the shared buffers.
 */
export type PaintRegion = 'coat' | 'trousers' | 'boots' | null;

const geometryCache = new Map<string, THREE.BufferGeometry>();
const materialCache = new WeakMap<THREE.Material, THREE.Material>();

function paintedMaterial(source: THREE.Material): THREE.Material {
  const cached = materialCache.get(source);
  if (cached) return cached;
  const material = source.clone();
  material.name = `${source.name}:painted`;
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec4 paint;\nvarying vec4 vPaint;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\n  vPaint = paint;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec4 vPaint;')
      .replace(
        '#include <color_fragment>',
        '#include <color_fragment>\n  diffuseColor.rgb = mix(diffuseColor.rgb, vPaint.rgb, vPaint.a);',
      );
  };
  material.customProgramCacheKey = () => 'body-paint';
  materialCache.set(source, material);
  return material;
}

/**
 * Replace `body`'s geometry and material with the painted ones. `regionOf` gets the vertex's strongest covered
 * bone and its posed position (world space, at dressing time) and returns the region, or null for skin.
 */
export function paintBodyUnderGarments(
  body: THREE.SkinnedMesh,
  key: string,
  colors: Record<Exclude<PaintRegion, null>, number>,
  regionOf: (bone: string, position: THREE.Vector3) => PaintRegion,
): void {
  const source = body.geometry;
  const cacheKey = `${source.uuid}|${key}`;
  let geometry = geometryCache.get(cacheKey);
  if (!geometry) {
    const skinIndex = source.getAttribute('skinIndex');
    const skinWeight = source.getAttribute('skinWeight');
    const count = source.getAttribute('position').count;
    const paint = new Float32Array(count * 4);
    const bones = body.skeleton.bones;
    const linear = {
      coat: new THREE.Color(colors.coat),
      trousers: new THREE.Color(colors.trousers),
      boots: new THREE.Color(colors.boots),
    };
    body.updateMatrixWorld(true);
    body.skeleton.update();
    const position = new THREE.Vector3();
    for (let i = 0; i < count; i++) {
      // Strongest bone among those that carry a garment.
      let best: PaintRegion = null;
      let bestWeight = 0;
      let covered = 0;
      body.getVertexPosition(i, position).applyMatrix4(body.matrixWorld);
      for (let k = 0; k < 4; k++) {
        const weight = skinWeight.getComponent(i, k);
        if (weight <= 0) continue;
        const bone = bones[skinIndex.getComponent(i, k)]?.name ?? '';
        const region = regionOf(bone, position);
        if (!region) continue;
        covered += weight;
        if (weight > bestWeight) {
          bestWeight = weight;
          best = region;
        }
      }
      // A vertex mostly on an uncovered bone (neck, hand, head) stays skin.
      if (!best || covered < 0.5) continue;
      const c = linear[best];
      paint.set([c.r, c.g, c.b, 1], i * 4);
    }
    geometry = new THREE.BufferGeometry();
    for (const [name, attribute] of Object.entries(source.attributes)) geometry.setAttribute(name, attribute);
    geometry.setAttribute('paint', new THREE.BufferAttribute(paint, 4));
    geometry.setIndex(source.index);
    for (const group of source.groups) geometry.addGroup(group.start, group.count, group.materialIndex);
    geometry.boundingBox = source.boundingBox;
    geometry.boundingSphere = source.boundingSphere;
    geometryCache.set(cacheKey, geometry);
  }
  body.geometry = geometry;
  body.material = Array.isArray(body.material) ? body.material.map(paintedMaterial) : paintedMaterial(body.material);
}
