import * as THREE from 'three';
import { GLTFLoader } from './vendor/addons/loaders/GLTFLoader.js';
import { createStarkWorkshop } from './stark-workshop.js?v=website-prototype-15';
import { usePhysicalOcclusion } from './physical-occlusion.js?v=optical-17';
import { createProjector } from './projector.js?v=studio-1';
import { createHolographicTable, createHolographicVolume } from './holographic-table.js?v=product-elements-3';
import { createBridgeExperience } from './bridge-experience.js?v=website-prototype-15';
import { PRODUCTS } from './product-catalog.js?v=website-prototype-15';
import { createWebsiteExperience } from './website-experience.js?v=website-surface-17';
import { createServicesExperience } from './services-experience.js?v=website-prototype-15';
import { createProductElements } from './product-elements.js?v=website-prototype-15';
import { createDroidWork } from './droid-work.js?v=studio-1';
import { createCoastalWorld } from './coastal-world.js?v=coast-1';
import { createPavilionFinish } from './pavilion-finish.js?v=console-2';
import { createIllustratedMaterials } from './illustrated-materials.js?v=physical-console-2';
import { createWorldInterface } from './world-interface.js?v=website-prototype-15';
import { RoundedBoxGeometry } from './vendor/RoundedBoxGeometry.js';
import { RoomEnvironment } from './vendor/RoomEnvironment.js';
import { EffectComposer } from './vendor/addons/postprocessing/EffectComposer.js';
import { RenderPass } from './vendor/addons/postprocessing/RenderPass.js';
import { SSAOPass } from './vendor/addons/postprocessing/SSAOPass.js';
import { UnrealBloomPass } from './vendor/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from './vendor/addons/postprocessing/ShaderPass.js';
import { FXAAShader } from './vendor/addons/shaders/FXAAShader.js';
import { OutputPass } from './vendor/addons/postprocessing/OutputPass.js';
import { createWorkshopAudio } from './audio.js?v=website-prototype-15';

const $ = s => document.querySelector(s);
const canvas = $('#world');
const reducedQuery = matchMedia('(prefers-reduced-motion: reduce)');
let motionPaused = reducedQuery.matches;
let inspectingRobot=false;let skyPath=null,skyFromLook=null,previousSky=0;
let entryUnlocking=false, entryTimer=null, entryArrivedAt=-100, entryStartedAt=-10000, companionHistoryEntry=false;
const entryFrom=new THREE.Vector3();
const night = 1;
let entered = false, activeProject = 'field';
let websiteExperience=null,servicesExperience=null,productElements=null, returnToProducts=false, productAttention=0, hologramClock=0;
let time = 0, lastFrame = performance.now(), fieldValue = .28, fieldTarget = .28, releaseAt = -100;
let projectionTarget = 0, projection = 0, deployTimer, audioBusy = false, soundChoice = null;
let pointer = new THREE.Vector2(), dragging = false, dragStart = null, holdingField=false, downAt=0, fieldAtDown=.28, heldArtifact=null;
let gestureOwner=null, primaryPointerId=null, pinchStartDistance=0, pinchStartRadius=0, lastGestureAt=0;
let orbitAzimuth=.025, orbitElevation=.238, orbitRadius=13.8, orbitRadiusTarget=13.8, yawVelocity=0, pitchVelocity=0;
const activePointers=new Map();
let narrowLayout=innerWidth<600;
const audio = createWorkshopAudio();
try { const savedScore = localStorage.getItem('workshop2-soundtrack'); if (['rock','calm'].includes(savedScore)) audio.setScoreMode(savedScore); } catch { /* Private browsing may disable storage. */ }
let soundRequest=0;
function renderSoundChoice(){const control=$('#sound-toggle');control.value=audio.enabled?audio.scoreMode:'off';control.setAttribute('aria-busy',String(audioBusy));}
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(43, innerWidth / innerHeight, .1, 650);
const cameraHome = new THREE.Vector3(.6,7.8,27.0);
const cameraNarrowHome = new THREE.Vector3(0,8.2,34.6);
const cameraBench = new THREE.Vector3(0,5.80,19.3);
const tableFocus = new THREE.Vector3(0,2.55,5.9);
const robotFocus = new THREE.Vector3(-12.9,2.65,-7.5);
const smoothLook = new THREE.Vector3(0,2.95,5.0);
camera.position.copy(innerWidth<600?cameraNarrowHome:cameraHome);camera.lookAt(smoothLook);
let renderer;
try {
 renderer = new THREE.WebGLRenderer({canvas, antialias:true, alpha:false, powerPreference:'high-performance'});
 renderer.setPixelRatio(Math.min(devicePixelRatio, 1.65));
 renderer.setSize(innerWidth,innerHeight);
 renderer.outputColorSpace = THREE.SRGBColorSpace;
 renderer.toneMapping = THREE.ACESFilmicToneMapping;
 renderer.toneMappingExposure = 1.18;
 renderer.shadowMap.enabled = true;renderer.localClippingEnabled=true;
 renderer.shadowMap.type = THREE.PCFSoftShadowMap;
} catch (error) {
 $('#loader').classList.add('done'); $('#fallback').hidden=false;
 throw error;
}
scene.fog = new THREE.FogExp2(0x92b6bf,.006);
const pmrem = new THREE.PMREMGenerator(renderer);
const room = new RoomEnvironment();
const env = pmrem.fromScene(room,.035);
scene.environment = env.texture;
scene.environmentIntensity = .42;
room.dispose(); pmrem.dispose();
const ambient = new THREE.HemisphereLight(0xd4f4ff,0x8d8274,1.7); scene.add(ambient);
const sunLight = new THREE.DirectionalLight(0xffe1ac,4.5);
sunLight.position.set(-24,34,-19);sunLight.castShadow=true;
sunLight.shadow.mapSize.set(2048,2048);
Object.assign(sunLight.shadow.camera,{left:-30,right:30,top:26,bottom:-23,near:.5,far:100});
sunLight.shadow.bias=-.0005;sunLight.shadow.normalBias=.055;
scene.add(sunLight);
const fillLight=new THREE.DirectionalLight(0xc4e8ff,.8);fillLight.position.set(15,8,20);scene.add(fillLight);
const tableLight=new THREE.PointLight(0x55ffd5,25,13,2);tableLight.position.set(0,4,0);scene.add(tableLight);
const palette=createIllustratedMaterials();
const white=palette.ivory,ceramic=palette.ceramic,graphite=palette.graphite,dark=palette.dark,bronze=palette.bronze,leather=palette.leather;
const lightMaterial=new THREE.MeshBasicMaterial({color:0xc8fff1,toneMapped:false});
const warmLightMaterial=new THREE.MeshBasicMaterial({color:0xffda9b,toneMapped:false});
const meshes=[];
function mesh(geometry, material, parent=scene, pos=[0,0,0]){const m=new THREE.Mesh(geometry,material);m.position.set(...pos);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
function box(w,h,d,material,pos,parent=scene){const radius=Math.min(w,h,d)*.14;const geometry=Math.min(w,h,d)>.18?new RoundedBoxGeometry(w,h,d,2,Math.min(radius,.10)):new THREE.BoxGeometry(w,h,d);return mesh(geometry,material,parent,pos)}
function cyl(r1,r2,h,material,pos,parent=scene,segments=64){return mesh(new THREE.CylinderGeometry(r1,r2,h,segments),material,parent,pos)}
function sphere(r,material,pos,parent=scene){return mesh(new THREE.SphereGeometry(r,32,24),material,parent,pos)}
function tube(points,r,material,parent=scene,segments=64){const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));return mesh(new THREE.TubeGeometry(curve,segments,r,8,false),material,parent)}
function arc(radius,y,start,end,r,material,z=0){const pts=[];for(let i=0;i<=70;i++){const a=start+(end-start)*i/70;pts.push([Math.cos(a)*radius,y,z-Math.sin(a)*radius]);}return tube(pts,r,material,scene,140)}
function ring(radius,thickness,material,pos,parent=scene){const m=mesh(new THREE.TorusGeometry(radius,thickness,10,100),material,parent,pos);m.rotation.x=Math.PI/2;return m;}
function label(text,{color='#a9e9e5',bg=null,width=1024,height=256,size=50}={}){const c=document.createElement('canvas');c.width=width;c.height=height;const ctx=c.getContext('2d');if(bg){ctx.fillStyle=bg;ctx.fillRect(0,0,width,height)}ctx.fillStyle=color;ctx.font=`${size}px monospace`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,width/2,height/2);const texture=new THREE.CanvasTexture(c);texture.colorSpace=THREE.SRGBColorSpace;return texture;}
// A continuous sky, with a luminous horizon and a small celestial body.
const sky=mesh(new THREE.SphereGeometry(430,40,24),new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,uniforms:{uNight:{value:0}},vertexShader:`varying vec3 vPosition;void main(){vPosition=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,fragmentShader:`varying vec3 vPosition;uniform float uNight;void main(){vec3 d=normalize(vPosition);float h=clamp(d.y*.9+.13,0.,1.);vec3 low=mix(vec3(.83,.89,.82),vec3(.12,.29,.4),uNight);vec3 high=mix(vec3(.23,.56,.67),vec3(.014,.065,.18),uNight);vec3 color=mix(low,high,pow(h,.6));float sun=pow(max(dot(d,normalize(vec3(-.45,.18,-.85))),0.),160.);color+=vec3(.65,.33,.05)*sun*(1.-uNight*.65);gl_FragColor=vec4(pow(color,vec3(2.2)),1.);}`}),scene,[0,0,0]);sky.castShadow=false;sky.receiveShadow=false;
const planet=mesh(new THREE.SphereGeometry(10,40,32),new THREE.MeshBasicMaterial({color:0xeee5c8,fog:false}),scene,[-108,42,-230]);planet.castShadow=false;
const planetHalo=mesh(new THREE.RingGeometry(11,11.08,100),new THREE.MeshBasicMaterial({color:0xf6dca3,transparent:true,opacity:.45,side:THREE.DoubleSide,fog:false}),scene,[-108,42,-230]);planetHalo.lookAt(camera.position);
// Stylized ocean: long graphic waves, finely etched surface and sunlight.
const seaMat=new THREE.ShaderMaterial({uniforms:{uTime:{value:0},uNight:{value:0}},vertexShader:`varying vec3 vWorld;uniform float uTime;void main(){vec3 p=position;float a=sin(p.x*.055+uTime*.28)*sin(p.y*.06+uTime*.14);p.z+=a*.35;vec4 w=modelMatrix*vec4(p,1.);vWorld=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}`,fragmentShader:`varying vec3 vWorld;uniform float uTime;uniform float uNight;void main(){vec2 p=vWorld.xz;float wave=sin(p.y*1.15+sin(p.x*.11+uTime*.35)*2.+uTime*.3);float fine=sin(p.y*7.+p.x*.22+uTime*.5);float line=smoothstep(.91,1.,wave)*.05+smoothstep(.95,1.,fine)*.009;vec3 deep=mix(vec3(.055,.3,.38),vec3(.018,.105,.18),uNight);vec3 shallow=mix(vec3(.28,.59,.6),vec3(.055,.24,.32),uNight);float depth=smoothstep(-200.,25.,p.y);vec3 c=mix(shallow,deep,depth*.75);c+=line*vec3(.51,.62,.52);float gleam=exp(-pow((p.x+40.+p.y*.18)/18.,2.))*smoothstep(.65,1.,wave)*.22*(1.-uNight);c+=vec3(.9,.71,.4)*gleam;float haze=smoothstep(50.,300.,distance(cameraPosition.xz,p));c=mix(c,mix(vec3(.51,.69,.71),vec3(.08,.2,.29),uNight),haze);gl_FragColor=vec4(pow(c,vec3(2.2)),1.);}`});
const sea=mesh(new THREE.PlaneGeometry(1000,1000,100,100),seaMat,scene,[0,-4,0]);sea.rotation.x=-Math.PI/2;sea.receiveShadow=false;sea.castShadow=false;
const terrainMaterials=[];
// Layered distant terrain: smooth silhouettes carry atmospheric depth.
for(let layer=0;layer<3;layer++){
 const geometry=new THREE.PlaneGeometry(540,55,140,8);const pos=geometry.attributes.position;
 for(let i=0;i<pos.count;i++){let x=pos.getX(i),y=pos.getY(i);let ridge=5+Math.pow(Math.sin(x*.016+layer*3.1)*.5+.5,3)*27+Math.pow(Math.sin(x*.037+layer*1.5)*.5+.5,4)*13;let vertical=(y+27.5)/55;pos.setZ(i,0);pos.setY(i,-7+ridge*vertical);}
 geometry.computeVertexNormals();
 const material=new THREE.MeshBasicMaterial({color:[0x83a9ad,0x71979f,0x608894][layer],fog:true,side:THREE.DoubleSide});
 terrainMaterials.push({material,day:material.color.clone()});
 const terrain=mesh(geometry,material,scene,[layer*60-40,-1,-220+layer*35]);terrain.castShadow=false;
}
const coastalWorld=createCoastalWorld({scene,sea,terrainMaterials});
// Subtle striated stone gives the broad floor an authored material scale.
const stoneCanvas=document.createElement('canvas');stoneCanvas.width=1024;stoneCanvas.height=1024;const sc=stoneCanvas.getContext('2d');sc.fillStyle='#cbcbb9';sc.fillRect(0,0,1024,1024);for(let i=0;i<180;i++){const y=i*6.1;sc.beginPath();sc.moveTo(0,y);sc.bezierCurveTo(220,y+Math.sin(i)*25,700,y-25,1024,y+Math.cos(i*2)*13);sc.strokeStyle=i%4?'rgba(151,153,140,.055)':'rgba(235,231,211,.13)';sc.lineWidth=i%3+1;sc.stroke();}const stoneTexture=new THREE.CanvasTexture(stoneCanvas);stoneTexture.colorSpace=THREE.SRGBColorSpace;stoneTexture.wrapS=stoneTexture.wrapT=THREE.RepeatWrapping;stoneTexture.repeat.set(5,5);
// The suspended terrace, floor inlays, and its own visible structural profile.
cyl(17.8,16.9,.7,white,[0,-.45,0]);cyl(16.9,14.6,1.1,graphite,[0,-1.32,0]);cyl(14.6,11.7,1.5,ceramic,[0,-2.5,0]);
cyl(17.5,17.5,.07,palette.floor,[0,-.065,0]);
ring(16.9,.035,bronze,[0,.005,0]);ring(12.2,.016,bronze,[0,.005,0]);
for(let i=0;i<20;i++){const a=i*Math.PI*2/20;const line=box(.018,.007,4.4,bronze,[Math.cos(a)*14.6,.0,Math.sin(a)*14.6]);line.rotation.y=-a+Math.PI/2;}
const columns=[],wings=[];
// Grand swept canopy and slender articulated columns; the room opens to the sea.
for(const a of [.04,.32,.68,.96]){
 const angle=a*Math.PI,x=Math.cos(angle)*14.2,z=-Math.sin(angle)*14.2;
 const group=new THREE.Group();group.position.set(x,0,z);group.rotation.y=-angle;scene.add(group);columns.push(group);
 const pylon=cyl(.43,.7,9.9,white,[0,4.95,0],group,6);pylon.rotation.y=Math.PI/6;
 box(.09,9.1,.11,bronze,[.45,4.7,.15],group);
 box(.06,8.1,.07,lightMaterial,[.47,4.6,.23],group);
 for(let j=0;j<3;j++){const fin=box(.1,3.6,.65,ceramic,[.57+j*.17,7.65,.07],group);fin.rotation.z=-.12-j*.04;}
 cyl(.83,.94,.28,graphite,[0,.14,0],group,6);
}
arc(14.2,10.0,0,Math.PI,.45,white);
arc(14.2,9.59,.01,Math.PI-.01,.055,bronze);
arc(12.3,10.0,0,Math.PI,.18,white);
arc(12.3,9.86,0,Math.PI,.03,lightMaterial);
arc(16.1,10.0,0,Math.PI,.24,white);
for(let i=0;i<=22;i++){const a=i/22*Math.PI;const beam=box(.08,.10,3.9,bronze,[Math.cos(a)*14.2,10.15,-Math.sin(a)*14.2]);beam.rotation.y=-a+Math.PI/2;}
// A solid crescent crowns the pavilion; warm recessed panels articulate its underside.
const canopyShape=new THREE.Shape();canopyShape.absarc(0,0,16.25,.03,Math.PI-.03,false);canopyShape.absarc(0,0,12.15,Math.PI-.03,.03,true);canopyShape.closePath();
const canopyGeo=new THREE.ExtrudeGeometry(canopyShape,{depth:.36,bevelEnabled:true,bevelThickness:.09,bevelSize:.12,bevelSegments:3,curveSegments:90});
const canopy=mesh(canopyGeo,white,scene,[0,9.93,0]);canopy.rotation.x=-Math.PI/2;
// Cantilevered ceiling wings frame the picture without enclosing it.
for(const side of [-1,1]){
 const wing=box(5.3,.38,8.8,white,[side*13,10.05,2.8]);wing.rotation.y=side*-.16;wings.push(wing);
 const underside=box(4.8,.035,8.4,graphite,[side*13,9.835,2.8]);underside.rotation.y=side*-.16;
 for(let i=0;i<4;i++){let b=box(.035,.02,7.2,warmLightMaterial,[side*(11.4+i*.8),9.79,2.8]);b.rotation.y=side*-.16;}
}
// Suspended central oculus: a restrained architectural impossibility.
ring(5.1,.2,white,[0,9.8,0]);ring(5.1,.035,bronze,[0,9.57,0]);ring(4.87,.022,lightMaterial,[0,9.58,0]);
for(let i=0;i<6;i++){const a=i*Math.PI/3;const connector=box(.042,.042,7.1,bronze,[Math.cos(a)*8.8,9.9,Math.sin(a)*8.8]);connector.rotation.y=-a+Math.PI/2;}
// Back terrace railing: glass that catches a single deliberate highlight.
const glass=new THREE.MeshStandardMaterial({color:0xa8e0df,transparent:true,opacity:.16,roughness:.15,metalness:.2,side:THREE.DoubleSide,depthWrite:false});
for(let i=0;i<18;i++){const a=(i+.5)/18*Math.PI;const g=box(2.71,1.15,.035,glass,[Math.cos(a)*16.4,.78,-Math.sin(a)*16.4]);g.rotation.y=a;g.castShadow=false;}
arc(16.4,1.37,0,Math.PI,.033,bronze);
// The instrument table, concentric milled surfaces and small mechanical details.
const table=new THREE.Group();scene.add(table);
cyl(2.55,2.05,.34,graphite,[0,.17,0],table);cyl(1.9,2.1,.65,white,[0,.68,0],table);
cyl(1.8,1.25,.65,ceramic,[0,1.22,0],table);cyl(3.45,3.15,.24,white,[0,1.65,0],table);
cyl(3.16,3.16,.055,graphite,[0,1.80,0],table);ring(3.25,.035,bronze,[0,1.8,0],table);ring(2.95,.018,lightMaterial,[0,1.84,0],table);
cyl(2.18,2.18,.025,new THREE.MeshStandardMaterial({color:0x235764,metalness:.6,roughness:.25}),[0,1.85,0],table);
for(let i=0;i<56;i++){const a=i/56*Math.PI*2;const tick=box(.024,.013,i%7===0?.22:.09,i%7===0?lightMaterial:bronze,[Math.cos(a)*2.7,1.84,Math.sin(a)*2.7],table);tick.rotation.y=-a+Math.PI/2;}
for(let i=0;i<3;i++){const a=i*Math.PI*2/3+.5;const stem=new THREE.Group();stem.position.set(Math.cos(a)*2.1,1.88,Math.sin(a)*2.1);stem.rotation.y=-a;table.add(stem);cyl(.18,.22,.1,bronze,[0,.05,0],stem,24);const crystal=mesh(new THREE.OctahedronGeometry(.2),lightMaterial,stem,[0,.28,0]);crystal.rotation.z=.25;meshes.push(crystal);}
const emitterRings=[];for(let i=0;i<3;i++){const material=new THREE.MeshBasicMaterial({color:i===1?0xffd59d:0x99ffe5,transparent:true,opacity:.24,depthWrite:false});const rim=ring(2.23+i*.18,.018,material,[0,1.895+i*.006,0],table);emitterRings.push(rim);}
const projector=createProjector(scene);
const tableLabel=mesh(new THREE.PlaneGeometry(1.35,.32),new THREE.MeshBasicMaterial({map:label('FIELD / 01'),transparent:true,depthWrite:false}),table,[0,1.87,2.1]);tableLabel.rotation.x=-Math.PI/2;
const projectArtifacts=[];
for(const [key,x,z,color] of [['tva',-2.5,1.35,0xe8b06c],['openbots',2.5,1.35,0x99ffdf],['bridge',0,2.20,0xff9250]]){
 const artifact=new THREE.Group();artifact.position.set(x,2.7,z);scene.add(artifact);
 const body=mesh(new THREE.OctahedronGeometry(.32,0),new THREE.MeshPhysicalMaterial({color,emissive:color,emissiveIntensity:.10,metalness:.25,roughness:.14,clearcoat:.8,clearcoatRoughness:.18,transparent:true,opacity:.84}),artifact);body.rotation.z=.22;body.userData.action=key;
 const hoop=ring(.46,.016,new THREE.MeshBasicMaterial({color,transparent:true,opacity:.72}),[0,0,0],artifact);hoop.rotation.x=.7;hoop.rotation.y=.35;
 projectArtifacts.push({key,group:artifact,body,x,z});
}
// A small companion with weighted joints and an expressive optical head.
const robot=new THREE.Group();robot.position.set(-12.2,0,-7.8);robot.rotation.y=.35;scene.add(robot);
cyl(.8,.99,.3,graphite,[0,.15,0],robot);cyl(.72,.8,.2,white,[0,.4,0],robot);ring(.73,.026,lightMaterial,[0,.51,0],robot);
const robotLower=new THREE.Group();robotLower.position.y=.55;robot.add(robotLower);
sphere(.28,bronze,[0,.12,0],robotLower);
const arm1=box(.43,1.2,.54,white,[.15,.76,0],robotLower);arm1.rotation.z=-.23;
const piston=box(.075,1.1,.095,bronze,[-.08,.7,.3],robotLower);piston.rotation.z=-.23;
const elbow=new THREE.Group();elbow.position.set(.28,1.35,0);robotLower.add(elbow);sphere(.32,graphite,[0,0,0],elbow);
const arm2=box(.4,1.0,.46,ceramic,[-.25,.46,0],elbow);arm2.rotation.z=.47;
const head=new THREE.Group();head.position.set(-.48,.98,0);elbow.add(head);
const shell=sphere(.58,white,[0,0,0],head);shell.scale.set(1.3,.7,.9);
const visor=box(.86,.26,.06,graphite,[0,.02,.46],head);visor.rotation.x=-.06;
for(const x of [-.23,.23]){const eye=box(.10,.065,.03,lightMaterial,[x,.035,.501],head);eye.castShadow=false;}
let animatedHead=head,animatedElbow=elbow,animatedLower=robotLower;
const droidWork=createDroidWork({scene,getHead:()=>animatedHead});
const aerial=tube([[.25,.3,0],[.3,.58,-.04],[.4,.7,-.04]],.024,bronze,head,16);sphere(.05,lightMaterial,[.4,.7,-.04],head);
// Studio furniture: a little warmth and lived-in detail.
const lounge=new THREE.Group();lounge.position.set(8.2,0,-4.2);lounge.rotation.y=-.57;scene.add(lounge);
box(3.8,.23,1.9,bronze,[0,.5,0],lounge);box(3.7,.45,1.7,leather,[0,.8,0],lounge);box(3.7,.8,.36,leather,[0,1.3,-.7],lounge);
for(const s of [-1,1]){box(.28,.45,1.75,leather,[s*1.74,1.15,0],lounge);box(.08,.5,.08,graphite,[s*1.5,.25,.55],lounge);box(.08,.5,.08,graphite,[s*1.5,.25,-.55],lounge)}
box(.05,.01,1.45,bronze,[0,1.029,0],lounge);
const oldSofaParts=[...lounge.children];
cyl(.85,.85,.07,white,[0,.77,2.6],lounge);cyl(.09,.17,.69,bronze,[0,.35,2.6],lounge,16);
const book=box(.5,.07,.66,graphite,[-.14,.85,2.5],lounge);book.rotation.y=.3;
cyl(.11,.1,.2,white,[.3,.9,2.6],lounge,24);
function plant(x,z,scale=1){const group=new THREE.Group();group.position.set(x,0,z);group.scale.setScalar(scale);scene.add(group);cyl(.68,.48,.9,white,[0,.45,0],group,32);cyl(.57,.57,.03,dark,[0,.92,0],group,32);const green=palette.foliage;for(let i=0;i<16;i++){const a=i*2.399;const h=1.3+Math.sin(i*3)*.5;const leaf=mesh(new THREE.SphereGeometry(1,10,8),green,group,[Math.cos(a)*.43,1.3+h*.26,Math.sin(a)*.43]);leaf.scale.set(.22,h*.56,.065);leaf.rotation.set(Math.sin(a)*.55,a,Math.cos(a)*.55);}return group;}
const plantHolders=[plant(-11,-5.5,1.7),plant(11.5,-7.8,1.3),plant(13,4,.9)];
// Original authored meshes replace the prototype forms without changing the room composition.
const modelLoader=new GLTFLoader(),propsLoaded=new Set();
function prepareModel(model){model.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});return model;}
function noteProp(name){propsLoaded.add(name);document.body.dataset.props=[...propsLoaded].sort().join(',');}
const modelsReady=Promise.allSettled([
 modelLoader.loadAsync('./assets/robot.glb?v=robot-pass4-final').then(g=>{robot.clear();robot.add(prepareModel(g.scene));animatedHead=g.scene.getObjectByName('head')||head;animatedElbow=g.scene.getObjectByName('elbow')||elbow;animatedLower=g.scene.getObjectByName('lower_arm')||robotLower;noteProp('robot');}),
 modelLoader.loadAsync('./assets/sofa.glb?v=furnishings-2').then(g=>{oldSofaParts.forEach(o=>lounge.remove(o));lounge.add(prepareModel(g.scene));noteProp('sofa');}),
 modelLoader.loadAsync('./assets/plant.glb?v=furnishings-2').then(g=>{prepareModel(g.scene);plantHolders.forEach(h=>{h.clear();h.add(g.scene.clone(true));});noteProp('plant');})
]).then(results=>{for(const result of results)if(result.status==='rejected')console.error('A workshop prop could not load:',result.reason);});
// A precision instrument bench at the back of the pavilion.
const cabinet=new THREE.Group();cabinet.position.set(-7.5,0,-7.8);cabinet.rotation.y=.58;scene.add(cabinet);
box(4.4,1.1,1.2,graphite,[0,.7,0],cabinet);box(4.6,.12,1.4,white,[0,1.32,0],cabinet);
for(let i=0;i<4;i++){box(.95,.7,.035,ceramic,[-1.6+i*1.05,.82,.62],cabinet);box(.35,.03,.05,bronze,[-1.6+i*1.05,1.04,.665],cabinet);}
for(let i=0;i<3;i++){const crystal=mesh(new THREE.IcosahedronGeometry(.3,0),new THREE.MeshStandardMaterial({color:[0x87c6c8,0xcda673,0xbdc9b8][i],metalness:.4,roughness:.18}),cabinet,[-1.3+i*1.2,1.75,0]);crystal.rotation.set(.3*i,.5*i,.2);cyl(.3,.34,.07,bronze,[-1.3+i*1.2,1.42,0],cabinet,24);}
const pavilionFinish=createPavilionFinish({scene,table,cabinet,palette,canopy,columns,wings});
const opticalTable=createHolographicTable({scene,table,showProjectSeats:false});
// A large architectural display with its own physical frame.
const screen=new THREE.Group();screen.visible=false;screen.position.set(3.9,4.6,-6.6);screen.rotation.y=-.22;scene.add(screen);
// Four detached corners and suspended information panes replace the physical monitor.
const screenGlass=mesh(new THREE.PlaneGeometry(6.48,4.12),new THREE.MeshBasicMaterial({color:0x3b9fac,transparent:true,opacity:.09,side:THREE.DoubleSide,depthWrite:false}),screen,[0,0,0]);screenGlass.castShadow=false;
for(const x of [-1,1])for(const y of [-1,1]){box(.78,.022,.03,lightMaterial,[x*2.92,y*2.12,.14],screen);box(.022,.54,.03,lightMaterial,[x*3.3,y*1.86,.14],screen);box(.11,.11,.025,bronze,[x*3.3,y*2.12,.10],screen);}
for(let i=0;i<3;i++){const strip=box(.04,1.15,.04,lightMaterial,[-3.56-i*.13,-.86+i*.16,0],screen);strip.material=strip.material.clone();strip.material.transparent=true;strip.material.opacity=.48-i*.11;}
const subpanel=mesh(new THREE.PlaneGeometry(3.8,.36),new THREE.MeshBasicMaterial({map:label('PROJECTION / A POSSIBILITY, UNFOLDED',{size:30}),transparent:true,opacity:.8,depthWrite:false,side:THREE.DoubleSide}),screen,[.98,-2.45,.05]);subpanel.castShadow=false;

const textureLoader=new THREE.TextureLoader();
const artTextures={};
for(const [key,path] of Object.entries({tva:'../assets/previews/tva.webp',openbots:'../assets/previews/openbots-still.png',bridge:'../assets/previews/bridge.webp'})){const tex=textureLoader.load(path);tex.colorSpace=THREE.SRGBColorSpace;artTextures[key]=tex;}
const idleTexture=(()=>{const c=document.createElement('canvas');c.width=1280;c.height=800;const ctx=c.getContext('2d');ctx.fillStyle='#102c38';ctx.fillRect(0,0,1280,800);ctx.strokeStyle='#244e5b';ctx.lineWidth=1;for(let x=0;x<1280;x+=40){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,800);ctx.stroke()}for(let y=0;y<800;y+=40){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(1280,y);ctx.stroke()}ctx.textAlign='center';ctx.fillStyle='#bcf8e7';ctx.font='16px monospace';ctx.fillText('THE WORKSHOP / PROJECTION SURFACE',640,150);ctx.strokeStyle='#7fbeb966';for(const r of [90,126,162]){ctx.beginPath();ctx.arc(640,386,r,0,Math.PI*2);ctx.stroke()}ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(615,386);ctx.lineTo(665,386);ctx.moveTo(640,361);ctx.lineTo(640,411);ctx.stroke();ctx.fillStyle='#86afb3';ctx.font='14px monospace';ctx.fillText('AI TOOLS, SHIPPED FAST.',640,659);const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;return tex;})();
const displayMaterial=new THREE.MeshBasicMaterial({map:idleTexture,color:0xd4ffee,transparent:true,opacity:.42,side:THREE.DoubleSide,depthWrite:false});
const display=mesh(new THREE.PlaneGeometry(6.26,3.91),displayMaterial,screen,[0,0,.125]);
display.castShadow=false;display.receiveShadow=false;display.userData.action='screen';

// The source volume remains a single object for field release and TVA launch.
const holographicVolume=createHolographicVolume();
const hologramGroup=holographicVolume.group;hologramGroup.position.set(0,4.05,0);scene.add(hologramGroup);
const targetCrystal=mesh(new THREE.SphereGeometry(2.3,16,12),new THREE.MeshBasicMaterial({visible:false}),hologramGroup);targetCrystal.userData.action='field';
// GPU particle choreography: chaotic ellipses resolve into ordered field lines.
const count=innerWidth<600?700:1100;
const seeds=new Float32Array(count*3);for(let i=0;i<count;i++){seeds[i*3]=i/count;seeds[i*3+1]=((i*16807)%2147483647)/2147483647;seeds[i*3+2]=(Math.sin(i*78.233)*43758.5453)%1;}
const particlesGeo=new THREE.BufferGeometry();particlesGeo.setAttribute('position',new THREE.BufferAttribute(seeds,3));
const particleMat=new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.NormalBlending,uniforms:{uNight:{value:0},uSky:{value:0},uTime:{value:0},uCoherence:{value:.28},uRelease:{value:0},uOpacity:{value:1},uPixel:{value:Math.min(devicePixelRatio,1.65)},uGlow:{value:0}},vertexShader:`uniform float uTime,uCoherence,uRelease,uPixel,uGlow;varying float vAlpha;varying float vWarm;varying float vRelease;void main(){float i=position.x;float a=i*6.2831853*31.+uTime*(.11+fract(i*11.)*.14);float band=floor(i*17.);float phi=i*3.14159;vec3 chaos=vec3(cos(a)*(1.45+sin(phi)*.65),sin(a*1.37+uTime*.13)*1.25,sin(a)*(1.45+sin(phi)*.65));float ringA=i*6.2831853*17.+uTime*.2;float lat=(band/16.-.5)*3.14159;vec3 ordered=vec3(cos(ringA)*cos(lat)*1.75,sin(lat)*1.75,sin(ringA)*cos(lat)*1.75);vec3 p=mix(chaos,ordered,uCoherence);p*=1.+uRelease*(1.5+i*7.);p.y+=uRelease*sin(i*53.)*4.;vec4 mv=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mv;float size=(2.2+fract(i*197.)*2.8)*uPixel*11./-mv.z;gl_PointSize=clamp(size*mix(1.,2.25,uGlow),mix(1.4,3.,uGlow),mix(6.,13.,uGlow));vAlpha=(.48+fract(i*211.)*.52)*(1.-uRelease*.7);vWarm=step(.84,fract(i*179.));vRelease=uRelease;}`,fragmentShader:`uniform float uOpacity,uNight,uSky,uGlow;varying float vAlpha,vWarm,vRelease;void main(){float d=length(gl_PointCoord-.5);float core=1.-smoothstep(.08,.48,d);float halo=1.-smoothstep(.03,.70,d);float a=mix(core*.24,halo*.025*mix(1.,.42,uNight),uGlow)*vAlpha*uOpacity;vec3 cool=mix(vec3(.025,.27,.40),vec3(.34,.78,1.),uNight);vec3 warm=mix(vec3(.62,.27,.055),vec3(1.,.80,.38),uNight);vec3 color=mix(cool,warm,vWarm);color=mix(color,mix(vec3(.18,.56,.46),vec3(.28,.50,.72),vWarm),uSky);float energy=mix(1.08,2.45,uGlow)*mix(1.,.72,uGlow*uNight)*(1.+vRelease*1.7*(1.-uSky*.75));gl_FragColor=vec4(color*energy,a);}`});
const particleGlowMat=particleMat.clone();particleGlowMat.uniforms.uGlow.value=1;particleGlowMat.blending=THREE.AdditiveBlending;
const particleMaterials=[particleMat,particleGlowMat];
const particleGlow=new THREE.Points(particlesGeo,particleGlowMat);particleGlow.frustumCulled=false;hologramGroup.add(particleGlow);
const particles=new THREE.Points(particlesGeo,particleMat);particles.frustumCulled=false;hologramGroup.add(particles);
// Light projected onto the worktop — a subtle cone and a patterned contact glow.
const coneMat=new THREE.MeshBasicMaterial({color:0x81ffe6,transparent:true,opacity:.028,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending});
const beam=mesh(new THREE.ConeGeometry(2.1,2.7,64,1,true),coneMat,scene,[0,3.25,0]);beam.rotation.z=Math.PI;beam.castShadow=false;beam.visible=false;
const glowCanvas=document.createElement('canvas');glowCanvas.width=256;glowCanvas.height=256;const gc=glowCanvas.getContext('2d');const gradient=gc.createRadialGradient(128,128,0,128,128,128);gradient.addColorStop(0,'rgba(100,255,215,.7)');gradient.addColorStop(.3,'rgba(40,240,195,.18)');gradient.addColorStop(1,'rgba(30,255,220,0)');gc.fillStyle=gradient;gc.fillRect(0,0,256,256);const glowTex=new THREE.CanvasTexture(glowCanvas);
const glow=mesh(new THREE.PlaneGeometry(5.9,5.9),new THREE.MeshBasicMaterial({map:glowTex,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending}),scene,[0,1.885,0]);glow.rotation.x=-Math.PI/2;glow.castShadow=false;glow.visible=false;
// Airborne motes kept sparse so the room remains readable.
const dustGeo=new THREE.BufferGeometry();const dustData=new Float32Array(110*3);for(let i=0;i<110;i++){dustData[i*3]=Math.sin(i*87)*15;dustData[i*3+1]=.8+(i%31)/31*8;dustData[i*3+2]=Math.cos(i*53)*13;}dustGeo.setAttribute('position',new THREE.BufferAttribute(dustData,3));const dust=new THREE.Points(dustGeo,new THREE.PointsMaterial({color:0xf0e6bd,size:.034,transparent:true,opacity:.65,depthWrite:false}));scene.add(dust);
// Send the selected floating prism itself; capture its current pose at launch.
const projectPath=new THREE.QuadraticBezierCurve3(new THREE.Vector3(),new THREE.Vector3(),new THREE.Vector3(0,4.2,.5));
const projectionTrail=mesh(new THREE.BufferGeometry(),new THREE.MeshBasicMaterial({color:0xb9ffee,transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false}),scene);projectionTrail.visible=false;
const workshopInterior=createStarkWorkshop({scene,camera,
 keep:[ambient,sunLight,fillLight,tableLight,opticalTable.group,robot,hologramGroup,projectionTrail,
 ...projector.objects,...droidWork.objects],
 ambient,keyLight:sunLight,fillLight,
 onDeskFocus:title=>{if(title==='Services')servicesExperience?.open();else servicesExperience?.close({restoreFocus:false,notify:false});entryStartedAt=-10000;clearGesture();stopOrbitMotion();worldInterface.setActive(false);announce(`${title} display. Escape or Return to the desk takes you back.`);audio.cue('move',{strength:.35});},
 onDeskReturn:()=>{servicesExperience?.close({restoreFocus:false,notify:false});worldInterface.setActive(entered);stopOrbitMotion();announce('Returned to the navigation desk.');}
});
const navigationDesk=workshopInterior.navigation;
let projectDispatch=null;
function resetProjectDispatch(){
 if(projectDispatch){const {artifact,position,scale}=projectDispatch;artifact.group.position.copy(position);artifact.group.scale.copy(scale);projectDispatch=null;}
 projection=0;projectionTarget=0;projectionTrail.visible=false;projectionTrail.material.opacity=0;
}
function cancelProjectDispatch(){if(!projectDispatch)return false;clearTimeout(deployTimer);resetProjectDispatch();$('#deploy-button').disabled=false;audio.cue('dock');announce('Projection cancelled.');return true;}
function startProjectDispatch(key){
 resetProjectDispatch();
 const artifact=projectArtifacts.find(a=>a.key===key);if(!artifact)return null;
 const position=artifact.group.position.clone(),scale=artifact.group.scale.clone();
 projectPath.v0.copy(position);projectPath.v1.set(position.x*.5,Math.max(5.3,position.y+.6),1);
 projectPath.updateArcLengths();projectionTrail.geometry.dispose();projectionTrail.geometry=new THREE.TubeGeometry(projectPath,80,.035,8,false);
 projectionTrail.material.color.copy(artifact.body.material.color);
 projectDispatch={key,artifact,position,scale};return projectDispatch;
}
// Local interaction state, no generated output or loading claims are simulated.
const projectData={
 bridge:{title:'Step between worlds.',eyebrow:'THE BRIDGE / INTERACTIVE FILM',description:'Seven realms. One person. Open a portal and step into The Bridge.',index:'04',case:'../work/the-bridge/'},
 field:{title:'Find the frequency.',eyebrow:'LIVE / GENERATIVE FIELD',description:'Touch the field. Shape its orbit. Let it go.',index:'01'},
 tva:{title:'Another timeline.',eyebrow:'TVA CASE FILE / WEB EXPERIENCE',description:'Seven deviations. One timeline. Open the case file, then follow it into the sky.',index:'02',src:'https://tva-case-file-l1607.netlify.app',case:'../work/tva-case-file/'},
 openbots:{title:'Meet the team.',eyebrow:'OPENBOTS / NATIVE MACOS',description:'Persistent, named AI teammates. A still from the v0.5.0 preview; consequential actions are disabled in that build.',index:'03',src:'https://github.com/LorenzoColombani/openbots',case:'../work/openbots/'}
};
function orbitLimits(){return inspectingRobot?{min:3.8,max:10}:{min:9.5,max:26};}
function orbitAzimuthLimits(){return inspectingRobot?{min:-.65,max:.95}:{min:-1.05,max:1.05};}
function orbitElevationLimits(radius=orbitRadiusTarget){const focusY=inspectingRobot?robotFocus.y:tableFocus.y,maxHeight=inspectingRobot?5.4:8.35;return {min:.06,max:Math.min(.35,Math.asin(Math.min(.95,(maxHeight-focusY)/Math.max(1,radius))))};}
function stopOrbitMotion(){yawVelocity=0;pitchVelocity=0;}
function focusRobot(value){
 inspectingRobot=Boolean(value);stopOrbitMotion();
 orbitAzimuth=inspectingRobot?.28:.025;orbitElevation=inspectingRobot?.21:.238;
 orbitRadiusTarget=inspectingRobot?7.5:innerWidth<600?22:13.8;
}
const bridgeExperience=createBridgeExperience({scene,camera,canvas,getReturnLabel:()=>returnToProducts?'Return to Products':'Return to the Workshop',getMuted:()=>soundChoice===false||!audio.enabled,onOpen:()=>{clearTimeout(deployTimer);resetProjectDispatch();clearGesture();stopOrbitMotion();audio.setDucked(true);worldInterface.setActive(false);},onClose:()=>{worldInterface.setActive(entered);audio.setDucked(false);audio.setIntensity(.5);audio.cue('dock');announce('Returned from The Bridge to the workshop.');restoreProductSelection();}});
function isExhibitOpen(){return worldInterface.isOpen||bridgeExperience.active||Boolean(websiteExperience?.active)||Boolean(servicesExperience?.active);}
function openCompanion({fromHistory=false}={}){navigationDesk.clearFocus();entryStartedAt=-10000;if(inspectingRobot)return;focusRobot(true);worldInterface.setCompanionActive(true);if(!fromHistory){history.pushState({workshopView:'companion'},'','./?view=robot');companionHistoryEntry=true;}announce('Companion view. Return with the workshop beacon, browser Back, Escape, or a tap on empty space.');}
function returnToWorkshop({fromHistory=false}={}){servicesExperience?.close({restoreFocus:false,notify:false});if(websiteExperience?.active)websiteExperience.close({immediate:true});navigationDesk.clearFocus();if(!inspectingRobot)return;focusRobot(false);worldInterface.setCompanionActive(false);announce('Returned to the general workshop view.');canvas.focus({preventScroll:true});if(!fromHistory){if(companionHistoryEntry){companionHistoryEntry=false;history.back();}else if(new URLSearchParams(location.search).get('view')==='robot')history.replaceState({workshopView:'general'},'','./');}}
const worldInterface=createWorldInterface({scene,camera,canvas,getReturnLabel:()=>returnToProducts?'Return to Products':'Return to the Workshop',onTextControls:()=>$('#text-controls-toggle').click(),onCompanion:()=>{const wasInspecting=inspectingRobot;if(wasInspecting)returnToWorkshop();else openCompanion();audio.cue('move',{direction:wasInspecting?-1:1,strength:.5});},onStoryStart:()=>{if(soundChoice===false){worldInterface.setMuted(true);return;}soundChoice=true;worldInterface.setMuted(false);audio.setEnabled(true).then(()=>{renderSoundChoice();}).catch(()=>{});},onGesture:kind=>audio.cue(kind,{strength:.38}),onPull:(key,phase,dx,dy)=>{const a=projectArtifacts.find(a=>a.key===key);if(!a)return;if(phase==='start'){heldArtifact=a;audio.cue('grab');}else if(phase==='move'){a.group.position.set(a.x+dx*.007,2.7-dy*.007,a.z);a.body.rotation.z=.22+dx*.003;}else heldArtifact=null;},getArtifactPosition:key=>projectArtifacts.find(a=>a.key===key)?.group.position,onProject:key=>{selectProject(key);$('#deploy-button').click();},onRelease:()=>$('#release-button').click(),onClose:()=>{audio.setDucked(false);audio.setIntensity(.5);audio.cue('dock');announce('The experience has folded back into the field.');restoreProductSelection();}});
function restoreProductSelection(){if(returnToProducts){returnToProducts=false;navigationDesk.focusProducts();productElements?.focusCard();}}
websiteExperience=createWebsiteExperience({scene,camera,canvas,onOpen:()=>{clearTimeout(deployTimer);resetProjectDispatch();clearGesture();stopOrbitMotion();worldInterface.setActive(false);},onClose:item=>{if(new URLSearchParams(location.search).get('view')===item?.id){const url=new URL(location.href);url.searchParams.delete('view');history.replaceState({},'',url);}worldInterface.setActive(entered);restoreProductSelection();announce('Returned to Products.');},onGesture:kind=>audio.cue(kind,{strength:kind.startsWith('website-')?.75:.42})});
servicesExperience=createServicesExperience({scene,camera,canvas,onOpen:()=>{clearTimeout(deployTimer);resetProjectDispatch();clearGesture();stopOrbitMotion();worldInterface.setActive(false);},onClose:()=>{navigationDesk.clearFocus();worldInterface.setActive(entered);stopOrbitMotion();if(new URLSearchParams(location.search).get('view')==='services')history.replaceState({},'','./');announce('Returned to the navigation desk.');}});
productElements=createProductElements({scene,camera,announce,onGesture:kind=>audio.cue(kind,{strength:.52}),
 onLaunchStart:item=>{stopOrbitMotion();clearGesture();if(item.id==='bridge')bridgeExperience.primeAudio();navigationDesk.clearFocus();},
 onCancel:()=>{returnToProducts=false;navigationDesk.focusProducts();},
 onRestore:()=>{navigationDesk.focusProducts();productElements.focusCard();},
 onLaunch:item=>{if(websiteExperience.canOpen(item)){returnToProducts=true;websiteExperience.open(item);}else if(item.featured){returnToProducts=true;selectProject(item.id);if(item.id==='bridge')bridgeExperience.open();else showExperience('tva');}else productElements.showGeneric(item);}
});
navigationDesk.useLiveProducts();
// Start the silent film bootstrap before the first project gesture.
bridgeExperience.prepare();
$('#text-controls-toggle').addEventListener('click',()=>{const show=!document.body.classList.contains('text-controls');document.body.classList.toggle('text-controls',show);$('#text-controls-toggle').setAttribute('aria-pressed',String(show));$('#text-controls-toggle').textContent=show?'Hide text controls':'Show text controls';$('#about-dialog').close();});
$('#workshop-home').addEventListener('click',e=>{if(!entered)return;e.preventDefault();returnToWorkshop();focusRobot(false);});
function announce(text){$('#announcer').textContent=text;}
function enableEntrySound(){
 audio.unlockEffects().catch(()=>{});
 if(soundChoice===false||audioBusy||audio.enabled)return;
 const request=++soundRequest;
 audioBusy=true;soundChoice=true;worldInterface.setMuted(false);renderSoundChoice();
 audio.setEnabled(true).then(()=>{if(request===soundRequest)audio.cue('move',{strength:.65});}).catch(()=>{if(request===soundRequest){soundChoice=false;announce('Audio could not start. Choose a soundtrack to try again.');}}).finally(()=>{if(request===soundRequest){audioBusy=false;renderSoundChoice();}});
}
// Trusted interaction can resume SFX after a browser interruption without
// turning music back on or starting any audio on a direct-link page load.
function unlockInteractionEffects(event){if(entered&&event.isTrusted)audio.unlockEffects().catch(()=>{});}
document.addEventListener('pointerdown',unlockInteractionEffects,{capture:true,passive:true});
document.addEventListener('keydown',unlockInteractionEffects,{capture:true});
function enter({unmute=false}={}){if(entered)return;clearTimeout(entryTimer);entryUnlocking=false;entryArrivedAt=performance.now();if(unmute)enableEntrySound();entered=true;orbitRadiusTarget=innerWidth<600?22:13.8;document.body.classList.remove('entry-unlocking');$('#intro').hidden=true;$('#workbench').hidden=false;$('#focus-card').hidden=false;document.body.classList.add('entered');canvas.setAttribute('aria-label','Interactive three-dimensional workshop. Drag empty space to look around. Pinch or scroll to move closer. Inspect the Products and Services displays, or look around the room.');worldInterface.setActive(true);bridgeExperience.prepare();selectProject('field');canvas.tabIndex=0;requestAnimationFrame(()=>canvas.focus({preventScroll:true}));}
function selectProject(key){navigationDesk.clearFocus();if(!entered)enter();if(inspectingRobot){returnToWorkshop({fromHistory:true});companionHistoryEntry=false;history.replaceState({workshopView:'general'},'','./');}activeProject=key;clearTimeout(deployTimer);resetProjectDispatch();$('#deploy-button').disabled=false;const d=projectData[key];document.querySelectorAll('.instrument').forEach(b=>{const on=b.dataset.project===key;b.classList.toggle('active',on);b.setAttribute('aria-pressed',String(on))});$('#focus-title').textContent=d.title;$('#focus-eyebrow').textContent=d.eyebrow;$('#focus-description').textContent=d.description;$('#focus-index').textContent=d.index;$('#field-controls').hidden=key!=='field';$('#project-controls').hidden=key==='field';if(d.case)$('#case-link').href=d.case;displayMaterial.map=key==='field'?idleTexture:artTextures[key];displayMaterial.opacity=key==='field'?.42:.88;displayMaterial.color.set(key==='field'?0xd4ffee:0xffffff);displayMaterial.needsUpdate=true;fieldTarget=key==='field'?Number($('#coherence').value)/100:.9;audio.setIntensity(key==='field'?.45:.65);audio.cue('select');announce(key==='field'?'Drag empty space to explore. Select a desk display to take a closer look.':`${key==='bridge'?'The Bridge':key==='tva'?'TVA Case File':'OpenBots'} selected. Open its experience.`);}
$('#enter-button').addEventListener('click',()=>{
 if(entered||entryUnlocking)return;
 entryUnlocking=true;entryStartedAt=performance.now();entryFrom.copy(camera.position);$('#enter-button').disabled=true;$('#enter-button').setAttribute('aria-busy','true');$('#entry-status').textContent='WORKSHOP UNLOCKED';
 document.body.classList.add('entry-unlocking');enableEntrySound();audio.cue('deploy',{strength:.65});
 entryTimer=setTimeout(()=>enter(),reducedQuery.matches?0:850);
});
document.querySelectorAll('.instrument').forEach(b=>b.addEventListener('click',()=>{if(!entered)enter({unmute:true});selectProject(b.dataset.project);}));
$('#coherence').addEventListener('input',e=>{fieldTarget=Number(e.target.value)/100;$('#coherence-readout').textContent=`${e.target.value}% COHERENCE`;audio.setIntensity(.25+fieldTarget*.65)});
$('#release-button').addEventListener('click',()=>{releaseAt=time;audio.cue('release');announce('Field released. The particles return to the instrument.');if(motionPaused){fieldTarget=fieldTarget>.5?.15:.9;$('#coherence').value=Math.round(fieldTarget*100);$('#coherence-readout').textContent=`${Math.round(fieldTarget*100)}% COHERENCE`;}});
function showExperience(key=activeProject){if(key==='field')return;stopOrbitMotion();worldInterface.show(key);audio.cue('move',{strength:.55});audio.setDucked(key==='tva');audio.setIntensity(.12);}
$('#deploy-button').addEventListener('click',()=>{if(activeProject==='field')return;if(activeProject==='bridge'){bridgeExperience.open();return;}const dispatch=startProjectDispatch(activeProject);if(!dispatch)return;audio.cue('deploy');projectionTarget=1;$('#deploy-button').disabled=true;announce('Projecting the selected experience.');clearTimeout(deployTimer);deployTimer=setTimeout(()=>{if(projectDispatch!==dispatch||activeProject!==dispatch.key)return;$('#deploy-button').disabled=false;resetProjectDispatch();showExperience(dispatch.key);},motionPaused?0:1250);});

$('#capture-button').addEventListener('click',()=>{
 composer.render();worldInterface.renderSky(renderer);
 canvas.toBlob(blob=>{if(!blob){announce('The view could not be saved.');return;}const reader=new FileReader();reader.onload=()=>{document.getElementById('snapshot-preview')?.remove();const img=document.createElement('img');img.id='snapshot-preview';img.alt='';img.setAttribute('aria-hidden','true');img.className='sr-only';img.src=reader.result;document.body.append(img);};reader.readAsDataURL(blob);const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download='the-workshop.png';link.click();setTimeout(()=>URL.revokeObjectURL(url),10000);announce('Your current workshop view has been saved as an image.');},'image/png');
});
addEventListener('keydown',e=>{if(e.altKey&&e.code==='KeyP'){e.preventDefault();$('#capture-button').click();}});
addEventListener('keydown',e=>{if(e.key==='Escape'&&inspectingRobot&&!isExhibitOpen()){e.preventDefault();returnToWorkshop();}});
addEventListener('popstate',()=>{const companion=new URLSearchParams(location.search).get('view')==='robot';companionHistoryEntry=false;if(companion&&!inspectingRobot)openCompanion({fromHistory:true});else if(!companion&&inspectingRobot)returnToWorkshop({fromHistory:true});});
$('#experience-close').addEventListener('click',()=>$('#experience-dialog').close());
$('#experience-dialog').addEventListener('close',()=>{$('#experience-content').replaceChildren();audio.setIntensity(.5);audio.cue('close');$('#deploy-button').focus({preventScroll:true})});
$('#info-toggle').addEventListener('click',()=>{navigationDesk.clearFocus();if(!entered)enter();resetProjectDispatch();$('#deploy-button').disabled=false;audio.cue('deploy');projectionTarget=1;clearTimeout(deployTimer);deployTimer=setTimeout(()=>{worldInterface.show('guide');audio.cue('move',{strength:.4});audio.setDucked(false);projectionTarget=0;},motionPaused?0:650);});$('.about-close').addEventListener('click',()=>$('#about-dialog').close());
for(const dialog of document.querySelectorAll('dialog'))dialog.addEventListener('click',e=>{const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close()});
$('#sound-toggle').addEventListener('change',async()=>{
 const choice=$('#sound-toggle').value, request=++soundRequest;
 audioBusy=true;
 try{
  const enable=choice!=='off';soundChoice=enable;
  worldInterface.setMuted(!enable);bridgeExperience.setMuted(!enable);
  if(enable){
   // Both calls happen in the user gesture. Off remains available while loading.
   const switching=audio.setScoreMode(choice), enabling=audio.setEnabled(true);
   renderSoundChoice();
   await Promise.all([switching,enabling]);
   if(request!==soundRequest)return;
   try{localStorage.setItem('workshop2-soundtrack',choice);}catch{}
  }else await audio.setEnabled(false);
  if(request===soundRequest)announce(enable?(choice==='rock'?'Workshop rock is playing.':'Calm music is playing.'):'Music is off. Interaction sounds remain active.');
 }catch{if(request===soundRequest){soundChoice=false;worldInterface.setMuted(true);bridgeExperience.setMuted(true);await audio.setEnabled(false);announce('Audio could not start. Choose a soundtrack to try again.');}}
 finally{if(request===soundRequest){audioBusy=false;renderSoundChoice();}}
});
reducedQuery.addEventListener('change',e=>{motionPaused=e.matches;if(motionPaused)stopOrbitMotion();});
const raycaster=new THREE.Raycaster();
function pointerDistance(){const a=[...activePointers.values()];return a.length<2?0:Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y);}
function beginPinch(){gestureOwner='pinch';dragging=true;heldArtifact=null;holdingField=false;primaryPointerId=null;stopOrbitMotion();pinchStartDistance=Math.max(10,pointerDistance());pinchStartRadius=orbitRadiusTarget;}
function clearGesture(){dragging=false;dragStart=null;gestureOwner=null;primaryPointerId=null;holdingField=false;heldArtifact=null;activePointers.clear();canvas.style.cursor=entered?'grab':'default';}
function markRoomNavigated(){entryStartedAt=-10000;document.body.classList.add('room-navigated');}
canvas.addEventListener('pointermove',e=>{
 if(isExhibitOpen()||navigationDesk.focused||productElements?.busy)return;
 pointer.set(e.clientX/innerWidth*2-1,1-e.clientY/innerHeight*2);
 if(activePointers.has(e.pointerId))activePointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
 if(gestureOwner==='pinch'&&activePointers.size>=2){
  e.preventDefault();const limits=orbitLimits();orbitRadiusTarget=THREE.MathUtils.clamp(pinchStartRadius*pinchStartDistance/Math.max(10,pointerDistance()),limits.min,limits.max);if(reducedQuery.matches)orbitRadius=orbitRadiusTarget;canvas.style.cursor='grabbing';markRoomNavigated();return;
 }
 if(e.pointerId===primaryPointerId&&dragStart){
  if(gestureOwner==='field'&&holdingField){fieldTarget=THREE.MathUtils.clamp(fieldAtDown+(e.clientX-dragStart.initialX-(e.clientY-dragStart.initialY))*.004,0,1);$('#coherence').value=Math.round(fieldTarget*100);$('#coherence-readout').textContent=`${Math.round(fieldTarget*100)}% COHERENCE`;audio.setIntensity(.25+fieldTarget*.6);}
  else if(gestureOwner==='orbit'){
   const dx=e.clientX-dragStart.x,dy=e.clientY-dragStart.y,now=e.timeStamp||performance.now(),elapsed=THREE.MathUtils.clamp((now-lastGestureAt)/1000,.008,.06);
   const yawDelta=-dx*Math.PI/Math.max(320,innerWidth),pitchDelta=dy*Math.PI*.28/Math.max(320,innerHeight),previousElevation=orbitElevation,elevationLimits=orbitElevationLimits();
   const previousAzimuth=orbitAzimuth,azimuthLimits=orbitAzimuthLimits();orbitAzimuth=THREE.MathUtils.clamp(previousAzimuth+yawDelta,azimuthLimits.min,azimuthLimits.max);orbitElevation=THREE.MathUtils.clamp(previousElevation+pitchDelta,elevationLimits.min,elevationLimits.max);
   yawVelocity=orbitAzimuth===previousAzimuth&&yawDelta!==0?0:THREE.MathUtils.clamp(THREE.MathUtils.lerp(yawVelocity,yawDelta/elapsed,.55),-4.5,4.5);
   pitchVelocity=orbitElevation===previousElevation&&pitchDelta!==0?0:THREE.MathUtils.clamp(THREE.MathUtils.lerp(pitchVelocity,pitchDelta/elapsed,.55),-2.4,2.4);
   dragStart.x=e.clientX;dragStart.y=e.clientY;lastGestureAt=now;canvas.style.cursor='grabbing';if(Math.abs(dx)+Math.abs(dy)>1)markRoomNavigated();
  }
 }
 if(!dragging){raycaster.setFromCamera(pointer,camera);const hit=hologramGroup.visible&&raycaster.intersectObject(targetCrystal,false).length;canvas.style.cursor=hit?'pointer':entered?'grab':'default';}
});
canvas.addEventListener('pointerdown',e=>{
 if(!entered||isExhibitOpen()||navigationDesk.focused||productElements?.busy||(e.pointerType==='mouse'&&e.button!==0))return;
 e.preventDefault();activePointers.set(e.pointerId,{x:e.clientX,y:e.clientY});canvas.setPointerCapture(e.pointerId);
 if(activePointers.size===2){beginPinch();return;}if(activePointers.size>2)return;
 dragging=true;primaryPointerId=e.pointerId;downAt=performance.now();lastGestureAt=e.timeStamp||downAt;dragStart={x:e.clientX,y:e.clientY,initialX:e.clientX,initialY:e.clientY};stopOrbitMotion();
 pointer.set(e.clientX/innerWidth*2-1,1-e.clientY/innerHeight*2);raycaster.setFromCamera(pointer,camera);
 holdingField=hologramGroup.visible&&Boolean(raycaster.intersectObject(targetCrystal,false).length);
 gestureOwner=holdingField?'field':'orbit';if(!holdingField)cancelProjectDispatch();
 if(holdingField){audio.cue('grab');fieldAtDown=fieldTarget;selectProject('field');}canvas.style.cursor='grabbing';
});
canvas.addEventListener('pointerup',e=>{
 if(isExhibitOpen())return;
 activePointers.delete(e.pointerId);
 if(gestureOwner==='pinch'){if(activePointers.size)return;clearGesture();return;}
 if(e.pointerId!==primaryPointerId)return;
 const owner=gestureOwner,distance=dragStart?Math.hypot(e.clientX-dragStart.initialX,e.clientY-dragStart.initialY):100;dragging=false;primaryPointerId=null;
 if(owner==='orbit'){if(motionPaused||reducedQuery.matches)stopOrbitMotion();if(distance>5)audio.cue('move',{direction:Math.sign(yawVelocity),strength:Math.min(.38,distance/900)});dragStart=null;gestureOwner=null;canvas.style.cursor='grab';if(distance<8&&inspectingRobot)returnToWorkshop();return;}
 const wasHolding=owner==='field'&&holdingField;holdingField=false;dragStart=null;gestureOwner=null;if(wasHolding&&(distance<8||(distance>95&&performance.now()-downAt<650))){$('#release-button').click();return;}if(distance>8)return;

});
canvas.addEventListener('pointercancel',()=>{stopOrbitMotion();clearGesture();});
canvas.addEventListener('wheel',e=>{if(!entered||isExhibitOpen()||navigationDesk.focused||productElements?.busy)return;e.preventDefault();const modeScale=e.deltaMode===1?16:e.deltaMode===2?innerHeight:1,delta=e.deltaY*modeScale,limits=orbitLimits(),gain=e.ctrlKey?.0024:.00115;orbitRadiusTarget=THREE.MathUtils.clamp(orbitRadiusTarget*Math.exp(delta*gain),limits.min,limits.max);if(reducedQuery.matches)orbitRadius=orbitRadiusTarget;stopOrbitMotion();markRoomNavigated();},{passive:false});
// Camera motion is choreographed and bounded: every view stays composed.
const destination=new THREE.Vector3(),tempLook=new THREE.Vector3(),robotProjection=new THREE.Vector3();
function resize(){const nowNarrow=innerWidth<600;if(nowNarrow!==narrowLayout&&!inspectingRobot){const limits=orbitLimits();orbitRadiusTarget=THREE.MathUtils.clamp(orbitRadiusTarget*(nowNarrow?22/13.8:13.8/22),limits.min,limits.max);}narrowLayout=nowNarrow;camera.aspect=innerWidth/innerHeight;camera.fov=innerWidth<600?55:Math.min(62,THREE.MathUtils.radToDeg(2*Math.atan(Math.tan(THREE.MathUtils.degToRad(43)/2)*1.78/camera.aspect)));camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(Math.min(devicePixelRatio,innerWidth<600?1.45:1.65));particleMaterials.forEach(material=>material.uniforms.uPixel.value=renderer.getPixelRatio());composer.setPixelRatio(renderer.getPixelRatio());composer.setSize(innerWidth,innerHeight);aoPass.enabled=innerWidth>=650;worldInterface.resize();finishPass.uniforms.uResolution.value.set(innerWidth,innerHeight);fxaaPass.uniforms.resolution.value.set(1/(innerWidth*renderer.getPixelRatio()),1/(innerHeight*renderer.getPixelRatio()));}
addEventListener('resize',resize);
const renderTarget=new THREE.WebGLRenderTarget(innerWidth,innerHeight,{type:THREE.HalfFloatType,samples:2});
const composer=new EffectComposer(renderer,renderTarget);
composer.addPass(new RenderPass(scene,camera));
const aoPass=new SSAOPass(scene,camera,innerWidth,innerHeight,16);aoPass.kernelRadius=7;aoPass.minDistance=.001;aoPass.maxDistance=.018;usePhysicalOcclusion(aoPass,scene);composer.addPass(aoPass);
const bloomPass=new UnrealBloomPass(new THREE.Vector2(innerWidth,innerHeight),.23,.32,1.15);composer.addPass(bloomPass);
composer.addPass(new OutputPass());
const finishPass=new ShaderPass({uniforms:{tDiffuse:{value:null},uResolution:{value:new THREE.Vector2(innerWidth,innerHeight)}},vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,fragmentShader:`uniform sampler2D tDiffuse;uniform vec2 uResolution;varying vec2 vUv;void main(){vec3 c=texture2D(tDiffuse,vUv).rgb;float l=dot(c,vec3(.2126,.7152,.0722));c=mix(vec3(l),c,1.12);c=(c-.5)*1.06+.5;vec2 q=vUv*2.-1.;float vignette=1.-dot(q,q)*.065;c*=vignette;float grain=fract(sin(dot(vUv*uResolution,vec2(12.9898,78.233)))*43758.5453)-.5;c+=grain*.008;gl_FragColor=vec4(c,1.);}`});composer.addPass(finishPass);
const fxaaPass=new ShaderPass(FXAAShader);composer.addPass(fxaaPass);
const dayFog=new THREE.Color(0x92b6bf),nightFog=new THREE.Color(0x234858),daySky=new THREE.Color(0xd4f4ff),nightSky=new THREE.Color(0x5882bc);
function frame(now){const dt=Math.min((now-lastFrame)/1000,.05);lastFrame=now;if(bridgeExperience.ownsScreen||websiteExperience.ownsScreen){requestAnimationFrame(frame);return;}if(!document.hidden){if(!motionPaused&&!document.querySelector('dialog[open]'))time+=dt;fieldValue=reducedQuery.matches?fieldTarget:THREE.MathUtils.damp(fieldValue,fieldTarget,4.5,dt);const narrow=innerWidth<600;
 destination.copy(entered?cameraBench:cameraHome);
 if(narrow){destination.copy(entered?new THREE.Vector3(0,6.5,27.7):cameraNarrowHome);}
 if(entered&&!isExhibitOpen()&&!navigationDesk.focused){
  if(!dragging&&!motionPaused&&!reducedQuery.matches){const previousAzimuth=orbitAzimuth,azimuthLimits=orbitAzimuthLimits();orbitAzimuth=THREE.MathUtils.clamp(orbitAzimuth+yawVelocity*dt,azimuthLimits.min,azimuthLimits.max);if(orbitAzimuth===previousAzimuth&&yawVelocity!==0)yawVelocity=0;const previousElevation=orbitElevation,elevationLimits=orbitElevationLimits();orbitElevation=THREE.MathUtils.clamp(orbitElevation+pitchVelocity*dt,elevationLimits.min,elevationLimits.max);if(orbitElevation===previousElevation&&pitchVelocity!==0)pitchVelocity=0;const inertia=Math.exp(-dt*5.5);yawVelocity*=inertia;pitchVelocity*=inertia;}
  const limits=orbitLimits();orbitRadiusTarget=THREE.MathUtils.clamp(orbitRadiusTarget,limits.min,limits.max);const elevationLimits=orbitElevationLimits();orbitElevation=THREE.MathUtils.clamp(orbitElevation,elevationLimits.min,elevationLimits.max);orbitRadius=reducedQuery.matches?orbitRadiusTarget:THREE.MathUtils.damp(orbitRadius,orbitRadiusTarget,7.5,dt);
  const focus=inspectingRobot?robotFocus:tableFocus,cosElevation=Math.cos(orbitElevation);destination.set(focus.x+Math.sin(orbitAzimuth)*cosElevation*orbitRadius,focus.y+Math.sin(orbitElevation)*orbitRadius,focus.z+Math.cos(orbitAzimuth)*cosElevation*orbitRadius);
 }
 if(servicesExperience.active){destination.copy(servicesExperience.getFocusPose().position);}else if(websiteExperience.active){destination.copy(websiteExperience.getFocusPose().position);}else if(isExhibitOpen()){const reading=narrow&&worldInterface.isPlaying?worldInterface.readingPose:null;const y=reading?4.7+(420-reading.center)/840*3.88:(websiteExperience.active?websiteExperience.focusPoint:worldInterface.focusPoint).y;const film=worldInterface.getFilm(),treeWide=film?THREE.MathUtils.smoothstep(film.t(),film.C.turn,film.C.turn+10)*(1-THREE.MathUtils.smoothstep(film.t(),film.C.treeFade,film.C.sting)):0;destination.set(...(narrow?[0,y+.8,(15.5-(reading?.zoom||0)*6.8+treeWide*1.5)/worldInterface.viewZoom]:worldInterface.kind==='openbots'?[0,y+.8,12.2/worldInterface.viewZoom]:[2.1,y+.9,(worldInterface.isPlaying?11.5+treeWide*2:10.5)/worldInterface.viewZoom]));}
 if(!entered&&!isExhibitOpen()&&!motionPaused&&!dragging&&!narrow){destination.x+=pointer.x*.38;destination.y+=pointer.y*.2;}
 const deskPose=navigationDesk.getFocusPose();if(deskPose&&!isExhibitOpen())destination.copy(deskPose.position);
 if(!reducedQuery.matches&&now-entryStartedAt<3000&&!isExhibitOpen()&&!dragging&&!navigationDesk.focused){const p=THREE.MathUtils.clamp((now-entryStartedAt)/3000,0,1),e=p*p*p*(p*(p*6-15)+10);const arrival=narrow?new THREE.Vector3(.4,7.74,27.28):cameraBench;destination.lerpVectors(entryFrom,arrival,e);}
 camera.position.lerp(destination,reducedQuery.matches?1:1-Math.exp(-dt*(websiteExperience.active?8.5:entered?(now-entryArrivedAt<1600?2.7:dragging?14:6.5):1.75)));
 tempLook.copy(entered?(inspectingRobot?robotFocus:tableFocus):new THREE.Vector3(0,2.95,5.0));
 if(servicesExperience.active){tempLook.copy(servicesExperience.getFocusPose().target);}else if(websiteExperience.active){tempLook.copy(websiteExperience.getFocusPose().target);}else if(isExhibitOpen()){const reading=narrow&&worldInterface.isPlaying?worldInterface.readingPose:null;tempLook.set(0,reading?4.7+(420-reading.center)/840*3.88:(websiteExperience.active?websiteExperience.focusPoint:worldInterface.focusPoint).y,(websiteExperience.active?websiteExperience.focusPoint:worldInterface.focusPoint).z);}
 if(deskPose&&!isExhibitOpen())tempLook.copy(deskPose.target);
 smoothLook.lerp(tempLook,reducedQuery.matches?1:1-Math.exp(-dt*(websiteExperience.active?8.5:2)));camera.lookAt(smoothLook);
 const skyP=worldInterface.skyProgress;if(skyP>0){if(previousSky===0){skyPath=new THREE.CatmullRomCurve3([camera.position.clone(),new THREE.Vector3(0,7.2,4),new THREE.Vector3(0,8.4,2.4)]);skyFromLook=smoothLook.clone();}const q=THREE.MathUtils.smoothstep(skyP,0,1);camera.position.copy(skyPath.getPoint(q));smoothLook.lerpVectors(skyFromLook,new THREE.Vector3(0,22,-3),q);camera.lookAt(smoothLook);}previousSky=skyP;
 bridgeExperience.update({dt,time,pixelRatio:renderer.getPixelRatio(),reduced:reducedQuery.matches});
 coastalWorld.update(time,night);terrainMaterials.forEach(({material,day})=>material.color.copy(day).multiplyScalar(1-night*.68));sky.material.uniforms.uNight.value=night;seaMat.uniforms.uTime.value=time;seaMat.uniforms.uNight.value=night;scene.fog.color.copy(dayFog).lerp(nightFog,night);ambient.color.copy(daySky).lerp(nightSky,night);ambient.intensity=.48;sunLight.intensity=.40;fillLight.intensity=.56;scene.environmentIntensity=.42-night*.2;tableLight.position.set(0,2.65,0);tableLight.intensity=isExhibitOpen()?5:8;tableLight.color.set(!websiteExperience.active&&!servicesExperience.active&&worldInterface.kind==='tva'&&isExhibitOpen()?0xffcb83:0x70c6ed);renderer.toneMappingExposure=1.18;workshopInterior.update({skyProgress:worldInterface.skyProgress,entered,unlocking:entryUnlocking,reduced:reducedQuery.matches,dt,time,obscured:isExhibitOpen(),companion:inspectingRobot});
 projectArtifacts.forEach((a,i)=>{a.body.rotation.y=time*.3+i;if(projectDispatch?.artifact===a)return;a.group.scale.lerp(new THREE.Vector3().setScalar(isExhibitOpen()?.32:1),1-Math.exp(-dt*5));if(heldArtifact!==a)a.group.position.lerp(new THREE.Vector3(a.x,2.7+Math.sin(time*1.2+i*2)*.13,a.z),1-Math.exp(-dt*6));});
 const skyLift=worldInterface.skyProgress,liftPhase=THREE.MathUtils.smoothstep(skyLift,.05,.60),orbFade=1-THREE.MathUtils.smoothstep(skyLift,.56,.83);hologramGroup.position.set(0,4.05+liftPhase*17.95,isExhibitOpen()?-.6-liftPhase*2.4:0);
 hologramGroup.scale.lerp(new THREE.Vector3().setScalar(isExhibitOpen()?(worldInterface.kind==='tva'&&skyLift<1?1:0):1),1-Math.exp(-dt*8));
 particleMaterials.forEach(material=>{material.uniforms.uNight.value=night;material.uniforms.uSky.value=THREE.MathUtils.smoothstep(skyLift,.66,.92);});
 productAttention=THREE.MathUtils.damp(productAttention,productElements?.selectionStrength||0,6,dt);
 if(!motionPaused&&!document.querySelector('dialog[open]'))hologramClock+=dt*(reducedQuery.matches?1:1+productAttention*2);
 hologramGroup.visible=(!isExhibitOpen()||(worldInterface.kind==='tva'&&skyLift>0&&skyLift<1))&&hologramGroup.scale.x>.015;hologramGroup.rotation.y=.45+Math.sin(hologramClock*.06)*.08;
 holographicVolume.update({time:hologramClock,night,opacity:orbFade,coherence:fieldValue,selection:productAttention});opticalTable.update({night,charge:projection});
 const orbAmplitude=8+fieldValue*32;$('#orb-wave').setAttribute('d',`M12 60 Q36 ${60-orbAmplitude} 60 60 T108 60`);$('.liquid-orb').style.transform=`rotate(${fieldValue*45}deg) scale(${.88+fieldValue*.12})`;particleMaterials.forEach(material=>{material.uniforms.uTime.value=hologramClock;material.uniforms.uCoherence.value=fieldValue;});
 const releaseDelta=time-releaseAt;const release=releaseDelta<4?Math.sin(Math.min(releaseDelta/4,1)*Math.PI):0;particleMaterials.forEach(material=>{material.uniforms.uRelease.value=skyLift>0?THREE.MathUtils.smoothstep(skyLift,.56,.9):release;material.uniforms.uOpacity.value=(skyLift>0?1:Math.max(.12,release))*(1-THREE.MathUtils.smoothstep(skyLift,.88,1));});
 animatedHead.rotation.y=-.65+Math.sin(time*.34)*.06;animatedHead.rotation.z=Math.sin(time*.57)*.015;animatedElbow.rotation.z=Math.sin(time*.4)*.08;animatedLower.rotation.y=Math.sin(time*.26)*.1;meshes.forEach((m,i)=>{m.rotation.y=time*.2+i;m.position.y=.28+Math.sin(time*1.5+i*2)*.04});
 droidWork.update({time,dt,night,reduced:reducedQuery.matches,visible:!isExhibitOpen()&&projection<.08});
 const displayExpansion=activeProject==='field'?.62:1;
 const displayScale=displayExpansion+projection*.12;
 screen.scale.lerp(new THREE.Vector3(displayScale,displayScale,displayScale),1-Math.exp(-dt*3.8));
 screen.position.y=4.6+Math.sin(time*.35)*.035;
 screen.rotation.y=-.22+Math.sin(time*.2)*.02;
 projection=THREE.MathUtils.damp(projection,projectionTarget,3,dt);projectionTrail.visible=Boolean(projectDispatch)&&projection>.01&&!isExhibitOpen();projectionTrail.material.opacity=projection*.5;if(projectDispatch&&!isExhibitOpen()){projectDispatch.artifact.group.position.copy(projectPath.getPoint(Math.min(projection*1.2,1)));projectDispatch.artifact.group.scale.copy(projectDispatch.scale).multiplyScalar(1+projection*.22);}
 robot.getWorldPosition(robotProjection);robotProjection.y+=3.5;robotProjection.project(camera);const hotspot=$('#robot-hotspot');hotspot.style.left=`${(robotProjection.x*.5+.5)*innerWidth}px`;hotspot.style.top=`${(-robotProjection.y*.5+.5)*innerHeight}px`;
 productElements.update({dt,time,visible:entered&&navigationDesk.focusedTitle==='Products',obscured:isExhibitOpen(),reduced:reducedQuery.matches,desk:navigationDesk.productsPane});
 servicesExperience.update();websiteExperience.update(dt,time);worldInterface.render(dt,reducedQuery.matches);const story=worldInterface.getFilm(),storyTime=story?.t()??time;const beats=story?.started()?[...story.C.cast,...story.C.crew,story.C.turn,story.C.sting]:[];const cue=beats.reduce((v,b)=>Math.max(v,Math.exp(-Math.abs(storyTime-b)*9)),0);projector.update({dt,time:storyTime,charge:projection,active:isExhibitOpen(),opening:worldInterface.opening,kind:worldInterface.kind,cue,fieldRelease:release,fieldVisible:hologramGroup.visible,projectionPoints:holographicVolume.getProjectionPoints()});if(worldInterface.skyProgress<1)composer.render();worldInterface.renderSky(renderer);
 }
 requestAnimationFrame(frame);
}
resize();renderer.compile(scene,camera);requestAnimationFrame(frame);
modelsReady.then(()=>{if(new URLSearchParams(location.search).get('view')==='services'){enter();servicesExperience.open();}const website=PRODUCTS.find(item=>item.id===new URLSearchParams(location.search).get('view')&&websiteExperience.canOpen(item));if(website){enter();returnToProducts=true;productElements.focusCard(website.id);websiteExperience.open(website);}if(new URLSearchParams(location.search).get('view')==='bridge'){enter();bridgeExperience.open({fromHistory:true});}if(new URLSearchParams(location.search).get('view')==='robot'){enter();openCompanion({fromHistory:true});}renderer.compile(scene,camera);}).finally(()=>$('#loader').classList.add('done'));
canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();announce('The graphics context was interrupted. Reload to return to the scene.');$('#fallback').hidden=false;$('#fallback h1').textContent='The scene needs a fresh start.';$('#fallback p').textContent='Reload this page to restore the graphics, or explore the work directly.'});
addEventListener('pagehide',()=>{document.removeEventListener('pointerdown',unlockInteractionEffects,true);document.removeEventListener('keydown',unlockInteractionEffects,true);servicesExperience?.dispose();websiteExperience?.dispose();productElements?.dispose();clearTimeout(entryTimer);clearTimeout(deployTimer);bridgeExperience.dispose();worldInterface.dispose();workshopInterior.dispose();droidWork.dispose();holographicVolume.dispose();opticalTable.dispose();projector.dispose();pavilionFinish.dispose();coastalWorld.dispose();palette.dispose();audio.destroy()},{once:true});
