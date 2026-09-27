// BridgeSketch 3D · Procedural trees from EZ-Tree (MIT, Daniel Greenheck, vendor/ez-tree).
// A few species are grown once per quality level, then instanced: one draw call for all bark
// and one per leaf texture. Leaves keep EZ-Tree's rounded crown normals and get wind sway and
// sun back-lighting in the shader; bark and leaf textures are bundled locally.
import * as T from 'three';
import { Tree } from './vendor/ez-tree/tree.js';
import { TreePreset } from './vendor/ez-tree/presets.js';
import { grassUniforms } from './grass.mjs';

// Mesh detail per render quality (EZ-Tree LOD options): about 5k, 3k and 1.5k triangles per tree.
const detail = {
  high: { sectionStride: 3, segmentFactor: 0.6, leafStride: 1, leafScale: 1.05 },
  balanced: { sectionStride: 4, segmentFactor: 0.5, leafStride: 1, leafScale: 1.15, billboard: 'single' },
  performance: { sectionStride: 5, segmentFactor: 0.45, leafStride: 2, leafScale: 1.5, billboard: 'single' },
};
export const species = [
  { preset: 'Oak Small', leaf: 'oak', share: 0.45, height: [8, 13] },
  { preset: 'Ash Small', leaf: 'ash', share: 0.33, height: [9, 14] },
  { preset: 'Aspen Medium', leaf: 'aspen', share: 0.22, height: [10, 15] },
];
const cache = new Map();

// Unit-height geometries (1 m tall, base at the origin), cached across rebuilds.
export function treeKit(quality = 'balanced') {
  if (cache.has(quality)) return cache.get(quality);
  const kit = species.map(sp => {
    const tree = new Tree();
    tree.options.copy(structuredClone(TreePreset[sp.preset]));
    const { branches, leaves } = tree.createGeometry(detail[quality] ?? detail.balanced);
    branches.computeBoundingBox();
    const h = branches.boundingBox.max.y || 1;
    for (const g of [branches, leaves]) {
      g.scale(1 / h, 1 / h, 1 / h);
      g.computeBoundingSphere();
    }
    tree.branchesMesh.geometry.dispose();
    tree.leavesMesh.geometry.dispose();
    return { ...sp, branches, leaves };
  });
  cache.set(quality, kit);
  return kit;
}

// Leaf material: alpha-tested texture, wind sway shared with the meadow, translucent back-lighting.
export function prepareLeafMaterial(material, snow = false) {
  material.side = T.DoubleSide;
  material.alphaTest = 0.5;
  material.roughness = 0.82;
  material.customProgramCacheKey = () => 'bridgesketch-leaves-060' + (snow ? '-snow' : '');
  material.onBeforeCompile = shader => {
    Object.assign(shader.uniforms, grassUniforms);
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
uniform float grassTime,windStrength;uniform vec2 windDirection;varying vec3 vLeafWorld;varying float vLeafHeight;`,
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
vLeafHeight=position.y;
#ifdef USE_INSTANCING
{
  vec3 root=(modelMatrix*instanceMatrix*vec4(0.,0.,0.,1.)).xyz;
  float sway=sin(grassTime*1.3+dot(root.xz,vec2(.21,.17))+position.y*2.)*.012+sin(grassTime*3.1+position.x*9.+position.z*7.)*.004;
  transformed+=vec3(windDirection.x,0.,windDirection.y)*sway*windStrength*position.y;
}
#endif
#ifdef USE_INSTANCING
vLeafWorld=(modelMatrix*instanceMatrix*vec4(transformed,1.)).xyz;
#else
vLeafWorld=(modelMatrix*vec4(transformed,1.)).xyz;
#endif`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
uniform vec3 sunDirection,sunColor;uniform float backlight;varying vec3 vLeafWorld;varying float vLeafHeight;`,
      )
      // Keep distant leaves: alpha loses coverage in the mip chain, so it is boosted per mip level (alpha-test cards).
      .replace(
        '#include <map_fragment>',
        `#include <map_fragment>
#ifdef USE_MAP
{
  vec2 texel=vMapUv*512.;
  float lod=max(0.,.5*log2(max(dot(dFdx(texel),dFdx(texel)),dot(dFdy(texel),dFdy(texel)))));
  diffuseColor.a*=1.+lod*.3;
}
#endif`,
      )
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
diffuseColor.rgb*=mix(.74,1.15,smoothstep(.25,1.,vLeafHeight));${snow ? '\ndiffuseColor.rgb=mix(diffuseColor.rgb,vec3(.78,.84,.84),.5);' : ''}`,
      )
      .replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
{
  vec3 V=normalize(cameraPosition-vLeafWorld),L=normalize(sunDirection);
  totalEmissiveRadiance+=sunColor*diffuseColor.rgb*pow(max(dot(-V,L),0.),4.)*(.5+.6*backlight);
}`,
      );
  };
  return material;
}

// Instance every species at its share of the placements; tree.scale (1.1–2.6) sets its height.
export function addTrees(parent, m, trees, rng, { quality = 'balanced', snow = false } = {}) {
  if (!trees.length) return [];
  const kit = treeKit(quality),
    groups = kit.map(() => []);
  for (const t of trees) {
    let pick = rng(),
      k = 0;
    while (k < kit.length - 1 && pick > kit[k].share) pick -= kit[k++].share;
    groups[k].push(t);
  }
  const meshes = [],
    dummy = new T.Object3D(),
    tint = new T.Color();
  kit.forEach((sp, k) => {
    const items = groups[k];
    if (!items.length) return;
    const leafMaterial = snow ? m.leavesSnow[sp.leaf] : m.leaves[sp.leaf];
    for (const [geometry, material, name] of [
      [sp.branches, m.bark, `EZ-Tree ${sp.preset} bark`],
      [sp.leaves, leafMaterial, `EZ-Tree ${sp.preset} leaves`],
    ]) {
      const mesh = new T.InstancedMesh(geometry, material, items.length);
      items.forEach((t, i) => {
        const h = sp.height[0] + ((t.scale - 1.1) / 1.5) * (sp.height[1] - sp.height[0]);
        dummy.position.set(t.x, t.y - 0.05, t.z);
        dummy.rotation.set(0, t.rotation * 2, 0);
        dummy.scale.setScalar(h);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
        if (material !== m.bark) mesh.setColorAt(i, tint.setHSL(0.24 + (t.hue ?? 0), 0.25, 0.5).lerp(new T.Color(1, 1, 1), 0.72));
      });
      mesh.name = name;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.userData.sharedGeometry = true;
      if (material !== m.bark && material.map)
        mesh.customDepthMaterial = new T.MeshDepthMaterial({
          depthPacking: T.RGBADepthPacking,
          map: material.map,
          alphaTest: 0.5,
          side: T.DoubleSide,
        });
      parent.add(mesh);
      meshes.push(mesh);
    }
  });
  return meshes;
}
