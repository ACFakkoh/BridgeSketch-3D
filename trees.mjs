// BridgeSketch 3D · Procedural trees from EZ-Tree (MIT, Daniel Greenheck, vendor/ez-tree).
// A few species are grown once per quality level, then instanced: one draw call for all bark
// and one per leaf texture. Leaves keep EZ-Tree's rounded crown normals and get wind sway and
// sun back-lighting in the shader; bark and leaf textures are bundled locally.
import * as T from 'three';
import { Tree } from './vendor/ez-tree/tree.js';
import { TreePreset } from './vendor/ez-tree/presets.js';
import { grassUniforms } from './grass.mjs';

// Mesh detail per render quality (EZ-Tree LOD options): about 5k, 3k and 1.5k triangles per tree.
// 'far' is the distant level of detail shared by every tier (about 450 triangles per tree).
const detail = {
  high: { sectionStride: 3, segmentFactor: 0.6, leafStride: 1, leafScale: 1.05 },
  balanced: { sectionStride: 4, segmentFactor: 0.5, leafStride: 1, leafScale: 1.15, billboard: 'single' },
  performance: { sectionStride: 5, segmentFactor: 0.45, leafStride: 2, leafScale: 1.5, billboard: 'single' },
  far: { sectionStride: 8, segmentFactor: 0.3, leafStride: 3, leafScale: 1.75, billboard: 'single' },
};
export const species = [
  // Heights read against a 7 m high, 12 m wide deck: young riverside trees rather than mature 15 m crowns.
  { preset: 'Oak Small', leaf: 'oak', share: 0.45, height: [5, 8.5] },
  { preset: 'Ash Small', leaf: 'ash', share: 0.33, height: [5.5, 9.5] },
  { preset: 'Aspen Medium', leaf: 'aspen', share: 0.22, height: [6.5, 10.5] },
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
// season: 'summer', 'snow' (frosted) or 'fall' (greyscale leaf texture recoloured by the autumn instance colours).
export function prepareLeafMaterial(material, season = 'summer') {
  const snow = season === 'snow' || season === true,
    fall = season === 'fall';
  material.side = T.DoubleSide;
  material.alphaTest = 0.5;
  material.roughness = 0.82;
  material.customProgramCacheKey = () => 'bridgesketch-leaves-055' + (snow ? '-snow' : fall ? '-fall' : '');
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
}${fall ? '\ndiffuseColor.rgb=vec3(dot(diffuseColor.rgb,vec3(.3,.59,.11)))*2.3;' : ''}
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

// Autumn palette (instance colours over a greyscale leaf texture): yellow, orange, red and a few late greens.
export const fallPalette = ['#f2c029', '#e8a321', '#e07b1e', '#d4531b', '#b8321f', '#9b2a22', '#c9b43a', '#7f8f2d'];

// Instance every species at its share of the placements; tree.scale (1.1–2.6) sets its height.
// Two levels of detail per species: trees near the camera use the tier's geometry, the others the 'far' kit.
// lod(cameraPosition) re-sorts the instances; it is cheap (a few hundred trees) and runs when the camera moves.
export function addTrees(parent, m, trees, rng, { quality = 'balanced', season = 'summer', near = 70 } = {}) {
  if (!trees.length) return null;
  const kits = [treeKit(quality), treeKit('far')],
    groups = kits[0].map(() => []);
  for (const t of trees) {
    let pick = rng(),
      k = 0;
    while (k < kits[0].length - 1 && pick > kits[0][k].share) pick -= kits[0][k++].share;
    groups[k].push(t);
  }
  const dummy = new T.Object3D(),
    tint = new T.Color(),
    autumn = fallPalette.map(c => new T.Color(c)),
    sets = [];
  const leafSet = season === 'snow' ? m.leavesSnow : season === 'fall' ? m.leavesFall : m.leaves;
  kits[0].forEach((sp, k) => {
    const items = groups[k];
    if (!items.length) return;
    const matrices = items.map(t => {
        const h = sp.height[0] + ((t.scale - 1.1) / 1.5) * (sp.height[1] - sp.height[0]);
        dummy.position.set(t.x, t.y - 0.05, t.z);
        dummy.rotation.set(0, t.rotation * 2, 0);
        dummy.scale.setScalar(h);
        dummy.updateMatrix();
        return dummy.matrix.clone();
      }),
      colors = items.map(t =>
        season === 'fall'
          ? tint
              .copy(autumn[Math.floor(((t.hue ?? 0) / 0.06 + 0.5) * autumn.length * 0.999)])
              .offsetHSL(0, 0, ((t.scale - 1.8) * 0.04))
              .clone()
          : tint.setHSL(0.24 + (t.hue ?? 0), 0.25, 0.5).lerp(new T.Color(1, 1, 1), 0.72).clone(),
      );
    const leafMaterial = leafSet[sp.leaf],
      levels = kits.map((kit, level) =>
        [
          [kit[k].branches, m.bark, `EZ-Tree ${sp.preset} bark${level ? ' (far)' : ''}`],
          [kit[k].leaves, leafMaterial, `EZ-Tree ${sp.preset} leaves${level ? ' (far)' : ''}`],
        ].map(([geometry, material, name]) => {
          const mesh = new T.InstancedMesh(geometry, material, items.length);
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
          return mesh;
        }),
      );
    sets.push({ items, matrices, colors, levels });
  });
  const origin = new T.Vector3();
  let last = null;
  const lod = (camera, force = false) => {
    if (!force && last && last.distanceToSquared(camera) < 4) return false;
    last = (last ?? new T.Vector3()).copy(camera);
    for (const { items, matrices, colors, levels } of sets) {
      const counts = [0, 0];
      items.forEach((t, i) => {
        const level = origin.set(t.x, t.y + 4, t.z).distanceTo(camera) < near ? 0 : 1,
          j = counts[level]++;
        for (const mesh of levels[level]) {
          mesh.setMatrixAt(j, matrices[i]);
          if (mesh.material !== m.bark) mesh.setColorAt(j, colors[i]);
        }
      });
      levels.forEach((meshes, level) =>
        meshes.forEach(mesh => {
          mesh.count = counts[level];
          mesh.visible = counts[level] > 0;
          mesh.instanceMatrix.needsUpdate = true;
          if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
          mesh.computeBoundingSphere();
        }),
      );
    }
    return true;
  };
  // Until the viewer reports a camera, every tree uses the near geometry (also for Node checks and GLB export).
  lod(new T.Vector3(0, 0, 0), true);
  return { lod, count: trees.length };
}
