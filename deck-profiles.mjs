// BridgeSketch 3D · Deck edge profiles shared by the 3D sweeps and the transverse section.
// Coordinates: u across the deck (m), y above the finished road surface (m); the slab top is at y = -asphalt.

// Québec MTQ concrete barriers, dimensions from the standard sections (mm → m):
// Type 201: 880 high, 410 base, 225 top; Type 301: 1140 high, 435 base, 225 top.
// Traffic face: 145 vertical, then 125 over 180, then 60 (201) or 85 (301) up to the top.
const barrierShapes = {
  201: { base: 0.41, height: 0.88, knee: 0.285 },
  301: { base: 0.435, height: 1.14, knee: 0.31 },
};
export const concreteTypes = ['201', '301'];
export const isConcrete = type => type === 'concrete' || concreteTypes.includes(type);
export const barrierType = type => (type === 'concrete' ? '201' : type);
export const CURB_HEIGHT = 0.28; // wheel curb and sidewalk thickness above the slab
export const CURB_BATTER = 0.035; // road-side face: 35 mm horizontal in 280 mm vertical
export const SIDEWALK_CROSSFALL = 0.01; // 1 % towards the roadway

export function edgeWidth(type) {
  return isConcrete(type) ? barrierShapes[barrierType(type)].base : 0.45;
}

// Closed barrier outline from the outer face (u = edge) towards the road; base is the seat level.
export function concreteBarrier(type, edge, side, base) {
  const { base: w, height, knee } = barrierShapes[barrierType(type)],
    top = base + height;
  const points = [
    [0, base],
    [w, base],
    [w, base + 0.145],
    [knee, base + 0.325],
    [0.225, top],
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
