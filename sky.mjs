import * as T from 'three';

// One sky draw call. The clouds drift in the fragment shader without extra render targets.
export function makeSky(){
  const uniforms={time:{value:0},daylight:{value:1},golden:{value:0},sunDirection:{value:new T.Vector3(-.6,.45,.6)}};
  const material=new T.ShaderMaterial({uniforms,side:T.BackSide,depthWrite:false,depthTest:false,fog:false,
    vertexShader:`varying vec3 direction; void main(){direction=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader:`precision highp float;
      varying vec3 direction; uniform float time,daylight,golden;uniform vec3 sunDirection;
      float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.)),f.x),f.y);}
      void main(){vec3 d=normalize(direction);float h=clamp((d.y+.75)/1.5,0.,1.);
        vec3 zenith=mix(vec3(.035,.07,.14),vec3(.22,.45,.72),daylight);
        vec3 horizon=mix(vec3(.10,.15,.25),vec3(.61,.77,.87),daylight);
        float sunset=golden*exp(-pow((d.y+.08)/.30,2.));
        vec3 col=mix(horizon,zenith,smoothstep(0.,.8,h));
        col=mix(col,vec3(.92,.46,.30),sunset*.67);
        vec2 p=vec2(atan(d.z,d.x)*8.,d.y*8.)+vec2(time*.018,time*.005);
        float n=.60*noise(p)+.30*noise(p*2.07)+.10*noise(p*4.13);
        float cloud=smoothstep(.49,.64,n)*smoothstep(-.75,-.05,d.y);
        vec3 cloudColor=mix(vec3(.16,.20,.30),vec3(.91,.94,.94),daylight);
        cloudColor=mix(cloudColor,vec3(1.,.65,.48),sunset*.85);
        col=mix(col,cloudColor,cloud*.72);
        float sun=pow(max(dot(d,normalize(sunDirection)),0.),440.);
        float glow=pow(max(dot(d,normalize(sunDirection)),0.),18.);
        col+=daylight*(sun*vec3(1.,.78,.52)*.85+glow*vec3(1.,.38,.13)*golden*.20);
        gl_FragColor=vec4(col,1.);
      }`});
  const mesh=new T.Mesh(new T.SphereGeometry(1,32,16),material);mesh.scale.setScalar(1000);mesh.frustumCulled=false;mesh.renderOrder=-1000;mesh.name='Dynamic cloud sky';
  return {mesh,update(daylight,golden,sun){uniforms.daylight.value=daylight;uniforms.golden.value=golden;uniforms.sunDirection.value.copy(sun.position).normalize();},animate(time,camera){uniforms.time.value=time;mesh.position.copy(camera.position);},dispose(){mesh.geometry.dispose();material.dispose();}};
}
