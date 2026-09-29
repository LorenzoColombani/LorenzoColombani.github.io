import * as THREE from 'three';
import { RoundedBoxGeometry } from './vendor/RoundedBoxGeometry.js';
import { Reflector } from './vendor/addons/objects/Reflector.js';
import { createGarageRampRoute, createRampRibbon } from './garage-ramp.js?v=left-turn-2';
import { createNavigationDesk } from './navigation-desk.js?v=interaction-round-1';

// A room-scale adaptation of the saved boot-up reference. All interaction
// objects are supplied by the host and preserved by identity.
export function createStarkWorkshop({scene, camera, keep, ambient, keyLight, fillLight, onDeskFocus, onDeskReturn}) {
  const retained=new Set(keep), originals=scene.children.filter(object=>!retained.has(object)).map(object=>({object,visible:object.visible}));
  originals.forEach(({object})=>object.visible=false);
  const previous={background:scene.background,fog:scene.fog};
  scene.background=new THREE.Color(0x080e17);scene.fog=new THREE.FogExp2(0x080e17,.0075);
  const group=new THREE.Group();group.name='Workshop / inhabited invention lab';scene.add(group);
  const geometries=new Set(),materials=new Set(),textures=new Set(),boxCache=new Map();
  const ownG=g=>(geometries.add(g),g),ownM=m=>(materials.add(m),m);
  function grain(seed,stretch=1){
    const size=256,data=new Uint8Array(size*size*4);
    for(let y=0;y<size;y++)for(let x=0;x<size;x++){
      const n=Math.sin((x*12.9898+y*78.233+seed)*.73)*43758.5453;
      const noise=n-Math.floor(n),brushed=.5+.5*Math.sin(y*stretch*.74+Math.sin(x*.027)*.4);
      const value=Math.round(145+noise*38+brushed*14),i=(y*size+x)*4;
      data[i]=data[i+1]=data[i+2]=value;data[i+3]=255;
    }
    const texture=new THREE.DataTexture(data,size,size,THREE.RGBAFormat);
    texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.generateMipmaps=true;texture.minFilter=THREE.LinearMipmapLinearFilter;texture.magFilter=THREE.LinearFilter;texture.anisotropy=4;texture.needsUpdate=true;textures.add(texture);return texture;
  }
  const fineGrain=grain(21,3),stoneGrain=grain(82,.15);
  const material=(color,roughness=.6,metalness=.1,map=null,bump=.008)=>ownM(new THREE.MeshStandardMaterial({color,roughness,metalness,roughnessMap:map,bumpMap:map,bumpScale:map?bump:0}));
  const concrete=material(0x3b403f,.93,.02,stoneGrain,.028);
  const concreteDark=material(0x272e30,.88,.03,stoneGrain,.02);
  const garageWall=material(0x686b67,.87,.05,stoneGrain,.014);
  const steel=material(0x3f4b50,.45,.73,fineGrain,.006);
  const steelEdge=material(0x8a989a,.27,.83,fineGrain,.002);
  const graphite=material(0x131c23,.52,.52,fineGrain,.006);
  const rubber=material(0x070d12,.92,0);
  const cabinet=material(0x344046,.62,.24,fineGrain,.008);
  const warmMetal=material(0x736353,.39,.67,fineGrain,.004);
  const enamel=material(0xaaa99b,.40,.18,fineGrain,.004);
  const worktop=material(0x433b32,.48,.13,stoneGrain,.003);
  const warm=ownM(new THREE.MeshBasicMaterial({color:new THREE.Color(1.7,1.22,.70),toneMapped:false}));
  const neutral=ownM(new THREE.MeshBasicMaterial({color:new THREE.Color(.90,1.13,1.21),toneMapped:false}));
  const blue=ownM(new THREE.MeshBasicMaterial({color:new THREE.Color(.22,.71,1.08),toneMapped:false}));
  const lowBlue=ownM(new THREE.MeshBasicMaterial({color:0x3e7189,transparent:true,opacity:.48,depthWrite:false}));
  function add(geometry,mat,position,parent=group,name=''){
    const mesh=new THREE.Mesh(geometry,mat);mesh.position.set(...position);mesh.name=name;mesh.castShadow=true;mesh.receiveShadow=true;mesh.raycast=()=>{};parent.add(mesh);return mesh;
  }
  function box(w,h,d,mat,position,parent=group,name='',radius=.035){
    const r=Math.min(radius,w*.2,h*.2,d*.2),key=[w,h,d,r].join('/');
    if(!boxCache.has(key))boxCache.set(key,ownG(new RoundedBoxGeometry(w,h,d,3,r)));
    return add(boxCache.get(key),mat,position,parent,name);
  }
  function cylinder(r1,r2,h,mat,position,parent=group,segments=40){return add(ownG(new THREE.CylinderGeometry(r1,r2,h,segments)),mat,position,parent);}
  function tube(points,r,mat,parent=group){return add(ownG(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),48,r,6,false)),mat,[0,0,0],parent);}
  function lightBox(w,h,d,mat,position,parent=group){const object=box(w,h,d,mat,position,parent);object.castShadow=false;return object;}
  function part(name,position,parent=group){const object=new THREE.Group();object.name=name;object.position.set(...position);parent.add(object);return object;}

  // A low-resolution, softly filtered planar reflection supplies actual
  // contact with the room. Its capture is skipped for the normal/depth pass.
  const floorShader={
    name:'Workshop polished floor',
    uniforms:{color:{value:new THREE.Color(0x182027)},tDiffuse:{value:null},textureMatrix:{value:new THREE.Matrix4()},grain:{value:fineGrain}},
    vertexShader:`uniform mat4 textureMatrix;varying vec4 vProjected;varying vec3 vWorld;
      void main(){vProjected=textureMatrix*vec4(position,1.);vWorld=(modelMatrix*vec4(position,1.)).xyz;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader:`uniform vec3 color;uniform sampler2D tDiffuse,grain;varying vec4 vProjected;varying vec3 vWorld;
      void main(){vec2 uv=vProjected.xy/max(vProjected.w,.0001);
      float valid=step(0.,uv.x)*step(uv.x,1.)*step(0.,uv.y)*step(uv.y,1.);
      uv=clamp(uv,vec2(.003),vec2(.997));vec2 d=vec2(.0028,.0028);
      vec3 reflection=texture2D(tDiffuse,uv).rgb*.36;
      reflection+=texture2D(tDiffuse,uv+vec2(d.x,0.)).rgb*.16;
      reflection+=texture2D(tDiffuse,uv-vec2(d.x,0.)).rgb*.16;
      reflection+=texture2D(tDiffuse,uv+vec2(0.,d.y)).rgb*.16;
      reflection+=texture2D(tDiffuse,uv-vec2(0.,d.y)).rgb*.16;
      float viewCos=clamp(abs(cameraPosition.y-vWorld.y)/max(length(cameraPosition-vWorld),.001),0.,1.);
      float grazing=1.-viewCos;float reflectance=.11+grazing*grazing*grazing*.36;
      float textureGrain=texture2D(grain,vWorld.xz*.16).r;
      vec3 c=color*(.80+textureGrain*.25)+clamp(reflection,vec3(0.),vec3(8.))*reflectance*valid;
      gl_FragColor=vec4(c,1.);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
      }`,
  };
  const floor=new Reflector(ownG(new THREE.PlaneGeometry(58,76)),{textureWidth:512,textureHeight:512,clipBias:.003,multisample:0,color:0x182027,shader:floorShader});
  floor.name='lab / polished floor';floor.rotation.x=-Math.PI/2;floor.position.set(0,-.045,0);floor.raycast=()=>{};group.add(floor);
  floor.material.uniforms.grain.value=fineGrain;
  const captureReflection=floor.onBeforeRender;let reflectionFrame=0;
  floor.onBeforeRender=function(renderer,world,camera){if(world.overrideMaterial)return;if(innerWidth<600&&reflectionFrame++%2)return;captureReflection.call(this,renderer,world,camera);};
  const shadow=add(ownG(new THREE.PlaneGeometry(58,76)),ownM(new THREE.ShadowMaterial({color:0x02070b,opacity:.46,depthWrite:false})),[0,-.036,0]);shadow.rotation.x=-Math.PI/2;shadow.castShadow=false;
  for(const x of [-19,-11,11,19])box(.023,.006,73,rubber,[x,-.026,0]);
  for(const z of [-25,-15,-5,5,15,25])box(53,.006,.021,rubber,[0,-.025,z]);
  for(const side of [-1,1]){
    box(.15,.028,55,graphite,[side*5.75,-.011,-3]);
    for(let z=-15;z<=21;z+=1.7){
      box(.16,.020,.23,steel,[side*5.75,.004,z]);
      lightBox(.073,.014,.105,neutral,[side*5.75,.023,z]);
      if(z<4)lightBox(.054,.012,.080,neutral,[side*2.95,.020,z]);
    }
  }

  // The shell is a real interior around the existing orbit envelope. Camera
  // limits fit inside the side walls; the front wall stays beyond the landing.
  // Solid rear envelope; the vehicle exit is in the LEFT wall, facing -X.
  box(55,10.2,.6,concrete,[0,4.98,-38]);
  box(.6,10.2,63.0,concreteDark,[-27.2,4.98,7.1]);
  box(.6,10.2,4.0,concreteDark,[-27.2,4.98,-36.3]);
  box(.6,1.8,10.5,concreteDark,[-27.2,9.08,-29.0]);
  box(.6,10.2,77.0,concreteDark,[27.2,4.98,.1]);
  box(55,10.2,.6,concreteDark,[0,4.98,38.4]);
  for(const x of [-24,-18,0,6,12,18,24]){
    box(.085,9.6,.065,graphite,[x,4.7,-37.65]);
    box(5.85,.06,.10,steel,[x,7.7,-37.64]);
  }
  for(const side of [-1,1])for(const z of [-28,-18,-8,2,12,22,32]){
    box(.62,9.5,.38,steel,[side*26.72,4.67,z]);
    box(.10,8.9,.43,steelEdge,[side*26.34,4.55,z]);
    box(.32,.05,6.1,warmMetal,[side*26.73,2.0,z+3.4]);
  }
  // High raked panels and exposed services frame an open optical ceiling bay.
  for(const side of [-1,1]){
    const roof=box(16.6,.35,76.5,concreteDark,[side*18.5,9.25,-.75]);roof.rotation.z=side*.09;
    const haunch=box(4.7,.30,76.5,steel,[side*8.6,10.03,-.75]);haunch.rotation.z=side*.17;
    for(const x of [10.4,18.4,25.0])box(.13,.23,76.5,steelEdge,[side*x,9.55,-.75]);
    for(const z of [-29,-19,-9,1,11,21,31]){
      box(16.5,.30,.22,graphite,[side*18.0,8.98,z]);
      const housing=box(7.0,.16,.8,graphite,[side*15.1,8.83,z+1.0]);housing.rotation.z=side*.08;
      const luminous=lightBox(6.45,.025,.53,warm,[side*15.1,8.71,z+1.0]);luminous.rotation.z=side*.08;
    }
  }
  box(11,.34,31,concreteDark,[0,10.17,-22.7]);box(11,.34,30,concreteDark,[0,10.17,21.0]);
  for(const x of [-5.42,5.42])box(.28,.34,13,steel,[x,10.0,-.4]);
  for(const z of [-6.78,6.0])box(11,.34,.28,steel,[0,10.0,z]);
  for(const x of [-5.22,5.22])lightBox(.035,.022,12.4,lowBlue,[x,9.81,-.4]);
  const ceilingHatches=[-1,1].map(side=>{const hatch=box(5.13,.18,12.3,concreteDark,[side*2.61,10.02,-.4]);hatch.userData.side=side;return hatch;});
  for(const side of [-1,1])for(let row=0;row<3;row++){
    const duct=cylinder(.13,.13,76.5,graphite,[side*(22.5+row*.48),8.62,-.75]);duct.rotation.x=Math.PI/2;
  }

  // The reference's long garage axis stays open. Empty car-sized positions
  // flank it; future use cases belong here, not on the retained workbench.
  for(const side of [-1,1])for(const z of [-9,5]){
    const bay=part('lab / empty future exhibit bay',[side*13.6,0,z]);
    for(const x of [-4.0,4.0])box(.028,.006,7.5,steel,[x,-.018,0],bay);
    for(const zz of [-3.75,3.75])box(8.0,.006,.028,steel,[0,-.018,zz],bay);
  }
  // Primary user frame: a LOW, continuous curved metal retaining face.
  // The vehicle route bends beside it. Do not substitute a raised shutter.
  const warmWall=material(0x625044,.89,.03,stoneGrain,.010);
  const satin=material(0x96aba4,.34,.83,fineGrain,.002);
  // A bounded light-wash map holds the narrow luminous cores all the way
  // to the footlights; the real spots still light the metal and nearby floor.
  const washW=1024,washH=256,washPixels=new Uint8Array(washW*washH*4);
  for(let y=0;y<washH;y++)for(let x=0;x<washW;x++){
    const h=y/(washH-1),u=x/(washW-1);let energy=0;
    for(let lamp=0;lamp<8;lamp++){
      const center=(.045+lamp/7*.83)/.92,d=u-center;
      const width=.003+h*.027,core=.0025+h*.004;
      energy+=Math.exp(-d*d/(width*width))*(.56-h*.26)+Math.exp(-d*d/(core*core))*(.35-h*.10);
    }
    const value=Math.round(Math.min(1,energy)*255),index=(y*washW+x)*4;
    washPixels[index]=washPixels[index+1]=washPixels[index+2]=value;washPixels[index+3]=255;
  }
  const washTexture=new THREE.DataTexture(washPixels,washW,washH,THREE.RGBAFormat);washTexture.colorSpace=THREE.SRGBColorSpace;washTexture.minFilter=washTexture.magFilter=THREE.LinearFilter;washTexture.needsUpdate=true;textures.add(washTexture);
  satin.emissive.set(0xaad6c5);satin.emissiveMap=washTexture;satin.emissiveIntensity=.75;
  box(48,9.6,.16,warmWall,[0,4.83,-37.59]);
  const footGlow=ownM(new THREE.MeshBasicMaterial({color:new THREE.Color(3.5,3.0,1.45),toneMapped:false}));
  const rearRise=a=>1.1*(.46-a)/.92;
  const rearPoint=(a,y)=>new THREE.Vector3(1.0+Math.sin(a)*15,y+rearRise(a),-26+(1-Math.cos(a))*15+a*4);
  const rearStrip=(low,high,material,name,offset=0)=>{
    const positions=[],uv=[],indices=[];
    for(let i=0;i<=144;i++){
      const angle=-.46+i/144*.92,point=rearPoint(angle,0);
      for(const y of [low,high]){positions.push(point.x,y+rearRise(angle),point.z+offset);uv.push(i/144,y===low?0:1);}
      if(i<144){const k=i*2;indices.push(k,k+2,k+1,k+2,k+3,k+1);}
    }
    const g=ownG(new THREE.BufferGeometry());g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();return add(g,material,[0,0,0],group,name);
  };
  rearStrip(.06,.94,warmWall,'garage / curved ramp plinth');
  rearStrip(.94,4.92,satin,'garage / continuous brushed ramp wall');
  rearStrip(4.92,5.01,steel,'garage / curved ramp coping',.012);
  rearStrip(.89,.97,steel,'garage / recessed footlight channel',.012);
  for(let i=0;i<8;i++){
    const a=-.415+i/7*.83,at=rearPoint(a,0),forward=new THREE.Vector3(-Math.sin(a),0,Math.cos(a));
    const foot=at.clone().addScaledVector(forward,.10);foot.y=.95+rearRise(a);
    box(.22,.09,.18,graphite,foot.toArray());lightBox(.20,.035,.13,footGlow,[foot.x,1.0+rearRise(a),foot.z]);
    const light=new THREE.SpotLight(0xeef6e3,115,6.8,.32,.81,1.5);
    light.position.copy(at).addScaledVector(forward,.12);light.position.y=1.035+rearRise(a);
    light.target.position.copy(at);light.target.position.y=4.65+rearRise(a);group.add(light,light.target);
  }
  // The actual ramp bends behind the lit wall, then climbs LEFT across
  // the image. Its exit normal is -X; there is no camera-facing rear portal.
  const rampRoute=createGarageRampRoute(),roadGeometry=ownG(createRampRibbon(rampRoute));
  add(roadGeometry,material(0x42494a,.83,.03,stoneGrain,.018),[0,0,0],group,'garage / left-turning rising driveway');
  // The front concrete retaining wall is what the reference camera sees.
  // Its cap rises to the left and conceals the road behind it.
  const rampConcrete=material(0x6b6b5e,.85,.03,stoneGrain,.02);
  const rampWall=new THREE.Shape();rampWall.moveTo(-5.66,0);rampWall.lineTo(-27.35,0);rampWall.lineTo(-27.35,5.36);rampWall.lineTo(-5.66,2.04);rampWall.closePath();
  const retainingGeometry=ownG(new THREE.ExtrudeGeometry(rampWall,{depth:.46,bevelEnabled:true,bevelSize:.035,bevelThickness:.035,bevelSegments:2}));
  add(retainingGeometry,rampConcrete,[0,0,-26.55],group,'garage / left-rising concrete ramp wall');
  tube([[-5.66,2.07,-26.20],[-16.5,3.73,-26.20],[-27.35,5.40,-26.20]],.035,steel);
  // A distant parapet follows the outer edge of the turning driveway.
  const wallPositions=[],wallIndices=[],normal=new THREE.Vector3();
  for(let i=0;i<=96;i++){
    const t=i/96,p=rampRoute.getPoint(t),tangent=rampRoute.getTangent(t);normal.set(-tangent.z,0,tangent.x).normalize();
    const x=p.x-normal.x*3.55,z=p.z-normal.z*3.55;
    wallPositions.push(x,p.y,z,x,p.y+1.40,z);
    if(i<96){const k=i*2;wallIndices.push(k,k+1,k+2,k+1,k+3,k+2);}
  }
  const guardGeometry=ownG(new THREE.BufferGeometry());guardGeometry.setAttribute('position',new THREE.Float32BufferAttribute(wallPositions,3));guardGeometry.setIndex(wallIndices);guardGeometry.computeVertexNormals();
  const guardMaterial=ownM(rampConcrete.clone());guardMaterial.side=THREE.DoubleSide;
  add(guardGeometry,guardMaterial,[0,0,0],group,'garage / outer ramp parapet');
  for(let i=0;i<37;i++){
    const t=i/36,p=rampRoute.getPoint(t),tangent=rampRoute.getTangent(t);normal.set(-tangent.z,0,tangent.x).normalize();
    for(const side of [-1,1]){const edge=p.clone().addScaledVector(normal,side*3.10);edge.y+=.026;lightBox(.065,.014,.105,neutral,edge.toArray());}
  }
  // Only the side exit opens outdoors. It is intentionally out of the frontal
  // sightline, behind the ascending concrete wall, as the user specified.
  const outsideLight=new THREE.PointLight(0x9cbbc5,75,23,2);outsideLight.position.set(-33,8,-30.3);group.add(outsideLight);
  // Glazed service doors and a low side run sit to the left of the lit metal.
  const serviceGlass=ownM(new THREE.MeshStandardMaterial({color:0x163638,metalness:.38,roughness:.24}));
  for(const x of [-22.1,-19.35]){
    box(2.56,5.05,.16,steel,[x,2.60,-37.33]);box(2.29,4.77,.05,serviceGlass,[x,2.6,-37.22]);
    box(.052,.57,.075,steelEdge,[x+.94,2.24,-37.15]);
  }
  for(const side of [-1,1]){
    box(.20,1.35,22,graphite,[side*21.7,.78,-18.0]);
    box(.25,.09,22,steel,[side*21.60,1.51,-18.0]);
    lightBox(.035,.035,22,warm,[side*21.45,2.9,-18.0]);
  }
  // Inward-raked I-section columns are large silhouettes in the reference.
  for(const side of [-1,1])for(const z of [-24,-12,0,12,24]){
    const rib=part('garage / inward raked structural column',[side<0?-16.0:17.5,4.65,z]);rib.rotation.z=side*.33;
    box(.72,9.95,1.12,graphite,[0,0,0],rib);
    for(const face of [-1,1]){
      box(1.22,9.95,.075,graphite,[0,0,face*.59],rib);
      box(.039,9.72,.038,steel,[side*.55,0,face*.65],rib);
    }
    for(const y of [-3.8,3.8])box(.96,.08,1.02,steel,[0,y,0],rib);
  }
  // Exposed strip-light banks remain asymmetrically concentrated on the left.
  for(const z of [-23,-12,-1,10]){
    box(8.6,.12,2.27,graphite,[-13.6,8.86,z]);
    for(const offset of [-.79,-.27,.27,.79])lightBox(8.10,.045,.12,neutral,[-13.6,8.76,z+offset]);
    for(const x of [-17.4,-9.8]){
      box(.045,.53,.045,steel,[x,9.19,z]);
      box(.085,.055,2.42,steel,[x,8.97,z]);
    }
  }

  function bench(x,z,width,turn=0){
    const b=part('lab / fabrication bench',[x,0,z]);b.rotation.y=turn;
    box(width,1.35,1.7,graphite,[0,.87,0],b);
    box(width+.22,.12,1.93,steelEdge,[0,1.64,0],b);
    box(width+.14,.075,1.86,worktop,[0,1.735,0],b);
    const units=Math.floor(width/1.65),pitch=(width-.24)/units;
    for(let i=0;i<units;i++){
      const at=-width/2+.12+pitch*(i+.5);
      for(let drawer=0;drawer<3;drawer++){
        box(pitch-.07,.34,.07,cabinet,[at,.46+drawer*.39,.879],b);
        box(.58,.04,.085,steelEdge,[at,.56+drawer*.39,.952],b);
      }
      box(pitch-.06,.12,.11,rubber,[at,.12,.63],b);
    }
    for(const side of [-1,1])box(.12,.26,1.65,steel,[side*(width*.5-.3),.13,0],b);
    box(width-.3,1.32,.075,graphite,[0,2.57,-.8],b);
    for(let rail=0;rail<4;rail++)box(width-.52,.024,.02,steel,[0,2.05+rail*.27,-.744],b);
    box(width+.20,.10,.77,steel,[0,3.42,-.54],b);
    lightBox(width-.15,.024,.11,warm,[0,3.346,-.25],b);
    return b;
  }
  const leftBench=bench(-19.8,-10.3,16.7,Math.PI/2),rightBench=bench(23.65,-6.5,13.3,-Math.PI/2),rearBench=bench(-23.65,-23.8,10.3,Math.PI/2);
  // Nested instrument casings, connectors, a coiled cable and hand tools.
  function instrument(parent,x){
    box(1.03,.54,.74,cabinet,[x,2.06,.04],parent);
    box(.91,.42,.03,rubber,[x,2.06,.429],parent);
    lightBox(.51,.26,.009,lowBlue,[x-.12,2.10,.45],parent);
    for(let i=0;i<3;i++){const knob=cylinder(.037,.037,.04,steelEdge,[x+.32,1.96+i*.1,.46],parent,20);knob.rotation.x=Math.PI/2;}
    for(let i=0;i<8;i++)box(.034,.25,.006,graphite,[x-.38+i*.048,2.06,-.338],parent);
    tube([[x+.28,1.86,.5],[x+.7,1.80,.72],[x+1.08,1.80,.72],[x+1.18,1.83,.37]],.018,rubber,parent);
  }
  instrument(leftBench,-3.3);instrument(leftBench,2.65);instrument(rightBench,2.6);instrument(rearBench,-2.6);instrument(rearBench,2.8);
  for(let caseIndex=0;caseIndex<4;caseIndex++){const x=-3.6+caseIndex*2.4;box(1.65,.70,.62,cabinet,[x,2.10,.12],rearBench);box(1.40,.065,.045,steelEdge,[x,2.13,.46],rearBench);}
  for(let i=0;i<6;i++){
    const tool=box(.052,.40+i%2*.08,.045,i%2?steelEdge:warmMetal,[-1.6+i*.34,2.30,-.67],leftBench);
    tool.rotation.z=(i%2?1:-1)*.08;
    box(.10,.15,.065,graphite,[-1.6+i*.34,2.12,-.65],leftBench);
  }
  const holder=part('lab / precision spindle',[-.25,1.79,.12],rightBench);
  box(1.4,.09,.95,steel,[0,.045,0],holder);
  cylinder(.30,.33,.12,graphite,[0,.14,0],holder);
  cylinder(.19,.21,.93,steelEdge,[0,.67,0],holder);
  for(let i=0;i<7;i++)cylinder(.29,.29,.033,i%2?graphite:warmMetal,[0,.26+i*.105,0],holder);
  cylinder(.11,.11,.12,neutral,[0,1.2,0],holder).castShadow=false;
  for(let i=0;i<3;i++){
    const tray=part('lab / parts tray',[-3.55+i*.82,1.8,.25],rightBench);
    box(.68,.06,.60,rubber,[0,0,0],tray);
    for(let j=0;j<3;j++)box(.13,.075,.21,steel,[j*.18-.18,.045,0],tray);
  }
  // The brighter frame's left side is an occupied mechanical work bay.
  // Keep machinery outside the empty car footprints rather than adding exhibits.
  const machine=part('garage / left mechanical station',[-20.2,0,-16.0]);machine.rotation.y=.16;
  box(2.70,.24,2.35,steel,[0,.15,0],machine);
  box(2.48,.78,2.15,graphite,[0,.65,0],machine);
  for(const side of [-1,1]){
    box(.23,4.70,.34,steel,[side*.78,3.05,-.63],machine);
    cylinder(.045,.045,4.2,steelEdge,[side*.60,3.02,-.42],machine,24);
    box(.29,1.15,.53,cabinet,[side*.78,2.94,-.38],machine);
    box(.10,.83,.04,warmMetal,[side*.78,3.0,-.09],machine);
    cylinder(.19,.19,.20,rubber,[side*1.09,.22,.80],machine,24).rotation.z=Math.PI/2;
  }
  box(2.20,.35,.85,steel,[0,5.37,-.52],machine);
  box(1.43,.28,1.23,enamel,[0,3.55,-.13],machine);
  const spindle=cylinder(.26,.36,1.22,steel,[0,2.80,.16],machine,40);
  cylinder(.11,.16,.66,steelEdge,[0,1.87,.16],machine,32);
  box(2.18,.15,1.92,steelEdge,[0,1.21,.12],machine);
  for(let slot=0;slot<6;slot++)box(1.93,.014,.037,graphite,[0,1.292,-.50+slot*.23],machine);
  tube([[-.92,5.45,-.48],[-1.18,4.0,-.36],[-.96,2.2,.11],[-1.12,1.0,.24]],.028,rubber,machine);
  const overhead=part('garage / overhead tool boom',[-20.1,4.7,-7.2]);overhead.rotation.z=-.42;
  box(.21,2.85,.30,warmMetal,[0,1.43,0],overhead);
  cylinder(.19,.19,.40,graphite,[0,2.9,0],overhead,32).rotation.x=Math.PI/2;
  box(2.15,.22,.30,steel,[1.02,2.9,0],overhead);
  tube([[0,0,.18],[.24,2.5,.18],[1.89,2.8,.18],[2.05,1.15,.18]],.025,rubber,overhead);
  box(.28,.48,.31,enamel,[2.06,.99,.18],overhead);
  const cart=part('garage / rolling tool trolley',[-18.4,0,-3.8]);cart.rotation.y=-.12;
  box(2.08,1.26,1.05,cabinet,[0,.86,0],cart);
  box(2.24,.08,1.17,steelEdge,[0,1.54,0],cart);
  for(let drawer=0;drawer<4;drawer++){
    box(1.91,.20,.045,graphite,[0,.50+drawer*.25,.55],cart);
    box(1.59,.026,.068,steelEdge,[0,.58+drawer*.25,.59],cart);
  }
  for(const x of [-.81,.81])for(const z of [-.38,.38]){
    const wheel=cylinder(.16,.16,.13,rubber,[x,.19,z],cart,24);wheel.rotation.z=Math.PI/2;
    box(.23,.14,.15,steel,[x,.35,z],cart);
  }
  // Small everyday objects establish a used work surface around the tools.
  const mug=part('lab / workbench mug',[.65,1.80,.47],leftBench);
  cylinder(.115,.10,.25,enamel,[0,.125,0],mug,40);
  cylinder(.098,.098,.006,rubber,[0,.253,0],mug,40);
  const handle=add(ownG(new THREE.TorusGeometry(.085,.018,8,36)),enamel,[.12,.14,0],mug);handle.rotation.y=Math.PI/2;
  for(let sheet=0;sheet<5;sheet++){const note=box(.69,.007,.92,enamel,[1.58+sheet*.022,1.79+sheet*.009,.12],leftBench,.002);note.rotation.y=-.16+sheet*.033;}
  // The unmistakable source in the rear-view shot: a bank of bright,
  // raked clerestory windows on the right-hand garage wall. Bring the
  // splayed wall into the arrival sightline, rather than hiding it at ±27.
  const windowWall=part('garage / right clerestory wall',[17.5,0,-10.3]);windowWall.rotation.y=-Math.PI/2;
  const windowSlope=part('garage / raked glazing plane',[0,0,0],windowWall);windowSlope.rotation.x=.28;
  box(18.8,4.30,.46,concreteDark,[0,2.13,-.18],windowSlope);
  box(19.4,3.50,.46,warmWall,[0,8.87,-.18],windowSlope);
  for(const x of [-7.8,-3.9,0,3.9,7.8]){
    box(.033,3.30,.045,graphite,[x,8.87,.071],windowSlope);
    const downlight=lightBox(.21,.065,.20,warm,[x,10.30,.15],windowSlope);
    const light=new THREE.PointLight(0xffdfa6,24,6.5,2);light.position.set(x,10.1,.8);windowSlope.add(light);
  }
  box(19,.23,.84,graphite,[0,4.48,.10],windowSlope);
  const glassCanvas=document.createElement('canvas');glassCanvas.width=32;glassCanvas.height=256;
  const glassInk=glassCanvas.getContext('2d'),glassGradient=glassInk.createLinearGradient(0,0,0,256);
  glassGradient.addColorStop(0,'#b5c5cc');glassGradient.addColorStop(.32,'#e3e9e2');glassGradient.addColorStop(1,'#fff6dd');
  glassInk.fillStyle=glassGradient;glassInk.fillRect(0,0,32,256);
  const glassView=new THREE.CanvasTexture(glassCanvas);glassView.colorSpace=THREE.SRGBColorSpace;textures.add(glassView);
  const windowGlow=ownM(new THREE.MeshBasicMaterial({map:glassView,color:new THREE.Color(2.1,1.89,1.47),toneMapped:false}));
  const clearGlass=ownM(new THREE.MeshPhysicalMaterial({color:0xd4e1dd,roughness:.11,metalness:.15,clearcoat:1,clearcoatRoughness:.1,transparent:true,opacity:.16,depthWrite:false}));
  const windowFrame=part('garage / raked window bank',[0,6.05,0],windowSlope);windowFrame.rotation.x=.05;
  box(19.4,2.06,.22,graphite,[0,0,0],windowFrame);
  for(let pane=0;pane<6;pane++){
    const x=(pane-2.5)*3.16;
    box(3.02,1.90,.04,steelEdge,[x,0,.13],windowFrame);
    lightBox(2.88,1.74,.018,windowGlow,[x,0,.161],windowFrame);
    const glazing=add(ownG(new THREE.PlaneGeometry(2.88,1.74)),clearGlass,[x,0,.18],windowFrame);glazing.castShadow=false;
    box(.036,1.75,.030,warmMetal,[x+.63,0,.177],windowFrame);
    box(3.05,.055,.15,steel,[x,-1.02,.17],windowFrame);
  }
  box(19.7,.21,.93,steel,[0,1.13,.18],windowFrame);
  for(const x of [-9.05,-3.85,3.85,9.05]){
    const pier=box(.38,8.2,.56,graphite,[x,4.05,.28],windowSlope);pier.rotation.z=.085;
  }
  const windowLight=new THREE.PointLight(0xffdfb6,180,35,2);windowLight.position.set(9.2,6.3,-6.6);group.add(windowLight);
  // Low service storage stays peripheral, leaving the car / future display
  // positions empty and the wide garage axis readable.
  for(const side of [-1,1]){
    const rack=part('lab / service rack',[side*23.5,0,-16.7]);rack.rotation.y=side*-.25;
    box(3.8,5.6,1.1,graphite,[0,2.85,0],rack);
    for(let shelf=0;shelf<5;shelf++){
      box(3.55,.13,1.15,steel,[0,.5+shelf*1.05,.0],rack);
      for(let partIndex=0;partIndex<3;partIndex++){
        box(.95,.76,.86,cabinet,[-1.14+partIndex*1.14,.91+shelf*1.05,.10],rack);
        box(.42,.06,.05,steelEdge,[-1.14+partIndex*1.14,.98+shelf*1.05,.56],rack);
      }
    }
  }
  const navigation=createNavigationDesk({parent:group,materials:{steel,steelEdge,graphite,rubber,fineGrain},camera,onFocus:onDeskFocus,onReturn:onDeskReturn});
  const lights=[];
  for(const [x,y,z,color,intensity,distance] of [[-12,5.3,-6,0xffcea0,60,20],[13,5.0,-8,0xffd4ab,65,21],[0,7.7,-14,0x89b5d4,75,23]]){
    const light=new THREE.PointLight(color,intensity,distance,2);light.position.set(x,y,z);group.add(light);lights.push(light);
  }
  const fogColor=new THREE.Color(0x080e17),skyColor=new THREE.Color(0xcbd6d2),floorColor=new THREE.Color(0x12181d);
  const warmBase=warm.color.clone(),neutralBase=neutral.color.clone();
  let disposed=false,wake=.82;
  return {
    group,navigation,
    update({skyProgress=0,entered=false,unlocking=false,reduced=false,dt=.016,time=0,obscured=false,companion=false}={}){
      navigation.update({dt,time,entered,unlocking,reduced,obscured,companion});
      const target=entered||unlocking?1:.82;wake=reduced?target:THREE.MathUtils.damp(wake,target,3,dt);
      warm.color.copy(warmBase).multiplyScalar(.42+wake*.58);neutral.color.copy(neutralBase).multiplyScalar(.55+wake*.45);
      lights.forEach((light,i)=>light.intensity=[60,65,75][i]*(.45+wake*.55));
      scene.fog.color.copy(fogColor);scene.fog.density=.0075;scene.environmentIntensity=.30;
      ambient.color.copy(skyColor);ambient.groundColor.copy(floorColor);ambient.intensity=.83+wake*.27;
      keyLight.color.set(0xd6e6ee);keyLight.position.set(-7,12,9);keyLight.intensity=1.70+wake*.60;
      fillLight.color.set(0xffdeb3);fillLight.position.set(16,8,-9);fillLight.intensity=1.1;
      const aperture=THREE.MathUtils.smoothstep(skyProgress,0,.25);ceilingHatches.forEach(hatch=>hatch.position.x=hatch.userData.side*(2.61+aperture*5.7));
    },
    dispose(){
      if(disposed)return;disposed=true;navigation.dispose();floor.dispose();group.removeFromParent();
      originals.forEach(({object,visible})=>object.visible=visible);scene.background=previous.background;scene.fog=previous.fog;
      geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());
    },
  };
}
