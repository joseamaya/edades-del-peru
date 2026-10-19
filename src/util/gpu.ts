/** Heuristic: is this WebGL renderer a software rasterizer (no GPU)? */
export function isSoftwareRenderer(name: string): boolean {
  const s = name.toLowerCase();
  return (
    s.includes('swiftshader') ||
    s.includes('llvmpipe') ||
    s.includes('softpipe') ||
    s.includes('software rasterizer') ||
    s.includes('microsoft basic render')
  );
}

/** Best-effort renderer string (unmasked when the debug extension is available). */
export function gpuRendererName(gl: WebGLRenderingContext | WebGL2RenderingContext): string {
  const ext = gl.getExtension('WEBGL_debug_renderer_info') as { UNMASKED_RENDERER_WEBGL: number } | null;
  const raw = gl.getParameter(ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER);
  return typeof raw === 'string' ? raw : '';
}

export function detectSoftwareRenderer(gl: WebGLRenderingContext | WebGL2RenderingContext): boolean {
  return isSoftwareRenderer(gpuRendererName(gl));
}
