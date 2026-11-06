import type * as THREE from 'three';

/**
 * Keep alpha-tested foliage from thinning out with distance. Mipmapping averages the cut-out alpha
 * towards the background, so at a few mip levels most texels fall under `alphaTest` and a canopy
 * dissolves into a bare trunk. Scaling alpha up by the sampled mip level restores the coverage
 * (the usual "anti-aliased alpha test" fix) without blending or MSAA.
 */
export function preserveAlphaCoverage(material: THREE.Material, perMipLevel = 0.35): void {
  const previous = material.onBeforeCompile;
  material.onBeforeCompile = (shader, renderer) => {
    previous.call(material, shader, renderer);
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <alphatest_fragment>',
      `#ifdef USE_MAP
  {
    vec2 texel = vMapUv * vec2(textureSize(map, 0));
    float mipLevel = max(0.0, 0.5 * log2(max(dot(dFdx(texel), dFdx(texel)), dot(dFdy(texel), dFdy(texel)))));
    diffuseColor.a *= 1.0 + mipLevel * ${perMipLevel.toFixed(3)};
  }
#endif
#include <alphatest_fragment>`,
    );
  };
  const key = material.customProgramCacheKey.bind(material);
  material.customProgramCacheKey = () => `${key()}|alpha-coverage-${perMipLevel}`;
  material.needsUpdate = true;
}
