// BridgeSketch 3D · Night lighting: LED street lights on the bridge and approaches, or LED strips in the
// handrail of 20C pedestrian railings. Lights switch on automatically from 20:00 to 06:30.
// Cost control: light pools and glows are additive decals (visible in the water reflection); only a
// handful of real point lights are added, so the shader cost stays bounded whatever the lamp count.
import * as T from 'three';
import { frame, profile, supportStation, totalLength } from './geometry.mjs';
import { box } from './sections.mjs';

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
    return { x: f.x, y: profile(c, q) + y, z: f.z, yaw: -Math.atan2(f.tz, f.tx) };
  };
  if (!handrail) {
    // Street lights: 10 m galvanised poles on the barriers, 2 m outreach arm, LED head facing the road.
    const poleHeight = 10;
    for (const side of [-1, 1].filter(side => c.lightSides === 'both' || (side < 0) === (c.lightSides === 'left')))
      for (let s = start + (side > 0 && c.lightSides === 'both' ? spacing / 2 : 0) + 4; s < end - 4; s += spacing) {
        const base = onDeck(s, side * (half - 0.2), 0.75),
          head = onDeck(s, side * (half - 2.2), 0.75 + poleHeight);
        const pole = new T.Mesh(new T.CylinderGeometry(0.07, 0.11, poleHeight, 8), m.railing);
        pole.position.set(base.x, base.y + poleHeight / 2, base.z);
        pole.castShadow = true;
        pole.name = 'Street light pole';
        group.add(pole);
        const arm = new T.Mesh(new T.CylinderGeometry(0.045, 0.045, 2.1, 6), m.railing);
        arm.position.set((base.x + head.x) / 2, head.y + 0.08, (base.z + head.z) / 2);
        arm.quaternion.setFromUnitVectors(
          new T.Vector3(0, 1, 0),
          new T.Vector3(head.x - base.x, 0, head.z - base.z).normalize(),
        );
        arm.name = 'Street light arm';
        group.add(arm);
        const luminaire = box(group, m.dark, head.x, head.y, head.z, 0.75, 0.1, 0.32, head.yaw);
        luminaire.name = 'LED luminaire';
        const glass = box(group, lens, head.x, head.y - 0.055, head.z, 0.62, 0.02, 0.24, head.yaw);
        glass.name = 'LED lens';
        heads.push(head);
        pools.push({ ...onDeck(s, side * (half - 3.4), 0.03), r: 11 });
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
    sprite.scale.setScalar(handrail ? 0.6 : 1.7);
    sprite.name = 'Lamp glow';
    group.add(sprite);
    return sprite;
  });
  // A few real point lights near mid-bridge light the girders and give specular glints on the water.
  const real = [];
  const middle = [...heads].sort((a, b) => Math.hypot(a.x, a.z) - Math.hypot(b.x, b.z)).slice(0, handrail ? 2 : 4);
  for (const h of middle) {
    const light = new T.PointLight(color, 0, handrail ? 9 : 34, 2);
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
      for (const light of real) light.intensity = on ? (handrail ? 3 : 260) : 0;
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
