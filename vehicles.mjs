import * as T from 'three';
import {mergeGeometries} from './vendor/BufferGeometryUtils.js';
import data from './models/vehicles-data.mjs';

// Kenney Car Kit 3.1, CC0; offline meshes with dedicated automotive materials.
export const vehicleKinds=Object.freeze(['sedan','suv','hatchback','pickup','van','truck','semi']);
const surface=(color,roughness=.5,metalness=0)=>new T.MeshStandardMaterial({color,roughness,metalness});
const finishes={
  paint:surface('#2e6484',.28,.32),rubber:surface('#171c20',.92),trim:surface('#414a50',.48,.28),
  metal:surface('#b5bdc0',.3,.7),glass:surface('#294959',.14,.3),cargo:surface('#d8e0e1',.42,.2),
  headlamp:surface('#f0efdf',.2,.05),taillamp:surface('#9f1d18',.28,.1),amber:surface('#d99c30',.3,.1),
};
finishes.headlamp.emissive.set('#ffdf9d');finishes.headlamp.emissiveIntensity=.16;
finishes.taillamp.emissive.set('#a52310');finishes.taillamp.emissiveIntensity=.15;
const templates=new Map();

export function vehicleDimensions(type){
  const d=type==='semi'?{length:13.3,width:2.74,height:3.78}:data[type==='car'?'sedan':type];
  if(!d)throw new Error(`Unknown vehicle: ${type}`);
  return {length:d.length,width:d.width,height:d.height,halfLength:d.length/2+.08,halfWidth:d.width/2+.06};
}

function modelParts(type){
  if(!templates.has(type)){
    const buckets=new Map();
    for(const part of data[type].meshes){
      const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(part.positions,3));
      geo.setAttribute('normal',new T.Float32BufferAttribute(part.normals,3));geo.setIndex(part.indices);
      if(!buckets.has(part.material))buckets.set(part.material,[]);buckets.get(part.material).push(geo);
    }
    templates.set(type,[...buckets].map(([material,geos])=>{
      const geometry=mergeGeometries(geos,false);geos.forEach(g=>g.dispose());return {material,geometry};
    }));
  }
  return templates.get(type);
}

export function createVehicleModel(type,paintMaterial,materials={}){
  if(type==='car')type='sedan';
  const dimensions=vehicleDimensions(type),group=new T.Group(),paint=paintMaterial??finishes.paint;
  const material=name=>name==='paint'?paint:materials[`vehicle_${name}`]??finishes[name];
  group.name=type;group.userData={...dimensions,source:'Kenney Car Kit 3.1 (CC0)',units:'metres',forwardAxis:'+X'};
  for(const part of modelParts(type==='semi'?'tractor':type)){
    const mesh=new T.Mesh(part.geometry.clone(),material(part.material));mesh.name=`${type} ${part.material}`;
    mesh.castShadow=mesh.receiveShadow=true;if(type==='semi')mesh.position.x=3.9;group.add(mesh);
  }
  if(type==='semi'){
    const box=(name,mat,x,y,z,w,h,d)=>{
      const mesh=new T.Mesh(new T.BoxGeometry(w,h,d),mat);mesh.name=name;mesh.position.set(x,y,z);
      mesh.castShadow=mesh.receiveShadow=true;group.add(mesh);return mesh;
    };
    box('Dry-van trailer',material('cargo'),-2.3,2.44,0,8.7,2.66,2.52);
    box('Trailer chassis',material('trim'),-2.3,1.01,0,8.6,.22,1.94);
    for(const side of [-1,1]){
      box('Trailer lower rail',material('metal'),-2.3,1.17,side*1.27,8.65,.10,.05);
      box('Trailer roof rail',material('metal'),-2.3,3.73,side*1.27,8.65,.08,.05);
      box('Trailer livery',paint,-2.3,1.46,side*1.268,8.5,.15,.014);
      for(let x=-6.45;x<2;x+=1.05){
        box('Trailer panel seam',material('metal'),x,2.46,side*1.269,.015,2.40,.008);
        box('Side marker',material('amber'),x,1.22,side*1.3,.11,.065,.025);
      }
      for(const x of [-5.75,-4.55]){
        const tyre=new T.Mesh(new T.CylinderGeometry(.5,.5,.28,20),material('rubber'));tyre.rotation.x=Math.PI/2;tyre.position.set(x,.5,side*1.16);tyre.castShadow=true;group.add(tyre);
        const rim=new T.Mesh(new T.CylinderGeometry(.30,.30,.293,16),material('metal'));rim.rotation.x=Math.PI/2;rim.position.copy(tyre.position);group.add(rim);
        const hub=new T.Mesh(new T.CylinderGeometry(.11,.11,.31,12),material('trim'));hub.rotation.x=Math.PI/2;hub.position.copy(tyre.position);group.add(hub);
      }
      box('Rear tail lamp',material('taillamp'),-6.669,1.17,side*.92,.032,.16,.34);
      box('Rear door locking bar',material('metal'),-6.669,2.47,side*.66,.024,2.20,.038);
    }
    box('Rear door seam',material('trim'),-6.657,2.44,0,.02,2.46,.025);
    box('Rear underrun bar',material('metal'),-6.56,.53,0,.12,.16,2.12);
  }
  return group;
}
