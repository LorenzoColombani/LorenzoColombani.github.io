import * as THREE from 'three';
import { productLayout, productPanelRect } from './viewport-layout.js?v=interaction-round-1';
import { RoundedBoxGeometry } from './vendor/RoundedBoxGeometry.js';

const TAU=Math.PI*2;
const ease=value=>{const x=THREE.MathUtils.clamp(value,0,1);return x*x*x*(x*(x*6-15)+10);};

// A horseshoe, open toward the arriving visitor. Keep the central aisle and
// the optical worktable beyond it free: this is a separate navigation desk.
export function deskOutline(outer=5.7,inner=4.02){
  const shape=new THREE.Shape(),start=-Math.PI*.535,end=Math.PI*.535;
  for(let i=0;i<=112;i++){
    const angle=start+(end-start)*i/112,x=Math.sin(angle)*outer,y=Math.cos(angle)*outer;
    if(i===0)shape.moveTo(x,y);else shape.lineTo(x,y);
  }
  for(let i=112;i>=0;i--){const a=start+(end-start)*i/112;shape.lineTo(Math.sin(a)*inner,Math.cos(a)*inner);}
  shape.closePath();return shape;
}

export function screenReveal(elapsed,index,reduced=false){
  if(reduced)return 1;
  // Low glass lifts first, the two outside panes then fan into the same arc.
  const delay=[.32,.12,.18,.38][index];return ease((elapsed-delay)/1.50);
}

export function createNavigationDesk({parent,materials,camera,onFocus,onReturn}){
  const group=new THREE.Group();group.name='Workshop / semicircular navigation desk';group.position.z=10.6;parent.add(group);
  const geometrySet=new Set(),materialSet=new Set(),textureSet=new Set();
  const ownG=g=>(geometrySet.add(g),g),ownM=m=>(materialSet.add(m),m);
  const {steel,steelEdge,graphite,rubber,fineGrain}=materials;
  const top=ownM(new THREE.MeshPhysicalMaterial({color:0x788588,metalness:.65,roughness:.30,clearcoat:.22,clearcoatRoughness:.32,roughnessMap:fineGrain,bumpMap:fineGrain,bumpScale:.0018}));
  const ceramic=ownM(new THREE.MeshStandardMaterial({color:0x535e63,metalness:.48,roughness:.43}));
  const emitter=ownM(new THREE.MeshBasicMaterial({color:0x9fdcf1,transparent:true,opacity:.14,toneMapped:false,depthWrite:false}));
  function mesh(geometry,material,position,root=group,name=''){
    const m=new THREE.Mesh(ownG(geometry),material);m.position.set(...position);m.name=name;m.castShadow=m.receiveShadow=true;m.raycast=()=>{};root.add(m);return m;
  }
  function box(w,h,d,material,position,root=group,name=''){
    return mesh(new RoundedBoxGeometry(w,h,d,3,Math.min(.025,h*.25,d*.2)),material,position,root,name);
  }
  function slab(outer,inner,height,y,material,name){
    const g=new THREE.ExtrudeGeometry(deskOutline(outer,inner),{depth:height,bevelEnabled:true,bevelSize:.026,bevelThickness:.016,bevelSegments:3,curveSegments:32});
    g.rotateX(-Math.PI/2);return mesh(g,material,[0,y,0],group,name);
  }
  slab(5.69,4.00,.13,1.665,graphite,'desk / recessed structural tray');
  slab(5.74,3.96,.042,1.792,steelEdge,'desk / polished machined edge');
  slab(5.70,4.00,.07,1.835,top,'desk / continuous brushed work surface');
  slab(5.49,5.45,.012,1.912,graphite,'desk / outer shadow seam');
  slab(4.17,4.13,.012,1.912,graphite,'desk / inner shadow seam');
  for(const angle of [-1.43,-.68,.68,1.43]){
    const p=new THREE.Group();p.position.set(Math.sin(angle)*4.82,0,-Math.cos(angle)*4.82);p.rotation.y=-angle;group.add(p);
    box(.22,1.43,1.43,ceramic,[0,.91,0],p,'desk / tapered support');
    box(.095,1.24,.065,steelEdge,[.12,.90,.48],p);
    box(.49,.07,1.62,steel,[0,.11,0],p);
    for(const z of [-.61,.61])box(.40,.065,.31,rubber,[0,.046,z],p);
    box(.44,.07,1.40,graphite,[0,1.59,0],p);
  }
  // Fine radial construction seams and a continuous, recessed inner light.
  for(const a of [-1.05,-.35,.35,1.05]){
    const b=box(.012,.005,1.46,graphite,[Math.sin(a)*4.84,1.929,-Math.cos(a)*4.84]);b.rotation.y=-a;
  }
  const innerPoints=Array.from({length:145},(_,i)=>{const a=-1.63+i/144*3.26;return new THREE.Vector3(Math.sin(a)*4.02,1.82,-Math.cos(a)*4.02);});
  const innerLight=mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(innerPoints),144,.012,5,false),emitter,[0,0,0]);innerLight.castShadow=false;
  // Flush optical slots, not decorative computer screens on physical stands.
  const panes=[],angles=[-1.24,-.55,.55,1.24],titles=['','Products','Services',''];
  const ui=document.createElement('nav');ui.id='desk-controls';ui.setAttribute('aria-label','Workshop displays');document.body.append(ui);
  const returnButton=document.createElement('button');returnButton.type='button';returnButton.className='desk-return';returnButton.textContent='← Return to the desk';returnButton.hidden=true;ui.append(returnButton);
  let focus=-1,elapsed=0,started=false,disposed=false,liveProducts=false;
  const focusPoint=new THREE.Vector3(),focusCamera=new THREE.Vector3();
  function clearFocus(){if(focus<0)return;const previous=focus;focus=-1;delete document.body.dataset.deskFocus;onReturn?.();panes[previous].button?.focus({preventScroll:true});}
  returnButton.addEventListener('click',clearFocus);
  function choose(index,toggle=true){
    if(!titles[index]||elapsed<2.30)return;
    if(focus===index){if(toggle)clearFocus();return;}
    focus=index;document.body.dataset.deskFocus=titles[index].toLowerCase();onFocus?.(titles[index]);
  }
  function panelTexture(index){
    const c=document.createElement('canvas');c.width=1024;c.height=640;const x=c.getContext('2d');
    const grad=x.createLinearGradient(0,0,1024,640);grad.addColorStop(0,'rgba(5,27,37,.72)');grad.addColorStop(1,'rgba(4,22,32,.46)');x.fillStyle=grad;x.fillRect(0,0,1024,640);
    x.strokeStyle='rgba(119,213,243,.26)';x.lineWidth=1;
    for(let y=32;y<640;y+=32){x.beginPath();x.moveTo(24,y);x.lineTo(1000,y);x.stroke();}
    x.strokeStyle='rgba(147,230,251,.57)';x.lineWidth=2;
    x.strokeRect(2,2,1020,636);x.strokeStyle='rgba(219,251,255,.88)';x.lineWidth=4;
    for(const sx of [1,-1])for(const sy of [1,-1]){
      x.save();x.translate(sx===1?14:1010,sy===1?14:626);x.scale(sx,sy);x.beginPath();x.moveTo(0,62);x.lineTo(0,0);x.lineTo(92,0);x.stroke();x.restore();
    }
    if(titles[index]){
      x.fillStyle='rgba(3,18,27,1)';x.fillRect(6,6,1012,137);
      x.fillStyle='#e3faff';x.font='500 78px Arial, sans-serif';x.fillText(titles[index],62,110);
      x.strokeStyle='rgba(125,215,242,.40)';x.lineWidth=2;x.beginPath();x.moveTo(62,145);x.lineTo(962,145);x.stroke();
    }
    // Technical linework carries the optical treatment; no invented metrics,
    // offers, prices or destinations are presented as finished content.
    const centerY=titles[index]?365:310;
    x.save();x.translate(510,centerY);x.strokeStyle='rgba(129,216,242,.64)';x.lineWidth=1.5;
    if(index===1&&!liveProducts){
      for(let stack=0;stack<4;stack++){
        const ox=(stack-1.5)*97,oy=Math.sin(stack*1.2)*19;
        x.beginPath();x.moveTo(ox-95,oy-20);x.lineTo(ox,oy-92);x.lineTo(ox+95,oy-20);x.lineTo(ox,oy+52);x.closePath();x.stroke();
        x.beginPath();x.moveTo(ox-95,oy-20);x.lineTo(ox-95,oy+70);x.lineTo(ox,oy+142);x.lineTo(ox+95,oy+70);x.lineTo(ox+95,oy-20);x.moveTo(ox,oy+52);x.lineTo(ox,oy+142);x.stroke();
      }
    }else if(index===2){
      const nodes=Array.from({length:7},(_,i)=>[Math.cos(i/6*TAU)*195,Math.sin(i/6*TAU)*126]);
      for(let i=0;i<6;i++){x.beginPath();x.moveTo(...nodes[i]);x.lineTo(0,0);x.lineTo(...nodes[(i+2)%6]);x.stroke();x.strokeRect(nodes[i][0]-20,nodes[i][1]-20,40,40);}
      x.strokeStyle='rgba(255,211,142,.80)';x.strokeRect(-39,-39,78,78);
    }else if(index!==1){
      for(let ring=0;ring<5;ring++){x.beginPath();x.ellipse(0,0,112+ring*24,138+ring*17,ring*.13,0,TAU);x.stroke();}
      for(let i=0;i<18;i++){const a=i/18*TAU;x.beginPath();x.moveTo(Math.cos(a)*243,Math.sin(a)*243);x.lineTo(Math.cos(a)*252,Math.sin(a)*252);x.stroke();}
    }
    x.restore();
    x.fillStyle='rgba(116,211,241,.44)';for(let i=0;i<22;i++)x.fillRect(62+i*18,565,7,4+i%4*3);
    const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;textureSet.add(t);return t;
  }
  for(let i=0;i<4;i++){
    const a=angles[i],radius=4.94,width=i===1||i===2?2.85:2.43,height=i===1||i===2?1.78:1.52;
    const root=new THREE.Group();root.name=`desk / ${titles[i]||'unassigned'} projection`;group.add(root);
    const x=Math.sin(a)*radius,z=-Math.cos(a)*radius,yaw=-a*.74;
    const slot=box(width*.87,.020,.23,graphite,[x,1.93,z]);slot.rotation.y=yaw;
    const slotLight=box(width*.80,.005,.048,emitter,[x,1.944,z]);slotLight.rotation.y=yaw;slotLight.castShadow=false;
    const mat=ownM(new THREE.MeshBasicMaterial({map:panelTexture(i),transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide,toneMapped:false}));
    const pane=mesh(new THREE.PlaneGeometry(width,height),mat,[0,0,0],root);pane.castShadow=pane.receiveShadow=false;pane.renderOrder=12;
    const edgeMat=ownM(new THREE.LineBasicMaterial({color:0xa8e5fc,transparent:true,opacity:0,depthWrite:false}));
    const corners=[[-width/2,-height/2,.024],[-width/2,height/2,.024],[width/2,height/2,.024],[width/2,-height/2,.024],[-width/2,-height/2,.024]].map(p=>new THREE.Vector3(...p));
    const edge=new THREE.Line(ownG(new THREE.BufferGeometry().setFromPoints(corners)),edgeMat);edge.renderOrder=13;edge.raycast=()=>{};root.add(edge);
    const detailMat=ownM(new THREE.MeshBasicMaterial({color:0x94dff7,transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide}));
    const detail=mesh(new THREE.PlaneGeometry(width*.76,.043),detailMat,[width*.08,-height*.39,.025],root);detail.castShadow=false;
    let button=null;
    if(titles[i]){
      button=document.createElement('button');button.className='desk-screen-target';button.type='button';button.dataset.deskScreen=titles[i].toLowerCase();button.setAttribute('aria-label',`Inspect ${titles[i]} display`);button.hidden=true;
      const label=document.createElement('span');label.textContent=titles[i];label.className='sr-only';button.append(label);
      let press=null,moved=false;button.addEventListener('pointerdown',e=>{press={x:e.clientX,y:e.clientY};moved=false;button.setPointerCapture?.(e.pointerId);});
      button.addEventListener('pointermove',e=>{if(press&&Math.hypot(e.clientX-press.x,e.clientY-press.y)>8)moved=true;});
      button.addEventListener('pointercancel',()=>{press=null;moved=true;});
      button.addEventListener('click',e=>{if(e.detail===0||!moved)choose(i);press=null;});
      button.addEventListener('pointerenter',()=>{root.userData.hovered=true;});button.addEventListener('pointerleave',()=>{root.userData.hovered=false;});ui.append(button);
    }
    panes.push({root,pane,mat,edgeMat,detailMat,detail,button,x,z,yaw,width,height,index:i});
  }
  function getFocusPose(){
    if(focus<0)return null;
    if(focus===1){
      const layout=productLayout(innerWidth,innerHeight);
      if(layout.compact&&layout.portrait){
        const top=innerWidth<700?140:80,rect=productPanelRect(layout,innerWidth,innerHeight,top),center=top+(rect.y-top)*.52;
        focusCamera.set(0,7.8,15.8);
        const elevation=Math.atan2(4.2-focusCamera.y,focusCamera.z-.5)-Math.atan((1-center/innerHeight*2)*Math.tan(THREE.MathUtils.degToRad(camera.fov/2)));
        focusPoint.set(0,focusCamera.y+Math.sin(elevation)*12,focusCamera.z-Math.cos(elevation)*12);
      }else{focusCamera.set(1.4,5.1,12.5);focusPoint.set(-2.2,3.8,4.2);}
      return {position:focusCamera,target:focusPoint};
    }
    const p=panes[focus];p.root.getWorldPosition(focusPoint);
    const distance=innerWidth<600?6.4:6.0;
    focusCamera.set(Math.sin(p.yaw)*distance,.15,Math.cos(p.yaw)*distance).add(focusPoint);
    return {position:focusCamera,target:focusPoint};
  }
  const escape=e=>{if(e.key==='Escape'&&focus>=0){e.preventDefault();clearFocus();}};
  addEventListener('keydown',escape);
  const switcher=document.createElement('div');switcher.className='desk-switcher';switcher.setAttribute('role','group');switcher.setAttribute('aria-label','Switch workshop display');switcher.hidden=true;ui.append(switcher);
  const switchButtons=[1,2].map(index=>{const b=document.createElement('button');b.type='button';b.textContent=titles[index];b.addEventListener('click',()=>choose(index,false));switcher.append(b);return {button:b,index};});
  const scratch=new THREE.Vector3();
  return {
    group,clearFocus,getFocusPose,focusProducts:()=>choose(1,false),
    // The live product cards rest in the Products pane, below its title band.
    useLiveProducts(){if(liveProducts)return;liveProducts=true;const p=panes[1],old=p.mat.map;p.mat.map=panelTexture(1);p.mat.needsUpdate=true;textureSet.delete(old);old?.dispose();},
    get productsPane(){const p=panes[1];return {root:p.root,presence:p.presence||0,content:{x:0,y:p.height*(.5-352/640),width:p.width*900/1024,height:p.height*405/640}};},get focusedTitle(){return titles[focus]||null;},get focused(){return focus>=0;},get progress(){return Math.min(1,elapsed/2.7);},
    update({dt,time,entered,unlocking,reduced,obscured=false,companion=false}){
      if(entered||unlocking)started=true;
      if(started)elapsed=reduced?10:Math.min(10,elapsed+dt);
      group.visible=!obscured;ui.hidden=obscured||!entered||companion;
      document.body.dataset.deskPhase=!started?'dormant':elapsed<2.7?'unfolding':'ready';
      emitter.opacity=.13+(started?ease(elapsed/.9)*.55:.03*(.5+.5*Math.sin(time*.7)));
      for(const p of panes){
        const reveal=started?screenReveal(elapsed,p.index,reduced):0;
        const spread=reduced&&started?1:ease((elapsed-.55)/1.70);
        const detailReveal=reduced&&started?1:ease((elapsed-.72-p.index*.045)/1.24);
        p.root.visible=reveal>.002;p.root.scale.set(1,1,1);
        const originX=Math.sign(p.x)*(.64+(p.index===0||p.index===3?.26:0));
        p.root.position.set(THREE.MathUtils.lerp(originX,p.x,spread),2.42+p.height*.5,THREE.MathUtils.lerp(-4.88,p.z,spread));
        p.root.rotation.set(-.055,p.yaw*spread,0);
        const strength=focus>=0&&focus!==p.index?.20:1;
        p.mat.opacity=reveal*detailReveal*(focus===p.index?.99:.89)*strength;p.presence=group.visible?reveal*detailReveal*strength:0;p.edgeMat.opacity=reveal*(p.root.userData.hovered?.77:.29)*strength;p.detailMat.opacity=reveal*.10*strength;
        if(focus===1&&p.index===1){p.mat.opacity=0;p.edgeMat.opacity=0;p.detailMat.opacity=0;}
        p.detail.position.x=Math.sin(time*.22+p.index)*p.width*.05;
        if(!p.button)continue;
        p.button.setAttribute('aria-pressed',String(focus===p.index));
        p.root.updateWorldMatrix(true,false);
        const vertices=[[-p.width/2,p.height/2,0],[p.width/2,p.height/2,0],[p.width/2,-p.height/2,0],[-p.width/2,-p.height/2,0]].map(v=>{scratch.set(...v).applyMatrix4(p.root.matrixWorld).project(camera);return {x:(scratch.x*.5+.5)*innerWidth,y:(.5-scratch.y*.5)*innerHeight,z:scratch.z};});
        const x=Math.min(...vertices.map(v=>v.x)),y=Math.min(...vertices.map(v=>v.y)),w=Math.max(...vertices.map(v=>v.x))-x,h=Math.max(...vertices.map(v=>v.y))-y;
        p.button.hidden=(focus===1&&p.index===1)||spread<.99||reveal<.99||!entered||obscured||companion||vertices.some(v=>v.z>1)||x+w<0||x>innerWidth||y+h<0||y>innerHeight||(focus>=0&&focus!==p.index);
        p.button.style.left=`${x}px`;p.button.style.top=`${y}px`;p.button.style.width=`${Math.max(1,w)}px`;p.button.style.height=`${Math.max(1,h)}px`;
        p.button.style.clipPath=`polygon(${vertices.map(v=>`${(v.x-x)/Math.max(1,w)*100}% ${(v.y-y)/Math.max(1,h)*100}%`).join(',')})`;
      }
      returnButton.hidden=focus<0||obscured||companion;switcher.hidden=focus===1||obscured||!entered||companion||(focus<0&&innerWidth>=700&&innerHeight>=540);
      switchButtons.forEach(({button,index})=>button.setAttribute('aria-pressed',String(index===focus)));
    },
    dispose(){if(disposed)return;disposed=true;removeEventListener('keydown',escape);ui.remove();group.removeFromParent();geometrySet.forEach(g=>g.dispose());materialSet.forEach(m=>m.dispose());textureSet.forEach(t=>t.dispose());delete document.body.dataset.deskFocus;delete document.body.dataset.deskPhase;},
  };
}
