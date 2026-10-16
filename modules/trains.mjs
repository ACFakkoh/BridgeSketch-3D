// BridgeSketch 3D · Procedural trains (0.6.2), replacing the Kenney toy trains (11.5 m cars, 3.8 m high).
// Full-size North American rolling stock, generic liveries (no operator branding):
//   diesel: freight, one or two 6-axle 22.3 m road locomotives with box cars, covered hoppers, tank cars and
//           container flats (4.6 m high at most);
//   bullet: intercity, a streamlined 21.5 m locomotive with 25.9 m stainless coaches;
//   city:   commuter electric multiple unit, 20 m cab cars at both ends, 19 m intermediate cars, lowered pantographs.
// Each car type is built once (one merged geometry per material) and shared by every train; batchMeshes then
// merges a whole train into a few meshes. Local frame: rails at y = 0, front (lead cab) towards +X.
import * as T from 'three';
import { mergeGeometries } from '../vendor/BufferGeometryUtils.js';

export const trainStyles = Object.freeze(['mixed', 'diesel', 'bullet', 'city']);

const std = (color, roughness = 0.45, metalness = 0.1) => new T.MeshStandardMaterial({ color, roughness, metalness });
const finishes = {
  dark: std('#24292d', 0.72, 0.25), // underframes, trucks, roof equipment
  steel: std('#4a4f53', 0.48, 0.65), // wheels, couplers
  rail: std('#c9ced0', 0.34, 0.75), // handrails, pantograph
  glass: std('#1e2a31', 0.06, 0.7),
  rubber: std('#16191b', 0.9),
  grille: std('#1a1e21', 0.6, 0.4),
  stainless: std('#c4cacd', 0.3, 0.78),
  head: std('#fff6dc', 0.2),
  marker: std('#c0281c', 0.3),
};
// North American trains run with their headlights on, day and night.
finishes.head.emissive.set('#fff1c9');
finishes.head.emissiveIntensity = 2.4;
finishes.marker.emissive.set('#d0281a');
finishes.marker.emissiveIntensity = 1.6;
const paints = new Map();
const shade = (hex, k) => '#' + new T.Color(hex).multiplyScalar(k).getHexString();
const paint = (hex, roughness = 0.4, metalness = 0.08) => {
  const key = `${hex}|${roughness}|${metalness}`;
  if (!paints.has(key)) paints.set(key, std(hex, roughness, metalness));
  return paints.get(key);
};
// Weathered freight colours, cleaner passenger liveries.
const LIVERY = {
  locomotive: [
    ['#2c3034', '#c9a227'],
    ['#7a1f1c', '#e8e4da'],
    ['#2b4a6b', '#d6d9d4'],
  ],
  boxcar: ['#6b3a2b', '#7b4a33', '#4d5a62', '#8a3324', '#5b4a3c'],
  hopper: ['#9da2a5', '#c3c1ba', '#6e7476', '#b5ab95'],
  tank: ['#222528', '#d3d5d1', '#2f4252', '#222528'],
  container: ['#2f5c8f', '#b8342c', '#2f7a4f', '#d6d3cb', '#d0782a', '#5d6b73', '#7d3b55', '#1f6f86'],
  intercity: ['#1f4e8c', '#e0b021'],
  commuter: ['#1f8f7a', '#2a2f33'],
};

// ---- geometry helpers ----------------------------------------------------------------------------------------
const flat = g => (g.index ? g.toNonIndexed() : g);
const box = (w, h, d, x, y, z = 0) => new T.BoxGeometry(w, h, d).translate(x, y, z);
const tilted = (w, h, d, x, y, z, angle) => new T.BoxGeometry(w, h, d).rotateZ(angle).translate(x, y, z);
const cylinderX = (r, length, x, y, z = 0, segments = 14) =>
  new T.CylinderGeometry(r, r, length, segments).rotateZ(Math.PI / 2).translate(x, y, z);
const cylinderZ = (r, length, x, y, z = 0, segments = 14) =>
  new T.CylinderGeometry(r, r, length, segments).rotateX(Math.PI / 2).translate(x, y, z);
// Body from its side profile (x along the car, y up), extruded across the width with rounded (bevelled) edges.
// The profile is the outline before rounding: it is inset by the bevel radius.
function sideBody(points, width, bevel = 0.12) {
  const cx = points.reduce((a, p) => a + p[0], 0) / points.length,
    cy = points.reduce((a, p) => a + p[1], 0) / points.length;
  const inset = points.map(([x, y]) => {
    const dx = x - cx,
      dy = y - cy;
    return new T.Vector2(x - Math.sign(dx) * bevel * (Math.abs(dx) > 1e-6), y - Math.sign(dy) * bevel * (Math.abs(dy) > 1e-6));
  });
  const depth = Math.max(0.01, width - 2 * bevel),
    g = new T.ExtrudeGeometry(new T.Shape(inset), {
      depth,
      bevelEnabled: true,
      bevelThickness: bevel,
      bevelSize: bevel,
      bevelSegments: 3,
      curveSegments: 4,
      steps: 1,
    });
  return g.translate(0, 0, -depth / 2);
}
// Two-axle (or three-axle) truck centred at x: side frames, axles and wheels on the 1435 mm gauge.
function truck(put, x, { axles = 2, base = 1.75, wheel = 0.42, frame = 2.6 } = {}) {
  const offsets = Array.from({ length: axles }, (_, i) => (i - (axles - 1) / 2) * base);
  for (const z of [-0.98, 0.98]) put(box(frame + (axles - 2) * base, 0.42, 0.22, x, wheel + 0.08, z), finishes.dark);
  put(box(0.5, 0.32, 2.2, x, wheel + 0.18), finishes.dark);
  for (const dx of offsets) {
    put(cylinderZ(0.07, 1.6, x + dx, wheel), finishes.steel);
    for (const z of [-0.72, 0.72]) put(cylinderZ(wheel, 0.13, x + dx, wheel, z, 18), finishes.steel);
  }
}
const coupler = (put, x, y = 0.95) => put(box(0.7, 0.22, 0.3, x, y), finishes.steel);

// ---- car templates -------------------------------------------------------------------------------------------
// Each builder returns { length, parts: [geometry, material][] }, centred on x = 0, front towards +X.
const builders = {
  locomotive([body, accent]) {
    const parts = [],
      put = (g, m) => parts.push([g, m]),
      main = paint(body, 0.5, 0.12),
      stripe = paint(accent, 0.45);
    put(box(21.4, 0.36, 3.1, 0, 1.33), main); // frame
    put(box(21.2, 0.04, 3.06, 0, 1.53), finishes.dark); // walkway deck
    put(box(21.5, 0.16, 3.14, 0, 1.2), stripe); // frame stripe
    // Long hood with a wider radiator section at the rear, then the cab and the short nose at the front.
    put(sideBody([[-10.1, 1.55], [4.2, 1.55], [4.2, 4.42], [-10.1, 4.42]], 2.5, 0.1), main);
    put(box(3.6, 1.15, 3.0, -8.2, 3.95), main);
    for (const z of [-1.51, 1.51]) put(box(3.2, 0.8, 0.03, -8.2, 3.95, z), finishes.grille);
    for (const z of [-1.26, 1.26]) for (const x of [-5.6, -3.2, -0.8, 1.6]) put(box(1.6, 1.9, 0.03, x, 2.75, z), paint(shade(body, 0.82), 0.55, 0.12)); // access doors
    put(box(1.1, 0.25, 0.6, -2.5, 4.55), finishes.dark); // exhaust stack
    put(box(2.4, 0.18, 1.6, -5.5, 4.5), finishes.dark); // dynamic brake hatch
    put(sideBody([[4.2, 1.55], [7.9, 1.55], [7.9, 3.35], [7.55, 4.55], [4.2, 4.6]], 3.05, 0.1), main); // cab
    put(sideBody([[7.9, 1.55], [10.3, 1.55], [10.3, 3.0], [7.9, 3.25]], 2.9, 0.1), main); // nose
    for (const z of [-0.62, 0.62]) put(tilted(0.04, 0.8, 1.05, 7.75, 3.96, z, 0.28), finishes.glass); // windscreens
    for (const z of [-1.535, 1.535]) put(box(1.6, 0.8, 0.03, 5.6, 3.75, z), finishes.glass); // side windows
    put(box(0.06, 0.55, 2.5, 10.36, 2.25), stripe); // nose band
    for (const x of [10.4, -10.75]) {
      put(box(0.05, 0.22, 0.5, x, 2.85), finishes.head);
      for (const z of [-1.15, 1.15]) put(box(0.05, 0.16, 0.16, x, 1.2, z), finishes.head); // ditch lights
    }
    for (const x of [10.75, -10.75]) put(box(0.35, 0.75, 3.0, x, 0.98), stripe); // pilots
    // Handrails along the walkways, with stanchions.
    for (const z of [-1.5, 1.5]) {
      put(box(14.2, 0.04, 0.04, -2.9, 2.5, z), finishes.rail);
      for (let x = -9.8; x <= 4.2; x += 2) put(box(0.04, 0.95, 0.04, x, 2.02, z), finishes.rail);
    }
    put(sideBody([[-4.3, 0.42], [4.3, 0.42], [4.3, 1.16], [-4.3, 1.16]], 2.6, 0.3), finishes.dark); // fuel tank
    for (const x of [-6.9, 6.9]) truck(put, x, { axles: 3, base: 1.7, wheel: 0.53, frame: 2.4 });
    for (const x of [-11.0, 11.0]) coupler(put, x);
    return { length: 22.3, parts };
  },
  boxcar(color) {
    const parts = [],
      put = (g, m) => parts.push([g, m]),
      body = paint(color, 0.62, 0.05);
    put(sideBody([[-8.3, 1.2], [8.3, 1.2], [8.3, 4.55], [-8.3, 4.55]], 3.2, 0.06), body);
    for (const z of [-1.615, 1.615]) {
      for (let x = -7.8; x <= 7.81; x += 0.95) if (Math.abs(x) > 1.8) put(box(0.08, 3.2, 0.05, x, 2.85, z), body);
      put(box(3.1, 3.3, 0.07, 0, 2.85, z * 1.006), paint(color, 0.7, 0.05)); // sliding door
      put(box(3.3, 0.06, 0.06, 0, 4.4, z * 1.01), finishes.dark); // door track
    }
    put(box(16.2, 0.45, 0.6, 0, 0.98), finishes.dark); // centre sill
    for (const x of [-6.1, 6.1]) truck(put, x);
    for (const x of [-8.6, 8.6]) coupler(put, x);
    return { length: 17.7, parts };
  },
  hopper(color) {
    const parts = [],
      put = (g, m) => parts.push([g, m]),
      body = paint(color, 0.66, 0.05);
    put(sideBody([[-8.4, 1.25], [8.4, 1.25], [8.4, 4.55], [-8.4, 4.55]], 3.2, 0.32), body);
    for (const z of [-1.615, 1.615]) for (let x = -7.5; x <= 7.51; x += 1.5) put(box(0.12, 3.0, 0.05, x, 2.85, z), body);
    for (const x of [-5.2, 0, 5.2]) put(sideBody([[x - 1.6, 0.55], [x + 1.6, 0.55], [x + 2.1, 1.3], [x - 2.1, 1.3]], 2.7, 0.05), body);
    put(box(15.8, 0.1, 0.7, 0, 4.58), finishes.dark); // roof trough hatch
    for (const x of [-6.6, 6.6]) truck(put, x);
    for (const x of [-8.9, 8.9]) coupler(put, x);
    return { length: 18, parts };
  },
  tank(color) {
    const parts = [],
      put = (g, m) => parts.push([g, m]),
      body = paint(color, color === '#d3d5d1' ? 0.42 : 0.5, 0.15);
    put(cylinderX(1.48, 15.2, 0, 2.6, 0, 24), body);
    for (const x of [-7.6, 7.6])
      put(new T.SphereGeometry(1.48, 24, 10, 0, Math.PI * 2, 0, Math.PI).scale(0.42, 1, 1).rotateZ(x > 0 ? -Math.PI / 2 : Math.PI / 2).translate(x, 2.6, 0), body);
    for (const x of [-4.5, 4.5]) put(cylinderX(1.5, 0.12, x, 2.6, 0, 24), finishes.dark); // tank bands
    put(new T.CylinderGeometry(0.4, 0.4, 0.5, 14).translate(0, 4.15, 0), finishes.dark); // dome
    put(box(2.4, 0.06, 1.6, 0, 4.12), finishes.rail); // platform
    for (const x of [-7.6, 7.6]) put(box(1.8, 0.5, 0.6, x, 1.0), finishes.dark); // stub sills
    for (const x of [-6.4, 6.4]) truck(put, x);
    for (const x of [-9.0, 9.0]) coupler(put, x);
    return { length: 18.3, parts };
  },
  container(color) {
    const parts = [],
      put = (g, m) => parts.push([g, m]),
      body = paint(color, 0.58, 0.12);
    put(box(18.0, 0.32, 2.8, 0, 1.12), finishes.dark); // flat deck
    put(box(12.19, 2.59, 2.44, 0, 2.6), body); // 40 ft container
    for (const z of [-1.235, 1.235]) for (let x = -5.8; x <= 5.81; x += 0.6) put(box(0.12, 2.4, 0.03, x, 2.6, z), body);
    for (const x of [-6.12, 6.12]) put(box(0.06, 2.59, 2.44, x, 2.6), paint(color, 0.7, 0.12)); // end doors / frame
    for (const x of [-6.6, 6.6]) truck(put, x);
    for (const x of [-9.2, 9.2]) coupler(put, x);
    return { length: 18.6, parts };
  },
  intercityLoco([band, nose]) {
    const parts = [],
      put = (g, m) => parts.push([g, m]),
      body = paint('#d4d8db', 0.32, 0.25);
    put(sideBody([[-10.6, 1.15], [9.8, 1.15], [10.75, 1.45], [10.75, 2.1], [9.3, 3.55], [8.0, 4.15], [-10.6, 4.15]], 3.05, 0.3), body);
    put(box(20.8, 0.3, 3.08, -0.3, 1.65), paint(band, 0.36, 0.2)); // livery band
    put(tilted(0.36, 1.45, 2.3, 9.92, 2.78, 0, 0.785), finishes.glass); // windscreen (thick: proud of the rounded nose)
    put(box(0.05, 0.9, 2.6, 10.78, 1.75), paint(nose, 0.38, 0.1)); // nose panel
    for (const z of [-1.55, 1.55]) {
      put(box(1.2, 0.7, 0.03, 7.6, 3.15, z), finishes.glass);
      for (const x of [-7.5, -4.5, -1.5, 1.5]) put(box(2.2, 0.85, 0.03, x, 3.3, z), finishes.grille); // intake grilles
    }
    for (const z of [-0.9, 0.9]) put(box(0.05, 0.16, 0.36, 10.8, 2.0, z), finishes.head);
    for (const z of [-0.9, 0.9]) put(box(0.05, 0.14, 0.2, -10.62, 2.0, z), finishes.marker);
    put(box(13, 0.55, 2.7, 0, 0.92), finishes.dark); // skirt
    for (const x of [-6.8, 6.8]) truck(put, x, { wheel: 0.5, base: 2.6, frame: 3.3 });
    for (const x of [-10.95, 10.95]) coupler(put, x, 1.0);
    return { length: 21.5, parts };
  },
  coach([band]) {
    const parts = [],
      put = (g, m) => parts.push([g, m]);
    put(sideBody([[-12.6, 1.1], [12.6, 1.1], [12.6, 4.12], [-12.6, 4.12]], 3.05, 0.32), finishes.stainless);
    for (const z of [-1.53, 1.53]) {
      for (let x = -9.0; x <= 9.01; x += 2.0) put(box(1.55, 0.85, 0.03, x, 2.95, z), finishes.glass);
      for (const x of [-11.3, 11.3]) put(box(0.95, 2.05, 0.03, x, 2.2, z), paint('#8f969a', 0.35, 0.6)); // doors
      for (const x of [-11.3, 11.3]) put(box(0.55, 0.6, 0.035, x, 2.85, z), finishes.glass);
      put(box(24.4, 0.14, 0.03, 0, 2.38, z), paint(band, 0.35, 0.2)); // livery band
    }
    put(box(18, 0.62, 2.6, 0, 0.92), finishes.dark); // equipment skirt
    for (const x of [-12.85, 12.85]) put(box(0.3, 2.5, 1.3, x, 2.5), finishes.rubber); // gangway
    for (const x of [-9.2, 9.2]) truck(put, x, { wheel: 0.46, base: 2.6, frame: 3.2 });
    return { length: 25.9, parts };
  },
  emuCab([accent, roofColor]) {
    return emu(true, accent, roofColor);
  },
  emuCar([accent, roofColor]) {
    return emu(false, accent, roofColor);
  },
};
// Commuter EMU car: ribbon windows, two double doors per side, roof equipment; the cab car has a rounded front.
function emu(cab, accent, roofColor) {
  const parts = [],
    put = (g, m) => parts.push([g, m]),
    body = paint('#e6e9e8', 0.34, 0.1),
    stripe = paint(accent, 0.36, 0.1),
    half = cab ? 9.6 : 9.5;
  put(
    sideBody(
      cab
        ? [[-half, 1.05], [8.9, 1.05], [9.95, 1.35], [10.0, 2.25], [9.45, 3.45], [8.6, 3.9], [-half, 3.9]]
        : [[-half, 1.05], [half, 1.05], [half, 3.9], [-half, 3.9]],
      2.95,
      0.28,
    ),
    body,
  );
  const ribbon = cab ? [-8.6, 7.6] : [-8.6, 8.6];
  for (const z of [-1.48, 1.48]) {
    put(box(ribbon[1] - ribbon[0], 0.95, 0.03, (ribbon[0] + ribbon[1]) / 2, 2.65, z), finishes.glass);
    for (let x = ribbon[0] + 1.5; x < ribbon[1] - 0.5; x += 2.4) put(box(0.12, 0.95, 0.04, x, 2.65, z), body); // pillars
    for (const x of [-4.6, 4.6]) put(box(1.35, 2.05, 0.04, x - (cab ? 0.5 : 0), 2.1, z), paint('#5d666b', 0.3, 0.55)); // doors
    put(box(2 * half - 0.4, 0.32, 0.03, -0.2, 1.38, z), stripe);
    put(box(2 * half - 0.6, 0.07, 0.03, -0.3, 3.25, z), stripe);
  }
  if (cab) {
    put(tilted(0.05, 1.15, 2.3, 9.75, 2.86, 0, 0.43), finishes.glass);
    put(box(0.05, 0.3, 2.4, 9.98, 1.6), stripe);
    for (const z of [-0.85, 0.85]) put(box(0.05, 0.14, 0.32, 10.0, 1.95, z), finishes.head);
  }
  for (const x of cab ? [-6, 3.2] : [-5.5, 5.5]) put(box(2.6, 0.34, 1.9, x, 4.05), paint(roofColor, 0.6, 0.3)); // AC units
  put(box(14, 0.5, 2.5, -0.3, 0.92), finishes.dark);
  if (!cab) {
    // Pantograph, lowered (no catenary is modelled; it clears a 5 m bridge soffit): base frame, folded lower and
    // upper arms, collector head.
    put(box(1.6, 0.12, 1.2, 2, 4.0), finishes.dark);
    for (const z of [-0.35, 0.35]) {
      put(tilted(0.05, 1.5, 0.05, 2.0, 4.3, z, 1.25), finishes.rail);
      put(tilted(0.05, 1.5, 0.05, 2.0, 4.5, z, -1.35), finishes.rail);
    }
    put(box(0.12, 0.06, 1.9, 1.35, 4.7), finishes.rail);
  }
  put(box(0.25, 2.3, 1.3, -half - 0.2, 2.35), finishes.rubber);
  if (!cab) put(box(0.25, 2.3, 1.3, half + 0.2, 2.35), finishes.rubber);
  for (const x of [-6.9, 6.6]) truck(put, x, { wheel: 0.43, base: 2.3, frame: 3.0 });
  return { length: cab ? 20 : 19, parts };
}

const templates = new Map();
function template(kind, variant) {
  const key = `${kind}|${JSON.stringify(variant)}`;
  if (templates.has(key)) return templates.get(key);
  const built = builders[kind](variant),
    byMaterial = new Map();
  for (const [g, m] of built.parts) {
    if (!byMaterial.has(m)) byMaterial.set(m, []);
    byMaterial.get(m).push(flat(g));
  }
  const parts = [...byMaterial].map(([m, geos]) => {
    const g = mergeGeometries(geos, false);
    geos.forEach(x => x.dispose());
    g.computeBoundingSphere();
    return [g, m];
  });
  const t = { length: built.length, parts };
  templates.set(key, t);
  return t;
}

const random = seed => () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
const pick = (list, r) => list[Math.floor(r() * list.length) % list.length];

// Consist for a style and car count (4–12): [kind, variant, reversed][] from the rear to the front.
export function consist(style, count, seed = 1) {
  if (!['diesel', 'bullet', 'city'].includes(style)) throw Error('Select a train style.');
  if (!Number.isInteger(count) || count < 4 || count > 12) throw Error('Train length must be 4 to 12 cars.');
  const r = random(seed * 7919 + count * 31 + 3);
  if (style === 'diesel') {
    const livery = pick(LIVERY.locomotive, r),
      locos = count >= 8 ? 2 : 1,
      block = pick(['boxcar', 'hopper', 'tank', 'container'], r),
      cars = Array.from({ length: count - locos }, () => {
        // Freight runs in blocks: about half the cars share the block type.
        const kind = r() < 0.5 ? block : pick(['boxcar', 'hopper', 'tank', 'container'], r);
        return [kind, pick(LIVERY[kind], r), r() < 0.5];
      });
    return [...cars, ...Array.from({ length: locos }, () => ['locomotive', livery, false])];
  }
  if (style === 'bullet')
    return [...Array.from({ length: count - 1 }, () => ['coach', LIVERY.intercity, false]), ['intercityLoco', LIVERY.intercity, false]];
  return [
    ['emuCab', LIVERY.commuter, true],
    ...Array.from({ length: count - 2 }, () => ['emuCar', LIVERY.commuter, false]),
    ['emuCab', LIVERY.commuter, false],
  ];
}

export function makeTrain(style, count = 6, seed = 1) {
  const cars = consist(style, count, seed),
    gap = style === 'diesel' ? 0.12 : 0.5,
    lengths = cars.map(([kind, variant]) => template(kind, variant).length),
    total = lengths.reduce((a, b) => a + b, 0) + gap * (cars.length - 1),
    group = new T.Group();
  let x = -total / 2;
  cars.forEach(([kind, variant, reversed], i) => {
    const t = template(kind, variant);
    for (const [geometry, material] of t.parts) {
      const mesh = new T.Mesh(geometry, material);
      mesh.position.x = x + t.length / 2;
      if (reversed) mesh.rotation.y = Math.PI;
      mesh.castShadow = mesh.receiveShadow = true;
      mesh.userData.sharedGeometry = true;
      mesh.name = `${kind} ${i + 1}`;
      group.add(mesh);
    }
    x += lengths[i] + gap;
  });
  group.name = `${style} train`;
  group.userData = {
    source: 'BridgeSketch procedural train',
    length: total,
    cars: cars.length,
    lead: cars.at(-1)[0],
    width: style === 'city' ? 2.95 : 3.2,
    height: new T.Box3().setFromObject(group).max.y,
    frontAxis: '+X',
  };
  return group;
}
