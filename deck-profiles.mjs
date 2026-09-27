// BridgeSketch 3D · Deck edge profiles shared by the 3D sweeps and the transverse section.
// Coordinates: u across the deck (m), y above the finished road surface (m); the slab top is at y = -asphalt.

// Québec MTQ concrete barriers, dimensions from the standard sections (mm → m):
// Type 201: 880 high, 410 base, 225 top; Type 301: 1140 high, 435 base, 225 top;
// Type 311: 880 high, 460 base, 275 top (traffic face 125 / 60 mm batters, like the 201).
// Traffic face: 145 vertical, then 125 over 180, then the upper batter up to the top.
// Type 311A: the 311 section with a steel rail on posts at 2400 mm (drawing « 311 A+B »).
const barrierShapes = {
  201: { base: 0.41, height: 0.88, knee: 0.285, top: 0.225 },
  301: { base: 0.435, height: 1.14, knee: 0.31, top: 0.225 },
  311: { base: 0.46, height: 0.88, knee: 0.335, top: 0.275 },
  '311A': { base: 0.46, height: 0.88, knee: 0.335, top: 0.275 },
};
// Steel rail on the 311A: 200 × 150 mm tube, top 400 mm above the concrete, 150 × 250 mm posts at 2.4 m.
export const RAIL_311A = { width: 0.2, depth: 0.15, rise: 0.4, post: 0.15, spacing: 2.4 };
export const concreteTypes = ['201', '301', '311', '311A'];
export const isConcrete = type => type === 'concrete' || concreteTypes.includes(type);
export const barrierType = type => (type === 'concrete' ? '201' : type);
export const CURB_HEIGHT = 0.28; // wheel curb and sidewalk thickness above the slab
export const CURB_BATTER = 0.035; // road-side face: 35 mm horizontal in 280 mm vertical
export const SIDEWALK_CROSSFALL = 0.01; // 1 % towards the roadway

export const barrierHeight = type => barrierShapes[barrierType(type)].height;

// Centre of the barrier top (distance from the outer face): the 311A rail and street-light bases sit there.
export const barrierTopCentre = type => barrierShapes[barrierType(type)].top / 2;

export function edgeWidth(type) {
  return isConcrete(type) ? barrierShapes[barrierType(type)].base : 0.45;
}

// Closed barrier outline from the outer face (u = edge) towards the road; base is the seat level.
export function concreteBarrier(type, edge, side, base) {
  const { base: w, height, knee, top: topWidth } = barrierShapes[barrierType(type)],
    top = base + height;
  const points = [
    [0, base],
    [w, base],
    [w, base + 0.145],
    [knee, base + 0.325],
    [topWidth, top],
    [0, top],
  ].map(([x, y]) => [edge - side * x, y]);
  // Clockwise in (u, y), like every swept section.
  return side < 0 ? points.reverse() : points;
}

// 450 × 280 mm wheel curb under steel railings; road-side face battered 35 mm in 280 mm.
export function wheelCurb(edge, side, asphalt) {
  const points = [
    [edge, -asphalt],
    [edge - side * 0.45, -asphalt],
    [edge - side * (0.45 - CURB_BATTER), -asphalt + CURB_HEIGHT],
    [edge, -asphalt + CURB_HEIGHT],
  ];
  return side < 0 ? points.reverse() : points;
}

// Sidewalk top: 280 mm above the slab at the road-side face, rising 1 % away from the roadway.
export function sidewalkTop(asphalt, face, u, base = -asphalt) {
  return base + CURB_HEIGHT + SIDEWALK_CROSSFALL * Math.abs(u - face);
}

// Sidewalk between the deck edge and the road-side face. A 301 barrier in front gives a vertical face.
export function sidewalkProfile(asphalt, edge, face, side, battered = true, base = -asphalt) {
  const topFace = face + side * (battered ? CURB_BATTER : 0),
    points = [
      [edge, base],
      [face, base],
      [topFace, sidewalkTop(asphalt, face, topFace, base)],
      [edge, sidewalkTop(asphalt, face, edge, base)],
    ];
  // Clockwise in (u, y) on both sides.
  return side < 0 ? points.reverse() : points;
}
