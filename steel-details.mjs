// BridgeSketch 3D · Steel details: cross-frame angles, web offsets and transverse stiffeners.
import * as T from 'three';
import { supportStation, girderTop, girderDepth } from './geometry.mjs';
import { skewPlate } from './sections.mjs';

export function bracingMember(parent, mat, a, b) {
  const shape = new T.Shape();
  shape.moveTo(-0.065, -0.065);
  for (const [x, y] of [
    [0.065, -0.065],
    [0.065, -0.052],
    [-0.052, -0.052],
    [-0.052, 0.065],
    [-0.065, 0.065],
  ])
    shape.lineTo(x, y);
  shape.closePath();
  const start = new T.Vector3(...a),
    direction = new T.Vector3(...b).sub(start),
    geometry = new T.ExtrudeGeometry(shape, {
      depth: direction.length(),
      bevelEnabled: false,
      steps: 1,
      curveSegments: 1,
    });
  const member = new T.Mesh(geometry, mat);
  member.position.copy(start);
  member.quaternion.setFromUnitVectors(new T.Vector3(0, 0, 1), direction.normalize());
  member.castShadow = member.receiveShadow = true;
  member.name = 'Steel angle brace';
  parent.add(member);
}

export // Horizontal distance from a girder centre to its web face at level y; box webs
// run from the constant top-flange line to the bottom-flange edge.
function webOffset(c, i, s, u, y) {
  if (c.material !== 'box') return c.material === 'steel' ? c.web / 2 + 0.05 : 0.06;
  const station = supportStation(c, s, u),
    top = girderTop(c, i, station),
    depth = girderDepth(c, station, u),
    t = Math.max(0, Math.min(1, (top - 0.05 - y) / Math.max(0.01, depth - 0.1))),
    upper = c.boxTopWidth / 2 - 0.25;
  return upper + (c.boxBottomWidth / 2 - upper) * t;
}

export // Vertical 14 mm transverse stiffener, full local web height, in the skewed plane.
function webStiffener(parent, mat, c, i, s, u, face) {
  const station = supportStation(c, s, u),
    top = girderTop(c, i, station) - 0.05,
    bottom = girderTop(c, i, station) - girderDepth(c, station, u) + 0.05,
    inner = u + (face * c.web) / 2,
    outer = u + face * (c.web / 2 + 0.2);
  return skewPlate(
    parent,
    mat,
    c,
    s,
    [
      [inner, top],
      [outer, top],
      [outer, bottom],
      [inner, bottom],
    ],
    0.014,
    'Web stiffener',
  );
}
