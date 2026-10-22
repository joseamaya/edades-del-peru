import fs from 'fs';
import path from 'path';
import { launchChromium, withViteServer, cliArg } from './lib.mjs';

/**
 * Build the Caral worker GLB from pinned CC0 sources (Quaternius Universal Base
 * Characters + Universal Animation Library) plus project-authored cotton cloth
 * generated from the base body surface.
 *
 * Usage: node scripts/build_caral_worker.mjs [--out=src/assets/models/caral_worker.glb]
 *
 * Sources are fetched from the pinned mirror commit and verified by SHA-256.
 * The generated GLB owns one skeleton, the body/hair meshes and the worker
 * clips; tools and the carry bundle stay runtime attachments.
 */
const PIN = '1e83864f55ff8646e929ac9b73faa75df29161de';
const BASE = `https://raw.githubusercontent.com/Dallolz/moorfall-assets/${PIN}`;
const SOURCES = {
  base: {
    url: `${BASE}/characters/Superhero_Female.glb`,
    sha256: 'bfdb850a4b0725f19ec6f41b02203c2ae6ac76974ddf2ff270f92b63fea104b7',
  },
  hair: {
    url: `${BASE}/hair/Hair_Long.glb`,
    sha256: 'f8122525f83525c65fa6a6fb9869e6a4eb21045248c55e6e513646dbf9cb60de',
  },
  male: {
    url: `${BASE}/characters/Superhero_Male.glb`,
    sha256: '5011951317431872ba7d9310b3bd953a9387e68f83e35c6f091395b8a49dc3ee',
  },
  maleHair: {
    url: `${BASE}/hair/Hair_SimpleParted.glb`,
    sha256: '1f21aeef18109c81080cb01bbbe4ad80e95550ca3e89e51f762e6d6df1981c13',
  },
  ual1: {
    url: `${BASE}/animations/UAL1.glb`,
    sha256: '69591853d817488edaa8fd9bf8fc1d821eaeaf789f8627b3cd23b41c4ed67997',
  },
  ual2: {
    url: `${BASE}/animations/UAL2.glb`,
    sha256: '0815dd05531cae9bc313fc9c0ba81330bc72f8e19ec45f73738e74ddc5796a43',
  },
};
const CLIPS = [
  ['ual1', 'Idle_Loop'],
  ['ual1', 'Walk_Loop'],
  ['ual1', 'Jog_Fwd_Loop'],
  ['ual1', 'Sprint_Loop'],
  ['ual2', 'Farm_Harvest'],
  ['ual2', 'Farm_PlantSeed'],
  ['ual2', 'TreeChopping_Loop'],
  ['ual2', 'Walk_Carry_Loop'],
  ['ual1', 'Push_Loop'],
];
const outFile = path.resolve(cliArg('out', 'review/caral_worker_test.glb'));

const { base, close } = await withViteServer({ optimizeDeps: { noDiscovery: true } });
const browser = await launchChromium();
const page = await browser.newPage();
try {
  await page.goto(`${base}/?noloop=1`, { waitUntil: 'domcontentloaded' });
  const result = await page.evaluate(
    async ({ sources, clipsSpec }) => {
      const THREE = await import('/node_modules/three/build/three.module.js');
      const { GLTFLoader, GLTFExporter } = await import('/scripts/gltf_tools.mjs');
      const { HUMAN_HAIR, HUMAN_SKIN } = await import('/src/model/defs/people.ts');

      const hex = (buffer) => [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, '0')).join('');
      const load = async (entry, name) => {
        const response = await fetch(entry.url);
        if (!response.ok) throw new Error(`${name}: HTTP ${response.status}`);
        const buffer = await response.arrayBuffer();
        const digest = hex(await crypto.subtle.digest('SHA-256', buffer));
        if (digest !== entry.sha256) throw new Error(`${name}: SHA-256 mismatch (${digest})`);
        return new Promise((resolve, reject) => new GLTFLoader().parse(buffer, '', resolve, reject));
      };

      const [baseGltf, maleGltf, hairGltf, maleHairGltf, ual1, ual2] = await Promise.all([
        load(sources.base, 'base'),
        load(sources.male, 'male'),
        load(sources.hair, 'hair'),
        load(sources.maleHair, 'maleHair'),
        load(sources.ual1, 'ual1'),
        load(sources.ual2, 'ual2'),
      ]);

      const skinned = (root) => {
        const found = [];
        root.traverse((object) => {
          if (object.isSkinnedMesh) found.push(object);
        });
        return found;
      };
      const femaleMeshes = skinned(baseGltf.scene);
      const maleMeshes = skinned(maleGltf.scene);
      if (!femaleMeshes.length || !maleMeshes.length) throw new Error('base has no skinned mesh');
      const largest = (meshes) =>
        meshes.reduce((a, b) => (a.geometry.attributes.position.count > b.geometry.attributes.position.count ? a : b));
      const femaleBody = femaleMeshes.find((mesh) => mesh.name === 'Superhero_Female') ?? largest(femaleMeshes);
      const maleBody = largest(maleMeshes);
      const femaleEyes = femaleMeshes.find((mesh) => mesh.name === 'Eyes');
      const femaleBrows = femaleMeshes.find((mesh) => mesh.name === 'Eyebrows');
      const maleEyes = maleMeshes.find((mesh) => mesh.name === 'Face.001') ?? femaleEyes;
      const maleBrows =
        maleMeshes.find((mesh) => mesh.name === 'Face') ??
        maleMeshes.find((mesh) => mesh.material?.name === 'MI_Hair_1');
      const skeleton = femaleBody.skeleton;
      const boneIndex = new Map(skeleton.bones.map((bone, index) => [bone.name, index]));
      const bindMatrix = femaleBody.bindMatrix.clone();
      femaleBody.name = 'Body_f';
      if (femaleEyes) femaleEyes.name = 'Eyes_f';
      baseGltf.scene.updateMatrixWorld(true);
      maleGltf.scene.updateMatrixWorld(true);

      const rebind = (sourceMesh, name = sourceMesh.name) => {
        const remap = sourceMesh.skeleton.bones.map((bone) => boneIndex.get(bone.name));
        if (remap.some((index) => index === undefined)) {
          throw new Error(`${sourceMesh.name}: bone names do not match the base skeleton`);
        }
        const geometry = sourceMesh.geometry.clone();
        const skinIndex = geometry.getAttribute('skinIndex');
        if (!skinIndex) throw new Error(`${sourceMesh.name}: no skinIndex`);
        for (let i = 0; i < skinIndex.count; i++) {
          skinIndex.setX(i, remap[skinIndex.getX(i)]);
          skinIndex.setY(i, remap[skinIndex.getY(i)]);
          skinIndex.setZ(i, remap[skinIndex.getZ(i)]);
          skinIndex.setW(i, remap[skinIndex.getW(i)]);
        }
        skinIndex.needsUpdate = true;
        const mesh = new THREE.SkinnedMesh(geometry, sourceMesh.material.clone());
        mesh.name = name;
        mesh.bindMode = sourceMesh.bindMode;
        mesh.bind(skeleton, sourceMesh.bindMatrix);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.frustumCulled = false;
        sourceMesh.updateWorldMatrix(true, false);
        sourceMesh.matrixWorld.decompose(mesh.position, mesh.quaternion, mesh.scale);
        baseGltf.scene.add(mesh);
        return mesh;
      };

      const femaleHairMesh = skinned(hairGltf.scene)[0];
      if (!femaleHairMesh) throw new Error('female hair has no skinned mesh');
      const femaleHair = rebind(femaleHairMesh, 'Hair_f');
      femaleHair.material.color.set(HUMAN_HAIR);
      const maleHairMesh = skinned(maleHairGltf.scene)[0];
      if (!maleHairMesh) throw new Error('male hair has no skinned mesh');
      const maleHair = rebind(maleHairMesh, 'Hair_m');
      maleHair.material.color.set(HUMAN_HAIR);
      const addedMaleBody = rebind(maleBody, 'Body_m');
      if (maleEyes) rebind(maleEyes, 'Eyes_m');

      // Recolour the exposed skin to the shared darker Andean palette while
      // preserving the source shading and the dark facial features. The hip
      // mask still hides the CC0 underwear.
      const recolorBody = (bodyMesh) => {
        const bodyMaterial = bodyMesh.material.clone();
        bodyMesh.material = bodyMaterial;
        if (!bodyMaterial.map?.image) return;
        const image = bodyMaterial.map.image;
        const width = image.width;
        const height = image.height;
        const makeMask = () => {
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.fillStyle = '#fff';
          return { canvas, ctx };
        };
        const hip = makeMask();
        const faceMask = makeMask();
        const bodyMask = makeMask();
        const geometry = bodyMesh.geometry;
        const positions = geometry.getAttribute('position');
        const uvs = geometry.getAttribute('uv');
        const skinIndices = geometry.getAttribute('skinIndex');
        const skinWeights = geometry.getAttribute('skinWeight');
        const index = geometry.index;
        const triangles = index ? index.count / 3 : positions.count / 3;
        const faceBones = ['Head', 'neck_01'];
        const bodyBones = [
          'hand_l',
          'hand_r',
          'lowerarm_l',
          'lowerarm_r',
          'thigh_l',
          'thigh_r',
          'calf_l',
          'calf_r',
          'foot_l',
          'foot_r',
          'ball_l',
          'ball_r',
        ];
        const faceJoints = new Set(faceBones.map((name) => boneIndex.get(name)).filter((v) => v !== undefined));
        const bodyJoints = new Set(bodyBones.map((name) => boneIndex.get(name)).filter((v) => v !== undefined));
        const flip = bodyMaterial.map.flipY ? (v) => 1 - v : (v) => v;
        const fill = (ctx, ia, ib, ic) => {
          ctx.beginPath();
          ctx.moveTo(uvs.getX(ia) * width, flip(uvs.getY(ia)) * height);
          ctx.lineTo(uvs.getX(ib) * width, flip(uvs.getY(ib)) * height);
          ctx.lineTo(uvs.getX(ic) * width, flip(uvs.getY(ic)) * height);
          ctx.closePath();
          ctx.fill();
        };
        const dominantJoint = (i) => {
          let best = 0;
          for (let k = 1; k < 4; k++) {
            if (skinWeights.getComponent(i, k) > skinWeights.getComponent(i, best)) best = k;
          }
          return skinIndices.getComponent(i, best);
        };
        for (let t = 0; t < triangles; t++) {
          const ia = index ? index.getX(t * 3) : t * 3;
          const ib = index ? index.getX(t * 3 + 1) : t * 3 + 1;
          const ic = index ? index.getX(t * 3 + 2) : t * 3 + 2;
          const isHip = [ia, ib, ic].every((i) => {
            const y = positions.getY(i);
            return y >= 0.62 && y <= 1.08 && Math.abs(positions.getX(i)) < 0.42 && Math.abs(positions.getZ(i)) < 0.32;
          });
          if (isHip) fill(hip.ctx, ia, ib, ic);
          const jointsOf = [ia, ib, ic].map(dominantJoint);
          if (jointsOf.every((joint) => faceJoints.has(joint))) fill(faceMask.ctx, ia, ib, ic);
          if (jointsOf.every((joint) => bodyJoints.has(joint))) fill(bodyMask.ctx, ia, ib, ic);
        }
        const hipData = hip.ctx.getImageData(0, 0, width, height).data;
        const faceData = faceMask.ctx.getImageData(0, 0, width, height).data;
        const bodyData = bodyMask.ctx.getImageData(0, 0, width, height).data;
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(image, 0, 0);
        const imageData = ctx.getImageData(0, 0, width, height);
        const pixels = imageData.data;
        const target = HUMAN_SKIN.replace('#', '');
        const targetRgb = [
          parseInt(target.slice(0, 2), 16),
          parseInt(target.slice(2, 4), 16),
          parseInt(target.slice(4, 6), 16),
        ];
        for (let i = 0; i < pixels.length; i += 4) {
          const r = pixels[i];
          const g = pixels[i + 1];
          const b = pixels[i + 2];
          const max = Math.max(r, g, b);
          const min = Math.min(r, g, b);
          if (hipData[i + 3] !== 0 && max < 80) {
            pixels[i] = 158;
            pixels[i + 1] = 112;
            pixels[i + 2] = 82;
          }
          const shade = 0.72 + 0.45 * ((0.2126 * r + 0.7152 * g + 0.0722 * b) / 255);
          if (faceData[i + 3] !== 0) {
            // Keep the eyes, brows, mouth and grey sclera; tint only warm skin.
            const saturation = max === 0 ? 0 : (max - min) / max;
            const sclera = max > 190 && saturation < 0.1;
            if (max >= 60 && !sclera) {
              pixels[i] = Math.round(r * 0.15 + targetRgb[0] * shade * 0.85);
              pixels[i + 1] = Math.round(g * 0.15 + targetRgb[1] * shade * 0.85);
              pixels[i + 2] = Math.round(b * 0.15 + targetRgb[2] * shade * 0.85);
            }
          }
          if (bodyData[i + 3] !== 0 && max >= 50) {
            // Exposed hands/forearms/legs: tint the whole surface (the source
            // body texture may paint light sleeves/leggings there), keeping shadows.
            pixels[i] = Math.round(r * 0.15 + targetRgb[0] * shade * 0.85);
            pixels[i + 1] = Math.round(g * 0.15 + targetRgb[1] * shade * 0.85);
            pixels[i + 2] = Math.round(b * 0.15 + targetRgb[2] * shade * 0.85);
          }
        }
        ctx.putImageData(imageData, 0, 0);
        const skin = new THREE.CanvasTexture(canvas);
        skin.colorSpace = THREE.SRGBColorSpace;
        skin.flipY = bodyMaterial.map.flipY;
        skin.needsUpdate = true;
        bodyMaterial.map = skin;
        bodyMaterial.needsUpdate = true;
      };
      recolorBody(femaleBody);
      recolorBody(addedMaleBody);

      // The source eyebrows are ~1.5k triangles of hair cards. Replace them with
      // two low-poly strips sampled from the same surface so they keep the face
      // readable without doubling the worker's shadow cost.
      const addEyebrows = (sourceBrows, name) => {
        if (!sourceBrows) return;
        const sourcePositions = sourceBrows.geometry.getAttribute('position');
        const headBone = boneIndex.get('Head');
        if (headBone === undefined) throw new Error('Head bone not found');
        const brow = (side) => {
          const points = [];
          for (let i = 0; i < sourcePositions.count; i++) {
            const x = sourcePositions.getX(i);
            if (side > 0 ? x >= 0 : x < 0) {
              points.push({ x, y: sourcePositions.getY(i), z: sourcePositions.getZ(i) });
            }
          }
          const minX = Math.min(...points.map((p) => p.x));
          const maxX = Math.max(...points.map((p) => p.x));
          const columns = 5;
          const positions = [];
          const normals = [];
          const skinIndex = [];
          const skinWeight = [];
          const indices = [];
          for (let c = 0; c < columns; c++) {
            const x0 = minX + ((maxX - minX) * c) / columns;
            const x1 = minX + ((maxX - minX) * (c + 1)) / columns;
            const column = points.filter((p) => p.x >= x0 && (c === columns - 1 ? p.x <= x1 : p.x < x1));
            const sample = column.length ? column : points;
            const y = sample.reduce((sum, p) => sum + p.y, 0) / sample.length;
            const z = Math.max(...sample.map((p) => p.z)) + 0.001;
            const x = (x0 + x1) / 2;
            for (const dy of [-0.006, 0.006]) {
              positions.push(x, y + dy, z);
              normals.push(0, 0, 1);
              skinIndex.push(headBone, 0, 0, 0);
              skinWeight.push(1, 0, 0, 0);
            }
            if (c > 0) {
              const a = (c - 1) * 2;
              const b = c * 2;
              indices.push(a, a + 1, b, a + 1, b + 1, b);
            }
          }
          return { positions, normals, skinIndex, skinWeight, indices };
        };
        const halves = [brow(1), brow(-1)];
        const positions = [];
        const normals = [];
        const skinIndex = [];
        const skinWeight = [];
        const indices = [];
        let offset = 0;
        for (const half of halves) {
          positions.push(...half.positions);
          normals.push(...half.normals);
          skinIndex.push(...half.skinIndex);
          skinWeight.push(...half.skinWeight);
          indices.push(...half.indices.map((index) => index + offset));
          offset += half.positions.length / 3;
        }
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
        geometry.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(skinIndex, 4));
        geometry.setAttribute('skinWeight', new THREE.Float32BufferAttribute(skinWeight, 4));
        geometry.setIndex(indices);
        geometry.computeBoundingSphere();
        const material = new THREE.MeshStandardMaterial({
          color: 0x2a1c12,
          roughness: 0.95,
          side: THREE.DoubleSide,
        });
        const brows = new THREE.SkinnedMesh(geometry, material);
        brows.name = name;
        brows.bind(skeleton, bindMatrix);
        brows.castShadow = true;
        brows.receiveShadow = true;
        brows.frustumCulled = false;
        baseGltf.scene.add(brows);
      };
      addEyebrows(femaleBrows, 'Eyebrows_f');
      addEyebrows(maleBrows, 'Eyebrows_m');
      femaleBrows?.removeFromParent();

      // A short-sleeved cotton tunic derived from the body surface: same skin weights,
      // slightly offset along the normals, with the arms and neck excluded.
      const makeTunic = (sourceBody, { topY = 1.48, bottomY = 0.88, sideX = 0.22, offset = 0.03 } = {}) => {
        const geometry = sourceBody.geometry;
        const positions = geometry.getAttribute('position');
        const normals = geometry.getAttribute('normal');
        const uvs = geometry.getAttribute('uv');
        const skinIndex = geometry.getAttribute('skinIndex');
        const skinWeight = geometry.getAttribute('skinWeight');
        const index = geometry.index;
        const triangles = index ? index.count / 3 : positions.count / 3;

        const vertex = (i) => ({
          x: positions.getX(i),
          y: positions.getY(i),
          z: positions.getZ(i),
          nx: normals.getX(i),
          ny: normals.getY(i),
          nz: normals.getZ(i),
          u: uvs.getX(i),
          v: uvs.getY(i),
          si: [0, 1, 2, 3].map((j) => skinIndex.getComponent(i, j)),
          sw: [0, 1, 2, 3].map((j) => skinWeight.getComponent(i, j)),
        });
        const lerp = (a, b, t) => ({
          x: a.x + (b.x - a.x) * t,
          y: a.y + (b.y - a.y) * t,
          z: a.z + (b.z - a.z) * t,
          nx: a.nx + (b.nx - a.nx) * t,
          ny: a.ny + (b.ny - a.ny) * t,
          nz: a.nz + (b.nz - a.nz) * t,
          u: a.u + (b.u - a.u) * t,
          v: a.v + (b.v - a.v) * t,
          si: a.si.slice(),
          sw: a.sw.slice(),
        });
        const clip = (poly, nx, ny, nz, d) => {
          const out = [];
          for (let i = 0; i < poly.length; i++) {
            const a = poly[i];
            const b = poly[(i + 1) % poly.length];
            const da = nx * a.x + ny * a.y + nz * a.z + d;
            const db = nx * b.x + ny * b.y + nz * b.z + d;
            const insideA = da <= 0;
            const insideB = db <= 0;
            if (insideA) out.push(a);
            if (insideA !== insideB && Math.abs(da - db) > 1e-8) out.push(lerp(a, b, da / (da - db)));
          }
          return out;
        };

        const p = [];
        const n = [];
        const uv = [];
        const si = [];
        const sw = [];
        const indices = [];
        const planes = [
          [0, 1, 0, -topY],
          [0, -1, 0, bottomY],
          [1, 0, 0, -sideX],
          [-1, 0, 0, -sideX],
          [0, 0, 1, -sideX],
          [0, 0, -1, -sideX],
        ];
        for (let t = 0; t < triangles; t++) {
          const ia = index ? index.getX(t * 3) : t * 3;
          const ib = index ? index.getX(t * 3 + 1) : t * 3 + 1;
          const ic = index ? index.getX(t * 3 + 2) : t * 3 + 2;
          let poly = [vertex(ia), vertex(ib), vertex(ic)];
          for (const [nx, ny, nz, d] of planes) {
            poly = clip(poly, nx, ny, nz, d);
            if (poly.length < 3) break;
          }
          if (poly.length < 3) continue;
          const base = p.length / 3;
          for (const v of poly) {
            p.push(v.x + v.nx * offset, v.y + v.ny * offset, v.z + v.nz * offset);
            n.push(v.nx, v.ny, v.nz);
            uv.push(v.u, v.v);
            si.push(...v.si);
            sw.push(...v.sw);
          }
          for (let i = 1; i < poly.length - 1; i++) indices.push(base, base + i, base + i + 1);
        }
        const out = new THREE.BufferGeometry();
        out.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
        out.setAttribute('normal', new THREE.Float32BufferAttribute(n, 3));
        out.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
        out.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(si, 4));
        out.setAttribute('skinWeight', new THREE.Float32BufferAttribute(sw, 4));
        out.setIndex(indices);
        out.computeBoundingSphere();
        return out;
      };

      const makeTube = ({ topY, bottomY, topRx, topRz, bottomRx, bottomRz, segments, rings }) => {
        const p = [];
        const uv = [];
        const si = [];
        const sw = [];
        const indices = [];
        const pelvis = boneIndex.get('pelvis');
        const thighL = boneIndex.get('thigh_l');
        const thighR = boneIndex.get('thigh_r');
        if (pelvis === undefined || thighL === undefined || thighR === undefined) {
          throw new Error('hip bones not found');
        }
        for (let r = 0; r < rings; r++) {
          const t = r / (rings - 1);
          const y = topY + (bottomY - topY) * t;
          const rx = topRx + (bottomRx - topRx) * t;
          const rz = topRz + (bottomRz - topRz) * t;
          for (let s = 0; s < segments; s++) {
            const a = (s / segments) * Math.PI * 2;
            const fold = 1 + 0.02 * Math.sin(a * 7 + r * 0.9) + 0.008 * Math.sin(a * 3 - r * 1.7);
            const x = Math.cos(a) * rx * fold;
            const z = Math.sin(a) * rz * fold;
            p.push(x, y, z);
            uv.push((s / segments) * 2, t * 1.5);
            const lower = Math.min(1, Math.max(0, (topY - y) / (topY - bottomY)));
            const thigh = x >= 0 ? thighL : thighR;
            si.push(pelvis, thigh, 0, 0);
            sw.push(1 - lower * 0.55, lower * 0.55, 0, 0);
          }
        }
        for (let r = 0; r < rings - 1; r++) {
          for (let s = 0; s < segments; s++) {
            const a = r * segments + s;
            const b = r * segments + ((s + 1) % segments);
            const c = (r + 1) * segments + s;
            const d = (r + 1) * segments + ((s + 1) % segments);
            indices.push(a, b, c, b, d, c);
          }
        }
        const out = new THREE.BufferGeometry();
        out.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
        out.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
        out.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(si, 4));
        out.setAttribute('skinWeight', new THREE.Float32BufferAttribute(sw, 4));
        out.setIndex(indices);
        out.computeVertexNormals();
        out.computeBoundingSphere();
        return out;
      };

      const weaveCanvas = document.createElement('canvas');
      weaveCanvas.width = weaveCanvas.height = 256;
      const weaveCtx = weaveCanvas.getContext('2d');
      weaveCtx.fillStyle = '#cdbb95';
      weaveCtx.fillRect(0, 0, 256, 256);
      weaveCtx.globalAlpha = 0.16;
      weaveCtx.strokeStyle = '#8d7a58';
      for (let i = 0; i < 256; i += 4) {
        weaveCtx.beginPath();
        weaveCtx.moveTo(i, 0);
        weaveCtx.lineTo(i, 256);
        weaveCtx.stroke();
        weaveCtx.beginPath();
        weaveCtx.moveTo(0, i);
        weaveCtx.lineTo(256, i);
        weaveCtx.stroke();
      }
      weaveCtx.globalAlpha = 1;
      const weave = new THREE.CanvasTexture(weaveCanvas);
      weave.colorSpace = THREE.SRGBColorSpace;
      weave.wrapS = weave.wrapT = THREE.RepeatWrapping;
      weave.repeat.set(4, 4);
      const cotton = new THREE.MeshStandardMaterial({
        map: weave,
        color: 0xffffff,
        roughness: 0.96,
        metalness: 0,
        side: THREE.DoubleSide,
      });
      const sash = new THREE.MeshStandardMaterial({ color: 0x5f442c, roughness: 0.95, side: THREE.DoubleSide });

      const addSkinned = (geometry, material, name, bind = bindMatrix) => {
        const mesh = new THREE.SkinnedMesh(geometry, material);
        mesh.name = name;
        mesh.bind(skeleton, bind);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.frustumCulled = false;
        baseGltf.scene.add(mesh);
        return mesh;
      };
      const tunicF = addSkinned(makeTunic(femaleBody), cotton, 'attire_tunic_f');
      const tunicM = addSkinned(makeTunic(maleBody, { sideX: 0.3 }), cotton, 'attire_tunic_m', maleBody.bindMatrix);
      const skirtF = addSkinned(
        makeTube({
          topY: 0.97,
          bottomY: 0.68,
          topRx: 0.23,
          topRz: 0.17,
          bottomRx: 0.3,
          bottomRz: 0.23,
          segments: 32,
          rings: 7,
        }),
        cotton,
        'attire_skirt_f',
      );
      const cottonChasqui = cotton.clone();
      cottonChasqui.color.setHex(0xe8d8b8);
      const chasquiSkirtF = addSkinned(
        makeTube({
          topY: 0.97,
          bottomY: 0.58,
          topRx: 0.25,
          topRz: 0.19,
          bottomRx: 0.33,
          bottomRz: 0.25,
          segments: 32,
          rings: 7,
        }),
        cottonChasqui,
        'attire_skirt_chasqui_f',
      );
      const wrapM = addSkinned(
        makeTube({
          topY: 0.97,
          bottomY: 0.8,
          topRx: 0.25,
          topRz: 0.19,
          bottomRx: 0.29,
          bottomRz: 0.22,
          segments: 28,
          rings: 4,
        }),
        cotton,
        'attire_wrap_m',
        maleBody.bindMatrix,
      );
      const sashChasqui = new THREE.MeshStandardMaterial({
        color: 0x8a3b2a,
        roughness: 0.95,
        side: THREE.DoubleSide,
      });
      const chasquiBelt = addSkinned(
        makeTube({
          topY: 1.04,
          bottomY: 1.0,
          topRx: 0.27,
          topRz: 0.21,
          bottomRx: 0.28,
          bottomRz: 0.22,
          segments: 32,
          rings: 2,
        }),
        sashChasqui,
        'attire_belt_chasqui',
      );
      const belt = addSkinned(
        makeTube({
          topY: 0.98,
          bottomY: 0.93,
          topRx: 0.245,
          topRz: 0.185,
          bottomRx: 0.25,
          bottomRz: 0.19,
          segments: 32,
          rings: 2,
        }),
        sash,
        'attire_sash',
      );
      const byName = (gltf, name) => gltf.animations.find((clip) => clip.name === name);
      const animations = [];
      for (const [source, name] of clipsSpec) {
        const gltf = source === 'ual1' ? ual1 : ual2;
        const clip = byName(gltf, name);
        if (!clip) throw new Error(`missing clip ${name} in ${source}`);
        animations.push(clip);
      }

      const bounds = new THREE.Box3().setFromObject(baseGltf.scene);
      const size = new THREE.Vector3();
      bounds.getSize(size);
      const exporter = new GLTFExporter();
      const glb = await exporter.parseAsync(baseGltf.scene, {
        binary: true,
        animations,
        onlyVisible: false,
      });
      const bytes = new Uint8Array(glb);
      let binary = '';
      const chunk = 0x8000;
      for (let i = 0; i < bytes.length; i += chunk) {
        binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
      }
      return {
        base64: btoa(binary),
        size: bytes.length,
        height: size.y,
        width: size.x,
        depth: size.z,
        meshes: skinned(baseGltf.scene).length,
        animations: animations.map((clip) => clip.name),
        baseClips: femaleMeshes.length,
        customMeshes: [
          tunicF.name,
          tunicM.name,
          skirtF.name,
          chasquiSkirtF.name,
          wrapM.name,
          belt.name,
          chasquiBelt.name,
        ],
        hairMaterial: femaleHair.material.name,
        boneCount: skeleton.bones.length,
      };
    },
    { sources: SOURCES, clipsSpec: CLIPS },
  );

  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, Buffer.from(result.base64, 'base64'));
  delete result.base64;
  console.log(JSON.stringify(result, null, 2));
  console.log(`wrote ${outFile}`);
} finally {
  await browser.close();
  await close();
}
