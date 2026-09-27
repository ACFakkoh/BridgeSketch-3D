// BridgeSketch 3D · Scene assembly: deck, girders, supports and batching. Re-exports the scene API.
export { vehicleKinds } from './vehicles.mjs';
export { makeMaterials } from './materials.mjs';
export {
  nebtSection,
  steelSection,
  boxSection,
  chamferSection,
  sweep,
  boxGirder,
  slabMesh,
  wallBetween,
} from './sections.mjs';
export { vehicle, animateTraffic } from './traffic.mjs';
export { guardrailSection } from './railings.mjs';
export {
  obstacleTour,
  frontSlopeFit,
  approachSurfaces,
  roadFootprints,
  intersectsRoad,
  crossingCorridors,
} from './terrain.mjs';
import * as T from 'three';
import { mergeGeometries } from './vendor/BufferGeometryUtils.js';
import { vehicleKinds } from './vehicles.mjs';
import {
  frame,
  profile,
  totalLength,
  stations,
  spacing,
  supportStation,
  girderTop,
  girderDepth,
  roadLayout,
  laneForward,
  steelFinishes,
  monolithicSupport,
} from './geometry.mjs';
import { addArch, addPsbox, addStrutLeg } from './systems.mjs';
import { addEnvironment, approachSurfaces, frontSlopeFit, terrainSampler } from './terrain.mjs';
import {
  beam,
  box,
  boxGirder,
  boxSection,
  chamferSection,
  clipMeshAtCut,
  nebtSection,
  profiledSupportWall,
  rect,
  skewPlate,
  slabMesh,
  soffitAt,
  steelSection,
  supportBasis,
  supportPoint,
  sweep,
  wallBetween,
} from './sections.mjs';
import { barrierRail, bridgeRailing, roadsideGuardrail } from './railings.mjs';
import { concreteBarrier, isConcrete, sidewalkProfile, sidewalkTop } from './deck-profiles.mjs';
import { bracingMember, webOffset, webStiffener } from './steel-details.mjs';
import { vehicle } from './traffic.mjs';
import { buildLighting } from './lighting.mjs';

export function buildBridge(c, m, { batch = true } = {}) {
  const preview = approachSurfaces(c),
    L0 = totalLength(c),
    extent = Math.max(L0 + 2 * c.approach + 36, ...preview.flat().map(p => 2 * Math.abs(p[0]) + 8)),
    fills = approachSurfaces(c, extent);
  // Paint is a dielectric satin finish; the albedo is calibrated (× 0.88) so a sunlit web at noon renders close
  // to the selected AMS / hex swatch instead of lighter (the scene's key + sky light sum exceeds 1).
  const paint = (mat, finish) => {
    mat.color.set(steelFinishes[finish] ?? finish).multiplyScalar(finish === 'weathered' ? 1 : 0.88);
    mat.metalness = finish === 'weathered' ? 0.03 : 0;
    mat.roughness = finish === 'weathered' ? 0.92 : 0.55;
    mat.envMapIntensity = 0.8;
    mat.userData.weathered.value = finish === 'weathered' ? 1 : 0;
  };
  paint(m.steel, c.steelColor);
  paint(m.steelFascia, c.fasciaColor === 'same' ? c.steelColor : c.fasciaColor);
  // Edge (fascia) girders can carry their own finish; interior girders keep the main one.
  const steelFor = g =>
    c.fasciaColor !== 'same' && (g === 0 || g === c.girders - 1) ? m.steelFascia : m.steel;
  const waterSpans = c.spans.filter(span => span.obstacle === 'water');
  m.grass.userData.waterLevel.value = waterSpans.length ? Math.min(...waterSpans.map(span => span.elevation)) : -1e4;
  m.grass.userData.lawn.value = c.environment === 'urban' ? 1 : 0;
  m.grass.userData.fall.value = m.soil.userData.fall.value = c.terrainMode === 'fall' ? 1 : 0;
  const root = new T.Group(),
    deck = new T.Group(),
    structure = new T.Group(),
    setting = new T.Group();
  root.name = 'BridgeSketch 3D';
  deck.name = 'Deck and barriers';
  structure.name = 'Girders and supports';
  setting.name = 'Environment';
  root.add(deck, structure, setting);
  const haunches = new T.Group();
  haunches.name = 'Concrete deck haunches';
  structure.add(haunches);
  const ss = stations(c),
    L = totalLength(c),
    half = c.width / 2,
    gspace = spacing(c),
    layout = roadLayout(c),
    leftSide = layout.left,
    rightSide = layout.right,
    roadMin = layout.roadMin,
    roadMax = layout.roadMax;
  const addSweep = (group, a, b, section, mat, height, segments) => {
    const o = sweep(c, a, b, section, mat, height, segments);
    group.add(o);
    return o;
  };
  const wearingStrips = layout.medianWidth
    ? [
        [roadMin, layout.medianMin],
        [layout.medianMax, roadMax],
      ]
    : [[roadMin, roadMax]];
  const addMedian = (a, b) => {
    if (!layout.medianWidth) return;
    // Medians stand on the structural slab; asphalt stops at their faces.
    const base = -c.asphalt,
      section =
        c.medianType === 'barrier'
          ? [
              [-0.3, base],
              [-0.3, 0.12],
              [-0.16, 0.42],
              [-0.12, 1.1],
              [0.12, 1.1],
              [0.16, 0.42],
              [0.3, 0.12],
              [0.3, base],
            ].map(([u, y]) => [u + layout.medianCentre, y])
          : rect(layout.medianMin, layout.medianMax, 0.2, base);
    const median = addSweep(deck, a, b, section, m.concrete);
    median.name = 'Centre median';
  };
  // raised: sidewalk top (m above the road) when the barrier stands on a sidewalk, otherwise null (slab).
  const addBarrier = (a, b, edge, side, type, raised = null, base = -c.asphalt) => {
    if (!isConcrete(type)) {
      bridgeRailing(deck, m, c, a, b, edge, side, type, raised);
      return;
    }
    addSweep(deck, a, b, chamferSection(concreteBarrier(type, edge, side, raised ?? base)), m.edge);
    if (type === '311A') barrierRail(deck, m, c, a, b, edge, side, raised ?? base);
  };
  // Sidewalks: 280 mm above the slab at the road-side face (35 mm in 280 mm batter), rising 1 % outwards.
  // Behind a Type 301 barrier the sidewalk face is the barrier's vertical back.
  const sidewalkFace = side => {
    const road = side < 0 ? roadMin : roadMax;
    return c.sidewalkRailing === '301' ? road + side * layout.innerBarrier : road;
  };
  const addSidewalks = (a, b, base = -c.asphalt) => {
    for (const [side, on] of [
      [-1, leftSide],
      [1, rightSide],
    ])
      if (on)
        addSweep(
          deck,
          a,
          b,
          sidewalkProfile(c.asphalt, side * half, sidewalkFace(side), side, c.sidewalkRailing !== '301', base),
          m.concrete,
        );
  };
  const sidewalkAt = (side, u) => sidewalkTop(c.asphalt, sidewalkFace(side), u);
  // Dashed lane dividers (3 m dash, 6 m gap), continuous edge lines; opposing directions in yellow.
  const addMarkings = (a, b) => {
    const dividers = new Set(layout.dividers.map(d => Number(d.u.toFixed(6))));
    for (const u of layout.laneEdges)
      if (!dividers.has(Number(u.toFixed(6)))) addSweep(deck, a, b, rect(u - 0.05, u + 0.05, 0.011, 0.003), m.white);
    for (const d of layout.dividers)
      for (let s = Math.floor(a / 9) * 9; s < b; s += 9) {
        const s0 = Math.max(a, s),
          s1 = Math.min(b, s + 3);
        if (s1 - s0 > 0.2)
          addSweep(deck, s0, s1, rect(d.u - 0.05, d.u + 0.05, 0.011, 0.003), d.opposing ? m.yellow : m.white, undefined, 2);
      }
  };
  const addBoxGirder = (group, a, b, u, g) => {
    const box = boxGirder(c, a, b, u, steelFor(g));
    for (const mesh of [...box.children]) group.add(mesh);
  };
  c.spans.forEach((span, i) => {
    const a = ss[i] + (c.continuous ? 0 : 0.025),
      b = ss[i + 1] - (c.continuous ? 0 : 0.025);
    if (c.material === 'slab') structure.add(slabMesh(c, a, b, m.concrete));
    else addSweep(deck, a, b, rect(-half, half, -c.asphalt, -c.asphalt - c.deck), m.concrete);
    // 65 mm asphalt covers the roadway only; curbs, barriers, sidewalks and medians sit on the slab.
    for (const [u0, u1] of wearingStrips)
      addSweep(deck, a, b, rect(u0, u1, 0, -c.asphalt), c.laneCount ? m.asphalt : m.concrete);
    addSidewalks(a, b);
    for (const side of [-1, 1])
      addBarrier(
        a,
        b,
        side * half,
        side,
        side < 0 ? c.leftRailing : c.rightRailing,
        (side < 0 && leftSide) || (side > 0 && rightSide) ? sidewalkAt(side, side * half) : null,
      );
    if (c.sidewalkRailing !== 'none')
      for (const [side, on] of [
        [-1, leftSide],
        [1, rightSide],
      ]) {
        if (!on) continue;
        const u = (side < 0 ? roadMin : roadMax) + side * layout.innerBarrier;
        addBarrier(a, b, u, side, c.sidewalkRailing, c.sidewalkRailing === '301' ? null : sidewalkAt(side, u));
      }
    addMedian(a, b);
    addMarkings(a, b);
    for (let g = 0; g < (c.material === 'slab' || c.material === 'psbox' ? 0 : c.girders); g++) {
      const u = -half + c.overhang + g * gspace;
      if (!(c.continuous && (c.material === 'steel' || c.material === 'box'))) {
        if (c.material === 'box') addBoxGirder(structure, a + 0.22, b - 0.22, u, g);
        else {
          const section =
            c.material === 'concrete'
              ? station => nebtSection(girderDepth(c, supportStation(c, station, u), u)).map(([x, y]) => [x + u, y])
              : steelSection(c.depth, c.web).map(([x, y]) => [x + u, y]);
          const top = (_, s, v, u) =>
            girderTop(c, i, s) + (c.material === 'steel' && v < -0.05 ? c.depth - girderDepth(c, s, u) : 0);
          const girder = addSweep(
            structure,
            a + 0.22,
            b - 0.22,
            section,
            c.material === 'concrete' ? m.concrete : steelFor(g),
            top,
            c.material === 'concrete' && !c.variableDepth ? 1 : undefined,
          );
          girder.name = `Span ${i + 1} girder ${g + 1}`;
        }
      }
      // Fill from the straight girder chord to the deck profile.
      const haunchHeight = (_, s, v) => (v > -0.5 ? profile(c, s) - c.asphalt - c.deck : girderTop(c, i, s) + 1);
      for (const side of c.material === 'box' ? [-1, 1] : [0]) {
        const section = station => {
          const flange =
            c.material === 'box'
              ? boxSection(
                  girderDepth(c, supportStation(c, station, u), u),
                  c.boxTopWidth,
                  c.boxBottomWidth,
                  0.05,
                  c.web,
                )[side < 0 ? 'topLeft' : 'topRight']
              : rect(-0.25, 0.25, 0, -0.05);
          return chamferSection(rect(u + flange[0][0], u + flange[1][0], 0, -1));
        };
        addSweep(
          haunches,
          a + (c.continuous ? 0 : 0.22),
          b - (c.continuous ? 0 : 0.22),
          section,
          m.concrete,
          haunchHeight,
        );
      }
    }
    // Cross-frames at no more than 8 m in each span; supports get full diaphragms below.
    const frames = Math.max(1, Math.ceil((b - a) / 8));
    for (let n = 1; n < frames && c.material !== 'slab' && c.material !== 'psbox'; n++) {
      const s = a + ((b - a) * n) / frames;
      for (let g = 0; g < c.girders - 1; g++) {
        const u = -half + c.overhang + g * gspace,
          top = girderTop(c, i, s) - 0.13,
          bot = top - Math.min(girderDepth(c, s, u), girderDepth(c, s, u + gspace)) + 0.26;
        if (c.material === 'steel' || c.material === 'box') {
          const topInset = webOffset(c, i, s, u, top),
            bottomInset = webOffset(c, i, s, u, bot);
          const joints = [
            [u + topInset, top],
            [u + gspace - topInset, top],
            [u + bottomInset, bot],
            [u + gspace - bottomInset, bot],
          ];
          for (const [a, b, offset] of [
            [0, 1, 0],
            [2, 3, 0],
            [0, 3, -0.035],
            [2, 1, 0.035],
          ])
            bracingMember(
              structure,
              m.steel,
              supportPoint(c, s + offset, ...joints[a]),
              supportPoint(c, s + offset, ...joints[b]),
            );
          const f = frame(c, s);
          for (const [k, [v, y]] of joints.entries()) {
            const side = k % 2 === 0 ? 1 : -1,
              vertical = k < 2 ? -1 : 1,
              p = supportPoint(c, s, v, y),
              q = supportPoint(c, s, v + side * 0.32, y),
              r = supportPoint(c, s, v, y + vertical * 0.3),
              positions = [];
            for (const t of [-0.018, 0.018])
              for (const a of [p, q, r]) positions.push(a[0] + f.tx * t, a[1], a[2] + f.tz * t);
            const plate = new T.BufferGeometry();
            plate.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
            plate.setIndex([0, 2, 1, 3, 4, 5, 0, 1, 4, 0, 4, 3, 1, 2, 5, 1, 5, 4, 2, 0, 3, 2, 3, 5]);
            plate.computeVertexNormals();
            const mesh = new T.Mesh(plate, m.steel);
            mesh.castShadow = mesh.receiveShadow = true;
            mesh.name = 'Bracing gusset';
            structure.add(mesh);
            for (const [dv, dy] of [
              [0.07, 0.06],
              [0.19, 0.045],
              [0.05, 0.18],
            ]) {
              const p = supportPoint(c, s, v + side * dv, y + vertical * dy),
                bolt = new T.Mesh(new T.CylinderGeometry(0.023, 0.023, 0.052, 6), m.dark);
              bolt.position.set(...p);
              bolt.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), new T.Vector3(f.tx, 0, f.tz));
              bolt.name = 'Gusset bolt';
              structure.add(bolt);
            }
          }
        } else
          beam(
            structure,
            m.concrete,
            supportPoint(c, s, u, top - c.depth * 0.4),
            supportPoint(c, s, u + gspace, top - c.depth * 0.4),
            0.25,
            c.depth * 0.52,
          );
      }
      // 14 mm connection stiffeners on the interior web faces of plate girders only.
      if (c.material === 'steel')
        for (let g = 0; g < c.girders; g++) {
          const u = -half + c.overhang + g * gspace;
          for (const face of [-1, 1])
            if (face < 0 ? g > 0 : g < c.girders - 1) webStiffener(structure, steelFor(g), c, i, s, u, face);
        }
    }
    if (c.showTraffic)
      layout.laneCenters.forEach((u, lane) => {
        const type =
            c.trafficMode === 'cyclists'
              ? 'cyclist'
              : vehicleKinds[(i * c.laneCount + lane + c.seed) % vehicleKinds.length],
          s = a + (b - a) * (lane % 2 ? 0.65 : 0.35);
        vehicle(deck, m, c, s, u, type, laneForward(c, lane));
      });
  });
  if (c.material === 'psbox') addPsbox(c, m, structure);
  if (c.continuous && (c.material === 'steel' || c.material === 'box'))
    for (let g = 0; g < c.girders; g++) {
      const u = -half + c.overhang + g * gspace;
      if (c.material === 'box') addBoxGirder(structure, 0.25, L - 0.25, u, g);
      else
        addSweep(
          structure,
          0.25,
          L - 0.25,
          steelSection(c.depth, c.web).map(([x, y]) => [x + u, y]),
          steelFor(g),
          (_, s, v, u) => girderTop(c, 0, s) + (v < -0.05 ? c.depth - girderDepth(c, s, u) : 0),
        );
    }
  const earthLevel = Math.min(-0.3, ...c.spans.map(s => s.elevation - 1));
  ss.forEach((s, j) => {
    const earth = earthLevel,
      interior = j > 0 && j < ss.length - 1,
      // Rigid frames and strutted-frame leg joints are monolithic: no bearings, the support meets the soffit.
      mono = monolithicSupport(c, j),
      integral = c.structureSystem === 'frame';
    const lines = interior
      ? c.continuous && ['steel', 'box', 'slab', 'psbox'].includes(c.material)
        ? [0]
        : [-0.55, 0.55]
      : [j === 0 ? 0.5 : -0.5];
    const spanOf = side => Math.max(0, Math.min(c.spans.length - 1, side < 0 ? j - 1 : j));
    // Every bearing: 75 mm pad on a constant 150 mm plinth. The support top follows
    // the plinth undersides across the deck and between bearing lines.
    const padBottom = (u, side) => soffitAt(c, spanOf(side), supportStation(c, s, u) + side, u) - (mono ? 0 : 0.075);
    const seatLine = (u, side) => padBottom(u, side) - (mono ? -0.05 : 0.15);
    const seatAt = (u, offset = 0) => {
      if (lines.length === 1) return seatLine(u, lines[0]);
      const a = seatLine(u, lines[0]),
        b = seatLine(u, lines[1]),
        t = Math.max(0, Math.min(1, (offset - lines[0]) / (lines[1] - lines[0])));
      return a + (b - a) * t;
    };
    const seatMin = Math.min(...Array.from({ length: 9 }, (_, n) => seatAt(-half + 0.15 + ((c.width - 0.3) * n) / 8)));
    if (!interior) {
      const abutment = profiledSupportWall(
        structure,
        m.concrete,
        c,
        s,
        -half + 0.15,
        half - 0.15,
        1.8,
        () => earth,
        u => seatAt(u),
      );
      abutment.name = 'Abutment seat';
      // Wing/return walls use the actual skewed support line and bridge tangent.
      const direction = j === 0 ? -1 : 1;
      const backwall = profiledSupportWall(
        structure,
        m.concrete,
        c,
        s + direction * 0.8,
        -half + 0.15,
        half - 0.15,
        0.4,
        u => seatAt(u),
        (u, offset) => Math.max(seatAt(u) + 0.2, profile(c, supportStation(c, s + direction * 0.8, u) + offset) - 0.17),
      );
      backwall.name = 'Profile-following backwall';
      if (c.frontSlope) {
        // 2H:1V spill slope from the abutment face to the ground, on the same toe line as the quarter cones.
        const fit = frontSlopeFit(c, s),
          reach = fit.reach + 2,
          end = s - direction * reach;
        const slope = sweep(
          c,
          Math.min(s, end),
          Math.max(s, end),
          rect(-half + 0.15, half - 0.15, 0, -1),
          c.frontSlopeMaterial === 'stone' ? m.stone : c.frontSlopeMaterial === 'concrete' ? m.concrete : m.grass,
          (_, station, v, u) =>
            v === 0 ? fit.top - Math.max(0, Math.abs(station - supportStation(c, s, u)) - 0.9) / 2 : earth + 1,
          Math.ceil(reach * 2),
        );
        slope.name = 'Slope in front of abutment';
        setting.add(slope);
      }
      for (const side of [-1, 1]) {
        const u = side * (half - 0.3),
          p0 = supportPoint(c, s, u, 0),
          f = frame(c, supportStation(c, s, u), u),
          a = ((c.abutmentType === 'wing' ? c.wingAngle : 0) * Math.PI) / 180;
        const corner = fills.corners.find(p => p.end === s && p.side === side),
          length = Math.max(6, Math.abs(corner.station - s));
        if (c.abutmentType === 'return') {
          const end = s + direction * length,
            wall = sweep(
              c,
              Math.min(s, end),
              Math.max(s, end),
              chamferSection(rect(u - 0.225, u + 0.225, 0, earth)),
              m.concrete,
              (_, station, v) => (v > earth + 0.1 ? profile(c, station) - 0.17 : 0),
              Math.ceil(length),
            );
          wall.name = `Return wall ${j === 0 ? 'start' : 'end'} ${side < 0 ? 'left' : 'right'}`;
          structure.add(wall);
        } else {
          const vx = direction * f.tx * Math.cos(a) + side * f.nx * Math.sin(a),
            vz = direction * f.tz * Math.cos(a) + side * f.nz * Math.sin(a),
            p1 = [p0[0] + vx * length, 0, p0[2] + vz * length];
          wallBetween(structure, m.concrete, p0, p1, 0.45, earth, Math.max(seatMin + 0.2, profile(c, s) - 0.17));
        }
      }
    } else if (c.structureSystem === 'strutted' && mono) {
      addStrutLeg(c, m, structure, j, earth);
    } else if (c.pierType === 'wall' || (integral && c.pierType === 'hammerhead')) {
      const wall = profiledSupportWall(
        structure,
        m.concrete,
        c,
        s,
        -half + 0.15,
        half - 0.15,
        c.wallThickness,
        () => earth,
        seatAt,
      );
      wall.name = 'Pier wall';
    } else {
      const bent = c.pierType === 'bent',
        capHeight = c.hammerheadThickness,
        capWidth = bent ? c.bentWidth : c.hammerheadThickness;
      const capDepthAt = u => {
        if (integral) return 0;
        if (!bent) return capHeight;
        const edge = (half - 0.15) * 0.65,
          t = Math.max(0, Math.min(1, (Math.abs(u) - edge) / (half - 0.15 - edge)));
        return c.bentThickness + (c.bentEndThickness - c.bentThickness) * t * t * (3 - 2 * t);
      };
      if (!integral) {
        const cap = profiledSupportWall(
          structure,
          m.concrete,
          c,
          s,
          -half + 0.15,
          half - 0.15,
          capWidth,
          (u, offset) => seatAt(u, offset) - capDepthAt(u),
          (u, offset) => seatAt(u, offset),
        );
        cap.name = 'Pier cap';
      }
      const us =
        c.pierType === 'hammerhead' || c.columns === 1
          ? [0]
          : Array.from({ length: c.columns }, (_, n) => {
              // Outer columns at the chosen spacing (auto: 64 % of the deck), the others equally spaced.
              const spread = c.columnSpread > 0 ? c.columnSpread : c.width * 0.64;
              return -spread / 2 + (n * spread) / (c.columns - 1);
            });
      for (const u of us) {
        const f = supportBasis(c, s, u),
          height = Math.max(seatAt(u, -capWidth / 2), seatAt(u, capWidth / 2)) - capDepthAt(u) - earth;
        if (c.pierType === 'hammerhead') {
          // Box local X follows the support line; skew is not added a second time.
          const head = box(
            structure,
            m.concrete,
            f.x,
            earth + height / 2,
            f.z,
            c.hammerheadWidth,
            height,
            c.hammerheadThickness,
            f.angle,
          );
          head.castShadow = true;
          head.receiveShadow = true;
        } else if (c.columnShape !== 'round') {
          // Square, or rectangular: width across the support line, thickness along the road.
          const thickness = c.columnShape === 'rectangular' ? c.columnThickness : c.columnDiameter,
            column = box(structure, m.concrete, f.x, earth + height / 2, f.z, c.columnDiameter, height, thickness, f.angle);
          column.name = c.columnShape === 'rectangular' ? 'Rectangular column' : 'Square column';
        } else {
          const column = new T.Mesh(
            new T.CylinderGeometry(c.columnDiameter / 2, c.columnDiameter / 2, height, 16),
            m.concrete,
          );
          column.position.set(f.x, earth + height / 2, f.z);
          column.castShadow = true;
          column.receiveShadow = true;
          structure.add(column);
        }
        const plinth = c.pierType === 'bent' && c.columnShape === 'rectangular' ? c.columnThickness : c.columnDiameter;
        box(structure, m.concrete, f.x, earth + 0.12, f.z, c.columnDiameter + 0.3, 0.45, plinth + 0.3, f.angle);
      }
    }
    if (c.continuous && c.material === 'concrete' && interior) {
      const i = Math.min(j, c.spans.length - 1),
        d = girderDepth(c, s),
        y = girderTop(c, i, s) - d / 2;
      wallBetween(
        structure,
        m.concrete,
        supportPoint(c, s, -half + c.overhang - 0.6, 0),
        supportPoint(c, s, half - c.overhang + 0.6, 0),
        0.65,
        y - d / 2,
        y + d / 2,
      );
    }
    for (let g = 0; g < (mono ? 0 : c.girders); g++)
      for (const side of lines) {
        const u = -half + c.overhang + g * gspace,
          sg = supportStation(c, s, u) + side,
          f = frame(c, sg, u),
          underside = padBottom(u, side);
        // Bearings are fixed 75 mm elastomeric pads on 150 mm plinths, aligned to the local support.
        const bearing = supportBasis(c, s, u);
        box(structure, m.dark, f.x, underside + 0.0375, f.z, 0.55, 0.075, 0.48, bearing.angle - Math.PI / 2);
        const plinth = box(
          structure,
          m.concrete,
          f.x,
          underside - 0.075,
          f.z,
          0.8,
          0.15,
          0.72,
          bearing.angle - Math.PI / 2,
        );
        plinth.name = 'Bearing plinth';
      }
    if (c.material !== 'slab' && c.material !== 'psbox')
      for (const side of lines) {
        const k = spanOf(side),
          line = s + side;
        // Three 14 mm bearing stiffeners at 150 mm on every plate-girder face; boxes have none.
        if (c.material === 'steel')
          for (let g = 0; g < c.girders; g++) {
            const u = -half + c.overhang + g * gspace;
            for (const face of [-1, 1])
              for (const d of [-0.15, 0, 0.15]) webStiffener(structure, steelFor(g), c, k, line + d, u, face);
          }
        // Internal 25 mm plate diaphragm inside each steel box at every bearing line, web to web.
        if (c.material === 'box')
          for (let g = 0; g < c.girders; g++) {
            const u = -half + c.overhang + g * gspace,
              st = supportStation(c, line, u),
              yt = girderTop(c, k, st) - 0.05,
              yb = girderTop(c, k, st) - girderDepth(c, st, u) + 0.05,
              inside = y => webOffset(c, k, line, u, y) - c.web;
            skewPlate(
              structure,
              m.steel,
              c,
              line,
              [
                [u - inside(yt), yt],
                [u + inside(yt), yt],
                [u + inside(yb), yb],
                [u - inside(yb), yb],
              ],
              0.025,
              'Box internal diaphragm',
            );
          }
        if (c.material === 'concrete' && c.continuous && interior) continue;
        for (let g = 0; g < c.girders - 1; g++) {
          const u = -half + c.overhang + g * gspace,
            v = u + gspace,
            su = supportStation(c, line, u),
            sv = supportStation(c, line, v);
          const top = Math.min(girderTop(c, k, su), girderTop(c, k, sv)),
            soffit = Math.max(girderTop(c, k, su) - girderDepth(c, su, u), girderTop(c, k, sv) - girderDepth(c, sv, v));
          if (c.material === 'concrete') {
            skewPlate(
              structure,
              m.concrete,
              c,
              line,
              [
                [u + 0.1, top - 0.05],
                [v - 0.1, top - 0.05],
                [v - 0.1, soffit + 0.3],
                [u + 0.1, soffit + 0.3],
              ],
              0.45,
              'Concrete end diaphragm',
            );
            continue;
          }
          // Support bracing per MTQ Table 10.5-1: plate diaphragm, or K-bracing when the girder is deep
          // (h > 2.1 m, or 1.8 < h <= 2.1 m with S <= 2.7 m). Both keep 100 mm below the top of the
          // girders and at least 150 mm above their bottom; both cases can occur on one bridge.
          const h = top - soffit,
            kBracing = c.material === 'steel' && (h > 2.1 || (h > 1.8 && gspace <= 2.7)),
            yt = top - 0.1,
            yb = soffit + 0.15,
            at = y => [
              [u + webOffset(c, k, line, u, y), y],
              [v - webOffset(c, k, line, v, y), y],
            ],
            plateGirder = (y0, y1, name) => {
              skewPlate(structure, m.steel, c, line, [...at(y0), ...at(y1).reverse()], 0.016, name);
              for (const y of [y0, y1 + 0.025])
                skewPlate(structure, m.steel, c, line, [...at(y), ...at(y - 0.025).reverse()], 0.3, name + ' flange');
            };
          if (!kBracing) {
            plateGirder(yt, yb, 'Support diaphragm');
            continue;
          }
          // K-bracing: shallow plate girder at the bottom, top strut and two angles meeting at mid-span.
          const beamTop = Math.min(yb + Math.max(0.6, 0.3 * h), yt - 0.6),
            mid = (u + v) / 2,
            left = at(yt)[0][0],
            right = at(yt)[1][0];
          plateGirder(beamTop, yb, 'K-bracing bottom girder');
          bracingMember(structure, m.steel, supportPoint(c, line, left, yt - 0.07), supportPoint(c, line, right, yt - 0.07));
          for (const x of [left, right])
            bracingMember(structure, m.steel, supportPoint(c, line, x, yt - 0.07), supportPoint(c, line, mid + Math.sign(x - mid) * 0.12, beamTop + 0.03));
          skewPlate(
            structure,
            m.steel,
            c,
            line,
            [
              [mid - 0.3, beamTop + 0.3],
              [mid + 0.3, beamTop + 0.3],
              [mid + 0.3, beamTop],
              [mid - 0.3, beamTop],
            ],
            0.016,
            'K-bracing gusset',
          );
        }
      }
  });
  if (c.structureSystem === 'arch') addArch(c, m, structure, earthLevel, terrainSampler(c));
  const sceneHalf = L / 2 + c.approach + 18;
  for (const [a, b] of fills.ranges) {
    const first = deck.children.length;
    // The sidewalk protection continues on the approaches only with the bridge railings; otherwise the
    // pavement runs up to the sidewalk face (no open strip where a Type 301 barrier stood on the deck).
    const innerOnApproach = c.approachBarrier === 'extend' && c.sidewalkRailing !== 'none',
      paveEdge = side => (innerOnApproach ? (side < 0 ? roadMin : roadMax) : sidewalkFace(side));
    addSweep(
      deck,
      a,
      b,
      rect(leftSide ? paveEdge(-1) : -half, rightSide ? paveEdge(1) : half, 0, -0.17),
      c.laneCount ? m.asphalt : m.concrete,
    );
    addSidewalks(a, b);
    if (leftSide) addSweep(deck, a, b, rect(-half, paveEdge(-1), -c.asphalt, -0.17), m.concrete);
    if (rightSide) addSweep(deck, a, b, rect(paveEdge(1), half, -c.asphalt, -0.17), m.concrete);
    if (innerOnApproach)
      for (const [side, on] of [
        [-1, leftSide],
        [1, rightSide],
      ]) {
        if (!on) continue;
        const u = (side < 0 ? roadMin : roadMax) + side * layout.innerBarrier;
        addBarrier(a, b, u, side, c.sidewalkRailing, c.sidewalkRailing === '301' ? null : sidewalkAt(side, u));
      }
    addMarkings(a, b);
    addMedian(a, b);
    // Approach barriers: none, the bridge railings continued (pedestrian bridges: wheel curb + 20C) or a W-beam.
    if (c.approachBarrier === 'guardrail' && c.trafficMode !== 'cyclists')
      for (const u of [-half + 0.05, half - 0.05]) roadsideGuardrail(deck, m, c, a, b, u);
    else if (c.approachBarrier !== 'none')
      for (const side of [-1, 1]) {
        const type = c.trafficMode === 'cyclists' ? '20C' : side < 0 ? c.leftRailing : c.rightRailing,
          onWalk = (side < 0 && leftSide) || (side > 0 && rightSide);
        addBarrier(a, b, side * half, side, type, onWalk ? sidewalkAt(side, side * half) : null);
      }
    const start = a < 0,
      target = start ? -fills.extent / 2 : fills.extent / 2;
    for (const mesh of deck.children.slice(first)) if (mesh.isMesh) clipMeshAtCut(mesh, target, start);
  }
  const waters = addEnvironment(c, m, setting, fills);
  // Water marks on piers standing in the (first) river.
  const stain = m.concrete.userData.stain;
  if (stain) {
    const axis = waters[0]?.userData.axis;
    stain.level.value = axis ? waters[0].userData.level : -1e4;
    if (axis) {
      stain.centre.value.set(axis.x, axis.z);
      stain.along.value.set(axis.dx, axis.dz);
      stain.half.value = axis.half + 2;
    }
  }
  const lighting = c.lighting === 'none' ? null : buildLighting(c, m, fills.ranges);
  if (lighting) {
    root.add(lighting.group);
    lighting.setOn(false);
  }
  const vehicles = [deck, setting].flatMap(group => group.children.find(o => o.name === 'Traffic')?.children ?? []);
  if (batch) {
    for (const vehicle of vehicles) batchMeshes(vehicle);
    for (const group of [deck, haunches, structure, setting]) batchMeshes(group);
  }
  return {
    root,
    deck,
    structure,
    haunches,
    setting,
    waters,
    vehicles,
    lighting,
    traffic: deck.children.find(o => o.name === 'Traffic'),
    config: c,
  };
}

// Merge repeated static surfaces by material while preserving the three visibility layers.
function batchMeshes(group) {
  group.updateMatrixWorld(true);
  const batches = new Map();
  for (const child of [...group.children]) {
    if (!child.isMesh || child.isInstancedMesh || child.material.userData.flowTime || child.material.userData.noBatch) continue;
    const g = child.geometry.index ? child.geometry.toNonIndexed() : child.geometry.clone();
    g.applyMatrix4(child.matrix);
    if (!g.attributes.uv)
      g.setAttribute('uv', new T.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    // Project each triangle in world metres, keeping aggregate/formwork scale consistent.
    if (child.material.userData.textureMetres) {
      const p = g.attributes.position,
        n = g.attributes.normal,
        uv = g.attributes.uv,
        size = child.material.userData.textureMetres;
      for (let i = 0; i < p.count; i += 3) {
        const axis = [Math.abs(n.getX(i)), Math.abs(n.getY(i)), Math.abs(n.getZ(i))];
        const major = axis.indexOf(Math.max(...axis));
        for (let j = i; j < i + 3; j++)
          uv.setXY(j, (major === 0 ? p.getZ(j) : p.getX(j)) / size, (major === 1 ? p.getZ(j) : p.getY(j)) / size);
      }
    }
    if (!batches.has(child.material)) batches.set(child.material, []);
    batches.get(child.material).push(g);
    group.remove(child);
    child.geometry.dispose();
  }
  for (const [mat, geos] of batches) {
    const g = mergeGeometries(geos, false);
    geos.forEach(g => g.dispose());
    if (!g) throw Error('Could not combine bridge geometry.');
    const mesh = new T.Mesh(g, mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
  }
}

// Fit the sun's orthographic shadow frustum to the model, from short spans to 150 m spans.
export function frameShadows(sun, model) {
  if (!sun || !model) return;
  const sphere = new T.Box3().setFromObject(model.root).getBoundingSphere(new T.Sphere()),
    r = Math.max(40, sphere.radius),
    cam = sun.shadow.camera;
  cam.left = -r;
  cam.right = r;
  cam.top = r;
  cam.bottom = -r;
  cam.near = -2 * r;
  cam.far = 3 * r;
  cam.updateProjectionMatrix();
  sun.target.position.copy(sphere.center);
  sun.target.updateMatrixWorld();
  return r;
}

export function disposeModel(model) {
  if (!model) return;
  model.lighting?.dispose();
  const geometries = new Set();
  model.root.traverse(o => {
    // Cached EZ-Tree geometries are shared between rebuilds.
    if (o.geometry && !o.userData.sharedGeometry) geometries.add(o.geometry);
    o.customDepthMaterial?.dispose();
  });
  geometries.forEach(g => g.dispose());
}
