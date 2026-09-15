import * as THREE from 'three';

// The existing, fully graded authored sequence unfolds on a sky surface.
// It is drawn after the room's grade so the original colors are not graded twice.
export function createSkyStage({scene,camera,getFrame}){
 const skyScene=new THREE.Scene(),center=new THREE.Vector3(0,22,-3),seat=new THREE.Vector3(0,8.4,2.4);
 let buffer=document.createElement('canvas'),ctx=buffer.getContext('2d');buffer.width=1080;buffer.height=675;
 const texture=new THREE.CanvasTexture(buffer);texture.colorSpace=THREE.NoColorSpace;texture.generateMipmaps=false;texture.minFilter=THREE.LinearFilter;
 const mat=new THREE.ShaderMaterial({transparent:true,depthWrite:false,depthTest:false,toneMapped:false,uniforms:{map:{value:texture},opacity:{value:0},reveal:{value:0},aspect:{value:1},background:{value:0}},vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'varying vec2 vUv;uniform sampler2D map;uniform float opacity,reveal,aspect,background;void main(){vec4 c=texture2D(map,vUv);float r=length((vUv-.5)*vec2(aspect,1.));float edge=reveal*(length(vec2(aspect,1.))*.5+.065)-.02;float a=1.-smoothstep(edge-.045,edge+.015,r);float light=smoothstep(.008,.045,max(c.r,max(c.g,c.b)));gl_FragColor=vec4(c.rgb,c.a*a*opacity*mix(background,1.,light));}'});
 const surface=new THREE.Mesh(new THREE.PlaneGeometry(1,1),mat);surface.position.copy(center);surface.lookAt(seat);skyScene.add(surface);surface.visible=false;
 const pointer=new THREE.Vector2(),ray=new THREE.Raycaster();let boxes=[];
 function hit(event){if(!surface.visible)return null;pointer.set(event.clientX/innerWidth*2-1,1-event.clientY/innerHeight*2);ray.setFromCamera(pointer,camera);return ray.intersectObject(surface)[0]||null;}
 function linkAt(event){const h=hit(event);if(!h)return null;return boxes.find(b=>h.uv.x>=b.x&&h.uv.x<=b.x+b.w&&1-h.uv.y>=b.y&&1-h.uv.y<=b.y+b.h)?.href||null;}
 function update(progress,zoom=1){
  surface.visible=progress>.60;boxes=[];if(!surface.visible)return;
  const rise=THREE.MathUtils.smoothstep(progress,.60,.98);mat.uniforms.opacity.value=rise;mat.uniforms.reveal.value=rise;mat.uniforms.aspect.value=camera.aspect;mat.uniforms.background.value=THREE.MathUtils.smoothstep(progress,.78,.985);
  const distance=seat.distanceTo(center),vh=2*distance*Math.tan(THREE.MathUtils.degToRad(camera.fov/2));const height=vh*1.012,width=height*camera.aspect;surface.scale.set(width*zoom,height*zoom,1);
  const frame=getFrame(),doc=frame?.contentDocument,film=frame?.contentWindow?.__LOKI,print=film?.renderCanvas?.();
  if(!doc||!print?.width||!print?.height||!film?.started()){surface.visible=false;return;}
  if(buffer.ownerDocument!==doc){buffer=doc.createElement('canvas');ctx=buffer.getContext('2d');texture.image=buffer;}
  if(buffer.width!==print.width||buffer.height!==print.height){buffer.width=print.width;buffer.height=print.height;}
  ctx.clearRect(0,0,buffer.width,buffer.height);ctx.drawImage(print,0,0);
  // Preserve the source's actual evidence links, which live outside its WebGL print.
  const stage=doc.getElementById('stage')?.getBoundingClientRect(),sx=buffer.width/(stage?.width||buffer.width),sy=buffer.height/(stage?.height||buffer.height);
  for(const el of stage?.width&&stage?.height?doc.querySelectorAll('.ex-tag'):[]){const style=frame.contentWindow.getComputedStyle(el);if(style.visibility==='hidden'||Number(style.opacity)<=0)continue;const r=el.getBoundingClientRect(),x=(r.left-stage.left)*sx,y=(r.top-stage.top)*sy,w=r.width*sx,h=r.height*sy;
   // These are the source's moving paper tags: retain their font, tilt, punch,
   // colour and exit fade rather than replacing them with a new caption style.
   const ew=el.offsetWidth,eh=el.offsetHeight,transform=new DOMMatrixReadOnly(style.transform),fontSize=parseFloat(style.fontSize),padLeft=parseFloat(style.paddingLeft),padTop=parseFloat(style.paddingTop),padBottom=parseFloat(style.paddingBottom);
   ctx.save();ctx.globalAlpha=Number(style.opacity);ctx.translate(x+w/2,y+h/2);ctx.scale(sx,sy);ctx.rotate(Math.atan2(transform.b,transform.a));ctx.translate(-ew/2,-eh/2);ctx.filter=style.filter;ctx.fillStyle=style.backgroundColor;ctx.strokeStyle=style.borderTopColor;ctx.lineWidth=parseFloat(style.borderTopWidth)||1;ctx.beginPath();ctx.roundRect(0,0,ew,eh,parseFloat(style.borderTopLeftRadius)||2);ctx.fill();ctx.stroke();
   ctx.beginPath();ctx.arc(fontSize*.863,eh/2,fontSize*.318,0,Math.PI*2);ctx.fillStyle='#0a0805';ctx.fill();ctx.lineWidth=fontSize*.136;ctx.stroke();ctx.fillStyle=style.color;ctx.font=`${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;ctx.letterSpacing=style.letterSpacing;ctx.textAlign='left';ctx.textBaseline='middle';const text=el.textContent.trim(),ty=padTop+(eh-padTop-padBottom)/2;ctx.fillText(text,padLeft,ty);const textWidth=ctx.measureText(text).width;ctx.globalAlpha*=.55;ctx.fillText(' ↗',padLeft+textWidth,ty);ctx.restore();if(el.classList.contains('on'))boxes.push({x:x/buffer.width,y:y/buffer.height,w:w/buffer.width,h:h/buffer.height,href:el.href});
  }
  texture.needsUpdate=true;
 }
 function render(renderer){if(!surface.visible)return;const clear=renderer.autoClear;renderer.autoClear=false;renderer.render(skyScene,camera);renderer.autoClear=clear;}
 function dispose(){surface.geometry.dispose();mat.dispose();texture.dispose();}
 return {update,render,hit,linkAt,dispose,center,seat};
}
