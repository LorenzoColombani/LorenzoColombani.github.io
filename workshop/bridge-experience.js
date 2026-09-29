import * as THREE from 'three';
import { createBridgePortal } from './bridge-portal.js?v=single-score-1';
import { createPortalAudio } from './portal-audio.js?v=single-score-1';

// The authored film owns its typography and renderer; the workshop owns the
// doorway, camera travel and lifecycle. The film and its score run inside the
// aperture; its controls appear once the camera has crossed into that world.
export function createBridgeExperience({scene,camera,canvas,getMuted,onOpen,onClose,getReturnLabel}) {
  const portal=createBridgePortal({scene});
  const shell=document.createElement('section');
  shell.className='bridge-experience';shell.hidden=true;shell.setAttribute('aria-label','The Bridge film');shell.setAttribute('aria-hidden','true');
  const exit=document.createElement('button');exit.type='button';exit.className='bridge-exit';
  exit.textContent='↶ Workshop';exit.setAttribute('aria-label','Return to the workshop');
  const status=document.createElement('p');status.className='bridge-status';status.setAttribute('role','status');
  const retry=document.createElement('button');retry.type='button';retry.className='bridge-retry';retry.textContent='Try again';retry.hidden=true;
  const controls=document.createElement('div');controls.className='bridge-playback';controls.setAttribute('aria-label','Film controls');
  const pause=document.createElement('button'),mute=document.createElement('button');pause.type=mute.type='button';pause.textContent='Pause';mute.textContent='Mute';controls.append(pause,mute);
  shell.append(exit,status,retry,controls);document.body.append(shell);
  let frame=null,loading=null,api=null,active=false,armed=false,started=false,failed=false,filmRunning=false,disposed=false;
  let progress=0,elapsed=0,token=0,restoreFocus=null,historyOwned=false,frameReady=false,pendingBack=false;
  const startPosition=new THREE.Vector3(),startRotation=new THREE.Quaternion();
  const center=new THREE.Vector3(),normal=new THREE.Vector3(),endPosition=new THREE.Vector3();
  const screenCenter=new THREE.Vector3(),cameraOffset=new THREE.Vector3();
  const aimRotation=new THREE.Quaternion(),matrix=new THREE.Matrix4(),up=new THREE.Vector3(0,1,0);
  let path=null,frameWidth=0,frameHeight=0,compactFrame=false;
  const portalAudio=createPortalAudio({getMuted});
  const cleanURL=()=>{const url=new URL(location.href);url.searchParams.delete('view');return url.pathname+url.search+url.hash;};
  function syncControls(){
    pause.textContent=api?.state==='paused'||api?.state==='ended'?'Play':'Pause';
    const muted=api?.snapshot?.().muted??getMuted();mute.textContent=muted?'Sound on':'Mute';mute.setAttribute('aria-pressed',String(muted));
  }
  function fitFrame(){
    if(!frame)return;
    const width=window.innerWidth,height=window.innerHeight;
    // Keep a landscape document throughout an active film so rotation cannot
    // trigger its orientation gate or invalidate its authored text line breaks.
    if(!frameWidth||!active){frameWidth=height>width?960:width;frameHeight=height>width?600:height;}
    frame.style.width=frameWidth+'px';frame.style.height=frameHeight+'px';frame.style.left=(width-frameWidth)/2+'px';frame.style.top=(height-frameHeight)/2+'px';
    compactFrame=width<700||height<540||height>width;
    shell.classList[compactFrame?'add':'remove']('bridge-compact');api?.setHostControls?.(compactFrame);
    if(started){const scale=Math.min(width/frameWidth,height/frameHeight);frame.style.transform=Math.abs(scale-1)<.0001?'none':`scale(${scale})`;}
  }
  pause.addEventListener('click',()=>{if(!started||!api)return;if(api.state==='playing')api.pause();else Promise.resolve(api.play()).then(syncControls).catch(showFailure);syncControls();});
  mute.addEventListener('click',()=>{if(!started||!api)return;setMuted(!(api.snapshot?.().muted??getMuted()));syncControls();});
  function setStatus(text){status.textContent=text;status.hidden=!text;}
  function silence(){portalAudio.stop();}
  function showFailure(error){
    if(!active)return;failed=true;armed=false;
    silence();api?.pause();frame?.classList.remove('bridge-film-visible');
    shell.classList.remove('bridge-playing');setStatus('The Bridge could not load. Return to the workshop or try again.');retry.hidden=false;
    document.body.dataset.bridgeState='error';console.error('Bridge exhibit:',error);
  }
  function prepare(){
    if(disposed)return Promise.resolve(null);
    if(loading)return loading;
    const generation=token;
    frame=document.createElement('iframe');frame.className='bridge-film';
    frame.title='The Bridge — interactive film';frame.allow='autoplay';frame.tabIndex=-1;frame.setAttribute('aria-hidden','true');
    // Nonzero, real viewport dimensions preserve the film's authored line breaks.
    shell.hidden=false;shell.prepend(frame);frameWidth=frameHeight=0;fitFrame();frame.src='./experiences/bridge/?workshop=1&v=interaction-round-1';
    loading=new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>reject(new Error('Bridge readiness timed out')),20000);
      frame.addEventListener('load',async()=>{
        try{
          const candidate=frame?.contentWindow?.__WORKSHOP_BRIDGE;
          if(!candidate)throw new Error('Bridge embed API unavailable');
          await candidate.ready;
          if(generation!==token){clearTimeout(timer);return;}
          api=candidate;frameReady=true;fitFrame();syncControls();clearTimeout(timer);resolve(candidate);
        }catch(error){clearTimeout(timer);reject(error);}
      },{once:true});
      frame.addEventListener('error',()=>{clearTimeout(timer);reject(new Error('Bridge source unavailable'));},{once:true});
    });
    loading.catch(error=>{if(generation===token)showFailure(error);});
    return loading;
  }
  function arm(){
    const generation=token;
    // The lightweight boot API exists before the full film/fonts are ready.
    // Call it in the click stack so it can authorize the actual media now.
    const admit=candidate=>Promise.resolve(candidate.arm(getMuted())).then(()=>{
      if(generation!==token||!active)return;api=candidate;frameReady=true;armed=true;setStatus('');
    });
    const earlyAPI=api||frame?.contentWindow?.__WORKSHOP_BRIDGE;
    try{(earlyAPI?admit(earlyAPI):prepare().then(admit)).catch(error=>{if(generation===token)showFailure(error);});}
    catch(error){showFailure(error);}
  }
  // Reserve soundtrack playback while the product card is still in the user's
  // launch gesture. The visible portal starts only after the card reaches it.
  function primeAudio(){
    const candidate=api||frame?.contentWindow?.__WORKSHOP_BRIDGE;
    if(candidate){try{Promise.resolve(candidate.arm(getMuted())).catch(()=>{});}catch{}}
  }
  function open({fromHistory=false}={}){
    if(active||disposed)return;
    active=true;exit.textContent='← '+(getReturnLabel?.()||'Return to the Workshop');exit.setAttribute('aria-label',getReturnLabel?.()||'Return to the Workshop');failed=false;armed=false;started=false;filmRunning=false;progress=0;elapsed=0;
    restoreFocus=document.activeElement;onOpen?.();
    document.body.classList.add('bridge-open');document.body.dataset.bridgeState='opening';
    fitFrame();shell.style.background='';shell.hidden=false;shell.removeAttribute('aria-hidden');shell.classList.add('is-active');retry.hidden=true;setStatus('Opening The Bridge…');
    startPosition.copy(camera.position);startRotation.copy(camera.quaternion);
    center.set(0,4.8,1.1);normal.copy(startPosition).sub(center).normalize();
    matrix.lookAt(startPosition,center,up);aimRotation.setFromRotationMatrix(matrix);
    portal.place(center,aimRotation);
    const distance=startPosition.distanceTo(center);
    const approach=center.clone().addScaledVector(normal,Math.min(7,distance*.65));
    endPosition.copy(center).addScaledVector(normal,-1.25);
    path=new THREE.CatmullRomCurve3([startPosition.clone(),approach,center.clone().addScaledVector(normal,Math.min(2.1,distance*.25)),endPosition.clone()]);
    if(!fromHistory&&new URLSearchParams(location.search).get('view')!=='bridge'){
      const url=new URL(location.href);url.searchParams.set('view','bridge');history.pushState({workshopView:'bridge'},'',url);historyOwned=true;
    }
    portalAudio.start();arm();exit.focus({preventScroll:true});
  }
  function close(fromHistory=false){
    if(!active)return;
    active=false;token++;silence();
    try{api?.dispose();}catch{}api=null;frameReady=false;loading=null;
    frame?.remove();frame=null;progress=0;started=false;armed=false;filmRunning=false;
    portal.update({time:0,progress:0,pixelRatio:devicePixelRatio,reduced:true});
    shell.hidden=true;shell.style.background='';shell.setAttribute('aria-hidden','true');shell.classList.remove('bridge-playing','is-active');document.body.classList.remove('bridge-open');document.body.dataset.bridgeState='closed';
    camera.position.copy(startPosition);camera.quaternion.copy(startRotation);onClose?.();
    if(historyOwned&&!fromHistory){historyOwned=false;pendingBack=true;history.back();}else {historyOwned=false;if(!fromHistory&&new URLSearchParams(location.search).get('view')==='bridge')history.replaceState({},'',cleanURL());}
    requestAnimationFrame(()=>restoreFocus?.isConnected&&restoreFocus.focus({preventScroll:true}));
    // Keep the next project click ready too, without retaining the prior film.
    if(!disposed)prepare();
  }
  function update({dt,time,pixelRatio,reduced}){
    if(!active)return;
    if(!document.hidden&&!failed&&!started){
      elapsed+=dt;
      // The portal can form while assets load; never cross into an unready film.
      const next=progress+dt/(reduced?.2:6);
      progress=armed?Math.min(1,next):Math.min(.28,next);
      if(armed&&progress>=.28&&!filmRunning){
        filmRunning=true;
        const generation=token;
        try{Promise.resolve(api.play({preview:true})).catch(error=>{if(generation===token)showFailure(error);});}catch(error){showFailure(error);}
      }
      if(failed)return;
      document.body.dataset.bridgeProgress=progress.toFixed(3);
      if(progress===1){
        started=true;silence();shell.style.background='#000';shell.classList.add('bridge-playing');frame.classList.add('bridge-film-visible');
        frame.removeAttribute('aria-hidden');frame.tabIndex=0;frame.style.clipPath='none';frame.style.opacity='1';frame.style.transform='none';fitFrame();syncControls();
        setStatus('');document.body.dataset.bridgeState='film';
        api.present?.();
        frame.focus({preventScroll:true});
      }
    }
    // Local age gives every opening a deliberate ignition, even after idle time.
    portal.update({time:elapsed,progress,pixelRatio,reduced});
    portalAudio.update({elapsed,progress,phase:portal.phase*Math.PI*2,filmPlaying:filmRunning,reduced});
    if(path&&!failed){
      const travel=THREE.MathUtils.smoothstep(progress,.36,1);
      camera.position.copy(reduced?startPosition:path.getPoint(travel));
      camera.quaternion.slerpQuaternions(startRotation,aimRotation,reduced?0:THREE.MathUtils.smoothstep(progress,0,.48));
      if(frameReady&&armed&&!started&&progress>=.16){
        frame.classList.add('bridge-film-visible');
        // The film replaces the aperture's interior while the camera is still
        // in front of it. Cover every corner BEFORE crossing the portal plane;
        // a late screen-space fade exposed the room behind the camera crossing.
        const width=window.innerWidth,height=window.innerHeight;
        camera.updateMatrixWorld();screenCenter.copy(center).project(camera);
        const x=(screenCenter.x*.5+.5)*width,y=(-screenCenter.y*.5+.5)*height;
        const distance=cameraOffset.copy(camera.position).sub(center).dot(normal);
        const radius=portal.radius*.94*height*.5/(Math.max(camera.near,distance)*Math.tan(THREE.MathUtils.degToRad(camera.fov*.5)));
        const coversView=distance<=camera.near*2||radius>=Math.hypot(Math.max(x,width-x),Math.max(y,height-y));
        const fit=Math.min(width/frameWidth,height/frameHeight),cover=Math.max(width/frameWidth,height/frameHeight);
        const settle=reduced?1:THREE.MathUtils.smoothstep(progress,.85,1);
        const scale=coversView||reduced?THREE.MathUtils.lerp(cover,fit,settle):Math.min(cover,radius*2/frameHeight);
        frame.style.opacity='1';
        frame.style.transform=coversView||reduced?(Math.abs(scale-1)<.0001?'none':`scale(${scale})`):`translate(${x-width*.5}px,${y-height*.5}px) scale(${scale})`;
        frame.style.clipPath=coversView||reduced?'none':`circle(${radius/scale}px at 50% 50%)`;
        if(coversView||reduced)shell.style.background='#000';
      }
    }
  }
  function onMessage(event){
    if(event.source!==frame?.contentWindow||event.origin!==location.origin||event.data?.source!=='workshop-bridge')return;
    if(event.data.type==='return')close();
    else if(event.data.type==='error')showFailure(new Error(event.data.message||'Bridge playback error'));
    else if(event.data.type==='ended')document.body.dataset.bridgeState='ended';
    syncControls();
  }
  const onKey=event=>{if(active&&event.key==='Escape'){event.preventDefault();close();}};
  const onHistory=()=>{
    if(pendingBack){
      pendingBack=false;
      // A fast second click may arrive before the previous Back completes.
      if(active){const url=new URL(location.href);url.searchParams.set('view','bridge');history.pushState({workshopView:'bridge'},'',url);historyOwned=true;}
      return;
    }
    const showingBridge=new URLSearchParams(location.search).get('view')==='bridge';
    if(active&&!showingBridge)close(true);
    else if(!active&&showingBridge)open({fromHistory:true});
  };
  const onHome=event=>{if(active){event.preventDefault();close();}};
  exit.addEventListener('click',()=>close());
  retry.addEventListener('click',()=>{
    // Recreate a failed load in place; navigating Back would cancel the retry.
    token++;try{api?.dispose();}catch{}api=null;frameReady=false;loading=null;
    frame?.remove();frame=null;failed=false;started=false;armed=false;filmRunning=false;progress=0;elapsed=0;
    retry.hidden=true;setStatus('Opening The Bridge…');document.body.dataset.bridgeState='opening';
    portalAudio.start();arm();exit.focus({preventScroll:true});
  });
  addEventListener('resize',fitFrame);addEventListener('message',onMessage);addEventListener('keydown',onKey);addEventListener('popstate',onHistory);
  document.getElementById('workshop-home').addEventListener('click',onHome);
  function setMuted(value){portalAudio.setMuted(value);api?.setMuted(Boolean(value));syncControls();}
  function dispose(){if(disposed)return;disposed=true;close(true);token++;frame?.remove();frame=null;loading=null;portalAudio.dispose();portal.dispose();shell.remove();removeEventListener('resize',fitFrame);removeEventListener('message',onMessage);removeEventListener('keydown',onKey);removeEventListener('popstate',onHistory);document.getElementById('workshop-home')?.removeEventListener('click',onHome);}
  return {prepare,primeAudio,open,close,update,setMuted,dispose,get active(){return active;},get ownsScreen(){return active&&started&&!failed;}};
}
