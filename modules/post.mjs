// BridgeSketch 3D · Post-processing: physically based bloom and a light vignette, in the style of current game
// engines (Jimenez, « Next Generation Post Processing in Call of Duty: Advanced Warfare », SIGGRAPH 2014):
// the scene renders into a 4× MSAA half-float target, a 13-tap downsample chain (Karis-averaged with a soft
// threshold on the first level) feeds a 3×3 tent upsample, and the final pass adds the bloom before the
// renderer's own ACES tone mapping and sRGB output. About 1 ms on mid-range GPUs at 1080p.
import * as T from 'three';

const vertexShader = 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';

const downsample = new T.ShaderMaterial({
  uniforms: { src: { value: null }, texel: { value: new T.Vector2() }, prefilter: { value: false }, threshold: { value: 1 }, knee: { value: 0.5 } },
  vertexShader,
  fragmentShader: `
    uniform sampler2D src; uniform vec2 texel; uniform bool prefilter; uniform float threshold, knee;
    varying vec2 vUv;
    vec3 s(float x, float y) { return texture2D(src, vUv + vec2(x, y) * texel).rgb; }
    float w(vec3 c) { return 1.0 / (1.0 + dot(c, vec3(0.2126, 0.7152, 0.0722))); }
    void main() {
      vec3 a = s(-2., 2.), b = s(0., 2.), c = s(2., 2.), d = s(-2., 0.), e = s(0., 0.), f = s(2., 0.),
        g = s(-2., -2.), h = s(0., -2.), i = s(2., -2.), j = s(-1., 1.), k = s(1., 1.), l = s(-1., -1.), m = s(1., -1.);
      vec3 g0 = (j + k + l + m) * 0.25, g1 = (a + b + d + e) * 0.25, g2 = (b + c + e + f) * 0.25,
        g3 = (d + e + g + h) * 0.25, g4 = (e + f + h + i) * 0.25, col;
      if (prefilter) {
        // Karis average: luminance-weighted groups remove single-pixel fireflies (sun glints on water).
        float w0 = w(g0) * 0.5, w1 = w(g1) * 0.125, w2 = w(g2) * 0.125, w3 = w(g3) * 0.125, w4 = w(g4) * 0.125;
        col = (g0 * w0 + g1 * w1 + g2 * w2 + g3 * w3 + g4 * w4) / (w0 + w1 + w2 + w3 + w4);
        float br = max(col.r, max(col.g, col.b)),
          soft = clamp(br - threshold + knee, 0.0, 2.0 * knee);
        soft = soft * soft / (4.0 * knee + 1e-4);
        col *= max(soft, br - threshold) / max(br, 1e-4);
      } else col = g0 * 0.5 + (g1 + g2 + g3 + g4) * 0.125;
      gl_FragColor = vec4(min(col, vec3(64.0)), 1.0);
    }`,
  depthTest: false,
  depthWrite: false,
});

const upsample = new T.ShaderMaterial({
  uniforms: { src: { value: null }, texel: { value: new T.Vector2() }, radius: { value: 1 } },
  vertexShader,
  fragmentShader: `
    uniform sampler2D src; uniform vec2 texel; uniform float radius;
    varying vec2 vUv;
    vec3 s(float x, float y) { return texture2D(src, vUv + vec2(x, y) * texel * radius).rgb; }
    void main() {
      vec3 col = (s(-1., 1.) + s(1., 1.) + s(-1., -1.) + s(1., -1.)) + 2.0 * (s(0., 1.) + s(-1., 0.) + s(1., 0.) + s(0., -1.)) + 4.0 * s(0., 0.);
      gl_FragColor = vec4(col / 16.0, 1.0);
    }`,
  blending: T.AdditiveBlending,
  depthTest: false,
  depthWrite: false,
});

const composite = new T.ShaderMaterial({
  uniforms: { scene: { value: null }, bloom: { value: null }, strength: { value: 0.1 }, vignette: { value: 0.12 } },
  vertexShader,
  fragmentShader: `
    uniform sampler2D scene, bloom; uniform float strength, vignette;
    varying vec2 vUv;
    void main() {
      vec4 base = texture2D(scene, vUv);
      vec2 q = vUv - 0.5;
      vec3 col = (base.rgb + texture2D(bloom, vUv).rgb * strength) * (1.0 - vignette * dot(q, q) * 2.0);
      gl_FragColor = vec4(col, base.a);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`,
  depthTest: false,
  depthWrite: false,
});

export function createPost(renderer, { levels = 5 } = {}) {
  const quad = new T.Mesh(new T.PlaneGeometry(2, 2)),
    camera = new T.OrthographicCamera(-1, 1, 1, -1, 0, 1),
    size = new T.Vector2(),
    target = (w, h, samples = 0) =>
      new T.WebGLRenderTarget(w, h, { type: T.HalfFloatType, samples, depthBuffer: samples > 0, magFilter: T.LinearFilter, minFilter: T.LinearFilter });
  quad.frustumCulled = false;
  let sceneTarget = null,
    mips = [];
  const pass = (material, out) => {
    quad.material = material;
    renderer.setRenderTarget(out);
    renderer.render(quad, camera);
  };
  const resize = () => {
    renderer.getDrawingBufferSize(size);
    if (sceneTarget && sceneTarget.width === size.x && sceneTarget.height === size.y) return;
    sceneTarget?.dispose();
    for (const m of mips) m.dispose();
    sceneTarget = target(size.x, size.y, 4);
    mips = [];
    for (let i = 0, w = size.x, h = size.y; i < levels; i++) {
      w = Math.max(1, w >> 1);
      h = Math.max(1, h >> 1);
      mips.push(target(w, h));
    }
  };
  return {
    // Strength 0 renders straight to the canvas (Performance tier, or post-processing turned off).
    render(scene, view, { strength = 0.1, threshold = 1, vignette = 0.12 } = {}) {
      if (!(strength > 0)) {
        renderer.setRenderTarget(null);
        renderer.render(scene, view);
        return;
      }
      resize();
      const autoClear = renderer.autoClear;
      renderer.setRenderTarget(sceneTarget);
      renderer.render(scene, view);
      renderer.autoClear = true;
      downsample.uniforms.threshold.value = threshold;
      let src = sceneTarget;
      mips.forEach((mip, i) => {
        downsample.uniforms.src.value = src.texture;
        downsample.uniforms.texel.value.set(1 / src.width, 1 / src.height);
        downsample.uniforms.prefilter.value = i === 0;
        pass(downsample, mip);
        src = mip;
      });
      renderer.autoClear = false;
      for (let i = mips.length - 1; i > 0; i--) {
        upsample.uniforms.src.value = mips[i].texture;
        upsample.uniforms.texel.value.set(1 / mips[i].width, 1 / mips[i].height);
        pass(upsample, mips[i - 1]);
      }
      renderer.autoClear = true;
      composite.uniforms.scene.value = sceneTarget.texture;
      composite.uniforms.bloom.value = mips[0].texture;
      composite.uniforms.strength.value = strength;
      composite.uniforms.vignette.value = vignette;
      pass(composite, null);
      renderer.autoClear = autoClear;
    },
    dispose() {
      sceneTarget?.dispose();
      for (const m of mips) m.dispose();
      quad.geometry.dispose();
    },
  };
}
