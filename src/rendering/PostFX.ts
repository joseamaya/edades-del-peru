import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { SSAOPass } from 'three/addons/postprocessing/SSAOPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { VignetteShader } from 'three/addons/shaders/VignetteShader.js';
import { FXAAShader } from 'three/addons/shaders/FXAAShader.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import type { ColorGrade } from '../model/defs/grades';

const ChromaticAberrationShader = {
  uniforms: {
    tDiffuse: { value: null },
    amount: { value: 0.0012 },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float amount;
    varying vec2 vUv;
    void main() {
      vec2 dir = vUv - 0.5;
      float dist = length(dir);
      vec2 off = dir * dist * amount;
      float r = texture2D(tDiffuse, vUv + off).r;
      float g = texture2D(tDiffuse, vUv).g;
      float b = texture2D(tDiffuse, vUv - off).b;
      gl_FragColor = vec4(r, g, b, 1.0);
    }
  `,
};

/** Display-referred period/biome color grade (applied after tone mapping). */
const ColorGradeShader = {
  uniforms: {
    tDiffuse: { value: null },
    saturation: { value: 1 },
    contrast: { value: 1 },
    lift: { value: new THREE.Vector3(0, 0, 0) },
    gain: { value: new THREE.Vector3(1, 1, 1) },
    temperature: { value: 0 },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float saturation;
    uniform float contrast;
    uniform vec3 lift;
    uniform vec3 gain;
    uniform float temperature;
    varying vec2 vUv;
    void main() {
      vec3 c = texture2D(tDiffuse, vUv).rgb;
      c = (c - 0.5) * contrast + 0.5;
      c.r += temperature * 0.06;
      c.b -= temperature * 0.06;
      c = c * gain + lift;
      float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
      c = mix(vec3(l), c, saturation);
      gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0);
    }
  `,
};

/**
 * AAA post-processing chain:
 * Render -> SSAO -> Bloom -> Gamma/ColorGrade -> Vignette+Aberration -> FXAA -> Output.
 */
export class PostFX {
  composer: EffectComposer;
  private bloomPass: UnrealBloomPass;
  private ssaoPass: SSAOPass;
  private vignettePass: ShaderPass;
  private fxaaPass: ShaderPass;
  private outputPass: OutputPass;
  private chromaticPass: ShaderPass;
  private colorGradePass: ShaderPass;

  /** Cinematic effects (SSAO, bloom, vignette, aberration). Off = sharp classic look. */
  cinematicEnabled = false;
  bloomEnabled = false;
  ssaoEnabled = false;
  vignetteEnabled = false;
  chromaticEnabled = false;
  colorGradeEnabled = false;

  constructor(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera, width: number, height: number) {
    this.composer = new EffectComposer(renderer);

    this.composer.addPass(new RenderPass(scene, camera));

    this.ssaoPass = new SSAOPass(scene, camera, width, height);
    this.ssaoPass.kernelRadius = 8;
    this.ssaoPass.minDistance = 1.0;
    this.ssaoPass.maxDistance = 35.0;
    this.composer.addPass(this.ssaoPass);

    this.bloomPass = new UnrealBloomPass(new THREE.Vector2(width, height), 0.35, 0.3, 0.85);
    this.composer.addPass(this.bloomPass);

    // chromatic aberration + vignette in HDR (before OutputPass)
    this.chromaticPass = new ShaderPass(ChromaticAberrationShader);
    this.chromaticPass.uniforms['amount'].value = 0.0008;
    this.composer.addPass(this.chromaticPass);

    this.vignettePass = new ShaderPass(VignetteShader);
    this.vignettePass.uniforms['offset'].value = 0.32;
    this.vignettePass.uniforms['darkness'].value = 0.4;
    this.composer.addPass(this.vignettePass);

    this.outputPass = new OutputPass();
    this.composer.addPass(this.outputPass);

    this.colorGradePass = new ShaderPass(ColorGradeShader);
    this.composer.addPass(this.colorGradePass);

    this.fxaaPass = new ShaderPass(FXAAShader);
    this.composer.addPass(this.fxaaPass);
  }

  setSize(width: number, height: number): void {
    this.composer.setSize(width, height);
    const pixelRatio = this.composer.renderer.getPixelRatio();
    this.ssaoPass.setSize(width * pixelRatio, height * pixelRatio);
    (this.fxaaPass.uniforms['resolution'].value as THREE.Vector2).set(
      1 / (width * pixelRatio),
      1 / (height * pixelRatio),
    );
  }

  /** Adjust the cinematic effects quality (does not enable them). */
  setQuality(level: 'high' | 'medium' | 'low'): void {
    if (level === 'high') {
      this.ssaoPass.kernelRadius = 8;
      this.bloomPass.strength = 0.35;
    } else if (level === 'medium') {
      this.ssaoPass.kernelRadius = 4;
      this.bloomPass.strength = 0.28;
    } else {
      this.bloomPass.strength = 0.0;
    }
  }

  /** Enable or disable the whole cinematic effects set. */
  setCinematic(on: boolean): void {
    this.cinematicEnabled = on;
    this.ssaoEnabled = on;
    this.bloomEnabled = on;
    this.vignetteEnabled = on;
    this.chromaticEnabled = on;
    this.colorGradeEnabled = on;
  }

  /** Set the display-referred period/biome color grade. */
  setColorGrade(grade: ColorGrade): void {
    const u = this.colorGradePass.uniforms;
    u['saturation'].value = grade.saturation;
    u['contrast'].value = grade.contrast;
    (u['lift'].value as THREE.Vector3).set(grade.lift[0], grade.lift[1], grade.lift[2]);
    (u['gain'].value as THREE.Vector3).set(grade.gain[0], grade.gain[1], grade.gain[2]);
    u['temperature'].value = grade.temperature;
  }

  setBloom(strength: number, radius: number, threshold: number): void {
    this.bloomPass.strength = strength;
    this.bloomPass.radius = radius;
    this.bloomPass.threshold = threshold;
  }

  render(dt: number): void {
    this.ssaoPass.enabled = this.ssaoEnabled;
    this.bloomPass.enabled = this.bloomEnabled;
    this.vignettePass.enabled = this.vignetteEnabled;
    this.chromaticPass.enabled = this.chromaticEnabled;
    this.colorGradePass.enabled = this.colorGradeEnabled;
    this.composer.render(dt);
  }

  dispose(): void {
    for (const pass of this.composer.passes) {
      const p = pass as unknown as { dispose?: () => void };
      p.dispose?.();
    }
    this.composer.renderTarget1?.dispose();
    this.composer.renderTarget2?.dispose();
  }
}
