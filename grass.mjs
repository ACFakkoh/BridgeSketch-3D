import * as T from 'three';

// Meadow, 0.6.0. Shading ideas adapted from Steve245270533/three-stylized (MIT):
// world-coherent wind, root-to-tip gradient, up-facing blade normals (no ribbon shimmer)
// and sun back-lighting through thin tips. The density is budgeted instead of per square metre:
// tufts concentrate around the bridge and in noise clumps, and the terrain shader carries the same palette.

// Tufts per scene (14 triangles each). Balanced now uses the former High density; High doubles it near the bridge.
export const grassBudget = { performance: 15000, balanced: 45000, high: 85000 };
export const grassUniforms = {
  grassTime: { value: 0 },
  windDirection: { value: new T.Vector2(0.82, 0.57) },
  windStrength: { value: 1 },
  sunDirection: { value: new T.Vector3(0, 1, 0) },
  sunColor: { value: new T.Color('#fff') },
  backlight: { value: 1 },
  // Distance thinning (level of detail): full density up to grassNear, 18 % beyond grassFar.
  grassNear: { value: 26 },
  grassFar: { value: 90 },
};

export function prepareGrassMaterial(material) {
  material.side = T.DoubleSide;
  material.vertexColors = true;
  material.color.set('#ffffff');
  material.roughness = 0.78;
  material.customProgramCacheKey = () => 'bridgesketch-meadow-055-lod';
  material.onBeforeCompile = shader => {
    Object.assign(shader.uniforms, grassUniforms);
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
uniform float grassTime,windStrength,grassNear,grassFar;uniform vec2 windDirection;varying float vGrassHeight;varying vec3 vGrassWorld;`,
      )
      .replace(
        '#include <beginnormal_vertex>',
        'vec3 objectNormal=normalize(mix(normal,vec3(0.,1.,0.),.78));\n#ifdef USE_TANGENT\nvec3 objectTangent=vec3(tangent.xyz);\n#endif',
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
vGrassHeight=uv.y;
#ifdef USE_INSTANCING
{
  mat4 grassMatrix=modelMatrix*instanceMatrix;vec3 root=grassMatrix[3].xyz;
  // Level of detail: each tuft has a random rank; far tufts shrink to nothing once the density drops below it.
  float rank=fract(sin(dot(root.xz,vec2(12.9898,78.233)))*43758.5453);
  float density=1.-.82*smoothstep(grassNear,grassFar,distance(root.xz,cameraPosition.xz));
  transformed*=smoothstep(rank-.06,rank,density);
  vec2 across=vec2(-windDirection.y,windDirection.x);
  float gust=smoothstep(.25,1.,.5+.5*sin(dot(root.xz,windDirection)*.045-grassTime*.55));
  float wave=sin(dot(root.xz,windDirection)*.42+grassTime*1.7)+.35*sin(dot(root.xz,across)*.77+grassTime*1.13);
  vec3 wind=vec3(windDirection.x,0.,windDirection.y)*(wave*(.05+.13*gust)+.05)*windStrength*uv.y*uv.y;
  mat3 m=mat3(instanceMatrix);transformed+=transpose(m)*wind/max(dot(m[0],m[0]),1e-4);
  transformed.y-=.12*length(wind)*uv.y;
  vGrassWorld=(grassMatrix*vec4(transformed,1.)).xyz;
}
#else
vGrassWorld=(modelMatrix*vec4(transformed,1.)).xyz;
#endif`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
uniform vec3 sunDirection,sunColor;uniform float backlight;varying float vGrassHeight;varying vec3 vGrassWorld;`,
      )
      .replace(
        '#include <color_fragment>',
        '#include <color_fragment>\ndiffuseColor.rgb*=mix(.62,1.,smoothstep(0.,.55,vGrassHeight));',
      )
      .replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
{
  vec3 V=normalize(cameraPosition-vGrassWorld),L=normalize(sunDirection);
  float through=pow(max(dot(-V,L),0.),3.)*vGrassHeight*vGrassHeight;
  totalEmissiveRadiance+=sunColor*diffuseColor.rgb*(through*1.6*backlight+.04);
}`,
      );
  };
  return material;
}

// Seven curved, leaning blades of two triangles each; uv.y is the normalised height used by wind and shading.
export function tuftGeometry() {
  const position = [],
    color = [],
    uv = [],
    root = new T.Color('#46652a'),
    mid = new T.Color('#7a9a3e'),
    tip = new T.Color('#c9cf7c');
  for (let i = 0; i < 7; i++) {
    const a = i * 2.39996 + 0.3,
      offset = 0.02 + (0.09 * ((i * 37) % 7)) / 7,
      height = 0.62 + (0.38 * ((i * 53) % 7)) / 6,
      dx = Math.cos(a),
      dz = Math.sin(a);
    const h = 0.4 * height,
      w = 0.018 * (0.8 + (0.4 * ((i * 19) % 5)) / 4),
      bend = (0.12 + (0.18 * ((i * 29) % 4)) / 3) * height,
      rootX = dx * offset,
      rootZ = dz * offset,
      twist = (((i * 13) % 5) - 2) * 0.25;
    const points = [
      [-w, 0, 0],
      [w, 0, 0],
      [-w * 0.35 + twist * w, 0.62, 0.55],
      [twist * w, 1, 1],
    ];
    const vertex = ([side, t, curve]) => [
      rootX + dx * bend * curve * curve - dz * side,
      h * t * (1 - 0.18 * curve * curve),
      rootZ + dz * bend * curve * curve + dx * side,
    ];
    for (const k of [0, 1, 2, 1, 3, 2]) {
      const q = points[k],
        t = q[1];
      position.push(...vertex(q));
      uv.push(q[0] > 0 ? 1 : 0, t);
      // Per-blade tone: alternate lush and pale blades, a few straw-tipped ones.
      const tone = [1, 0.86, 1.08, 0.94, 1.12, 0.9, 1][i],
        straw = i === 2 || i === 5 ? 0.45 : 0,
        c = t < 0.55 ? root.clone().lerp(mid, t / 0.55) : mid.clone().lerp(tip, (t - 0.55) / 0.45);
      c.lerp(new T.Color('#d8c27a'), straw * Math.max(0, t - 0.5) * 2).multiplyScalar(tone);
      color.push(c.r, c.g, c.b);
    }
  }
  const g = new T.BufferGeometry();
  g.setAttribute('position', new T.Float32BufferAttribute(position, 3));
  g.setAttribute('color', new T.Float32BufferAttribute(color, 3));
  g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
  g.computeVertexNormals();
  return g;
}

// Small upward-facing blossoms add the meadow colour variation seen in architectural renders.
export function flowerGeometry() {
  const position = [],
    uv = [],
    r = 0.07;
  for (const a of [0, Math.PI / 2]) {
    const c = Math.cos(a) * r,
      s = Math.sin(a) * r;
    position.push(-c, 0.32, -s, c, 0.32, s, 0, 0.36, 0, -c, 0.32, -s, 0, 0.28, 0, c, 0.32, s);
    uv.push(0, 1, 1, 1, 0.5, 1, 0, 1, 0.5, 1, 1, 1);
  }
  position.push(-0.008, 0, 0, 0.008, 0, 0, 0, 0.32, 0);
  uv.push(0, 0, 1, 0, 0.5, 0.8);
  const g = new T.BufferGeometry();
  g.setAttribute('position', new T.Float32BufferAttribute(position, 3));
  g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
  g.setAttribute(
    'color',
    new T.Float32BufferAttribute(
      position.map((_, i) => 1),
      3,
    ),
  );
  g.computeVertexNormals();
  return g;
}

function valueNoise(seed) {
  const h = (x, z) => {
    const s = Math.sin(x * 127.1 + z * 311.7 + seed * 74.7) * 43758.5453;
    return s - Math.floor(s);
  };
  return (x, z) => {
    const ix = Math.floor(x),
      iz = Math.floor(z),
      fx = x - ix,
      fz = z - iz,
      u = fx * fx * (3 - 2 * fx),
      v = fz * fz * (3 - 2 * fz);
    return (h(ix, iz) * (1 - u) + h(ix + 1, iz) * u) * (1 - v) + (h(ix, iz + 1) * (1 - u) + h(ix + 1, iz + 1) * u) * v;
  };
}

// Budgeted placement: dense near the bridge and in clumps, thinner towards the diorama edge.
export function scatterMeadow({ extent, halfZ, rng, occupied, height, budget, seed = 1 }) {
  const noise = valueNoise(seed),
    items = [],
    flowers = [],
    attempts = budget * 6;
  for (let i = 0; i < attempts && items.length < budget; i++) {
    const x = (rng() - 0.5) * (extent - 3),
      z = (rng() - 0.5) * (2 * halfZ - 3);
    const r = Math.hypot(x / (extent / 2), z / halfZ),
      focus = 1 - 0.62 * Math.min(1, Math.max(0, (r - 0.35) / 0.65));
    const clump =
      0.35 +
      0.65 * Math.min(1, Math.max(0, noise(x * 0.09, z * 0.09) * 1.25 + noise(x * 0.31, z * 0.31) * 0.35 - 0.25));
    if (rng() > focus * clump || occupied(x, z, 0.4)) continue;
    const s = 0.75 + rng() * 0.5 + clump * 0.3,
      dry = noise(x * 0.03 + 40, z * 0.03);
    items.push({ x, z, y: height(x, z) - 0.02, s, r: rng() * Math.PI * 2, dry });
    if (rng() < 0.035)
      flowers.push({
        x: x + (rng() - 0.5) * 0.4,
        z: z + (rng() - 0.5) * 0.4,
        y: height(x, z) - 0.02,
        s: 0.8 + rng() * 0.6,
        r: rng() * 6.28,
        kind: Math.floor(rng() * 4),
      });
  }
  return { items, flowers };
}
