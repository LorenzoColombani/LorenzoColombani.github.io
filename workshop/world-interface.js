import * as THREE from 'three';
import { createOutsideTap } from './product-gestures.js?v=interaction-round-1';
import { createSkyStage } from './sky-stage.js?v=interaction-round-1';

function maskOpenBotsCorners(material){
 // The 960 × 640 source has the same 12-pixel white matte at each corner.
 // Preserve its full UV range. Mask only those source pixels, before bilinear
 // filtering, so the baked white cannot bleed into the rounded window edge.
 material.onBeforeCompile=shader=>{
  shader.fragmentShader=shader.fragmentShader.replace('#include <map_pars_fragment>',`#include <map_pars_fragment>
float openBotsCornerAlpha(vec2 pixel) {
 vec2 edge = min(pixel, vec2(959., 639.) - pixel);
 float cut = edge.y < .5 ? 12. : edge.y < 1.5 ? 8. : edge.y < 2.5 ? 6. : edge.y < 3.5 ? 5. : edge.y < 4.5 ? 4. : edge.y < 5.5 ? 3. : edge.y < 7.5 ? 2. : edge.y < 11.5 ? 1. : 0.;
 return step(cut, edge.x);
}
vec4 openBotsCornerTexel(vec2 pixel) {
 pixel = clamp(pixel, vec2(0.), vec2(959., 639.));
 float alpha = openBotsCornerAlpha(pixel);
 return vec4(texture2D(map, (pixel + .5) / vec2(960., 640.)).rgb * alpha, alpha);
}
vec4 sampleOpenBots(vec2 uv) {
 vec2 edge = min(uv, 1. - uv) * vec2(960., 640.);
 if (edge.x >= 13. || edge.y >= 13.) return texture2D(map, uv);
 vec2 pixel = uv * vec2(960., 640.) - .5;
 vec2 base = floor(pixel), weight = fract(pixel);
 vec4 sampleColor = mix(
  mix(openBotsCornerTexel(base), openBotsCornerTexel(base + vec2(1., 0.)), weight.x),
  mix(openBotsCornerTexel(base + vec2(0., 1.)), openBotsCornerTexel(base + vec2(1., 1.)), weight.x), weight.y);
 sampleColor.rgb /= max(sampleColor.a, .00001);
 return sampleColor;
}`);
  shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',THREE.ShaderChunk.map_fragment.replace('texture2D( map, vMapUv )','sampleOpenBots(vMapUv)'));
 };
 material.customProgramCacheKey=()=> 'openbots-source-corner-matte-3';
}

/** The local story supplies score, artwork and choreography for native scene objects. */
export function createWorldInterface({scene,camera,canvas,onProject,onRelease,onClose,onPull,getArtifactPosition,onGesture,onStoryStart,onCompanion,onTextControls,getReturnLabel}) {
 const layer=document.querySelector('#world-controls');
 const controls=[],point=new THREE.Vector3(),raycaster=new THREE.Raycaster(),ndc=new THREE.Vector2();
 let active=false,companionActive=false,open=false,opening=0,returning=false,object=null,sourceFrame=null,restoreFocus=null,playing=false,key=null;
 let launchGeneration=0,launchReady=false;let muted=false;let previewVideo=null;let filmTexture=null,paperTexture=null,filmGeometry=null,paperGeometry=null,paperMaterial=null,filmMaterial=null,lightTexture=null;let sceneryLayers=[];
 let gripWasPlaying=false;let held=false,start=null,offset=new THREE.Vector3(),zoom=1,playAge=0,ready=false,queued=false,dockReady=false,hovered=false;
 let dock=null,seal=null,pauseMark=null;let skyProgress=0,skyLaunching=false;const skyStage=createSkyStage({scene,camera,getFrame:()=>sourceFrame});
 const revealPlane=new THREE.Plane(new THREE.Vector3(0,-1,0),1.9);const dockPosition=new THREE.Vector3();const pointers=new Map();let pinchStart=0,pinchZoom=1,pinching=false;
 const stage={position:new THREE.Vector3(),scale:1,opacity:1};
 const portrait=()=>innerHeight>innerWidth&&(innerWidth<700||matchMedia('(pointer: coarse)').matches);
 const hint=document.createElement('p');hint.className='world-gesture-hint';layer.append(hint);
 function label(id,name,caption,coords,callback){const b=document.createElement('button');b.type='button';b.className='world-label';b.dataset.worldControl=id;b.setAttribute('aria-label',name);b.innerHTML=`<span class="world-node" aria-hidden="true"></span><span class="world-caption">${caption}</span>`;let pressed=null,suppress=false;b.addEventListener('click',()=>{if(!suppress)callback();});if(id==='tva'||id==='openbots'||id==='bridge'){b.addEventListener('pointerdown',e=>{pressed={x:e.clientX,y:e.clientY};b.setPointerCapture(e.pointerId);onPull?.(id,'start',0,0);});b.addEventListener('pointermove',e=>{if(pressed)onPull?.(id,'move',e.clientX-pressed.x,e.clientY-pressed.y);});b.addEventListener('pointerup',e=>{if(!pressed)return;const moved=Math.hypot(e.clientX-pressed.x,e.clientY-pressed.y);pressed=null;onPull?.(id,'end',0,0);if(moved>8){suppress=true;setTimeout(()=>suppress=false,0);}});b.addEventListener('pointercancel',()=>{pressed=null;onPull?.(id,'end',0,0);});}layer.append(b);controls.push({button:b,point:new THREE.Vector3(...coords),id});}
 label('return-workshop','Return to the general workshop view','RETURN TO WORKSHOP',[-.5,4.1,.3],()=>onCompanion?.());
 function setCompanionActive(value){
  companionActive=Boolean(value);const control=controls.find(item=>item.id==='companion');if(!control)return;
  control.button.setAttribute('aria-pressed',String(companionActive));
  control.button.setAttribute('aria-label','Inspect the companion');
  control.button.querySelector('.world-caption').textContent='VIEW COMPANION';
 }
 const textAccess=document.createElement('button');textAccess.type='button';textAccess.className='guide-text-controls';textAccess.textContent='Show text controls';textAccess.hidden=true;textAccess.addEventListener('click',()=>{fold();onTextControls?.();});layer.append(textAccess);
 const returnControl=document.createElement('button');returnControl.type='button';returnControl.className='projection-return';returnControl.hidden=true;returnControl.addEventListener('click',fold);document.body.append(returnControl);
 function sizeSourceFrame(){if(!sourceFrame)return;const width=portrait()?960:Math.max(960,innerWidth),height=portrait()?600:Math.round(width*innerHeight/innerWidth);sourceFrame.style.width=width+'px';sourceFrame.style.height=height+'px';}
 const external=document.createElement('a');external.className='world-source-link';external.hidden=true;external.target='_blank';external.rel='noopener';layer.append(external);
 function guide(){const c=document.createElement('canvas');c.width=1024;c.height=768;const x=c.getContext('2d');const fog=x.createRadialGradient(512,370,80,512,370,550);fog.addColorStop(0,'rgba(4,28,37,.85)');fog.addColorStop(.7,'rgba(4,28,37,.6)');fog.addColorStop(1,'rgba(4,28,37,0)');x.fillStyle=fog;x.fillRect(0,0,1024,768);x.textAlign='center';x.fillStyle='#b9ffe9';x.font='500 24px sans-serif';x.fillText('THE WORKSHOP · A LITTLE PERSPECTIVE',512,105);x.fillStyle='#f0fff6';x.font='500 53px sans-serif';x.fillText('Where AI tools become working things.',512,190);const lines=[['DRAG','Look around the room.'],['PINCH / SCROLL','Move closer or farther.'],['TOUCH','Open an object. Draw down to return.']];for(let i=0;i<3;i++){let y=305+i*125;x.strokeStyle='rgba(168,255,226,.65)';x.lineWidth=2;x.beginPath();x.arc(190,y-15,27,0,Math.PI*2);x.stroke();x.fillStyle='#b9ffe9';x.font='500 23px sans-serif';x.textAlign='left';x.fillText(lines[i][0],250,y-26);x.fillStyle='#f0fff6';x.font=`400 ${i===2?36:43}px sans-serif`;x.fillText(lines[i][1],250,y+27);}x.textAlign='center';x.fillStyle='#c8e5df';x.font='400 25px sans-serif';x.fillText('ESC: RETURN',512,706);return new THREE.CanvasTexture(c);}
 function paper(){const c=document.createElement('canvas');c.width=660;c.height=840;const ctx=c.getContext('2d');const g=ctx.createLinearGradient(0,0,660,840);g.addColorStop(0,'#ead3a1');g.addColorStop(1,'#c2a35f');ctx.fillStyle=g;ctx.fillRect(0,0,660,840);for(let i=0;i<18000;i++){const x=(Math.sin(i*79.2)*.5+.5)*660,y=(Math.cos(i*13.91)*.5+.5)*840;ctx.fillStyle=i%2?'rgba(72,43,10,.04)':'rgba(255,240,190,.07)';ctx.fillRect(x,y,1,1)}ctx.fillStyle='#4e381c';ctx.font='12px monospace';ctx.fillText('TVA · TEMPORAL RECORDS DIVISION',40,40);ctx.textAlign='right';ctx.fillText('FOR OFFICIAL USE ONLY',620,40);ctx.textAlign='left';ctx.fillRect(40,55,580,1);ctx.font='bold 34px monospace';ctx.fillText('CASE FILE № L-1607',40,112);ctx.font='11px monospace';ctx.fillText('FILE REVIEW — RECORD BEGINS ON OPENING',40,147);ctx.font='18px monospace';ctx.fillText('SUBJECT: COLOMBANI, LORENZO',40,213);ctx.save();ctx.translate(473,704);ctx.rotate(-.18);ctx.strokeStyle='#a64b37';ctx.lineWidth=5;ctx.strokeRect(-115,-40,230,74);ctx.strokeRect(-106,-31,212,56);ctx.fillStyle='#a64b37';ctx.font='bold 39px monospace';ctx.textAlign='center';ctx.fillText('VARIANT',0,11);ctx.restore();return new THREE.CanvasTexture(c);}
 function curvedPlane(width,height,bend){const geo=new THREE.PlaneGeometry(width,height,48,32);const pos=geo.attributes.position;for(let i=0;i<pos.count;i++){const x=pos.getX(i),y=pos.getY(i);pos.setZ(i,x*x*bend+Math.sin(y*.9)*.03);}geo.computeVertexNormals();return geo;}
 function finishFold(){returnControl.hidden=true;if(!open)return;textAccess.hidden=true;launchGeneration++;launchReady=false;open=false;playing=false;returning=false;skyProgress=0;skyLaunching=false;document.body.classList.remove('sky-active');skyStage.update(0);document.body.dataset.projection='closed';canvas.setAttribute('aria-label','Interactive three-dimensional workshop. Drag empty space to look around. Pinch or scroll to move closer. Inspect the Products and Services displays, or look around the room.');if(previewVideo){previewVideo.pause();previewVideo.removeAttribute('src');previewVideo.load();previewVideo.remove();previewVideo=null;}if(sourceFrame){sourceFrame.src='about:blank';sourceFrame.remove();sourceFrame=null;}if(object){object.children.forEach(c=>c.traverse(o=>{o.geometry?.dispose();o.material?.map?.dispose();o.material?.dispose();}));scene.remove(object);object=null;}if(dock){scene.remove(dock);dock.traverse(o=>{o.geometry?.dispose();o.material?.map?.dispose();o.material?.dispose();});dock=null;}for(const s of sceneryLayers){scene.remove(s.mesh);s.mesh.geometry.dispose();s.mesh.material.dispose();s.texture.dispose();}sceneryLayers=[];lightTexture?.dispose();lightTexture=null;paperGeometry?.dispose();filmGeometry?.dispose();paperMaterial?.dispose();filmMaterial?.dispose();paperTexture?.dispose();filmTexture?.dispose();filmTexture=null;external.hidden=true;document.body.classList.remove('projection-open');onClose();requestAnimationFrame(()=>restoreFocus?.focus({preventScroll:true}));}
 function fold(){outsideTap.cancel();if(!open||returning)return;returnControl.disabled=true;textAccess.hidden=true;launchGeneration++;launchReady=false;returning=true;held=false;sourceFrame?.contentWindow?.__LOKI?.pause();pointers.clear();pinching=false;external.hidden=true;}
 function show(project){outsideTap.cancel();if(open)finishFold();textAccess.hidden=project!=='guide';textAccess.textContent=document.body.classList.contains('text-controls')?'Hide text controls':'Show text controls';returnControl.hidden=false;returnControl.disabled=false;returnControl.textContent='← '+(getReturnLabel?.()||'Return to the Workshop');open=true;key=project;opening=0;returning=false;playing=false;playAge=0;zoom=project==='tva'?1.12:1;ready=project!=='tva';queued=false;dockReady=false;hovered=false;offset.set(0,0,0);document.body.dataset.dockReady='false';restoreFocus=document.activeElement;document.body.classList.add('projection-open');document.body.dataset.projection='paper';canvas.tabIndex=0;canvas.setAttribute('aria-label',project==='tva'?'Floating case file. Touch or press Space to open or pause. Swipe or drag down, or press Escape, to return. Arrow keys move through the story.':project==='guide'?'Projected guide. Swipe or drag down, or press Escape, to return.':'Looping OpenBots preview. Drag to inspect. Swipe or drag down to dismiss, or press Escape to return.');canvas.focus({preventScroll:true});
  paperGeometry=curvedPlane(project==='tva'?3.25:project==='guide'?6.8:7.2,project==='tva'?4.14:project==='guide'?5.1:4.8,.018);
  if(project==='tva')paperTexture=paper();else if(project==='guide')paperTexture=guide();else{previewVideo=document.createElement('video');previewVideo.className='film-engine';previewVideo.src='./media/openbots.mp4';previewVideo.muted=true;previewVideo.loop=true;previewVideo.autoplay=true;previewVideo.playsInline=true;previewVideo.preload='auto';previewVideo.setAttribute('aria-hidden','true');document.body.append(previewVideo);paperTexture=new THREE.VideoTexture(previewVideo);previewVideo.play().catch(()=>{});}
  paperTexture.colorSpace=THREE.SRGBColorSpace;
  paperMaterial=project==='tva'?new THREE.MeshStandardMaterial({map:paperTexture,side:THREE.DoubleSide,roughness:.82,metalness:0,transparent:true,opacity:0}):new THREE.MeshBasicMaterial({map:paperTexture,side:THREE.DoubleSide,transparent:true,opacity:0,depthWrite:false});
  if(project==='openbots')maskOpenBotsCorners(paperMaterial);
  paperMaterial.clippingPlanes=[revealPlane];object=new THREE.Mesh(paperGeometry,paperMaterial);object.position.set(0,4.2,.5);object.rotation.set(-.04,.33,-.035);scene.add(object);
  dockPosition.set(project==='tva'?-2.5:project==='guide'?0:2.5,project==='guide'?2:2.65,1.35);dock=new THREE.Group();dock.position.copy(dockPosition);scene.add(dock);
  for(let i=0;i<2;i++){const r=new THREE.Mesh(new THREE.TorusGeometry(.56+i*.19,.014,8,72),new THREE.MeshBasicMaterial({color:project==='tva'?0xffd995:0xb7ffec,transparent:true,opacity:.24,depthWrite:false}));r.rotation.x=Math.PI/2;dock.add(r);}
  seal=new THREE.Mesh(new THREE.TorusGeometry(.15,.02,8,48,Math.PI*1.5),new THREE.MeshBasicMaterial({color:0xffd78d,transparent:true,opacity:.7,depthWrite:false}));seal.position.set(1.03,-1.46,.09);object.add(seal);
  pauseMark=new THREE.Group();pauseMark.position.set(3.55,-2.27,.08);const circle=new THREE.Mesh(new THREE.TorusGeometry(.23,.012,6,40),new THREE.MeshBasicMaterial({color:0xb8fff0,transparent:true,opacity:.8,depthWrite:false}));pauseMark.add(circle);const playShape=new THREE.Shape();playShape.moveTo(-.055,-.08);playShape.lineTo(.085,0);playShape.lineTo(-.055,.08);playShape.closePath();pauseMark.add(new THREE.Mesh(new THREE.ShapeGeometry(playShape),new THREE.MeshBasicMaterial({color:0xb8fff0,side:THREE.DoubleSide,depthWrite:false})));pauseMark.visible=false;object.add(pauseMark);
  if(project==='tva'){
   sourceFrame=document.createElement('iframe');sourceFrame.className='film-engine';sourceFrame.src='./experiences/tva/?field=sky-source-10';sizeSourceFrame();sourceFrame.title='TVA source renderer';sourceFrame.tabIndex=-1;sourceFrame.setAttribute('aria-hidden','true');sourceFrame.allow='autoplay';document.body.append(sourceFrame);
   filmGeometry=curvedPlane(9,5.625,.014);
  }
  if(project==='tva'){external.hidden=true;external.removeAttribute('href');external.textContent='';}else{external.href=project==='guide'?'../work/':'https://github.com/LorenzoColombani/openbots';external.textContent=project==='guide'?'EXPLORE THE WORK ↗':'OPENBOTS · PROJECT & RELEASE ↗';external.hidden=false;}
 }
 function activate(){if(!open||returning)return;if(key==='openbots')return;if(key!=='tva')return;const film=sourceFrame?.contentWindow?.__LOKI;if(!film){queued=true;document.body.dataset.projection='loading';return;}const ready=film.started()||!sourceFrame.contentDocument.getElementById('gate-btn')?.disabled;if(!ready){queued=true;object.rotation.z-=.04;document.body.dataset.projection='loading';return;}if(!film.started()){zoom=1;onStoryStart?.();const score=sourceFrame.contentDocument.getElementById('score');if(score)score.muted=muted;const token=++launchGeneration;const frame=sourceFrame;skyLaunching=true;launchReady=false;skyProgress=0;Promise.resolve(film.startHeld()).then(admitted=>{if(token!==launchGeneration||sourceFrame!==frame||!open||returning)return;launchReady=admitted;if(!admitted)skyLaunching=false;});onGesture?.('deploy');}else if(skyLaunching)return;else if(film.t()>=film.dur-.1){onStoryStart?.();film.seek(0);film.play();playAge=0;}else if(film.paused())film.play();else film.pause();}
 function hit(e){
  if(!object)return false;
  ndc.set(e.clientX/innerWidth*2-1,1-e.clientY/innerHeight*2);raycaster.setFromCamera(ndc,camera);
  if(playing&&skyProgress>.60)return Boolean(skyStage.hit(e));
  if(object.visible)return raycaster.intersectObject(object,false).length>0;
  // Keep the return gesture available while the dossier hands off to the sky.
  return key==='tva'&&skyLaunching;
 }
 function downwardReturn(e){if(!start)return false;const dx=e.clientX-start.x,dy=e.clientY-start.y;return dy>95&&Math.abs(dx)<dy*.8;}
 // Staging area: a plain click outside a staged card (loaded on the table, not yet launched) returns to the holo screen.
 const outsideTap=createOutsideTap();
 const staged=()=>open&&key==='tva'&&!playing&&!queued&&!returning&&!skyLaunching;
 canvas.addEventListener('pointerdown',e=>{if(outsideTap.down(e,staged()&&!pointers.size&&!hit(e)))canvas.setPointerCapture(e.pointerId);if(!open||(!hit(e)&&!pointers.size))return;e.preventDefault();e.stopImmediatePropagation();pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});canvas.setPointerCapture(e.pointerId);if(pointers.size===2){const a=[...pointers.values()];pinchStart=Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y);pinchZoom=zoom;pinching=true;held=false;}else{held=true;canvas.focus({preventScroll:true});const f=sourceFrame?.contentWindow?.__LOKI;gripWasPlaying=Boolean(f?.started()&&!f.paused());if(gripWasPlaying)f.pause();onGesture?.('grab');start={x:e.clientX,y:e.clientY};}});
 canvas.addEventListener('pointermove',e=>{outsideTap.move(e);if(!open)return;if(pointers.has(e.pointerId))pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(pinching&&pointers.size===2){e.preventDefault();e.stopImmediatePropagation();const a=[...pointers.values()];zoom=THREE.MathUtils.clamp(pinchZoom*Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y)/Math.max(10,pinchStart),.7,1.5);return;}if(held){e.preventDefault();e.stopImmediatePropagation();onGesture?.('move');offset.set(THREE.MathUtils.clamp((e.clientX-start.x)*.011,-2.2,2.2),THREE.MathUtils.clamp(-(e.clientY-start.y)*.011,-1.2,1.8),0);point.copy(dockPosition).project(camera);const nearDock=Math.hypot(e.clientX-(point.x*.5+.5)*innerWidth,e.clientY-(-point.y*.5+.5)*innerHeight)<Math.max(46,innerWidth*.052);const drawnDown=downwardReturn(e);dockReady=playing||key==='openbots'?drawnDown:nearDock||drawnDown;document.body.dataset.dockReady=String(dockReady);canvas.style.cursor='grabbing';}else {hovered=hit(e);if(hovered)e.stopImmediatePropagation();canvas.style.cursor=hovered?'grab':'default';}});
 canvas.addEventListener('pointerup',e=>{if(outsideTap.up(e,staged()&&!held&&!pinching&&!hit(e))){fold();return;}pointers.delete(e.pointerId);if(pinching){e.preventDefault();e.stopImmediatePropagation();if(!pointers.size){pinching=false;if(gripWasPlaying)sourceFrame?.contentWindow?.__LOKI?.play();}held=false;return;}if(!open||!held)return;e.preventDefault();e.stopImmediatePropagation();held=false;const moved=Math.hypot(e.clientX-start.x,e.clientY-start.y),drawnDown=downwardReturn(e);dockReady=playing||key==='openbots'?drawnDown:dockReady||drawnDown;if(dockReady&&moved>12)fold();else if(moved<9){const link=playing?skyStage.linkAt(e):null;if(link){window.open(link,'_blank','noopener');if(gripWasPlaying)sourceFrame?.contentWindow?.__LOKI?.play();}else if(!(playing&&gripWasPlaying))activate();}else if(gripWasPlaying)sourceFrame?.contentWindow?.__LOKI?.play();dockReady=false;document.body.dataset.dockReady='false';});
 canvas.addEventListener('pointercancel',()=>{outsideTap.cancel();if(open&&!returning&&gripWasPlaying)sourceFrame?.contentWindow?.__LOKI?.play();held=false;pinching=false;gripWasPlaying=false;dockReady=false;document.body.dataset.dockReady='false';pointers.clear();offset.set(0,0,0)});
 canvas.addEventListener('wheel',e=>{if(!open||!hit(e))return;e.preventDefault();e.stopImmediatePropagation();zoom=THREE.MathUtils.clamp(zoom-e.deltaY*.001,.7,1.35);onGesture?.('move');},{passive:false});
 addEventListener('keydown',e=>{if(!open)return;if(e.key==='Escape'){e.preventDefault();fold();}if(key==='tva'&&playing&&(e.key==='ArrowLeft'||e.key==='ArrowRight')&&!e.target.closest('input')){e.preventDefault();const f=sourceFrame?.contentWindow?.__LOKI;if(f)f.seek(Math.max(0,Math.min(f.dur,f.t()+(e.key==='ArrowRight'?1:-1)*(e.shiftKey?10:5))));}if(e.code==='Space'&&!e.target.closest('button,a,input')){e.preventDefault();activate();}});
 function render(dt,reduced=false){
  for(const c of controls){
   if(c.id==='return-workshop'){
    const visible=active&&!open&&companionActive;c.button.hidden=!visible;
    if(visible){c.button.style.left='50%';c.button.style.top=innerWidth<600?'105px':'92px';}
    continue;
   }
   const position=getArtifactPosition?.(c.id);if(position)point.copy(position).add(new THREE.Vector3(-.3,-.3,.2));else point.copy(c.point);point.project(camera);
   const relevant=c.id==='companion'?!companionActive:true,visible=active&&!open&&relevant&&point.z<1&&Math.abs(point.x)<.96&&Math.abs(point.y)<.9;c.button.hidden=!visible;
   if(visible){const short=innerHeight<520,mobile=innerWidth<600,dx=short?({tva:-16,openbots:16,companion:-18}[c.id]||0):mobile?({tva:-18,openbots:18,companion:-26}[c.id]||0):({tva:-25,openbots:25,companion:-42}[c.id]||0),dy=short?({bridge:46,tva:20,openbots:20,companion:-22,release:-8}[c.id]||0):mobile?({bridge:48,tva:14,openbots:14,companion:-18,release:-6}[c.id]||0):({bridge:48,tva:16,openbots:16,companion:-24,release:-8}[c.id]||0),half=c.button.offsetWidth/2+12;c.button.style.left=`${THREE.MathUtils.clamp((point.x*.5+.5)*innerWidth+dx,half,innerWidth-half)}px`;c.button.style.top=`${(-point.y*.5+.5)*innerHeight+dy}px`;}
  }
  hint.hidden=!active;hint.textContent=!open?(innerWidth<700?'DRAG TO EXPLORE · PINCH TO ZOOM':'DRAG EMPTY SPACE TO LOOK AROUND · PINCH OR SCROLL TO MOVE CLOSER · SELECT A DESK DISPLAY TO LOOK CLOSER'):held?(dockReady?'RELEASE TO RETURN TO THE TABLE':playing||key==='openbots'||key==='tva'||key==='guide'?'DRAW DOWN TO RETURN':'BRING IT TO ITS GLOWING SOURCE'):key==='guide'?'READ THE PROJECTION · DRAW DOWN TO RETURN':key==='openbots'?'DRAG TO INSPECT · DRAW DOWN TO RETURN':!ready?'LIGHT IS GATHERING IN THE SEAL…':skyLaunching?'FOLLOW THE LIGHT…':playing?(sourceFrame?.contentWindow?.__LOKI?.t()>=sourceFrame?.contentWindow?.__LOKI?.dur-.1?'TOUCH TO WATCH AGAIN · RETURN IT TO THE TABLE':sourceFrame?.contentWindow?.__LOKI?.paused()?'PAUSED · TOUCH TO CONTINUE':'TOUCH TO HOLD · DRAW DOWN TO RETURN'):'TAP THE DOSSIER TO PLAY';
  if(!object)return;
  const film=sourceFrame?.contentWindow?.__LOKI;
  document.body.dataset.orientation=portrait()?'portrait':'landscape';
  ready=key!=='tva'||Boolean(film&&!sourceFrame?.contentDocument?.getElementById('gate-btn')?.disabled);if(ready&&queued){queued=false;activate();}const started=Boolean(film?.started());
  if(started&&!playing){playing=true;document.body.dataset.projection='film';}
  if(playing){playAge+=dt;skyProgress=reduced?(returning?0:1):THREE.MathUtils.clamp(skyProgress+(returning?-dt:dt)/(returning?1.05:3.2),0,1);if(skyLaunching&&launchReady&&skyProgress===1&&!returning){skyLaunching=false;film.seek(0);film.play();}object.visible=skyProgress<.35;skyStage.update(skyProgress,Math.max(1,zoom));document.body.classList.toggle('sky-active',skyProgress>.9);pauseMark.visible=Boolean(film?.paused());document.body.dataset.projection=pauseMark.visible?'paused':'film';}if(seal){seal.visible=!playing;if(!ready&&!reduced)seal.rotation.z+=dt*2;seal.material.opacity=ready?.3:.7+Math.sin(performance.now()*.004)*.25;}if(dock){const intensity=held?(dockReady?1:.6):.22;dock.scale.setScalar(dockReady?1.25:1);dock.children.forEach(r=>r.material.opacity=intensity);}
  if(returning&&skyProgress===0){opening=reduced?0:Math.max(0,opening-dt*2.6);if(opening===0){finishFold();return;}}else opening=reduced?1:Math.min(1,opening+dt*1.3);
  const eased=1-Math.pow(1-opening,4);const mobile=innerWidth<600;
  revealPlane.constant=1.88+eased*((key==='guide'?8.3:key==='openbots'?8:7.2)-1.88);object.scale.setScalar(mobile?(key==='tva'?1.1:key==='guide'?1:.70):key==='openbots'?.88:1);object.material.opacity=Math.min(1,playing?playAge*1.1:eased)*Math.max(.15,1-offset.length()*.22);
  if(!held)offset.multiplyScalar(Math.exp(-dt*6));
  const baseY=key==='openbots'?5.2:key==='guide'?5.5:4.8,baseZ=key==='openbots'?2.0:key==='guide'?1.4:.5;if(returning)object.position.set(dockPosition.x*(1-eased)+offset.x*eased,dockPosition.y*(1-eased)+(baseY+offset.y)*eased,dockPosition.z*(1-eased)+baseZ*eased);else object.position.set(offset.x,baseY-.15+eased*.15+offset.y,baseZ+(hovered&&!held?.07:0));object.rotation.y=(mobile?0:key==='openbots'?.08:.33)+offset.x*.10+(1-eased)*1.2;object.rotation.z=-.035+offset.x*.035+(hovered&&!held?.012:0);
  stage.scale=returning?eased:1;stage.position.copy(offset).multiplyScalar(stage.scale);if(returning)stage.position.addScaledVector(dockPosition,1-eased);stage.opacity=eased;
  if(playing)object.material.opacity*=1-THREE.MathUtils.smoothstep(skyProgress,0,.35);
 }
 return {show,fold,render,setCompanionActive,setMuted(value){muted=Boolean(value);const score=sourceFrame?.contentDocument?.getElementById('score');if(score)score.muted=muted;},getSystem(){return null;},renderSky(renderer){skyStage.render(renderer);},get skyProgress(){return skyProgress;},get stage(){return stage;},get viewZoom(){return zoom;},get opening(){return opening;},get kind(){return key;},get readingPose(){return null;},get focusPoint(){return key==='openbots'?{y:5.2,z:2}:key==='guide'?{y:5.5,z:1.4}:{y:4.8,z:.5};},dispose(){finishFold();skyStage.dispose();returnControl.remove();},getFilm(){return open&&key==='tva'?sourceFrame?.contentWindow?.__LOKI:null;},resize(){sizeSourceFrame();},setActive(value){active=value;layer.classList.toggle('active',value)},get isOpen(){return open},get isPlaying(){return playing}};
}
