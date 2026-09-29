import * as THREE from 'three';

// The exit travels toward -X, across the back of the garage. Merely placing
// a -Z-facing driveway on the left reproduces the exact mistake reported.
export function createGarageRampRoute(){
  return new THREE.CatmullRomCurve3([
    new THREE.Vector3(8.8,0,-16.7),
    new THREE.Vector3(11.5,.12,-22.0),
    new THREE.Vector3(10.3,.40,-27.1),
    new THREE.Vector3(1.8,1.05,-30.3),
    new THREE.Vector3(-7.2,1.85,-30.3),
    new THREE.Vector3(-21,3.6,-30.3),
    new THREE.Vector3(-39,5.5,-30.3),
  ],false,'centripetal');
}

export function createRampRibbon(route,width=6.8,segments=160){
  const positions=[],uvs=[],indices=[],normal=new THREE.Vector3();
  for(let i=0;i<=segments;i++){
    const t=i/segments,p=route.getPoint(t),tangent=route.getTangent(t);
    normal.set(-tangent.z,0,tangent.x).normalize();
    for(const side of [1,-1]){
      positions.push(p.x+normal.x*width*.5*side,p.y,p.z+normal.z*width*.5*side);
      uvs.push(side===1?0:1,t*8);
    }
    if(i<segments){const a=i*2;indices.push(a,a+2,a+1,a+1,a+2,a+3);}
  }
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));
  geometry.setIndex(indices);geometry.computeVertexNormals();return geometry;
}
