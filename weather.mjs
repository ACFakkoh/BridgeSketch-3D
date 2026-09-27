// BridgeSketch 3D · Weather: light rain or light snow as one GPU-animated draw call around the camera.
// Particles wrap inside a 90 × 40 × 90 m box that follows the camera, so the cost is fixed.
import * as T from 'three';

const BOX = new T.Vector3(90, 40, 90);

export function makeWeather() {
  const uniforms = {
    time: { value: 0 },
    centre: { value: new T.Vector3() },
    box: { value: BOX },
    wind: { value: new T.Vector2(1.2, 0.6) },
    tint: { value: new T.Color('#c8d2dc') },
    opacity: { value: 0.5 },
  };
  // Rain: 6000 short streaks (two vertices each, falling at 9 m/s, 0.45 m long).
  const rainCount = 9000,
    rainSeed = new Float32Array(rainCount * 2 * 3),
    rainEnd = new Float32Array(rainCount * 2);
  for (let i = 0; i < rainCount; i++) {
    const s = [Math.random(), Math.random(), Math.random()];
    rainSeed.set(s, i * 6);
    rainSeed.set(s, i * 6 + 3);
    rainEnd[i * 2 + 1] = 1;
  }
  const rainGeometry = new T.BufferGeometry();
  rainGeometry.setAttribute('position', new T.Float32BufferAttribute(rainSeed, 3));
  rainGeometry.setAttribute('streak', new T.Float32BufferAttribute(rainEnd, 1));
  const common = `uniform float time;uniform vec3 centre,box;uniform vec2 wind;
vec3 wrap(vec3 seed,float fall,float sway){
  vec3 p=seed*box;
  p.y=mod(p.y-time*fall,box.y);
  p.xz+=wind*(box.y-p.y)/fall*.6+sway*vec2(sin(time*.9+seed.x*40.),cos(time*.7+seed.z*40.));
  vec3 origin=centre-box*.5;
  p.xz=origin.xz+mod(p.xz-origin.xz+box.xz*1000.,box.xz);
  p.y+=centre.y-box.y*.35;
  return p;
}`;
  const rain = new T.LineSegments(
    rainGeometry,
    new T.ShaderMaterial({
      uniforms,
      transparent: true,
      depthWrite: false,
      vertexShader: `${common}
attribute float streak;
void main(){
  vec3 p=wrap(position,9.,0.);
  p-=vec3(wind.x,-9.,wind.y)*.05*streak;
  gl_Position=projectionMatrix*viewMatrix*vec4(p,1.);
}`,
      fragmentShader: `uniform vec3 tint;uniform float opacity;void main(){gl_FragColor=vec4(tint,opacity*.55);}`,
    }),
  );
  // Snow: 5000 soft flakes falling at 1.1 m/s with a gentle sway.
  const snowCount = 5000,
    snowSeed = new Float32Array(snowCount * 3);
  for (let i = 0; i < snowSeed.length; i++) snowSeed[i] = Math.random();
  const snowGeometry = new T.BufferGeometry();
  snowGeometry.setAttribute('position', new T.Float32BufferAttribute(snowSeed, 3));
  const snow = new T.Points(
    snowGeometry,
    new T.ShaderMaterial({
      uniforms,
      transparent: true,
      depthWrite: false,
      vertexShader: `${common}
void main(){
  vec3 p=wrap(position,1.1,.8);
  vec4 view=viewMatrix*vec4(p,1.);
  gl_Position=projectionMatrix*view;
  gl_PointSize=clamp(180./-view.z,1.5,9.);
}`,
      fragmentShader: `uniform vec3 tint;uniform float opacity;
void main(){float d=length(gl_PointCoord-.5);if(d>.5)discard;gl_FragColor=vec4(vec3(.96,.97,1.),opacity*smoothstep(.5,.1,d));}`,
    }),
  );
  for (const o of [rain, snow]) {
    o.frustumCulled = false;
    o.visible = false;
    o.renderOrder = 5;
  }
  rain.name = 'Rain';
  snow.name = 'Snow';
  let mode = 'clear';
  return {
    objects: [rain, snow],
    get active() {
      return mode !== 'clear';
    },
    set(next, daylight = 1) {
      mode = next;
      rain.visible = mode === 'rain';
      snow.visible = mode === 'snow';
      uniforms.opacity.value = mode === 'rain' ? 0.55 + 0.4 * daylight : 0.9;
    },
    animate(dt, camera) {
      uniforms.time.value += dt;
      uniforms.centre.value.copy(camera.position);
    },
    dispose() {
      rainGeometry.dispose();
      snowGeometry.dispose();
      rain.material.dispose();
      snow.material.dispose();
    },
  };
}
