// BridgeSketch 3D · Render quality tiers and the « Auto » choice.
// Auto reads the GPU name once (WEBGL_debug_renderer_info) for a first guess, then the viewer steps it down
// when the measured frame rate stays low. Tiers set the reflection scale, shadow map, pixel-ratio cap, meadow
// budget and the distances used by the tree and grass levels of detail.
export const tiers = ['performance', 'balanced', 'high'];
export const renderSettings = {
  performance: { reflection: 0, shadow: 2048, pixelRatio: 1, bloom: 0, treeNear: 40, grassNear: 16, grassFar: 55 },
  balanced: { reflection: 0.5, shadow: 4096, pixelRatio: 1.25, bloom: 0.08, treeNear: 70, grassNear: 26, grassFar: 90 },
  high: { reflection: 0.75, shadow: 4096, pixelRatio: 2, bloom: 0.1, treeNear: 120, grassNear: 45, grassFar: 150 },
};
let gpuName = '',
  guessed = null,
  stepped = null;

// First guess from the GPU name; unknown adapters get Balanced.
export function guessTier(name = gpuName) {
  const n = String(name);
  if (/swiftshader|llvmpipe|software|basic render|mali-[gt]\d|adreno \(tm\) [3-5]|powervr|intel.*(hd|uhd) graphics [2-6]\d\d\b/i.test(n))
    return 'performance';
  if (/rtx|radeon rx [5-9]\d{3}|radeon rx [67]\d00|gtx 1[06-9]\d0|gtx 16|apple m\d (pro|max|ultra)|arc\(tm\) a[57]/i.test(n))
    return 'high';
  if (/intel/i.test(n) && !/iris(\(r\))? xe|arc/i.test(n)) return 'performance';
  return 'balanced';
}
export function setGpuName(name) {
  gpuName = name || '';
  guessed = guessTier(gpuName);
}
export const gpuInfo = () => ({ name: gpuName, guessed, stepped });
// The tier actually used for a configuration: Auto resolves to the stepped-down or guessed tier.
export function effectiveQuality(q) {
  if (q !== 'auto') return tiers.includes(q) ? q : 'balanced';
  return stepped ?? guessed ?? 'balanced';
}
// Called by the viewer when Auto measures a sustained low frame rate; returns the new tier or null.
export function stepDownAuto(current) {
  const i = tiers.indexOf(current);
  if (i <= 0) return null;
  stepped = tiers[i - 1];
  return stepped;
}
