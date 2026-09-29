import * as THREE from 'three';
import { RoundedBoxGeometry } from './vendor/RoundedBoxGeometry.js';

function resources() {
  const geometries = new Set(), materials = new Set(), textures = new Set();
  return {
    geometry: value => (geometries.add(value), value),
    material: value => (materials.add(value), value),
    texture: value => (textures.add(value), value),
    dispose() { for (const set of [geometries, materials, textures]) set.forEach(value => value.dispose()); },
  };
}

function rectangle(width, depth, radius) {
  const x = width / 2, z = depth / 2, r = radius, shape = new THREE.Shape();
  shape.moveTo(-x + r, -z); shape.lineTo(x - r, -z);
  shape.quadraticCurveTo(x, -z, x, -z + r); shape.lineTo(x, z - r);
  shape.quadraticCurveTo(x, z, x - r, z); shape.lineTo(-x + r, z);
  shape.quadraticCurveTo(-x, z, -x, z - r); shape.lineTo(-x, -z + r);
  shape.quadraticCurveTo(-x, -z, -x + r, -z); return shape;
}

export function createHolographicTable({ scene, table, showProjectSeats = true }) {
  const own = resources(), group = new THREE.Group();
  group.name = 'Workshop / optical worktable'; scene.add(group);
  const previousVisibility = table.visible; table.visible = false;
  const surface = (color, roughness, metalness = 0) => own.material(new THREE.MeshStandardMaterial({ color, roughness, metalness }));
  const alloy = surface(0x9bafa9, .29, .82), dark = surface(0x12242a, .43, .42);
  const porcelain = surface(0xc7d2ca, .38, .14), rubber = surface(0x172629, .9);
  const grain = document.createElement('canvas'); grain.width = 1024; grain.height = 512;
  const ctx = grain.getContext('2d'); ctx.fillStyle = '#53635e'; ctx.fillRect(0, 0, 1024, 512);
  for (let i = 0; i < 850; i++) {
    const y = i * .61, wave = Math.sin(i * .071) * 4;
    ctx.beginPath(); ctx.moveTo(0, y); ctx.bezierCurveTo(340, y + wave, 610, y - wave * .7, 1024, y + wave * .2);
    ctx.lineWidth = i % 13 === 0 ? 1.1 : .45;
    ctx.strokeStyle = i % 3 ? 'rgba(16,29,28,.12)' : 'rgba(207,193,159,.13)'; ctx.stroke();
  }
  const finish = own.texture(new THREE.CanvasTexture(grain)); finish.colorSpace = THREE.SRGBColorSpace; finish.anisotropy = 4;
  finish.wrapS=finish.wrapT=THREE.RepeatWrapping;finish.repeat.set(.27,.42);
  const worktop = own.material(new THREE.MeshPhysicalMaterial({ color: 0xb0ada0, map: finish, roughness: .47, metalness: .12, clearcoat: .27, clearcoatRoughness: .38 }));
  function add(geometry, material, position, name) {
    const object = new THREE.Mesh(own.geometry(geometry), material); object.position.set(...position); object.name = name;
    object.castShadow = object.receiveShadow = true; object.raycast = () => {}; group.add(object); return object;
  }
  function box(w, h, d, material, position, name, radius = .035) {
    return add(new RoundedBoxGeometry(w, h, d, 4, Math.min(radius, h * .4)), material, position, name);
  }
  function rim(w, d, holeW, holeD, height, material, y, name) {
    const shape = rectangle(w, d, .17); shape.holes.push(rectangle(holeW, holeD, .10));
    const geometry = new THREE.ExtrudeGeometry(shape, { depth: height, bevelEnabled: true, bevelSize: .015, bevelThickness: .012, bevelSegments: 3, curveSegments: 12 });
    geometry.rotateX(-Math.PI / 2); geometry.translate(0, -height / 2, 0);
    return add(geometry, material, [0, y, 0], name);
  }
  box(7.35, .13, 5.20, dark, [0, 1.655, 0], 'table / underframe');
  rim(7.55, 5.38, 3.52, 3.52, .045, alloy, 1.73, 'table / machined perimeter');
  rim(7.48, 5.30, 3.61, 3.61, .135, worktop, 1.81, 'table / fine-grain work surface');
  rim(3.69, 3.69, 3.48, 3.48, .024, alloy, 1.882, 'table / recessed optical bezel');
  // Hollow, machined side frames replace the broad solid slabs. Their inset
  // edges, grounded feet and shadow joints remain legible from the room camera.
  for (const side of [-1, 1]) {
    const support=rectangle(3.66,1.49,.15);support.holes.push(rectangle(3.23,1.13,.13));
    const geometry=new THREE.ExtrudeGeometry(support,{depth:.16,bevelEnabled:true,bevelSize:.026,bevelThickness:.025,bevelSegments:4,curveSegments:10});
    geometry.rotateY(Math.PI/2);
    add(geometry,porcelain,[side*2.70,.89,0],'table / open structural frame');
    box(.28,.085,3.77,alloy,[side*2.70,.19,0],'table / brushed foot rail');
    for(const z of [-1.52,1.52]) box(.34,.105,.54,rubber,[side*2.70,.082,z],'table / isolated contact foot',.035);
    box(.23,.065,3.42,dark,[side*2.70,1.60,0],'table / top isolation joint');
  }
  box(4.75, .12, .32, dark, [0, .72, -.90], 'table / structural crossmember');
  const contact = own.material(new THREE.MeshBasicMaterial({ color: 0x89dcec, transparent: true, opacity: .7, toneMapped: false }));
  for (const [x, z] of (showProjectSeats ? [[-2.5, 1.35], [2.5, 1.35], [0, 2.20]] : [])) {
    box(.64, .026, .48, dark, [x, 1.899, z], 'table / project seat', .05);
    box(.38, .009, .018, contact, [x, 1.917, z + .15], 'table / project source light', .003).castShadow = false;
    for (const offset of [-.25, .25]) box(.012, .012, .12, alloy, [x + offset, 1.917, z], 'table / seat index', .002);
  }
  let disposed = false;
  return {
    group,
    update({ night = 0, charge = 0 }) { contact.opacity = .42 + night * .3 + charge * .2; },
    dispose() { if (disposed) return; disposed = true; group.removeFromParent(); table.visible = previousVisibility; own.dispose(); },
  };
}

function loopPoint(u, v, target = new THREE.Vector3()) {
  const a=u*Math.PI*2,band=(v-.5)*.92,r=1.10+band*Math.cos(a*.5);
  return target.set(Math.cos(a)*r,Math.sin(a)*(1.28+band*Math.cos(a*.5)*.86),
    Math.sin(a*2)*.24+band*Math.sin(a*.5)*1.28);
}

function loopGeometry(segments=72,rows=5) {
  const positions=[],uvs=[],indices=[],point=new THREE.Vector3();
  for(let i=0;i<=segments;i++)for(let j=0;j<=rows;j++){
    loopPoint(i/segments,j/rows,point);positions.push(...point);uvs.push(i/segments,j/rows);
  }
  for(let i=0;i<segments;i++)for(let j=0;j<rows;j++){
    const a=i*(rows+1)+j,b=a+rows+1;indices.push(a,b,a+1,b,b+1,a+1);
  }
  const indexed=new THREE.BufferGeometry();indexed.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  indexed.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));indexed.setIndex(indices);indexed.computeVertexNormals();
  const geometry=indexed.toNonIndexed();indexed.dispose();
  const barycentric=new Float32Array(geometry.attributes.position.count*3);
  for(let i=0;i<geometry.attributes.position.count;i++)barycentric[i*3+i%3]=1;
  geometry.setAttribute('barycentric',new THREE.BufferAttribute(barycentric,3));
  const facets=new Float32Array(geometry.attributes.position.count);
  for(let i=0;i<facets.length;i++)facets[i]=Math.abs(Math.sin(Math.floor(i/3)*73.137)*951.73)%1;
  geometry.setAttribute('facet',new THREE.BufferAttribute(facets,1));return geometry;
}

export function createHolographicVolume() {
  const own=resources(),group=new THREE.Group(),model=new THREE.Group();
  group.name='Workshop / projected topology study';model.name='Endgame reference / layered simulation volume';group.add(model);
  const uniforms={time:{value:0},night:{value:1},opacity:{value:1},coherence:{value:.28},flowPhase:{value:0},selection:{value:0}};
  const material=own.material(new THREE.ShaderMaterial({
    transparent:true,depthWrite:false,side:THREE.DoubleSide,uniforms,
    vertexShader:`attribute vec3 barycentric;attribute float facet;varying float vFacet;varying vec3 vBary,vNormal,vView;varying vec2 vUv;
      void main(){vUv=uv;vBary=barycentric;vFacet=facet;vNormal=normalize(normalMatrix*normal);
      vec4 p=modelViewMatrix*vec4(position,1.);vView=-p.xyz;gl_Position=projectionMatrix*p;}`,
    fragmentShader:`uniform float time,opacity,coherence,flowPhase,selection;varying float vFacet;varying vec3 vBary,vNormal,vView;varying vec2 vUv;
      float trace(float y,float width){return 1.-smoothstep(width,width+fwidth(vUv.y)*1.1,abs(vUv.y-y));}
      void main(){vec3 N=normalize(vNormal),V=normalize(vView);
      float face=.85;
      float facing=clamp(abs(dot(N,V)),0.,1.),fresnel=pow(max(0.,1.-facing),2.2);
      float key=pow(abs(dot(N,normalize(vec3(-.4,.8,1.)))),3.);
      float gleam=pow(abs(dot(N,normalize(V+normalize(vec3(-.5,.6,1.))))),55.);
      float selectDistance=(fract(vUv.x-time*.08)-.5)/.14;
      float selected=step(.58,vFacet)*exp(-selectDistance*selectDistance);
      vec3 edges=smoothstep(vec3(0.),fwidth(vBary)*.70,vBary);
      float mesh=1.-min(min(edges.x,edges.y),edges.z);
      float perimeter=1.-smoothstep(.006,.018,min(vUv.y,1.-vUv.y));
      float ribs=1.-smoothstep(0.,max(.035,fwidth(vUv.x*40.)*1.25),abs(fract(vUv.x*40.)-.5));
      float panel=vFacet;
      vec3 body=mix(vec3(.015,.06,.105),vec3(.15,.53,.72),key*.62+fresnel*.38);
      body*=.68+panel*.62;body+=vec3(.42,.72,.94)*gleam*.85;
      body+=vec3(.16,.46,.64)*(mesh*.24+ribs*.040);
      body=mix(body,vec3(.40,.27,.12),selected*.40);
      vec3 emission=vec3(.58,1.35,1.75)*perimeter*(.4+fresnel*.8);
      emission+=vec3(2.6,1.75,.70)*mesh*selected*.92;
      float activity=0.;
      for(int i=0;i<4;i++){
        float lane=.14+float(i)*.24;
        float a=mod(vUv.x+(i>=2?1.:0.)-flowPhase*1.45,2.);
        float packetDistance=(a-.5)/.045;float packet=exp(-packetDistance*packetDistance);
        float filament=trace(lane,.0035);float markFilter=1.-smoothstep(.3,1.,fwidth(vUv.x*96.));float marks=.5+.5*sin(vUv.x*603.185)*markFilter;
        vec3 signal=(i==1||i==2)?vec3(.58,1.46,1.18):vec3(2.8,1.36,.30);
        emission+=signal*filament*(.10+packet*1.9)+signal*filament*marks*.10;
        activity+=filament*packet;
      }
      float alpha=(.15+key*.23+fresnel*.28+mesh*.20+perimeter*.52+activity*.58+selected*.20)*face*opacity;
      body=mix(body,vec3(.055,.69,.94),selection*.42);
      emission=mix(emission,emission*vec3(.65,1.10,1.14),selection);
      gl_FragColor=vec4(body+emission,clamp(alpha+selection*.10*opacity,0.,1.));
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
      }`,
  }));
  const geometry=own.geometry(loopGeometry()),loop=new THREE.Mesh(geometry,material);loop.raycast=()=>{};loop.renderOrder=22;model.add(loop);
  // Fine offset layers show actual thickness/parallax at the folds. Their
  // opacity is intentionally far below the structural surface.
  const quietMaterials=[];
  for(const offset of [-.034,.034]){
    const layer=own.geometry(loopGeometry(180,12)),p=layer.attributes.position,n=layer.attributes.normal;
    for(let i=0;i<p.count;i++)p.setXYZ(i,p.getX(i)+n.getX(i)*offset,p.getY(i)+n.getY(i)*offset,p.getZ(i)+n.getZ(i)*offset);
    const layerOpacity=offset>0?.065:.028;
    const mat=own.material(new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,forceSinglePass:true,blending:THREE.AdditiveBlending,
      uniforms:{opacity:{value:layerOpacity},tint:{value:new THREE.Color(offset>0?0x6dc6dd:0x346d9d)}},
      vertexShader:`attribute vec3 barycentric;varying vec3 vBarycentric;void main(){vBarycentric=barycentric;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
      fragmentShader:`uniform float opacity;uniform vec3 tint;varying vec3 vBarycentric;
        void main(){vec3 filterWidth=max(fwidth(vBarycentric)*.65,vec3(.00001));
        vec3 coverage=smoothstep(vec3(0.),filterWidth,vBarycentric);float line=1.-min(min(coverage.x,coverage.y),coverage.z);
        gl_FragColor=vec4(tint,line*opacity);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        }`,
    }));
    const mesh=new THREE.Mesh(layer,mat);mesh.raycast=()=>{};mesh.renderOrder=21;model.add(mesh);quietMaterials.push({material:mat,opacity:layerOpacity});
  }
  const edgeUniforms={time:uniforms.time,opacity:uniforms.opacity};
  const edgeMaterial=own.material(new THREE.ShaderMaterial({
    transparent:true,depthWrite:false,uniforms:edgeUniforms,
    vertexShader:`varying float vLength;void main(){vLength=uv.x;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader:`uniform float time,opacity;varying float vLength;
      void main(){float distance=(fract(vLength-time*.065)-.45)/.055;float p=exp(-distance*distance);
      vec3 c=mix(vec3(.27,.79,1.04),vec3(1.75,2.8,3.3),p);
      gl_FragColor=vec4(c,(.40+p*.5)*opacity);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
      }`,
  }));
  for(const v of [0,1]){
    const points=Array.from({length:241},(_,i)=>loopPoint(i/240,v));
    const edge=new THREE.Mesh(own.geometry(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),320,.004,5,false)),edgeMaterial);edge.raycast=()=>{};edge.renderOrder=23;model.add(edge);
  }
  // Traveling sample points are constrained to the ribbon instead of being
  // an unrelated spherical particle cloud around it.
  const pointSeeds=new Float32Array(240*3);
  for(let i=0;i<240;i++){pointSeeds[i*3]=i/240;pointSeeds[i*3+1]=i%4;pointSeeds[i*3+2]=(i*.61803)%1;}
  const pointGeometry=own.geometry(new THREE.BufferGeometry());pointGeometry.setAttribute('position',new THREE.BufferAttribute(pointSeeds,3));
  const pointMaterial=own.material(new THREE.ShaderMaterial({
    transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,
    uniforms:{time:uniforms.time,opacity:uniforms.opacity,flowPhase:uniforms.flowPhase},
    vertexShader:`uniform float time,flowPhase;varying float vAlpha,vWarm;
      void main(){float phase=position.x+flowPhase,u=fract(phase),a=u*6.2831853;
      float v=.14+position.y*.24;if(mod(floor(phase),2.)>.5)v=1.-v;
      float band=(v-.5)*.92,r=1.10+band*cos(a*.5);
      vec3 p=vec3(cos(a)*r,sin(a)*(1.28+band*cos(a*.5)*.86),sin(a*2.)*.24+band*sin(a*.5)*1.28);
      vec4 mv=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mv;
      gl_PointSize=clamp(24./-mv.z,2.,3.5);vAlpha=.18+pow(position.z,8.)*.72;vWarm=step(2.,position.y);}`,
    fragmentShader:`uniform float opacity;varying float vAlpha,vWarm;
      void main(){float a=1.-smoothstep(.06,.48,length(gl_PointCoord-.5));
      gl_FragColor=vec4(mix(vec3(.6,1.6,2.1),vec3(2.5,1.35,.35),vWarm),a*vAlpha*opacity);}`,
  }));
  const points=new THREE.Points(pointGeometry,pointMaterial);points.frustumCulled=false;points.raycast=()=>{};points.renderOrder=24;model.add(points);
  const nodesMaterial=own.material(new THREE.MeshBasicMaterial({color:new THREE.Color(2.1,1.30,.42),transparent:true,opacity:.85,depthWrite:false,toneMapped:false}));
  const nodes=new THREE.InstancedMesh(own.geometry(new THREE.SphereGeometry(.013,8,6)),nodesMaterial,8),dummy=new THREE.Object3D();nodes.raycast=()=>{};nodes.renderOrder=24;model.add(nodes);
  // Each boundary of the folded surface continues down into the optical
  // bed as a faint curved light sheet. It is the same parameterized object,
  // not a separate bundle of beams stopping beneath a floating mesh.
  const projectionSheets=[],sheetSegments=96,sheetRows=12;
  const sheetMaterial=own.material(new THREE.ShaderMaterial({
    transparent:true,depthWrite:false,side:THREE.DoubleSide,forceSinglePass:true,blending:THREE.AdditiveBlending,uniforms,
    vertexShader:`varying vec2 vUv;varying vec3 vWorld;
      void main(){vUv=uv;vec4 world=modelMatrix*vec4(position,1.);vWorld=world.xyz;gl_Position=projectionMatrix*viewMatrix*world;}`,
    fragmentShader:`uniform float time,opacity;varying vec2 vUv;varying vec3 vWorld;
      // Multisample interpolation at thin triangle edges can escape the UV range.
      // Bound the height before its fifth power drives light intensity and alpha.
      void main(){float h=clamp(vUv.y,0.,1.);vec3 n=cross(dFdx(vWorld),dFdy(vWorld));vec3 N=n*inversesqrt(max(dot(n,n),.0000001));
      float edge=pow(1.-abs(dot(N,normalize(cameraPosition-vWorld))),2.);
      float p=.12;
      float detail=(.5+.5*sin(vUv.x*201.062+h*.8))*(1.-smoothstep(.3,1.,fwidth(vUv.x*32.)));
      float wave=.5+.5*sin(time*.22-h*3.14159);
      vec3 color=mix(vec3(.07,.37,.52),vec3(.60,.88,1.04),pow(h,5.)*.6+edge*.25);
      color=mix(color,vec3(1.14,.70,.28),p*.23*h);
      float alpha=(.015+pow(h,5.)*.065+edge*.027+detail*.009+wave*.014)*opacity;
      gl_FragColor=vec4(color,alpha);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
      }`,
  }));
  for(const edge of [0,1]){
    const positions=new Float32Array((sheetSegments+1)*(sheetRows+1)*3),uvs=[],indices=[];
    for(let i=0;i<=sheetSegments;i++)for(let j=0;j<=sheetRows;j++)uvs.push(i/sheetSegments,j/sheetRows);
    for(let i=0;i<sheetSegments;i++)for(let j=0;j<sheetRows;j++){
      const a=i*(sheetRows+1)+j,b=a+sheetRows+1;indices.push(a,b,a+1,b,b+1,a+1);
    }
    const geometry=own.geometry(new THREE.BufferGeometry());
    geometry.setAttribute('position',new THREE.BufferAttribute(positions,3).setUsage(THREE.DynamicDrawUsage));
    geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));geometry.setIndex(indices);
    const sheet=new THREE.Mesh(geometry,sheetMaterial);sheet.name='hologram / continuous source volume';sheet.userData.surfaceEdge=edge;sheet.renderOrder=20;sheet.frustumCulled=false;sheet.raycast=()=>{};group.add(sheet);
    projectionSheets.push({edge,geometry});
  }
  const sourceInverse=new THREE.Matrix4(),localPoint=new THREE.Vector3();
  const top=new THREE.Vector3(),inside=new THREE.Vector3(),p0=new THREE.Vector3(),p1=new THREE.Vector3(),p2=new THREE.Vector3();
  function updateProjectionVolume(){
    group.updateWorldMatrix(true,true);
    // The host collapses this group while a film owns the view. Inverting
    // that nearly singular transform sends the fixed tabletop source outside
    // Float32 range. Retain the last finite mesh until the projection returns.
    const determinant=group.matrixWorld.determinant();
    if(!Number.isFinite(determinant)||Math.abs(determinant)<1e-9)return;
    sourceInverse.copy(group.matrixWorld).invert();
    for(const {edge,geometry} of projectionSheets){
      const position=geometry.attributes.position;
      for(let i=0;i<=sheetSegments;i++){
        loopPoint(i/sheetSegments,edge,top).applyMatrix4(model.matrixWorld);
        loopPoint(i/sheetSegments,edge===0?.04:.96,inside).applyMatrix4(model.matrixWorld);
        inside.sub(top).normalize();
        p0.set(top.x*.82,1.923,top.z*.82);p0.x=THREE.MathUtils.clamp(p0.x,-1.58,1.58);p0.z=THREE.MathUtils.clamp(p0.z,-1.58,1.58);
        p1.copy(p0);p1.y+=(top.y-p0.y)*.42;
        p2.copy(top).addScaledVector(inside,-.24);p2.y=Math.min(p2.y,top.y-.035);
        for(let j=0;j<=sheetRows;j++){
          const t=j/sheetRows,q=1-t,a=q*q*q,b=3*q*q*t,c=3*q*t*t,d=t*t*t,index=i*(sheetRows+1)+j;
          localPoint.set(p0.x*a+p1.x*b+p2.x*c+top.x*d,p0.y*a+p1.y*b+p2.y*c+top.y*d,p0.z*a+p1.z*b+p2.z*c+top.z*d).applyMatrix4(sourceInverse);
          position.setXYZ(index,localPoint.x,localPoint.y,localPoint.z);
        }
      }
      position.needsUpdate=true;geometry.computeBoundingSphere();
    }
  }
  const poses=[new THREE.Quaternion().setFromEuler(new THREE.Euler(.14,-.12,-.18)),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(-.24,.43,.14)),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(.32,-.38,.36))];
  const pose=new THREE.Quaternion(),inputTurn=new THREE.Quaternion(),inputEuler=new THREE.Euler();
  const projectionPoints=Array.from({length:24},()=>new THREE.Vector3());
  let disposed=false,lastFlowTime=null,flowPhase=0;
  return {
    group,
    update({time=0,night=1,opacity=1,coherence=.28,selection=0}){
      const speed=.055+coherence*.025;
      flowPhase+=Math.max(0,lastFlowTime===null?time:time-lastFlowTime)*speed;lastFlowTime=time;
      uniforms.selection.value=Number.isFinite(selection)?Math.max(0,Math.min(1,selection)):0;
      uniforms.flowPhase.value=flowPhase;
      uniforms.time.value=time;uniforms.night.value=night;uniforms.opacity.value=opacity;uniforms.coherence.value=coherence;
      // A deliberate turn, a short settled observation, then the next angle.
      // Quintic interpolation has zero speed/acceleration at each settle.
      const phase=time%32;
      let from,to,progress;
      if(phase<10){from=0;to=1;progress=phase/10;}
      else if(phase<14){from=1;to=1;progress=0;}
      else if(phase<24){from=1;to=2;progress=(phase-14)/10;}
      else{from=2;to=0;progress=(phase-24)/8;}
      pose.slerpQuaternions(poses[from],poses[to],THREE.MathUtils.smootherstep(progress,0,1));
      inputEuler.set((coherence-.28)*.12,(coherence-.28)*.18,0);inputTurn.setFromEuler(inputEuler);
      model.quaternion.copy(pose).multiply(inputTurn);model.updateMatrix();updateProjectionVolume();

      nodesMaterial.opacity=.85*opacity;
      quietMaterials.forEach(item=>item.material.uniforms.opacity.value=item.opacity*opacity);
      for(let i=0;i<8;i++){const phase=i/8+flowPhase,lane=.14+(i%4)*.24;loopPoint(phase%1,Math.floor(phase)%2?1-lane:lane,dummy.position);dummy.updateMatrix();nodes.setMatrixAt(i,dummy.matrix);}nodes.instanceMatrix.needsUpdate=true;
    },
    getProjectionPoints(){
      group.updateWorldMatrix(true,true);
      projectionPoints.forEach((point,i)=>loopPoint(i/projectionPoints.length,i%2?.16:.84,point).applyMatrix4(model.matrixWorld));
      return projectionPoints;
    },
    dispose(){if(disposed)return;disposed=true;group.removeFromParent();own.dispose();},
  };
}
