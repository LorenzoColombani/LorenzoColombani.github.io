import * as THREE from 'three';
import { RoundedBoxGeometry } from './vendor/RoundedBoxGeometry.js';

// The square optical surface is the visible source of the volume: fine etched
// matrix, traveling traces and sparse upward light, without a solid beam cone.
export function createProjector(scene) {
  const group = new THREE.Group(); group.name = 'Workshop / square optical emitter';
  group.position.y = 1.89; scene.add(group);
  const geometries = new Set(), materials = new Set(), textures = new Set();
  function add(geometry, material, y = 0) {
    geometries.add(geometry); materials.add(material);
    const mesh = new THREE.Mesh(geometry, material); mesh.position.y = y;
    mesh.raycast = () => {}; group.add(mesh); return mesh;
  }
  const base = add(new RoundedBoxGeometry(3.48, .14, 3.48, 4, .055), new THREE.MeshStandardMaterial({ color: 0x0b252f, roughness: .21, metalness: .58 }), -.085);
  base.receiveShadow = true;
  const etching=document.createElement('canvas');etching.width=etching.height=1024;
  const ink=etching.getContext('2d');ink.fillStyle='#000';ink.fillRect(0,0,1024,1024);ink.strokeStyle='#b0b0b0';ink.lineWidth=1;
  for(const sx of [-1,1])for(const sy of [-1,1]){
    const X=x=>512+sx*x,Y=y=>512+sy*y;
    for(let row=0;row<5;row++){
      const x=84+row*45,y=52+row*29;
      ink.beginPath();ink.moveTo(X(x),Y(y));ink.lineTo(X(x),Y(y+75));ink.lineTo(X(x+26),Y(y+101));ink.lineTo(X(330),Y(y+101));ink.stroke();
      ink.fillStyle='#999';ink.fillRect(X(x)-2,Y(y)-2,4,4);
    }
    ink.fillStyle='#adadad';ink.fillRect(X(185)-36,Y(105)-10,72,20);
    ink.fillStyle='#646464';ink.fillRect(X(244)-28,Y(218)-17,56,34);
    for(let i=0;i<8;i++)ink.fillRect(X(198+i*7),Y(270),2,12);
    ink.strokeRect(X(322)-14,Y(322)-14,28,28);
    ink.beginPath();ink.moveTo(X(305),Y(322));ink.lineTo(X(254),Y(322));ink.lineTo(X(228),Y(348));ink.stroke();
  }
  const etchTexture=new THREE.CanvasTexture(etching);textures.add(etchTexture);
  const uniforms = { time: { value: 0 }, power: { value: .15 }, tint: { value: new THREE.Color(0x9bdaee) }, opening: { value: 0 }, etching:{value:etchTexture} };
  const surfaceMaterial = new THREE.ShaderMaterial({
    uniforms, transparent: true, depthWrite: false,
    vertexShader: `varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader: `varying vec2 vUv;uniform float time,power,opening;uniform vec3 tint;uniform sampler2D etching;
      float line(float x,float width){return 1.-smoothstep(width,width+fwidth(x),abs(x));}
      void main(){vec2 p=vUv*2.-1.;vec2 g=abs(fract(vUv*32.-.5)-.5)/max(fwidth(vUv*32.),vec2(.0001));
      float grid=1.-min(min(g.x,g.y),1.);
      float border=line(max(abs(p.x),abs(p.y))-.945,.006);
      float inner=line(max(abs(p.x),abs(p.y))-.82,.002);
      float aperture=exp(-dot(p,p)*4.0),track=0.;
      for(int i=0;i<4;i++){float offset=float(i)*.38-.57;
        float scan=fract(time*.08+float(i)*.23)*2.-1.;
        track+=line(p.x-offset,.003)*exp(-pow((p.y-scan)/.14,2.));}
      float corners=step(.78,abs(p.x))*line(abs(p.y)-.945,.013)+step(.78,abs(p.y))*line(abs(p.x)-.945,.013);
      float etch=texture2D(etching,vUv).r;
      vec3 c=vec3(.49,.80,.93)*(.88+power*.25)*(1.-etch*.70);
      c+=tint*(grid*.025+inner*.10+aperture*.18);
      c+=vec3(.75,1.65,2.0)*(border*.52+corners*.40+track*(.6+power));
      c+=vec3(.52,.32,.13)*line(p.y-(opening*1.8-.9),.004)*power*.22;
      gl_FragColor=vec4(c,.95);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
      }`,
  });
  const surface = add(new THREE.PlaneGeometry(3.39, 3.39), surfaceMaterial, -.002); surface.rotation.x = -Math.PI / 2;
  add(new RoundedBoxGeometry(3.40, .012, 3.40, 3, .004), new THREE.MeshPhysicalMaterial({
    color: 0x81b6cf, metalness: .25, roughness: .12, clearcoat: .8, transparent: true, opacity: .10, depthWrite: false,
  }), .009);
  const seeds = new Float32Array(144 * 3);
  for (let i = 0; i < 144; i++) { seeds[i * 3] = i / 144; seeds[i * 3 + 1] = (i * .618033) % 1; seeds[i * 3 + 2] = (i * .381966) % 1; }
  const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.BufferAttribute(seeds, 3)); geometries.add(geometry);
  const moteMaterial = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { time: { value: 0 }, power: { value: 0 }, tint: { value: new THREE.Color(0x9ce5ff) } },
    vertexShader: `uniform float time,power;varying float alpha;
      void main(){float h=fract(position.x+time*.12);float a=position.y*6.283;
      float r=mix(1.42,.45,h)*(.35+position.z*.65);
      vec3 p=vec3(cos(a)*r,.03+h*1.45,sin(a)*r);
      vec4 mv=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mv;
      gl_PointSize=clamp(15./-mv.z,1.,2.5);alpha=power*sin(h*3.14159)*.38;}`,
    fragmentShader: `uniform vec3 tint;varying float alpha;void main(){float a=1.-smoothstep(.02,.48,length(gl_PointCoord-.5));gl_FragColor=vec4(tint,alpha*a);}`,
  }); materials.add(moteMaterial);
  const motes = new THREE.Points(geometry, moteMaterial); motes.frustumCulled = false; motes.raycast = () => {}; group.add(motes);
  // The volume itself owns the light between this surface and its form.
  // This footprint is only the same moving shape registered on the emitter.
  const footprintGeometry=new THREE.BufferGeometry();footprintGeometry.setAttribute('position',new THREE.BufferAttribute(new Float32Array(24*3),3));geometries.add(footprintGeometry);
  const footprintMaterial=new THREE.LineBasicMaterial({color:0x7bbacf,transparent:true,opacity:.5,depthWrite:false});materials.add(footprintMaterial);
  const footprint=new THREE.LineLoop(footprintGeometry,footprintMaterial);footprint.raycast=()=>{};scene.add(footprint);
  const cool = new THREE.Color(0x6cc6e7), warm = new THREE.Color(0xe4bd82);
  let previousActive = false, surge = 0, disposed = false;
  return {
    objects:[group,footprint],
    update({ dt, time, charge, active, opening = 0, kind = 'field', cue = 0, fieldRelease = 0, fieldVisible = true, projectionPoints = [] }) {
      if (active && !previousActive) surge = 1; previousActive = active;
      surge = Math.max(0, surge - dt * 1.5);
      const power = Math.max(active ? .4 : .18 + charge * .7, surge, cue, fieldRelease * .85);
      uniforms.time.value = time; uniforms.power.value = power; uniforms.opening.value = opening;
      uniforms.tint.value.copy(kind === 'tva' && active ? warm : cool);
      moteMaterial.uniforms.time.value = time;
      moteMaterial.uniforms.power.value = fieldVisible ? .32 + power * .35 : active ? .24 : 0;
      moteMaterial.uniforms.tint.value.copy(uniforms.tint.value);
      footprint.visible=fieldVisible&&projectionPoints.length===24;
      for(let i=0;i<projectionPoints.length&&i<24;i++){
        const point=projectionPoints[i],x=THREE.MathUtils.clamp(point.x*.76,-1.55,1.55),z=THREE.MathUtils.clamp(point.z*.76,-1.55,1.55);
        footprintGeometry.attributes.position.setXYZ(i,x,1.922,z);
      }
      footprintGeometry.attributes.position.needsUpdate=true;
    },
    dispose() {
      if (disposed) return; disposed = true; group.removeFromParent();footprint.removeFromParent();
      geometries.forEach(geometry => geometry.dispose()); materials.forEach(material => material.dispose());textures.forEach(texture=>texture.dispose());
    },
  };
}
