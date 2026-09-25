import * as T from 'three';
import {mergeGeometries} from './vendor/BufferGeometryUtils.js';
import {createVehicleModel,vehicleDimensions,vehicleKinds} from './vehicles.mjs';
import {makeTrain,kenneyGeometry,kenneySize,buildingStyles} from './kenney-scene.mjs';
export {vehicleKinds} from './vehicles.mjs';
import {frame,profile,totalLength,stations,spacing,supportStation,girderTop,girderDepth,waterGroups,roadLayout,terrainBase,laneForward,steelFinishes,vehicleFits} from './geometry.mjs';

export function makeMaterials(onLoad=()=>{}) {
  const material=(color,roughness=.85,metalness=0)=>new T.MeshStandardMaterial({color,roughness,metalness});
  const m={concrete:material('#a5a397',.88),edge:material('#aaa99e',.86),asphalt:material('#30363a',.9),steel:material('#64707a',.7,.5),dark:material('#253037',.65,.15),railing:material('#9ba6a6',.62,.7),guardrail:material('#9da6a1',.55,.75),reflector:material('#f0c84c',.4,.1),grass:material('#839873'),grassBlade:material('#4d8052'),earth:material('#8f9581'),stone:material('#ffffff'),sand:material('#b7ad91'),white:material('#ebe6cf'),yellow:material('#eec45f'),tree:material('#446c58'),treeLight:material('#658f67'),trunk:material('#655849'),building:material('#b9c6c9'),roof:material('#728891'),vehicle:material('#c85b4d',.5,.15),vehicleAlt:material('#4c7895',.5,.15),truck:material('#d38a42',.58,.1),glass:material('#9fd6df',.25,.2),wheel:material('#20292d',.9)};
  m.concrete.userData.chamfer=m.edge.userData.chamfer=true;
  ['#23577e','#b93632','#e5e8e6','#34464b','#c9a34e','#42785e','#776a8b'].forEach((color,i)=>m['paint'+i]=material(color,.32,.28));
  if(typeof document!=='undefined'){
    const loader=new T.TextureLoader();
    const load=(file,color=false)=>{const t=loader.load(`./textures/${file}`,onLoad,undefined,()=>console.warn(`Could not load ${file}`));t.wrapS=t.wrapT=T.RepeatWrapping;t.anisotropy=8;if(color)t.colorSpace=T.SRGBColorSpace;return t;};
    for(const [key,file,size,normal] of [['asphalt','asphalt_4k.webp',4.5,'asphalt_01_nor_gl.webp'],['concrete','rough_concrete_diff_1k.jpg',1.2,'rough_concrete_nor_gl_1k.jpg'],['grass','meadow-v2.webp',1.6,'']]){
      m[key].map=load(file,true);m[key].color.set(key==='grass'?'#dce7c9':key==='concrete'?'#f0f0ed':'#687176');m[key].userData.textureMetres=size;
      if(normal){m[key].normalMap=load(normal);m[key].normalScale.setScalar(key==='asphalt'?.32:.32);}
    }
    m.concrete.roughnessMap=load('rough_concrete_rough_1k.jpg');
    m.stone.map=load('rock_ground_diffuse_1k.jpg',true);m.stone.normalMap=load('rock_ground_nor_gl_1k.jpg');m.stone.roughnessMap=load('rock_ground_rough_1k.jpg');m.stone.normalScale.setScalar(.4);m.stone.userData.textureMetres=2;
    m.edge.map=m.concrete.map;m.edge.normalMap=m.concrete.normalMap;m.edge.roughnessMap=m.concrete.roughnessMap;m.edge.normalScale.setScalar(.32);m.edge.color.set('#f9f8f4');m.edge.userData.textureMetres=1.2;
    // Painted steel uses the selected sRGB colour directly; a dark diffuse map hid the finishes.
    for(const [key,file,size] of [['earth','meadow-v2.webp',3],['tree','foliage-v2.webp',0],['treeLight','foliage-v2.webp',0]]){
      const t=load(file,true);
      m[key].map=t;m[key].color.set(key==='treeLight'?'#b8c2a0':'#ffffff');
      if(size){t.wrapS=t.wrapT=T.RepeatWrapping;m[key].userData.textureMetres=size;m[key].bumpMap=t;m[key].bumpScale=.035;}
      else {m[key].alphaTest=.45;m[key].side=T.DoubleSide;m[key].roughness=.9;m[key].emissive.set('#758354');m[key].emissiveIntensity=.18;}
    }
    m.building.map=m.concrete.map.clone();m.building.map.repeat.set(3,3);m.building.color.set('#c6c0b4');
    m.glass.color.set('#546774');m.glass.roughness=.22;m.roof.color.set('#656561');m.truck.color.set('#b49062');
    for(const kit of ['train','suburban','commercial']){
      const atlas=loader.load(`./models/${kit}-colormap.webp`,onLoad);
      atlas.colorSpace=T.SRGBColorSpace;atlas.magFilter=T.NearestFilter;
      m[kit]=new T.MeshStandardMaterial({map:atlas,roughness:kit==='train'?.48:.84,metalness:kit==='train'?.13:0});
    }
  }
  m.grass.roughness=1;m.grass.bumpMap=m.grass.map;m.grass.bumpScale=.055;
  m.grass.onBeforeCompile=shader=>{
    shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 meadowPosition;').replace('#include <begin_vertex>','#include <begin_vertex>\nmeadowPosition=(modelMatrix*vec4(transformed,1.)).xyz;');
    shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>
varying vec3 meadowPosition;
float meadowHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float meadowNoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(meadowHash(i),meadowHash(i+vec2(1,0)),f.x),mix(meadowHash(i+vec2(0,1)),meadowHash(i+vec2(1,1)),f.x),f.y);}`)
      .replace('#include <map_fragment>',`#ifdef USE_MAP
vec2 grassUV=meadowPosition.xz/4.;
vec4 grassA=texture2D(map,grassUV),grassB=texture2D(map,mat2(.8,-.6,.6,.8)*grassUV+vec2(17.3,9.7));
diffuseColor*=mix(grassA,grassB,smoothstep(.25,.75,meadowNoise(meadowPosition.xz*.16)));
#endif`)
      .replace('#include <color_fragment>','#include <color_fragment>\nfloat meadowPatch=meadowNoise(meadowPosition.xz*.055);diffuseColor.rgb*=mix(vec3(.72,.91,.78),vec3(1.10,1.15,1.03),meadowPatch);');
  };
  m.snow=material('#d3dfe0',1);
  m.snow.onBeforeCompile=shader=>{
    shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 snowPosition;').replace('#include <begin_vertex>','#include <begin_vertex>\nsnowPosition=(modelMatrix*vec4(transformed,1.)).xyz;');
    shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 snowPosition;').replace('#include <color_fragment>','#include <color_fragment>\nfloat snowGrain=fract(sin(dot(floor(snowPosition.xz*7.),vec2(127.1,311.7)))*43758.5453);float drift=sin(snowPosition.x*.22)*sin(snowPosition.z*.16);diffuseColor.rgb*=.90+.07*drift+.08*snowGrain;');
  };
  for(const [key,snowKey] of [['tree','treeSnow'],['treeLight','treeLightSnow']]){
    m[snowKey]=m[key].clone();
    m[snowKey].onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\ndiffuseColor.rgb=mix(diffuseColor.rgb,vec3(.66,.77,.72),.55);');};
  }
  // Weathering is sampled in metres; painted finishes keep their selected colour.
  m.steel.userData.weathered={value:0};
  m.steel.onBeforeCompile=shader=>{
    shader.uniforms.weathered=m.steel.userData.weathered;
    shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 steelPosition;').replace('#include <begin_vertex>','#include <begin_vertex>\nsteelPosition=(modelMatrix*vec4(transformed,1.)).xyz;');
    shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>
uniform float weathered;varying vec3 steelPosition;
float steelHash(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}
float steelNoise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(steelHash(i),steelHash(i+vec3(1,0,0)),f.x),mix(steelHash(i+vec3(0,1,0)),steelHash(i+vec3(1,1,0)),f.x),f.y),mix(mix(steelHash(i+vec3(0,0,1)),steelHash(i+vec3(1,0,1)),f.x),mix(steelHash(i+vec3(0,1,1)),steelHash(i+vec3(1,1,1)),f.x),f.y),f.z);}`)
      .replace('#include <color_fragment>','#include <color_fragment>\nfloat patina=steelNoise(steelPosition*vec3(2.,.42,2.));float rustGrain=steelNoise(steelPosition*35.);vec3 weathering=mix(vec3(.55,.40,.31),vec3(1.13,.94,.68),patina)*(.91+.18*rustGrain);diffuseColor.rgb*=mix(vec3(1.),weathering,weathered);');
  };
  m.water=material('#d8eeec',.28,.04);m.water.userData.flowTime={value:0};m.water.userData.sunGlow={value:0};m.foam=new T.LineBasicMaterial({color:'#d8f1df',transparent:true,opacity:.16});
  if(typeof document!=='undefined'){
    const loader=new T.TextureLoader();
    m.water.map=loader.load('./textures/river-water.webp',onLoad);m.water.userData.baseMap=m.water.map;m.water.map.colorSpace=T.SRGBColorSpace;m.water.map.wrapS=m.water.map.wrapT=T.RepeatWrapping;m.water.map.repeat.set(.09,.18);m.water.map.anisotropy=8;
    m.water.normalMap=loader.load('./textures/river-normal.webp',onLoad);m.water.normalMap.wrapS=m.water.normalMap.wrapT=T.RepeatWrapping;m.water.normalMap.repeat.set(.13,.25);m.water.normalScale.set(.27,.27);
  }
  m.water.onBeforeCompile=shader=>{
    shader.uniforms.flowTime=m.water.userData.flowTime;shader.uniforms.sunGlow=m.water.userData.sunGlow;
    shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec2 riverPosition;').replace('#include <begin_vertex>','#include <begin_vertex>\nriverPosition=uv;');
    shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>
uniform float flowTime,sunGlow; varying vec2 riverPosition;
float riverHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float riverNoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(riverHash(i),riverHash(i+vec2(1,0)),f.x),mix(riverHash(i+vec2(0,1)),riverHash(i+vec2(1,1)),f.x),f.y);}`).replace('#include <color_fragment>',`#include <color_fragment>\nvec2 q=vec2(riverPosition.x-flowTime*.85,riverPosition.y);float streak=riverNoise(q*vec2(.35,2.8)+vec2(0.,sin(q.x*.09)*1.2));float glint=smoothstep(.86,.98,streak);diffuseColor.rgb*=.88+.16*riverNoise(q*.08);diffuseColor.rgb+=vec3(.006,.009,.009)*glint+sunGlow*vec3(.012,.005,.002)*glint;`).replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>\nvec2 p=vec2(riverPosition.x-flowTime*.85,riverPosition.y);vec3 rippleNormal=vec3(riverNoise(p*vec2(.4,2.3))-.5,0.0,riverNoise(p*vec2(.3,3.1)+7.)-.5);normal=normalize(normal+mat3(viewMatrix)*rippleNormal*.065);`);
  };
  return m;
}

// NEBT nominal metric geometry: top 1200, bottom 810, web 180 mm.
// ponytail: small fillets are sampled curves for viewing; shop-detail accuracy needs the owner's exact drawing revision.
export function nebtSection(h) {
  const shape=new T.Shape();
  shape.moveTo(-.6,0);shape.lineTo(.6,0);shape.lineTo(.6,-.065);
  shape.quadraticCurveTo(.6,-.085,.58,-.085);shape.lineTo(.29,-.135);
  shape.quadraticCurveTo(.09,-.155,.09,-.335);shape.lineTo(.09,-h+.42);
  shape.quadraticCurveTo(.09,-h+.26,.23,-h+.22);shape.lineTo(.34,-h+.185);
  shape.quadraticCurveTo(.405,-h+.16,.405,-h+.10);shape.lineTo(.405,-h+.02);shape.lineTo(.385,-h);
  shape.lineTo(-.385,-h);shape.lineTo(-.405,-h+.02);shape.lineTo(-.405,-h+.10);
  shape.quadraticCurveTo(-.405,-h+.16,-.34,-h+.185);shape.lineTo(-.23,-h+.22);
  shape.quadraticCurveTo(-.09,-h+.26,-.09,-h+.42);shape.lineTo(-.09,-.335);
  shape.quadraticCurveTo(-.09,-.155,-.29,-.135);shape.lineTo(-.58,-.085);
  shape.quadraticCurveTo(-.6,-.085,-.6,-.065);shape.closePath();
  const p=shape.getPoints(5);p.pop();return p.map(v=>[v.x,v.y]);
}
export function steelSection(h,w) {
  return [[-.25,0],[.25,0],[.25,-.05],[w/2,-.05],[w/2,-h+.05],[.25,-h+.05],[.25,-h],[-.25,-h],[-.25,-h+.05],[-w/2,-h+.05],[-w/2,-.05],[-.25,-.05]];
}
export function boxSection(h,top,bottom=top-h/2,plate=.05,web=.014) {
  const bottomWeb=bottom/2,topWeb=bottomWeb+(h-2*plate)/4;
  if(topWeb+.25>top/2+.001||bottomWeb<=web+.05)return null;
  return {topLeft:rect(-topWeb-.25,-topWeb+.25,0,-plate),topRight:rect(topWeb-.25,topWeb+.25,0,-plate),bottom:[[-bottom/2,-h+plate],[bottom/2,-h+plate],[bottom/2,-h],[-bottom/2,-h]],left:[[-topWeb,-plate],[-topWeb+web,-plate],[-bottomWeb+web,-h+plate],[-bottomWeb,-h+plate]],right:[[bottomWeb,-h+plate],[bottomWeb-web,-h+plate],[topWeb-web,-plate],[topWeb,-plate]]};
}
const rect=(a,b,top,bottom)=>[[a,top],[b,top],[b,bottom],[a,bottom]];

// A section swept along the actual alignment. Every edge meets the support skew plane.
function chamferSection(points){return points.flatMap((p,i)=>{
    const prev=points[(i+points.length-1)%points.length],next=points[(i+1)%points.length],l0=Math.hypot(p[0]-prev[0],p[1]-prev[1])||1,l1=Math.hypot(p[0]-next[0],p[1]-next[1])||1,d0=Math.min(.015,l0*.45),d1=Math.min(.015,l1*.45);
    return [[p[0]+(prev[0]-p[0])*d0/l0,p[1]+(prev[1]-p[1])*d0/l0],[p[0]+(next[0]-p[0])*d1/l1,p[1]+(next[1]-p[1])*d1/l1]];
  });}
export function sweep(c,a,b,section,mat,height=profile,segments) {
  const rawSection=typeof section==='function'?section:()=>section;
  const sectionAt=mat.userData.chamfer&&height===profile?station=>chamferSection(rawSection(station)):rawSection;
  const initial=sectionAt(a),n=initial.length,steps=segments??Math.max(1,Math.ceil((b-a)/(c.variableDepth?.4:c.curved?1.5:3))),pos=[],uv=[],indices=[];
  const samples=Array.from({length:steps+1},(_,j)=>a+(b-a)*j/steps);
  if(c.variableDepth&&segments!==1)for(const station of stations(c))if(station>a&&station<b)samples.push(station);
  samples.sort((a,b)=>a-b);
  const unique=samples.filter((s,i)=>i===0||s-samples[i-1]>1e-7),count=unique.length-1;
  const rings=unique.map(station=>sectionAt(station).map(([u,v])=>{
    const s=supportStation(c,station,u),p=frame(c,s,u);
    return [p.x,height(c,s,v,u)+v,p.z];
  }));
  // Separate section faces keep corners sharp, shared longitudinal vertices smooth the haunch.
  for(let k=0;k<n;k++){
    const offset=pos.length/3;
    for(let j=0;j<=count;j++)for(const q of [k,(k+1)%n]){pos.push(...rings[j][q]);uv.push(unique[j]/4,q/4);}
    for(let j=0;j<count;j++){const p=offset+j*2;indices.push(p,p+1,p+2,p+1,p+3,p+2);}
  }
  for(const [ring,reverse] of [[0,true],[count,false]]){
    const offset=pos.length/3,shape=sectionAt(unique[ring]);
    for(let k=0;k<n;k++){pos.push(...rings[ring][k]);uv.push(shape[k][0]/4,shape[k][1]/4);}
    T.ShapeUtils.triangulateShape(shape.map(([u,v])=>new T.Vector2(u,v)),[]).forEach(([x,y,z])=>indices.push(...(reverse?[z,y,x]:[x,y,z]).map(k=>k+offset)));
  }
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();
  const mesh=new T.Mesh(g,mat);mesh.castShadow=true;mesh.receiveShadow=true;return mesh;
}
function clipMeshAtCut(mesh,target,start){
  mesh.updateMatrixWorld(true);const bounds=new T.Box3().setFromObject(mesh);
  if(start?bounds.min.x>=target-1e-6:bounds.max.x<=target+1e-6)return;
  if(start?bounds.max.x<target:bounds.min.x>target){mesh.parent?.remove(mesh);mesh.geometry.dispose();return;}
  const geometry=mesh.geometry,position=geometry.attributes.position,tex=geometry.attributes.uv,index=geometry.index,values=[],uv=[];
  const read=k=>{const i=index?index.getX(k):k,p=new T.Vector3().fromBufferAttribute(position,i).applyMatrix4(mesh.matrixWorld);return {p:[p.x,p.y,p.z],uv:tex?[tex.getX(i),tex.getY(i)]:[0,0]};};
  const distance=v=>start?target-v.p[0]:v.p[0]-target;
  for(let i=0,n=index?index.count:position.count;i<n;i+=3){const face=[read(i),read(i+1),read(i+2)],clipped=[];
    for(let j=0;j<3;j++){const p=face[j],q=face[(j+1)%3],dp=distance(p),dq=distance(q);if(dp<=1e-7)clipped.push(p);if((dp>1e-7)!==(dq>1e-7)){const t=dp/(dp-dq);clipped.push({p:p.p.map((v,k)=>v+t*(q.p[k]-v)),uv:p.uv.map((v,k)=>v+t*(q.uv[k]-v))});}}
    for(let j=1;j<clipped.length-1;j++)for(const v of [clipped[0],clipped[j],clipped[j+1]]){values.push(...v.p);uv.push(...v.uv);}
  }
  const cut=new T.BufferGeometry();cut.setAttribute('position',new T.Float32BufferAttribute(values,3));cut.setAttribute('uv',new T.Float32BufferAttribute(uv,2));cut.computeVertexNormals();geometry.dispose();mesh.geometry=cut;mesh.position.set(0,0,0);mesh.quaternion.identity();mesh.scale.set(1,1,1);mesh.updateMatrixWorld(true);
}
export function boxGirder(c,a,b,u,mat){
  const group=new T.Group();group.name='Hollow steel box';
  for(const plate of ['topLeft','topRight','bottom','left','right']){
    const section=station=>{
      const d=girderDepth(c,supportStation(c,station,u),u);
      return boxSection(d,c.boxTopWidth,c.boxBottomWidth,.05,c.web)[plate].map(([x,y])=>[x+u,y]);
    };
    const mesh=sweep(c,a,b,section,mat,(_,s)=>girderTop(c,0,s));mesh.name='Box '+plate;group.add(mesh);
  }
  return group;
}
export function slabMesh(c,a,b,mat){
  return sweep(c,a,b,chamferSection(rect(-c.width/2,c.width/2,-c.asphalt,-c.asphalt-c.slabDepth)),mat,
    (_,s,v,u)=>profile(c,s)+(v<-c.asphalt-c.slabDepth/2?c.slabDepth-girderDepth(c,s,u):0));
}
function box(parent,mat,x,y,z,w,h,d,yaw=0){
  let geometry;
  if(mat.userData.chamfer&&Math.min(w,h,d)>.06){
    const bevel=.015,shape=new T.Shape(),a=w/2-bevel,b=h/2-bevel;
    shape.moveTo(-a+bevel,-b);for(const [px,py] of [[a-bevel,-b],[a,-b+bevel],[a,b-bevel],[a-bevel,b],[-a+bevel,b],[-a,b-bevel],[-a,-b+bevel]])shape.lineTo(px,py);shape.closePath();
    geometry=new T.ExtrudeGeometry(shape,{depth:d-2*bevel,bevelEnabled:true,bevelThickness:bevel,bevelSize:bevel,bevelSegments:1,curveSegments:1});geometry.translate(0,0,-d/2+bevel);
  }else geometry=new T.BoxGeometry(w,h,d);
  const o=new T.Mesh(geometry,mat);o.position.set(x,y,z);o.rotation.y=yaw;o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;
}
function supportBasis(c,s,u=0){
  const step=.1,station=supportStation(c,s,u),p=frame(c,station,u),lo=frame(c,supportStation(c,s,u-step),u-step),hi=frame(c,supportStation(c,s,u+step),u+step);
  const ax=hi.x-lo.x,az=hi.z-lo.z,len=Math.hypot(ax,az)||1;
  return {...p,ax:ax/len,az:az/len,angle:-Math.atan2(az,ax)};
}
// Vertical prism: local X follows the support, local Y always stays vertical.
export function wallBetween(parent,mat,a,b,thickness,bottom,top){
  const dx=b[0]-a[0],dz=b[2]-a[2];
  return box(parent,mat,(a[0]+b[0])/2,(bottom+top)/2,(a[2]+b[2])/2,Math.hypot(dx,dz),top-bottom,thickness,-Math.atan2(dz,dx));
}
function beam(parent,mat,a,b,w,d){
  const va=new T.Vector3(...a),vb=new T.Vector3(...b),delta=vb.clone().sub(va);
  const o=box(parent,mat,...va.clone().add(vb).multiplyScalar(.5).toArray(),w,delta.length(),d);
  o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),delta.normalize());return o;
}
function point(c,s,u,y){const f=frame(c,s,u);return [f.x,y,f.z];}
function supportPoint(c,s,u,y){return point(c,supportStation(c,s,u),u,y);}
function bracingMember(parent,mat,a,b){
  const shape=new T.Shape();shape.moveTo(-.065,-.065);for(const [x,y] of [[.065,-.065],[.065,-.052],[-.052,-.052],[-.052,.065],[-.065,.065]])shape.lineTo(x,y);shape.closePath();
  const start=new T.Vector3(...a),direction=new T.Vector3(...b).sub(start),geometry=new T.ExtrudeGeometry(shape,{depth:direction.length(),bevelEnabled:false,steps:1,curveSegments:1});
  const member=new T.Mesh(geometry,mat);member.position.copy(start);member.quaternion.setFromUnitVectors(new T.Vector3(0,0,1),direction.normalize());member.castShadow=member.receiveShadow=true;member.name='Steel angle brace';parent.add(member);
}
export function vehicle(parent,m,c,s,u,type,forward=true,road){
  if(!c.showTraffic)return;
  if(type==='car')type='sedan';
  let dimensions=vehicleDimensions(type);
  const fits=d=>road?Math.abs(u)+d.halfWidth<=road.width/2-.2:vehicleFits(c,s,u,d.halfLength,d.halfWidth);
  if(!fits(dimensions)){type=c.trafficMode==='cyclists'&&!road?'cyclist':'sedan';dimensions=vehicleDimensions(type);if(!fits(dimensions))return;}
  const group=createVehicleModel(type,m['paint'+(Math.abs(Math.floor(s*3+u*7+c.seed))%7)],m);
  const route={s,u,type,forward,road:road??null,halfLength:dimensions.halfLength,halfWidth:dimensions.halfWidth,speed:type==='cyclist'?17:30};
  group.userData.route=route;positionVehicle(group,c);
  parent.userData.vehicles??=[];parent.userData.vehicles.push({...route,road:!!road});
  let traffic=parent.children.find(o=>o.name==='Traffic');if(!traffic){traffic=new T.Group();traffic.name='Traffic';parent.add(traffic);}
  traffic.add(group);return group;
}
function positionVehicle(group,c){
  const {s,u,forward,road,halfLength,halfWidth,verticalOffset=0}=group.userData.route;
  const f=road?{x:road.x+road.dx*s+road.nx*u,z:road.z+road.dz*s+road.nz*u,tx:road.dx,tz:road.dz}:frame(c,s,u);
  group.position.set(f.x,(road?road.elevation:profile(c,s))+.025+verticalOffset,f.z);
  group.rotation.set(0,-Math.atan2(f.tz,f.tx)+(forward?0:Math.PI),Math.atan(road?0:(profile(c,s+.1)-profile(c,s-.1))/.2)*(forward?1:-1));
  group.visible=road?(group.userData.route.type!=='train'||Math.abs(s)<=road.halfLength+halfLength):vehicleFits(c,s,u,halfLength,halfWidth);
}
export function animateTraffic(model,dt){
  if(!model.config.movingTraffic||!model.config.showTraffic||!Number.isFinite(dt)||dt<=0)return;
  const c=model.config;
  for(const group of model.vehicles){
    const r=group.userData.route,reach=r.road?r.road.halfLength+(r.type==='train'?r.halfLength:-r.halfLength):c.approach+17-r.halfLength;
    const gap=r.offscreenGap??0,start=-reach-(r.forward?0:gap),end=r.road?reach+(r.forward?gap:0):totalLength(c)+reach,range=end-start;
    if(range<=0)continue;
    // Equal speeds preserve spacing in each lane; traffic wraps at the scenery edge.
    r.s=start+((r.s+(r.forward?1:-1)*dt*(r.speed??30)/3.6-start)%range+range)%range;
    positionVehicle(group,c);
  }
}

export const guardrailSection = [[-.04,.53],[.035,.57],[.05,.62],[-.025,.68],[.05,.74],[.035,.80],[-.04,.84],[-.044,.836],[.030,.797],[.044,.741],[-.031,.680],[.044,.619],[.030,.573],[-.044,.534]];
function bridgeRailing(parent,m,c,a,b,edge,side,type,baseOffset=0){
  const u=edge-side*.18,height=type==='210A'?.87:1.4,curb=[[edge,0],[edge-side*.45,0],[edge-side*.38,.28],[edge,.28]];
  if(side<0)curb.reverse();parent.add(sweep(c,a,b,chamferSection(curb),m.edge,(_,q)=>profile(c,q)+baseOffset));
  const rail=(y,w=.14,h=.12)=>{const top=.28+y+h/2,bottom=.28+y-h/2,t=.006;for(const section of [rect(u-w/2,u+w/2,top,top-t),rect(u-w/2,u+w/2,bottom+t,bottom),rect(u-w/2,u-w/2+t,top-t,bottom+t),rect(u+w/2-t,u+w/2,top-t,bottom+t)])parent.add(sweep(c,a,b,section,m.railing,(_,q)=>profile(c,q)+baseOffset));};
  if(type==='20C'){rail(.08,.08,.05);rail(1.38,.08,.05);}else{
    for(const y of [.18,.51,.81])rail(Math.min(y,height-.06));
    if(type==='210C')rail(1.38,.05,.05);
  }
  const posts=[a];for(let q=a+3;q<b-.01;q+=3)posts.push(q);if(posts.at(-1)!==b)posts.push(b);
  for(const q of posts){
    const s=supportStation(c,q,u),p=frame(c,s,u),y=profile(c,s)+baseOffset+.28,angle=-Math.atan2(p.tz,p.tx);
    box(parent,m.railing,p.x,y+height/2,p.z,.09,height,.09,angle);
    box(parent,m.dark,p.x,y+.02,p.z,.15,.035,.15,angle);
  }
  if(type==='20C')for(let q=a+.1;q<b-.05;q+=.1){
    const s=supportStation(c,q,u),p=frame(c,s,u),angle=-Math.atan2(p.tz,p.tx);
    box(parent,m.railing,p.x,profile(c,s)+baseOffset+.28+.73,p.z,.018,1.31,.018,angle);
  }
}
function profiledSupportWall(parent,mat,c,station,u0,u1,thickness,bottomAt,topAt){
  const triangles=[],steps=Math.max(1,Math.ceil((u1-u0)/.4)),ring=u=>{
    const p=supportBasis(c,station,u),d=thickness/2;
    if(!mat.userData.chamfer)return [[p.x-p.tx*d,topAt(u,-d),p.z-p.tz*d],[p.x+p.tx*d,topAt(u,d),p.z+p.tz*d],[p.x+p.tx*d,bottomAt(u,d),p.z+p.tz*d],[p.x-p.tx*d,bottomAt(u,-d),p.z-p.tz*d]];
    const bevel=.015,at=(along,y)=>[p.x+p.tx*along,y,p.z+p.tz*along];
    return [at(-d+bevel,topAt(u,-d+bevel)),at(d-bevel,topAt(u,d-bevel)),at(d,topAt(u,d)-bevel),at(d,bottomAt(u,d)+bevel),at(d-bevel,bottomAt(u,d-bevel)),at(-d+bevel,bottomAt(u,-d+bevel)),at(-d,bottomAt(u,-d)+bevel),at(-d,topAt(u,-d)-bevel)];
  };
  const face=(a,b,d,e)=>{triangles.push(...a,...b,...d,...a,...d,...e);};
  let previous=ring(u0);
  for(let j=1;j<=steps;j++){const next=ring(u0+(u1-u0)*j/steps);for(let k=0;k<previous.length;k++)face(previous[k],next[k],next[(k+1)%previous.length],previous[(k+1)%previous.length]);previous=next;}
  for(const [u,reverse] of [[u0,true],[u1,false]]){const r=ring(u);for(let k=1;k<r.length-1;k++)triangles.push(...r[0],...(reverse?r[k+1]:r[k]),...(reverse?r[k]:r[k+1]));}
  const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(triangles,3));geometry.computeVertexNormals();const mesh=new T.Mesh(geometry,mat);mesh.castShadow=mesh.receiveShadow=true;parent.add(mesh);return mesh;
}
function roadsideGuardrail(parent,m,c,a,b,u,road){
  const local=road?{...c,curved:false,skew:0,variableDepth:false,profile:'constant',elevation:road.elevation,grade:0,spans:[{length:0}]}:c;
  const side=Math.sign(u),path=(q,v=0)=>{const station=road?q:supportStation(c,q,u),p=frame(local,station,u+v);return {x:p.x,y:profile(local,station),z:p.z,angle:-Math.atan2(p.tz,p.tx)};};
  const group=new T.Group(),section=guardrailSection.map(([x,y])=>[u+side*x,y]);if(side<0)section.reverse();
  group.add(sweep(local,a,b,section,m.guardrail));
  const count=Math.max(1,Math.ceil((b-a)/1.9));
  for(let j=0;j<=count;j++){
    const q=a+(b-a)*j/count,p=path(q,side*.14);
    box(group,m.guardrail,p.x,p.y+.38,p.z,.10,.92,.13,p.angle);
    const block=path(q,side*.07);box(group,m.dark,block.x,block.y+.68,block.z,.12,.20,.12,block.angle);
    const bolt=path(q,-side*.045);box(group,m.railing,bolt.x,bolt.y+.68,bolt.z,.03,.025,.025,bolt.angle);
  }
  for(const q of [a,b]){const p=path(q);box(group,m.guardrail,p.x,p.y+.68,p.z,.22,.34,.12,p.angle);}
  if(road){group.position.set(road.x,0,road.z);group.rotation.y=road.yaw;}
  group.updateMatrixWorld(true);
  for(const mesh of [...group.children]){mesh.applyMatrix4(group.matrix);parent.add(mesh);}
}
function soffitAt(c,i,s,u=0){return girderTop(c,i,s)-girderDepth(c,s,u);}
function bearingY(c,i,station,u=0){const actual=supportStation(c,station,u);return soffitAt(c,i,actual,u);}
function seeded(seed){return ()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};}

export function buildBridge(c,m,{batch=true}={}) {
  const preview=approachSurfaces(c),L0=totalLength(c),extent=Math.max(L0+2*c.approach+36,...preview.flat().map(p=>2*Math.abs(p[0])+8)),fills=approachSurfaces(c,extent);
  m.steel.color.set(steelFinishes[c.steelColor]??c.steelColor);m.steel.metalness=c.steelColor==='weathered'?.03:.22;m.steel.roughness=c.steelColor==='weathered'?.92:.58;m.steel.userData.weathered.value=c.steelColor==='weathered'?1:0;
  const root=new T.Group(),deck=new T.Group(),structure=new T.Group(),setting=new T.Group();
  root.name='BridgeSketch 3D';deck.name='Deck and barriers';structure.name='Girders and supports';setting.name='Environment';root.add(deck,structure,setting);
  const haunches=new T.Group();haunches.name='Concrete deck haunches';structure.add(haunches);
  const ss=stations(c),L=totalLength(c),half=c.width/2,gspace=spacing(c),layout=roadLayout(c),leftSide=layout.left,rightSide=layout.right,roadMin=layout.roadMin,roadMax=layout.roadMax;
  const addSweep=(group,a,b,section,mat,height,segments)=>{const o=sweep(c,a,b,section,mat,height,segments);group.add(o);return o;};
  const addMedian=(a,b)=>{
    if(!layout.medianWidth)return;
    const section=c.medianType==='barrier'?[[-.3,0],[-.3,.12],[-.16,.42],[-.12,1.1],[.12,1.1],[.16,.42],[.3,.12],[.3,0]].map(([u,y])=>[u+layout.medianCentre,y]):rect(layout.medianMin,layout.medianMax,.2,0);
    const median=addSweep(deck,a,b,section,m.concrete);median.name='Centre median';
  };
  const addBarrier=(a,b,edge,side,type,raised=0)=>{
    if(type!=='concrete'){bridgeRailing(deck,m,c,a,b,edge,side,type,raised);return;}
    const section=[[0,0],[-.45,0],[-.45,.10],[-.23,.35],[-.18,c.barrier],[-.02,c.barrier],[0,.15]].map(([u,v])=>[edge+side*u,v]);
    if(side<0)section.reverse();addSweep(deck,a,b,chamferSection(section),m.edge,(_,s)=>profile(c,s)+raised);
  };
  const addBoxGirder=(group,a,b,u)=>{const box=boxGirder(c,a,b,u,m.steel);for(const mesh of [...box.children])group.add(mesh);};
  c.spans.forEach((span,i)=>{
      const a=ss[i]+(c.continuous?0:.025),b=ss[i+1]-(c.continuous?0:.025);
    if(c.material==='slab')structure.add(slabMesh(c,a,b,m.concrete));
    else addSweep(deck,a,b,rect(-half,half,-c.asphalt,-c.asphalt-c.deck),m.concrete);
    addSweep(deck,a,b,rect(-half,half,0,-c.asphalt),c.laneCount?m.asphalt:m.concrete);
    if(leftSide)addSweep(deck,a,b,rect(-half,roadMin,.2,0),m.concrete);
    if(rightSide)addSweep(deck,a,b,rect(roadMax,half,.2,0),m.concrete);
    for(const side of [-1,1])addBarrier(a,b,side*half,side,side<0?c.leftRailing:c.rightRailing,((side<0&&leftSide)||(side>0&&rightSide))?.2:0);
    if(c.sidewalkRailing!=='none'){
      if(leftSide)addBarrier(a,b,roadMin-layout.innerBarrier,-1,c.sidewalkRailing,.2);
      if(rightSide)addBarrier(a,b,roadMax+layout.innerBarrier,1,c.sidewalkRailing,.2);
    }
    addMedian(a,b);
    for(const u of layout.laneEdges)addSweep(deck,a,b,rect(u-.05,u+.05,.011,.003),m.white);
    for(let g=0;g<(c.material==='slab'?0:c.girders);g++){
      const u=-half+c.overhang+g*gspace;
      if(!(c.continuous&&(c.material==='steel'||c.material==='box'))){
        if(c.material==='box')addBoxGirder(structure,a+.22,b-.22,u);else {const section=c.material==='concrete'?station=>nebtSection(girderDepth(c,supportStation(c,station,u),u)).map(([x,y])=>[x+u,y]):steelSection(c.depth,c.web).map(([x,y])=>[x+u,y]);const top=(_,s,v,u)=>girderTop(c,i,s)+(c.material==='steel'&&v<-.05?c.depth-girderDepth(c,s,u):0);const girder=addSweep(structure,a+.22,b-.22,section,c.material==='concrete'?m.concrete:m.steel,top,c.material==='concrete'&&!c.variableDepth?1:undefined);girder.name=`Span ${i+1} girder ${g+1}`;}
      }
      // Fill from the straight girder chord to the deck profile.
      const haunchHeight=(_,s,v)=>v>-.5?profile(c,s)-c.asphalt-c.deck:girderTop(c,i,s)+1;
      for(const side of c.material==='box'?[-1,1]:[0]){
        const section=station=>{const flange=c.material==='box'?boxSection(girderDepth(c,supportStation(c,station,u),u),c.boxTopWidth,c.boxBottomWidth,.05,c.web)[side<0?'topLeft':'topRight']:rect(-.25,.25,0,-.05);return chamferSection(rect(u+flange[0][0],u+flange[1][0],0,-1));};
        addSweep(haunches,a+(c.continuous?0:.22),b-(c.continuous?0:.22),section,m.concrete,haunchHeight);
      }
    }
    for(let s=a+1.2;s<b&&c.material!=='slab';s+=Math.max(5,(b-a-2.4)/3))for(let g=0;g<c.girders-1;g++){
      const u=-half+c.overhang+g*gspace,top=girderTop(c,i,s)-.13,bot=top-Math.min(girderDepth(c,s,u),girderDepth(c,s,u+gspace))+.26;
      if(c.material==='steel'||c.material==='box'){
        const topInset=c.material==='box'?c.boxTopWidth/2-.13/4:.06,bottomInset=c.material==='box'?c.boxTopWidth/2-(top-bot+.13)/4:.06;
        const joints=[[u+topInset,top],[u+gspace-topInset,top],[u+bottomInset,bot],[u+gspace-bottomInset,bot]];
        for(const [a,b,offset] of [[0,1,0],[2,3,0],[0,3,-.035],[2,1,.035]])bracingMember(structure,m.steel,supportPoint(c,s+offset,...joints[a]),supportPoint(c,s+offset,...joints[b]));
        const f=frame(c,s);
        for(const [k,[v,y]] of joints.entries()){
          const side=k%2===0?1:-1,vertical=k<2?-1:1,p=supportPoint(c,s,v,y),q=supportPoint(c,s,v+side*.32,y),r=supportPoint(c,s,v,y+vertical*.3),positions=[];
          for(const t of [-.018,.018])for(const a of [p,q,r])positions.push(a[0]+f.tx*t,a[1],a[2]+f.tz*t);
          const plate=new T.BufferGeometry();plate.setAttribute('position',new T.Float32BufferAttribute(positions,3));plate.setIndex([0,2,1,3,4,5,0,1,4,0,4,3,1,2,5,1,5,4,2,0,3,2,3,5]);plate.computeVertexNormals();
          const mesh=new T.Mesh(plate,m.steel);mesh.castShadow=mesh.receiveShadow=true;mesh.name='Bracing gusset';structure.add(mesh);
          for(const [dv,dy] of [[.07,.06],[.19,.045],[.05,.18]]){
            const p=supportPoint(c,s,v+side*dv,y+vertical*dy),bolt=new T.Mesh(new T.CylinderGeometry(.023,.023,.052,6),m.dark);bolt.position.set(...p);bolt.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),new T.Vector3(f.tx,0,f.tz));bolt.name='Gusset bolt';structure.add(bolt);
          }
        }
      }else beam(structure,m.concrete,supportPoint(c,s,u,top-c.depth*.4),supportPoint(c,s,u+gspace,top-c.depth*.4),.25,c.depth*.52);
    }
    if(c.showTraffic)layout.laneCenters.forEach((u,lane)=>{
      const type=c.trafficMode==='cyclists'?'cyclist':vehicleKinds[(i*c.laneCount+lane+c.seed)%vehicleKinds.length],s=a+(b-a)*(lane%2?.65:.35);
      vehicle(deck,m,c,s,u,type,laneForward(c,lane));
    });
  });
  if(c.continuous&&(c.material==='steel'||c.material==='box'))for(let g=0;g<c.girders;g++){
    const u=-half+c.overhang+g*gspace;
    if(c.material==='box')addBoxGirder(structure,.25,L-.25,u);else addSweep(structure,.25,L-.25,steelSection(c.depth,c.web).map(([x,y])=>[x+u,y]),m.steel,(_,s,v,u)=>girderTop(c,0,s)+(v<-.05?c.depth-girderDepth(c,s,u):0));
  }
  ss.forEach((s,j)=>{
    const i=Math.min(j,c.spans.length-1),top=Math.min(...[-half,half].map(u=>bearingY(c,i,s,u)))-.25;
    const earth=Math.min(-.3,...c.spans.map(s=>s.elevation-1));
    if(j===0||j===ss.length-1){
      wallBetween(structure,m.concrete,supportPoint(c,s,-half+.15,0),supportPoint(c,s,half-.15,0),1.8,earth,top);
      // Wing/return walls use the actual skewed support line and bridge tangent.
      const direction=j===0?-1:1;
      const backwall=profiledSupportWall(structure,m.concrete,c,s+direction*.8,-half+.15,half-.15,.4,()=>top,(u,offset)=>Math.max(top+.2,profile(c,supportStation(c,s+direction*.8,u)+offset)-.17));backwall.name='Profile-following backwall';
      if(c.frontSlope){
        const reach=Math.min(8,Math.min(...c.spans.map(span=>span.length))/4),end=s-direction*reach;
        const slope=sweep(c,Math.min(s,end),Math.max(s,end),rect(-half+.15,half-.15,0,earth-top),c.frontSlopeMaterial==='stone'?m.stone:c.frontSlopeMaterial==='concrete'?m.concrete:m.grass,(_,station,v,u)=>v===0?top-Math.abs(station-supportStation(c,s,u))/2:top,Math.ceil(reach*2));
        slope.name='Slope in front of abutment';setting.add(slope);
      }
      for(const side of [-1,1]){
        const u=side*(half-.3),p0=supportPoint(c,s,u,0),f=frame(c,supportStation(c,s,u),u),a=(c.abutmentType==='wing'?c.wingAngle:0)*Math.PI/180;
        const corner=fills.corners.find(p=>p.end===s&&p.side===side),length=Math.max(6,Math.abs(corner.station-s));
        if(c.abutmentType==='return'){
          const end=s+direction*length,wall=sweep(c,Math.min(s,end),Math.max(s,end),chamferSection(rect(u-.225,u+.225,0,earth)),m.concrete,(_,station,v)=>v>earth+.1?profile(c,station)-.17:0,Math.ceil(length));
          wall.name=`Return wall ${j===0?'start':'end'} ${side<0?'left':'right'}`;structure.add(wall);
        }else{
          const vx=direction*f.tx*Math.cos(a)+side*f.nx*Math.sin(a),vz=direction*f.tz*Math.cos(a)+side*f.nz*Math.sin(a),p1=[p0[0]+vx*length,0,p0[2]+vz*length];
          wallBetween(structure,m.concrete,p0,p1,.45,earth,Math.max(top+.2,profile(c,s)-.17));
        }
      }
    }else if(c.pierType==='wall'){
      wallBetween(structure,m.concrete,supportPoint(c,s,-half+.15,0),supportPoint(c,s,half-.15,0),c.wallThickness,earth,top);
      wallBetween(structure,m.concrete,supportPoint(c,s,-half+.15,0),supportPoint(c,s,half-.15,0),c.wallThickness,top-.4,top);
    }else{
      const capHeight=c.pierType==='hammerhead'?c.hammerheadThickness:c.bentThickness;
      const capWidth=c.pierType==='bent'?c.bentWidth:c.hammerheadThickness;
      const capDepthAt=u=>{const edge=(half-.15)*.65,t=Math.max(0,Math.min(1,(Math.abs(u)-edge)/((half-.15)-edge)));return c.bentThickness+(c.bentEndThickness-c.bentThickness)*t*t*(3-2*t);};
      const cap=c.pierType==='bent'&&c.bentEndThickness!==c.bentThickness?profiledSupportWall(structure,m.concrete,c,s,-half+.15,half-.15,capWidth,u=>top-capDepthAt(u),()=>top):wallBetween(structure,m.concrete,supportPoint(c,s,-half+.15,0),supportPoint(c,s,half-.15,0),capWidth,top-capHeight,top);cap.name='Pier cap';
      const us=c.pierType==='hammerhead'||c.columns===1?[0]:Array.from({length:c.columns},(_,n)=>-c.width*.32+n*c.width*.64/(c.columns-1));
      for(const u of us){
        const f=supportBasis(c,s,u),height=top-(c.pierType==='bent'?capDepthAt(u):capHeight)-earth;
        if(c.pierType==='hammerhead'){
          // Box local X follows the support line; skew is not added a second time.
          const head=box(structure,m.concrete,f.x,earth+height/2,f.z,c.hammerheadWidth,height,c.hammerheadThickness,f.angle);
          head.castShadow=true;head.receiveShadow=true;
        }else if(c.columnShape==='square'){
          const column=box(structure,m.concrete,f.x,earth+height/2,f.z,c.columnDiameter,height,c.columnDiameter,f.angle);column.name='Square column';
        }else{
          const column=new T.Mesh(new T.CylinderGeometry(c.columnDiameter/2,c.columnDiameter/2,height,16),m.concrete);column.position.set(f.x,earth+height/2,f.z);column.castShadow=true;column.receiveShadow=true;structure.add(column);
        }
        box(structure,m.concrete,f.x,earth+.12,f.z,c.columnDiameter+.3,.45,c.columnDiameter+.3);
      }
    }
    if(c.continuous&&c.material==='concrete'&&j>0&&j<ss.length-1){
      const d=girderDepth(c,s),y=girderTop(c,i,s)-d/2;
      wallBetween(structure,m.concrete,supportPoint(c,s,-half+c.overhang-.6,0),supportPoint(c,s,half-c.overhang+.6,0),.65,y-d/2,y+d/2);
    }
    for(let g=0;g<c.girders;g++)for(const side of (j>0&&j<ss.length-1?(c.continuous&&['steel','box','slab'].includes(c.material)?[0]:[-.55,.55]):[j===0?.5:-.5])){
      const u=-half+c.overhang+g*gspace,k=Math.max(0,Math.min(c.spans.length-1,side<0?j-1:j)),sg=supportStation(c,s,u)+side,f=frame(c,sg,u),bottom=soffitAt(c,k,sg,u),height=Math.max(.12,bottom-top);
      // Bearings are fixed 75 mm elastomeric pads, aligned to the local support.
      const bearing=supportBasis(c,s,u);box(structure,m.dark,f.x,bottom-.0375,f.z,.55,.075,.48,bearing.angle-Math.PI/2);
      box(structure,m.concrete,f.x,(top+bottom-.075)/2,f.z,.8,bottom-.075-top,.72,bearing.angle-Math.PI/2);
    }
  });
  const sceneHalf=L/2+c.approach+18;
  for(const [a,b] of fills.ranges){
    const first=deck.children.length;
    addSweep(deck,a,b,rect(-half,half,0,-.17),c.laneCount?m.asphalt:m.concrete);
    if(leftSide)addSweep(deck,a,b,rect(-half,roadMin,.2,0),m.concrete);
    if(rightSide)addSweep(deck,a,b,rect(roadMax,half,.2,0),m.concrete);
    for(const u of layout.laneEdges)addSweep(deck,a,b,rect(u-.05,u+.05,.011,.003),m.white);
    addMedian(a,b);
    if(c.laneCount)for(const u of [-half+.05,half-.05])roadsideGuardrail(deck,m,c,a,b,u);
    else for(const side of [-1,1])addBarrier(a,b,side*half,side,side<0?c.leftRailing:c.rightRailing);
    const start=a<0,target=start?-fills.extent/2:fills.extent/2;
    for(const mesh of deck.children.slice(first))if(mesh.isMesh)clipMeshAtCut(mesh,target,start);
  }
  const waters=addEnvironment(c,m,setting,fills);
  const vehicles=[deck,setting].flatMap(group=>group.children.find(o=>o.name==='Traffic')?.children??[]);
  if(batch){for(const vehicle of vehicles)batchMeshes(vehicle);for(const group of [deck,haunches,structure,setting])batchMeshes(group);}
  return {root,deck,structure,haunches,setting,waters,vehicles,traffic:deck.children.find(o=>o.name==='Traffic'),config:c};
}

function crossing(c,s,angle,width,elevation,type){
  const f=frame(c,s),a=angle*Math.PI/180,dx=f.tx*Math.cos(a)+f.nx*Math.sin(a),dz=f.tz*Math.cos(a)+f.nz*Math.sin(a);
  return {x:f.x,z:f.z,dx,dz,nx:-dz,nz:dx,width,elevation,type,yaw:-Math.atan2(dz,dx)};
}
function coordinates(o,x,z){const dx=x-o.x,dz=z-o.z;return {along:dx*o.dx+dz*o.dz,across:dx*o.nx+dz*o.nz};}
function world(o,along,across,y){return [o.x+o.dx*along+o.nx*across,y,o.z+o.dz*along+o.nz*across];}
function riverWiggle(t){return Math.sin(t*.045)*2.4+Math.sin(t*.1)*.7;}
export function obstacleTour(c){
  const ss=stations(c),middle=totalLength(c)/2;
  const index=c.spans.reduce((best,span,i)=>Math.abs((ss[i]+ss[i+1])/2-middle)<Math.abs((ss[best]+ss[best+1])/2-middle)?i:best,0);
  const span=c.spans[index],station=(ss[index]+ss[index+1])/2,bridge=frame(c,station);
  let obstacle=crossing(c,station,span.angle,span.width,span.elevation,span.obstacle);
  if(span.obstacle==='water'){
    const g=waterGroups(c).find(g=>g.startIndex<=index&&g.endIndex>=index),first=c.spans[g.startIndex],last=c.spans[g.endIndex];
    const start=g.start+Math.max(1,(first.length-first.width)/2),end=g.end-Math.max(1,(last.length-last.width)/2);
    const width=g.startIndex===g.endIndex?Math.min(first.width,first.length-2):(end-start)*Math.sin(g.angle*Math.PI/180);
    obstacle=crossing(c,(start+end)/2,g.angle,width,g.elevation,'water');
  }
  const atBridge=coordinates(obstacle,bridge.x,bridge.z),water=span.obstacle==='water';
  const across=water?T.MathUtils.clamp(atBridge.across-riverWiggle(atBridge.along),-obstacle.width/2+1.3,obstacle.width/2-1.3):span.obstacle==='road'?obstacle.width/4:obstacle.width>=7?1.8:0;
  const underside=soffitAt(c,index,station),eye=Math.max(.12,Math.min(water?1.3:span.obstacle==='rail'?2.2:1.65,(underside-span.elevation)*.4));
  const reach=Math.max(32,c.width/Math.sin(span.angle*Math.PI/180)+16,(profile(c,station)-span.elevation)*1.7);
  return {index,type:span.obstacle,reach,pose(distance){
    const along=atBridge.along+distance;
    return {position:world(obstacle,along,across+(water?riverWiggle(along):0),span.elevation+eye),target:[bridge.x,underside-.1,bridge.z]};
  }};
}
function terrainSampler(c){
  const ss=stations(c),obstacles=c.spans.flatMap((s,i)=>s.obstacle==='water'?[]:[crossing(c,(ss[i]+ss[i+1])/2,s.angle,s.width,s.elevation,s.obstacle)]);
  for(const g of waterGroups(c)){
    const first=c.spans[g.startIndex],last=c.spans[g.endIndex],start=g.start+Math.max(1,(first.length-first.width)/2),end=g.end-Math.max(1,(last.length-last.width)/2);
    obstacles.push(crossing(c,(start+end)/2,g.angle,g.startIndex===g.endIndex?Math.min(first.width,first.length-2):(end-start)*Math.sin(g.angle*Math.PI/180),g.elevation,'water'));
  }
  return (x,z)=>{
    let y=.22+.25*Math.sin(x*.053)*Math.cos(z*.072);
    for(const o of obstacles){const p=coordinates(o,x,z),distance=Math.abs(p.across-(o.type==='water'?riverWiggle(p.along):0)),blend=T.MathUtils.clamp((o.width/2+3-distance)/3,0,1);y=y*(1-blend)+(o.elevation-(o.type==='water'?.65:.12))*blend;}
    return y;
  };
}
// Shared surfaces drive both the visible fill and scenery exclusion. Every radial
// generator falls one metre for two metres of horizontal run, to actual terrain.
export function approachSurfaces(c,extent=0){
  const L=totalLength(c),half=c.width/2-.55,ground=terrainSampler(c),surfaces=[];
  surfaces.extent=extent;
  surfaces.corners=[];surfaces.ranges=[];
  const apex=(station,u)=>{const s=supportStation(c,station,u),f=frame(c,s,u);return {f,p:[f.x,profile(c,s)-.17,f.z]};};
  const toe=(p,dx,dz)=>{
    let lo=0,hi=Math.max(1,2*(p[1]-Math.min(-6,...c.spans.map(s=>s.elevation-1)))+4);
    for(let i=0;i<28;i++){const r=(lo+hi)/2;if(p[1]-r/2>ground(p[0]+dx*r,p[2]+dz*r))lo=r;else hi=r;}
    return [p[0]+dx*hi,p[1]-hi/2,p[2]+dz*hi];
  };
  for(const [end,toward] of [[0,1],[L,-1]]){
    const f=frame(c,end),k=Math.tan(c.skew*Math.PI/180);
    const intrusion=p=>toward*((p[0]-f.x)*(f.tx-k*f.nx)+(p[2]-f.z)*(f.tz-k*f.nz));
    const corners=[],frontReach=c.frontSlope?Math.min(8,Math.min(...c.spans.map(s=>s.length))/4):0;
    for(const side of [-1,1]){
      const cone=setback=>{
        const station=end-toward*setback,{p,f}=apex(station,half*side),ring=[];
        for(let i=0;i<=24;i++){const angle=i*Math.PI/48;ring.push(toe(p,side*f.nx*Math.cos(angle)+toward*f.tx*Math.sin(angle),side*f.nz*Math.cos(angle)+toward*f.tz*Math.sin(angle)));}
        return {end,side,station,p,ring,intrusion:Math.max(...ring.map(intrusion))};
      };
      // Move the crest back, never flatten the 2:1 slope: its foremost toe
      // lands on the abutment plane, including skew and curved alignment.
      let lo=0,hi=8;while(cone(hi).intrusion>frontReach&&hi<512)hi*=2;
      for(let i=0;i<24;i++){const mid=(lo+hi)/2;if(cone(mid).intrusion>frontReach)lo=mid;else hi=mid;}
      const corner=cone(hi);corners.push(corner);surfaces.corners.push(corner);
    }
    let outer=end-toward*Math.max(c.approach+18,...corners.map(p=>Math.abs(p.station-end)+8));
    if(extent){
      const target=end===0?-extent/2:extent/2,at=frame(c,outer);outer+=(target-at.x)/Math.max(.1,at.tx);
      const edgeX=[-c.width/2,c.width/2].map(u=>frame(c,supportStation(c,outer,u),u).x);
      const shortfall=end===0?Math.max(...edgeX)-target:target-Math.min(...edgeX);
      outer+=(end===0?-1:1)*Math.max(0,shortfall+.05)/Math.max(.1,at.tx);
    }
    const a=Math.min(outer,end),b=Math.max(outer,end);surfaces.ranges.push([a,b]);
    const local=[];
    for(let s=a;s<b;s+=1){const t=Math.min(b,s+1);local.push([apex(s,-half).p,apex(s,half).p,apex(t,half).p,apex(t,-half).p]);}
    for(const corner of corners){
      const side=corner.side,a=Math.min(outer,corner.station),b=Math.max(outer,corner.station);
      for(let s=a;s<b;s+=1){const p=apex(s,half*side),q=apex(Math.min(b,s+1),half*side);local.push([p.p,q.p,toe(q.p,q.f.nx*side,q.f.nz*side),toe(p.p,p.f.nx*side,p.f.nz*side)]);}
      for(let i=0;i<24;i++){const cone=[corner.p,corner.ring[i],corner.ring[i+1]];cone.finish=c.approachConeMaterial;local.push(cone);}
    }
    // Clip numerical/curve overshoot at the same abutment plane.
    for(const face of local){
      const clipped=[];
      const limit=face.finish?frontReach:0;
      for(let i=0;i<face.length;i++){const p=face[i],q=face[(i+1)%face.length],dp=intrusion(p)-limit,dq=intrusion(q)-limit;if(dp<=1e-7)clipped.push(p);if((dp>1e-7)!==(dq>1e-7)){const t=dp/(dp-dq);clipped.push(p.map((v,j)=>v+t*(q[j]-v)));}}
      let bounded=clipped;
      if(extent){const target=end===0?-extent/2:extent/2,next=[];
        for(let i=0;i<bounded.length;i++){const p=bounded[i],q=bounded[(i+1)%bounded.length],dp=end===0?target-p[0]:p[0]-target,dq=end===0?target-q[0]:q[0]-target;if(dp<=1e-7)next.push(p);if((dp>1e-7)!==(dq>1e-7)){const t=dp/(dp-dq);next.push(p.map((v,j)=>v+t*(q[j]-v)));}}bounded=next;
      }
      if(bounded.length>=3){bounded.finish=face.finish??'grass';surfaces.push(bounded);}
    }
  }
  return surfaces;
}
export function roadFootprints(c,fills=approachSurfaces(c)){
  const L=totalLength(c),polygons=[],half=c.width/2;
  for(const [a,b] of [...fills.ranges,[0,L]]){
    const n=Math.ceil(b-a);
    for(let i=0;i<n;i++){
      const s=a+(b-a)*i/n,t=a+(b-a)*(i+1)/n;
      const p=[[s,-half],[s,half],[t,half],[t,-half]].map(([v,u])=>frame(c,supportStation(c,v,u),u));
      polygons.push({p,minX:Math.min(...p.map(v=>v.x)),maxX:Math.max(...p.map(v=>v.x)),minZ:Math.min(...p.map(v=>v.z)),maxZ:Math.max(...p.map(v=>v.z))});
    }
  }
  for(const points of fills){
    const p=points.map(([x,y,z])=>({x,z}));
    polygons.push({p,minX:Math.min(...p.map(v=>v.x)),maxX:Math.max(...p.map(v=>v.x)),minZ:Math.min(...p.map(v=>v.z)),maxZ:Math.max(...p.map(v=>v.z))});
  }
  return polygons;
}
export function intersectsRoad(polygons,x,z,radius=0){
  for(const {p,minX,maxX,minZ,maxZ} of polygons){
    if(x<minX-radius||x>maxX+radius||z<minZ-radius||z>maxZ+radius)continue;
    let inside=false;
    for(let i=0,j=p.length-1;i<p.length;j=i++){
      const a=p[j],b=p[i],dx=b.x-a.x,dz=b.z-a.z,t=T.MathUtils.clamp(((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz),0,1);
      if(Math.hypot(x-a.x-t*dx,z-a.z-t*dz)<=radius+.02)return true;
      if((a.z>z)!==(b.z>z)&&x<(b.x-a.x)*(z-a.z)/(b.z-a.z)+a.x)inside=!inside;
    }if(inside)return true;
  }return false;
}
// Reserve the whole strip between adjacent road/rail crossings, including
// differently angled crossings and curved bridge alignments.
export function crossingCorridors(c,extent=totalLength(c)+2*c.approach+36,halfZ=c.sceneWidth/2){
  const ss=stations(c),strips=c.spans.flatMap((span,i)=>{
    if(span.obstacle==='water')return [];
    const o=crossing(c,(ss[i]+ss[i+1])/2,span.angle,span.width,span.elevation,span.obstacle),reach=Math.hypot(extent,2*halfZ);
    let polygon=[[-reach,-1],[reach,-1],[reach,1],[-reach,1]].map(([s,side])=>{const p=world(o,s,side*(o.width/2+2),0);return {x:p[0],z:p[2]};});
    for(const [axis,limit,sign] of [['x',extent/2,1],['x',-extent/2,-1],['z',halfZ,1],['z',-halfZ,-1]]){
      const out=[];for(let j=0;j<polygon.length;j++){const a=polygon[j],b=polygon[(j+1)%polygon.length],da=sign*(a[axis]-limit),db=sign*(b[axis]-limit);if(da<=0)out.push(a);if((da<=0)!==(db<=0)){const t=da/(da-db);out.push({x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t});}}polygon=out;
    }
    return [polygon];
  }),zones=[];
  for(let i=0;i<strips.length-1;i++){
    const points=[...strips[i],...strips[i+1]].sort((a,b)=>a.x-b.x||a.z-b.z),cross=(a,b,c)=>(b.x-a.x)*(c.z-a.z)-(b.z-a.z)*(c.x-a.x),lower=[],upper=[];
    for(const p of points){while(lower.length>1&&cross(lower.at(-2),lower.at(-1),p)<=0)lower.pop();lower.push(p);}
    for(const p of [...points].reverse()){while(upper.length>1&&cross(upper.at(-2),upper.at(-1),p)<=0)upper.pop();upper.push(p);}
    const p=[...lower.slice(0,-1),...upper.slice(0,-1)];if(p.length<3)continue;
    zones.push({p,minX:Math.min(...p.map(v=>v.x)),maxX:Math.max(...p.map(v=>v.x)),minZ:Math.min(...p.map(v=>v.z)),maxZ:Math.max(...p.map(v=>v.z))});
  }
  return zones;
}
function addEnvironment(c,m,parent,fills){
  const L=totalLength(c),ss=stations(c),points=fills.flat(),extent=fills.extent||Math.max(L+2*c.approach+36,...points.map(p=>2*Math.abs(p[0])+8)),halfZ=Math.max(c.sceneWidth/2,...points.map(p=>Math.abs(p[2])+8)),rng=seeded(c.seed),obstacles=[],waters=[],ground=c.terrainMode==='snow'?m.snow:m.grass,riverReach=Math.hypot(extent/2,halfZ)+8,riverSteps=Math.ceil(riverReach);
  for(const finish of ['grass','stone','concrete']){
   const fillPos=[];
   for(const p of fills.filter(face=>face.finish===finish))for(let i=1;i<p.length-1;i++){
    const a=p[0],b=p[i],d=p[i+1],up=(b[2]-a[2])*(d[0]-a[0])-(b[0]-a[0])*(d[2]-a[2]);
    fillPos.push(...a,...(up>=0?b:d),...(up>=0?d:b));
   }
   if(fillPos.length){const fillGeometry=new T.BufferGeometry();fillGeometry.setAttribute('position',new T.Float32BufferAttribute(fillPos,3));const uv=[];for(let i=0;i<fillPos.length;i+=3)uv.push(fillPos[i]/2,fillPos[i+2]/2);fillGeometry.setAttribute('uv',new T.Float32BufferAttribute(uv,2));fillGeometry.computeVertexNormals();const fill=new T.Mesh(fillGeometry,finish==='stone'?m.stone:finish==='concrete'?m.concrete:ground);fill.name='2H:1V approach '+finish;fill.receiveShadow=true;fill.castShadow=true;parent.add(fill);}
  }
  c.spans.forEach((s,i)=>{if(s.obstacle!=='water')obstacles.push(crossing(c,(ss[i]+ss[i+1])/2,s.angle,s.width,s.elevation,s.obstacle));});
  for(const g of waterGroups(c)){
    const first=c.spans[g.startIndex],last=c.spans[g.endIndex];
    const start=g.start+Math.max(1,(first.length-first.width)/2),end=g.end-Math.max(1,(last.length-last.width)/2);
    const width=g.startIndex===g.endIndex?Math.min(first.width,first.length-2):(end-start)*Math.sin(g.angle*Math.PI/180);
    const o=crossing(c,(start+end)/2,g.angle,width,g.elevation,'water');obstacles.push(o);
    const pos=[],indices=[],uv=[];
    for(let j=0;j<=riverSteps;j++)for(const side of [-1,1]){const along=-riverReach+j*2*riverReach/riverSteps;pos.push(...world(o,along,side*width/2+riverWiggle(along),g.elevation));uv.push(j/riverSteps,(side+1)/2);}
    for(let j=0;j<riverSteps;j++){const k=j*2;indices.push(k,k+1,k+2,k+1,k+3,k+2);}
    const clipped=[];
    // Clip the river to the terrain boundary so no floating surface extends beyond the landscape.
    for(let i=0;i<indices.length;i+=3){
      let polygon=indices.slice(i,i+3).map(k=>pos.slice(k*3,k*3+3));
      for(const [axis,limit,sign] of [[0,extent/2,1],[0,-extent/2,-1],[2,halfZ,1],[2,-halfZ,-1]]){
        const output=[];for(let j=0;j<polygon.length;j++){const a=polygon[j],b=polygon[(j+1)%polygon.length],insideA=sign*(a[axis]-limit)<=0,insideB=sign*(b[axis]-limit)<=0;if(insideA)output.push(a);if(insideA!==insideB){const t=(limit-a[axis])/(b[axis]-a[axis]);output.push(a.map((v,k)=>v+t*(b[k]-v)));}}polygon=output;
      }
      for(let j=1;j<polygon.length-1;j++)clipped.push(...polygon[0],...polygon[j],...polygon[j+1]);
    }
    const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(clipped,3));const riverUV=[];for(let k=0;k<clipped.length;k+=3){const p=coordinates(o,clipped[k],clipped[k+2]);riverUV.push(p.along,p.across);}geo.setAttribute('uv',new T.Float32BufferAttribute(riverUV,2));geo.computeVertexNormals();const river=new T.Mesh(geo,m.water);river.name='Flowing river';river.receiveShadow=true;parent.add(river);waters.push(river);
  }
  const terrainHeight=terrainSampler(c);
  const terrainGeo=new T.PlaneGeometry(extent,halfZ*2,Math.min(240,Math.ceil(extent/1.2)),Math.ceil(halfZ*2/1.2));terrainGeo.rotateX(-Math.PI/2);const terrainPos=terrainGeo.attributes.position;
  for(let i=0;i<terrainPos.count;i++)terrainPos.setY(i,terrainHeight(terrainPos.getX(i),terrainPos.getZ(i)));terrainGeo.computeVertexNormals();const terrain=new T.Mesh(terrainGeo,ground);terrain.name='Terrain surface';terrain.receiveShadow=true;parent.add(terrain);
  // Border skirt follows the terrain edge, keeping the diorama watertight visually.
  const base=Math.min(-1.5,...c.spans.map(s=>s.elevation-1.5));
  for(const z of [-halfZ,halfZ])for(let x=-extent/2;x<extent/2;x+=2){const w=Math.min(2,extent/2-x),y=terrainHeight(x+w/2,z);box(parent,m.earth,x+w/2,(y+base)/2,z,w,y-base,.25);}
  for(const x of [-extent/2,extent/2])for(let z=-halfZ;z<halfZ;z+=2){const d=Math.min(2,halfZ-z),y=terrainHeight(x,z+d/2);box(parent,ground,x,(y+base)/2,z+d/2,.25,y-base,d);}
  for(const [a,b] of fills.ranges){
    const start=a<0,target=start?-extent/2:extent/2,points=fills.flatMap(face=>face.filter(p=>Math.abs(p[0]-target)<.002));
    for(const u of [-c.width/2,c.width/2]){
      let station=start?a:b;
      for(let k=0;k<5;k++){const actual=supportStation(c,station,u),x=frame(c,actual,u).x,delta=.01,derivative=(frame(c,supportStation(c,station+delta,u),u).x-x)/delta;station+=(target-x)/Math.max(.1,derivative);}
      const actual=supportStation(c,station,u),p=frame(c,actual,u);points.push([target,profile(c,actual)-.17,p.z]);
    }
    points.sort((p,q)=>p[2]-q[2]);const top=[];
    for(const p of points){if(top.length&&Math.abs(p[2]-top.at(-1)[2])<.002){if(p[1]>top.at(-1)[1])top[top.length-1]=p;}else top.push(p);}
    const section=top.map(p=>[[target,p[1],p[2]],[target,base,p[2]]]);
    const vertices=[],uv=[];for(let j=0;j<section.length-1;j++){
      const [p,q]=section[j],[r,t]=section[j+1],face=start?[p,t,r,p,q,t]:[p,r,t,p,t,q];
      for(let k=0;k<face.length;k++){vertices.push(...face[k]);uv.push(face[k][2]/2,face[k][1]/2);}
    }
    const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(vertices,3));geometry.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geometry.computeVertexNormals();const cap=new T.Mesh(geometry,ground);cap.name='Grass-covered approach cut';cap.receiveShadow=true;parent.add(cap);
  }
  box(parent,m.earth,0,base-.2,0,extent,.4,halfZ*2);
  let railIndex=0;
  for(const o of obstacles.filter(o=>o.type!=='water')){
    const halfLength=Math.max(1,Math.min(halfZ+10,(extent/2-Math.abs(o.x)-Math.abs(o.nx)*o.width/2)/Math.max(.001,Math.abs(o.dx)),(halfZ-Math.abs(o.z)-Math.abs(o.nz)*o.width/2)/Math.max(.001,Math.abs(o.dz))));
    o.halfLength=halfLength;
    const basePos=world(o,0,0,o.elevation-.1);box(parent,o.type==='road'?m.asphalt:m.sand,...basePos,2*halfLength,.2,o.width,o.yaw);
    if(o.type==='road'){
      for(const side of [-1,1])box(parent,m.white,...world(o,0,side*(o.width/2-.3),o.elevation+.013),2*halfLength,.018,.10,o.yaw);
      box(parent,m.white,...world(o,0,0,o.elevation+.016),2*halfLength,.02,.10,o.yaw);
      roadsideGuardrail(parent,m,c,-halfLength,halfLength,o.width/2+.35,o);roadsideGuardrail(parent,m,c,-halfLength,halfLength,-o.width/2-.35,o);
      if(c.showTraffic&&o.width>=6.4)for(const t of [-halfLength*.6,halfLength*.6])vehicle(parent,m,c,t,(t<0?1:-1)*o.width/4,t<0?'car':'truck',t<0,o);
    }else{
      const tracks=o.width>=7?[-1.8,1.8]:[0];
      for(const offset of tracks){
        for(let t=-halfLength+.2;t<halfLength-.2;t+=.7)box(parent,m.trunk,...world(o,t,offset,o.elevation+.06),.22,.12,2.5,o.yaw);
        for(const side of [-.7175,.7175])box(parent,m.dark,...world(o,0,offset+side,o.elevation+.16),2*halfLength,.16,.08,o.yaw);
      }
      if(c.showTraffic){
        let traffic=parent.children.find(child=>child.name==='Traffic');if(!traffic){traffic=new T.Group();traffic.name='Traffic';parent.add(traffic);}
        const style=c.trainStyle==='mixed'?['diesel','bullet','city'][(railIndex+c.seed)%3]:c.trainStyle;
        const carCount=4+Math.floor(seeded(c.seed+railIndex*1009+137)()*9);
        const train=makeTrain(style,m.train,carCount),forward=(railIndex+c.seed)%2===0;
        train.userData.route={s:(forward?-.33:.33)*halfLength,u:tracks.length===1?0:forward?tracks[1]:tracks[0],type:'train',forward,road:o,halfLength:train.userData.length/2,halfWidth:train.userData.width/2,verticalOffset:.22,speed:48,offscreenGap:40};
        positionVehicle(train,c);traffic.add(train);
      }
      railIndex++;
    }
  }
  const roadZones=roadFootprints(c,fills),corridorZones=crossingCorridors(c,extent,halfZ);
  const occupied=(x,z,margin=2)=>{
    for(const o of obstacles){const p=coordinates(o,x,z);if(Math.abs(p.across-(o.type==='water'?riverWiggle(p.along):0))<o.width/2+margin)return true;}
    return intersectsRoad(roadZones,x,z,margin);
  };
  const trees=[];
  for(let i=0;i<2400&&c.environment==='rural'&&trees.length<220;i++){
    const x=(rng()-.5)*(extent-12),z=(rng()-.5)*(2*halfZ-12),scale=1.1+rng()*1.5,radius=scale*3.5+1;
    if(!occupied(x,z,radius)&&!intersectsRoad(corridorZones,x,z,radius))trees.push({x,z,y:terrainHeight(x,z),scale,rotation:rng()*Math.PI});
  }
  const instanced=(geo,mat,items,transform)=>{if(!items.length){geo.dispose();return;}const mesh=new T.InstancedMesh(geo,mat,items.length),dummy=new T.Object3D();items.forEach((item,i)=>{transform(dummy,item);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);});mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;};
  const rocks=[];
  for(const o of obstacles.filter(o=>o.type==='water'))for(let along=-riverReach;along<riverReach;along+=1.8)for(const side of [-1,1]){
    const p=world(o,along,riverWiggle(along)+side*(o.width/2+.4+rng()*1.8),0);
    if(Math.abs(p[0])<extent/2-1&&Math.abs(p[2])<halfZ-1)rocks.push({x:p[0],z:p[2],y:terrainHeight(p[0],p[2]),s:.2+rng()*.5,r:rng()*6});
  }
  instanced(new T.DodecahedronGeometry(1,0),c.terrainMode==='snow'?m.snow:m.sand,rocks,(d,r)=>{d.position.set(r.x,r.y,r.z);d.scale.set(r.s,r.s*.45,r.s*.8);d.rotation.set(.2,r.r,.15);});
  instanced(new T.CylinderGeometry(.11,.16,1,6),m.trunk,trees,(d,t)=>{d.position.set(t.x,t.y+t.scale*.75,t.z);d.scale.set(t.scale,t.scale*1.5,t.scale);});
  const crowns=[];
  for(const t of trees)for(let k=0;k<4;k++){const a=t.rotation+k*1.9;beam(parent,m.trunk,[t.x,t.y+t.scale,t.z],[t.x+Math.cos(a)*t.scale*.7,t.y+t.scale*(2.1+k*.13),t.z+Math.sin(a)*t.scale*.7],.055*t.scale,.055*t.scale);}
  for(const t of trees)for(let k=0;k<9;k++){const angle=k*2.4+t.rotation,r=k===0?0:t.scale*(.35+rng()*.5);crowns.push({x:t.x+Math.cos(angle)*r,z:t.z+Math.sin(angle)*r,y:t.y+t.scale*(1.7+rng()*1.2),s:t.scale*(.45+rng()*.3),r:angle});}
  const cards=[];
  for(const t of crowns)for(let j=0;j<3;j++)cards.push({...t,angle:t.r+j*Math.PI/3,tilt:j===2?Math.PI/3:.12});
  for(const [index,mat] of (c.terrainMode==='snow'?[m.treeSnow,m.treeLightSnow]:[m.tree,m.treeLight]).entries()){
    const foliage=instanced(new T.PlaneGeometry(3.2,3.2),mat,cards.filter((_,i)=>i%2===index),(d,t)=>{d.position.set(t.x,t.y,t.z);d.scale.setScalar(t.s);d.rotation.set(t.tilt,t.angle,.1);});
    if(foliage)foliage.customDepthMaterial=new T.MeshDepthMaterial({depthPacking:T.RGBADepthPacking,map:mat.map,alphaTest:.45,side:T.DoubleSide});
  }
  const grasses=[];
  for(let i=0;i<(c.terrainMode==='snow'?0:Math.min(60000,extent*halfZ*3));i++){const x=(rng()-.5)*(extent-4),z=(rng()-.5)*(2*halfZ-4);if(!occupied(x,z,.45))grasses.push({x,z,y:terrainHeight(x,z),s:.18+rng()*.24,r:rng()*Math.PI});}
  const blades=[],bladeColors=[],baseColor=new T.Color('#405c2b'),tipColor=new T.Color('#9aab64');
  for(let k=0;k<6;k++){
    const a=k*2.4,dx=Math.cos(a),dz=Math.sin(a),height=.65+(k%3)*.12;
    const pts=[[-.028,0,0],[.028,0,0],[-.018,height*.58,.09],[.018,height*.58,.09],[0,height,.24]];
    for(const j of [0,1,2,1,3,2,2,3,4]){const [width,y,bend]=pts[j];blades.push(dx*(.12+bend)-dz*width,y,dz*(.12+bend)+dx*width);const color=baseColor.clone().lerp(tipColor,y/height);bladeColors.push(color.r,color.g,color.b);}
  }
  const tuft=new T.BufferGeometry();tuft.setAttribute('position',new T.Float32BufferAttribute(blades,3));tuft.setAttribute('color',new T.Float32BufferAttribute(bladeColors,3));tuft.computeVertexNormals();m.grassBlade.side=T.DoubleSide;m.grassBlade.vertexColors=true;m.grassBlade.color.set('#ffffff');
  const grass=instanced(tuft,m.grassBlade,grasses,(d,g)=>{d.position.set(g.x,g.y,g.z);d.scale.setScalar(g.s);d.rotation.y=g.r;});
  if(grass){grass.name='Meadow blades';grass.castShadow=false;grasses.forEach((g,i)=>grass.setColorAt(i,new T.Color().setRGB(.78+rng()*.22,.84+rng()*.16,.71+rng()*.25)));}
  if(c.environment==='urban'){
    const buildings=Object.fromEntries(buildingStyles.map(name=>[name,[]]));
    for(let x=-extent/2+14;x<extent/2-9;x+=13)for(let z=-halfZ+12;z<halfZ-7;z+=15){
      const name=buildingStyles[Math.floor(rng()*buildingStyles.length)],size=kenneySize(name),scale=.85+rng()*.25,radius=Math.hypot(size[0],size[2])*scale/2+1;
      if(!occupied(x,z,radius)&&!intersectsRoad(corridorZones,x,z,radius)&&rng()>.15)buildings[name].push({x,z,y:terrainHeight(x,z),scale});
    }
    for(const name of buildingStyles){
      const mesh=instanced(kenneyGeometry(name),name.startsWith('building-type')?m.suburban:m.commercial,buildings[name],(d,b)=>{d.position.set(b.x,b.y,b.z);d.scale.setScalar(b.scale);});
      if(mesh)mesh.name=`Kenney ${name}`;
    }
  }
  return waters;
}

// Merge repeated static surfaces by material while preserving the three visibility layers.
function batchMeshes(group){
  group.updateMatrixWorld(true);const batches=new Map();
  for(const child of [...group.children]){
    if(!child.isMesh||child.isInstancedMesh||child.material.userData.flowTime)continue;
    const g=child.geometry.index?child.geometry.toNonIndexed():child.geometry.clone();g.applyMatrix4(child.matrix);
    if(!g.attributes.uv)g.setAttribute('uv',new T.Float32BufferAttribute(new Float32Array(g.attributes.position.count*2),2));
    // Project each triangle in world metres, keeping aggregate/formwork scale consistent.
    if(child.material.userData.textureMetres){const p=g.attributes.position,n=g.attributes.normal,uv=g.attributes.uv,size=child.material.userData.textureMetres;
      for(let i=0;i<p.count;i+=3){const axis=[Math.abs(n.getX(i)),Math.abs(n.getY(i)),Math.abs(n.getZ(i))];const major=axis.indexOf(Math.max(...axis));
        for(let j=i;j<i+3;j++)uv.setXY(j,(major===0?p.getZ(j):p.getX(j))/size,(major===1?p.getZ(j):p.getY(j))/size);
      }
    }
    if(!batches.has(child.material))batches.set(child.material,[]);batches.get(child.material).push(g);group.remove(child);child.geometry.dispose();
  }
  for(const [mat,geos] of batches){const g=mergeGeometries(geos,false);geos.forEach(g=>g.dispose());if(!g)throw Error('Could not combine bridge geometry.');const mesh=new T.Mesh(g,mat);mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);}
}

export function disposeModel(model){if(!model)return;const geometries=new Set();model.root.traverse(o=>{if(o.geometry)geometries.add(o.geometry);o.customDepthMaterial?.dispose();});geometries.forEach(g=>g.dispose());}
