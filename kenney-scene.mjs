import * as T from 'three';
import data from './models/kenney-scene-data.mjs';

const templates=new Map();
export const trainStyles=Object.freeze(['mixed','diesel','bullet','city']);
export const buildingStyles=Object.freeze(['building-type-a','building-type-g','building-a','building-j']);

export function kenneyGeometry(name){
  if(!templates.has(name)){
    const source=data[name];if(!source)throw Error(`Unknown Kenney model: ${name}`);
    const geometry=new T.BufferGeometry();
    geometry.setAttribute('position',new T.Float32BufferAttribute(source.positions,3));
    geometry.setAttribute('normal',new T.Float32BufferAttribute(source.normals,3));
    geometry.setAttribute('uv',new T.Float32BufferAttribute(source.uvs,2));
    geometry.setIndex(source.indices);templates.set(name,geometry);
  }
  return templates.get(name).clone();
}

export function kenneySize(name){return data[name].size;}

const consists={
  diesel:['train-carriage-box','train-carriage-box','train-diesel-a'],
  bullet:['train-electric-bullet-c','train-electric-bullet-b','train-electric-bullet-a'],
  city:['train-electric-city-c','train-electric-city-b','train-electric-city-a'],
};

export function makeTrain(style,material,count=6){
  if(!consists[style])throw Error('Select a Kenney train style.');
  if(!Number.isInteger(count)||count<4||count>12)throw Error('Train length must be 4 to 12 cars.');
  const [tail,car,front]=consists[style];
  const group=new T.Group(),names=style==='diesel'?[...Array(count-1).fill(car),front]:[tail,...Array(count-2).fill(car),front],gap=.55;
  const total=names.reduce((n,name)=>n+kenneySize(name)[0],0)+gap*(names.length-1);
  let x=-total/2;
  for(const name of names){
    const mesh=new T.Mesh(kenneyGeometry(name),material),length=kenneySize(name)[0];
    mesh.name=`Kenney ${name}`;mesh.position.x=x+length/2;mesh.castShadow=mesh.receiveShadow=true;group.add(mesh);x+=length+gap;
  }
  group.name=`Kenney ${style} train`;group.userData={source:'Kenney Train Kit (CC0)',length:total,cars:count,width:2.75,frontAxis:'+X'};
  return group;
}
