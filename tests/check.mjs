import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { readFile, readdir } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';
// Runs from the application folder (repository root, or dist/ in the local project).
process.chdir(fileURLToPath(new URL('..', import.meta.url)));
import {
  defaults,
  validate,
  profile,
  frame,
  supportStation,
  spacing,
  totalLength,
  waterGroups,
  encodeConfig,
  decodeConfig,
  girderDepth,
  clearance,
  setClearance,
  roadLayout,
  terrainBase,
  approachDrop,
  approachToeOffset,
  laneForward,
  steelFinishes,
  vehicleFits,
  alignmentStation,
  fitBoxLayout,
  fitBoxLayoutFromBottom,
} from '../geometry.mjs';
import { presets, makePreset } from '../presets.mjs';
registerHooks({
  resolve(specifier, context, next) {
    if (specifier === 'three')
      return { url: new URL('../vendor/three.module.min.js', import.meta.url).href, shortCircuit: true };
    return next(specifier, context);
  },
});
const {
  makeMaterials,
  buildBridge,
  disposeModel,
  nebtSection,
  boxSection,
  boxGirder,
  slabMesh,
  approachSurfaces,
  guardrailSection,
  wallBetween,
  roadFootprints,
  intersectsRoad,
  crossingCorridors,
  vehicle,
  vehicleKinds,
  animateTraffic,
} = await import('../scene.mjs');
const T = await import('three');
const { makeTrain, kenneySize, buildingStyles } = await import('../kenney-scene.mjs');
const { obstacleTour } = await import('../scene.mjs');
for (const obstacle of ['road', 'rail', 'water'])
  for (const curved of [false, true]) {
    const c = validate({
        ...defaults,
        material: 'steel',
        curved,
        spans: [20, 40, 20].map(length => ({ length, obstacle, width: 7, elevation: 0, angle: 70 })),
      }),
      tour = obstacleTour(c);
    assert.equal(tour.index, 1);
    assert.equal(tour.type, obstacle);
    const before = tour.pose(-tour.reach),
      under = tour.pose(0),
      after = tour.pose(tour.reach);
    assert.ok(Math.hypot(after.position[0] - before.position[0], after.position[2] - before.position[2]) > 60);
    for (const pose of [before, under, after]) {
      assert.ok([...pose.position, ...pose.target].every(Number.isFinite));
      assert.ok(pose.position[1] < pose.target[1]);
    }
    assert.equal(under.position[1], obstacle === 'water' ? 1.3 : obstacle === 'rail' ? 2.2 : 1.65);
  }
assert.equal(
  obstacleTour(
    validate({
      ...defaults,
      spans: [10, 50, 20, 10].map(length => ({ length, obstacle: 'water', width: 7, elevation: 0, angle: 90 })),
    }),
  ).index,
  1,
);
for (const angle of [-0.8, 0, 0.8]) {
  const group = new T.Group(),
    mat = new T.MeshStandardMaterial(),
    a = [-3, 0, 2],
    b = [-3 + 10 * Math.cos(angle), 0, 2 + 10 * Math.sin(angle)];
  const wall = wallBetween(group, mat, a, b, 0.8, -1, 5);
  wall.updateMatrixWorld(true);
  const bounds = new T.Box3().setFromObject(wall);
  assert.ok(Math.abs(bounds.min.y + 1) < 1e-8 && Math.abs(bounds.max.y - 5) < 1e-8);
  const end = new T.Vector3(5, 0, 0).applyMatrix4(wall.matrix);
  assert.ok(Math.hypot(end.x - b[0], end.z - b[2]) < 1e-8);
  wall.geometry.dispose();
  mat.dispose();
}
const c = validate(structuredClone(defaults));
// Earlier saved concepts acquire the new dimensions and current traffic default.
const legacy = structuredClone(c);
for (const key of ['laneWidth', 'movingTraffic', 'bentWidth', 'bentThickness']) delete legacy[key];
const migrated = decodeConfig(encodeConfig(legacy)).config;
assert.deepEqual(
  [migrated.laneWidth, migrated.movingTraffic, migrated.bentWidth, migrated.bentThickness],
  [3.5, true, 1.9, 1],
);
for (const [key, min, max] of [
  ['laneWidth', 2.5, 4.5],
  ['bentWidth', 0.5, 5],
  ['bentThickness', 0.35, 3],
]) {
  for (const value of [min, max]) assert.equal(validate({ ...c, [key]: value })[key], value);
  for (const value of [min - 0.01, max + 0.01, NaN, Infinity, String(min), null])
    assert.throws(() => validate({ ...c, [key]: value }), new RegExp(key));
}
for (const movingTraffic of [false, true])
  assert.equal(decodeConfig(encodeConfig({ ...c, movingTraffic })).config.movingTraffic, movingTraffic);
for (const timeOfDay of [0, 6, 12, 17.5, 20, 24])
  assert.equal(decodeConfig(encodeConfig({ ...c, timeOfDay })).config.timeOfDay, timeOfDay);
for (const timeOfDay of [-0.25, 24.25, NaN, '17.5']) assert.throws(() => validate({ ...c, timeOfDay }), /timeOfDay/);
assert.equal(decodeConfig(encodeConfig({ ...c, steelColor: '#4a6b80' })).config.steelColor, '#4A6B80');
for (const steelColor of ['#12345', '#1234567', 'javascript:alert(1)'])
  assert.throws(() => validate({ ...c, steelColor }));
for (const movingTraffic of [0, 1, 'false', null])
  assert.throws(() => validate({ ...c, movingTraffic }), /moving traffic/);
const narrowLegacy = { ...legacy, width: 8, girders: 4, laneWidth: 4 };
delete narrowLegacy.laneCount;
assert.equal(validate(narrowLegacy).laneCount, 1, 'Legacy lane count respects the selected lane width');
assert.throws(() => validate({ ...c, width: 8, girders: 4, laneWidth: 4, laneCount: 2 }), /deck width/);
for (const laneWidth of [2.5, 3.15, 3.5, 4.5]) {
  const layout = roadLayout(validate({ ...c, laneWidth }));
  assert.equal(layout.laneEdges.length, c.laneCount + 1);
  for (let i = 1; i < layout.laneEdges.length; i++)
    assert.ok(
      Math.abs(layout.laneEdges[i] - layout.laneEdges[i - 1] - laneWidth) < 1e-7,
      'Solid boundaries enclose the selected lane width',
    );
  assert.ok(Math.abs(layout.laneEdges[0] - layout.roadMin - layout.leftShoulder) < 1e-7);
  assert.ok(Math.abs(layout.roadMax - layout.laneEdges.at(-1) - layout.rightShoulder) < 1e-7);
}
// Include both outer approach ends, skewed fill toes and the object's full radius.
for (const skew of [-40, 0, 40])
  for (const curved of [false, true]) {
    const v = validate({ ...c, skew, curved }),
      zones = roadFootprints(v),
      L = totalLength(v);
    for (const s of [-v.approach - 17, -2, L + 2, L + v.approach + 17])
      for (const u of [-v.width / 2, 0, v.width / 2]) {
        const p = frame(v, supportStation(v, s, u), u);
        assert.ok(intersectsRoad(zones, p.x, p.z, 0), 'Approach fill must exclude scenery');
      }
    for (const face of approachSurfaces(v)) {
      const x = face.reduce((n, p) => n + p[0], 0) / face.length,
        z = face.reduce((n, p) => n + p[2], 0) / face.length;
      assert.ok(intersectsRoad(zones, x, z, 0.01), 'Every actual fill surface excludes scenery');
      if (face.length === 3)
        for (const toe of face.slice(1))
          assert.ok(
            Math.abs(Math.hypot(toe[0] - face[0][0], toe[2] - face[0][2]) - 2 * (face[0][1] - toe[1])) < 1e-8,
            'Quarter cone is exactly 2H:1V',
          );
    }
    const p = frame(v, L / 2, v.width / 2 + 2);
    assert.ok(intersectsRoad(zones, p.x, p.z, 3), 'Canopy and building extents must clear road');
    assert.equal(intersectsRoad(zones, 10000, 10000, 10), false);
  }
assert.equal(totalLength(c), 75);
assert.equal(spacing(c), 2.4);
// Foremost quarter-cone toes touch the abutment plane without entering the span.
for (const skew of [-40, 0, 40])
  for (const direction of [-1, 1])
    for (const elevation of [7, 25]) {
      const v = validate({ ...c, material: 'steel', skew, curved: true, radius: 100, direction, elevation }),
        fills = approachSurfaces(v);
      for (const corner of fills.corners) {
        const f = frame(v, corner.end),
          k = Math.tan((skew * Math.PI) / 180),
          sign = corner.end === 0 ? 1 : -1;
        const distances = corner.ring.map(
          p => sign * ((p[0] - f.x) * (f.tx - k * f.nx) + (p[2] - f.z) * (f.tz - k * f.nz)),
        );
        assert.ok(Math.max(...distances) <= 1e-4, 'No toe projects beyond the abutment');
        assert.ok(Math.abs(Math.max(...distances)) < 1e-4, 'Toe touches the abutment plane');
        for (const p of corner.ring)
          assert.ok(Math.abs(Math.hypot(p[0] - corner.p[0], p[2] - corner.p[2]) - 2 * (corner.p[1] - p[1])) < 1e-7);
      }
    }
for (const medianType of ['barrier', 'sidewalk'])
  for (const sidewalkSide of ['none', 'left', 'right', 'both'])
    for (const laneCount of [2, 3, 4])
      for (const laneWidth of [2.5, 3.5, 4.5]) {
        const v = validate({
            ...c,
            width: 30,
            medianType,
            medianWidth: 1.8,
            sidewalkSide,
            sidewalkWidth: 3,
            laneCount,
            laneWidth,
          }),
          r = roadLayout(v);
        assert.equal(r.medianCentre, (r.roadMin + r.roadMax) / 2);
        assert.equal(
          r.medianCentre,
          sidewalkSide === 'left' ? 1.5 : sidewalkSide === 'right' ? -1.5 : 0,
          'Median follows carriageway centre after sidewalks',
        );
        assert.ok(
          r.laneCenters.slice(0, Math.floor(laneCount / 2)).every(u => u + laneWidth / 2 <= r.medianMin + 1e-8),
        );
        assert.ok(r.laneCenters.slice(Math.floor(laneCount / 2)).every(u => u - laneWidth / 2 >= r.medianMax - 1e-8));
        assert.equal(r.laneEdges.length, laneCount + 2, 'Median separates the two sets of lane boundaries');
        for (const u of r.laneCenters)
          for (const edge of [u - laneWidth / 2, u + laneWidth / 2])
            assert.ok(r.laneEdges.some(value => Math.abs(value - edge) < 1e-7));
        assert.ok(
          r.laneEdges.every(
            edge =>
              edge >= r.roadMin - 1e-7 &&
              edge <= r.roadMax + 1e-7 &&
              (edge <= r.medianMin + 1e-7 || edge >= r.medianMax - 1e-7),
          ),
        );
        assert.ok(r.dividers.every(d => d.u < r.medianMin || d.u > r.medianMax));
        assert.equal(vehicleFits(v, 35, r.medianCentre, 2.4, 1.1), false);
        assert.deepEqual(decodeConfig(encodeConfig({ ...v, background: 'white' })).config, {
          ...v,
          background: 'white',
        });
      }
assert.throws(() => validate({ ...c, medianType: 'barrier', laneCount: 1 }), /two lanes/);
assert.throws(() => validate({ ...c, medianType: 'sidewalk', medianWidth: NaN }));
assert.throws(() => validate({ ...c, background: 'purple' }));
assert.equal(validate({ ...c, environment: 'none' }).environment, 'none');
assert.equal(profile(c, 0), 7);
assert.equal(profile(c, 75), 7);
assert.equal(profile(c, 37.5), 7.45);
assert.equal(validate({ ...c, curved: true, material: 'concrete' }).material, 'steel');
assert.deepEqual(
  [validate({ ...c, asphalt: 0.1, web: 0.08 }).asphalt, validate(c).deck, validate(c).web],
  [0.065, 0.225, 0.014],
);
// Slab thickness is a 200 / 225 / 250 mm choice.
assert.equal(validate({ ...c, deck: 0.25 }).deck, 0.25);
assert.throws(() => validate({ ...c, deck: 0.4 }), /Slab thickness/);
assert.deepEqual(decodeConfig(encodeConfig(c)).config, c);
assert.equal(waterGroups(c).length, 1);
assert.equal(waterGroups(c)[0].end, 75);
const split = structuredClone(c);
split.spans[1].obstacle = 'road';
assert.equal(waterGroups(split).length, 2);
for (const invalid of [
  { girders: 1 },
  { width: NaN },
  { columns: 7 },
  { continuous: 'true' },
  { depth: 1.5 },
  { spans: [] },
  { width: '12' },
  { girders: 14 },
  { steelColor: 'banana' },
])
  assert.throws(() => validate({ ...c, ...invalid }));
const badWater = structuredClone(c);
badWater.spans[1].elevation = 1;
assert.throws(() => validate(badWater), /same water elevation/);
const haunched = validate({ ...c, material: 'steel', variableDepth: true, continuous: true, curved: true, skew: 28 });
for (const u of [-5, 0, 5])
  for (const [station, depth] of [
    [0, 1.4],
    [12.5, 1.4],
    [25, 2.4],
    [50, 2.4],
    [62.5, 1.4],
    [75, 1.4],
  ])
    assert.ok(Math.abs(girderDepth(haunched, supportStation(haunched, station, u), u) - depth) < 1e-9);
assert.throws(() => validate({ ...haunched, pierDepth: 1 }), /at least/);
// The bearing zone stays constant for 400 mm; the parabolic transition begins beyond it.
assert.equal(girderDepth({ ...haunched, curved: false, skew: 0 }, 25 - 0.4), 2.4);
assert.equal(girderDepth({ ...haunched, curved: false, skew: 0 }, 25 + 0.4), 2.4);
assert.ok(girderDepth({ ...haunched, curved: false, skew: 0 }, 25 - (25 * 0.3) / 2) > 1.4);
const slab = validate({ ...c, material: 'slab', slabDepth: 0.9, curved: true });
assert.equal(slab.material, 'slab');
assert.equal(girderDepth(slab, 25), 0.9);
assert.throws(() => validate({ ...slab, slabDepth: -1 }));
const slabVar = validate({ ...c, material: 'slab', variableDepth: true, slabDepth: 0.9, pierDepth: 1.4 });
assert.equal(girderDepth(slabVar, 25), 1.4);
assert.ok(clearance(slabVar, 0) < clearance(slab, 0));
const cleared = validate(setClearance(structuredClone(haunched), 1, 4.25));
assert.ok(Math.abs(clearance(cleared, 1) - 4.25) < 1e-9);
assert.equal(cleared.spans[0].elevation, cleared.spans[2].elevation);
assert.equal(girderDepth(validate({ ...haunched, spans: [c.spans[0]] }), 12.5), c.depth);
assert.equal(validate({ ...c, barrier: 0.8 }).barrier, 1.1);
assert.equal(validate({ ...c, pierType: 'wall', wallThickness: 1.1 }).wallThickness, 1.1);
assert.equal(
  validate({ ...c, pierType: 'hammerhead', hammerheadWidth: 3, hammerheadThickness: 0.7 }).hammerheadWidth,
  3,
);
assert.equal(validate({ ...c, columnDiameter: 1.6 }).columnDiameter, 1.6);
// Type 201 barriers are 410 mm wide at each edge.
assert.ok(Math.abs(roadLayout(c).shoulders - 2.09) < 1e-9);
assert.equal(approachToeOffset(c, -10, terrainBase(c)) / approachDrop(c, -10, terrainBase(c)), 2);
assert.equal(validate({ ...c, laneCount: 1, sidewalkSide: 'left', sidewalkWidth: 3 }).sidewalkSide, 'left');
assert.throws(() => validate({ ...c, sidewalkSide: 'both', sidewalkWidth: 3 }), /deck width/);
for (const count of [2, 3, 4, 5, 6, 10, 12]) {
  const v = validate(fitBoxLayout({ ...c, material: 'box', width: 30, girders: count }));
  const gap = spacing(v) - v.boxTopWidth,
    edge = v.overhang - v.boxTopWidth / 2;
  assert.equal(v.girders, count);
  assert.ok(gap >= 0.2 - 0.002 && gap <= 1.002);
  assert.ok(edge >= 0.35 - 0.002 && edge <= 1.202);
  assert.ok(v.boxBottomWidth + (v.depth - 0.1) / 2 + 0.5 <= v.boxTopWidth + 0.002);
}
assert.throws(
  () => validate({ ...c, material: 'box', girders: 2, boxTopWidth: 2.4, boxBottomWidth: 1.1, overhang: 1.2 }),
  /too far apart|cantilever/,
);
assert.throws(
  () => validate({ ...c, material: 'box', girders: 2, depth: 3, boxTopWidth: 1, boxBottomWidth: 0.4 }),
  /Box top flange must cover webs/,
);
assert.throws(
  () => validate({ ...c, material: 'box', girders: 2, boxTopWidth: 1.2, boxBottomWidth: 1.7 }),
  /bottom flange/,
);
assert.throws(() => validate({ ...c, terrainMode: 'ice' }), /autumn or snow/);
assert.throws(() => validate({ ...c, sceneWidth: 50 }), /sceneWidth/);
const featureConfig = validate(
  fitBoxLayout({
    ...c,
    material: 'box',
    girders: 2,
    barrierType: 'steel',
    abutmentType: 'wing',
    wingAngle: 45,
    laneCount: 1,
    sidewalkSide: 'left',
    showTraffic: false,
  }),
);
assert.deepEqual(decodeConfig(encodeConfig(featureConfig)).config, featureConfig);
for (const bottom of [1.2, 1.8, 2.2]) {
  const top = bottom + (1.6 - 0.1) / 2 + 0.5,
    section = boxSection(1.6, top, bottom),
    web = section.left,
    deep = boxSection(2.6, top, bottom);
  assert.ok(
    Math.abs(web[3][0] - web[0][0] - (1.6 - 0.1) / 4) < 1e-9,
    'Box web remains 1H:4V between flanges at typical depth',
  );
  assert.deepEqual(deep.topLeft, section.topLeft, 'Top flanges do not move where the box deepens');
  assert.deepEqual(deep.topRight, section.topRight);
  assert.ok((deep.left[3][0] - deep.left[0][0]) / (2.6 - 0.1) < 0.25, 'Deeper webs become steeper than 1H:4V');
  assert.equal(section.bottom[1][0] - section.bottom[0][0], bottom);
  assert.ok(
    Math.abs(section.topLeft[1][0] - section.topLeft[0][0] - 0.5) < 1e-9 &&
      Math.abs(section.topRight[1][0] - section.topRight[0][0] - 0.5) < 1e-9,
    'Two separate 500 mm top flanges',
  );
  assert.ok(
    Math.abs(section.left[3][0] + bottom / 2) < 1e-9 && Math.abs(section.right[0][0] - bottom / 2) < 1e-9,
    'Inclined webs start at both lower-flange edges',
  );
}
const footbridge = validate(
  fitBoxLayout({
    ...c,
    material: 'box',
    width: 5,
    girders: 1,
    laneCount: 0,
    spans: [{ ...c.spans[0], length: 25 }],
    variableDepth: true,
    pierDepth: 2.1,
  }),
);
assert.equal(spacing(footbridge), 0);
assert.equal(roadLayout(footbridge).laneCenters.length, 0);
assert.equal(vehicleFits(footbridge, 12, 0, 2, 0.9), false);
for (const s of [0, 0.5, 24.5, 25]) assert.equal(girderDepth(footbridge, s), 2.1);
assert.equal(girderDepth(footbridge, 12.5), footbridge.depth);
const footbridgeModel = buildBridge(footbridge, makeMaterials(), { batch: false }),
  flanges = footbridgeModel.structure.children.filter(o => o.name?.startsWith('Box top'));
assert.equal(flanges.length, 2);
assert.equal(footbridgeModel.haunches.children.length, 2);
for (let j = 0; j < 2; j++) {
  const flange = new T.Box3().setFromObject(flanges[j]),
    haunch = new T.Box3().setFromObject(footbridgeModel.haunches.children[j]);
  assert.ok(
    Math.abs(flange.min.z - haunch.min.z) < 0.002 && Math.abs(flange.max.z - haunch.max.z) < 0.002,
    '500 mm concrete haunch follows its moving top flange',
  );
}
disposeModel(footbridgeModel);
const concreteSingle = validate({
  ...c,
  material: 'concrete',
  spans: [{ ...c.spans[0], length: 25 }],
  variableDepth: true,
  pierDepth: 2,
});
assert.equal(girderDepth(concreteSingle, 0.5), 2);
assert.equal(girderDepth(concreteSingle, 12.5), concreteSingle.depth);
const concreteModel = buildBridge(concreteSingle, makeMaterials(), { batch: false });
assert.ok(concreteModel.structure.children.some(o => o.name === 'Span 1 girder 1'));
disposeModel(concreteModel);
for (const depth of [1, 1.2, 1.4, 1.6, 1.8]) {
  const p = nebtSection(depth);
  assert.equal(Math.min(...p.map(v => v[1])), -depth);
  assert.equal(Math.max(...p.map(v => v[0])) - 0.0, 0.6);
}
// Skewed ends must land on the same support plane, including both curve directions.
for (const curved of [false, true])
  for (const direction of [-1, 1]) {
    const v = validate({ ...c, curved, direction, skew: 28 });
    for (const s of [0, 25, 50, 75])
      for (const u of [-6, 0, 6]) {
        const centre = frame(v, s),
          p = frame(v, supportStation(v, s, u), u),
          along = (p.x - centre.x) * centre.tx + (p.z - centre.z) * centre.tz,
          across = (p.x - centre.x) * centre.nx + (p.z - centre.z) * centre.nz;
        assert.ok(Math.abs(along - across * Math.tan((28 * Math.PI) / 180)) < 1e-8);
      }
  }
// Generate actual meshes for representative combinations; all coordinates/normals must be finite.
for (const file of [
  'steel_4k.webp',
  'concrete_4k.webp',
  'asphalt_4k.webp',
  'rough_concrete_diff_1k.jpg',
  'rough_concrete_nor_gl_1k.jpg',
  'rough_concrete_rough_1k.jpg',
  'riprap_diff.webp',
  'riprap_nor.webp',
  'riprap_rough.webp',
])
  assert.ok((await readFile('textures/' + file)).length > 100000);
for (const file of ['river-water.webp', 'river-normal.webp'])
  assert.ok((await readFile('textures/' + file)).length > 5000);
const materials = makeMaterials();
let maxTriangles = 0;
for (const curved of [false, true])
  for (const direction of [-1, 1]) {
    const v = validate({ ...c, material: 'steel', curved, direction, skew: 25, rise: 2.2 }),
      model = buildBridge(v, materials, { batch: false }),
      walls = [];
    model.structure.traverse(o => {
      if (o.name.startsWith('Return wall')) walls.push(o);
    });
    assert.equal(walls.length, 4);
    for (const wall of walls) {
      const p = wall.geometry.attributes.position,
        top = [];
      for (let i = 0; i < p.count; i++) if (p.getY(i) > 0) top.push([p.getX(i), p.getY(i), p.getZ(i)]);
      assert.ok(
        Math.max(...top.map(q => q[1])) - Math.min(...top.map(q => q[1])) > 0.1,
        'Return wall top follows the approach grade',
      );
      for (const [x, y, z] of top)
        assert.ok(
          Math.abs(y - (profile(v, alignmentStation(v, x, z)) - 0.17)) < 0.016,
          'Return wall top matches road alignment and 15 mm chamfer',
        );
    }
    const backwalls = model.structure.children.filter(o => o.name === 'Profile-following backwall');
    assert.equal(backwalls.length, 2);
    for (const backwall of backwalls) {
      const p = backwall.geometry.attributes.position,
        top = [];
      for (let i = 0; i < p.count; i++) if (p.getY(i) > v.elevation - 1) top.push([p.getX(i), p.getY(i), p.getZ(i)]);
      assert.ok(top.length > 0);
      for (const [x, y, z] of top)
        assert.ok(
          Math.abs(y - (profile(v, alignmentStation(v, x, z)) - 0.17)) < 0.03,
          'Backwall remains below the approach surface along skew and curve',
        );
    }
    const terrain = model.setting.children.find(o => o.name === 'Terrain surface'),
      edge = new T.Box3().setFromObject(terrain).max.x;
    const asphalt = model.deck.children.filter(o => o.material === materials.asphalt);
    for (const cut of [-edge, edge]) {
      const points = [];
      for (const mesh of asphalt) {
        const p = mesh.geometry.attributes.position;
        for (let i = 0; i < p.count; i++) if (Math.abs(p.getX(i) - cut) < 0.002) points.push(p.getZ(i));
      }
      assert.ok(
        points.length && Math.max(...points) - Math.min(...points) > v.width - 0.1,
        `Full-width approach asphalt reaches ${cut} cut: ${points.length} points, width ${points.length ? Math.max(...points) - Math.min(...points) : 0}`,
      );
    }
    const caps = model.setting.children.filter(o => o.name === 'Grass-covered approach cut');
    assert.equal(caps.length, 2);
    for (let i = 0; i < 2; i++) {
      const bounds = new T.Box3().setFromObject(caps[i]);
      assert.ok(Math.abs((i ? bounds.max.x : bounds.min.x) - (i ? edge : -edge)) < 0.002);
      assert.ok(bounds.max.z - bounds.min.z > v.width + 2, 'Rear grass cap seals both approach slopes');
      assert.ok((i ? 1 : -1) * caps[i].geometry.attributes.normal.getX(0) > 0.9, 'Rear grass cap faces outwards');
    }
    for (const face of approachSurfaces(v, 2 * edge))
      for (const p of face) assert.ok(Math.abs(p[0]) <= edge + 0.002, 'Approach fill stops at the model cut');
    disposeModel(model);
  }
assert.equal(new Set(presets.map(p => p.id)).size, presets.length);
assert.throws(() => makePreset('unknown'), /preset/);
for (const preset of presets) {
  const v = makePreset(preset.id),
    copy = makePreset(preset.id);
  assert.equal(v.movingTraffic, true);
  assert.equal(v.laneWidth, v.trafficMode === 'cyclists' ? 1.8 : 3.5);
  assert.equal(v.abutmentType, 'return');
  assert.ok(preset.label && preset.description);
  assert.deepEqual(v, copy);
  copy.spans[0].length += 1;
  assert.notEqual(
    copy.spans[0].length,
    makePreset(preset.id).spans[0].length,
    'Preset selection must not mutate the catalogue',
  );
  assert.ok(v.spans.every((_, i) => clearance(v, i) > 0.3));
  const model = buildBridge(v, materials);
  if (v.trafficMode === 'cyclists')
    assert.ok(
      model.vehicles.some(o => o.userData.route.type === 'cyclist'),
      'Cycle preset places riders on the deck',
    );
  model.root.traverse(o => {
    if (o.isMesh)
      for (const attribute of Object.values(o.geometry.attributes))
        for (const value of attribute.array)
          assert.ok(Number.isFinite(value), preset.id + ' generates finite geometry');
  });
  disposeModel(model);
}
for (const width of [3, 4.5, 6])
  for (const girders of [2, 3, 4]) {
    const cycle = validate({
      ...makePreset('cycle'),
      material: 'steel',
      variableDepth: false,
      width,
      girders,
      overhang: 0.4,
    });
    assert.ok(
      roadLayout(cycle).leftShoulder >= 0 && spacing(cycle) >= 0.65,
      `${width} m cycle bridge with ${girders} steel girders`,
    );
    if (width === 3 && girders === 4) {
      const model = buildBridge(cycle, materials);
      assert.equal(model.vehicles[0].userData.route.type, 'cyclist');
      disposeModel(model);
    }
  }
const narrowBox = validate(fitBoxLayout({ ...makePreset('cycle'), width: 3, girders: 1 }));
assert.equal(narrowBox.girders, 1);
assert.ok(narrowBox.boxBottomWidth >= 0.3);
assert.throws(() => validate({ ...narrowBox, trafficMode: 'vehicles' }), /width|lane|overhang/);
const railScene = buildBridge(validate({ ...makePreset('urban'), trainStyle: 'bullet' }), materials, { batch: false });
const trains = railScene.vehicles.filter(o => o.userData.route.type === 'train');
assert.equal(trains.length, 1, 'Only one train occupies a railway crossing');
assert.equal(trains[0].children.at(-1).name, 'Kenney train-electric-bullet-a');
assert.equal(trains[0].userData.frontAxis, '+X');
if (trains[0].userData.route.road.width >= 7)
  assert.equal(
    trains[0].userData.route.u,
    trains[0].userData.route.forward ? 1.8 : -1.8,
    'Train uses the right-hand track for its direction',
  );
assert.ok(trains[0].userData.cars >= 4 && trains[0].userData.cars <= 12);
assert.ok(trains[0].userData.route.offscreenGap > 0);
const trainCount = trains[0].userData.cars;
const sameRailScene = buildBridge(validate({ ...makePreset('urban'), trainStyle: 'bullet' }), materials, {
  batch: false,
});
assert.equal(
  sameRailScene.vehicles.find(o => o.userData.route.type === 'train').userData.cars,
  trainCount,
  'Train length remains stable for a given seed',
);
disposeModel(sameRailScene);
disposeModel(railScene);
const sloped = validate({
    ...c,
    material: 'steel',
    frontSlope: true,
    frontSlopeMaterial: 'concrete',
    approachConeMaterial: 'stone',
  }),
  slopedFills = approachSurfaces(sloped);
assert.ok(
  slopedFills.corners.every(corner => corner.intrusion > 0),
  'Front cones project ahead of the abutment',
);
assert.ok(slopedFills.some(face => face.finish === 'stone') && slopedFills.some(face => face.finish === 'grass'));
const slopeModel = buildBridge(sloped, materials, { batch: false });
assert.equal(slopeModel.setting.children.filter(o => o.name === 'Slope in front of abutment').length, 2);
disposeModel(slopeModel);
const concreteFront = validate({ ...sloped, approachConeMaterial: 'grass' });
assert.ok(
  !approachSurfaces(concreteFront).some(face => face.finish === 'concrete'),
  'Concrete in front of abutments does not change the selected grass approach cones',
);
const concreteFrontModel = buildBridge(concreteFront, materials, { batch: false });
assert.ok(
  concreteFrontModel.setting.children.some(
    o => o.name === 'Slope in front of abutment' && o.material === materials.concrete,
  ),
);
disposeModel(concreteFrontModel);
const variableCap = buildBridge(validate({ ...c, bentThickness: 0.8, bentEndThickness: 1.6 }), materials, {
  batch: false,
});
assert.ok(
  variableCap.structure.children
    .filter(o => o.name === 'Pier cap')
    .every(o => Math.abs(new T.Box3().setFromObject(o).max.y - new T.Box3().setFromObject(o).min.y - 1.6) < 0.01),
  'Bent ends use selected cap depth',
);
disposeModel(variableCap);
for (const type of vehicleKinds) {
  const group = new T.Group();
  vehicle(group, materials, c, 35, roadLayout(c).laneCenters[1], type);
  assert.equal(group.userData.vehicles[0].type, type);
  const bounds = new T.Box3().setFromObject(group);
  assert.ok(bounds.max.y - bounds.min.y > 1.3);
  assert.ok(
    vehicleFits(
      c,
      35,
      roadLayout(c).laneCenters[1],
      group.userData.vehicles[0].halfLength,
      group.userData.vehicles[0].halfWidth,
    ),
  );
  group.traverse(o => o.geometry?.dispose());
}
assert.deepEqual(
  ['brown', 'green', 'gray', 'gray16515', 'blue15056', 'blue15065', 'red'].map(k => steelFinishes[k]),
  ['#5F4F4A', '#005F45', '#9B9F9B', '#C7C9C7', '#253273', '#005686', '#AD2328'],
);
assert.equal(steelFinishes.blue15090, undefined);
assert.equal(validate({ ...defaults, steelColor: 'blue15090' }).steelColor, 'blue15065');
assert.equal(materials.steel.map, null);
for (const style of ['diesel', 'bullet', 'city'])
  for (const count of [4, 8, 12]) {
    const train = makeTrain(style, materials.steel, count);
    assert.equal(train.children.length, count);
    assert.equal(train.userData.cars, count);
    assert.ok(train.userData.length > 30);
    assert.ok(train.children.at(-1).name.endsWith('-a'), 'Cab leads in +X direction');
    train.traverse(o => o.geometry?.dispose());
  }
for (const count of [3, 13, 4.5]) assert.throws(() => makeTrain('city', materials.steel, count), /4 to 12/);
assert.equal(buildingStyles.length, 4);
assert.ok(buildingStyles.every(name => kenneySize(name)[1] > 4));
assert.throws(() => validate({ ...c, columnShape: 'triangle' }), /square/);
// Actual box triangles must not contain transverse caps anywhere inside a span.
const boxConfig = validate(
  fitBoxLayout({
    ...c,
    material: 'box',
    width: 30,
    girders: 4,
    continuous: true,
    variableDepth: true,
    profile: 'constant',
  }),
);
const hollow = boxGirder(boxConfig, 0, 75, 0, materials.steel);
assert.equal(hollow.children.length, 5);
for (const mesh of hollow.children) {
  const g = mesh.geometry.toNonIndexed(),
    p = g.attributes.position;
  for (let i = 0; i < p.count; i += 3) {
    const a = new T.Vector3().fromBufferAttribute(p, i),
      b = new T.Vector3().fromBufferAttribute(p, i + 1),
      d = new T.Vector3().fromBufferAttribute(p, i + 2),
      n = b.clone().sub(a).cross(d.clone().sub(a)).normalize();
    if (Math.abs(a.x) < 37.49 && Math.abs(b.x) < 37.49 && Math.abs(d.x) < 37.49)
      assert.ok(Math.abs(n.x) < 0.8, 'No internal staircase risers in box');
  }
  g.dispose();
  mesh.geometry.dispose();
}
// Check every generated slab vertex against the skew-aware depth function.
for (const curved of [false, true])
  for (const direction of [-1, 1]) {
    const v = validate({
        ...c,
        material: 'slab',
        variableDepth: true,
        slabDepth: 0.8,
        pierDepth: 1.8,
        skew: 30,
        curved,
        direction,
      }),
      mesh = slabMesh(v, 0, 75, materials.concrete),
      p = mesh.geometry.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i),
        z = p.getZ(i),
        s = alignmentStation(v, x, z),
        f = frame(v, s),
        u = (x - f.x) * f.nx + (z - f.z) * f.nz,
        top = profile(v, s) - v.asphalt,
        bottom = top - girderDepth(v, s, u);
      assert.ok(
        Math.min(Math.abs(p.getY(i) - top), Math.abs(p.getY(i) - bottom)) < 0.016,
        'Slab top and soffit follow skew, within their 15 mm edge chamfers',
      );
    }
    mesh.geometry.dispose();
  }
for (const laneCount of [1, 2, 3, 4])
  for (const direction of [-1, 1]) {
    const v = validate({
        ...c,
        width: 24,
        laneCount,
        sidewalkSide: 'both',
        sidewalkWidth: 3,
        curved: true,
        radius: 80,
        direction,
      }),
      layout = roadLayout(v);
    layout.laneCenters.forEach((u, i) => {
      assert.equal(laneForward(v, i), laneCount === 1 || i >= Math.floor(laneCount / 2));
      assert.ok(vehicleFits(v, 35, u, 4.1, 1.5));
    });
    assert.equal(vehicleFits(v, 35, layout.roadMax + 1, 2.3, 1.12), false);
  }
const winter = buildBridge(validate({ ...makePreset('river'), terrainMode: 'snow', sceneWidth: 180 }), materials, {
  batch: false,
});
const snowyTerrain = winter.setting.children.find(o => o.name === 'Terrain surface');
assert.equal(snowyTerrain.material, materials.snow);
assert.ok(new T.Box3().setFromObject(snowyTerrain).max.z - new T.Box3().setFromObject(snowyTerrain).min.z >= 179.9);
assert.equal(
  winter.setting.children.some(o => o.name === 'Meadow blades'),
  false,
);
assert.ok(winter.haunches.children.length > 0);
disposeModel(winter);
assert.ok(guardrailSection.length > 8, 'W-beam has folded peaks and a valley');
for (const continuous of [false, true])
  for (const pierType of ['bent', 'wall', 'hammerhead']) {
    const v = validate({
      ...c,
      continuous,
      pierType,
      curved: continuous,
      variableDepth: continuous,
      skew: 18,
      columns: 3,
    });
    const model = buildBridge(v, materials);
    let n = 0,
      meadow = 0;
    model.root.traverse(o => {
      if (!o.isMesh) return;
      for (const a of Object.values(o.geometry.attributes))
        for (const value of a.array) assert.ok(Number.isFinite(value));
      const t = ((o.geometry.index?.count ?? o.geometry.attributes.position.count) / 3) * (o.isInstancedMesh ? o.count : 1);
      if (o.name.startsWith('Meadow') || o.name.startsWith('EZ-Tree')) meadow += t;
      else n += t;
    });
    // Structure and scenery stay under 600k; the meadow has its own per-quality budget (High by default).
    assert.ok(n > 1000 && n < 600000);
    assert.ok(meadow < 2800000, 'High-quality meadow and EZ-Tree canopy stay within their triangle budget');
    assert.equal(model.waters.length, 1);
    maxTriangles = Math.max(maxTriangles, n);
    disposeModel(model);
  }
const animated = buildBridge(makePreset('river'), materials);
const movingCar = animated.vehicles.find(o => !o.userData.route.road);
assert.ok(movingCar, 'Curated bridge has a visible vehicle');
const oldPosition = movingCar.position.clone();
animateTraffic(animated, 0.5);
assert.ok(movingCar.position.distanceTo(oldPosition) > 0.01, 'Default traffic moves');
assert.ok(animated.vehicles.every(o => [o.position.x, o.position.y, o.position.z].every(Number.isFinite)));
disposeModel(animated);
const parked = buildBridge(validate({ ...makePreset('river'), movingTraffic: false }), materials);
const parkedCar = parked.vehicles[0],
  parkedPosition = parkedCar.position.clone();
animateTraffic(parked, 0.5);
assert.ok(parkedCar.position.equals(parkedPosition), 'Turning movement off parks traffic');
disposeModel(parked);
for (const curved of [false, true]) {
  const site = validate({
      ...c,
      material: 'steel',
      curved,
      spans: [
        { length: 25, obstacle: 'road', width: 8, elevation: 0, angle: 45 },
        { length: 25, obstacle: 'rail', width: 7, elevation: 0, angle: 135 },
      ],
    }),
    zones = crossingCorridors(site),
    mid = frame(site, 25);
  assert.ok(intersectsRoad(zones, mid.x, mid.z, 2), 'Road and rail corridor remains free of scenery');
  assert.equal(intersectsRoad(zones, 10000, 10000, 3), false);
}
const mixed = validate({
  ...c,
  material: 'steel',
  environment: 'urban',
  spans: [
    { length: 30, obstacle: 'road', width: 10, elevation: 0, angle: 80 },
    { length: 30, obstacle: 'rail', width: 7, elevation: 0, angle: 90 },
  ],
});
disposeModel(buildBridge(mixed, materials));
const urban = buildBridge({ ...mixed, columnShape: 'square' }, materials, { batch: false }),
  zones = roadFootprints(mixed);
let squares = 0;
urban.root.traverse(o => {
  assert.ok(o.material !== materials.tree && o.material !== materials.treeLight, 'No urban trees');
  if (o.name === 'Square column') squares++;
  if (o.isInstancedMesh && o.name.startsWith('Kenney building'))
    for (let i = 0; i < o.count; i++) {
      const matrix = new T.Matrix4();
      o.getMatrixAt(i, matrix);
      const p = new T.Vector3(),
        scale = new T.Vector3();
      matrix.decompose(p, new T.Quaternion(), scale);
      const size = kenneySize(o.name.slice(7));
      assert.equal(
        intersectsRoad(zones, p.x, p.z, (Math.hypot(size[0], size[2]) * scale.x) / 2),
        false,
        'Full building stays clear of bridge',
      );
    }
});
assert.ok(squares > 0);
assert.ok(
  urban.deck.userData.vehicles.every(v => v.forward === v.u > 0),
  'Right-hand bridge traffic',
);
disposeModel(urban);
const emptyTraffic = buildBridge({ ...mixed, showTraffic: false }, materials);
assert.equal(emptyTraffic.deck.userData.vehicles, undefined);
assert.equal(emptyTraffic.setting.userData.vehicles, undefined);
disposeModel(emptyTraffic);
disposeModel(buildBridge(validate({ ...c, continuous: true, material: 'concrete', skew: -25 }), materials));
disposeModel(buildBridge(slab, materials));
disposeModel(buildBridge(validate({ ...c, environment: 'none' }), materials));
for (const v of [
  validate(
    fitBoxLayout({
      ...c,
      material: 'box',
      girders: 2,
      variableDepth: true,
      pierDepth: 2.4,
      barrierType: 'steel',
      abutmentType: 'wing',
      wingAngle: 45,
      showTraffic: false,
    }),
  ),
  validate({
    ...c,
    material: 'slab',
    variableDepth: true,
    slabDepth: 0.8,
    pierDepth: 1.5,
    sidewalkSide: 'left',
    laneCount: 1,
  }),
]) {
  const model = buildBridge(v, materials);
  model.root.traverse(o => {
    if (!o.isMesh) return;
    for (const a of Object.values(o.geometry.attributes))
      for (const value of a.array) assert.ok(Number.isFinite(value));
  });
  disposeModel(model);
}
// 2026-09-27 round: support bracing by girder depth and spacing (MTQ Table 10.5-1).
{
  const count = (model, name) => {
    let n = 0;
    model.structure.traverse(o => (n += o.name === name ? 1 : 0));
    return n;
  };
  const shallow = buildBridge(validate({ ...c, material: 'steel', depth: 1.4, girders: 5 }), materials, { batch: false });
  assert.ok(count(shallow, 'Support diaphragm') > 0);
  assert.equal(count(shallow, 'K-bracing bottom girder'), 0);
  disposeModel(shallow);
  const deep = buildBridge(validate({ ...c, material: 'steel', depth: 2.3, girders: 5 }), materials, { batch: false });
  assert.ok(count(deep, 'K-bracing bottom girder') > 0, 'Girders deeper than 2.1 m use K-bracing at supports');
  disposeModel(deep);
  // Rectangular columns and outer column spacing.
  const bent = validate({ ...c, pierType: 'bent', columns: 3, columnShape: 'rectangular', columnThickness: 0.8, columnSpread: 8 });
  const bentModel = buildBridge(bent, materials, { batch: false });
  assert.equal(count(bentModel, 'Rectangular column'), 3 * (bent.spans.length - 1));
  disposeModel(bentModel);
  assert.throws(() => validate({ ...bent, columnSpread: 2 }), /overlap/);
  // Barrier types and sidewalk geometry.
  assert.equal(roadLayout(validate({ ...c, leftRailing: '301' })).leftBarrierWidth, 0.435);
  assert.equal(validate({ ...c, leftRailing: 'concrete' }).leftRailing, '201');
  assert.equal(validate({ ...c, sidewalkSide: 'left', laneCount: 1, sidewalkRailing: 'concrete' }).sidewalkRailing, '301');
  assert.equal(validate({ ...makePreset('cycle'), approachBarrier: 'guardrail' }).approachBarrier, 'extend');
  // Night lighting, weather and ballast.
  const lit = buildBridge(validate({ ...c, lighting: 'poles', lightSpacing: 30 }), materials, { batch: false });
  assert.ok(lit.lighting.count >= 4, 'Street lights along the bridge and approaches');
  disposeModel(lit);
  assert.throws(() => validate({ ...c, lighting: 'handrail' }), /20C/);
  const walk = buildBridge(makePreset('cycle'), materials, { batch: false });
  assert.ok(walk.lighting.count > 20, 'Handrail LEDs every 3 m');
  disposeModel(walk);
  assert.throws(() => validate({ ...c, weather: 'hail' }), /weather/);
  // Street lights on one side only; fascia girders with their own finish.
  const oneSide = buildBridge(validate({ ...c, lighting: 'poles', lightSides: 'left' }), materials, { batch: false });
  const bothSides = buildBridge(validate({ ...c, lighting: 'poles', lightSides: 'both' }), materials, { batch: false });
  assert.ok(oneSide.lighting.count > 0 && oneSide.lighting.count < bothSides.lighting.count);
  disposeModel(oneSide);
  disposeModel(bothSides);
  const fascia = buildBridge(validate({ ...c, material: 'steel', steelColor: 'gray', fasciaColor: 'blue15065' }), materials, {
    batch: false,
  });
  const girders = fascia.structure.children.filter(o => /^Span 1 girder/.test(o.name));
  assert.equal(girders[0].material, materials.steelFascia);
  assert.equal(girders[1].material, materials.steel);
  assert.equal(girders.at(-1).material, materials.steelFascia);
  disposeModel(fascia);
  assert.equal(validate({ ...c, fasciaColor: '#12ab34' }).fasciaColor, '#12AB34');
  assert.throws(() => validate({ ...c, fasciaColor: 'pink' }), /fascia/);
  const railway = buildBridge(makePreset('weathered'), materials, { batch: false });
  assert.ok(railway.setting.children.some(o => o.name === 'Railway ballast'));
  disposeModel(railway);
}
// 0.5.5: barriers 311 / 311A, 12 m street lights, reveal, structural systems, terrain shape, seasons, quality.
{
  const { concreteBarrier, edgeWidth, barrierHeight, RAIL_311A } = await import('../deck-profiles.mjs');
  const { psboxLayout, monolithicSupport, archSpanIndex, isConcreteDeck, stations } = await import('../geometry.mjs');
  const { psboxParts, clockwise } = await import('../systems.mjs');
  const { guessTier, effectiveQuality, stepDownAuto, renderSettings } = await import('../quality.mjs');
  const { streetLightGeometry, POLE_HEIGHT, ARM_REACH } = await import('../lighting.mjs');
  const { terrainSampler } = await import('../terrain.mjs');
  const named = (model, pattern) => {
    let n = 0;
    model.root.traverse(o => o.isMesh && pattern.test(o.name) && n++);
    return n;
  };
  const base = makePreset('river');
  // Type 311: 880 mm, 460 mm base, 275 mm top; 311A adds a rail 400 mm above the concrete.
  const b311 = concreteBarrier('311', 0, -1, 0);
  assert.equal(edgeWidth('311'), 0.46);
  assert.equal(barrierHeight('311A'), 0.88);
  assert.ok(Math.abs(Math.max(...b311.map(p => p[1])) - 0.88) < 1e-9);
  assert.ok(Math.abs(Math.max(...b311.filter(p => p[1] > 0.87).map(p => p[0])) - 0.275) < 1e-9, '311 top is 275 mm');
  assert.equal(RAIL_311A.spacing, 2.4);
  const rail = buildBridge(validate({ ...base, leftRailing: '311A', rightRailing: '311' }), materials, { batch: false });
  assert.ok(rail.deck.children.length > 0);
  disposeModel(rail);
  // 12 m street light with a 3 m single davit arm; lights hide with Reveal structure (app) through model.lighting.
  const kit = streetLightGeometry();
  kit.metal.computeBoundingBox();
  assert.ok(Math.abs(kit.metal.boundingBox.max.y - (POLE_HEIGHT + 0.26)) < 0.05, 'pole and finial reach 12 m');
  assert.ok(kit.metal.boundingBox.max.x >= ARM_REACH - 0.06 && kit.metal.boundingBox.min.x > -0.3, 'one arm, 3 m reach');
  const lit = buildBridge(validate({ ...base, lighting: 'poles' }), materials, { batch: false });
  assert.ok(lit.lighting.group.children.some(o => o.isInstancedMesh && o.name === 'Street light poles'));
  disposeModel(lit);
  // Approach pavement reaches the sidewalk face when a Type 301 protects the sidewalk on the bridge only.
  const walkway = validate({ ...base, sidewalkSide: 'right', sidewalkRailing: '301', approachBarrier: 'guardrail' });
  assert.ok(buildBridge(walkway, materials, { batch: false }).deck.children.length > 0);
  // Prestressed box girder: continuous, bearings under the webs, closed clockwise parts, deeper at piers.
  const box = validate({ ...base, material: 'psbox', depth: 2.2, variableDepth: true, pierDepth: 3.6, continuous: false });
  assert.ok(box.continuous && isConcreteDeck(box) && box.girders === 2);
  assert.ok(psboxLayout(box, 3.6).bottom < psboxLayout(box, 2.2).bottom, 'bottom slab narrows where the box deepens');
  for (const part of psboxParts(box, () => 2.2).parts) assert.deepEqual(part, clockwise(part));
  assert.equal(validate({ ...box, width: 18 }).girders, 3, 'two cells above 16 m');
  assert.throws(() => validate({ ...box, depth: 1 }), /1\.2 m/);
  const boxModel = buildBridge(box, materials, { batch: false });
  assert.equal(named(boxModel, /^Box girder part$/), 5);
  assert.equal(named(boxModel, /Box girder diaphragm/), box.spans.length + 1);
  disposeModel(boxModel);
  // Rigid frame: no bearings at all; strutted frame: two inclined legs, bearings only at the abutments.
  const rigid = validate({ ...base, structureSystem: 'frame', material: 'steel' });
  assert.equal(rigid.material, 'psbox');
  assert.ok(stations(rigid).every((_, j) => monolithicSupport(rigid, j)));
  const frameModel = buildBridge(rigid, materials, { batch: false });
  assert.equal(named(frameModel, /Bearing plinth/), 0);
  disposeModel(frameModel);
  assert.throws(() => validate({ ...base, structureSystem: 'strutted', spans: base.spans.slice(0, 2) }), /three spans/);
  const strut = makePreset('strutted'),
    strutModel = buildBridge(strut, materials, { batch: false });
  assert.equal(named(strutModel, /Strutted frame leg/), 2);
  assert.equal(named(strutModel, /Bearing plinth/), 2 * strut.girders, 'bearings at the two abutments only');
  disposeModel(strutModel);
  // Arches: the longest span by default; ribs, hangers and bracing; deck arch columns under the deck.
  const tied = makePreset('tied-arch'),
    tiedModel = buildBridge(tied, materials, { batch: false });
  assert.equal(archSpanIndex(tied), 0);
  assert.equal(named(tiedModel, /^Arch rib$/), 2);
  assert.ok(named(tiedModel, /^Hanger$/) >= 30 && named(tiedModel, /Wind brace/) > 0);
  disposeModel(tiedModel);
  const deckArch = makePreset('deck-arch'),
    archModel = buildBridge(deckArch, materials, { batch: false });
  assert.equal(archSpanIndex(deckArch), 1);
  assert.ok(named(archModel, /Spandrel column|Crown block/) >= 8);
  disposeModel(archModel);
  assert.throws(() => validate({ ...base, structureSystem: 'arch', archRise: 0.5 }), /rise/);
  // Terrain following the road profile: road level beside the approaches, never above the road, valley below.
  const cut = validate({ ...makePreset('tied-arch'), terrainShape: 'profile' }),
    ground = terrainSampler(cut),
    far = frame(cut, -25, 0);
  assert.ok(Math.abs(ground(far.x, 25) - (profile(cut, -25) - 0.25)) < 0.3, 'ground at road level beside the approach');
  const mid = frame(cut, totalLength(cut) / 2, 0);
  assert.ok(ground(mid.x, mid.z) < 1, 'valley floor under the arch');
  assert.throws(() => validate({ ...base, terrainShape: 'hill' }), /terrain/);
  // Seasons and weather; render tiers.
  assert.equal(validate({ ...base, terrainMode: 'fall', weather: 'leaves' }).weather, 'leaves');
  const autumn = buildBridge(validate({ ...base, terrainMode: 'fall' }), materials, { batch: false });
  assert.ok(autumn.setting.children.some(o => o.isInstancedMesh && o.material === materials.leavesFall.oak));
  assert.equal(typeof autumn.setting.userData.treeLod, 'function');
  disposeModel(autumn);
  assert.equal(defaults.renderQuality, 'balanced');
  assert.equal(guessTier('ANGLE (Intel, Intel(R) UHD Graphics 620 Direct3D11)'), 'performance');
  assert.equal(guessTier('ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 Laptop GPU)'), 'high');
  assert.equal(guessTier('ANGLE (Intel, Intel(R) Iris(R) Xe Graphics)'), 'balanced');
  assert.equal(effectiveQuality('high'), 'high');
  assert.ok(renderSettings.balanced.pixelRatio < renderSettings.high.pixelRatio);
  assert.equal(stepDownAuto('performance'), null);
  for (const p of presets) assert.ok(makePreset(p.id).renderQuality === 'balanced', p.id + ' defaults to Balanced');
}
// 0.5.6: several concrete boxes, flowing time, meandering banks in the profile-following terrain.
{
  const { bearingPositions, psboxLayout } = await import('../geometry.mjs');
  const { terrainSampler, coordinates } = await import('../terrain.mjs');
  const twin = validate({ ...makePreset('river'), material: 'psbox', psboxCount: 2, width: 16, depth: 2 });
  assert.equal(psboxLayout(twin).count, 2);
  assert.equal(bearingPositions(twin).length, 4, 'two bearings per box');
  assert.equal(twin.girders, 4);
  const layout = psboxLayout(twin);
  assert.ok(layout.centres[1] - layout.centres[0] - 2 * layout.top >= 1, 'at least 1 m between the boxes');
  const twinModel = buildBridge(twin, materials, { batch: false });
  let parts = 0,
    diaphragms = 0;
  twinModel.root.traverse(o => {
    if (o.name === 'Box girder part') parts++;
    if (o.name === 'Box girder diaphragm') diaphragms++;
  });
  assert.equal(parts, 10);
  assert.equal(diaphragms, 2 * (twin.spans.length + 1));
  disposeModel(twinModel);
  assert.throws(() => validate({ ...twin, psboxCount: 4, width: 12 }), /4\.2 m/);
  assert.throws(() => validate({ ...twin, psboxCount: 5 }), /1 to 4/);
  assert.equal(defaults.timeFlow, true);
  assert.throws(() => validate({ ...twin, timeFlow: 'yes' }), /time flow/);
  for (const p of presets) assert.equal(makePreset(p.id).timeFlow, true);
  // Profile terrain: the shoreline moves along the river (not a straight cut).
  const cut = makePreset('deck-arch'),
    ground = terrainSampler(cut),
    shoreAt = z => {
      for (let x = 0; x < 40; x += 0.1) if (ground(x, z) > 0.05) return x;
      return 40;
    },
    shores = [-60, -30, 0, 30, 60].map(shoreAt);
  assert.ok(Math.max(...shores) - Math.min(...shores) > 1.5, 'meandering bank: ' + shores.map(v => v.toFixed(1)).join(', '));
  void coordinates;
}
for (const m of Object.values(materials)) (m.isMaterial ? [m] : Object.values(m)).forEach(x => x.dispose());
const html = await readFile('index.html', 'utf8');
for (const match of html.matchAll(/(?:src|href)="\.\/([^"]+)"/g)) assert.ok((await readFile('' + match[1])).length);
let bytes = 0,
  gzipBytes = 0;
for (const folder of ['.', 'vendor', 'textures'])
  for (const f of await readdir(folder, { withFileTypes: true })) {
    if (!f.isFile()) continue;
    const data = await readFile(folder + '/' + f.name);
    bytes += data.length;
    gzipBytes += gzipSync(data).length;
  }

// 2026-09-26 review fixes.
{
  const { frontSlopeFit } = await import('../scene.mjs');
  assert.equal(validate({ ...c, haunch: 0.3 }).haunch, 0.05, 'Haunch is fixed at 50 mm');
  assert.equal(
    validate({ ...c, material: 'steel', depth: 4, spans: [{ ...c.spans[0], length: 150 }] }).spans[0].length,
    150,
  );
  assert.throws(() => validate({ ...c, spans: [{ ...c.spans[0], length: 151 }] }), /length/);
  assert.equal(
    validate({ ...c, material: 'steel', curved: true, radius: 30, spans: [{ ...c.spans[0], length: 40 }] }).radius,
    30,
  );
  assert.throws(() => validate({ ...c, material: 'steel', curved: true, radius: 30, width: 40 }), /width|radius/);
  assert.equal(validate({ ...c, name: '  Option A\n' }).name, 'Option A');
  // Box bottom flange drives the layout instead of being rejected.
  const twin = validate(fitBoxLayout({ ...c, material: 'box', girders: 2, width: 13.6 }));
  const wider = validate(fitBoxLayoutFromBottom({ ...twin, boxBottomWidth: twin.boxBottomWidth + 1 }));
  assert.ok(Math.abs(wider.boxBottomWidth - twin.boxBottomWidth - 1) < 1e-9 && wider.boxTopWidth > twin.boxTopWidth);
  assert.throws(() => fitBoxLayoutFromBottom({ ...twin, boxBottomWidth: 9 }), /at most/);
  // Steel details, plinths, diaphragms.
  const steel = validate({
    ...c,
    material: 'steel',
    girders: 4,
    spans: [20, 33, 20].map(length => ({ length, obstacle: 'water', width: 12, elevation: 0, angle: 90 })),
  });
  const model = buildBridge(steel, makeMaterials(), { batch: false });
  const named = n => model.structure.children.filter(o => o.name === n);
  for (const p of named('Bearing plinth')) {
    p.geometry.computeBoundingBox();
    const b = p.geometry.boundingBox;
    assert.ok(Math.abs(b.max.y - b.min.y - 0.15) < 1e-6, '150 mm plinth');
  }
  assert.equal(named('Bearing plinth').length, 4 * (2 + 2 * 2));
  const stiffeners = named('Web stiffener').length,
    frames = [20, 33, 20].reduce((n, L) => n + Math.ceil((L - 0.05) / 8) - 1, 0);
  assert.equal(
    stiffeners,
    frames * 2 * 3 + (2 + 2 * 2) * 4 * 2 * 3,
    'Interior stiffeners at cross-frames, three per face at each bearing line',
  );
  assert.equal(named('Support diaphragm').length, (2 + 2 * 2) * 3);
  disposeModel(model);
  const boxModel = buildBridge(validate(fitBoxLayout({ ...c, material: 'box', girders: 2 })), makeMaterials(), {
    batch: false,
  });
  assert.equal(
    boxModel.structure.children.filter(o => o.name === 'Web stiffener').length,
    0,
    'No stiffeners on box girders',
  );
  assert.ok(boxModel.structure.children.some(o => o.name === 'Support diaphragm'));
  assert.equal(
    boxModel.structure.children.filter(o => o.name === 'Box internal diaphragm').length,
    2 * (2 + 2 * 2),
    'One internal diaphragm per box on every bearing line',
  );
  disposeModel(boxModel);
  // Front slope toe shares the quarter-cone toe line and keeps 2H:1V.
  for (const [obstacle, width] of [
    ['water', 20],
    ['road', 12],
  ])
    for (const variableDepth of [false, true]) {
      const single = validate({
          ...c,
          material: 'steel',
          frontSlope: true,
          variableDepth,
          pierDepth: 2.6,
          spans: [{ length: 36, obstacle, width, elevation: 0, angle: 90 }],
        }),
        fit = frontSlopeFit(single, 0);
      assert.ok(fit.reach > 0.9 && fit.reach <= 36 * 0.4 + 1e-9);
      const corners = approachSurfaces(single).corners.filter(p => p.end === 0);
      assert.equal(corners.length, 2);
    }
}
console.log(
  `Checks passed: validation, round trips, skew intersections, continuous boxes, slab soffits, 2H:1V cones, scenery, square columns, traffic and generated scene matrix. Geometry-matrix max ${maxTriangles.toLocaleString()} triangles. Static files ${(bytes / 1e6).toFixed(2)} MB; gzip estimate ${(gzipBytes / 1e6).toFixed(2)} MB.`,
);
