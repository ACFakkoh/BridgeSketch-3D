import {defaults,validate} from './geometry.mjs';

// Full configurations keep every selection independent of the previous model.
export const presets = [
  {
    id:'river', label:'Green river haunch',
    description:'Three flowing green plate-girder spans, a riverside sidewalk and open steel railings.',
    config:{...defaults,material:'steel',steelColor:'green',width:13.2,girders:5,overhang:1.3,
      depth:1.2,continuous:true,variableDepth:true,pierDepth:2.1,taper:35,
      barrierType:'steel',leftRailing:'210A',rightRailing:'210A',sidewalkSide:'right',sidewalkWidth:2,abutmentType:'return',wingAngle:35,
      elevation:6.8,rise:.45,approach:24,pierType:'bent',columns:2,columnDiameter:1.1,
      bentWidth:1.8,bentThickness:.9,bentEndThickness:.9,environment:'rural',seed:24,laneWidth:3.5,movingTraffic:true,
      spans:[20,28,20].map(length=>({length,obstacle:'water',width:18,elevation:0,angle:90}))}
  },
  {
    id:'nebt', label:'NEBT river crossing',
    description:'A compact two-span precast bridge with broad shoulders and simple rural approaches.',
    config:{...defaults,material:'concrete',width:11.4,girders:4,overhang:1.2,depth:1.4,
      elevation:6.1,rise:.3,approach:22,barrierType:'steel',leftRailing:'210A',rightRailing:'210A',abutmentType:'return',wingAngle:45,
      pierType:'bent',columns:2,columnDiameter:1.1,bentWidth:1.9,bentThickness:1,
      environment:'rural',seed:7,laneWidth:3.5,movingTraffic:true,
      spans:[26,26].map(length=>({length,obstacle:'water',width:22,elevation:0,angle:85}))}
  },
  {
    id:'box', label:'Curved twin boxes',
    description:'Blue paired box girders sweep across city roads and a central railway.',
    config:{...defaults,material:'box',steelColor:'blue',girders:2,boxTopWidth:5.1,boxBottomWidth:3.55,overhang:3.75,
      width:13.6,depth:1.3,continuous:true,variableDepth:true,pierDepth:2.2,taper:30,
      curved:true,radius:160,direction:1,skew:10,elevation:7.4,rise:.45,approach:25,
      barrierType:'steel',leftRailing:'210C',rightRailing:'210C',sidewalkSide:'right',sidewalkWidth:2.5,pierType:'hammerhead',
      columns:1,columnDiameter:1.5,hammerheadWidth:2.5,hammerheadThickness:1,
      environment:'urban',seed:31,laneWidth:3.5,movingTraffic:true,
      spans:[{length:24,obstacle:'road',width:10,elevation:0,angle:80},
        {length:32,obstacle:'rail',width:7,elevation:0,angle:90},
        {length:24,obstacle:'road',width:10,elevation:0,angle:100}]}
  },
  {
    id:'slab', label:'Low park bridge',
    description:'A shallow concrete slab with a gentle pier haunch, sidewalk and open views of the water.',
    config:{...defaults,material:'slab',width:10.6,slabDepth:.5,continuous:true,variableDepth:true,
      pierDepth:.85,taper:40,elevation:3.6,rise:.18,approach:18,
      barrierType:'steel',leftRailing:'210A',rightRailing:'210A',sidewalkSide:'right',sidewalkWidth:1.8,abutmentType:'return',wingAngle:40,
      pierType:'wall',wallThickness:.55,environment:'rural',seed:43,laneWidth:3.5,movingTraffic:true,
      spans:[16,16].map(length=>({length,obstacle:'water',width:12,elevation:0,angle:90}))}
  },
  {
    id:'urban', label:'Urban boulevard',
    description:'Four lanes, a concrete median and sidewalks on both sides, carried by square-column bents.',
    config:{...defaults,material:'concrete',width:23.6,girders:7,overhang:1.5,depth:1.6,
      laneCount:4,laneWidth:3.5,medianType:'barrier',sidewalkSide:'both',sidewalkWidth:2.5,
      barrierType:'concrete',pierType:'bent',columns:3,columnShape:'square',columnDiameter:1.2,
      bentWidth:2.2,bentThickness:1.1,bentEndThickness:1.1,skew:8,elevation:7.4,profile:'constant',grade:.5,
      approach:26,environment:'urban',seed:12,movingTraffic:true,
      spans:[{length:26,obstacle:'road',width:14,elevation:0,angle:90},
        {length:30,obstacle:'rail',width:8,elevation:0,angle:90},
        {length:26,obstacle:'road',width:14,elevation:0,angle:90}]}
  },
  {
    id:'weathered', label:'Weathered railway overpass',
    description:'A skewed single-span steel bridge with warm weathered girders and return walls.',
    config:{...defaults,material:'steel',steelColor:'weathered',width:11.4,girders:4,
      overhang:1.2,depth:1.65,skew:25,elevation:7.3,rise:.25,approach:23,
      barrierType:'steel',leftRailing:'210A',rightRailing:'210A',abutmentType:'return',wingAngle:35,environment:'rural',seed:56,
      laneWidth:3.5,movingTraffic:true,
      spans:[{length:36,obstacle:'rail',width:7,elevation:0,angle:65}]}
  }
];

export function makePreset(id){
  const preset=presets.find(p=>p.id===id);
  if(!preset)throw Error('Select a bridge preset.');
  return validate(structuredClone(preset.config));
}
