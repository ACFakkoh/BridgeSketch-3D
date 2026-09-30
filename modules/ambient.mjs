// BridgeSketch 3D · Ambient life (0.6.0): a small flock of birds wheeling over the site by day.
// One instanced draw call of 18 birds × 2 triangles; flight path and wing beats are computed in the vertex shader,
// so the CPU only advances a time uniform. Hidden at night and in rain or snow.
import * as T from 'three';

export function makeAmbient() {
  const count = 18,
    // A bird: two wing triangles meeting on the body line (local +X forward, wings along ±Z).
    geometry = new T.InstancedBufferGeometry();
  geometry.setAttribute(
    'position',
    new T.Float32BufferAttribute([0.25, 0, 0, -0.2, 0, 0, -0.05, 0, 0.55, 0.25, 0, 0, -0.05, 0, -0.55, -0.2, 0, 0], 3),
  );
  const seeds = new Float32Array(count * 4);
  for (let i = 0; i < count; i++)
    seeds.set([Math.random() * Math.PI * 2, 34 + Math.random() * 26, 22 + Math.random() * 10, Math.random()], i * 4);
  geometry.setAttribute('bird', new T.InstancedBufferAttribute(seeds, 4));
  geometry.instanceCount = count;
  const uniforms = {
    time: { value: 0 },
    centre: { value: new T.Vector3() },
    colour: { value: new T.Color('#27313a') },
    opacity: { value: 1 },
  };
  const material = new T.ShaderMaterial({
    uniforms,
    side: T.DoubleSide,
    transparent: true,
    depthWrite: false,
    vertexShader: `attribute vec4 bird;uniform float time;uniform vec3 centre;
void main(){
  float a=bird.x+time*(.11+.05*bird.w),r=bird.y+6.*sin(time*.07+bird.w*6.);
  vec3 p=centre+vec3(cos(a)*r,bird.z+1.5*sin(time*.5+bird.w*9.),sin(a)*r*.7);
  vec3 fwd=normalize(vec3(-sin(a),0.,cos(a)*.7)),side=vec3(-fwd.z,0.,fwd.x);
  vec3 q=position;
  // Wing beat: tips flap, with short glides.
  float beat=sin(time*(9.+3.*bird.w)+bird.w*30.)*(.55+.45*step(.3,fract(time*.15+bird.w)));
  q.y+=abs(q.z)*beat*.8;
  vec3 world=p+fwd*q.x*1.3+side*q.z*1.3+vec3(0.,q.y,0.);
  gl_Position=projectionMatrix*viewMatrix*vec4(world,1.);
}`,
    fragmentShader: `uniform vec3 colour;uniform float opacity;void main(){gl_FragColor=vec4(colour,opacity);}`,
  });
  const mesh = new T.Mesh(geometry, material);
  mesh.name = 'Birds';
  mesh.frustumCulled = false;
  return {
    mesh,
    uniforms,
    // Visible by day in fair weather; the silhouette takes a warm tint at golden hour.
    set(daylight, golden, weather, centre) {
      mesh.visible = daylight > 0.3 && !['rain', 'snow'].includes(weather);
      uniforms.opacity.value = Math.min(1, (daylight - 0.3) * 4);
      uniforms.colour.value.set('#27313a').lerp(new T.Color('#4a3530'), golden * 0.6);
      if (centre) uniforms.centre.value.copy(centre);
    },
    animate(time) {
      uniforms.time.value = time;
    },
  };
}
