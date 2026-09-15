import * as THREE from 'three';
// Keep both ends outside the view, while the seven identity junctions stay readable.
export function bandPoint(p,target=new THREE.Vector3()){
 const spill=Math.sign(p.x)*Math.max(0,Math.abs(p.x)-6)*1.6;
 return target.set(p.x*.62+1.7+spill,1.35+(p.y+1.35)*.34,(p.z+3.2)*.48-.5);
}
export const stageShader=`uniform float uTree;uniform vec3 uRoot;
vec3 stagePosition(vec3 p){
 float spill=sign(p.x)*max(0.,abs(p.x)-6.)*1.6;
 vec3 conduit=vec3(p.x*.62+1.7+spill,1.35+(p.y+1.35)*.34,(p.z+3.2)*.48-.5);
 vec3 d=p-uRoot;vec3 grove=vec3(-d.y*.32,.38+max(-1.0,d.x)*.32,d.z*.32);
 return mix(conduit,grove,uTree);
}`;
