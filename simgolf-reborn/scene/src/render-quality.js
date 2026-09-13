// Software WebGL has no dedicated GPU. Keep shadows and full scene geometry,
// but avoid a 16-million-pixel shadow pass on every frame.
export function renderQuality(renderer, pixelRatio = 1) {
 const gl = renderer.getContext();
 const debug = gl.getExtension('WEBGL_debug_renderer_info');
 const name = String(gl.getParameter(debug ? debug.UNMASKED_RENDERER_WEBGL : gl.RENDERER));
 const software = /swiftshader|llvmpipe|softpipe|software rasterizer/i.test(name);
 return {pixelRatio: Math.min(pixelRatio, software ? 1 : 1.75), shadowSize: software ? 1024 : 4096};
}
