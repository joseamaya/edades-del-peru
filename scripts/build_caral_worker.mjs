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
  ['ual2', 'Farm_Harvest'],
  ['ual2', 'Farm_PlantSeed'],
  ['ual2', 'TreeChopping_Loop'],
  ['ual2', 'Walk_Carry_Loop'],
  ['ual1', 'Push_Loop'],
];
const outFile = path.resolve(cliArg('out', 'review/caral_worker_test.glb'));

const { base, close } = await withViteServer();
const browser = await launchChromium();
const page = await browser.newPage();
try {
  await page.goto(`${base}/?noloop=1`, { waitUntil: 'domcontentloaded' });
  const result = await page.evaluate(
    async ({ sources, clipsSpec }) => {
      const THREE = await import('/node_modules/three/build/three.module.js');
      const { GLTFLoader } = await import('/node_modules/three/examples/jsm/loaders/GLTFLoader.js');
      const { GLTFExporter } = await import('/node_modules/three/examples/jsm/exporters/GLTFExporter.js');

      const hex = (buffer) => [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, '0')).join('');
      const load = async (entry, name) => {
        const response = await fetch(entry.url);
        if (!response.ok) throw new Error(`${name}: HTTP ${response.status}`);
        const buffer = await response.arrayBuffer();
        const digest = hex(await crypto.subtle.digest('SHA-256', buffer));
        if (digest !== entry.sha256) throw new Error(`${name}: SHA-256 mismatch (${digest})`);
        return new Promise((resolve, reject) => new GLTFLoader().parse(buffer, '', resolve, reject));
      };

      const [baseGltf, hairGltf, ual1, ual2] = await Promise.all([
        load(sources.base, 'base'),
        load(sources.hair, 'hair'),
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
      const baseMeshes = skinned(baseGltf.scene);
      if (!baseMeshes.length) throw new Error('base has no skinned mesh');
      const bodyMesh = baseMeshes.reduce((a, b) =>
        a.geometry.attributes.position.count > b.geometry.attributes.position.count ? a : b,
      );
      const skeleton = bodyMesh.skeleton;
      const boneIndex = new Map(skeleton.bones.map((bone, index) => [bone.name, index]));
      const bindMatrix = bodyMesh.bindMatrix.clone();
      baseGltf.scene.updateMatrixWorld(true);

      const rebind = (sourceMesh) => {
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
        mesh.name = sourceMesh.name;
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

      const hairMesh = skinned(hairGltf.scene)[0];
      if (!hairMesh) throw new Error('hair has no skinned mesh');
      const addedHair = rebind(hairMesh);
      addedHair.material.color.setHex(0x2a1c12);

      // Remove the base body's black underwear by recolouring dark pixels only
      // inside the hip/waist UV region (the face is left untouched).
      const bodyMaterial = bodyMesh.material.clone();
      bodyMesh.material = bodyMaterial;
      if (bodyMaterial.map?.image) {
        const image = bodyMaterial.map.image;
        const width = image.width;
        const height = image.height;
        const mask = document.createElement('canvas');
        mask.width = width;
        mask.height = height;
        const maskCtx = mask.getContext('2d');
        maskCtx.fillStyle = '#fff';
        const geometry = bodyMesh.geometry;
        const positions = geometry.getAttribute('position');
        const uvs = geometry.getAttribute('uv');
        const index = geometry.index;
        const triangles = index ? index.count / 3 : positions.count / 3;
        for (let t = 0; t < triangles; t++) {
          const ia = index ? index.getX(t * 3) : t * 3;
          const ib = index ? index.getX(t * 3 + 1) : t * 3 + 1;
          const ic = index ? index.getX(t * 3 + 2) : t * 3 + 2;
          const hip = [ia, ib, ic].every((i) => {
            const y = positions.getY(i);
            return y >= 0.62 && y <= 1.08 && Math.abs(positions.getX(i)) < 0.42 && Math.abs(positions.getZ(i)) < 0.32;
          });
          if (!hip) continue;
          const flip = bodyMaterial.map.flipY ? (v) => 1 - v : (v) => v;
          maskCtx.beginPath();
          maskCtx.moveTo(uvs.getX(ia) * width, flip(uvs.getY(ia)) * height);
          maskCtx.lineTo(uvs.getX(ib) * width, flip(uvs.getY(ib)) * height);
          maskCtx.lineTo(uvs.getX(ic) * width, flip(uvs.getY(ic)) * height);
          maskCtx.closePath();
          maskCtx.fill();
        }
        const maskData = maskCtx.getImageData(0, 0, width, height).data;
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(image, 0, 0);
        const imageData = ctx.getImageData(0, 0, width, height);
        const pixels = imageData.data;
        for (let i = 0; i < pixels.length; i += 4) {
          if (maskData[i + 3] === 0) continue;
          const r = pixels[i];
          const g = pixels[i + 1];
          const b = pixels[i + 2];
          if (Math.max(r, g, b) < 80) {
            pixels[i] = 158;
            pixels[i + 1] = 112;
            pixels[i + 2] = 82;
          }
        }
        ctx.putImageData(imageData, 0, 0);
        const skin = new THREE.CanvasTexture(canvas);
        skin.colorSpace = THREE.SRGBColorSpace;
        skin.flipY = bodyMaterial.map.flipY;
        skin.needsUpdate = true;
        bodyMaterial.map = skin;
        bodyMaterial.needsUpdate = true;
      }

      // A sleeveless cotton tunic derived from the body surface: same skin weights,
      // slightly offset along the normals, with the arms and neck excluded.
      const makeTunic = () => {
        const geometry = bodyMesh.geometry;
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
          [0, 1, 0, -1.4],
          [0, -1, 0, 0.88],
          [1, 0, 0, -0.3],
          [-1, 0, 0, -0.3],
          [0, 0, 1, -0.22],
          [0, 0, -1, -0.22],
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
            p.push(v.x + v.nx * 0.018, v.y + v.ny * 0.018, v.z + v.nz * 0.018);
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

      const makeTube = (topY, bottomY, topRx, topRz, bottomRx, bottomRz, segments, rings) => {
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
            const fold = 1 + 0.035 * Math.sin(a * 7 + r * 0.9) + 0.015 * Math.sin(a * 3 - r * 1.7);
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

      const addSkinned = (geometry, material, name) => {
        const mesh = new THREE.SkinnedMesh(geometry, material);
        mesh.name = name;
        mesh.bind(skeleton, bindMatrix);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.frustumCulled = false;
        baseGltf.scene.add(mesh);
        return mesh;
      };
      const tunic = addSkinned(makeTunic(), cotton, 'attire_tunic');
      const skirt = addSkinned(makeTube(0.97, 0.68, 0.23, 0.17, 0.3, 0.23, 32, 7), cotton, 'attire_skirt');
      const belt = addSkinned(makeTube(0.98, 0.93, 0.245, 0.185, 0.25, 0.19, 32, 2), sash, 'attire_sash');
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
        baseClips: baseMeshes.length,
        customMeshes: [tunic.name, skirt.name, belt.name],
        hairMaterial: addedHair.material.name,
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
