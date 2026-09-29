import * as THREE from 'three';
import { createOutsideTap } from './product-gestures.js?v=website-prototype-1';

export function websiteSource(item,location){
  const website=item?.website;if(!website)return null;
  let publicURL;try{publicURL=new URL(website.url);}catch{return null;}
  if(publicURL.protocol!=='https:'||publicURL.username||publicURL.password)return null;
  const local=['127.0.0.1','localhost'].includes(location.hostname);
  if(!website.enabled&&!(local&&website.prototype))return null;
  return {url:publicURL.href,publicURL:publicURL.href,pending:Boolean(website.pendingPermission),poster:website.poster};
}

/** A real, responsive web page inside the Workshop's projected screen. */
export function createWebsiteExperience({scene,camera,canvas,onOpen,onClose,onGesture,location=window.location}){
  const shell=document.createElement('section');shell.className='website-experience';shell.hidden=true;
  shell.setAttribute('role','region');
  const panel=document.createElement('div');panel.className='holo-website';panel.style.inset='auto';panel.style.margin='0';panel.style.maxWidth='none';panel.style.position='absolute';panel.style.transformOrigin='0 0';
  const bar=document.createElement('header');bar.className='holo-website-bar';
  const back=document.createElement('button');back.type='button';back.className='desk-return website-return';back.textContent='← Return to Products';back.setAttribute('aria-label','Return to Products');
  const heading=document.createElement('div');heading.className='holo-website-heading';
  const title=document.createElement('h2');title.id='website-title';
  const badge=document.createElement('span');badge.className='holo-website-badge';heading.append(title,badge);
  const actions=document.createElement('div');actions.className='holo-website-actions';
  const expand=document.createElement('button');expand.type='button';expand.textContent='⤢';expand.setAttribute('aria-label','Expand website');expand.setAttribute('aria-pressed','false');
  const external=document.createElement('a');external.textContent='↗';external.target='_blank';external.rel='noopener noreferrer';external.setAttribute('aria-label','Open original website in a new tab');
  const home=document.createElement('button');home.type='button';home.textContent='⌂';home.className='holo-website-home';home.title='Website home';home.setAttribute('aria-label','Website home');
  expand.title='Expand website';external.title='Open website in a new tab';
  actions.append(expand,external,home);bar.append(heading,actions);
  const content=document.createElement('div');content.className='holo-website-content';
  const status=document.createElement('div');status.className='holo-website-status';status.setAttribute('role','status');
  const message=document.createElement('p'),retry=document.createElement('button');retry.type='button';retry.textContent='Try again';retry.hidden=true;status.append(message,retry);content.append(status);
  panel.append(bar,content);
  // The browsing context has one stable, untransformed parent for its entire
  // lifetime. Moving an iframe between DOM parents can unload its document.
  const screen=new THREE.Object3D();
  const backing=new THREE.Group();backing.name='Website / optical screen frame';scene.add(backing);backing.visible=false;
  const geometry=new THREE.PlaneGeometry(1,1),glassMaterial=new THREE.ShaderMaterial({transparent:true,side:THREE.DoubleSide,depthWrite:false,toneMapped:false,
    uniforms:{uOpacity:{value:.10},uFeather:{value:new THREE.Vector2(.01,.01)}},
    vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader:`varying vec2 vUv;uniform float uOpacity;uniform vec2 uFeather;
      void main(){vec2 rim=min(vUv,1.-vUv);vec2 fade=smoothstep(vec2(0.),uFeather,rim);
        gl_FragColor=vec4(.07,.20,.25,uOpacity*fade.x*fade.y);}`});
  const glass=new THREE.Mesh(geometry,glassMaterial);glass.position.z=-.025;backing.add(glass);
  // Three shallow, curved light layers converge on the same emitter and page
  // edges. They share one geometry/material/draw call; no particles or hard rays.
  const linkRows=8,linkDepths=[0,-.16,.16],linkWeights=[.52,.24,.24],linkStride=(linkRows+1)*2;
  const linkGeometry=new THREE.BufferGeometry(),linkUV=[],linkLayers=[],linkWeight=[],linkIndices=[];
  // Keep the first four vertices as source L/R, page L/R for exact attachment.
  const linkVertex=(layer,row,side)=>layer*linkStride+(row===0?0:row===linkRows?2:2+row*2)+side;
  for(let layer=0;layer<linkDepths.length;layer++)for(let row=0;row<=linkRows;row++)for(let side=0;side<2;side++){
    const i=linkVertex(layer,row,side);linkUV[i*2]=side;linkUV[i*2+1]=row/linkRows;linkLayers[i]=layer===0?0:layer===1?-1:1;linkWeight[i]=linkWeights[layer];
    if(side===0&&row<linkRows){const a=i,b=i+1,c=linkVertex(layer,row+1,0),d=c+1;linkIndices.push(a,b,c,c,b,d);}
  }
  linkGeometry.setAttribute('position',new THREE.Float32BufferAttribute(new Float32Array(linkStride*linkDepths.length*3),3).setUsage(THREE.DynamicDrawUsage));
  linkGeometry.setAttribute('uv',new THREE.Float32BufferAttribute(linkUV,2));linkGeometry.setAttribute('aLayer',new THREE.Float32BufferAttribute(linkLayers,1));linkGeometry.setAttribute('aWeight',new THREE.Float32BufferAttribute(linkWeight,1));linkGeometry.setIndex(linkIndices);
  const linkMaterial=new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,toneMapped:false,
    uniforms:{uReveal:{value:0},uTime:{value:0},uOpacity:{value:.13}},
    vertexShader:`attribute float aLayer;attribute float aWeight;varying vec2 vUv;varying float vLayer;varying float vWeight;
      void main(){vUv=uv;vLayer=aLayer;vWeight=aWeight;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader:`varying vec2 vUv;varying float vLayer;varying float vWeight;uniform float uReveal;uniform float uTime;uniform float uOpacity;
      float hash(vec2 p){vec3 q=fract(vec3(p.xyx)*.1031);q+=dot(q,q.yzx+33.33);return fract((q.x+q.y)*q.z);}
      float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.)),f.x),f.y);}
      void main(){
        // Advect a continuous density field very slowly. The emitter stays
        // constant: there is no time-based flashing or whole-beam pulsing.
        float haze=noise(vUv*vec2(7.5,3.2)+vec2(vLayer*.7-uTime*.015,-uTime*.023));
        float grain=noise(vUv*vec2(83.,13.)+vec2(vLayer*5.2,uTime*.025));
        float phase=vUv.x*164.+haze*3.8+sin(vUv.y*4.1-uTime*.11)*.35+vLayer*1.6;
        float resolved=1.-smoothstep(.65,2.2,fwidth(phase));
        float fibres=pow(.5+.5*cos(phase),8.)*resolved;
        float edge=smoothstep(0.,.055,vUv.x)*smoothstep(0.,.055,1.-vUv.x);
        float source=exp(-vUv.y*6.5);
        float density=.26*mix(.62,1.,haze)*mix(1.,.64,vUv.y)+.52*source+.12*fibres+.028*grain;
        float alpha=uReveal*uOpacity*vWeight*edge*clamp(density,0.,1.);
        vec3 color=mix(vec3(.30,.66,.79),vec3(.48,.83,.92),.55*source+.25*haze);
        gl_FragColor=vec4(color,alpha);}`});
  linkMaterial.forceSinglePass=true;
  const projectionLink=new THREE.Mesh(linkGeometry,linkMaterial);projectionLink.name='Website / emitter connection';projectionLink.visible=false;projectionLink.frustumCulled=false;projectionLink.raycast=()=>{};projectionLink.renderOrder=14;scene.add(projectionLink);
  const destination=new THREE.Vector3(0,4.75,1.5),origin=new THREE.Vector3(0,4.2,.5),focusPosition=new THREE.Vector3(),focusTarget=new THREE.Vector3();
  const screenRotation=new THREE.Quaternion().setFromEuler(new THREE.Euler(0,0,0)),fitCamera=new THREE.PerspectiveCamera(),fitProjection=new THREE.Matrix4(),projected=new THREE.Vector3();
  const pageProjection=new THREE.Matrix4(),pixelPlane=new THREE.Matrix4(),cssProjection=new THREE.Matrix4();
  const pageCorners=[new THREE.Vector3(),new THREE.Vector3(),new THREE.Vector3(),new THREE.Vector3()];
  const lowerLeft=new THREE.Vector3(),lowerRight=new THREE.Vector3(),pageCenter=new THREE.Vector3();
  let focusDirty=true,flatBounds=null,flatDirty=true;
  let reveal=0,screenW=7,screenH=4.0,nativeW=960,nativeH=600,viewW=0,viewH=0;
  shell.append(panel,back);document.body.append(shell);
  const outside=createOutsideTap();
  let poster=null,frame=null,item=null,source=null,active=false,closing=false,disposed=false,expanded=false;
  let generation=0,loadTimer=null;
  const reduced=()=>window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const setExpanded=value=>{
    expanded=Boolean(value);shell.classList[expanded?'add':'remove']('is-expanded');
    viewW=0;expand.setAttribute('aria-pressed',String(expanded));expand.setAttribute('aria-label',expanded?'Restore website size':'Expand website');expand.title=expanded?'Restore website size':'Expand website';expand.textContent=expanded?'⤡':'⤢';
  };
  function layout(){
    if(viewW===innerWidth&&viewH===innerHeight)return;
    viewW=innerWidth;viewH=innerHeight;
    focusDirty=true;flatDirty=true;
    const small=viewW<700,top=expanded?76:(viewH<540?84:small?166:112),bottom=expanded?18:28;
    nativeW=Math.round(expanded?viewW-36:Math.min(1440,viewW*(small?.91:.88)));
    // Use a real browser viewport, not the Products card's fixed aspect ratio.
    // Keep native CSS pixels so the site's text and controls stay readable.
    nativeH=Math.round(Math.max(160,(viewH-top-bottom)*(expanded||small||viewH<540?1:.82)));
    screenW=screenH*nativeW/nativeH;
    const feather=small?4:7;glassMaterial.uniforms.uFeather.value.set(feather/nativeW,feather/nativeH);
    panel.style.width=nativeW+'px';panel.style.height=nativeH+'px';
  }
  function getFocusPose(){
    layout();
    if(!focusDirty&&fitProjection.equals(camera.projectionMatrix))return {position:focusPosition,target:focusTarget};
    focusDirty=false;fitProjection.copy(camera.projectionMatrix);fitCamera.projectionMatrix.copy(camera.projectionMatrix);fitCamera.up.copy(camera.up);
    const top=expanded?76:(innerHeight<540?84:innerWidth<700?166:112),bottom=expanded?18:28;
    const centerY=(top+viewH-bottom)/2,halfWidth=Math.max(1,viewW/2-24),halfHeight=Math.max(1,(viewH-top-bottom)/2-6),tanHalfFov=1/camera.projectionMatrix.elements[5];
    let distance=screenH*viewH/(2*tanHalfFov*nativeH);
    // Fit both the page and its glass backing below the controls, keeping the native iframe
    // viewport intact and moving only the room camera farther back as needed.
    const corners=[];for(const z of [0,-.025])for(const x of [-.5,.5])for(const y of [-.5,.5])corners.push(new THREE.Vector3(x*screenW,y*screenH,z).applyQuaternion(screenRotation).add(destination));
    for(let attempt=0;attempt<12;attempt++){
      focusTarget.copy(destination);focusTarget.y+=(centerY-viewH/2)*2*tanHalfFov*distance/viewH;
      focusPosition.set(0,focusTarget.y,destination.z+distance);
      fitCamera.position.copy(focusPosition);fitCamera.lookAt(focusTarget);fitCamera.updateMatrixWorld();
      let overflow=1;
      for(const corner of corners){projected.copy(corner).project(fitCamera);const x=(projected.x+1)*viewW/2,y=(1-projected.y)*viewH/2;overflow=Math.max(overflow,Math.abs(x-viewW/2)/halfWidth,Math.abs(y-centerY)/halfHeight);}
      if(overflow<=1)break;
      distance*=overflow*1.002;
    }
    return {position:focusPosition,target:focusTarget};
  }
  function projectedPage(view){
    const points=[[-.5,.5],[.5,.5],[.5,-.5],[-.5,-.5]];
    for(let i=0;i<points.length;i++){
      const p=pageCorners[i].set(points[i][0]*screenW,points[i][1]*screenH,0).add(destination).project(view);
      p.set((p.x+1)*viewW/2,(1-p.y)*viewH/2,0);
    }
    return pageCorners;
  }
  function renderPage(){
    camera.updateMatrixWorld();getFocusPose();
    if(!flatBounds&&!closing&&reveal===1){
      // The room camera eases independently of the reveal. Wait until its
      // remaining movement is subpixel before making the browser surface flat.
      const target=projectedPage(fitCamera).map(p=>p.clone()),actual=projectedPage(camera);
      if(actual.every((p,i)=>p.distanceTo(target[i])<.75))flatBounds={};
    }
    if(flatBounds&&!closing){
      if(flatDirty){
        const [a,b,c]=projectedPage(fitCamera);
        Object.assign(flatBounds,{left:a.x,top:a.y,width:b.x-a.x,height:c.y-a.y});flatDirty=false;
        panel.style.left=flatBounds.left+'px';panel.style.top=flatBounds.top+'px';
        panel.style.width=flatBounds.width+'px';panel.style.height=flatBounds.height+'px';panel.style.transform='none';
      }
      // Keep the glass/light aligned while the room camera catches up after a
      // resize. The browser's pixel rectangle and document never move per frame.
      const {left,top,width,height}=flatBounds,p=camera.projectionMatrix.elements;
      const depth=-pageCenter.copy(destination).applyMatrix4(camera.matrixWorldInverse).z;
      screen.position.set(((left+width/2)*2/viewW-1)*depth/p[0],(1-(top+height/2)*2/viewH)*depth/p[5],-depth).applyMatrix4(camera.matrixWorld);
      screen.quaternion.copy(camera.quaternion);
      screen.scale.set(width*2*depth/(viewW*p[0])/nativeW,height*2*depth/(viewH*p[5])/nativeH,1);
    }else{
      // One element carries the complete plane-to-viewport homography. There
      // are no perspective or preserve-3d ancestors around the live iframe.
      screen.updateMatrixWorld(true);
      pixelPlane.set(1,0,0,-nativeW/2,0,-1,0,nativeH/2,0,0,1,0,0,0,0,1);
      pageProjection.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse).multiply(screen.matrixWorld).multiply(pixelPlane);
      const m=pageProjection.elements,w=viewW/2,h=viewH/2;
      cssProjection.set(w*(m[0]+m[3]),w*(m[4]+m[7]),0,w*(m[12]+m[15]),h*(m[3]-m[1]),h*(m[7]-m[5]),0,h*(m[15]-m[13]),0,0,1,0,m[3],m[7],0,m[15]);
      panel.style.left='0px';panel.style.top='0px';panel.style.width=nativeW+'px';panel.style.height=nativeH+'px';
      panel.style.transform=`matrix3d(${cssProjection.elements.join(',')})`;
    }
    const interactive=Boolean(flatBounds)&&!closing;
    if(panel.inert===interactive)panel.inert=!interactive;
    const pointerEvents=interactive?'auto':'none';if(panel.style.pointerEvents!==pointerEvents)panel.style.pointerEvents=pointerEvents;
  }
  function clearTimers(){clearTimeout(loadTimer);loadTimer=null;}
  function unload(){
    poster?.remove();poster=null;
    if(!frame)return;
    // Stop the page's media before detaching, as in the portfolio's live preview.
    frame.src='about:blank';frame.remove();frame=null;
  }
  function failed(token,{recoverBlank=false}={}){
    if(token!==generation||!active||closing)return;
    clearTimers();
    // A timeout does not prove a cross-origin page failed: it may already be
    // usable while a resource is pending. Only restart a provably blank frame.
    let initialBlank=false;
    try{initialBlank=frame?.contentDocument?.URL==='about:blank';}catch{}
    if(recoverBlank&&!document.hidden&&initialBlank){load({recovering:true});return;}
    status.hidden=false;retry.hidden=false;
    message.textContent='The page is taking longer to open. Try again, or return to Products.';
  }
  function load({recovering=false}={}){
    generation++;const token=generation;clearTimers();unload();
    status.hidden=false;retry.hidden=true;status.classList.remove('permission-pending');message.textContent=recovering?'The page did not start. Trying once more…':`Opening ${item.title}…`;
    if(source.pending){
      if(source.poster){poster=document.createElement('img');poster.className='holo-website-poster';poster.src=source.poster;poster.alt=`${item.title} — still preview, not interactive yet`;content.append(poster);}
      status.classList.add('permission-pending');message.textContent='Still preview · The live site needs permission to appear inside the Workshop.';return;
    }
    // The direct shell parent was connected before this navigation began.
    frame=document.createElement('iframe');frame.className='holo-website-frame';frame.title=`${item.title} — interactive website`;
    frame.setAttribute('allow','clipboard-write; fullscreen');
    frame.setAttribute('sandbox','allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-downloads');
    frame.referrerPolicy='strict-origin-when-cross-origin';frame.src=source.url;
    frame.addEventListener('load',()=>{if(token!==generation||!active||closing)return;clearTimers();status.hidden=true;});
    frame.addEventListener('error',()=>failed(token));content.append(frame);
    loadTimer=setTimeout(()=>failed(token,{recoverBlank:!recovering}),12000);
  }
  function finishClose(){
    if(!active)return;active=false;closing=false;reveal=0;backing.visible=false;projectionLink.visible=false;shell.hidden=true;
    document.body.classList.remove('website-open');setExpanded(false);panel.style.pointerEvents='none';panel.inert=true;flatBounds=null;back.disabled=false;
    const previous=item;item=null;source=null;onClose?.(previous);
  }
  function close({immediate=false}={}){
    if(!active||(closing&&!immediate))return;closing=true;generation++;outside.cancel();clearTimers();unload();
    back.disabled=true;panel.style.pointerEvents='none';panel.inert=true;onGesture?.('website-fold');
    if(immediate||reduced())finishClose();
  }
  function open(next){
    if(disposed)return false;const nextSource=websiteSource(next,location);if(!nextSource)return false;
    if(active){close({immediate:true});}clearTimers();
    item=next;source=nextSource;active=true;closing=false;flatBounds=null;reveal=reduced()?1:0;setExpanded(false);layout();
    title.textContent=item.title;shell.setAttribute('aria-label',`${item.title} — live projection`);badge.textContent=new URL(source.publicURL).hostname;external.href=source.publicURL;
    shell.hidden=false;back.disabled=false;panel.style.opacity='0';panel.style.pointerEvents='none';panel.inert=true;document.body.classList.add('website-open');
    onOpen?.(item);load();back.focus({preventScroll:true});onGesture?.('website-project');
    return true;
  }
  back.addEventListener('click',()=>close());retry.addEventListener('click',()=>{if(active&&!closing)load();});
  home.addEventListener('click',()=>{if(active&&!closing){load();onGesture?.('select');}});
  expand.addEventListener('click',()=>{if(active&&!closing){setExpanded(!expanded);onGesture?.('select');}});
  const onDown=e=>{outside.down(e,active&&!closing&&e.target===canvas);};
  const onMove=e=>outside.move(e);
  const onUp=e=>{if(outside.up(e,active&&!closing&&e.target===canvas))close();};
  const onCancel=()=>outside.cancel();
  canvas.addEventListener('pointerdown',onDown);canvas.addEventListener('pointermove',onMove);canvas.addEventListener('pointerup',onUp);canvas.addEventListener('pointercancel',onCancel);
  const key=e=>{if(active&&e.key==='Escape'){e.preventDefault();close();}};
  addEventListener('keydown',key);
  return {
    open,close,canOpen:next=>Boolean(websiteSource(next,location)),
    get active(){return active;},get ownsScreen(){return false;},getFocusPose,
    update(dt,time=0){
      if(!active)return;layout();
      reveal=reduced()?(closing?0:1):Math.max(0,Math.min(1,reveal+(closing?-dt/.26:dt/.56)));
      if(closing&&reveal===0){finishClose();return;}
      const eased=1-Math.pow(1-reveal,3),growth=.035+.965*eased;
      screen.position.lerpVectors(origin,destination,eased);screen.quaternion.copy(screenRotation);
      screen.scale.set(screenW/nativeW*growth,screenH/nativeH*growth,1);
      if(panel.style.opacity!==String(eased))panel.style.opacity=String(eased);renderPage();
      backing.visible=eased>.002;backing.position.copy(screen.position);backing.quaternion.copy(screen.quaternion);backing.scale.set(screen.scale.x*nativeW,screen.scale.y*nativeH,1);backing.updateMatrixWorld(true);
      glassMaterial.uniforms.uOpacity.value=eased*.10;
      const vertices=linkGeometry.attributes.position;
      lowerLeft.set(-.5,-.5,-.025).applyMatrix4(backing.matrixWorld);lowerRight.set(.5,-.5,-.025).applyMatrix4(backing.matrixWorld);
      for(let layer=0;layer<linkDepths.length;layer++)for(let row=0;row<=linkRows;row++){
        const v=row/linkRows,curve=Math.sin(v*Math.PI),width=1-Math.abs(linkDepths[layer])*.09*curve;
        pageCenter.lerpVectors(lowerLeft,lowerRight,.5);
        for(let side=0;side<2;side++){
          const sign=side?1:-1;
          vertices.setXYZ(linkVertex(layer,row,side),pageCenter.x*v+sign*THREE.MathUtils.lerp(1.34,(lowerRight.x-lowerLeft.x)/2,v)*width,THREE.MathUtils.lerp(1.912,pageCenter.y,v)+sign*(lowerRight.y-lowerLeft.y)/2*v*width,THREE.MathUtils.lerp(.95,pageCenter.z,v)+sign*(lowerRight.z-lowerLeft.z)/2*v*width+linkDepths[layer]*curve);
        }
      }
      vertices.needsUpdate=true;
      projectionLink.visible=eased>.002;linkMaterial.uniforms.uReveal.value=eased;linkMaterial.uniforms.uTime.value=reduced()?0:time;
      const name=document.querySelector('.top-bar .identity')?.getBoundingClientRect(),tools=document.querySelector('.top-bar .top-actions')?.getBoundingClientRect(),bw=back.offsetWidth||186,bx=innerWidth/2-bw/2;
      const strip=expanded||(name&&tools&&bx>=name.right+12&&bx+bw<=tools.left-12);
      back.style.top=strip?`${expanded?16:(name.top+name.bottom)/2-24}px`:'92px';
    },
    get focusPoint(){return {y:4.8,z:.5};},
    dispose(){
      if(disposed)return;disposed=true;close({immediate:true});clearTimers();unload();outside.cancel();
      canvas.removeEventListener('pointerdown',onDown);canvas.removeEventListener('pointermove',onMove);canvas.removeEventListener('pointerup',onUp);canvas.removeEventListener('pointercancel',onCancel);
      removeEventListener('keydown',key);panel.remove();backing.removeFromParent();projectionLink.removeFromParent();
      geometry.dispose();glassMaterial.dispose();linkGeometry.dispose();linkMaterial.dispose();shell.remove();document.body.classList.remove('website-open');
    },
  };
}
