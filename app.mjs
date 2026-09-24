import * as T from 'three';
import {OrbitControls} from './vendor/OrbitControls.js';
import {defaults,validate,totalLength,spacing,clearance,setClearance,encodeConfig,decodeConfig,depths,roadLayout,steelFinishes,fitBoxLayout,profile,girderTop,girderDepth} from './geometry.mjs';
import {release} from './release.mjs';
import {presets,makePreset} from './presets.mjs';
import {makeMaterials,buildBridge,disposeModel,obstacleTour,animateTraffic,nebtSection,steelSection,boxSection} from './scene.mjs';

const $=id=>document.getElementById(id),form=$('parameters');
let config=makePreset(presets[0].id),model,renderer,camera,perspectiveCamera,orthoCamera,controls,scene,materials,view='perspective',pendingCamera;
let messageTimer,driving=null;
let needsRender=true,flowTime=0,lastTime=0,frameMs=0;
function notify(message,error=false){clearTimeout(messageTimer);$('feedback').replaceChildren(document.createTextNode(message));$('feedback').classList.toggle('error',error);$('feedback').hidden=false;if(!error)messageTimer=setTimeout(()=>$('feedback').hidden=true,5000);}
let activeSpan=0;
function selectSpan(){
  activeSpan=Number($('activeSpan').value)||0;
  [...$('spanRows').children].forEach((row,i)=>row.hidden=i!==activeSpan);
}
function initWorkspace(){
  for(const p of presets){const option=new Option(p.label,p.id);option.title=p.description;$('preset').insertBefore(option,$('preset').lastElementChild);}
  $('release-version').textContent=release.name+' · v'+release.version;
  $('release-date').textContent=release.date+' · '+release.author;
  $('about-release').textContent='Version '+release.version+' · '+release.date;
  $('about-button').onclick=()=>$('about').showModal();
  const tabs=[...document.querySelectorAll('[role="tab"]')];
  const activate=tab=>{for(const t of tabs){const on=t===tab;t.setAttribute('aria-selected',on);t.tabIndex=on?0:-1;$(t.getAttribute('aria-controls')).hidden=!on;}};
  tabs.forEach((tab,i)=>{tab.onclick=()=>activate(tab);tab.onkeydown=e=>{
    const next=e.key==='ArrowRight'?(i+1)%tabs.length:e.key==='ArrowLeft'?(i+tabs.length-1)%tabs.length:e.key==='Home'?0:e.key==='End'?tabs.length-1:-1;
    if(next>=0){e.preventDefault();activate(tabs[next]);tabs[next].focus();}
  };});
  $('dock').onclick=()=>{const bottom=document.body.classList.toggle('dock-bottom');$('dock').textContent=bottom?'Dock left ←':'Dock below ↓';$('dock').setAttribute('aria-pressed',bottom);};
  $('focus').onclick=()=>{const focus=document.body.classList.toggle('focus-mode');$('focus').setAttribute('aria-pressed',focus);$('focus').textContent=focus?'Parameters':'Focus';};
  $('activeSpan').onchange=selectSpan;
}
function refreshForm(){
  for(const el of form.elements){if(!el.name)continue;if(el.type==='checkbox')el.checked=config[el.name];else if(config[el.name]!==undefined)el.value=config[el.name];}
  $('spanCount').value=config.spans.length;$('nebt').value=config.depth;
  $('spanLengths').innerHTML=config.spans.map((span,i)=>`<label>Span ${i+1} · m<input data-span="${i}" data-key="length" type="number" min="10" max="60" step="1" value="${span.length}"></label>`).join('');
  activeSpan=Math.min(activeSpan,config.spans.length-1);
  $('activeSpan').innerHTML=config.spans.map((span,i)=>`<option value="${i}">Span ${i+1} · ${span.length} m</option>`).join('');$('activeSpan').value=activeSpan;
  $('spanRows').innerHTML=config.spans.map((span,i)=>`<section class="span-row" ${i===activeSpan?'':'hidden'}><h3>SPAN ${i+1}</h3><label>Crossing<select data-span="${i}" data-key="obstacle">${['water','road','rail'].map(v=>`<option value="${v}" ${span.obstacle===v?'selected':''}>${v==='rail'?'Railway':v[0].toUpperCase()+v.slice(1)}</option>`).join('')}</select></label><label>Vertical clearance · m<input data-span="${i}" data-key="clearance" type="number" min=".3" max="35" step=".01" value="${clearance(config,i).toFixed(2)}"></label><details><summary>Crossing dimensions</summary><div class="field-grid">${[['width','Width · m',3,60],['elevation','Elevation · m',-5,15],['angle','Crossing angle · °',35,145]].map(([key,label,min,max])=>`<label>${label}<input data-span="${i}" data-key="${key}" type="number" min="${min}" max="${max}" step="any" value="${span[key]}"></label>`).join('')}</div></details></section>`).join('');
  syncWaterFields();
  syncEnabled();
}
function syncWaterFields(){
  config.spans.forEach((span,i)=>{const row=$('spanRows').children[i];if(!row)return;row.querySelector('.river-hint')?.remove();row.querySelector('[data-key="clearance"]').value=clearance(config,i).toFixed(2);row.querySelector('[data-key="elevation"]').value=Number(span.elevation.toFixed(4));const joined=span.obstacle==='water'&&(config.spans[i-1]?.obstacle==='water'||config.spans[i+1]?.obstacle==='water');
    row.querySelector('[data-key="width"]').disabled=span.obstacle==='water'&&config.spans[i-1]?.obstacle==='water'&&config.spans[i+1]?.obstacle==='water';
    if(joined){const hint=document.createElement('p');hint.className='hint river-hint';hint.textContent='Joined river: elevation and angle apply to all adjacent water spans. Edge-span widths set the banks.';row.querySelector('details').append(hint);}
  });
}
function syncEnabled(){
  const steel=config.material==='steel'||config.material==='box',box=config.material==='box',slab=config.material==='slab';$('nebt-label').hidden=steel||slab;$('steel-depth-label').hidden=!steel;$('slab-depth-label').hidden=!slab;$('steel-color-controls').hidden=!steel;$('flange-note').hidden=!steel;$('box-bottom-width-label')?.toggleAttribute('hidden',!box);
  for(const name of ['girders','overhang','haunch'])form.elements[name].disabled=slab||(box&&name==='overhang');
  $('variable-depth-fields').hidden=false;form.elements.variableDepth.disabled=false;form.elements.pierDepth.disabled=!config.variableDepth;form.elements.taper.disabled=!config.variableDepth;form.elements.variableDepth.checked=config.variableDepth;form.elements.girders.step='1';$('girder-count-label').hidden=box||slab;$('box-count-label').hidden=!box;$('boxCount').value=config.girders;form.elements.girders.value=config.girders;
  form.elements.wingAngle.disabled=config.abutmentType!=='wing';$('wing-angle-label').hidden=config.abutmentType!=='wing';
  $('column-shape-label').hidden=config.pierType!=='bent';$('column-size-label').textContent=config.columnShape==='square'?'Column side · m':'Column diameter · m';
  form.elements.sidewalkWidth.disabled=config.sidewalkSide==='none';form.elements.sidewalkRailing.disabled=config.sidewalkSide==='none';$('median-width-label').hidden=config.medianType!=='sidewalk';
  const paint=steelFinishes[config.steelColor]??config.steelColor;
  form.elements.steelColor.value=Object.hasOwn(steelFinishes,config.steelColor)?config.steelColor:'custom';
  $('steelPicker').value=paint;$('steelHex').value=paint.toUpperCase();$('steel-swatch').style.background=paint;
  form.elements.columns.disabled=config.pierType!=='bent';$('bent-settings').hidden=config.pierType!=='bent';form.elements.movingTraffic.disabled=!config.showTraffic;
  $('columns-label').hidden=config.pierType!=='bent';$('column-diameter-label').hidden=config.pierType!=='bent';$('wall-settings').hidden=config.pierType!=='wall';$('hammerhead-settings').hidden=config.pierType!=='hammerhead';
  $('continuity-note').textContent=slab?(config.continuous?'Continuous solid slab across supports.':'Solid slab spans with joints at supports.'):!config.continuous?'Separate girder spans with joints at piers.':steel?'Unbroken girders and one bearing line at each pier.':'Precast spans joined with concrete closure diaphragms.';
  form.elements.material.options[0].disabled=config.curved;form.elements.radius.disabled=!config.curved;form.elements.direction.disabled=!config.curved;
  form.elements.rise.disabled=config.profile!=='crest';form.elements.grade.disabled=config.profile!=='constant';
  $('material-note').textContent=slab?(config.variableDepth?'Solid concrete slab · variable depth':'Solid concrete slab · constant depth'):box?'Hollow box · webs incline 1H:4V':steel?'Plate girder · depth includes both flanges':config.variableDepth?'NEBT-shaped concrete concept · variable depth':'Metric NEBT family · 1200 / 810 mm flanges';
  const layout=roadLayout(config);$('shoulders').textContent=Math.abs(layout.leftShoulder-layout.rightShoulder)<.001?layout.leftShoulder.toFixed(2)+' m':layout.leftShoulder.toFixed(2)+' / '+layout.rightShoulder.toFixed(2)+' m';
}
function readForm(){
  const raw=structuredClone(config);
  for(const el of form.elements){if(!el.name)continue;raw[el.name]=el.type==='checkbox'?el.checked:(el.type==='number'||el.name==='direction'?Number(el.value):el.value);}
  if(raw.material==='concrete'&&!raw.curved)raw.depth=Number($('nebt').value)||1.4;
  for(const el of form.querySelectorAll('[data-span]:not([data-key="clearance"])'))raw.spans[Number(el.dataset.span)][el.dataset.key]=el.type==='number'?Number(el.value):el.value;
  return raw;
}
function applyTimeOfDay(hour){
  if(!scene?.userData.lights)return;
  const angle=(hour-6)*Math.PI/14,daylight=T.MathUtils.smoothstep(hour,5.5,8)*(1-T.MathUtils.smoothstep(hour,18.2,21.5));
  const golden=Math.exp(-(((hour-17.5)/1.25)**2))*daylight;
  scene.userData.daylight=daylight;
  const tint=(night,day,gold)=>new T.Color(night).lerp(new T.Color(day),daylight).lerp(new T.Color(gold),golden);
  const {hemi,sun,fill,rim}=scene.userData.lights;
  sun.position.set(Math.cos(angle)*80,8+60*Math.max(0,Math.sin(angle)),40);
  sun.color.copy(tint('#a9c7ed','#fff3dd','#ff9a68'));sun.intensity=.4+2.8*daylight-golden;
  hemi.color.copy(tint('#7186a8','#e1efff','#ffc98f'));
  hemi.groundColor.copy(tint('#283844','#687560','#3d2930'));
  hemi.intensity=.65+1.75*daylight-1.1*golden;
  fill.color.copy(tint('#7293bf','#c8ddfa','#ffcfab'));fill.intensity=.3+.95*daylight-.4*golden;
  rim.intensity=.15+.55*daylight+.15*golden;
  scene.environmentIntensity=.25+.75*daylight-.1*golden;
  renderer.toneMappingExposure=.9+.28*daylight-.13*golden;
  $('viewport').style.setProperty('--night-factor',`${((1-daylight)*100).toFixed(1)}%`);
  $('timeOfDay').value=hour;
  $('timeLabel').textContent=String(Math.floor(hour)).padStart(2,'0')+':'+String(Math.round((hour%1)*60)).padStart(2,'0');
  $('dusk').checked=hour>=16.5&&hour<=18.5;
  needsRender=true;
}
function renderSection(){
  const c=config,L=totalLength(c),slider=$('sectionStation');if(Number(slider.max)!==L)slider.value=L/2;slider.max=L;
  const s=Math.min(L,Math.max(0,Number(slider.value)||L/2));slider.value=s;$('sectionStationLabel').textContent=`${s.toFixed(2)} m`;
  const i=Math.min(c.spans.length-1,c.spans.findIndex((_,j)=>s<=c.spans.slice(0,j+1).reduce((n,v)=>n+v.length,0))),road=roadLayout(c),half=c.width/2;
  const actualDepth=girderDepth(c,s),top=c.material==='slab'?-.065:girderTop(c,i,s)-profile(c,s),bottom=c.material==='slab'?-actualDepth-.065:top-actualDepth;
  const svg=$('sectionSvg'),svgWidth=Math.max(580,Math.min(1000,svg.clientWidth||800));svg.setAttribute('viewBox',`0 0 ${svgWidth} 600`);
  const lo=Math.min(bottom-.55,-2),hi=2.1,k=Math.min((svgWidth-40)/(c.width+2),440/(hi-lo)),cy=255+k*(hi+lo)/2;
  const poly=(points,fill,stroke='#344a50')=>`<polygon points="${points.map(p=>p.join(',')).join(' ')}" fill="${fill}" stroke="${stroke}" stroke-width=".018"/>`;
  const rectangle=(a,b,t,d,fill)=>poly([[a,t],[b,t],[b,d],[a,d]],fill);
  let drawing=`<line x1="${-half-1}" x2="${half+1}" y1="0" y2="0" stroke="#849596" stroke-width=".018" stroke-dasharray=".12 .1"/>`;
  if(c.material==='slab')drawing+=rectangle(-half,half,-.065,bottom,'#a7a49a');
  else{
    for(let g=0;g<c.girders;g++){
      const u=-half+c.overhang+g*spacing(c),sections=c.material==='concrete'?[nebtSection(actualDepth)]:c.material==='box'?Object.values(boxSection(actualDepth,c.boxTopWidth,c.boxBottomWidth,.05,c.web)):[steelSection(c.depth,c.web).map(([x,y])=>[x,y<-.05?y+c.depth-actualDepth:y])];
      for(const section of sections)drawing+=poly(section.map(([x,y])=>[x+u,y+top]),c.material==='concrete'?'#aba79a':steelFinishes[c.steelColor]??c.steelColor);
      for(const offset of c.material==='box'?[-c.boxTopWidth/2+.25,c.boxTopWidth/2-.25]:[0])drawing+=rectangle(u+offset-.19,u+offset+.19,-.29,top,'#c0bdb1');
    }
    drawing+=rectangle(-half,half,-.065,-.29,'#b9b6aa');
  }
  drawing+=rectangle(-half,half,0,-.065,c.laneCount?'#394247':'#c4c0b5');
  if(road.left)drawing+=rectangle(-half,road.roadMin,.2,0,'#c5c1b5');
  if(road.right)drawing+=rectangle(road.roadMax,half,.2,0,'#c5c1b5');
  for(const u of road.laneEdges)drawing+=rectangle(u-.04,u+.04,.012,.004,'#f5f2e7');
  const railing=(edge,side,type,raised=0)=>{
    if(type==='concrete')return poly([[0,0],[-.45,0],[-.45,.1],[-.23,.35],[-.18,1.1],[-.02,1.1],[0,.15]].map(([x,y])=>[edge+side*x,y+raised]),'#a9a79d');
    const u=edge-side*.18,h=type==='210A'?.87:1.4;
    let result=poly([[edge,0],[edge-side*.45,0],[edge-side*.38,.28],[edge-side*.07,.28]].map(([x,y])=>[x,y+raised]),'#b8b5aa');
    result+=rectangle(u-.045,u+.045,.28+raised+h,.28+raised,'#879597');
    for(const y of type==='20C'?[.08,1.38]:type==='210C'?[.18,.51,.81,1.38]:[.18,.51,.81])result+=rectangle(u-.075,u+.075,.28+raised+y+.04,.28+raised+y-.04,'#879597');
    return result;
  };
  drawing+=railing(-half,-1,c.leftRailing,road.left?.2:0)+railing(half,1,c.rightRailing,road.right?.2:0);
  if(c.sidewalkRailing!=='none'){if(road.left)drawing+=railing(road.roadMin-road.innerBarrier,-1,c.sidewalkRailing,.2);if(road.right)drawing+=railing(road.roadMax+road.innerBarrier,1,c.sidewalkRailing,.2);}
  svg.innerHTML=`<title>Transverse deck section at station ${s.toFixed(2)} metres</title><g transform="translate(${svgWidth/2} ${cy}) scale(${k} ${-k})">${drawing}</g><text x="30" y="54" fill="#17374b" font-size="22" font-weight="600">TRANSVERSE DECK SECTION</text><text x="30" y="83" fill="#557279" font-size="15">Station ${s.toFixed(2)} m · Deck ${c.width.toFixed(2)} m · ${c.material==='box'?'Steel box':c.material==='steel'?'Steel plate':c.material==='slab'?'Concrete slab':'Concrete NEBT'} · Depth ${actualDepth.toFixed(2)} m</text><text x="30" y="565" fill="#557279" font-size="14">Looking toward bridge end · Left / right follow alignment</text>`;
}
function update(raw,{resetCamera=false,refresh=false}={}){
  stopDriving();
  const next=validate(raw),started=performance.now(),replacement=buildBridge(next,materials);
  if(model){scene.remove(model.root);disposeModel(model);}config=next;model=replacement;scene.add(model.root);model.deck.visible=!$('reveal').checked;model.haunches.visible=!$('reveal').checked;model.setting.visible=view!=='elevation';
  document.body.classList.toggle('background-white',config.background==='white');
  applyTimeOfDay(config.timeOfDay);
  if(refresh)refreshForm();else {syncEnabled();syncWaterFields();}
  if(view==='section')renderSection();
  const L=totalLength(config);$('length').innerHTML=`${L.toFixed(1)} <small>m</small>`;$('area').innerHTML=`${Math.round(L*config.width).toLocaleString()} <small>m²</small>`;$('spacing').textContent=`${config.material==='slab'?'Not applicable':spacing(config).toFixed(2)+' m'}`;
  $('clearance').innerHTML=`${Math.min(...config.spans.map((_,i)=>clearance(config,i))).toFixed(2)} <small>m</small>`;
  let triangles=0;model.root.traverse(o=>{if(o.isMesh)triangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3*(o.isInstancedMesh?o.count:1);});$('triangles').innerHTML=`${(triangles/1000).toFixed(1)}<small>k tris</small>`;
  $('sceneTitle').textContent=config.curved?'Curved viaduct':config.spans.every(s=>s.obstacle==='water')?'River crossing':'Bridge crossing';
  $('sceneSubtitle').textContent=`${config.spans.length} ${config.spans.length===1?'span':'spans'} · ${config.material==='slab'?'Solid concrete slab':config.material==='concrete'?'NEBT '+config.depth*1000:config.material==='box'?'Steel box girders':'Steel plate girders'} · ${config.environment}`;
  if(resetCamera)fit(view);
  needsRender=true;const updateMs=performance.now()-started;
  $('preset').value='custom';
  window.bridgeSketch=window.bridgeViewer={getConfig:()=>structuredClone(config),update:(raw)=>update(raw,{refresh:true}),getStats:()=>({triangles,updateMs,frameMs,geometries:renderer.info.memory.geometries,drawCalls:renderer.info.render.calls})};
}
function fit(mode='perspective'){
  stopDriving(false);
  $('sectionHost').hidden=mode!=='section';$('viewport').classList.toggle('section-view',mode==='section');
  if(mode==='section'){view=mode;controls.autoRotate=false;$('tour').checked=false;renderSection();document.querySelectorAll('[data-view]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.view===mode));return;}
  model.setting.visible=mode!=='elevation';
  view=mode;camera=mode==='perspective'?perspectiveCamera:orthoCamera;controls.object=camera;controls.enableRotate=mode==='perspective';camera.up.set(0,1,0);
  const bounds=new T.Box3().setFromObject(model.structure);if(mode!=='elevation')bounds.union(new T.Box3().setFromObject(model.deck));const target=bounds.getCenter(new T.Vector3());
  const width=$('canvasHost').clientWidth,height=$('canvasHost').clientHeight,aspect=width/height;
  const direction=mode==='plan'?new T.Vector3(0,1,.00001):mode==='elevation'?new T.Vector3(0,0,1):new T.Vector3(.73,.55,.85).normalize();
  if(mode==='plan')camera.up.set(0,0,-1);
  camera.position.copy(target).add(direction);camera.lookAt(target);camera.updateMatrixWorld();
  const right=new T.Vector3().setFromMatrixColumn(camera.matrixWorld,0),up=new T.Vector3().setFromMatrixColumn(camera.matrixWorld,1),tanV=Math.tan(18*Math.PI/180)*Math.max(.4,(height-165)/height),tanH=Math.tan(18*Math.PI/180)*aspect*(width-70)/width;
  let distance=20,halfHeight=5;
  for(const x of [bounds.min.x,bounds.max.x])for(const y of [bounds.min.y,bounds.max.y])for(const z of [bounds.min.z,bounds.max.z]){
    const p=new T.Vector3(x,y,z).sub(target),px=Math.abs(p.dot(right)),py=Math.abs(p.dot(up)),depth=p.dot(direction);
    distance=Math.max(distance,depth+Math.max(px/tanH,py/tanV));halfHeight=Math.max(halfHeight,px/aspect/(1-70/width),py/Math.max(.4,(height-165)/height));
  }
  if(camera.isOrthographicCamera){camera.top=halfHeight*1.06;camera.bottom=-camera.top;camera.right=camera.top*aspect;camera.left=-camera.right;camera.zoom=1;}else camera.aspect=aspect;
  camera.position.copy(target).addScaledVector(direction,distance*1.06);controls.target.copy(target);camera.updateProjectionMatrix();
  controls.update();needsRender=true;document.querySelectorAll('[data-view]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.view===mode));
}
function captureCamera(){return {position:camera.position.toArray(),target:controls.target.toArray(),view,zoom:camera.zoom};}
function restoreCamera(saved){
  if(!saved)return;
  if(!Array.isArray(saved.position)||!Array.isArray(saved.target)||saved.position.length!==3||saved.target.length!==3||![...saved.position,...saved.target].every(v=>Number.isFinite(v)&&Math.abs(v)<10000))return;
  fit(['plan','elevation','section'].includes(saved.view)?saved.view:'perspective');
  if(saved.view==='section')return;
  if(new T.Vector3(...saved.position).distanceTo(new T.Vector3(...saved.target))<1)return;
  camera.position.fromArray(saved.position);controls.target.fromArray(saved.target);camera.zoom=Number.isFinite(saved.zoom)?T.MathUtils.clamp(saved.zoom,.1,20):1;camera.updateProjectionMatrix();controls.update();needsRender=true;
}
function stopDriving(restore=true){
  if(!driving)return;
  const saved=driving.saved;driving=null;controls.enabled=true;controls.enableDamping=true;
  perspectiveCamera.fov=36;perspectiveCamera.updateProjectionMatrix();
  const traffic=model.setting.children.find(o=>o.name==='Traffic');if(traffic)traffic.visible=true;model.deck.visible=!$('reveal').checked;model.haunches.visible=!$('reveal').checked;
  $('drive').textContent='Drive';$('drive').setAttribute('aria-pressed','false');$('drive-status').hidden=true;
  if(restore)restoreCamera(saved);needsRender=true;
}
function startDriving(){
  if(driving){stopDriving();return;}
  const saved=captureCamera();fit('perspective');controls.autoRotate=false;$('tour').checked=false;
  controls.enabled=false;controls.enableDamping=false;perspectiveCamera.fov=62;perspectiveCamera.updateProjectionMatrix();
  const route=obstacleTour(config);driving={saved,route,station:-route.reach};
  const traffic=model.setting.children.find(o=>o.name==='Traffic');if(traffic)traffic.visible=false;model.deck.visible=true;
  $('drive').textContent='Stop';$('drive').setAttribute('aria-pressed','true');$('drive-status').hidden=false;
  driveFrame(0);
}
function driveFrame(dt){
  driving.station+=dt*30/3.6;const s=driving.station,{route}=driving;
  if(s>route.reach){stopDriving();return;}
  const pose=route.pose(s);camera.position.fromArray(pose.position);
  controls.target.fromArray(pose.target);camera.lookAt(controls.target);
  const label={road:'ROAD',water:'RIVER',rail:'RAILWAY'}[route.type];
  $('drive-status').textContent=label+' VIEW · SPAN '+(route.index+1)+' · '+Math.round((s+route.reach)/(2*route.reach)*100)+'% · Esc to stop';
  needsRender=true;
}
function download(blob,name){const a=document.createElement('a'),url=URL.createObjectURL(blob);a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
async function boot(){
  renderer=new T.WebGLRenderer({antialias:true,alpha:true,preserveDrawingBuffer:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.setClearColor(0x000000,0);renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.12;$('canvasHost').append(renderer.domElement);
  renderer.domElement.setAttribute('aria-label','3D bridge model. Use the view buttons for fixed camera views.');
  scene=new T.Scene();const hemi=new T.HemisphereLight(0xdcefff,0x9b9c87,2.3);scene.add(hemi);
  // A local sky dome supplies soft reflections on water, glass and painted steel.
  const skyScene=new T.Scene(),skyGeometry=new T.SphereGeometry(100,32,16),skyColors=[];
  const skyPos=skyGeometry.attributes.position;
  for(let i=0;i<skyPos.count;i++){
    const y=skyPos.getY(i)/100,color=new T.Color(y<0?'#74776b':'#dce6e7');
    if(y>0)color.lerp(new T.Color('#9db8ce'),Math.pow(y,.6));skyColors.push(color.r,color.g,color.b);
  }
  skyGeometry.setAttribute('color',new T.Float32BufferAttribute(skyColors,3));
  const skyMaterial=new T.MeshBasicMaterial({vertexColors:true,side:T.BackSide});skyScene.add(new T.Mesh(skyGeometry,skyMaterial));
  const pmrem=new T.PMREMGenerator(renderer);scene.environment=pmrem.fromScene(skyScene,.04).texture;scene.environmentIntensity=.7;
  pmrem.dispose();skyGeometry.dispose();skyMaterial.dispose();
  const sun=new T.DirectionalLight(0xfff5e5,3.0);sun.position.set(-45,65,40);sun.castShadow=true;sun.shadow.mapSize.set(4096,4096);sun.shadow.camera.left=-160;sun.shadow.camera.right=160;sun.shadow.camera.top=110;sun.shadow.camera.bottom=-110;sun.shadow.camera.far=250;sun.shadow.normalBias=.04;sun.shadow.bias=-.00015;scene.add(sun);
  const fill=new T.DirectionalLight(0xd4eaff,1.15);fill.position.set(50,35,-45);scene.add(fill);
  const rim=new T.DirectionalLight(0xffe9cb,.7);rim.position.set(55,25,50);scene.add(rim);
  scene.userData.lights={hemi,sun,fill,rim};
  perspectiveCamera=new T.PerspectiveCamera(36,1,.1,5000);orthoCamera=new T.OrthographicCamera(-50,50,50,-50,.1,5000);camera=perspectiveCamera;controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.dampingFactor=.08;controls.minDistance=8;controls.maxDistance=2500;controls.maxPolarAngle=Math.PI*.5;
  materials=makeMaterials(()=>needsRender=true);
  if(location.hash){try{const saved=decodeConfig(location.hash);config=saved.config;pendingCamera=saved.camera;}catch(e){notify(e.message,true);}}
  update(config,{refresh:true,resetCamera:true});
  if(!location.hash){$('preset').value=presets[0].id;$('sceneTitle').textContent=presets[0].label;}
  restoreCamera(pendingCamera);
  const resize=()=>{const {clientWidth:w,clientHeight:h}=$('canvasHost');renderer.setSize(w,h);perspectiveCamera.aspect=w/h;perspectiveCamera.updateProjectionMatrix();orthoCamera.right=orthoCamera.top*w/h;orthoCamera.left=-orthoCamera.right;orthoCamera.updateProjectionMatrix();if(view==='section')renderSection();needsRender=true;};new ResizeObserver(resize).observe($('canvasHost'));resize();
  controls.addEventListener('change',()=>needsRender=true);
  $('timeOfDay').oninput=()=>{config.timeOfDay=Number($('timeOfDay').value);applyTimeOfDay(config.timeOfDay);};
  $('sectionStation').oninput=renderSection;
  $('sectionDownload').onclick=()=>{download(new Blob([new XMLSerializer().serializeToString($('sectionSvg'))],{type:'image/svg+xml'}),'bridge-section.svg');notify('Section saved.');};
  $('dusk').onchange=()=>{config.timeOfDay=$('dusk').checked?17.5:12;applyTimeOfDay(config.timeOfDay);};
  $('tour').onchange=()=>{stopDriving();if($('tour').checked&&view!=='perspective')fit('perspective');controls.autoRotate=$('tour').checked;controls.autoRotateSpeed=.6;needsRender=true;};
  controls.autoRotate=$('tour').checked&&view==='perspective';controls.autoRotateSpeed=.6;$('tour').checked=controls.autoRotate;
  $('drive').onclick=startDriving;window.addEventListener('keydown',e=>{if(e.key==='Escape')stopDriving();});
  renderer.setAnimationLoop(time=>{const dt=Math.min(.05,(time-lastTime)/1000);lastTime=time;if(document.hidden)return;if(driving)driveFrame(dt);else controls.update(dt);const moving=config.movingTraffic&&config.showTraffic;if(moving)animateTraffic(model,dt);const flowing=model.waters.length>0;if(flowing){flowTime+=dt;materials.water.userData.flowTime.value=flowTime;if(materials.water.map)materials.water.map.offset.x=-flowTime*.015;if(materials.water.normalMap)materials.water.normalMap.offset.x=-flowTime*.023;}if(needsRender||flowing||moving||controls.autoRotate){const start=performance.now();renderer.render(scene,camera);frameMs=performance.now()-start;needsRender=false;}});
  registerTools();
}
form.addEventListener('submit',e=>e.preventDefault());
document.querySelector('.view-options').addEventListener('change',e=>{if(['showTraffic','movingTraffic'].includes(e.target.name))form.dispatchEvent(new Event('change'));});
form.addEventListener('change',e=>{
 if(e.target.id==='activeSpan')return;
 try{
  if(e.target.id==='spanCount'){
    const count=Number(e.target.value);if(!Number.isInteger(count)||count<1||count>8)throw Error('Use 1 to 8 spans.');
    const raw=readForm();raw.spans=Array.from({length:count},(_,i)=>raw.spans[i]??{...raw.spans.at(-1)});update(raw,{refresh:true,resetCamera:true});
  }else{const raw=readForm();if(raw.curved&&raw.material==='concrete')raw.material='steel';
    if(e.target.id==='steelPicker')raw.steelColor=$('steelPicker').value;
    if(e.target.id==='steelHex')raw.steelColor=$('steelHex').value.trim();
    if(e.target.name==='steelColor'&&raw.steelColor==='custom')raw.steelColor=$('steelPicker').value;
    if(e.target.dataset.span!==undefined){const index=Number(e.target.dataset.span),key=e.target.dataset.key;if(key==='clearance')setClearance(raw,index,Number(e.target.value));if(raw.spans[index].obstacle==='water'){
      let a=index,b=index;while(a>0&&raw.spans[a-1].obstacle==='water')a--;while(b<raw.spans.length-1&&raw.spans[b+1].obstacle==='water')b++;
      for(let j=a;j<=b;j++)for(const k of ['elevation','angle']){raw.spans[j][k]=raw.spans[index][k];form.querySelector(`[data-span="${j}"][data-key="${k}"]`).value=raw.spans[index][k];}
    }}
    if(e.target.id==='boxCount')raw.girders=Number(e.target.value);
    if(e.target.name==='bentThickness'&&config.bentEndThickness===config.bentThickness)raw.bentEndThickness=raw.bentThickness;
    if(e.target.name==='material'&&raw.material==='box')raw.girders=raw.width<7?1:2;
    if(raw.material==='box'&&(e.target.id==='boxCount'||['material','width'].includes(e.target.name)))Object.assign(raw,fitBoxLayout(raw));
    if(e.target.name==='material'&&raw.material==='concrete'){raw.depth=depths.reduce((a,b)=>Math.abs(b-config.depth)<Math.abs(a-config.depth)?b:a);$('nebt').value=raw.depth;}
    update(raw);form.elements.material.value=config.material;form.elements.overhang.value=config.overhang;form.elements.boxBottomWidth.value=config.boxBottomWidth;}
  $('feedback').hidden=true;
 }catch(error){refreshForm();notify(`${error.message} The last valid model remains visible.`,true);}
});
document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>{controls.autoRotate=false;$('tour').checked=false;fit(b.dataset.view);}));$('fit').onclick=()=>fit(view);$('reveal').onchange=()=>{if(model){model.deck.visible=!$('reveal').checked;model.haunches.visible=!$('reveal').checked;}needsRender=true;};
$('reset').onclick=()=>selectPreset(presets[0].id);
function selectPreset(id){
 const preset=presets.find(p=>p.id===id);if(!preset)return;
 update(makePreset(id),{refresh:true});fit('perspective');
 $('preset').value=id;$('sceneTitle').textContent=preset.label;$('preset').title=preset.description;
 $('tour').checked=true;$('tour').onchange();$('feedback').hidden=true;
}
$('preset').onchange=()=>selectPreset($('preset').value);
$('save').onclick=()=>download(new Blob([JSON.stringify({release,config,camera:captureCamera()},null,2)],{type:'application/json'}),'bridgesketch.json');
$('load').onclick=()=>$('file').click();$('file').onchange=async()=>{try{const file=$('file').files[0];if(!file)return;if(file.size>24000)throw Error('Choose a BridgeSketch 3D configuration smaller than 24 KB.');const data=JSON.parse(await file.text()),saved={config:validate(data.config??data),camera:data.camera};update(saved.config,{refresh:true,resetCamera:true});restoreCamera(saved.camera);notify('Configuration loaded.');}catch(e){notify(e.message,true);}finally{$('file').value='';}};
$('share').onclick=async()=>{const url=new URL(location.href);url.hash=encodeConfig(config,captureCamera());history.replaceState(null,'',url);try{await navigator.clipboard.writeText(url.href);notify('Link copied. It includes the bridge and camera view.');}catch{notify('Copy this link to share the bridge and camera view.');clearTimeout(messageTimer);const field=document.createElement('input');field.type='text';field.readOnly=true;field.value=url.href;field.setAttribute('aria-label','Bridge share link');field.style.cssText='width:100%;margin-top:10px;padding:8px';$('feedback').append(field);field.focus();field.select();}};
$('image').onclick=()=>{if(view==='section'){download(new Blob([new XMLSerializer().serializeToString($('sectionSvg'))],{type:'image/svg+xml'}),'bridge-section.svg');notify('Section saved.');return;}renderer.render(scene,camera);const canvas=document.createElement('canvas');canvas.width=renderer.domElement.width;canvas.height=renderer.domElement.height;const ctx=canvas.getContext('2d');const bg=ctx.createRadialGradient(canvas.width*.45,canvas.height*.12,0,canvas.width*.45,canvas.height*.12,canvas.width);const shade=1-scene.userData.daylight;for(const [stop,day,night] of [[0,'#5e7b8b','#172b46'],[.52,'#35566c','#0a1930'],[1,'#203d51','#050d1d']])bg.addColorStop(stop,new T.Color(day).lerp(new T.Color(night),shade).getStyle());ctx.fillStyle=config.background==='white'?'#ffffff':bg;ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(renderer.domElement,0,0);canvas.toBlob(blob=>{if(blob){download(blob,'bridge-view.png');notify('Snapshot saved.');}else notify('Could not create the snapshot.',true);},'image/png');};
$('export-glb').onclick=async()=>{const button=$('export-glb');button.disabled=true;button.textContent='Exporting…';let waterMaterial;try{const {GLTFExporter}=await import('./vendor/GLTFExporter.js');const copy=model.root.clone(true);copy.children[0].visible=true;copy.children[1].children.find(o=>o.name==='Concrete deck haunches').visible=true;copy.children[2].visible=true;waterMaterial=new T.MeshStandardMaterial({color:'#427f84',roughness:.3});copy.traverse(o=>{if(o.material?.isShaderMaterial)o.material=waterMaterial;});const binary=await new GLTFExporter().parseAsync(copy,{binary:true,maxTextureSize:1024});download(new Blob([binary],{type:'model/gltf-binary'}),'bridge.glb');notify('3D model exported. Save JSON to keep editable parameters.');}catch(e){notify(`Model export failed: ${e.message}`,true);}finally{waterMaterial?.dispose();button.disabled=false;button.textContent='Export GLB';}};
function registerTools(){
  if(!document.modelContext?.registerTool)return;
  const lifecycle=new AbortController();window.addEventListener('pagehide',()=>lifecycle.abort(),{once:true});
  const properties=Object.fromEntries(Object.entries(defaults).filter(([k])=>!['spans','version','web','deck','asphalt','barrier','barrierType','boxTopWidth'].includes(k)).map(([k,v])=>[k,{type:typeof v}]));
  properties.spans={type:'array',minItems:1,maxItems:8,items:{type:'object',properties:{length:{type:'number'},obstacle:{type:'string',enum:['water','road','rail']},width:{type:'number'},elevation:{type:'number'},angle:{type:'number'}},required:['length','obstacle','width','elevation','angle'],additionalProperties:false}};
  for(const tool of [{name:'get_bridge_configuration',description:'Read the current bridge parameters and geometry statistics.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true},execute:()=>({config:structuredClone(config),stats:window.bridgeViewer.getStats()})},{name:'configure_bridge',description:'Apply bridge parameters to the visible model. Supports plate and 1–14 box girders, variable-depth slabs and steel girders, sidewalks, railings and abutment slopes. Asphalt 65 mm and steel web 14 mm remain fixed.',inputSchema:{type:'object',properties,additionalProperties:false},annotations:{readOnlyHint:false},execute:async parameters=>{if(!parameters||typeof parameters!=='object'||Array.isArray(parameters))throw Error('Provide bridge parameters.');let next={...config,...parameters};if(next.material==='box'&&['material','girders','width'].some(k=>Object.hasOwn(parameters,k)))next=fitBoxLayout(next);update(next,{refresh:true});renderer.render(scene,camera);return {config:structuredClone(config),stats:window.bridgeViewer.getStats()};}}]){
    try{Promise.resolve(document.modelContext.registerTool(tool,{signal:lifecycle.signal})).catch(console.warn);}catch(e){console.warn(e);}
  }
}
window.addEventListener('hashchange',()=>{try{const saved=decodeConfig(location.hash);update(saved.config,{refresh:true,resetCamera:true});restoreCamera(saved.camera);}catch(e){notify(e.message,true);}});
initWorkspace();
boot().catch(e=>{$('fatal').hidden=false;$('fatal').textContent=`The 3D viewer could not start. Check that hardware acceleration and WebGL 2 are enabled in your desktop browser. ${e.message}`;console.error(e);});
