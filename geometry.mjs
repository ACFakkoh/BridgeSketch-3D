export const defaults = {
  version:1, width:12, overhang:1.2, girders:5, material:'concrete', depth:1.4,
  web:0.014, deck:0.225, slabDepth:0.8, asphalt:0.065, haunch:0.1, barrier:1.1,
  continuous:false, variableDepth:false, pierDepth:2.4, taper:30, steelColor:'brown',
  barrierType:'concrete', leftRailing:'concrete', rightRailing:'concrete', sidewalkRailing:'none', abutmentType:'return', wingAngle:30, laneCount:2, sidewalkSide:'none', sidewalkWidth:3, showTraffic:true, boxTopWidth:2.4, boxBottomWidth:1.7,
  laneWidth:3.5, movingTraffic:true, trafficMode:'vehicles', waterStyle:'natural', skyMode:'clear', bentWidth:1.9, bentThickness:1, bentEndThickness:1,
  pierType:'bent', columns:2, columnShape:'round',
  columnDiameter:1.3, hammerheadWidth:2.4, hammerheadThickness:1.0, wallThickness:0.8,
  skew:0, curved:false, radius:250, direction:1,
  elevation:7, profile:'crest', rise:0.45, grade:0, approach:22, frontSlope:false, frontSlopeMaterial:'grass', approachConeMaterial:'grass',
  environment:'rural', terrainMode:'grass', sceneWidth:140, background:'blue', timeOfDay:17.5, seed:17, trainStyle:'mixed', medianType:'none', medianWidth:1.2,
  spans:[25,25,25].map(length=>({length,obstacle:'water',width:22,elevation:0,angle:90}))
};
export const depths = [1,1.2,1.4,1.6,1.8];
export const totalLength = c => c.spans.reduce((n,s)=>n+s.length,0);
export const spacing = c => c.girders===1?0:(c.width-2*c.overhang)/(c.girders-1);
export function fitBoxLayout(c){
  const deepest=c.variableDepth?c.pierDepth:c.depth,minTop=.3+(deepest-.1)/2+.5;
  if(c.girders===1){const edge=Math.max(.35,Math.min(.6,(c.width-minTop)/2)),boxTopWidth=Number(Math.min(15,c.width-2*edge).toFixed(3));if(boxTopWidth<minTop-.001)throw Error('This deck is too narrow for one full-width steel box.');return {...c,boxTopWidth,boxBottomWidth:Number((boxTopWidth-(deepest-.1)/2-.5).toFixed(3)),overhang:c.width/2};}
  let edge=Math.max(.35,Math.min(1.2,(c.width-(c.girders-1)-c.girders*minTop)/2));
  const gap=Math.max(.2,Math.min(1,(c.width-2*edge-c.girders*minTop)/(c.girders-1)));
  const boxTopWidth=Number(((c.width-2*edge-(c.girders-1)*gap)/c.girders).toFixed(3));
  if(boxTopWidth<minTop-.001||boxTopWidth>15)throw Error('This deck width cannot fit the boxes and their full-width bottom-flange web connections.');
  edge=(c.width-c.girders*boxTopWidth-(c.girders-1)*gap)/2;
  return {...c,boxTopWidth,boxBottomWidth:Number((boxTopWidth-(deepest-.1)/2-.5).toFixed(3)),overhang:Number((edge+boxTopWidth/2).toFixed(3))};
}
export const stations = c => c.spans.reduce((a,s)=>[...a,a.at(-1)+s.length],[0]);
export const roadLayout = c => {
  const left=c.sidewalkSide==='left'||c.sidewalkSide==='both',right=c.sidewalkSide==='right'||c.sidewalkSide==='both';
  const leftBarrierWidth=.45,rightBarrierWidth=.45;
  const barrierWidth=Math.max(leftBarrierWidth,rightBarrierWidth),innerBarrier=c.sidewalkRailing==='none'?0:.45;
  const roadMin=-c.width/2+leftBarrierWidth+(left?c.sidewalkWidth+innerBarrier:0),roadMax=c.width/2-rightBarrierWidth-(right?c.sidewalkWidth+innerBarrier:0);
  const medianWidth=c.medianType==='barrier'?.6:c.medianType==='sidewalk'?c.medianWidth:0,medianCentre=(roadMin+roadMax)/2,medianMin=medianCentre-medianWidth/2,medianMax=medianCentre+medianWidth/2;
  const laneWidth=c.laneWidth,split=Math.floor(c.laneCount/2),shoulders=(roadMax-roadMin-medianWidth-c.laneCount*laneWidth)/2;
  const leftShoulder=medianWidth?medianMin-roadMin-split*laneWidth:shoulders,rightShoulder=medianWidth?roadMax-medianMax-(c.laneCount-split)*laneWidth:shoulders;
  const laneStart=roadMin+leftShoulder,laneCenters=Array.from({length:c.laneCount},(_,i)=>medianWidth&&i>=split?medianMax+laneWidth/2+(i-split)*laneWidth:laneStart+laneWidth/2+i*laneWidth);
  const laneEdges=[...new Set(laneCenters.flatMap(u=>[u-laneWidth/2,u+laneWidth/2]).map(u=>Number(u.toFixed(8))))].sort((a,b)=>a-b);
  const dividers=laneCenters.slice(1).flatMap((u,i)=>medianWidth&&i+1===split?[]:[{u:(u+laneCenters[i])/2,opposing:i+1===split}]);
  return {left,right,barrierWidth,leftBarrierWidth,rightBarrierWidth,innerBarrier,roadMin,roadMax,shoulders,leftShoulder,rightShoulder,laneStart,laneCenters,laneEdges,dividers,medianWidth,medianCentre,medianMin,medianMax};
};
// +u is the driver's right when travelling in the increasing-station direction.
export const laneForward = (c,index) => c.laneCount===1 || index>=Math.floor(c.laneCount/2);
// Display RGB sampled from the requested AMS-STD-595 catalogue; these are screen approximations.
export const steelFinishes = {brown:'#5F4F4A',green:'#005F45',gray:'#9B9F9B',blue15056:'#253273',blue15065:'#005686',blue15090:'#00537B',red:'#AD2328',weathered:'#8B6047',blue:'#005686'};
export const terrainBase = c => Math.min(-1.5,...c.spans.map(s=>s.elevation-1.5));
export const approachDrop = (c,s,base=terrainBase(c)) => Math.max(.5,profile(c,s)-base-.17);
export const approachToeOffset = (c,s,base=terrainBase(c)) => 2*approachDrop(c,s,base);
const rad = d=>d*Math.PI/180;
export function validate(raw) {
  if(!raw || typeof raw!=='object' || Array.isArray(raw)) throw Error('Choose a BridgeSketch 3D JSON configuration.');
  if(raw.version!==undefined && raw.version!==1) throw Error('This configuration version is not supported.');
  const c={...defaults,...Object.fromEntries(Object.keys(defaults).filter(k=>Object.hasOwn(raw,k)).map(k=>[k,raw[k]]))};
  c.steelColor=({blue:'blue15065',bluegreen:'blue15065',greengray:'gray'})[c.steelColor]??c.steelColor;
  if(!Object.hasOwn(raw,'leftRailing'))c.leftRailing=c.barrierType==='steel'?'210A':'concrete';
  if(!Object.hasOwn(raw,'rightRailing'))c.rightRailing=c.barrierType==='steel'?'210A':'concrete';
  if(typeof c.steelColor==='string'&&/^#[0-9a-f]{6}$/i.test(c.steelColor))c.steelColor=c.steelColor.toUpperCase();
  if(!Object.hasOwn(raw,'boxBottomWidth'))c.boxBottomWidth=c.boxTopWidth-c.depth/2;
  Object.assign(c,{asphalt:.065,deck:.225,web:.014,barrier:1.1});
  if(!['vehicles','cyclists'].includes(c.trafficMode)||!['natural','glossy'].includes(c.waterStyle)||!['clear','clouds'].includes(c.skyMode))throw Error('Select traffic, water and sky styles.');
  const cycling=c.trafficMode==='cyclists';
  const limits={width:[cycling?3:4,30],overhang:[cycling?.3:.65,15],girders:[1,14],depth:[0.4,3],slabDepth:[.3,2],pierDepth:[0.4,5],taper:[10,45],columnDiameter:[0.35,3],hammerheadWidth:[1,8],hammerheadThickness:[0.35,2],wallThickness:[0.25,2],web:[0.008,0.08],deck:[0.15,0.6],asphalt:[0.025,0.2],haunch:[0.05,0.5],barrier:[0.8,1.5],wingAngle:[0,90],laneCount:[0,8],sidewalkWidth:[.5,6],boxTopWidth:[.8,15],boxBottomWidth:[.3,15],sceneWidth:[90,240],timeOfDay:[0,24],skew:[-45,45],radius:[80,5000],elevation:[3,30],rise:[0,3],grade:[-6,6],approach:[5,60],seed:[0,99999]};
  Object.assign(limits,{laneWidth:[cycling?1.5:2.5,4.5],bentWidth:[.5,5],bentThickness:[.35,3],bentEndThickness:[.35,3]});
  for(const [k,[lo,hi]] of Object.entries(limits)) if(typeof c[k]!=='number'||!Number.isFinite(c[k])||c[k]<lo||c[k]>hi) throw Error(`${k}: enter a number from ${lo} to ${hi}.`);
  if(typeof c.movingTraffic!=='boolean')throw Error('Invalid moving traffic option.');
  if(typeof c.frontSlope!=='boolean'||!['grass','stone','concrete'].includes(c.frontSlopeMaterial)||!['grass','stone'].includes(c.approachConeMaterial))throw Error('Invalid abutment slope finish.');
  if(!['concrete','210A','210C','20C'].includes(c.leftRailing)||!['concrete','210A','210C','20C'].includes(c.rightRailing)||!['none','concrete','210A','210C','20C'].includes(c.sidewalkRailing))throw Error('Invalid railing selection.');
  if(!Number.isInteger(c.girders)||!Number.isInteger(c.seed)||!Number.isInteger(c.laneCount)) throw Error('Girder count, lane count and scenery seed must be whole numbers.');
  if(typeof c.curved!=='boolean'||![1,-1].includes(c.direction)) throw Error('Invalid horizontal alignment.');
  if(typeof c.continuous!=='boolean'||!(Object.hasOwn(steelFinishes,c.steelColor)||/^#[0-9A-F]{6}$/.test(c.steelColor))||!['concrete','steel','box','slab'].includes(c.material)||!['concrete','steel'].includes(c.barrierType)||!['return','wing'].includes(c.abutmentType)||!['none','left','right','both'].includes(c.sidewalkSide)||!['bent','wall','hammerhead'].includes(c.pierType)||!Number.isInteger(c.columns)||c.columns<1||c.columns>6) throw Error('Invalid material, barrier, wall, sidewalk or pier configuration.');
  if(!['mixed','diesel','bullet','city'].includes(c.trainStyle))throw Error('Select a train style.');
  if(!['grass','snow'].includes(c.terrainMode))throw Error('Select grass or snow terrain.');
  if(!['rural','urban','none'].includes(c.environment)||!['crest','constant'].includes(c.profile)||typeof c.showTraffic!=='boolean') throw Error('Invalid environment, profile or traffic option.');
  // All entry points (controls, files, links and agent tools) enforce the same rule.
  if(c.curved&&c.material==='concrete') c.material='steel';
  if(typeof c.variableDepth!=='boolean') throw Error('Invalid variable-depth option.');
  if(!['round','square'].includes(c.columnShape)) throw Error('Select round or square columns.');
  if(!['blue','white'].includes(c.background))throw Error('Select a blue or white background.');
  if(!['none','barrier','sidewalk'].includes(c.medianType)||typeof c.medianWidth!=='number'||!Number.isFinite(c.medianWidth)||c.medianWidth<.6||c.medianWidth>4)throw Error('Select a median type and an island width from 0.6 to 4 m.');
  if(c.medianType!=='none'&&c.laneCount<2)throw Error('A centre median needs at least two lanes.');
  if(c.variableDepth&&c.pierDepth<(c.material==='slab'?c.slabDepth:c.depth)) throw Error('Depth at piers must be at least the typical girder depth.');
  if(c.material==='box'){
    const deepest=c.variableDepth?c.pierDepth:c.depth;
    if(c.boxBottomWidth>c.boxTopWidth)throw Error('Box bottom flange must not be wider than the top flange.');
    if(c.boxBottomWidth+(deepest-.1)/2+.5>c.boxTopWidth+.001)throw Error('Box top flange must cover webs rising from both bottom-flange edges; reduce bottom width or depth.');
  }
  if(c.material==='concrete'&&!depths.includes(c.depth)) throw Error('Select a standard NEBT depth.');
  if(!Array.isArray(c.spans)||c.spans.length<1||c.spans.length>8) throw Error('Use 1 to 8 spans.');
  c.spans=c.spans.map((s,i)=>{
    if(!s||typeof s!=='object') throw Error(`Span ${i+1} is invalid.`);
    const v={length:s.length,obstacle:s.obstacle,width:s.width,elevation:s.elevation,angle:s.angle};
    for(const [k,[lo,hi]] of Object.entries({length:[10,60],width:[3,60],elevation:[-5,15],angle:[35,145]})) if(typeof v[k]!=='number'||!Number.isFinite(v[k])||v[k]<lo||v[k]>hi) throw Error(`Span ${i+1} ${k}: enter ${lo} to ${hi}.`);
    if(!['road','rail','water'].includes(v.obstacle)) throw Error(`Span ${i+1}: select road, railway or water.`);
    return v;
  });
  if(c.girders===1&&c.material!=='box')throw Error('One girder is available for steel box bridges only.');
  if(c.material!=='slab'&&c.girders>1&&spacing(c)<(c.material==='concrete'?1.3:c.material==='box'?c.boxTopWidth+.2:.65)) throw Error('Girders overlap: increase deck width, reduce overhang or use fewer girders.');
  if(!Object.hasOwn(raw,'laneCount'))c.laneCount=Math.max(1,Math.min(2,Math.floor((c.width-2*roadLayout(c).barrierWidth)/c.laneWidth)));
  if(c.material==='box'){
    const gap=spacing(c)-c.boxTopWidth,edge=c.girders===1?(c.width-c.boxTopWidth)/2:c.overhang-c.boxTopWidth/2;
    if(edge<.35||edge>2.01)throw Error('Box edge cantilever must be 0.35 to 2.0 m; adjust box width or overhang.');
    if(c.girders>1&&gap>2.01)throw Error('Box girders are too far apart; increase box width or edge overhang.');
  }
  if(Math.min(roadLayout(c).leftShoulder,roadLayout(c).rightShoulder)<-.0001) throw Error('Lanes, median and sidewalks exceed the deck width; reduce them or widen the deck.');
  if(c.curved && totalLength(c)/c.radius>2.2) throw Error('Increase the curve radius: total turning angle must stay below 126 degrees.');
  if(c.width*Math.abs(Math.tan(rad(c.skew)))>Math.min(...c.spans.map(s=>s.length))*.85) throw Error('Skew is too large for the span length and deck width.');
  for(let i=1;i<c.spans.length;i++) if(c.spans[i].obstacle==='water'&&c.spans[i-1].obstacle==='water'&&c.spans[i].elevation!==c.spans[i-1].elevation) throw Error('Adjacent water spans must have the same water elevation.');
  for(let i=1;i<c.spans.length;i++) if(c.spans[i].obstacle==='water'&&c.spans[i-1].obstacle==='water'&&c.spans[i].angle!==c.spans[i-1].angle) throw Error('Adjacent water spans must have the same river direction.');
  for(let i=0;i<c.spans.length;i++){const s=c.spans[i];if(s.obstacle!=='water'&&s.width/Math.sin(rad(s.angle))>s.length-3)throw Error(`Span ${i+1}: the crossing is too wide for this span and angle.`);}
  for(let i=0;i<c.spans.length;i++) if(clearance(c,i)<0.3) throw Error(`Span ${i+1}: raise the bridge or lower the obstacle; it intersects the structure.`);
  // Limit end slopes for a readable concept model, without suggesting design compliance.
  if(c.profile==='crest'&&4*c.rise/totalLength(c)>0.12) throw Error('Reduce crest rise for this bridge length.');
  return c;
}
export function frame(c,s,u=0) {
  const L=totalLength(c);
  if(c.curved&&(s<0||s>L)){const end=s<0?0:L,f=frame(c,end,u);return {...f,x:f.x+(s-end)*f.tx,z:f.z+(s-end)*f.tz};}
  const t=c.curved?(s-totalLength(c)/2)/c.radius:0, d=c.direction;
  const tx=Math.cos(t),tz=d*Math.sin(t),nx=-tz,nz=tx;
  return {x:(c.curved?c.radius*Math.sin(t):s-totalLength(c)/2)+nx*u,z:(c.curved?d*c.radius*(1-Math.cos(t)):0)+nz*u,tx,tz,nx,nz};
}
export function alignmentStation(c,x,z){
  const L=totalLength(c);if(!c.curved)return x+L/2;
  const a=frame(c,0),b=frame(c,L),before=(x-a.x)*a.tx+(z-a.z)*a.tz,after=(x-b.x)*b.tx+(z-b.z)*b.tz;
  if(before<0)return before;if(after>0)return L+after;
  return Math.atan2(x,c.radius-c.direction*z)*c.radius+L/2;
}
export function profile(c,s) {
  const L=totalLength(c);
  if(c.profile==='constant') return c.elevation+s*c.grade/100;
  // Tangent extensions keep the short approaches continuous at both ends.
  if(s<0) return c.elevation+4*c.rise*s/L;
  if(s>L) return c.elevation-4*c.rise*(s-L)/L;
  return c.elevation+4*c.rise*s*(L-s)/(L*L);
}
export function supportStation(c,station,u) {
  if(!c.curved)return station+u*Math.tan(rad(c.skew));
  const f=frame(c,station),k=Math.tan(rad(c.skew));
  const residual=s=>{const p=frame(c,s,u);return (p.x-f.x)*(f.tx-k*f.nx)+(p.z-f.z)*(f.tz-k*f.nz);};
  let s=station+u*k;
  for(let j=0;j<6;j++){const r=residual(s);if(Math.abs(r)<1e-10)break;const derivative=(residual(s+.001)-residual(s-.001))/.002;s-=r/derivative;}
  return s;
}
export function girderTop(c,i,s) {
  if(c.material==='slab')return profile(c,s)-c.asphalt;
  const ss=stations(c),a=ss[i],b=ss[i+1];
  // Precast girders are straight in elevation; variable haunch fills to the crest.
  const y=c.material==='concrete'?profile(c,a)+(profile(c,b)-profile(c,a))*(s-a)/(b-a):profile(c,s);
  return y-c.asphalt-c.deck-c.haunch;
}
export function clearance(c,i) {
  const ss=stations(c),a=ss[i],b=ss[i+1];
  const edgeStations=[a,b].flatMap(s=>[-c.width/2,c.width/2].map(u=>supportStation(c,s,u)));
  const depth=c.variableDepth?c.pierDepth:c.material==='slab'?c.slabDepth:c.depth;
  return Math.min(...edgeStations.map(s=>girderTop(c,i,s)))-depth-.2-c.spans[i].elevation;
}
// Smooth bottom-flange haunches, measured from each girder's skewed pier intersection.
export function girderDepth(c,s,u=0) {
  if(!c.variableDepth)return c.material==='slab'?c.slabDepth:c.depth;
  const typical=c.material==='slab'?c.slabDepth:c.depth;
  const bearingZone=.7; // Bearings are 0.5 m from supports; 0.3–0.7 m spans 400 mm above each pad.
  if(c.spans.length===1){
    const L=totalLength(c),reach=L*c.taper/100,near=Math.min(s,L-s),t=Math.max(0,(near-bearingZone)/Math.max(.001,reach-bearingZone));
    return typical+(c.pierDepth-typical)*(t<1?(1-t)**2:0);
  }
  // Each half-haunch is tangent to the shallow soffit at its outer end,
  // with maximum depth at the actual skewed pier intersection.
  const ss=stations(c);let factor=0;
  for(let j=1;j<ss.length-1;j++){
    const pier=supportStation(c,ss[j],u),left=supportStation(c,ss[j-1],u),right=supportStation(c,ss[j+1],u);
    const reach=(s<=pier?pier-left:right-pier)*c.taper/100;
    const t=Math.max(0,(Math.abs(s-pier)-bearingZone)/Math.max(.001,reach-bearingZone));
    factor=Math.max(factor,t<1?(1-t)**2:0);
  }
  return typical+(c.pierDepth-typical)*factor;
}
export function setClearance(c,i,value) {
  if(!Number.isFinite(value)||value<.3||value>35)throw Error('Clearance: enter 0.3 to 35 m.');
  const elevation=c.spans[i].elevation+clearance(c,i)-value;
  let a=i,b=i;
  if(c.spans[i].obstacle==='water'){
    while(a>0&&c.spans[a-1].obstacle==='water')a--;
    while(b<c.spans.length-1&&c.spans[b+1].obstacle==='water')b++;
  }
  for(let j=a;j<=b;j++)c.spans[j].elevation=elevation;
  return c;
}
export function waterGroups(c) {
  const groups=[],ss=stations(c);
  c.spans.forEach((s,i)=>{if(s.obstacle!=='water')return;const last=groups.at(-1);if(last&&last.endIndex===i-1){last.end=ss[i+1];last.endIndex=i;}else groups.push({start:ss[i],end:ss[i+1],startIndex:i,endIndex:i,elevation:s.elevation,angle:s.angle,width:s.width});});
  return groups;
}
export function encodeConfig(c,camera) {return encodeURIComponent(JSON.stringify({config:c,camera}));}
export function decodeConfig(hash) {
  if(hash.length>24000)throw Error('The shared configuration is too large.');
  const data=JSON.parse(decodeURIComponent(hash.replace(/^#/,'')));
  return {config:validate(data.config??data),camera:data.camera};
}

export function vehicleFits(c,s,u,halfLength,halfWidth){
  const f=frame(c,s,u),layout=roadLayout(c),L=totalLength(c);
  if(!layout.laneCenters.length)return false;
  const lane=layout.laneCenters.reduce((a,b)=>Math.abs(a-u)<Math.abs(b-u)?a:b),laneMin=lane-c.laneWidth/2,laneMax=lane+c.laneWidth/2;
  for(const dx of [-halfLength,0,halfLength]){
   const extents=[];
   for(const du of [-halfWidth,halfWidth]){
    const x=f.x+dx*f.tx+du*f.nx,z=f.z+dx*f.tz+du*f.nz;
    const q=alignmentStation(c,x,z);
    const centre=frame(c,q),across=(x-centre.x)*centre.nx+(z-centre.z)*centre.nz;
    if(across<Math.max(layout.roadMin+.08,laneMin+.04)||across>Math.min(layout.roadMax-.08,laneMax-.04))return false;
    extents.push(across);
    const start=supportStation(c,0,across)-c.approach-18,end=supportStation(c,L,across)+c.approach+18;
    if(q<start||q>end)return false;
   }
   if(layout.medianWidth&&Math.min(...extents)<layout.medianMax+.08&&Math.max(...extents)>layout.medianMin-.08)return false;
  }
  return true;
}
