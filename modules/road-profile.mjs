// BridgeSketch 3D · Road profile summary (0.6.2): chainage and finished-road elevation along the bridge centre
// line, over the approaches and the bridge, with the support axes. Exported as a CSV file (French Excel format:
// semicolon separator, decimal comma).
//
// Chainage 0 m is the west axis of the bridge: the outer face of the west abutment front wall, measured on the
// centre line (the profile grade line, « Center line » in the Deck tab). The elevation is the top of the asphalt
// at that line; by default the west axis is set to 30.000 m and the other values follow the modelled profile.
import { profile, stations, totalLength } from './geometry.mjs';

// The abutment seat is 1.8 m thick, centred on the bearing line: its front face is 0.9 m towards the span.
export const FRONT_FACE = 0.9;

export function profileTable(c, { step = 5, datum = 30 } = {}) {
  if (!(step > 0)) throw Error('Use a chainage step greater than 0 m.');
  const L = totalLength(c),
    west = FRONT_FACE,
    east = L - FRONT_FACE,
    from = -c.approach,
    to = L + c.approach,
    base = profile(c, west),
    marks = new Map();
  const mark = (s, label) => {
    const key = Math.round(s * 1000);
    marks.set(key, marks.has(key) ? `${marks.get(key)} · ${label}` : label);
  };
  mark(from, 'West approach start');
  mark(0, 'West bridge end');
  mark(west, 'West axis (abutment front face)');
  stations(c)
    .slice(1, -1)
    .forEach((s, i) => mark(s, `Pier ${i + 1} axis`));
  mark(east, 'East axis (abutment front face)');
  mark(L, 'East bridge end');
  mark(to, 'East approach end');
  // Regular chainages on the step grid from the west axis, plus every marked point.
  for (let k = Math.ceil((from - west) / step - 1e-9); west + k * step <= to + 1e-9; k++)
    if (!marks.has(Math.round((west + k * step) * 1000))) marks.set(Math.round((west + k * step) * 1000), '');
  return [...marks.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([key, label]) => {
      const s = key / 1000;
      return {
        chainage: s - west,
        elevation: datum + profile(c, s) - base,
        part: s < 0 ? 'West approach' : s > L ? 'East approach' : 'Bridge',
        label,
      };
    });
}

// 12.345 → "12,345" (three decimals, decimal comma, minus sign kept).
export const frenchNumber = v => (Math.abs(v) < 5e-4 ? 0 : v).toFixed(3).replace('.', ',');

export function profileCsv(c, rows, { step, datum }) {
  const quote = v => (/[;"\n]/.test(v) ? `"${String(v).replace(/"/g, '""')}"` : v);
  const lines = [
    `${quote(c.name || 'BridgeSketch 3D')};Road profile along the centre line`,
    `Chainage 0 m;west axis (outer face of the west abutment front wall);reference elevation ${frenchNumber(datum)} m;step ${frenchNumber(step)} m`,
    'Chainage (m);Elevation (m);Part;Point',
    ...rows.map(r => [frenchNumber(r.chainage), frenchNumber(r.elevation), r.part, quote(r.label)].join(';')),
  ];
  // Byte-order mark so Excel reads the accents and units as UTF-8.
  return '﻿' + lines.join('\r\n') + '\r\n';
}
