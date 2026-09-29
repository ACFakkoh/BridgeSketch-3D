// BridgeSketch 3D · Night lighting: 12 m LED street lights on the bridge and approaches, or LED strips in the
// handrail of 20C pedestrian railings. Lights switch on automatically from 20:00 to 06:30.
// Cost control: light pools and glows are additive decals (visible in the water reflection); only a
// handful of real point lights are added, so the shader cost stays bounded whatever the lamp count.
import * as T from 'three';
import { crossAt, frame, profile, supportStation, totalLength } from './geometry.mjs';
import { box } from './sections.mjs';
import { mergeGeometries } from './vendor/BufferGeometryUtils.js';
import { barrierHeight, isConcrete, CURB_HEIGHT } from './deck-profiles.mjs';

// 12 m street light, after the supplied standard drawing: tapered galvanised pole with a transformer base and
// handhole, one upswept davit arm reaching 3.0 m (horizontal projection) towards the road, a curved lower brace
// tied to it by two struts, and a flat LED head at the tip. Local frame: pole at the origin, arm along +x.
export const POLE_HEIGHT = 12;
export const ARM_REACH = 3;
let streetLightKit = null;
export function streetLightGeometry() {
  if (streetLightKit) return streetLightKit;
  const H = POLE_HEIGHT,
    tube = (points, radius, radial = 6) =>
      new T.TubeGeometry(new T.CatmullRomCurve3(points.map(p => new T.Vector3(...p))), 18, radius, radial, false),
    at = (g, x, y, z = 0) => g.translate(x, y, z);
  const pole = at(new T.CylinderGeometry(0.075, 0.13, H - 0.6, 12, 1, true), 0, 0.6 + (H - 0.6) / 2),
    base = at(new T.CylinderGeometry(0.2, 0.22, 0.6, 16), 0, 0.3),
    collar = at(new T.CylinderGeometry(0.16, 0.2, 0.08, 16), 0, 0.64),
    plate = at(new T.BoxGeometry(0.46, 0.04, 0.46), 0, 0.02),
    handhole = at(new T.BoxGeometry(0.02, 0.22, 0.1), 0.12, 1.1),
    finial = at(new T.ConeGeometry(0.06, 0.28, 10), 0, H + 0.12),
    // Upswept davit: leaves the pole 1.1 m below the top, rises and flattens out 3.0 m away (tip at 12.0 m).
    arm = tube(
      [
        [0, H - 1.5, 0],
        [0.35, H - 0.75, 0],
        [1.2, H - 0.2, 0],
        [2.2, H - 0.02, 0],
        [ARM_REACH, H, 0],
      ],
      0.05,
    ),
    brace = tube(
      [
        [0, H - 2.6, 0],
        [0.3, H - 1.95, 0],
        [0.95, H - 1.05, 0],
        [1.8, H - 0.45, 0],
      ],
      0.032,
    ),
    struts = [
      [0.55, H - 1.55, H - 0.55],
      [1.2, H - 0.85, H - 0.2],
    ].map(([x, y0, y1]) => at(new T.CylinderGeometry(0.018, 0.018, y1 - y0, 6), x, (y0 + y1) / 2));
  const metal = mergeGeometries(
    [pole, base, collar, plate, handhole, finial, arm, brace, ...struts].map(g => (g.index ? g.toNonIndexed() : g)),
  );
  // Flat LED head, slightly tilted up at the tip, and its lens underneath.
  const head = new T.BoxGeometry(0.78, 0.11, 0.32).rotateZ(0.06).translate(ARM_REACH + 0.25, H - 0.02, 0),
    lens = new T.BoxGeometry(0.6, 0.02, 0.24).rotateZ(0.06).translate(ARM_REACH + 0.27, H - 0.085, 0);
  streetLightKit = { metal, head, lens, tip: [ARM_REACH + 0.27, H - 0.1] };
  return streetLightKit;
}

export const lightsOn = hour => hour >= 20 || hour < 6.5;
export const lampColors = { white: '#eef3ff', warm: '#ffc46b' };

let radial = null;
// Radial falloff texture shared by pools and glows (DataTexture, so it also builds in Node checks).
function radialTexture() {
  if (radial) return radial;
  const n = 64,
    data = new Uint8Array(n * n * 4);
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) {
      const r = Math.hypot(x - n / 2 + 0.5, y - n / 2 + 0.5) / (n / 2),
        v = Math.max(0, 1 - r) ** 2.2;
      data.set([255, 255, 255, Math.round(v * 255)], (y * n + x) * 4);
    }
  radial = new T.DataTexture(data, n, n);
  radial.needsUpdate = true;
  return radial;
}

export function buildLighting(c, m, ranges) {
  const group = new T.Group();
  group.name = 'Bridge lighting';
  const handrail = c.lighting === 'handrail',
    color = new T.Color(handrail ? lampColors[c.lightColor] : lampColors[c.lightColor === 'warm' ? 'warm' : 'white']),
    spacing = c.lightSpacing,
    half = c.width / 2,
    L = totalLength(c),
    start = Math.min(0, ...ranges.map(r => r[0])),
    end = Math.max(L, ...ranges.map(r => r[1]));
  const pool = new T.MeshBasicMaterial({
      map: radialTexture(),
      color,
      transparent: true,
      opacity: 0,
      blending: T.AdditiveBlending,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -4,
    }),
    glow = new T.SpriteMaterial({
      map: radialTexture(),
      color,
      transparent: true,
      opacity: 0,
      blending: T.AdditiveBlending,
      depthWrite: false,
      fog: false,
    }),
    lens = new T.MeshStandardMaterial({ color: '#2a2e33', emissive: color, emissiveIntensity: 0, roughness: 0.4 });
  pool.userData.noBatch = glow.userData.noBatch = lens.userData.noBatch = true;
  const pools = [],
    heads = [];
  const onDeck = (s, u, y) => {
    const q = supportStation(c, s, u),
      f = frame(c, q, u);
    return { x: f.x, y: profile(c, q) + crossAt(c, u) + y, z: f.z, yaw: -Math.atan2(f.tz, f.tx) };
  };
  const poles = [];
  if (!handrail) {
    // Street lights: 12 m poles at the deck edge (on the barrier, curb or sidewalk), one davit arm over the road.
    const kit = streetLightGeometry();
    for (const side of [-1, 1].filter(side => c.lightSides === 'both' || (side < 0) === (c.lightSides === 'left')))
      for (let s = start + (side > 0 && c.lightSides === 'both' ? spacing / 2 : 0) + 4; s < end - 4; s += spacing) {
        const type = side < 0 ? c.leftRailing : c.rightRailing,
          walk = c.sidewalkSide === 'both' || c.sidewalkSide === (side < 0 ? 'left' : 'right'),
          mount = isConcrete(type) ? barrierHeight(type) - c.asphalt : CURB_HEIGHT - c.asphalt + (walk ? 0.03 : 0),
          base = onDeck(s, side * (half - 0.2), mount),
          head = onDeck(s, side * (half - 0.2 - kit.tip[0]), mount + kit.tip[1]);
        // Arm towards the road: local +x points across the deck, away from this edge.
        const f = frame(c, supportStation(c, s, side * (half - 0.2)));
        poles.push({ x: base.x, y: base.y, z: base.z, yaw: -Math.atan2(-side * f.nz, -side * f.nx) });
        heads.push(head);
        pools.push({ ...onDeck(s, side * (half - 3.6), 0.03), r: 13 });
      }
    const dummy = new T.Object3D();
    for (const [geometry, material, name] of [
      [kit.metal, m.railing, 'Street light poles'],
      [kit.head, m.dark, 'LED luminaires'],
      [kit.lens, lens, 'LED lenses'],
    ]) {
      if (!poles.length) break;
      const mesh = new T.InstancedMesh(geometry, material, poles.length);
      poles.forEach((p, i) => {
        dummy.position.set(p.x, p.y, p.z);
        dummy.rotation.set(0, p.yaw, 0);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
      });
      mesh.castShadow = material !== lens;
      mesh.receiveShadow = true;
      mesh.userData.sharedGeometry = true;
      mesh.name = name;
      group.add(mesh);
    }
  } else {
    // Handrail LEDs: one diode every lightSpacing under the top rail of each 20C railing, lighting the deck edge.
    // On the approaches only where the railings continue there.
    const [from, to] = c.approachBarrier === 'extend' ? [start, end] : [0, L];
    for (const side of [-1, 1].filter(
      side =>
        (side < 0 ? c.leftRailing : c.rightRailing) === '20C' &&
        (c.lightSides === 'both' || (side < 0) === (c.lightSides === 'left')),
    ))
      for (let s = from + spacing / 2; s < to; s += spacing) {
        const head = onDeck(s, side * (half - 0.18), 0.215 + 1.33);
        // A short LED bar under the top rail at each spacing; bars merge into a line at close spacing.
        const led = box(group, lens, head.x, head.y, head.z, Math.min(spacing * 0.9, 1.5), 0.02, 0.05, head.yaw);
        led.name = 'Handrail LED';
        heads.push(head);
        pools.push({ ...onDeck(s, side * (half - 0.9), 0.24), r: 1.8 });
      }
  }
  const disc = new T.PlaneGeometry(2, 2).rotateX(-Math.PI / 2),
    pooled = new T.InstancedMesh(disc, pool, pools.length),
    dummy = new T.Object3D();
  pools.forEach((p, i) => {
    dummy.position.set(p.x, p.y, p.z);
    dummy.rotation.set(0, p.yaw, 0);
    dummy.scale.set(p.r, 1, p.r);
    dummy.updateMatrix();
    pooled.setMatrixAt(i, dummy.matrix);
  });
  pooled.name = 'Light pools';
  pooled.renderOrder = 2;
  pooled.frustumCulled = false;
  group.add(pooled);
  const sprites = heads.map(h => {
    const sprite = new T.Sprite(glow);
    sprite.position.set(h.x, h.y - 0.08, h.z);
    sprite.scale.setScalar(handrail ? 0.6 : 1.9);
    sprite.name = 'Lamp glow';
    group.add(sprite);
    return sprite;
  });
  // A few real point lights near mid-bridge light the girders and give specular glints on the water.
  const real = [];
  const middle = [...heads].sort((a, b) => Math.hypot(a.x, a.z) - Math.hypot(b.x, b.z)).slice(0, handrail ? 2 : 4);
  for (const h of middle) {
    const light = new T.PointLight(color, 0, handrail ? 9 : 38, 2);
    light.position.set(h.x, h.y - 0.3, h.z);
    light.name = 'Lamp light';
    group.add(light);
    real.push(light);
  }
  return {
    group,
    count: heads.length,
    setOn(on) {
      pool.opacity = on ? (handrail ? 0.55 : 0.42) : 0;
      glow.opacity = on ? 0.9 : 0;
      lens.emissiveIntensity = on ? (handrail ? 6 : 9) : 0;
      for (const light of real) light.intensity = on ? (handrail ? 3 : 320) : 0;
      pooled.visible = on;
      sprites.forEach(sprite => (sprite.visible = on));
    },
    dispose() {
      disc.dispose();
      pool.dispose();
      glow.dispose();
      lens.dispose();
    },
  };
}
