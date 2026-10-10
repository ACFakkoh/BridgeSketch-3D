// BridgeSketch 3D · Ambient life (0.6.0, birds revised): small flocks of gull-like birds wheeling over the site by day.
// One instanced draw call (≈42 triangles per bird: tapered body, head and beak, tail, and two-segment wings that bend
// at the wrist). Flock routes, formation offsets, glide/flap cycles, banking into turns and soft shading are all
// computed in the vertex/fragment shaders, so the CPU only advances a time uniform. No textures.
// Hidden at night, in rain or snow, and when the Birds option is off.
import * as T from 'three';

// Shape of one bird in its own frame: +X forward, +Y up, ±Z wings (right wing is +Z). Units are roughly metres at
// scale 1 (the per-bird scale is 0.75–0.95, so a typical wingspan is about 1.5–1.9 m).
// Per-vertex `wing` flag: 0 body (smooth outward normals), 1 articulated wing, 2 tail (flat, double-sided).
function birdGeometry() {
  const pos = [],
    nor = [],
    kind = [];
  // A vertex is [x, y, z, nx, ny, nz]. Triangles are re-wound so the front face is the outside of the body, or the
  // top of a wing/tail; the fragment shader relies on this (it culls body back faces and flips wing normals).
  const tri = (k, a, b, c) => {
    const e1 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]],
      e2 = [c[0] - a[0], c[1] - a[1], c[2] - a[2]],
      g = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]],
      hint = k === 0 ? [a[3] + b[3] + c[3], a[4] + b[4] + c[4], a[5] + b[5] + c[5]] : [0, 1, 0];
    if (g[0] * hint[0] + g[1] * hint[1] + g[2] * hint[2] < 0) [b, c] = [c, b];
    for (const v of [a, b, c]) {
      pos.push(v[0], v[1], v[2]);
      nor.push(v[3], v[4], v[5]);
      kind.push(k);
    }
  };
  // Body cross-sections: [x, top y, bottom y, half width].
  const ring = ([x, t, b, w]) => {
    const m = (t + b) / 2;
    return [
      [x, t, 0, 0, 1, 0],
      [x, m, w, 0, 0, 1],
      [x, b, 0, 0, -1, 0],
      [x, m, -w, 0, 0, -1],
    ];
  };
  const band = (A, B) => {
    for (let i = 0; i < 4; i++) {
      const j = (i + 1) % 4;
      tri(0, A[i], A[j], B[i]);
      tri(0, A[j], B[j], B[i]);
    }
  };
  const cone = (apex, R) => {
    for (let i = 0; i < 4; i++) tri(0, apex, R[i], R[(i + 1) % 4]);
  };
  const beakRing = ring([0.5, 0.035, -0.018, 0.022]),
    headRing = ring([0.38, 0.075, -0.055, 0.055]),
    chestRing = ring([0.1, 0.1, -0.09, 0.088]),
    hipRing = ring([-0.2, 0.06, -0.05, 0.06]);
  cone([0.64, -0.012, 0, 1, 0, 0], beakRing);
  band(beakRing, headRing);
  band(headRing, chestRing);
  band(chestRing, hipRing);
  // Close the rear of the body with a short cone (the apex normal points back).
  cone([-0.36, 0, 0, -1, 0, 0], hipRing);
  // Wings (right side listed; mirrored for the left). Root, wrist (the joint) and tip along the span.
  const W = (x, z) => [x, 0.03, z, 0, 1, 0],
    wl = [
      [W(0.14, 0.07), W(-0.2, 0.07), W(0.08, 0.36)], // inner wing
      [W(-0.2, 0.07), W(-0.2, 0.36), W(0.08, 0.36)],
      [W(0.08, 0.36), W(-0.2, 0.36), W(-0.28, 0.66)], // outer wing
      [W(0.08, 0.36), W(-0.28, 0.66), W(-0.34, 1.0)],
    ];
  for (const [a, b, c] of wl) {
    tri(1, a, b, c);
    const f = v => [v[0], v[1], -v[2], v[3], v[4], v[5]];
    tri(1, f(a), f(b), f(c));
  }
  // Fan tail.
  const Tl = (x, z) => [x, 0, z, 0, 1, 0];
  tri(2, Tl(-0.26, -0.045), Tl(-0.26, 0.045), Tl(-0.5, 0.11));
  tri(2, Tl(-0.26, -0.045), Tl(-0.5, 0.11), Tl(-0.5, -0.11));
  const g = new T.InstancedBufferGeometry();
  g.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new T.Float32BufferAttribute(nor, 3));
  g.setAttribute('wing', new T.Float32BufferAttribute(kind, 1));
  return g;
}

export function makeAmbient() {
  const rnd = (a, b) => a + Math.random() * (b - a),
    // Flocks: size, formation ('v' loose V, 'c' loose cluster) and orbit radius (m). Different radii and heights keep
    // the groups from crossing in lockstep; alternate groups circle in opposite directions.
    flocks = [
      { n: 6, shape: 'v', radius: 36, height: 27 },
      { n: 5, shape: 'v', radius: 58, height: 31 },
      { n: 4, shape: 'c', radius: 46, height: 23 },
      { n: 3, shape: 'c', radius: 52, height: 34 },
      { n: 2, shape: 'c', radius: 29, height: 25 },
      { n: 2, shape: 'c', radius: 41, height: 21 },
    ],
    count = flocks.reduce((s, f) => s + f.n, 0),
    geometry = birdGeometry(),
    path = new Float32Array(count * 4),
    off = new Float32Array(count * 4),
    info = new Float32Array(count * 4);
  let k = 0;
  flocks.forEach((f, fi) => {
    const phase = rnd(0, Math.PI * 2),
      omega = rnd(0.13, 0.2) * (fi % 2 ? -1 : 1),
      flockRand = Math.random(),
      ratio = rnd(0.62, 0.84),
      flapRate = Math.random();
    for (let j = 0; j < f.n; j++, k++) {
      let x = 0,
        y = 0,
        z = 0;
      if (j > 0 && f.shape === 'v') {
        const rank = Math.ceil(j / 2),
          sd = j % 2 ? 1 : -1;
        x = -3.4 * rank + rnd(-0.8, 0.8);
        y = sd * 3 * rank + rnd(-0.8, 0.8);
        z = -0.35 * rank + rnd(-0.4, 0.4);
      } else if (j > 0) {
        x = rnd(-5, 4);
        y = rnd(-4.5, 4.5);
        z = rnd(-1.8, 1.8);
      }
      path.set([phase, f.radius + rnd(-2, 2), f.height, omega], k * 4);
      off.set([x, y, z, Math.random()], k * 4);
      info.set([flockRand, rnd(0.75, 0.95), ratio, flapRate], k * 4);
    }
  });
  geometry.setAttribute('aPath', new T.InstancedBufferAttribute(path, 4));
  geometry.setAttribute('aOff', new T.InstancedBufferAttribute(off, 4));
  geometry.setAttribute('aInfo', new T.InstancedBufferAttribute(info, 4));
  geometry.instanceCount = count;
  const uniforms = T.UniformsUtils.merge([
    T.UniformsLib.fog,
    {
      time: { value: 0 },
      centre: { value: new T.Vector3() },
      // Grey back, pale underside, dark wing tips (linear working colour space via T.Color).
      uTop: { value: new T.Color('#59646d') },
      uUnder: { value: new T.Color('#c9cfd3') },
      uTip: { value: new T.Color('#16191c') },
      uAmb: { value: new T.Color(0.5, 0.54, 0.58) },
      uSun: { value: new T.Color(0.85, 0.8, 0.74) },
      uSunDir: { value: new T.Vector3(0.35, 0.8, 0.45).normalize() },
      opacity: { value: 1 },
    },
  ]);
  const material = new T.ShaderMaterial({
    uniforms,
    fog: true,
    side: T.DoubleSide, // wings and tail are double-sided; the fragment shader discards back faces of the body
    transparent: true,
    depthWrite: true,
    vertexShader: `attribute vec4 aPath;   // x phase, y radius, z height, w signed angular speed (shared by a flock)
attribute vec4 aOff;    // x forward, y right, z up offset in the flock frame, w bird random
attribute vec4 aInfo;   // x flock random, y bird scale, z orbit ellipse ratio, w flap-rate random
attribute float wing;   // 0 body, 1 articulated wing, 2 tail
uniform float time;uniform vec3 centre;
varying vec3 vN;varying float vTip,vKind,vTop;
#include <fog_pars_vertex>
// Flock route: an ellipse around the site whose radius and height drift slowly, off-centre by flock.
vec3 route(float t){
  float a=aPath.x+aPath.w*t,r=aPath.y+6.*sin(t*.05+aInfo.x*6.283);
  vec2 shift=vec2(cos(aInfo.x*40.),sin(aInfo.x*40.))*aPath.y*.22;
  return centre+vec3(shift.x+cos(a)*r,aPath.z+1.8*sin(t*.23+aInfo.x*9.),shift.y+sin(a)*r*aInfo.z);
}
void main(){
  float t=time,rb=aOff.w;
  // Heading and turn rate from the route itself (finite differences); every normalisation is guarded.
  vec3 p0=route(t),p1=route(t+.25),p2=route(t+.7),d1=p1-p0,d2=p2-p1;
  vec2 h1=d1.xz,h2=d2.xz;
  float l1=length(h1),l2=length(h2);
  h1=l1>1e-4?h1/l1:vec2(1.,0.);
  h2=l2>1e-4?h2/l2:h1;
  vec3 hf=vec3(h1.x,0.,h1.y),side=vec3(-hf.z,0.,hf.x);
  float turn=clamp((h1.x*h2.y-h1.y*h2.x)/.35,-.5,.5);        // rad/s, positive = turning right
  float pit=clamp(atan(d1.y/.25,max(l1/.25,1.)),-.5,.5);
  // Position in the flock formation, with a lazy individual drift.
  vec3 o=aOff.xyz+vec3(.9*sin(t*.41+rb*20.),.7*sin(t*.33+rb*13.),.4*sin(t*.5+rb*7.));
  vec3 base=p0+hf*o.x+side*o.y+vec3(0.,o.z,0.);
  // Flap and glide: a flock flaps for roughly half of an ~18 s cycle, then glides with a slight M-shaped wing.
  float cyc=fract(t*.055+aInfo.x*3.1+rb*.04);
  float flapW=smoothstep(0.,.08,cyc)*(1.-smoothstep(.5,.6,cyc));
  float ph=t*(11.+3.*aInfo.w)+rb*6.283;
  float a1=mix(.2+.05*sin(t*.7+rb*9.),.15+.6*sin(ph),flapW);   // inner wing dihedral
  float a2=mix(-.1+.06*sin(t*.9+rb*5.),.95*sin(ph-.9),flapW);  // outer wing lags and bends further
  float heave=flapW*.07*cos(ph)*aInfo.y;
  float roll=clamp(turn*3.2,-.75,.75)+.05*sin(t*.8+rb*11.);   // right wing dips in a right turn
  pit+=.05*flapW*sin(ph+.5);
  vec3 lp=position,ln=normal;
  float isWing=step(.5,wing)*step(wing,1.5);
  if(isWing>.5){
    float sg=lp.z<0.?-1.:1.,s=abs(lp.z);
    float u1=clamp(s-.07,0.,.29),u2=max(s-.36,0.);              // inner and outer segment lengths
    lp.z=sg*(.07+u1*cos(a1)+u2*cos(a2));
    lp.y+=u1*sin(a1)+u2*sin(a2);
    float ang=mix(a1,a2,smoothstep(.34,.52,s));
    ln=vec3(0.,cos(ang),-sg*sin(ang));
  }
  lp*=aInfo.y;
  float cr=cos(roll),sr=sin(roll),cp=cos(pit),sp=sin(pit);
  lp=vec3(lp.x,lp.y*cr-lp.z*sr,lp.y*sr+lp.z*cr);               // roll about the flight direction
  lp=vec3(lp.x*cp-lp.y*sp,lp.x*sp+lp.y*cp,lp.z);               // then pitch
  ln=vec3(ln.x,ln.y*cr-ln.z*sr,ln.y*sr+ln.z*cr);
  ln=vec3(ln.x*cp-ln.y*sp,ln.x*sp+ln.y*cp,ln.z);
  vec3 world=base+vec3(0.,heave,0.)+hf*lp.x+side*lp.z+vec3(0.,lp.y,0.);
  vN=hf*ln.x+side*ln.z+vec3(0.,ln.y,0.);
  vKind=wing>.5?1.:0.;
  vTop=isWing>.5?0.:normal.y;
  vTip=isWing*smoothstep(.62,.95,abs(position.z));
  vec4 mvPosition=viewMatrix*vec4(world,1.);
  gl_Position=projectionMatrix*mvPosition;
#include <fog_vertex>
}`,
    fragmentShader: `uniform vec3 uTop,uUnder,uTip,uAmb,uSun,uSunDir;uniform float opacity;
varying vec3 vN;varying float vTip,vKind,vTop;
#include <fog_pars_fragment>
void main(){
  if(vKind<.5&&!gl_FrontFacing)discard;
  vec3 n=vN/max(length(vN),1e-4);
  float face=gl_FrontFacing?1.:-1.;
  if(vKind>.5)n*=face;                                        // wings and tail: top face up, underside down
  float top=vKind>.5?face:vTop;                               // dark back, pale belly and wing undersides
  vec3 alb=mix(uUnder,uTop,smoothstep(-.45,.45,top));
  alb=mix(alb,uTip,vTip);
  float diff=clamp(dot(n,uSunDir)*.5+.5,0.,1.),sky=n.y*.5+.5;
  vec3 col=alb*(uAmb*(.7+.3*sky)+uSun*diff*diff);
  gl_FragColor=vec4(col,opacity);
#include <fog_fragment>
}`,
  });
  const mesh = new T.Mesh(geometry, material);
  mesh.name = 'Birds';
  mesh.frustumCulled = false;
  const warmSky = new T.Color(1, 0.78, 0.62),
    daySky = new T.Color(0.85, 0.92, 1),
    warmSun = new T.Color(1, 0.6, 0.35),
    daySun = new T.Color(1, 0.97, 0.9),
    tmp = new T.Color();
  return {
    mesh,
    uniforms,
    // Visible by day in fair weather, and only when `enabled` (the Birds option). Light and colour follow the real
    // daylight and golden-hour amounts; `sunDir` (optional, direction from the scene towards the sun) sharpens the
    // shading, otherwise a sun height is estimated from `golden`.
    set(daylight, golden, weather, centre, enabled = true, sunDir = null) {
      mesh.visible = !!enabled && daylight > 0.3 && !['rain', 'snow'].includes(weather);
      uniforms.opacity.value = Math.min(1, Math.max(0, (daylight - 0.3) * 4));
      const day = Math.min(1, Math.max(0, daylight)),
        gold = Math.min(1, Math.max(0, golden || 0));
      uniforms.uAmb.value.copy(daySky.clone().lerp(warmSky, gold)).multiplyScalar(0.2 + 0.4 * day);
      uniforms.uSun.value.copy(tmp.copy(daySun).lerp(warmSun, gold)).multiplyScalar(0.85 * day);
      if (sunDir && sunDir.lengthSq() > 1e-6) uniforms.uSunDir.value.copy(sunDir).normalize();
      else uniforms.uSunDir.value.set(0.4, 0.8 - 0.55 * gold, 0.45).normalize();
      if (centre) uniforms.centre.value.copy(centre);
    },
    animate(time) {
      uniforms.time.value = time;
    },
  };
}
