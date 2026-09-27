import * as T from 'three';

// One sky draw call: analytic day/sunset gradient, Mie sun halo and procedural drifting clouds.
// The same material captures the image-based lighting, so ambient light and reflections follow the hour.
const fragmentShader = `precision highp float;
varying vec3 direction;uniform float time,daylight,golden,clouds,groundMix,sunDisk,fogAmount,overcast;uniform vec3 sunDirection,fogColor;
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
void main(){
  vec3 d=normalize(direction),s=normalize(sunDirection);
  vec3 col=skyColor(d,s);
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
    fogColor: { value: new T.Color('#b4c7d4') },
    sunDirection: { value: new T.Vector3(-0.6, 0.45, 0.6) },
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
  return {
    mesh,
    uniforms,
    update(daylight, golden, sun) {
      uniforms.daylight.value = daylight;
      uniforms.golden.value = golden;
      uniforms.sunDirection.value.copy(sun.position).normalize();
    },
    setClouds(on) {
      uniforms.clouds.value = on ? 1 : 0;
    },
    animate(time, camera) {
      uniforms.time.value = time;
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
