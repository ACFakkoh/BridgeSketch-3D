import * as T from 'three';
import {mergeGeometries} from './vendor/BufferGeometryUtils.js';
import {frame,profile,totalLength,stations,spacing,supportStation,girderTop,girderDepth,waterGroups,roadLayout,terrainBase,laneForward,steelFinishes,vehicleFits} from './geometry.mjs';

export function makeMaterials(onLoad=()=>{}) {
  const material=(color,roughness=.85,metalness=0)=>new T.MeshStandardMaterial({color,roughness,metalness});
  const m={concrete:material('#a5a397',.88),edge:material('#aaa99e',.86),asphalt:material('#30363a',.9),steel:material('#64707a',.7,.5),dark:material('#253037',.65,.15),railing:material('#9ba6a6',.62,.7),guardrail:material('#9da6a1',.55,.75),reflector:material('#f0c84c',.4,.1),grass:material('#839873'),grassBlade:material('#4d8052'),earth:material('#8f9581'),sand:material('#b7ad91'),white:material('#ebe6cf'),yellow:material('#eec45f'),tree:material('#446c58'),treeLight:material('#658f67'),trunk:material('#655849'),building:material('#b9c6c9'),roof:material('#728891'),vehicle:material('#c85b4d',.5,.15),vehicleAlt:material('#4c7895',.5,.15),truck:material('#d38a42',.58,.1),glass:material('#9fd6df',.25,.2),wheel:material('#20292d',.9)};
  ['#23577e','#b93632','#e5e8e6','#34464b','#c9a34e','#42785e','#776a8b'].forEach((color,i)=>m['paint'+i]=material(color,.32,.28));
  if(typeof document!=='undefined'){
    const loader=new T.TextureLoader();
    const load=(file,color=false)=>{const t=loader.load(`./textures/${file}`,onLoad,undefined,()=>console.warn(`Could not load ${file}`));t.wrapS=t.wrapT=T.RepeatWrapping;t.anisotropy=8;if(color)t.colorSpace=T.SRGBColorSpace;return t;};
    for(const [key,file,size,normal] of [['asphalt','asphalt_4k.webp',4.5,'asphalt_01_nor_gl.webp'],['concrete','concrete_4k.webp',3.5,'concrete_wall_009_nor_gl.webp'],['grass','meadow-v2.webp',3,'']]){
      m[key].map=load(file,true);m[key].color.set(key==='grass'?'#94b69b':key==='concrete'?'#999b94':'#687176');m[key].userData.textureMetres=size;
      if(normal){m[key].normalMap=load(normal);m[key].normalScale.setScalar(key==='asphalt'?.32:.24);}
    }
    m.edge.map=m.concrete.map;m.edge.normalMap=m.concrete.normalMap;m.edge.normalScale.setScalar(.25);m.edge.userData.textureMetres=3.5;
    // Painted steel uses the selected sRGB colour directly; a dark diffuse map hid the finishes.
    for(const [key,file,size] of [['earth','meadow-v2.webp',3],['tree','foliage-v2.webp',0],['treeLight','foliage-v2.webp',0]]){
      const t=load(file,true);
      m[key].map=t;m[key].color.set(key==='treeLight'?'#b8c2a0':'#ffffff');
      if(size){t.wrapS=t.wrapT=T.RepeatWrapping;m[key].userData.textureMetres=size;m[key].bumpMap=t;m[key].bumpScale=.035;}
      else {m[key].alphaTest=.45;m[key].side=T.DoubleSide;m[key].roughness=.9;m[key].emissive.set('#758354');m[key].emissiveIntensity=.18;}
    }
    m.building.map=m.concrete.map.clone();m.building.map.repeat.set(3,3);m.building.color.set('#c6c0b4');
    m.glass.color.set('#546774');m.glass.roughness=.22;m.roof.color.set('#656561');m.truck.color.set('#b49062');
  }
  m.water=material('#385d59',.42,0);m.water.userData.flowTime={value:0};m.foam=new T.LineBasicMaterial({color:'#d8f1df',transparent:true,opacity:.16});
  m.water.onBeforeCompile=shader=>{
    shader.uniforms.flowTime=m.water.userData.flowTime;
    shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec2 riverPosition;').replace('#include <begin_vertex>','#include <begin_vertex>\nriverPosition=uv;');
    shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>
uniform float flowTime; varying vec2 riverPosition;
float riverHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float riverNoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(riverHash(i),riverHash(i+vec2(1,0)),f.x),mix(riverHash(i+vec2(0,1)),riverHash(i+vec2(1,1)),f.x),f.y);}`).replace('#include <color_fragment>',`#include <color_fragment>\nvec2 q=vec2(riverPosition.x-flowTime*.85,riverPosition.y);float streak=riverNoise(q*vec2(.35,2.8)+vec2(0.,sin(q.x*.09)*1.2));float glint=smoothstep(.72,.95,streak);diffuseColor.rgb*=.85+.22*riverNoise(q*.08);diffuseColor.rgb+=vec3(.018,.025,.022)*glint;`).replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>\nvec2 p=vec2(riverPosition.x-flowTime*.85,riverPosition.y);vec3 rippleNormal=vec3(riverNoise(p*vec2(.4,2.3))-.5,0.0,riverNoise(p*vec2(.3,3.1)+7.)-.5);normal=normalize(normal+mat3(viewMatrix)*rippleNormal*.065);`);
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
export function boxSection(h,top,plate=.05,web=.014) {
  const bottom=top-h/2;
  if(bottom<=2*plate+web)return null;
  return {top:[[-top/2,0],[top/2,0],[top/2,-plate],[-top/2,-plate]],bottom:[[-bottom/2,-h+plate],[bottom/2,-h+plate],[bottom/2,-h],[-bottom/2,-h]],left:[[-top/2,0],[-top/2+web,0],[-bottom/2+web,-h],[-bottom/2,-h]],right:[[bottom/2, -h],[bottom/2-web,-h],[top/2-web,0],[top/2,0]]};
}
const rect=(a,b,top,bottom)=>[[a,top],[b,top],[b,bottom],[a,bottom]];

// A section swept along the actual alignment. Every edge meets the support skew plane.
export function sweep(c,a,b,section,mat,height=profile,segments) {
  const sectionAt=typeof section==='function'?section:()=>section;
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
export function boxGirder(c,a,b,u,mat){
  const group=new T.Group();group.name='Hollow steel box';
  for(const plate of ['top','bottom','left','right']){
    const section=station=>{
      const d=girderDepth(c,supportStation(c,station,u),u);
      return boxSection(d,c.boxTopWidth,.05,c.web)[plate].map(([x,y])=>[x+u,y]);
    };
    const mesh=sweep(c,a,b,section,mat,(_,s)=>girderTop(c,0,s));mesh.name='Box '+plate;group.add(mesh);
  }
  return group;
}
export function slabMesh(c,a,b,mat){
  return sweep(c,a,b,rect(-c.width/2,c.width/2,-c.asphalt,-c.asphalt-c.slabDepth),mat,
    (_,s,v,u)=>profile(c,s)+(v<-c.asphalt?c.slabDepth-girderDepth(c,s,u):0));
}
function box(parent,mat,x,y,z,w,h,d,yaw=0){
  const o=new T.Mesh(new T.BoxGeometry(w,h,d),mat);o.position.set(x,y,z);o.rotation.y=yaw;o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;
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
export const vehicleKinds=['sedan','suv','hatchback','pickup','van','truck','semi'];
export function vehicle(parent,m,c,s,u,type,forward=true,road){
  if(!c.showTraffic)return;
  if(type==='car')type='sedan';
  const truck=type==='truck'||type==='semi',semi=type==='semi',van=type==='van',pickup=type==='pickup',suv=type==='suv',hatch=type==='hatchback';
  const length=semi?12:truck?8:van?5.6:pickup?5.5:hatch?4.1:suv?4.8:4.6,width=truck?2.4:van?2.1:pickup||suv?2:1.85;
  const halfLength=length/2+.1,halfWidth=truck?1.47:width/2+.2;
  if(road){if(Math.abs(u)+halfWidth>road.width/2-.2)return;}
  else if(!vehicleFits(c,s,u,halfLength,halfWidth))return;
  const f=road?{x:road.x+road.dx*s+road.nx*u,z:road.z+road.dz*s+road.nz*u,tx:road.dx,tz:road.dz}:frame(c,s,u);
  const group=new T.Group(),paint=m['paint'+(Math.abs(Math.floor(s*3+u*7+c.seed))%7)];
  group.name=type;group.position.set(f.x,(road?road.elevation:profile(c,s))+.035,f.z);group.rotation.y=-Math.atan2(f.tz,f.tx)+(forward?0:Math.PI);
  const part=(mat,x,y,z,w,h,d)=>box(group,mat,x,y,z,w,h,d);
  const shell=(mat,outline,depth)=>{
    const shape=new T.Shape();outline.forEach(([x,y],i)=>i?shape.lineTo(x,y):shape.moveTo(x,y));shape.closePath();
    const g=new T.ExtrudeGeometry(shape,{depth,bevelEnabled:true,bevelSize:.035,bevelThickness:.035,bevelSegments:1,steps:1,curveSegments:1});g.translate(0,0,-depth/2);
    const mesh=new T.Mesh(g,mat);mesh.castShadow=mesh.receiveShadow=true;group.add(mesh);
  };
  let axles,radius;
  if(truck){
    const cabX=length/2-1.15,cargoLength=semi?8:5.4,cargoX=semi?-1.6:-1.15;
    part(m.dark,0,.65,0,length-.2,.25,2);
    part(m.edge,cargoX,2.15,0,cargoLength,2.65,2.4);
    shell(paint,[[cabX-1,.6],[cabX+1,.6],[cabX+1,2.15],[cabX+.65,2.65],[cabX-.85,2.65],[cabX-1,2.25]],2.35);
    part(m.glass,cabX+.98,2.05,0,.04,.62,2.06);
    part(m.dark,cabX+1.01,1.12,0,.04,.45,1.4);
    for(const side of [-1,1]){
      part(m.glass,cabX+.08,2.14,side*1.18,1.45,.62,.03);
      part(m.railing,cabX-.1,.68,side*1.22,1.45,.16,.3);
      part(m.dark,cabX+.75,1.92,side*1.36,.16,.4,.18);
      part(paint,cargoX,1.35,side*1.205,cargoLength-.1,.17,.025);
      for(let x=cargoX-cargoLength/2+.4;x<cargoX+cargoLength/2;x+=.7)part(m.railing,x,2.23,side*1.204,.023,2.28,.018);
    }
    part(m.dark,cargoX-cargoLength/2-.012,2.08,0,.035,2.4,.045);
    if(semi)part(m.dark,2.1,1.0,0,1.05,.18,1.8);
    axles=semi?[-4.9,-3.9,2.5,4.7]:[-3,-2,2.9];radius=.46;
  }else{
    const half=length/2,bodyTop=van?1.1:pickup||suv?.95:.82,roof=van?2.48:suv?1.88:pickup?1.8:hatch?1.55:1.5;
    shell(paint,[[-half,.4],[-half,bodyTop-.13],[-half+.3,bodyTop],[half-.42,bodyTop],[half,bodyTop-.18],[half,.42]],width);
    const rear=van?-2.45:pickup?-.15:hatch?-1.55:suv?-1.65:-1.4,front=van?1.85:pickup?1.8:1.25;
    shell(m.glass,[[rear,bodyTop],[front,bodyTop],[front-.55,roof-.08],[rear+.3,roof-.08]],width-.16);
    part(paint,(rear+front-.25)/2,roof,0,front-rear-.85,.08,width-.17);
    for(const side of [-1,1]){
      part(paint,(rear+front)/2,bodyTop+.035,side*(width-.1)/2,front-rear,.09,.055);
      for(const x of [rear+.35,(rear+front)/2,front-.58])part(paint,x,(roof+bodyTop)/2,side*(width-.1)/2,.075,roof-bodyTop,.045);
      part(m.dark,front-.2,bodyTop+.18,side*(width/2+.10),.24,.15,.18);
      part(m.railing,front-.7,bodyTop-.1,side*(width/2+.04),.21,.035,.026);
      part(m.dark,0,.37,side*(width/2-.02),length-.45,.12,.05);
    }
    if(pickup){
      part(m.dark,-1.55,.83,0,1.8,.05,width-.28);
      for(const side of [-1,1])part(paint,-1.6,1.02,side*(width/2-.08),1.9,.34,.16);
      part(paint,-half+.08,1.02,0,.16,.34,width);
    }
    if(van){for(const side of [-1,1])part(paint,-1.5,1.67,side*(width-.1)/2,1.7,1.03,.045);}
    part(m.dark,half+.012,bodyTop-.22,0,.035,.19,width*.48);
    part(m.railing,half+.025,.43,0,.035,.08,width*.8);
    axles=[-length*.30,length*.30];radius=van||pickup||suv?.38:.32;
  }
  const front=length/2+.025,rear=-length/2-.025;
  for(const side of [-1,1]){
    part(m.white,front,.74,side*width*.36,.045,.15,width*.23);
    part(m.vehicle,rear,.77,side*width*.38,.045,.19,width*.18);
    part(m.reflector,front+.01,.65,side*width*.41,.048,.045,.10);
  }
  for(const x of [front,rear])part(m.white,x,.49,0,.025,.10,.36);
  for(const x of axles)for(const side of [-1,1]){
    const wheel=new T.Mesh(new T.CylinderGeometry(radius,radius,.25,20),m.wheel);wheel.rotation.x=Math.PI/2;wheel.position.set(x,radius,side*width/2);group.add(wheel);
    const hub=new T.Mesh(new T.CylinderGeometry(radius*.62,radius*.62,.262,12),m.railing);hub.rotation.x=Math.PI/2;hub.position.copy(wheel.position);group.add(hub);
    const centre=new T.Mesh(new T.CylinderGeometry(radius*.19,radius*.19,.273,10),m.dark);centre.rotation.x=Math.PI/2;centre.position.copy(wheel.position);group.add(centre);
    for(let i=0;i<5;i++){const spoke=part(m.dark,x,radius,side*(width/2+.138),radius*.9,.035,.012);spoke.rotation.z=i*Math.PI/5;}
  }
  group.rotation.z=Math.atan(road?0:(profile(c,s+.1)-profile(c,s-.1))/.2)*(forward?1:-1);
  parent.userData.vehicles??=[];parent.userData.vehicles.push({s,u,type,forward,road:!!road,halfLength,halfWidth});
  let traffic=parent.children.find(o=>o.name==='Traffic');if(!traffic){traffic=new T.Group();traffic.name='Traffic';parent.add(traffic);}
  group.updateMatrixWorld(true);for(const child of [...group.children]){child.applyMatrix4(group.matrix);traffic.add(child);}
}

export const guardrailSection = [[-.04,.53],[.035,.57],[.05,.62],[-.025,.68],[.05,.74],[.035,.80],[-.04,.84],[-.044,.836],[.030,.797],[.044,.741],[-.031,.680],[.044,.619],[.030,.573],[-.044,.534]];
function bridgeRailing(parent,m,c,a,b,u,baseOffset=0){
  const width=.14,height=.18,t=.006;
  // Four steel plates form each rectangular HSS, including visible hollow ends.
  for(const centre of [.34,.68,1.01])for(const section of [
    rect(u-width/2,u+width/2,centre+height/2,centre+height/2-t),
    rect(u-width/2,u+width/2,centre-height/2+t,centre-height/2),
    rect(u-width/2,u-width/2+t,centre+height/2-t,centre-height/2+t),
    rect(u+width/2-t,u+width/2,centre+height/2-t,centre-height/2+t)
  ])parent.add(sweep(c,a,b,section,m.railing,(_,q)=>profile(c,q)+baseOffset));
  const count=Math.max(1,Math.ceil((b-a)/2.5));
  for(let j=0;j<=count;j++){
    const q=supportStation(c,a+(b-a)*j/count,u),p=frame(c,q,u),y=profile(c,q)+baseOffset,angle=-Math.atan2(p.tz,p.tx);
    box(parent,m.railing,p.x,y+.018,p.z,.28,.036,.26,angle);
    for(const side of [-1,1]){
      box(parent,m.railing,p.x+side*.067*p.tx,y+.51,p.z+side*.067*p.tz,.006,.99,.12,angle);
      box(parent,m.railing,p.x+side*.057*p.nx,y+.51,p.z+side*.057*p.nz,.128,.99,.006,angle);
    }
    for(const x of [-.10,.10])for(const z of [-.085,.085])box(parent,m.dark,p.x+x*p.tx+z*p.nx,y+.045,p.z+x*p.tz+z*p.nz,.025,.018,.025,angle);
    if(j%2===0)box(parent,m.reflector,p.x,y+.82,p.z-Math.sign(u)*.09,.13,.06,.012,angle);
  }
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
  const fills=approachSurfaces(c);
  m.steel.color.set(steelFinishes[c.steelColor]);m.steel.metalness=c.steelColor==='weathered'?.05:.12;m.steel.roughness=c.steelColor==='weathered'?.87:.52;
  const root=new T.Group(),deck=new T.Group(),structure=new T.Group(),setting=new T.Group();
  root.name='BridgeSketch 3D';deck.name='Deck and barriers';structure.name='Girders and supports';setting.name='Environment';root.add(deck,structure,setting);
  const ss=stations(c),L=totalLength(c),half=c.width/2,gspace=spacing(c),layout=roadLayout(c),leftSide=layout.left,rightSide=layout.right,roadMin=layout.roadMin,roadMax=layout.roadMax;
  const addSweep=(group,a,b,section,mat,height,segments)=>{const o=sweep(c,a,b,section,mat,height,segments);group.add(o);return o;};
  const addMedian=(a,b)=>{
    if(!layout.medianWidth)return;
    const section=c.medianType==='barrier'?[[-.3,0],[-.3,.12],[-.16,.42],[-.12,1.1],[.12,1.1],[.16,.42],[.3,.12],[.3,0]].map(([u,y])=>[u+layout.medianCentre,y]):rect(layout.medianMin,layout.medianMax,.2,0);
    const median=addSweep(deck,a,b,section,m.concrete);median.name='Centre median';
    for(const u of [layout.medianMin-.09,layout.medianMax+.09])addSweep(deck,a,b,rect(u-.035,u+.035,.012,.003),m.yellow);
  };
  const addBoxGirder=(group,a,b,u)=>{const box=boxGirder(c,a,b,u,m.steel);for(const mesh of [...box.children])group.add(mesh);};
  c.spans.forEach((span,i)=>{
      const a=ss[i]+(c.continuous?0:.025),b=ss[i+1]-(c.continuous?0:.025);
    if(c.material==='slab')structure.add(slabMesh(c,a,b,m.concrete));
    else addSweep(deck,a,b,rect(-half,half,-c.asphalt,-c.asphalt-c.deck),m.concrete);
    addSweep(deck,a,b,rect(-half,half,0,-c.asphalt),m.asphalt);
    if(leftSide)addSweep(deck,a,b,rect(-half,roadMin,.2,0),m.concrete);
    if(rightSide)addSweep(deck,a,b,rect(roadMax,half,.2,0),m.concrete);
    for(const side of [-1,1]){
      const edge=side*half;
      if(c.barrierType==='concrete'){
        const section=[[0,0],[-.45,0],[-.45,.10],[-.23,.35],[-.18,c.barrier],[-.02,c.barrier],[0,.15]].map(([u,v])=>[edge+side*u,v]);
        if(side<0)section.reverse();const raised=((side<0&&leftSide)||(side>0&&rightSide))?.2:0;addSweep(deck,a,b,section,m.edge,(_,s)=>profile(c,s)+raised);
      }else {const railBase=((side<0&&leftSide)||(side>0&&rightSide)) ? .2 : 0;bridgeRailing(deck,m,c,a,b,side*(half-.16),railBase);}
      const edgeLine=side<0?roadMin+.12:roadMax-.12;addSweep(deck,a,b,rect(edgeLine-.05,edgeLine+.05,.008,.002),m.white);
    }
    addMedian(a,b);
    for(const {u,opposing} of layout.dividers)for(let s=a+1;s<b-1;s+=6)addSweep(deck,s,Math.min(s+3,b-.1),rect(u-.035,u+.035,.011,.003),opposing?m.yellow:m.white,undefined,1);
    for(let g=0;g<(c.material==='slab'?0:c.girders);g++){
      const u=-half+c.overhang+g*gspace;
      if(!(c.continuous&&(c.material==='steel'||c.material==='box'))){
        if(c.material==='box')addBoxGirder(structure,a+.22,b-.22,u);else {const section=(c.material==='concrete'?nebtSection(c.depth):steelSection(c.depth,c.web)).map(([x,y])=>[x+u,y]);const top=(_,s,v,u)=>girderTop(c,i,s)+(c.material==='steel'&&v<-.05?c.depth-girderDepth(c,s,u):0);const girder=addSweep(structure,a+.22,b-.22,section,c.material==='concrete'?m.concrete:m.steel,top,c.material==='concrete'?1:undefined);girder.name=`Span ${i+1} girder ${g+1}`;}
      }
      // Fill from the straight girder chord to the deck profile.
      const haunchHeight=(_,s,v)=>v===0?profile(c,s)-c.asphalt-c.deck:girderTop(c,i,s)+1;
      addSweep(structure,a+(c.continuous?0:.22),b-(c.continuous?0:.22),rect(u-(c.material==='box'?c.boxTopWidth/2:.19),u+(c.material==='box'?c.boxTopWidth/2:.19),0,-1),m.concrete,haunchHeight);
    }
    for(let s=a+1.2;s<b&&c.material!=='slab';s+=Math.max(5,(b-a-2.4)/3))for(let g=0;g<c.girders-1;g++){
      const u=-half+c.overhang+g*gspace,top=girderTop(c,i,s)-.13,bot=top-Math.min(girderDepth(c,s,u),girderDepth(c,s,u+gspace))+.26;
      if(c.material==='steel'||c.material==='box'){
        beam(structure,m.steel,point(c,s,u+(c.material==='box'?c.boxTopWidth/2:.1),top),point(c,s,u+gspace-(c.material==='box'?c.boxTopWidth/2:.1),bot),.085,.085);
        beam(structure,m.steel,point(c,s,u+(c.material==='box'?c.boxTopWidth/2:.1),bot),point(c,s,u+gspace-(c.material==='box'?c.boxTopWidth/2:.1),top),.085,.085);
      }else beam(structure,m.concrete,point(c,s,u,top-c.depth*.4),point(c,s,u+gspace,top-c.depth*.4),.25,c.depth*.52);
    }
    if(c.showTraffic)layout.laneCenters.forEach((u,lane)=>{
      const type=vehicleKinds[(i*c.laneCount+lane+c.seed)%vehicleKinds.length],s=a+(b-a)*(lane%2?.65:.35);
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
      const direction=j===0?-1:1,wallY=(top+earth)/2;
      wallBetween(structure,m.concrete,supportPoint(c,s+direction*.8,-half+.15,0),supportPoint(c,s+direction*.8,half-.15,0),.4,top,Math.max(top+.2,profile(c,s)-c.asphalt));
      for(const side of [-1,1]){
        const u=side*(half-.3),p0=supportPoint(c,s,u,wallY),f=frame(c,supportStation(c,s,u),u),a=(c.abutmentType==='wing'?c.wingAngle:0)*Math.PI/180;
        const corner=fills.corners.find(p=>p.end===s&&p.side===side),length=Math.max(6,Math.abs(corner.station-s));
        const vx=direction*f.tx*Math.cos(a)+side*f.nx*Math.sin(a),vz=direction*f.tz*Math.cos(a)+side*f.nz*Math.sin(a),p1=c.abutmentType==='return'?supportPoint(c,s+direction*length,u,wallY):[p0[0]+vx*length,wallY,p0[2]+vz*length];
        wallBetween(structure,m.concrete,p0,p1,.45,earth,Math.max(top+.2,profile(c,s)-.17));
      }
    }else if(c.pierType==='wall'){
      wallBetween(structure,m.concrete,supportPoint(c,s,-half+.15,0),supportPoint(c,s,half-.15,0),c.wallThickness,earth,top);
      wallBetween(structure,m.concrete,supportPoint(c,s,-half+.15,0),supportPoint(c,s,half-.15,0),1.9,top-.4,top);
    }else{
      const capHeight=c.pierType==='hammerhead'?c.hammerheadThickness:1;
      wallBetween(structure,m.concrete,supportPoint(c,s,-half+.15,0),supportPoint(c,s,half-.15,0),1.9,top-capHeight,top);
      const us=c.pierType==='hammerhead'||c.columns===1?[0]:Array.from({length:c.columns},(_,n)=>-c.width*.32+n*c.width*.64/(c.columns-1));
      for(const u of us){
        const f=supportBasis(c,s,u),height=top-capHeight-earth;
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
    addSweep(deck,a,b,rect(-half,half,0,-.17),m.asphalt);
    if(leftSide)addSweep(deck,a,b,rect(-half,roadMin,.2,0),m.concrete);
    if(rightSide)addSweep(deck,a,b,rect(roadMax,half,.2,0),m.concrete);
    for(const u of [roadMin,roadMax])addSweep(deck,a,b,rect(u-.055,u+.055,.009,.002),m.white);
    addMedian(a,b);
    for(const {u,opposing} of layout.dividers)for(let s=a+1;s<b-1;s+=6)addSweep(deck,s,Math.min(b-.1,s+3),rect(u-.035,u+.035,.012,.003),opposing?m.yellow:m.white,undefined,1);
    for(const u of [-half+.05,half-.05])roadsideGuardrail(deck,m,c,a,b,u);
  }
  const waters=addEnvironment(c,m,setting,fills);
  if(batch)for(const group of [deck,structure,setting]){for(const child of group.children)if(child.name==='Traffic')batchMeshes(child);batchMeshes(group);}
  return {root,deck,structure,setting,waters,traffic:deck.children.find(o=>o.name==='Traffic'),config:c};
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
export function approachSurfaces(c){
  const L=totalLength(c),half=c.width/2+.6,ground=terrainSampler(c),surfaces=[];
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
    const corners=[];
    for(const side of [-1,1]){
      const cone=setback=>{
        const station=end-toward*setback,{p,f}=apex(station,half*side),ring=[];
        for(let i=0;i<=24;i++){const angle=i*Math.PI/48;ring.push(toe(p,side*f.nx*Math.cos(angle)+toward*f.tx*Math.sin(angle),side*f.nz*Math.cos(angle)+toward*f.tz*Math.sin(angle)));}
        return {end,side,station,p,ring,intrusion:Math.max(...ring.map(intrusion))};
      };
      // Move the crest back, never flatten the 2:1 slope: its foremost toe
      // lands on the abutment plane, including skew and curved alignment.
      let lo=0,hi=8;while(cone(hi).intrusion>0&&hi<512)hi*=2;
      for(let i=0;i<24;i++){const mid=(lo+hi)/2;if(cone(mid).intrusion>0)lo=mid;else hi=mid;}
      const corner=cone(hi);corners.push(corner);surfaces.corners.push(corner);
    }
    const outer=end-toward*Math.max(c.approach+18,...corners.map(p=>Math.abs(p.station-end)+8));
    const a=Math.min(outer,end),b=Math.max(outer,end);surfaces.ranges.push([a,b]);
    const local=[];
    for(let s=a;s<b;s+=1){const t=Math.min(b,s+1);local.push([apex(s,-half).p,apex(s,half).p,apex(t,half).p,apex(t,-half).p]);}
    for(const corner of corners){
      const side=corner.side,a=Math.min(outer,corner.station),b=Math.max(outer,corner.station);
      for(let s=a;s<b;s+=1){const p=apex(s,half*side),q=apex(Math.min(b,s+1),half*side);local.push([p.p,q.p,toe(q.p,q.f.nx*side,q.f.nz*side),toe(p.p,p.f.nx*side,p.f.nz*side)]);}
      for(let i=0;i<24;i++)local.push([corner.p,corner.ring[i],corner.ring[i+1]]);
    }
    // Clip numerical/curve overshoot at the same abutment plane.
    for(const face of local){
      const clipped=[];
      for(let i=0;i<face.length;i++){const p=face[i],q=face[(i+1)%face.length],dp=intrusion(p),dq=intrusion(q);if(dp<=1e-7)clipped.push(p);if((dp>1e-7)!==(dq>1e-7)){const t=dp/(dp-dq);clipped.push(p.map((v,j)=>v+t*(q[j]-v)));}}
      if(clipped.length>=3)surfaces.push(clipped);
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
function addEnvironment(c,m,parent,fills){
  const L=totalLength(c),ss=stations(c),points=fills.flat(),extent=Math.max(L+2*c.approach+36,...points.map(p=>2*Math.abs(p[0])+8)),halfZ=Math.max(55,...points.map(p=>Math.abs(p[2])+8)),rng=seeded(c.seed),obstacles=[],waters=[];
  const fillPos=[];
  for(const p of fills)for(let i=1;i<p.length-1;i++){
    const a=p[0],b=p[i],d=p[i+1],up=(b[2]-a[2])*(d[0]-a[0])-(b[0]-a[0])*(d[2]-a[2]);
    fillPos.push(...a,...(up>=0?b:d),...(up>=0?d:b));
  }
  const fillGeometry=new T.BufferGeometry();fillGeometry.setAttribute('position',new T.Float32BufferAttribute(fillPos,3));fillGeometry.computeVertexNormals();
  const fill=new T.Mesh(fillGeometry,m.grass);fill.name='2H:1V approach fills and quarter cones';fill.receiveShadow=true;fill.castShadow=true;parent.add(fill);
  c.spans.forEach((s,i)=>{if(s.obstacle!=='water')obstacles.push(crossing(c,(ss[i]+ss[i+1])/2,s.angle,s.width,s.elevation,s.obstacle));});
  for(const g of waterGroups(c)){
    const first=c.spans[g.startIndex],last=c.spans[g.endIndex];
    const start=g.start+Math.max(1,(first.length-first.width)/2),end=g.end-Math.max(1,(last.length-last.width)/2);
    const width=g.startIndex===g.endIndex?Math.min(first.width,first.length-2):(end-start)*Math.sin(g.angle*Math.PI/180);
    const o=crossing(c,(start+end)/2,g.angle,width,g.elevation,'water');obstacles.push(o);
    const pos=[],indices=[],uv=[];
    for(let j=0;j<=60;j++)for(const side of [-1,1]){const along=-64+j*128/60;pos.push(...world(o,along,side*width/2+riverWiggle(along),g.elevation));uv.push(j/60,(side+1)/2);}
    for(let j=0;j<60;j++){const k=j*2;indices.push(k,k+1,k+2,k+1,k+3,k+2);}
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
  for(let i=0;i<terrainPos.count;i++)terrainPos.setY(i,terrainHeight(terrainPos.getX(i),terrainPos.getZ(i)));terrainGeo.computeVertexNormals();const terrain=new T.Mesh(terrainGeo,m.grass);terrain.receiveShadow=true;parent.add(terrain);
  // Border skirt follows the terrain edge, keeping the diorama watertight visually.
  const base=Math.min(-1.5,...c.spans.map(s=>s.elevation-1.5));
  for(const z of [-halfZ,halfZ])for(let x=-extent/2;x<extent/2;x+=2){const w=Math.min(2,extent/2-x),y=terrainHeight(x+w/2,z);box(parent,m.earth,x+w/2,(y+base)/2,z,w,y-base,.25);}
  for(const x of [-extent/2,extent/2])for(let z=-halfZ;z<halfZ;z+=2){const d=Math.min(2,halfZ-z),y=terrainHeight(x,z+d/2);box(parent,m.earth,x,(y+base)/2,z+d/2,.25,y-base,d);}
  box(parent,m.earth,0,base-.2,0,extent,.4,halfZ*2);
  for(const o of obstacles.filter(o=>o.type!=='water')){
    const halfLength=Math.max(1,Math.min(halfZ+10,(extent/2-Math.abs(o.x)-Math.abs(o.nx)*o.width/2)/Math.max(.001,Math.abs(o.dx)),(halfZ-Math.abs(o.z)-Math.abs(o.nz)*o.width/2)/Math.max(.001,Math.abs(o.dz))));
    const basePos=world(o,0,0,o.elevation-.1);box(parent,o.type==='road'?m.asphalt:m.sand,...basePos,2*halfLength,.2,o.width,o.yaw);
    if(o.type==='road'){
      for(const side of [-1,1])box(parent,m.white,...world(o,0,side*(o.width/2-.3),o.elevation+.013),2*halfLength,.018,.10,o.yaw);
      for(let t=-halfLength+2;t<halfLength-2;t+=6)box(parent,m.yellow,...world(o,t,0,o.elevation+.016),3,.02,.10,o.yaw);
      roadsideGuardrail(parent,m,c,-halfLength,halfLength,o.width/2+.35,o);roadsideGuardrail(parent,m,c,-halfLength,halfLength,-o.width/2-.35,o);
      if(c.showTraffic&&o.width>=6.4)for(const t of [-halfLength*.6,halfLength*.6])vehicle(parent,m,c,t,(t<0?1:-1)*o.width/4,t<0?'car':'truck',t<0,o);
    }else{
      const tracks=o.width>=7?[-1.8,1.8]:[0];
      for(const offset of tracks){
        for(let t=-halfLength+.2;t<halfLength-.2;t+=.7)box(parent,m.trunk,...world(o,t,offset,o.elevation+.06),.22,.12,2.5,o.yaw);
        for(const side of [-.7175,.7175])box(parent,m.dark,...world(o,0,offset+side,o.elevation+.16),2*halfLength,.16,.08,o.yaw);
      }
    }
  }
  const roadZones=roadFootprints(c,fills);
  const occupied=(x,z,margin=2)=>{
    for(const o of obstacles){const p=coordinates(o,x,z);if(Math.abs(p.across-(o.type==='water'?riverWiggle(p.along):0))<o.width/2+margin)return true;}
    return intersectsRoad(roadZones,x,z,margin);
  };
  const trees=[];
  for(let i=0;i<2400&&c.environment==='rural'&&trees.length<220;i++){
    const x=(rng()-.5)*(extent-12),z=(rng()-.5)*98,scale=1.1+rng()*1.5;
    if(!occupied(x,z,scale*3.5+1))trees.push({x,z,y:terrainHeight(x,z),scale,rotation:rng()*Math.PI});
  }
  const instanced=(geo,mat,items,transform)=>{if(!items.length){geo.dispose();return;}const mesh=new T.InstancedMesh(geo,mat,items.length),dummy=new T.Object3D();items.forEach((item,i)=>{transform(dummy,item);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);});mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;};
  const rocks=[];
  for(const o of obstacles.filter(o=>o.type==='water'))for(let along=-53;along<53;along+=1.8)for(const side of [-1,1]){
    const p=world(o,along,riverWiggle(along)+side*(o.width/2+.4+rng()*1.8),0);
    if(Math.abs(p[0])<extent/2-1&&Math.abs(p[2])<54)rocks.push({x:p[0],z:p[2],y:terrainHeight(p[0],p[2]),s:.2+rng()*.5,r:rng()*6});
  }
  instanced(new T.DodecahedronGeometry(1,0),m.sand,rocks,(d,r)=>{d.position.set(r.x,r.y,r.z);d.scale.set(r.s,r.s*.45,r.s*.8);d.rotation.set(.2,r.r,.15);});
  instanced(new T.CylinderGeometry(.11,.16,1,6),m.trunk,trees,(d,t)=>{d.position.set(t.x,t.y+t.scale*.75,t.z);d.scale.set(t.scale,t.scale*1.5,t.scale);});
  const crowns=[];
  for(const t of trees)for(let k=0;k<4;k++){const a=t.rotation+k*1.9;beam(parent,m.trunk,[t.x,t.y+t.scale,t.z],[t.x+Math.cos(a)*t.scale*.7,t.y+t.scale*(2.1+k*.13),t.z+Math.sin(a)*t.scale*.7],.055*t.scale,.055*t.scale);}
  for(const t of trees)for(let k=0;k<9;k++){const angle=k*2.4+t.rotation,r=k===0?0:t.scale*(.35+rng()*.5);crowns.push({x:t.x+Math.cos(angle)*r,z:t.z+Math.sin(angle)*r,y:t.y+t.scale*(1.7+rng()*1.2),s:t.scale*(.45+rng()*.3),r:angle});}
  const cards=[];
  for(const t of crowns)for(let j=0;j<3;j++)cards.push({...t,angle:t.r+j*Math.PI/3,tilt:j===2?Math.PI/3:.12});
  for(const [index,mat] of [m.tree,m.treeLight].entries()){
    const foliage=instanced(new T.PlaneGeometry(3.2,3.2),mat,cards.filter((_,i)=>i%2===index),(d,t)=>{d.position.set(t.x,t.y,t.z);d.scale.setScalar(t.s);d.rotation.set(t.tilt,t.angle,.1);});
    if(foliage)foliage.customDepthMaterial=new T.MeshDepthMaterial({depthPacking:T.RGBADepthPacking,map:mat.map,alphaTest:.45,side:T.DoubleSide});
  }
  const grasses=[];
  for(let i=0;i<15000;i++){const x=(rng()-.5)*(extent-4),z=(rng()-.5)*102;if(!occupied(x,z,1.2))grasses.push({x,z,y:terrainHeight(x,z),s:.15+rng()*.35,r:rng()*Math.PI});}
  const blades=[];for(let k=0;k<5;k++){const a=k*2.4,x=Math.cos(a)*.18,z=Math.sin(a)*.18;blades.push(x-.055,0,z,x+.055,0,z,x+.13,.7+(k%3)*.14,z+.08);}
  const tuft=new T.BufferGeometry();tuft.setAttribute('position',new T.Float32BufferAttribute(blades,3));tuft.computeVertexNormals();m.grassBlade.side=T.DoubleSide;
  instanced(tuft,m.grassBlade,grasses,(d,g)=>{d.position.set(g.x,g.y,g.z);d.scale.setScalar(g.s);d.rotation.y=g.r;});
  if(c.environment==='urban'){
    const buildings=[];
    for(let x=-extent/2+14;x<extent/2-9;x+=13)for(let z=-43;z<48;z+=15){const b={x,z,y:terrainHeight(x,z),h:3+rng()*8,w:5+rng()*3,d:5+rng()*3};if(!occupied(x,z,Math.hypot(b.w+.2,b.d+.2)/2+1)&&rng()>.15)buildings.push(b);}
    instanced(new T.BoxGeometry(1,1,1),m.building,buildings,(d,b)=>{d.position.set(b.x,b.y+b.h/2,b.z);d.scale.set(b.w,b.h,b.d);});
    instanced(new T.BoxGeometry(1,1,1),m.roof,buildings,(d,b)=>{d.position.set(b.x,b.y+b.h+.13,b.z);d.scale.set(b.w+.2,.26,b.d+.2);});
    for(const b of buildings){
      box(parent,m.dark,b.x,b.y+b.h+.5,b.z,1.4,.7,1.8);
      for(const side of [-1,1]){box(parent,m.concrete,b.x+side*b.w/2,b.y+b.h+.35,b.z,.16,.5,b.d);box(parent,m.concrete,b.x,b.y+b.h+.35,b.z+side*b.d/2,b.w,.5,.16);}
    }
    for(const b of buildings)for(let y=1.5;y<b.h-.8;y+=2.2)for(let x=-b.w/2+.8;x<b.w/2-.5;x+=1.6)for(const side of [-1,1])box(parent,m.dark,b.x+x,b.y+y,b.z+side*(b.d/2+.025),.85,1,.04);
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
