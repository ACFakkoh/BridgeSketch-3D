// BridgeSketch 3D · Vehicles, trains and cyclists: placement and animation.
import * as T from 'three';
import { createVehicleModel, vehicleDimensions } from './vehicles.mjs';
import { crossAt, frame, profile, totalLength, vehicleFits } from './geometry.mjs';

export function vehicle(parent, m, c, s, u, type, forward = true, road) {
  if (!c.showTraffic) return;
  if (type === 'car') type = 'sedan';
  let dimensions = vehicleDimensions(type);
  const fits = d =>
    road ? Math.abs(u) + d.halfWidth <= road.width / 2 - 0.2 : vehicleFits(c, s, u, d.halfLength, d.halfWidth);
  if (!fits(dimensions)) {
    type = c.trafficMode === 'cyclists' && !road ? 'cyclist' : 'sedan';
    dimensions = vehicleDimensions(type);
    if (!fits(dimensions)) return;
  }
  const group = createVehicleModel(type, m['paint' + (Math.abs(Math.floor(s * 3 + u * 7 + c.seed)) % 7)], m);
  const route = {
    s,
    u,
    type,
    forward,
    road: road ?? null,
    halfLength: dimensions.halfLength,
    halfWidth: dimensions.halfWidth,
    speed: type === 'cyclist' ? 17 : 30,
  };
  group.userData.route = route;
  positionVehicle(group, c);
  parent.userData.vehicles ??= [];
  parent.userData.vehicles.push({ ...route, road: !!road });
  let traffic = parent.children.find(o => o.name === 'Traffic');
  if (!traffic) {
    traffic = new T.Group();
    traffic.name = 'Traffic';
    parent.add(traffic);
  }
  traffic.add(group);
  return group;
}

export function positionVehicle(group, c) {
  const { s, u, forward, road, halfLength, halfWidth, verticalOffset = 0 } = group.userData.route;
  const f = road
    ? { x: road.x + road.dx * s + road.nx * u, z: road.z + road.dz * s + road.nz * u, tx: road.dx, tz: road.dz }
    : frame(c, s, u);
  // Deck vehicles ride on the crossfall; crossing-road vehicles on the 2 % crown (not trains on their ballast).
  const lift = road ? (group.userData.route.type === 'train' ? 0 : -0.02 * Math.abs(u)) : crossAt(c, u);
  group.position.set(f.x, (road ? road.elevation : profile(c, s)) + lift + 0.025 + verticalOffset, f.z);
  group.rotation.set(
    0,
    -Math.atan2(f.tz, f.tx) + (forward ? 0 : Math.PI),
    Math.atan(road ? 0 : (profile(c, s + 0.1) - profile(c, s - 0.1)) / 0.2) * (forward ? 1 : -1),
  );
  group.visible = road
    ? group.userData.route.type !== 'train' || Math.abs(s) <= road.halfLength + halfLength
    : vehicleFits(c, s, u, halfLength, halfWidth);
}

export function animateTraffic(model, dt) {
  if (!model.config.movingTraffic || !model.config.showTraffic || !Number.isFinite(dt) || dt <= 0) return;
  const c = model.config;
  for (const group of model.vehicles) {
    const r = group.userData.route,
      reach = r.road
        ? r.road.halfLength + (r.type === 'train' ? r.halfLength : -r.halfLength)
        : c.approach + 17 - r.halfLength;
    const gap = r.offscreenGap ?? 0,
      start = -reach - (r.forward ? 0 : gap),
      end = r.road ? reach + (r.forward ? gap : 0) : totalLength(c) + reach,
      range = end - start;
    if (range <= 0) continue;
    // Equal speeds preserve spacing in each lane; traffic wraps at the scenery edge.
    const step = (dt * (r.speed ?? 30)) / 3.6;
    r.s = start + ((((r.s + (r.forward ? 1 : -1) * step - start) % range) + range) % range);
    positionVehicle(group, c);
    // Cyclists pedal and their wheels turn with the distance travelled.
    if (group.userData.pose) {
      r.travel = (r.travel ?? 0) + step;
      group.userData.pose(r.travel);
    }
  }
}
