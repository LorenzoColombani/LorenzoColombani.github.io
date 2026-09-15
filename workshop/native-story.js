import * as THREE from 'three';
import { bandPoint } from './stage-space.js';

// Original authored painters keep their composition, glyph changes and score clock.
// Their transparent layers occupy separate depths above the workshop table.
export function createNativeStory({scene,getFilm}){
 const stage=new THREE.Group();scene.add(stage);
 const actors=new Map(),scenery=new Map(),badges=new Map();let source=null,pose=null,constellation=null;
 const origin=new THREE.Vector3(0,1.9,0),bounds=new THREE.Box3(new THREE.Vector3(-5.5,1.95,-2.2),new THREE.Vector3(5.5,8.1,1.3)),hitBounds=new THREE.Box3();
 const layout={dossier1:[3.05,3.88,0,2.8,.65],dossier2:[3.05,3.88,0,2.8,.65],cast:[10.2,6.375,0,2.95,.55],tally:[10.2,6.375,0,2.95,.6],crew:[10.2,6.375,0,2.95,.55],wordmark:[10.2,6.375,0,2.95,.5],sting:[8.5,5.313,0,2.95,.6],credits:[9.5,5.938,0,2.95,.65]};
 function remove(mesh){stage.remove(mesh);mesh.geometry.dispose();mesh.material.map?.dispose();mesh.material.dispose();}
 function clear(){if(constellation){remove(constellation.stars);remove(constellation.lines);constellation=null;}for(const a of actors.values())remove(a.mesh);for(const a of scenery.values())remove(a.mesh);for(const a of badges.values()){remove(a.mesh);remove(a.leader);}actors.clear();scenery.clear();badges.clear();pose=null;stage.visible=false;}
 function plane(canvas,def,order=20){const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;const material=new THREE.MeshBasicMaterial({map:texture,transparent:true,depthWrite:false,side:THREE.DoubleSide});const mesh=new THREE.Mesh(new THREE.PlaneGeometry(def[0],def[1]),material);mesh.position.copy(origin).add(new THREE.Vector3(...def.slice(2)));mesh.renderOrder=order;stage.add(mesh);return {mesh,texture};}
 function update({opacity=1,position=new THREE.Vector3(),scale=1,mobile=false}={}){
  const film=getFilm();if(film!==source){clear();source=film;}if(!film?.started()){stage.visible=false;return;}
  stage.visible=true;stage.position.copy(position);stage.scale.setScalar(scale);pose=film.readingPose?.();const t=film.t(),content=film.storyContent();
  for(const packet of film.nativeActors(mobile?350:800)){
   const def=layout[packet.id];if(!def)continue;let a=actors.get(packet.id);if(!a){a=plane(packet.canvas,def);actors.set(packet.id,a);}
   a.mesh.visible=packet.active;if(packet.active){a.texture.needsUpdate=true;a.mesh.material.opacity=opacity;}
  }
  // The original clock, drawers, ledger and other macro props retain their artwork
  // and fades. They sit behind the type in the same table projection volume.
  for(const [i,packet] of film.nativeScenery().entries()){
   let a=scenery.get(i);if(!a){a=plane(packet.canvas,[10.4,5.86,packet.side*.36,2.95,-1.65],8);a.mesh.rotation.y=-Math.sign(packet.side)*.07;scenery.set(i,a);}
   a.mesh.visible=packet.opacity>.001;a.mesh.material.opacity=packet.opacity*opacity*.88;
  }
  const chin=film.nativeConstellation();if(chin){
   if(!constellation){const sg=new THREE.BufferGeometry(),lg=new THREE.BufferGeometry();sg.setAttribute('position',new THREE.Float32BufferAttribute(chin.stars,3));sg.setAttribute('color',new THREE.Float32BufferAttribute(chin.colors,3));lg.setAttribute('position',new THREE.Float32BufferAttribute(chin.lines,3));const stars=new THREE.Points(sg,new THREE.PointsMaterial({size:.045,vertexColors:true,transparent:true,depthWrite:false,toneMapped:false})),lines=new THREE.LineSegments(lg,new THREE.LineBasicMaterial({color:0xffdc9c,transparent:true,depthWrite:false}));for(const mesh of [stars,lines]){mesh.position.set(0,4.95,-1.2);mesh.scale.setScalar(2.25);stage.add(mesh);}constellation={stars,lines};}
   constellation.stars.material.opacity=chin.alpha*opacity;constellation.stars.geometry.attributes.color.array.set(chin.colors);constellation.stars.geometry.attributes.color.needsUpdate=true;constellation.lines.material.opacity=chin.lineAlpha*opacity*2;
  }
  for(let i=0;i<7;i++){
   const branch=film.identityBranch(i);if(!branch)continue;const shown=t>=branch.start&&t<branch.prune+.5;let b=badges.get(i);
   if(!b&&shown){const cv=film.typeAsset(String(i+1).padStart(2,'0'),'400 {s}px "Courier Prime"',56,'#ffe5a7');const h=.24;b=plane(cv,[h*cv.width/cv.height,h,0,0,0]);const geometry=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(),new THREE.Vector3()]);b.leader=new THREE.Line(geometry,new THREE.LineBasicMaterial({color:0xffdca2,transparent:true,opacity:.65,depthWrite:false}));stage.add(b.leader);badges.set(i,b);}
   if(!b)continue;b.mesh.visible=b.leader.visible=shown;if(!shown)continue;
   const anchor=bandPoint(branch.point).add(origin),cut=Math.max(0,Math.min(1,(t-branch.prune)/.5));b.mesh.position.copy(anchor).add(new THREE.Vector3(0,.38,.18));b.mesh.material.opacity=opacity*(1-cut);
   const points=b.leader.geometry.attributes.position;points.setXYZ(0,anchor.x,anchor.y,anchor.z);points.setXYZ(1,b.mesh.position.x,b.mesh.position.y-.1,b.mesh.position.z);points.needsUpdate=true;b.leader.material.opacity=opacity*(1-cut)*.7;
  }
 }
 function hit(raycaster){if(!stage.visible)return false;stage.updateWorldMatrix(true,false);hitBounds.copy(bounds).applyMatrix4(stage.matrixWorld);return raycaster.ray.intersectsBox(hitBounds);}
 return {update,hit,get readingPose(){return pose;},clear,dispose(){clear();scene.remove(stage);}};
}
