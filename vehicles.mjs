import * as T from 'three';
import { mergeGeometries } from './vendor/BufferGeometryUtils.js';
import data from './models/vehicles-data.mjs';

// Kenney Car Kit 3.1, CC0; offline meshes with dedicated automotive materials.
export const vehicleKinds = Object.freeze(['sedan', 'suv', 'hatchback', 'pickup', 'van', 'truck', 'semi', 'double']);
const surface = (color, roughness = 0.5, metalness = 0) => new T.MeshStandardMaterial({ color, roughness, metalness });
const finishes = {
  paint: surface('#2e6484', 0.28, 0.32),
  rubber: surface('#171c20', 0.92),
  trim: surface('#414a50', 0.48, 0.28),
  metal: surface('#b5bdc0', 0.3, 0.7),
  glass: surface('#294959', 0.14, 0.3),
  cargo: surface('#d8e0e1', 0.42, 0.2),
  headlamp: surface('#f0efdf', 0.2, 0.05),
  taillamp: surface('#9f1d18', 0.28, 0.1),
  amber: surface('#d99c30', 0.3, 0.1),
};
finishes.headlamp.emissive.set('#ffdf9d');
finishes.headlamp.emissiveIntensity = 0.16;
finishes.taillamp.emissive.set('#a52310');
finishes.taillamp.emissiveIntensity = 0.15;
// Night driving (0.6.0): headlamps and tail lamps glow after dusk (emissive only: no extra lights or passes).
export function setVehicleLights(level) {
  finishes.headlamp.emissiveIntensity = 0.16 + 3.2 * level;
  finishes.taillamp.emissiveIntensity = 0.15 + 2.4 * level;
}
const cyclistFinishes = {
  skin: surface('#bb8865', 0.87),
  trousers: surface('#263d52', 0.88),
  helmet: surface('#d76b42', 0.48),
  spoke: surface('#87999d', 0.66, 0.35),
};
const templates = new Map();

export function vehicleDimensions(type) {
  if (type === 'cyclist') return { length: 1.75, width: 0.68, height: 1.8, halfLength: 0.95, halfWidth: 0.37 };
  const d =
    type === 'semi'
      ? { length: 13.3, width: 2.74, height: 3.78 }
      : type === 'double'
        ? { length: DOUBLE.length, width: 2.6, height: DOUBLE.height }
        : data[type === 'car' ? 'sedan' : type];
  if (!d) throw new Error(`Unknown vehicle: ${type}`);
  return {
    length: d.length,
    width: d.width,
    height: d.height,
    halfLength: d.length / 2 + 0.08,
    halfWidth: d.width / 2 + 0.06,
  };
}

function modelParts(type) {
  if (!templates.has(type)) {
    const buckets = new Map();
    for (const part of data[type].meshes) {
      const geo = new T.BufferGeometry();
      geo.setAttribute('position', new T.Float32BufferAttribute(part.positions, 3));
      geo.setAttribute('normal', new T.Float32BufferAttribute(part.normals, 3));
      geo.setIndex(part.indices);
      if (!buckets.has(part.material)) buckets.set(part.material, []);
      buckets.get(part.material).push(geo);
    }
    templates.set(
      type,
      [...buckets].map(([material, geos]) => {
        const geometry = mergeGeometries(geos, false);
        geos.forEach(g => g.dispose());
        return { material, geometry };
      }),
    );
  }
  return templates.get(type);
}

// Double (train routier, 0.6.0): long-nose tractor with sleeper and two 8.2 m pup trailers joined by a converter
// dolly; 18.0 m from the steer axle to the last axle, 4.8 m from the asphalt to the top of the trailers.
export const DOUBLE = { length: 21.6, height: 4.8, frontAxle: 1.3, lastAxle: 19.3 };
function createDoubleModel(group, paint, material) {
  const L = DOUBLE.length,
    x = d => L / 2 - d; // distance from the front bumper → local x (+X forward)
  const add = (name, geometry, mat, px, py, pz) => {
    const mesh = new T.Mesh(geometry, mat);
    mesh.name = name;
    mesh.position.set(px, py, pz);
    mesh.castShadow = mesh.receiveShadow = true;
    group.add(mesh);
    return mesh;
  };
  const box = (name, mat, d0, d1, y0, y1, w, z = 0) =>
    add(name, new T.BoxGeometry(d1 - d0, y1 - y0, w), mat, x((d0 + d1) / 2), (y0 + y1) / 2, z);
  const wheel = (d, z, dual = false) => {
    const r = 0.52,
      t = dual ? 0.56 : 0.3;
    const tyre = add('Tyre', new T.CylinderGeometry(r, r, t, 18), material('rubber'), x(d), r, z);
    tyre.rotation.x = Math.PI / 2;
    const rim = add('Wheel rim', new T.CylinderGeometry(0.3, 0.3, t + 0.01, 14), material('metal'), x(d), r, z + Math.sign(z) * 0.005);
    rim.rotation.x = Math.PI / 2;
  };
  // Tractor: bumper, long hood, cab, sleeper with roof fairing, tanks, stacks, mirrors.
  box('Front bumper', material('metal'), 0, 0.35, 0.45, 0.85, 2.5);
  box('Grille', material('trim'), 0.3, 0.45, 0.85, 1.95, 1.2);
  box('Hood', paint, 0.35, 2.55, 0.95, 1.95, 2.05);
  for (const z of [-1.1, 1.1]) {
    box('Fender', paint, 0.6, 2.2, 0.75, 1.25, 0.35, z);
    box('Headlamp', material('headlamp'), 0.32, 0.4, 1.35, 1.55, 0.35, z * 0.8);
    box('Fuel tank', material('metal'), 3.4, 4.9, 0.55, 1.15, 0.55, z * 1.02);
    add('Exhaust stack', new T.CylinderGeometry(0.08, 0.08, 2.6, 8), material('metal'), x(4.55), 3.0, z * 1.05);
    box('Mirror', material('trim'), 2.35, 2.45, 2.3, 2.75, 0.12, z * 1.35);
  }
  box('Cab', paint, 2.55, 4.3, 0.95, 3.15, 2.45);
  box('Windshield', material('glass'), 2.5, 2.62, 2.15, 3.0, 2.2);
  for (const z of [-1.23, 1.23]) box('Side window', material('glass'), 2.8, 3.6, 2.15, 2.85, 0.02, z);
  box('Sleeper', paint, 4.3, 6.0, 0.95, 3.55, 2.45);
  box('Roof fairing', paint, 3.4, 6.0, 3.15, 4.25, 2.3);
  box('Chassis', material('trim'), 0.4, 7.4, 0.55, 0.85, 1.0);
  box('Fifth wheel', material('trim'), 5.9, 7.1, 0.95, 1.12, 1.9);
  // Trailer 1 (5.2–13.4) on the fifth wheel, converter dolly with draw bar, trailer 2 (13.4–21.6).
  const trailer = (d0, d1, axle) => {
    box('Dry-van trailer', material('cargo'), d0, d1, 1.25, DOUBLE.height, 2.6);
    box('Trailer chassis', material('trim'), d0 + 0.1, d1 - 0.1, 1.02, 1.25, 1.9);
    for (const z of [-1.301, 1.301]) {
      box('Trailer livery', paint, d0 + 0.3, d1 - 0.3, 1.45, 1.6, 0.02, z);
      for (let d = d0 + 0.8; d < d1 - 0.3; d += 1.2) box('Side marker', material('amber'), d, d + 0.1, 1.33, 1.4, 0.03, z * 1.005);
      box('Tail lamp', material('taillamp'), d1 - 0.02, d1 + 0.01, 1.3, 1.46, 0.34, z * 0.7);
      wheel(axle - 0.6, z * 0.92, true);
      wheel(axle + 0.6, z * 0.92, true);
    }
    box('Rear door seam', material('trim'), d1 - 0.01, d1 + 0.01, 1.3, DOUBLE.height - 0.05, 0.03);
    box('Underrun bar', material('metal'), d1 - 0.25, d1 - 0.1, 0.5, 0.66, 2.1);
  };
  trailer(5.2, 13.4, 12.2);
  box('Dolly draw bar', material('trim'), 13.4, 14.5, 0.62, 0.72, 0.25);
  box('Dolly frame', material('trim'), 14.0, 15.3, 0.75, 1.0, 1.9);
  trailer(13.4, 21.6, DOUBLE.lastAxle - 0.6);
  for (const z of [-1.08, 1.08]) {
    wheel(DOUBLE.frontAxle, z);
    wheel(5.9, z * 0.92, true);
    wheel(7.2, z * 0.92, true);
    wheel(14.65, z * 0.92, true);
  }
}

export function createVehicleModel(type, paintMaterial, materials = {}) {
  if (type === 'cyclist') return createCyclistModel(paintMaterial);
  if (type === 'double') {
    const group = new T.Group(),
      paint = paintMaterial ?? finishes.paint,
      material = name => (name === 'paint' ? paint : (materials[`vehicle_${name}`] ?? finishes[name]));
    group.name = 'double';
    group.userData = { ...vehicleDimensions('double'), source: 'BridgeSketch 3D procedural double', units: 'metres', forwardAxis: '+X' };
    createDoubleModel(group, paint, material);
    return group;
  }
  if (type === 'car') type = 'sedan';
  const dimensions = vehicleDimensions(type),
    group = new T.Group(),
    paint = paintMaterial ?? finishes.paint;
  const material = name => (name === 'paint' ? paint : (materials[`vehicle_${name}`] ?? finishes[name]));
  group.name = type;
  group.userData = { ...dimensions, source: 'Kenney Car Kit 3.1 (CC0)', units: 'metres', forwardAxis: '+X' };
  for (const part of modelParts(type === 'semi' ? 'tractor' : type)) {
    const mesh = new T.Mesh(part.geometry.clone(), material(part.material));
    mesh.name = `${type} ${part.material}`;
    mesh.castShadow = mesh.receiveShadow = true;
    if (type === 'semi') mesh.position.x = 3.9;
    group.add(mesh);
  }
  if (type === 'semi') {
    const box = (name, mat, x, y, z, w, h, d) => {
      const mesh = new T.Mesh(new T.BoxGeometry(w, h, d), mat);
      mesh.name = name;
      mesh.position.set(x, y, z);
      mesh.castShadow = mesh.receiveShadow = true;
      group.add(mesh);
      return mesh;
    };
    box('Dry-van trailer', material('cargo'), -2.3, 2.44, 0, 8.7, 2.66, 2.52);
    box('Trailer chassis', material('trim'), -2.3, 1.01, 0, 8.6, 0.22, 1.94);
    for (const side of [-1, 1]) {
      box('Trailer lower rail', material('metal'), -2.3, 1.17, side * 1.27, 8.65, 0.1, 0.05);
      box('Trailer roof rail', material('metal'), -2.3, 3.73, side * 1.27, 8.65, 0.08, 0.05);
      box('Trailer livery', paint, -2.3, 1.46, side * 1.268, 8.5, 0.15, 0.014);
      for (let x = -6.45; x < 2; x += 1.05) {
        box('Trailer panel seam', material('metal'), x, 2.46, side * 1.269, 0.015, 2.4, 0.008);
        box('Side marker', material('amber'), x, 1.22, side * 1.3, 0.11, 0.065, 0.025);
      }
      for (const x of [-5.75, -4.55]) {
        const tyre = new T.Mesh(new T.CylinderGeometry(0.5, 0.5, 0.28, 20), material('rubber'));
        tyre.rotation.x = Math.PI / 2;
        tyre.position.set(x, 0.5, side * 1.16);
        tyre.castShadow = true;
        group.add(tyre);
        const rim = new T.Mesh(new T.CylinderGeometry(0.3, 0.3, 0.293, 16), material('metal'));
        rim.rotation.x = Math.PI / 2;
        rim.position.copy(tyre.position);
        group.add(rim);
        const hub = new T.Mesh(new T.CylinderGeometry(0.11, 0.11, 0.31, 12), material('trim'));
        hub.rotation.x = Math.PI / 2;
        hub.position.copy(tyre.position);
        group.add(hub);
      }
      box('Rear tail lamp', material('taillamp'), -6.669, 1.17, side * 0.92, 0.032, 0.16, 0.34);
      box('Rear door locking bar', material('metal'), -6.669, 2.47, side * 0.66, 0.024, 2.2, 0.038);
    }
    box('Rear door seam', material('trim'), -6.657, 2.44, 0, 0.02, 2.46, 0.025);
    box('Rear underrun bar', material('metal'), -6.56, 0.53, 0, 0.12, 0.16, 2.12);
  }
  return group;
}

// Low-poly road cyclist in the Kenney traffic scale. The frame, rider body and
// arms are static; wheels, cranks and legs are animated sub-groups driven by the
// distance travelled, so pedalling and wheel speed always match the motion.
const bikeFinishes = {
  tyre: surface('#15191c', 0.9),
  rim: surface('#c9d0d2', 0.28, 0.75),
  spoke: surface('#9aa6a9', 0.4, 0.6),
  chainring: surface('#7c868a', 0.35, 0.8),
  saddle: surface('#1d2327', 0.7),
  bar: surface('#2a3034', 0.5, 0.3),
  shoe: surface('#f2f2ee', 0.55),
  glove: surface('#20262a', 0.8),
  lens: surface('#1b2b33', 0.15, 0.4),
};
function rodMesh(material, radius, segments = 7) {
  const mesh = new T.Mesh(new T.CylinderGeometry(radius, radius, 1, segments), material);
  mesh.castShadow = true;
  return mesh;
}
function placeRod(mesh, a, b) {
  const from = new T.Vector3(...a),
    to = new T.Vector3(...b),
    delta = to.clone().sub(from),
    length = delta.length() || 1e-3;
  mesh.position.copy(from).add(to).multiplyScalar(0.5);
  mesh.scale.set(1, length, 1);
  mesh.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), delta.multiplyScalar(1 / length));
  return mesh;
}
function createCyclistModel(jersey = finishes.paint) {
  const g = new T.Group(),
    { skin, trousers, helmet } = cyclistFinishes,
    frame = jersey,
    { tyre, rim, chainring, saddle, bar, shoe, glove, lens } = bikeFinishes;
  const rod = (name, a, b, r, mat, segments) => {
    const mesh = placeRod(rodMesh(mat, r, segments), a, b);
    mesh.name = name;
    g.add(mesh);
    return mesh;
  };
  const R = 0.34,
    rear = [-0.5, R, 0],
    front = [0.5, R, 0],
    bb = [-0.07, 0.3, 0],
    seatTop = [-0.22, 0.9, 0],
    headTop = [0.37, 0.88, 0],
    headLow = [0.4, 0.74, 0];
  // Wheels: tyre, rim and 16 spokes, rotating about the axle.
  const wheels = [];
  for (const [x, y] of [rear, front]) {
    const wheel = new T.Group();
    wheel.name = 'Bicycle wheel';
    wheel.position.set(x, y, 0);
    // Rim, hub and 16 spokes share one merged mesh per wheel to keep draw calls low.
    const t = new T.Mesh(new T.TorusGeometry(R - 0.02, 0.022, 6, 24), tyre),
      parts = [
        new T.TorusGeometry(R - 0.05, 0.012, 4, 24),
        new T.CylinderGeometry(0.03, 0.03, 0.1, 8).rotateX(Math.PI / 2),
      ];
    for (let k = 0; k < 16; k++) {
      const a = (k * Math.PI) / 8,
        side = k % 2 ? 0.02 : -0.02,
        sp = placeRod(rodMesh(rim, 0.0035, 3), [0, 0, side], [Math.cos(a) * (R - 0.05), Math.sin(a) * (R - 0.05), 0]);
      sp.updateMatrix();
      parts.push(sp.geometry.clone().applyMatrix4(sp.matrix));
      sp.geometry.dispose();
    }
    const spokes = new T.Mesh(
      mergeGeometries(
        parts.map(g => (g.index ? g.toNonIndexed() : g)),
        false,
      ),
      rim,
    );
    parts.forEach(g => g.dispose());
    t.castShadow = true;
    wheel.add(t, spokes);
    g.add(wheel);
    wheels.push(wheel);
  }
  // Diamond frame, fork, seat post, saddle and drop handlebar.
  for (const [a, b] of [
    [bb, seatTop],
    [seatTop, headTop],
    [bb, headLow],
    [bb, rear],
    [[-0.2, 0.86, 0], rear],
  ])
    rod('Bicycle frame', a, b, 0.02, frame);
  for (const z of [-0.045, 0.045]) rod('Fork blade', [0.4, 0.74, z], [front[0], front[1], z], 0.013, frame);
  rod('Head tube', headLow, headTop, 0.024, frame);
  rod('Seat post', seatTop, [-0.25, 0.99, 0], 0.014, bar);
  rod('Saddle', [-0.35, 1.0, 0], [-0.15, 1.0, 0], 0.035, saddle);
  rod('Stem', headTop, [0.47, 0.96, 0], 0.016, bar);
  rod('Handlebar', [0.47, 0.96, -0.21], [0.47, 0.96, 0.21], 0.016, bar);
  for (const z of [-0.2, 0.2]) {
    rod('Bar drop', [0.47, 0.96, z], [0.55, 0.9, z], 0.015, bar);
    rod('Bar drop', [0.55, 0.9, z], [0.5, 0.83, z], 0.015, bar);
  }
  // Rider: leaning torso, arms to the hoods, helmeted head with glasses.
  const hip = [-0.24, 1.03, 0],
    shoulder = [0.17, 1.4, 0];
  rod('Cyclist torso', hip, shoulder, 0.13, jersey, 8);
  rod('Cyclist shorts', [-0.3, 1.02, 0], [-0.12, 1.08, 0], 0.135, trousers, 8);
  for (const side of [-1, 1]) {
    const s = [0.15, 1.38, side * 0.17],
      elbow = [0.3, 1.2, side * 0.21],
      hand = [0.49, 0.98, side * 0.2];
    rod('Cyclist upper arm', s, elbow, 0.045, jersey);
    rod('Cyclist forearm', elbow, hand, 0.037, skin);
    const h = new T.Mesh(new T.IcosahedronGeometry(0.045, 0), glove);
    h.position.set(...hand);
    g.add(h);
  }
  rod('Cyclist neck', [0.2, 1.43, 0], [0.26, 1.52, 0], 0.045, skin);
  const face = new T.Mesh(new T.IcosahedronGeometry(0.105, 1), skin);
  face.position.set(0.29, 1.58, 0);
  face.castShadow = true;
  g.add(face);
  const cap = new T.Mesh(new T.SphereGeometry(0.125, 10, 5, 0, Math.PI * 2, 0, Math.PI * 0.55), helmet);
  cap.position.set(0.27, 1.61, 0);
  cap.scale.set(1.25, 1, 1);
  cap.rotation.z = -0.25;
  cap.castShadow = true;
  g.add(cap);
  const glasses = new T.Mesh(new T.BoxGeometry(0.03, 0.035, 0.19), lens);
  glasses.position.set(0.385, 1.595, 0);
  g.add(glasses);
  // Animated drivetrain: chainring and cranks turn about the bottom bracket.
  const crank = new T.Group();
  crank.name = 'Crankset';
  crank.position.set(...bb);
  const ring = new T.Mesh(new T.CylinderGeometry(0.1, 0.1, 0.012, 18), chainring);
  ring.rotation.x = Math.PI / 2;
  ring.position.z = 0.06;
  crank.add(ring);
  const armParts = [];
  for (const side of [-1, 1]) {
    const turn = new T.Matrix4().makeRotationZ(side > 0 ? 0 : Math.PI),
      arm = placeRod(rodMesh(bar, 0.012, 5), [0, 0, side * 0.07], [0.17, 0, side * 0.07]);
    arm.updateMatrix();
    armParts.push(
      arm.geometry.clone().applyMatrix4(arm.matrix).applyMatrix4(turn).toNonIndexed(),
      new T.BoxGeometry(0.1, 0.02, 0.08)
        .translate(0.17, 0, side * 0.12)
        .applyMatrix4(turn)
        .toNonIndexed(),
    );
    arm.geometry.dispose();
  }
  crank.add(new T.Mesh(mergeGeometries(armParts, false), bar));
  armParts.forEach(g => g.dispose());
  g.add(crank);
  const legs = new T.Group();
  legs.name = 'Cyclist legs';
  g.add(legs);
  const leg = side => ({
    side,
    thigh: legs.add(rodMesh(trousers, 0.062, 7)) && legs.children.at(-1),
    shin: legs.add(rodMesh(skin, 0.045, 7)) && legs.children.at(-1),
    foot: legs.add(new T.Mesh(new T.BoxGeometry(0.2, 0.06, 0.08), shoe)) && legs.children.at(-1),
  });
  const limbs = [leg(-1), leg(1)],
    thighLength = 0.46,
    shinLength = 0.47,
    hipPoint = [-0.22, 1.0];
  const pose = distance => {
    for (const w of wheels) w.rotation.z = -distance / R;
    const angle = -distance / R / 2.7;
    crank.rotation.z = angle;
    for (const limb of limbs) {
      const a = angle + (limb.side > 0 ? 0 : Math.PI),
        pedal = [bb[0] + Math.cos(a) * 0.17, bb[1] + Math.sin(a) * 0.17],
        ankle = [pedal[0] - 0.02, pedal[1] + 0.05];
      const dx = ankle[0] - hipPoint[0],
        dy = ankle[1] - hipPoint[1],
        d = Math.min(thighLength + shinLength - 0.002, Math.hypot(dx, dy));
      const along = (thighLength ** 2 - shinLength ** 2 + d * d) / (2 * d),
        h = Math.sqrt(Math.max(0, thighLength ** 2 - along ** 2)),
        ux = dx / Math.hypot(dx, dy),
        uy = dy / Math.hypot(dx, dy);
      const k1 = [hipPoint[0] + ux * along - uy * h, hipPoint[1] + uy * along + ux * h],
        k2 = [hipPoint[0] + ux * along + uy * h, hipPoint[1] + uy * along - ux * h],
        knee = k1[0] >= k2[0] ? k1 : k2;
      const z = limb.side * 0.1;
      placeRod(limb.thigh, [hipPoint[0], hipPoint[1], z], [knee[0], knee[1], z]);
      placeRod(limb.shin, [knee[0], knee[1], z], [ankle[0], ankle[1], z + limb.side * 0.01]);
      limb.foot.position.set(pedal[0] + 0.02, pedal[1] + 0.03, limb.side * 0.12);
      limb.foot.rotation.z = -0.15;
    }
  };
  pose(0);
  g.name = 'Cyclist';
  g.userData = {
    ...vehicleDimensions('cyclist'),
    source: 'BridgeSketch low-poly geometry',
    units: 'metres',
    forwardAxis: '+X',
    pose,
  };
  return g;
}
