// BridgeSketch 3D · Bridge railings on curbs or sidewalks and roadside W-beam guardrails.
import * as T from 'three';
import { frame, profile, supportStation } from './geometry.mjs';
import { box, chamferSection, rect, sweep } from './sections.mjs';
import { CURB_HEIGHT, RAIL_311A, barrierHeight, barrierTopCentre, wheelCurb } from './deck-profiles.mjs';

export const guardrailSection = [
  [-0.04, 0.53],
  [0.035, 0.57],
  [0.05, 0.62],
  [-0.025, 0.68],
  [0.05, 0.74],
  [0.035, 0.8],
  [-0.04, 0.84],
  [-0.044, 0.836],
  [0.03, 0.797],
  [0.044, 0.741],
  [-0.031, 0.68],
  [0.044, 0.619],
  [0.03, 0.573],
  [-0.044, 0.534],
];

export // Steel railings stand on a concrete wheel curb at the deck edge. On a raised
// sidewalk the posts are anchored in the sidewalk itself: no wheel curb.
// baseOffset: sidewalk top above the road surface when the railing stands on a sidewalk, otherwise null.
function bridgeRailing(parent, m, c, a, b, edge, side, type, baseOffset = null, surface = profile) {
  const onSidewalk = baseOffset !== null,
    curbTop = onSidewalk ? 0 : CURB_HEIGHT - c.asphalt,
    u = edge - side * (onSidewalk ? 0.12 : 0.18),
    height = type === '210A' ? 0.87 : 1.4,
    curb = wheelCurb(edge, side, c.asphalt);
  baseOffset ??= 0;
  if (!onSidewalk) parent.add(sweep(c, a, b, chamferSection(curb), m.edge, (_, q) => surface(c, q)));
  const rail = (y, w = 0.14, h = 0.12) => {
    const top = curbTop + y + h / 2,
      bottom = curbTop + y - h / 2,
      t = 0.006;
    for (const section of [
      rect(u - w / 2, u + w / 2, top, top - t),
      rect(u - w / 2, u + w / 2, bottom + t, bottom),
      rect(u - w / 2, u - w / 2 + t, top - t, bottom + t),
      rect(u + w / 2 - t, u + w / 2, top - t, bottom + t),
    ])
      parent.add(sweep(c, a, b, section, m.railing, (_, q) => profile(c, q) + baseOffset));
  };
  if (type === '20C') {
    rail(0.08, 0.08, 0.05);
    rail(1.38, 0.08, 0.05);
  } else {
    for (const y of [0.18, 0.51, 0.81]) rail(Math.min(y, height - 0.06));
    if (type === '210C') rail(1.38, 0.05, 0.05);
  }
  const posts = [a];
  for (let q = a + 3; q < b - 0.01; q += 3) posts.push(q);
  if (posts.at(-1) !== b) posts.push(b);
  for (const q of posts) {
    const s = supportStation(c, q, u),
      p = frame(c, s, u),
      y = profile(c, s) + baseOffset + curbTop,
      angle = -Math.atan2(p.tz, p.tx);
    box(parent, m.railing, p.x, y + height / 2, p.z, 0.09, height, 0.09, angle);
    box(parent, m.dark, p.x, y + 0.02, p.z, 0.15, 0.035, 0.15, angle);
  }
  if (type === '20C')
    for (let q = a + 0.1; q < b - 0.05; q += 0.1) {
      const s = supportStation(c, q, u),
        p = frame(c, s, u),
        angle = -Math.atan2(p.tz, p.tx);
      box(parent, m.railing, p.x, profile(c, s) + baseOffset + curbTop + 0.73, p.z, 0.018, 1.31, 0.018, angle);
    }
}

export function roadsideGuardrail(parent, m, c, a, b, u, road) {
  const local = road
    ? {
        ...c,
        curved: false,
        skew: 0,
        variableDepth: false,
        profile: 'constant',
        elevation: road.elevation,
        grade: 0,
        spans: [{ length: 0 }],
      }
    : c;
  const side = Math.sign(u),
    path = (q, v = 0) => {
      const station = road ? q : supportStation(c, q, u),
        p = frame(local, station, u + v);
      return { x: p.x, y: profile(local, station), z: p.z, angle: -Math.atan2(p.tz, p.tx) };
    };
  const group = new T.Group(),
    section = guardrailSection.map(([x, y]) => [u + side * x, y]);
  if (side < 0) section.reverse();
  group.add(sweep(local, a, b, section, m.guardrail));
  const count = Math.max(1, Math.ceil((b - a) / 1.9));
  for (let j = 0; j <= count; j++) {
    const q = a + ((b - a) * j) / count,
      p = path(q, side * 0.14);
    box(group, m.guardrail, p.x, p.y + 0.38, p.z, 0.1, 0.92, 0.13, p.angle);
    const block = path(q, side * 0.07);
    box(group, m.dark, block.x, block.y + 0.68, block.z, 0.12, 0.2, 0.12, block.angle);
    const bolt = path(q, -side * 0.045);
    box(group, m.railing, bolt.x, bolt.y + 0.68, bolt.z, 0.03, 0.025, 0.025, bolt.angle);
  }
  for (const q of [a, b]) {
    const p = path(q);
    box(group, m.guardrail, p.x, p.y + 0.68, p.z, 0.22, 0.34, 0.12, p.angle);
  }
  if (road) {
    group.position.set(road.x, 0, road.z);
    group.rotation.y = road.yaw;
  }
  group.updateMatrixWorld(true);
  for (const mesh of [...group.children]) {
    mesh.applyMatrix4(group.matrix);
    parent.add(mesh);
  }
}

// Type 311A (« 311 A+B »): a steel tube rail on short posts anchored in the top of a Type 311 concrete barrier.
export function barrierRail(parent, m, c, a, b, edge, side, base) {
  const r = RAIL_311A,
    u = edge - side * barrierTopCentre('311A'),
    top = base + barrierHeight('311A'),
    railTop = top + r.rise,
    t = 0.008;
  for (const section of [
    rect(u - r.width / 2, u + r.width / 2, railTop, railTop - t),
    rect(u - r.width / 2, u + r.width / 2, railTop - r.depth + t, railTop - r.depth),
    rect(u - r.width / 2, u - r.width / 2 + t, railTop - t, railTop - r.depth + t),
    rect(u + r.width / 2 - t, u + r.width / 2, railTop - t, railTop - r.depth + t),
  ])
    parent.add(sweep(c, a, b, section, m.railing));
  const count = Math.max(1, Math.round((b - a) / r.spacing));
  for (let j = 0; j <= count; j++) {
    const q = a + 0.3 + ((b - a - 0.6) * j) / count,
      s = supportStation(c, q, u),
      p = frame(c, s, u),
      y = profile(c, s),
      angle = -Math.atan2(p.tz, p.tx),
      postHeight = r.rise - r.depth;
    box(parent, m.railing, p.x, y + top + postHeight / 2, p.z, r.post, postHeight, 0.1, angle);
    box(parent, m.dark, p.x, y + top + 0.012, p.z, 0.3, 0.025, 0.24, angle);
  }
}
