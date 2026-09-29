import * as T from 'three';

// One sky draw call: analytic day/sunset gradient, Mie sun halo and procedural drifting clouds.
// The same material captures the image-based lighting, so ambient light and reflections follow the hour.
const fragmentShader = `precision highp float;
varying vec3 direction;uniform float time,daylight,golden,clouds,groundMix,sunDisk,fogAmount,overcast,model,night,milkyWay;uniform vec3 sunDirection,fogColor,trueSun,galaxyPole;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.)),f.x),f.y);}
float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<5;i++){v+=a*noise(p);p=mat2(1.6,1.2,-1.2,1.6)*p;a*=.5;}return v;}
vec3 skyColor(vec3 d,vec3 s){
  float y=max(d.y,0.),mu=dot(d,s);
  vec3 zenith=mix(vec3(.018,.035,.085),mix(vec3(.16,.34,.66),vec3(.20,.27,.52),golden),daylight);
  vec3 horizon=mix(vec3(.05,.08,.15),mix(vec3(.62,.76,.88),vec3(.95,.62,.42),golden),daylight);
  vec3 col=mix(horizon,zenith,pow(smoothstep(0.,.62,y),.62));
  // Warm sunset band around the sun azimuth, violet counter-glow opposite.
  float az=max(dot(normalize(d.xz+1e-4),normalize(s.xz+1e-4)),-1.)*.5+.5;
  float band=exp(-y*7.)*golden*daylight;
  col=mix(col,mix(vec3(.62,.46,.62),vec3(1.,.55,.25),pow(az,1.6)),band*.85);
  col+=daylight*vec3(1.,.72,.45)*(pow(max(mu,0.),9.)*(.18+.9*golden)+pow(max(mu,0.),64.)*(.35+.6*golden));
  return col;
}
// Physical sky (0.6.0, optional): Preetham analytic daylight, after Tw1ddle/Sky-Shader and the three.js Sky object
// (MIT; Wallner, Upitis, zz85, Twidale). Turbidity 2.6, Rayleigh 1.4, Mie 0.005 / g 0.8; exposure matched to the
// stylised sky. At night the stylised gradient takes over, as the model has no sky glow below the horizon.
const vec3 totalRayleigh=vec3(5.804542996261093E-6,1.3562911419845635E-5,3.0265902468824876E-5);
const vec3 MieConst=vec3(1.8399918514433978E14,2.7798023919660528E14,4.0790479543861094E14);
vec3 preetham(vec3 d,vec3 s){
  float sunE=1000.*max(0.,1.-exp(-((1.6110731556870734-acos(clamp(s.y,-1.,1.)))/1.5)));
  vec3 betaR=totalRayleigh*1.4,betaM=.434*(.2*2.6*10E-18)*MieConst*.005;
  float zenith=acos(max(0.,d.y)),inverse=1./(cos(zenith)+.15*pow(93.885-zenith*57.29578,-1.253));
  vec3 Fex=exp(-(betaR*8.4E3*inverse+betaM*1.25E3*inverse));
  float cosT=dot(d,s),g=.8;
  vec3 bRT=betaR*(3./(16.*3.14159265))*(1.+pow(cosT*.5+.5,2.));
  vec3 bMT=betaM*(1./(4.*3.14159265))*((1.-g*g)/pow(1.-2.*g*cosT+g*g,1.5));
  vec3 Lin=pow(sunE*((bRT+bMT)/(betaR+betaM))*(1.-Fex),vec3(1.5));
  Lin*=mix(vec3(1.),pow(sunE*((bRT+bMT)/(betaR+betaM))*Fex,vec3(.5)),clamp(pow(1.-s.y,5.),0.,1.));
  vec3 c=(Lin+vec3(.1)*Fex)*.04+vec3(0.,.0003,.00075);
  // Exposure adapts as the sun sets (like a camera), then an exponential shoulder maps HDR to display values.
  float exposure=.42*mix(5.,1.,smoothstep(0.,.4,s.y));
  return 1.-exp(-c*exposure);
}
void main(){
  vec3 d=normalize(direction),s=normalize(sunDirection);
  vec3 col=skyColor(d,s);
  if(model>0.){
    vec3 ts=normalize(trueSun);
    col=mix(col,preetham(vec3(d.x,max(d.y,.001),d.z),ts),model*smoothstep(-.1,.04,ts.y));
  }
  // Milky Way (0.6.0): a faint band along a great circle set by the scenery seed, only on clear nights.
  if(milkyWay>0.&&d.y>0.){
    float b=dot(d,galaxyPole),band=exp(-b*b*28.);
    vec2 p=vec2(atan(d.z,d.x)*3.,b*9.);
    float dust=fbm(p*1.3+7.)*.8+.4*fbm(p*4.1);
    col+=vec3(.55,.6,.78)*band*(.35+.65*dust)*(1.-.6*smoothstep(.45,.75,fbm(p*2.2+3.)))*milkyWay*smoothstep(0.,.25,d.y)*.3;
  }
  float mu=dot(d,s);
  if(clouds>0.&&d.y>-.02){
    vec2 p=d.xz/(d.y+.12)*1.4+vec2(time*.012,time*.004);
    float n=fbm(p),cover=smoothstep(.48-.34*overcast,.72-.3*overcast,n)*smoothstep(-.02,.12,d.y)*clouds;
    float thick=smoothstep(.5,.9,n);
    vec3 lit=mix(vec3(1.,.97,.93),vec3(1.,.66,.45),golden);
    vec3 shade=mix(vec3(.55,.60,.68),vec3(.46,.36,.48),golden);
    vec3 cloudColor=mix(lit,shade,thick*.8)*mix(.2,1.,daylight);
    cloudColor+=vec3(1.,.55,.3)*pow(max(mu,0.),6.)*golden*daylight*(1.-thick)*.9;
    cloudColor=mix(cloudColor,cloudColor*vec3(.62,.66,.72),overcast);
    col=mix(col,cloudColor,cover*.9);
  }
  // Overcast weather greys the whole dome.
  {
    float grey=dot(col,vec3(.3,.5,.2));
    col=mix(col,vec3(grey)*vec3(.92,.96,1.02),overcast*.65);
  }
  float sun=smoothstep(.9994,.9998,mu)*daylight;
  col+=sun*sunDisk*vec3(6.,4.6,3.4);
  col=mix(col,col*vec3(.62,.66,.78),smoothstep(0.,-.55,d.y)*(1.-groundMix));
  // Atmospheric haze: the horizon band fades into the scene fog colour.
  col=mix(col,fogColor,fogAmount*(1.-smoothstep(0.,.28,abs(d.y)))*(1.-groundMix));
  vec3 ground=mix(vec3(.03,.035,.03),mix(vec3(.24,.27,.2),vec3(.3,.22,.16),golden),daylight);
  col=mix(col,ground,groundMix*smoothstep(.02,-.08,d.y));
  gl_FragColor=vec4(col,1.);
}`;

export function makeSky() {
  const uniforms = {
    time: { value: 0 },
    daylight: { value: 1 },
    golden: { value: 0 },
    clouds: { value: 1 },
    groundMix: { value: 0 },
    sunDisk: { value: 1 },
    fogAmount: { value: 0 },
    overcast: { value: 0 },
    model: { value: 0 },
    night: { value: 0 },
    milkyWay: { value: 0 },
    fogColor: { value: new T.Color('#b4c7d4') },
    sunDirection: { value: new T.Vector3(-0.6, 0.45, 0.6) },
    trueSun: { value: new T.Vector3(-0.6, 0.45, 0.6) },
    galaxyPole: { value: new T.Vector3(0.3, 0.5, 0.8).normalize() },
  };
  const vertexShader = `varying vec3 direction; void main(){direction=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
  const material = new T.ShaderMaterial({
    uniforms,
    side: T.BackSide,
    depthWrite: false,
    depthTest: false,
    fog: false,
    vertexShader,
    fragmentShader,
  });
  const mesh = new T.Mesh(new T.SphereGeometry(1, 48, 24), material);
  mesh.onBeforeRender = () => {};
  mesh.scale.setScalar(1000);
  mesh.frustumCulled = false;
  mesh.renderOrder = -1000;
  mesh.name = 'Dynamic cloud sky';
  // Environment capture: same shader, ground hemisphere closed, no cloud animation.
  const envUniforms = {
    ...uniforms,
    groundMix: { value: 1 },
    time: { value: 0 },
    clouds: { value: 0 },
    sunDisk: { value: 0.2 },
    milkyWay: { value: 0 },
  };
  const envMaterial = new T.ShaderMaterial({
    uniforms: envUniforms,
    side: T.BackSide,
    depthWrite: false,
    depthTest: false,
    vertexShader,
    fragmentShader,
  });
  const envScene = new T.Scene(),
    envMesh = new T.Mesh(mesh.geometry, envMaterial);
  envMesh.scale.setScalar(50);
  envScene.add(envMesh);
  let pmrem = null,
    envTarget = null;
  const stars = makeStars(uniforms);
  mesh.add(stars.points);
  return {
    mesh,
    uniforms,
    stars,
    // trueSun: the astronomical sun direction (below the horizon at night), for the physical model and the stars.
    update(daylight, golden, sun, trueSun) {
      uniforms.daylight.value = daylight;
      uniforms.golden.value = golden;
      uniforms.sunDirection.value.copy(sun.position).normalize();
      if (trueSun) uniforms.trueSun.value.copy(trueSun).normalize();
      uniforms.night.value = 1 - T.MathUtils.smoothstep(daylight, 0.02, 0.4);
      uniforms.milkyWay.value = uniforms.night.value * (1 - uniforms.overcast.value);
    },
    setModel(name) {
      uniforms.model.value = name === 'physical' ? 1 : 0;
      envUniforms.model.value = uniforms.model.value;
    },
    setSeed(seed) {
      stars.setSeed(seed);
      // The Milky Way crosses the sky along a seeded great circle, high enough to be seen above the scenery.
      const r = seeded(seed * 7 + 3),
        a = r() * Math.PI * 2;
      uniforms.galaxyPole.value.set(Math.cos(a), 0.05 + 0.2 * r(), Math.sin(a)).normalize();
    },
    setClouds(on) {
      uniforms.clouds.value = on ? 1 : 0;
    },
    animate(time, camera) {
      uniforms.time.value = time;
      stars.uniforms.clock.value = performance.now() / 1000;
      mesh.position.copy(camera.position);
    },
    environment(renderer, cloudy) {
      pmrem ??= new T.PMREMGenerator(renderer);
      envUniforms.clouds.value = cloudy ? 0.6 : 0;
      const next = pmrem.fromScene(envScene, 0.02);
      envTarget?.dispose();
      envTarget = next;
      return next.texture;
    },
    dispose() {
      mesh.geometry.dispose();
      material.dispose();
      envMaterial.dispose();
      envTarget?.dispose();
      pmrem?.dispose();
    },
  };
}

function seeded(seed) {
  let v = (seed >>> 0) || 1;
  return () => ((v = (Math.imul(v, 1664525) + 1013904223) >>> 0) / 4294967296);
}

// Procedural starfield (0.6.0), after CK42BB/procedural-stars-threejs (MIT): about 4 000 stars on the upper sky
// placed from the scenery seed, magnitude-weighted sizes (many faint, few bright), blackbody colours by spectral
// class, gentle twinkle stronger near the horizon, atmospheric extinction, hidden behind the drifting clouds and
// in daylight. One draw call of points, added to the sky dome (also seen in the river reflection).
const blackbody = k => {
  const t = k / 100;
  const r = t <= 66 ? 255 : 329.698727446 * Math.pow(t - 60, -0.1332047592),
    g = t <= 66 ? 99.4708025861 * Math.log(t) - 161.1195681661 : 288.1221695283 * Math.pow(t - 60, -0.0755148492),
    b = t >= 66 ? 255 : t <= 19 ? 0 : 138.5177312231 * Math.log(t - 10) - 305.0447927307;
  return [r, g, b].map(v => Math.min(255, Math.max(0, v)) / 255);
};
const temperature = r =>
  r < 0.003 ? 30000 : r < 0.013 ? 15000 : r < 0.06 ? 8500 : r < 0.15 ? 6700 : r < 0.3 ? 5600 : r < 0.6 ? 4500 : 3400;
function makeStars(sky) {
  const count = 4200,
    geometry = new T.BufferGeometry(),
    position = new Float32Array(count * 3),
    colour = new Float32Array(count * 3),
    data = new Float32Array(count * 2);
  geometry.setAttribute('position', new T.BufferAttribute(position, 3));
  geometry.setAttribute('color', new T.BufferAttribute(colour, 3));
  geometry.setAttribute('star', new T.BufferAttribute(data, 2));
  const uniforms = {
    clock: { value: 0 },
    night: sky.night,
    clouds: sky.clouds,
    overcast: sky.overcast,
    time: sky.time,
    pixel: { value: typeof devicePixelRatio === 'number' ? Math.min(2, devicePixelRatio) : 1 },
  };
  const material = new T.ShaderMaterial({
    uniforms,
    vertexColors: true,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    blending: T.AdditiveBlending,
    fog: false,
    vertexShader: `attribute vec2 star;uniform float clock,night,pixel;varying vec3 vColor;varying float vAlpha;varying vec3 vDir;
void main(){
  vDir=normalize(position);
  float mag=star.x,phase=star.y;
  float horizon=smoothstep(0.,.18,vDir.y);
  float tw=1.+(.18+.35*(1.-horizon))*sin(clock*(1.7+phase*.9)+phase*40.)*sin(clock*(.63+phase)+phase*13.);
  // Visual magnitude −1.2 (brightest) to 6 (faintest) mapped to opacity and size for a screen, not photometry.
  float t=clamp((6.-mag)/7.2,0.,1.);
  vAlpha=night*horizon*clamp((.34+.66*pow(t,1.2))*tw,0.,1.);
  vColor=mix(vec3(1.),color,.75);
  gl_PointSize=pixel*(1.6+3.2*t*t);
  gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);
  gl_Position.z=gl_Position.w*.99999;
}`,
    fragmentShader: `uniform float time,clouds,overcast;varying vec3 vColor;varying float vAlpha;varying vec3 vDir;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.)),f.x),f.y);}
float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<5;i++){v+=a*noise(p);p=mat2(1.6,1.2,-1.2,1.6)*p;a*=.5;}return v;}
void main(){
  vec2 c=gl_PointCoord-.5;float r=length(c);
  float core=smoothstep(.5,.2,r)*.7+smoothstep(.25,0.,r)*.3;
  // Same cloud field as the sky dome: stars disappear behind the clouds.
  vec2 p=vDir.xz/(vDir.y+.12)*1.4+vec2(time*.012,time*.004);
  float cover=clouds>0.?smoothstep(.48-.34*overcast,.72-.3*overcast,fbm(p)):0.;
  float a=vAlpha*core*(1.-cover*.95)*(1.-overcast);
  if(a<.004)discard;
  gl_FragColor=vec4(vColor*a*1.5,a);
}`,
  });
  const points = new T.Points(geometry, material);
  points.name = 'Starfield';
  points.frustumCulled = false;
  points.renderOrder = -999;
  return {
    points,
    uniforms,
    setSeed(seed) {
      const r = seeded(seed * 131 + 17);
      for (let i = 0; i < count; i++) {
        // Upper hemisphere, uniform in solid angle; a few just below the horizon are hidden by extinction.
        const y = Math.pow(r(), 0.85) * 1.02 - 0.02,
          a = r() * Math.PI * 2,
          h = Math.sqrt(Math.max(0, 1 - y * y));
        position.set([Math.cos(a) * h * 0.97, y * 0.97, Math.sin(a) * h * 0.97], i * 3);
        colour.set(blackbody(temperature(r())), i * 3);
        data.set([-1.2 + Math.pow(r(), 0.55) * 7.2, r()], i * 2);
      }
      geometry.attributes.position.needsUpdate = geometry.attributes.color.needsUpdate = true;
      geometry.attributes.star.needsUpdate = true;
    },
  };
}
