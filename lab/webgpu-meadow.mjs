// BridgeSketch 3D · WebGPU lab (0.5.5): meadow blades and rain simulated in TSL compute shaders.
// WebGPURenderer uses WebGPU when the browser offers it, otherwise its WebGL 2 backend (compute through
// transform feedback), and the page reports which one runs.
import * as THREE from 'three/webgpu';
import {
  Fn,
  instancedArray,
  instanceIndex,
  uniform,
  vec3,
  float,
  hash,
  time,
  positionLocal,
  mix,
  color,
  uv,
  sin,
  cos,
  If,
} from 'three/tsl';
import { OrbitControls } from '../vendor/OrbitControls.js';

const $ = id => document.getElementById(id);
// ?webgl forces the WebGL 2 backend for a side-by-side comparison on the same computer.
const renderer = new THREE.WebGPURenderer({ antialias: true, forceWebGL: new URLSearchParams(location.search).has('webgl') });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.setSize(innerWidth, innerHeight);
document.body.append(renderer.domElement);
await renderer.init();
const backend = renderer.backend.isWebGPUBackend ? 'WebGPU' : 'WebGL 2 backend';
renderer.backend.device?.lost.then(info => {
  $('stats').textContent = `WebGPU device lost (${info.reason || 'unknown'}): reload the page, or add ?webgl to the address.`;
});

const scene = new THREE.Scene();
scene.background = new THREE.Color('#a9c3d3');
scene.fog = new THREE.Fog('#a9c3d3', 60, 190);
const camera = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, 0.1, 500);
camera.position.set(22, 9, 28);
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 1, 0);
controls.enableDamping = true;
scene.add(new THREE.HemisphereLight('#e1efff', '#687560', 1.6));
const sun = new THREE.DirectionalLight('#fff3dd', 2.6);
sun.position.set(30, 40, 20);
scene.add(sun);
const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(160, 160).rotateX(-Math.PI / 2),
  new THREE.MeshStandardNodeMaterial({ color: '#6d8a4e', roughness: 1 }),
);
scene.add(ground);
// A concrete deck for scale (12 m wide, 7 m high).
const deck = new THREE.Mesh(new THREE.BoxGeometry(60, 1.6, 12), new THREE.MeshStandardNodeMaterial({ color: '#a5a397' }));
deck.position.y = 7;
scene.add(deck);
for (const x of [-15, 15]) {
  const pier = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 6.2, 16), deck.material);
  pier.position.set(x, 3.1, 0);
  scene.add(pier);
}

const wind = uniform(1);
let meadow = null;
// Blade: one tapered strip of 3 quads (6 triangles), bent in the vertex stage by a per-blade tilt that the
// compute pass integrates (spring towards the gusting wind, with damping).
function buildMeadow(count) {
  if (meadow) {
    scene.remove(meadow.mesh);
    meadow.mesh.geometry.dispose();
    meadow.mesh.material.dispose();
  }
  const root = instancedArray(count, 'vec3'),
    tilt = instancedArray(count, 'vec3'); // x, z bend and y = velocity scale
  const init = Fn(() => {
    const i = float(instanceIndex);
    const r = hash(i).sqrt().mul(75),
      a = hash(i.add(7)).mul(6.2832);
    root.element(instanceIndex).assign(vec3(cos(a).mul(r), 0, sin(a).mul(r)));
    tilt.element(instanceIndex).assign(vec3(0));
  })().compute(count);
  renderer.compute(init);
  const simulate = Fn(() => {
    const p = root.element(instanceIndex),
      t = tilt.element(instanceIndex);
    const gust = sin(p.x.mul(0.08).add(time.mul(1.3))).mul(0.5).add(0.5),
      wave = sin(p.x.mul(0.35).add(p.z.mul(0.2)).add(time.mul(2.1))).mul(0.25);
    const target = vec3(gust.add(wave).mul(0.55).mul(wind), 0, wave.mul(0.4).mul(wind));
    // Critically damped spring on the bend (x, z).
    t.x.addAssign(target.x.sub(t.x).mul(0.08));
    t.z.addAssign(target.z.sub(t.z).mul(0.08));
  })().compute(count);
  const segments = 3,
    position = [],
    uvs = [];
  for (let s = 0; s < segments; s++) {
    const y0 = s / segments,
      y1 = (s + 1) / segments,
      w0 = 0.035 * (1 - y0),
      w1 = 0.035 * (1 - y1);
    position.push(-w0, y0, 0, w0, y0, 0, -w1, y1, 0, w0, y0, 0, w1, y1, 0, -w1, y1, 0);
    uvs.push(0, y0, 1, y0, 0, y1, 1, y0, 1, y1, 0, y1);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(position, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.computeVertexNormals();
  const material = new THREE.MeshStandardNodeMaterial({ side: THREE.DoubleSide, roughness: 0.8 });
  const i = float(instanceIndex),
    h = uv().y,
    height = hash(i.add(3)).mul(0.45).add(0.35),
    turn = hash(i.add(11)).mul(6.2832),
    t = tilt.element(instanceIndex),
    local = vec3(
      positionLocal.x.mul(cos(turn)),
      positionLocal.y.mul(height),
      positionLocal.x.mul(sin(turn)),
    );
  material.positionNode = root
    .element(instanceIndex)
    .add(local)
    .add(vec3(t.x, 0, t.z).mul(h.mul(h)).mul(height));
  material.colorNode = mix(color('#3f5e25'), color('#c3cc74'), h).mul(hash(i.add(19)).mul(0.25).add(0.85));
  const mesh = new THREE.Mesh(geometry, material);
  mesh.count = count;
  mesh.frustumCulled = false;
  scene.add(mesh);
  meadow = { mesh, simulate, count };
}

// Rain: 60 000 drops advected in a compute pass (fall speed, wind drift, wrap in a 90 × 40 × 90 m box).
const drops = 60000,
  rainPosition = instancedArray(drops, 'vec3');
renderer.compute(
  Fn(() => {
    const i = float(instanceIndex);
    rainPosition.element(instanceIndex).assign(vec3(hash(i).sub(0.5).mul(90), hash(i.add(1)).mul(40), hash(i.add(2)).sub(0.5).mul(90)));
  })().compute(drops),
);
const rainStep = Fn(() => {
  const p = rainPosition.element(instanceIndex);
  p.addAssign(vec3(0.03, -0.16, 0.012));
  If(p.y.lessThan(0), () => {
    p.y.addAssign(40);
  });
  If(p.x.greaterThan(45), () => {
    p.x.subAssign(90);
  });
  If(p.z.greaterThan(45), () => {
    p.z.subAssign(90);
  });
})().compute(drops);
const rainMaterial = new THREE.MeshBasicNodeMaterial({ transparent: true, depthWrite: false, color: '#dfe8f0', opacity: 0.45 });
rainMaterial.positionNode = rainPosition.element(instanceIndex).add(positionLocal);
const rain = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.45, 0.012), rainMaterial);
rain.count = drops;
rain.frustumCulled = false;
scene.add(rain);

buildMeadow(Number($('count').value));
$('count').onchange = () => buildMeadow(Number($('count').value));
$('rain').onchange = () => (rain.visible = $('rain').checked);
addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
let frames = 0,
  since = performance.now(),
  cpu = 0;
renderer.setAnimationLoop(() => {
  const start = performance.now();
  controls.update();
  renderer.compute(meadow.simulate);
  if (rain.visible) renderer.compute(rainStep);
  renderer.render(scene, camera);
  cpu = performance.now() - start;
  frames++;
  const now = performance.now();
  if (now - since > 1000) {
    $('stats').innerHTML =
      `<b>${backend}</b><br>${Math.round((frames * 1000) / (now - since))} fps · CPU ${cpu.toFixed(1)} ms<br>` +
      `${meadow.count.toLocaleString()} blades (${((meadow.count * 6) / 1e6).toFixed(2)} M tris) · ${rain.visible ? drops.toLocaleString() + ' drops' : 'no rain'}`;
    frames = 0;
    since = now;
  }
});
window.lab = { backend, renderer };
