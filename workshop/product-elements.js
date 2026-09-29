import * as THREE from 'three';
import { productLayout, productPanelRect } from './viewport-layout.js?v=interaction-round-1';
import { PRODUCTS } from './product-catalog.js?v=website-prototype-15';
import { releaseVelocity, captureIntent, boundedCardPosition } from './product-gestures.js?v=interaction-round-1';

const CYAN=0x9fe8ff,PINK=0xff86bd;
const websiteCard=item=>Boolean(item.website&&(item.website.enabled||(item.website.prototype&&['127.0.0.1','localhost'].includes(globalThis.location?.hostname))));
const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
const escapeText=(ctx,text,max)=>{const words=text.split(/\s+/),lines=[];let line='';for(const word of words){if(ctx.measureText(line+' '+word).width>max&&line){lines.push(line);line=word;}else line+=(line?' ':'')+word;}if(line)lines.push(line);return lines;};

/** The first tangent carries the hand's motion; the table catches the flight. */
export function makeLaunchFlight(from,to,{kind='button',velocity=new THREE.Vector3(),speed=0}={}){
  const momentum=kind==='flick',distance=from.distanceTo(to);
  const duration=momentum?THREE.MathUtils.clamp(.64-.12*Math.log2(1+speed*.9),.34,.60):kind==='drop'?.58:.82;
  const lead=momentum?velocity.clone().multiplyScalar(duration/3):to.clone().sub(from).multiplyScalar(.28).add(new THREE.Vector3(0,.65,0));
  if(momentum){if(lead.lengthSq()<1e-8)lead.copy(to).sub(from);lead.clampLength(distance*.14,Math.max(.05,distance*.72));}
  const arrival=to.clone().lerp(from,.12).add(new THREE.Vector3(0,.18,0));
  return {arc:new THREE.CubicBezierCurve3(from,from.clone().add(lead),arrival,to),duration,momentum};
}

/** Element tiles stay real scene objects; DOM controls only supply input/accessibility. */
export function createProductElements({scene,camera,onGesture,onLaunchStart,onLaunch,onCancel,onRestore,announce}){
  const root=new THREE.Group();root.name='Products / holographic element library';root.visible=false;scene.add(root);
  const ui=document.createElement('section');ui.id='product-element-controls';ui.setAttribute('aria-label','Product elements');ui.hidden=true;document.body.append(ui);
  const hint=document.createElement('p');hint.className='product-move-hint';hint.textContent='Drag a card · Drop or flick toward the table';ui.append(hint);
  const dock=document.createElement('div');dock.className='product-table-catch';dock.hidden=true;dock.innerHTML='<span>Release to open</span>';document.body.append(dock);
  const pages=document.createElement('div');pages.className='product-pages';pages.setAttribute('role','group');pages.setAttribute('aria-label','Product pages');
  const prev=document.createElement('button'),pageLabel=document.createElement('span'),next=document.createElement('button');
  prev.type=next.type='button';prev.textContent='←';next.textContent='→';prev.setAttribute('aria-label','Previous products');next.setAttribute('aria-label','Next products');pages.append(prev,pageLabel,next);ui.append(pages);
  const dialog=document.createElement('dialog');dialog.className='product-detail';dialog.setAttribute('aria-labelledby','product-detail-title');dialog.setAttribute('aria-describedby','product-detail-copy');
  const close=document.createElement('button');close.type='button';close.textContent='← Return to products';
  const detailIndex=document.createElement('p'),detailTitle=document.createElement('h2'),detailCopy=document.createElement('p'),detailLink=document.createElement('a');
  detailTitle.id='product-detail-title';detailCopy.id='product-detail-copy';detailIndex.className='product-detail-index';detailCopy.className='product-detail-copy';detailLink.className='product-detail-link';detailLink.target='_blank';detailLink.rel='noopener noreferrer';
  dialog.append(close,detailIndex,detailTitle,detailCopy,detailLink);document.body.append(dialog);
  close.addEventListener('click',()=>dialog.close());dialog.addEventListener('close',()=>{onRestore?.();onGesture?.('dock');});
  const ray=new THREE.Raycaster(),ndc=new THREE.Vector2(),plane=new THREE.Plane(),normal=new THREE.Vector3(),scratch=new THREE.Vector3();
  const table=new THREE.Vector3(0,4.2,.5),positions=new Map();
  const focusPose={position:new THREE.Vector3(),quaternion:new THREE.Quaternion()},focusEuler=new THREE.Euler(),focusScale=new THREE.Vector3(1,1,1),restPose={position:new THREE.Vector3(),quaternion:new THREE.Quaternion(),scale:new THREE.Vector3()},restMatrix=new THREE.Matrix4(),restStep=new THREE.Matrix4(),UNIT=new THREE.Vector3(1,1,1);
  let cards=[],board=null,outline=null,drag=null,flight=null,selected=null,active=false,alpha=0,deskMix=0,page=0,narrow=productLayout(innerWidth,innerHeight).compact,disposed=false,config=null,pendingFocus=false;

  const tetherGroup=new THREE.Group();tetherGroup.name='Selected product / table connection';tetherGroup.visible=false;scene.add(tetherGroup);
  const tetherGeometry=new THREE.BufferGeometry();tetherGeometry.setAttribute('position',new THREE.Float32BufferAttribute(new Float32Array(49*3),3));
  const tetherMaterial=new THREE.LineDashedMaterial({color:0x9fdbed,transparent:true,opacity:0,depthWrite:false,dashSize:.08,gapSize:.13});
  const tether=new THREE.Line(tetherGeometry,tetherMaterial);tether.renderOrder=29;tether.raycast=()=>{};tetherGroup.add(tether);
  const dotGeometry=new THREE.SphereGeometry(.023,6,5),dotMaterial=new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:0,depthWrite:false,toneMapped:false});
  const dots=new THREE.InstancedMesh(dotGeometry,dotMaterial,32);dots.frustumCulled=false;dots.renderOrder=30;dots.raycast=()=>{};tetherGroup.add(dots);
  const tetherCurve=new THREE.CubicBezierCurve3(new THREE.Vector3(),new THREE.Vector3(),new THREE.Vector3(),table.clone());
  const dotPose=new THREE.Object3D(),dotColor=new THREE.Color(),fromColor=new THREE.Color(PINK),toColor=new THREE.Color(CYAN);let tetherAlpha=0;
  function updateTether(dt,time,obscured,reduced){
    const card=cards.find(c=>c.item.id===selected),show=Boolean(card&&(active||flight)&&!obscured);
    tetherAlpha=THREE.MathUtils.damp(tetherAlpha,show?1:0,7,dt);tetherGroup.visible=tetherAlpha>.01&&!obscured;
    if(!tetherGroup.visible)return;
    if(show){
      (flight?.group||card.group).getWorldPosition(tetherCurve.v0);
      tetherCurve.v1.copy(tetherCurve.v0).lerp(table,.32).add(new THREE.Vector3(0,2.0+(reduced?0:Math.sin(time*.8)*.13),0));
      tetherCurve.v2.copy(table).add(new THREE.Vector3(-.65+(reduced?0:Math.sin(time*.6)*.12),1.4,.9));
      const position=tetherGeometry.attributes.position;
      for(let i=0;i<=48;i++){tetherCurve.getPoint(i/48,scratch);position.setXYZ(i,scratch.x,scratch.y,scratch.z);}position.needsUpdate=true;tether.computeLineDistances();tetherGeometry.computeBoundingSphere();
    }
    tetherMaterial.opacity=tetherAlpha*.22;dotMaterial.opacity=tetherAlpha*.55;
    for(let i=0;i<32;i++){const t=(i/32+(reduced?0:time*.075))%1;tetherCurve.getPoint(t,dotPose.position);dotPose.scale.setScalar(.7+.4*Math.sin(t*Math.PI));dotPose.updateMatrix();dots.setMatrixAt(i,dotPose.matrix);dots.setColorAt(i,dotColor.copy(fromColor).lerp(toColor,t));}dots.instanceMatrix.needsUpdate=true;if(dots.instanceColor)dots.instanceColor.needsUpdate=true;
  }
  function canvasTexture(canvas){const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=4;return texture;}
  function paint(card,warm=false){
    const x=card.canvas.getContext('2d'),w=512,h=600,ink=warm?'#ffd6e8':'#dcf7ff',edge=warm?'#ff80b6':'#79d7f3';x.clearRect(0,0,w,h);
    const g=x.createLinearGradient(0,0,w,h);g.addColorStop(0,warm?'rgba(59,12,40,.84)':'rgba(7,32,48,.85)');g.addColorStop(1,warm?'rgba(27,9,24,.68)':'rgba(4,20,35,.68)');x.fillStyle=g;x.fillRect(0,0,w,h);
    x.strokeStyle=edge;x.lineWidth=2;x.strokeRect(1,1,510,598);
    x.globalAlpha=.10;for(let y=6;y<h;y+=6){x.beginPath();x.moveTo(8,y);x.lineTo(504,y);x.stroke();}x.globalAlpha=1;
    x.lineWidth=5;for(const [a,b,sx,sy] of [[8,8,1,1],[504,8,-1,1],[8,592,1,-1],[504,592,-1,-1]]){x.beginPath();x.moveTo(a,b+38*sy);x.lineTo(a,b);x.lineTo(a+56*sx,b);x.stroke();}
    x.fillStyle=edge;x.font='24px monospace';x.fillText(card.item.number,30,46);x.textAlign='right';x.font='20px monospace';x.fillText(card.item.featured?'EXPERIENCE':'PROJECT',478,46);x.textAlign='left';
    // Different authored motifs distinguish the two lead experiences at a glance.
    x.save();x.translate(256,219);x.strokeStyle=edge;x.globalAlpha=.26;x.lineWidth=2;
    if(card.item.id==='bridge'){for(let r=78;r<=131;r+=17){x.beginPath();x.arc(0,0,r,-.35+r*.003,Math.PI*1.80+r*.003);x.stroke();}}
    else if(card.item.id==='tva'){for(let i=0;i<5;i++){x.beginPath();x.moveTo(0,103);x.bezierCurveTo(-70+i*20,20,-95+i*46,-35,(i-2)*48,-112);x.stroke();}}
    else {x.strokeRect(-112,-112,224,224);x.beginPath();x.moveTo(-128,0);x.lineTo(128,0);x.moveTo(0,-128);x.lineTo(0,128);x.stroke();}
    x.restore();x.fillStyle=ink;x.textAlign='center';x.font='300 157px Arial';x.fillText(card.item.symbol,256,266);
    x.font=`500 ${narrow?60:49}px Arial`;const lines=escapeText(x,card.item.title,443).slice(0,3);lines.forEach((line,i)=>x.fillText(line,256,321+i*(narrow?57:47)));
    x.strokeStyle=edge;x.globalAlpha=.40;x.lineWidth=1;x.beginPath();x.moveTo(29,490);x.lineTo(483,490);x.stroke();x.globalAlpha=1;
    x.fillStyle=ink;x.font=`500 ${narrow?54:43}px Arial`;x.fillText(card.item.featured?(narrow?'Launch  ↗':'Launch experience  ↗'):websiteCard(card.item)?'Open website  ↗':'View project  ↗',256,550);
    x.textAlign='left';card.texture.needsUpdate=true;
  }
  function clearCards(){for(const card of cards){card.hit.remove();card.group.removeFromParent();card.face.geometry.dispose();card.face.material.dispose();card.edge.geometry.dispose();card.edge.material.dispose();card.texture.dispose();}cards=[];if(board){board.geometry.dispose();board.material.map.dispose();board.material.dispose();board.removeFromParent();board=null;}if(outline){outline.geometry.dispose();outline.material.dispose();outline.removeFromParent();outline=null;}}
  function layout(){
    cancelDrag();if(flight)cancelFlight();clearCards();
    config=productLayout(innerWidth,innerHeight);narrow=config.compact;const {cols,rows,w,h,gap,cw,ch}=config;
    document.body.dataset.productLayout=config.kind;const maxPage=Math.ceil(PRODUCTS.length/config.size)-1;page=Math.min(page,maxPage);
    const c=document.createElement('canvas');c.width=1200;c.height=narrow?Math.round(1200*h/w):720;const x=c.getContext('2d');x.fillStyle=narrow?'rgba(3,18,29,.88)':'rgba(3,18,29,.68)';x.fillRect(0,0,c.width,c.height);x.strokeStyle='rgba(134,218,247,.6)';x.lineWidth=2;x.strokeRect(2,2,c.width-4,c.height-4);x.fillStyle='#daf7ff';x.font=`500 ${narrow?64:44}px Arial`;x.fillText('Products',35,narrow?82:65);if(!narrow){x.textAlign='right';x.font='21px monospace';x.fillStyle='#94cddd';x.fillText('SELECT  /  MOVE  /  LAUNCH',1160,61);}
    board=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({map:canvasTexture(c),transparent:true,depthWrite:false,side:THREE.DoubleSide,toneMapped:false}));board.renderOrder=18;board.raycast=()=>{};root.add(board);
    const points=[[-w/2,-h/2,.02],[-w/2,h/2,.02],[w/2,h/2,.02],[w/2,-h/2,.02],[-w/2,-h/2,.02]].map(p=>new THREE.Vector3(...p));outline=new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),new THREE.LineBasicMaterial({color:CYAN,transparent:true,opacity:.5,depthWrite:false}));outline.renderOrder=19;root.add(outline);
    PRODUCTS.slice(page*config.size,(page+1)*config.size).forEach((item,index)=>{
      const home={x:(index%cols-(cols-1)/2)*(cw+gap),y:h/2-.45-ch/2-Math.floor(index/cols)*(ch+gap)};
      const key=`${config.key}:${item.id}`,saved=positions.get(key)||home;
      const group=new THREE.Group();group.position.set(saved.x,saved.y,.07);root.add(group);
      const canvas=document.createElement('canvas');canvas.width=512;canvas.height=600;const texture=canvasTexture(canvas);
      const face=new THREE.Mesh(new THREE.PlaneGeometry(cw,ch),new THREE.MeshBasicMaterial({map:texture,transparent:true,depthWrite:false,side:THREE.DoubleSide,toneMapped:false}));face.renderOrder=21;face.raycast=()=>{};group.add(face);
      const edge=new THREE.LineSegments(new THREE.EdgesGeometry(face.geometry),new THREE.LineBasicMaterial({color:CYAN,transparent:true,opacity:.6,depthWrite:false}));edge.position.z=.012;edge.renderOrder=22;edge.raycast=()=>{};group.add(edge);
      const hit=document.createElement('div');hit.className='product-element-hit';const grab=document.createElement('button'),launch=document.createElement('button');grab.type=launch.type='button';grab.className='product-element-grab';launch.className='product-element-launch';
      grab.setAttribute('aria-pressed',String(selected===item.id));grab.setAttribute('aria-label',`Select or move ${item.title}`);grab.title=item.title;launch.setAttribute('aria-label',`${item.featured?'Launch':websiteCard(item)?'Open':'View'} ${item.title}`);launch.title=item.featured?'Launch experience':websiteCard(item)?'Open website':'View project';
      hit.append(grab,launch);ui.append(hit);
      const card={item,group,face,edge,canvas,texture,hit,grab,launch,home,x:saved.x,y:saved.y,key,index,hover:false};cards.push(card);paint(card,selected===item.id);
      grab.addEventListener('pointerdown',e=>beginDrag(e,card));grab.addEventListener('pointermove',moveDrag);grab.addEventListener('pointerup',endDrag);grab.addEventListener('pointercancel',cancelDrag);grab.addEventListener('lostpointercapture',()=>{if(drag?.card===card)cancelDrag();});
      grab.addEventListener('click',()=>select(card));launch.addEventListener('click',()=>{if(active&&!flight&&!drag)launchCard(card);});
      for(const button of [grab,launch]){button.addEventListener('pointerenter',()=>card.hover=true);button.addEventListener('pointerleave',()=>card.hover=false);button.addEventListener('focus',()=>select(card));}
      grab.addEventListener('keydown',e=>{const dirs={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,1],ArrowDown:[0,-1]};if(dirs[e.key]){e.preventDefault();select(card);const [dx,dy]=dirs[e.key],p=boundedCardPosition({x:card.x+dx*.14,y:card.y+dy*.14},bounds());card.x=p.x;card.y=p.y;positions.set(card.key,p);}});
    });
    pageLabel.textContent=`${page+1} / ${maxPage+1}`;prev.disabled=page===0;next.disabled=page===maxPage;
  }
  function bounds(){return {minX:-config.w/2+config.cw/2+.1,maxX:config.w/2-config.cw/2-.1,minY:-config.h/2+config.ch/2+.1,maxY:config.h/2-config.ch/2-.42};}
  function select(card){if(selected!==card.item.id){selected=card.item.id;cards.forEach(c=>paint(c,c===card));onGesture?.('select');}card.grab.setAttribute('aria-pressed','true');cards.filter(c=>c!==card).forEach(c=>c.grab.setAttribute('aria-pressed','false'));}
  function localPoint(x,y){ndc.set(x/innerWidth*2-1,1-y/innerHeight*2);ray.setFromCamera(ndc,camera);normal.set(0,0,1).applyQuaternion(root.quaternion);plane.setFromNormalAndCoplanarPoint(normal,root.position);if(!ray.ray.intersectPlane(plane,scratch))return null;return root.worldToLocal(scratch.clone());}
  function catchTarget(){const p=table.clone().project(camera);return {x:Math.max(75,Math.min(innerWidth-75,(p.x*.5+.5)*innerWidth)),y:Math.max(110,Math.min(innerHeight*.67,(.5-p.y*.5)*innerHeight)),rx:narrow?82:130,ry:narrow?85:125};}
  function recordPointer(e){
    const batch=e.getCoalescedEvents?.()||[];
    for(const sample of [...batch,e]){
      const point={x:sample.clientX,y:sample.clientY,t:sample.timeStamp},last=drag.samples.at(-1);
      if(!last||point.t>last.t||(point.t===last.t&&(point.x!==last.x||point.y!==last.y)))drag.samples.push(point);
    }
    drag.samples=drag.samples.filter(s=>e.timeStamp-s.t<=240);
  }
  function placeHeldCard(card){card.group.position.set(card.x,card.y,.35);card.group.scale.setScalar(1.06);card.group.updateMatrixWorld(true);}
  function beginDrag(e,card){
    if(drag&&e.pointerId!==drag.id){cancelDrag();return;}
    if(!active||flight||drag||e.button!==0||e.isPrimary===false)return;
    const p=localPoint(e.clientX,e.clientY);if(!p)return;
    e.preventDefault();select(card);card.grab.setPointerCapture(e.pointerId);
    drag={card,id:e.pointerId,start:{x:e.clientX,y:e.clientY},saved:{x:card.x,y:card.y},offset:{x:card.x-p.x,y:card.y-p.y},samples:[{x:e.clientX,y:e.clientY,t:e.timeStamp}],moved:false};
    onGesture?.('grab');ui.classList.add('is-holding');
  }
  function moveDrag(e){
    if(!drag||e.pointerId!==drag.id)return;
    const p=localPoint(e.clientX,e.clientY);if(p){drag.card.x=p.x+drag.offset.x;drag.card.y=p.y+drag.offset.y;placeHeldCard(drag.card);}
    drag.moved ||= Math.hypot(e.clientX-drag.start.x,e.clientY-drag.start.y)>8;
    recordPointer(e);
    const intent=captureIntent({point:{x:e.clientX,y:e.clientY},start:drag.start,velocity:releaseVelocity(drag.samples,e.timeStamp),target:catchTarget()});
    dock.classList.toggle('ready',Boolean(intent));
  }
  function endDrag(e){
    if(!drag||e.pointerId!==drag.id)return;
    moveDrag(e); // Include the release location and the final coalesced movement.
    const d=drag,velocity=releaseVelocity(d.samples,e.timeStamp),speed=Math.hypot(velocity.x,velocity.y);
    const captured=captureIntent({point:{x:e.clientX,y:e.clientY},start:d.start,velocity,target:catchTarget()});
    drag=null;ui.classList.remove('is-holding');dock.hidden=true;d.card.grab.releasePointerCapture?.(e.pointerId);
    if(captured){
      const here=localPoint(e.clientX,e.clientY),ahead=localPoint(e.clientX+velocity.x*60,e.clientY+velocity.y*60);
      const worldVelocity=here&&ahead?root.localToWorld(ahead).sub(root.localToWorld(here)).multiplyScalar(1000/60):new THREE.Vector3();
      launchCard(d.card,{kind:speed>=.32?'flick':'drop',velocity:worldVelocity,speed});d.card.x=d.saved.x;d.card.y=d.saved.y;return;
    }
    const p=boundedCardPosition(d.moved?{x:d.card.x,y:d.card.y}:d.saved,bounds());d.card.x=p.x;d.card.y=p.y;positions.set(d.card.key,p);if(d.moved)onGesture?.('dock');
  }
  function cancelDrag(){if(!drag)return;const d=drag;drag=null;d.card.x=d.saved.x;d.card.y=d.saved.y;ui.classList.remove('is-holding');dock.hidden=true;onGesture?.('dock');}
  function launchCard(card,motion={}){
    if(flight)return;select(card);root.updateWorldMatrix(true,true);const from=card.group.getWorldPosition(new THREE.Vector3()),rotation=card.group.getWorldQuaternion(new THREE.Quaternion());
    const group=new THREE.Group();group.position.copy(from);group.quaternion.copy(rotation);scene.add(group);
    const material=card.face.material.clone(),face=new THREE.Mesh(card.face.geometry,material);face.renderOrder=30;group.add(face);
    const path=makeLaunchFlight(from,table,motion),startScale=card.group.getWorldScale(new THREE.Vector3());group.scale.copy(startScale);
    flight={card,group,material,rotation,...path,startScale,age:0};card.group.visible=false;ui.hidden=true;dock.hidden=true;
    document.body.dataset.productLaunch=card.item.id;onGesture?.('deploy');onLaunchStart?.(card.item);announce?.(`${card.item.title} moving to the table.`);
  }
  function cancelFlight(){if(!flight)return;flight.group.removeFromParent();flight.material.dispose();flight.card.group.visible=true;flight=null;delete document.body.dataset.productLaunch;if(!disposed)onCancel?.();}
  function showGeneric(item){detailIndex.textContent=`${item.number} / ${item.category}`;detailTitle.textContent=item.title;detailCopy.textContent=item.description;detailLink.href=item.url;detailLink.textContent=item.linkLabel+' ↗';dialog.showModal();close.focus();}
  function pageBy(delta){if(drag||flight)return;page+=delta;selected=null;layout();onGesture?.('move');announce?.(`Products page ${page+1}.`);}
  prev.addEventListener('click',()=>pageBy(-1));next.addEventListener('click',()=>pageBy(1));
  const escape=e=>{if(e.key==='Escape'&&(drag||flight)){e.preventDefault();cancelDrag();cancelFlight();}};addEventListener('keydown',escape);
  function screenRect(group,w,h){const vertices=[[-w/2,h/2,0],[w/2,h/2,0],[w/2,-h/2,0],[-w/2,-h/2,0]].map(p=>{const v=new THREE.Vector3(...p).applyMatrix4(group.matrixWorld).project(camera);return {x:(v.x*.5+.5)*innerWidth,y:(.5-v.y*.5)*innerHeight,z:v.z};});const x=Math.min(...vertices.map(v=>v.x)),y=Math.min(...vertices.map(v=>v.y)),right=Math.max(...vertices.map(v=>v.x)),bottom=Math.max(...vertices.map(v=>v.y));return {x,y,w:right-x,h:bottom-y,vertices};}
  layout();
  return {
    get selectionStrength(){return (active&&selected)||flight?1:0;},get busy(){return Boolean(drag||flight);},get launching(){return Boolean(flight);},showGeneric,
    focusCard(id){if(id){const index=PRODUCTS.findIndex(item=>item.id===id);if(index>=0){selected=id;page=Math.floor(index/config.size);layout();}}pendingFocus=true;},
    update({dt,time,visible,obscured=false,reduced=false,desk=null}){
      if(disposed)return;const nextLayout=productLayout(innerWidth,innerHeight);if(nextLayout.key!==config.key&&!flight){const first=selected?PRODUCTS.findIndex(p=>p.id===selected):page*config.size;page=Math.floor(Math.max(0,first)/nextLayout.size);layout();}
      active=Boolean(visible&&!obscured&&!flight);if(!active&&drag)cancelDrag();if(!active)delete document.body.dataset.productReturn;
      alpha=THREE.MathUtils.damp(alpha,active?1:0,10,dt);ui.hidden=!active||alpha<.75;
      // Away from the Products view the same cards keep floating inside the desk pane, display-only.
      deskMix=desk?(reduced?(visible?1:0):THREE.MathUtils.damp(deskMix,visible?1:0,7,dt)):1;const mix=smooth(deskMix),resting=desk&&!obscured?desk.presence*(1-mix):0,shown=Math.max(alpha,resting);root.visible=shown>.005;
      focusScale.copy(UNIT);let panelRect=null;
      if(narrow){
        const bar=document.querySelector('.top-bar')?.getBoundingClientRect(),back=document.querySelector('.desk-return'),backBox=!back?.hidden?back?.getBoundingClientRect?.():null;
        const controlsBottom=Math.max(bar?.bottom||64,backBox?.bottom||(config.portrait?140:64));
        const safeBottom=typeof getComputedStyle==='function'?parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--workshop-safe-bottom'))||0:0;
        panelRect=productPanelRect(config,innerWidth,innerHeight,controlsBottom,safeBottom);
        const depth=6.5,unit=2*depth*Math.tan(THREE.MathUtils.degToRad(camera.fov/2))/innerHeight;
        camera.updateMatrixWorld();focusPose.position.set((panelRect.x+panelRect.w/2-innerWidth/2)*unit,(innerHeight/2-panelRect.y-panelRect.h/2)*unit,-depth).applyMatrix4(camera.matrixWorld);
        focusPose.quaternion.copy(camera.quaternion);focusScale.setScalar(panelRect.w/config.w*unit);
      }else{focusPose.position.set(-3.7,4.05,6.35);focusPose.quaternion.setFromEuler(focusEuler.set(-.025,.34,0));}
      if(desk&&mix<1){const c=desk.content,gridW=config.cols*config.cw+(config.cols-1)*config.gap,gridH=config.rows*config.ch+(config.rows-1)*config.gap,gridY=config.h/2-.45-gridH/2,s=Math.min(c.width*.94/gridW,c.height*.94/gridH);desk.root.updateWorldMatrix(true,false);restMatrix.copy(desk.root.matrixWorld).multiply(restStep.makeTranslation(c.x,c.y,.03)).multiply(restStep.makeScale(s,s,s)).multiply(restStep.makeTranslation(0,-gridY,0));restMatrix.decompose(restPose.position,restPose.quaternion,restPose.scale);root.position.lerpVectors(restPose.position,focusPose.position,mix);root.quaternion.slerpQuaternions(restPose.quaternion,focusPose.quaternion,mix);root.scale.lerpVectors(restPose.scale,focusScale,mix);}
      else{root.position.copy(focusPose.position);root.quaternion.copy(focusPose.quaternion);root.scale.copy(focusScale);}
      board.material.opacity=alpha;outline.material.opacity=alpha*.55;
      for(const card of cards){const held=drag?.card===card,warm=selected===card.item.id;card.group.visible=flight?.card!==card;const float=reduced||held?0:Math.sin(time*.8+card.index*1.7)*.025*(1+4*(1-mix));card.group.position.lerp(new THREE.Vector3(card.x,card.y+float,.09+(held?.26:warm?.10:0)),held?1:1-Math.exp(-dt*13));card.group.rotation.set(held?-.035:0,0,reduced||held?0:Math.sin(time*.52+card.index)*.006*(1+3*(1-mix)));card.group.scale.setScalar(held?1.06:1);card.face.material.opacity=shown;card.edge.material.opacity=shown*(held||warm||card.hover?.95:.45);card.edge.material.color.set(warm?PINK:CYAN);card.face.renderOrder=held?27:warm?24:21;card.edge.renderOrder=held?28:warm?25:22;}
      root.updateWorldMatrix(true,true);camera.updateMatrixWorld();updateTether(dt,time,obscured,reduced);
      if(active&&!ui.hidden&&pendingFocus){pendingFocus=false;cards.find(c=>c.item.id===selected)?.grab.focus({preventScroll:true});}
      if(active){for(const card of cards){const r=screenRect(card.group,config.cw,config.ch);card.hit.style.left=`${r.x}px`;card.hit.style.top=`${r.y}px`;card.hit.style.width=`${Math.max(1,r.w)}px`;card.hit.style.height=`${Math.max(1,r.h)}px`;card.hit.style.zIndex=drag?.card===card?'3':selected===card.item.id?'2':'1';card.hit.style.clipPath=`polygon(${r.vertices.map(v=>`${(v.x-r.x)/Math.max(r.w,1)*100}% ${(v.y-r.y)/Math.max(r.h,1)*100}%`).join(',')})`;card.hit.hidden=r.vertices.some(v=>v.z>1);}
        const r=screenRect(root,config.w,config.h);pages.style.left=`${Math.max(12,Math.min(innerWidth-184,r.x+r.w/2-(pages.offsetWidth||184)/2))}px`;pages.style.top=`${narrow?(panelRect.bottom+8):Math.min(innerHeight-70,r.y+r.h+9)}px`;
        // Return moves up into the free strip of the top bar, between the name and the sound controls, so it clears the panel.
        const back=document.querySelector('.desk-return'),name=document.querySelector('.top-bar .identity')?.getBoundingClientRect(),tools=document.querySelector('.top-bar .top-actions')?.getBoundingClientRect(),bw=back?.offsetWidth||0,bx=innerWidth/2-bw/2,strip=Boolean(back&&!back.hidden&&name&&tools&&name.width&&tools.width&&bx>=name.right+12&&bx+bw<=tools.left-12);
        if(strip){const mid=(name.top+name.bottom)/2;document.body.dataset.productReturn='strip';document.body.style.setProperty('--product-return-top',`${mid-back.offsetHeight/2}px`);}else delete document.body.dataset.productReturn;
        // The hint stays attached just above the panel's top-left corner.
        hint.style.maxWidth=`${Math.min(innerWidth-24,r.w)}px`;hint.style.left=`${Math.max(12,r.x)}px`;hint.style.top=`${Math.max(8,r.y-(hint.offsetHeight||24)-6)}px`;
      }
      dock.hidden=!drag;if(drag){const t=catchTarget();dock.style.left=`${t.x-t.rx}px`;dock.style.top=`${t.y-t.ry}px`;dock.style.width=`${t.rx*2}px`;dock.style.height=`${t.ry*2}px`;}
      if(flight){const f=flight;f.age+=dt;const p=Math.min(1,f.age/(reduced?.16:f.duration));f.group.position.copy(f.arc.getPoint(f.momentum?p:smooth(p)));f.group.quaternion.slerpQuaternions(f.rotation,camera.quaternion,smooth(p));const size=p<.7?THREE.MathUtils.lerp(1,.48,smooth(p/.7)):THREE.MathUtils.lerp(.48,2.6,smooth((p-.7)/.3));f.group.scale.copy(f.startScale).multiplyScalar(size);f.material.opacity=1-smooth((p-.85)/.15);if(p===1){f.group.removeFromParent();f.material.dispose();f.card.group.visible=true;flight=null;delete document.body.dataset.productLaunch;onLaunch?.(f.card.item);}}
    },
    dispose(){if(disposed)return;disposed=true;cancelDrag();cancelFlight();clearCards();removeEventListener('keydown',escape);root.removeFromParent();tetherGroup.removeFromParent();tetherGeometry.dispose();tetherMaterial.dispose();dotGeometry.dispose();dotMaterial.dispose();ui.remove();dock.remove();dialog.remove();delete document.body.dataset.productLaunch;delete document.body.dataset.productReturn;delete document.body.dataset.productLayout;},
  };
}
