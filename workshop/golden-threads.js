import * as THREE from 'three';
import { stageShader } from './stage-space.js';

// Bridge the original YggThreads numeric ribbon buffers across Three versions.
// Animation, reveal, pruning, morph widths and HDR colors remain source-owned.
export function createGoldenThreads({ scene, getSystem, getFilm, getStage }) {
  const placement = new THREE.Group();
  placement.name = 'Original golden YggThreads';
  placement.scale.setScalar(1);
  placement.position.set(0, 1.9, 0);
  const group = new THREE.Group();
  group.matrixAutoUpdate = false;
  placement.add(group);
  scene.add(placement);
  const records = new Map(),canopyRecords=new Map();
  const inverseGroup = new THREE.Matrix4();
  const viewport = new THREE.Vector4();
  let source = null;
  let disposed = false;

  function remove(record) {
    group.remove(record.mesh);
    record.mesh.geometry.dispose();
    record.mesh.material.dispose();
  }

  function clear() {
    for (const record of records.values()) remove(record);
    records.clear();for(const r of canopyRecords.values())remove(r);canopyRecords.clear();
  }

  function create(thread) {
    const geometry = new THREE.BufferGeometry();
    const material = new THREE.ShaderMaterial({
      uniforms: {
        uAlpha: { value: 1 },
        uTree: { value: 0 },uRoot:{value:new THREE.Vector3()},
        uRes2: { value: new THREE.Vector2(1, 1) },
        uMinPx: { value: 0.75 },
      },
      vertexShader: `
        attribute vec3 aCol;
        attribute vec3 aTan;
        attribute float aSide;
        attribute float aHW;
        attribute float aAlong;
        ${stageShader}
        varying float vAlong;
        uniform vec2 uRes2;
        uniform float uMinPx;
        varying vec3 vC;
        varying float vS;
        void main() {
          vAlong=aAlong;
          vC = aCol; vS = aSide;
          vec3 p=stagePosition(position);
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          vec3 tangent=(stagePosition(position+aTan*.01)-p)*100.;
          vec3 tv = (modelViewMatrix * vec4(tangent, 0.0)).xyz;
          vec3 vd = normalize(-mv.xyz);
          vec3 ax = cross(tv, vd);
          float L = length(ax);
          vec3 off = L > 1e-6 ? ax / L : vec3(1.0, 0.0, 0.0);
          float pxPerWorld = projectionMatrix[1][1] * uRes2.y * 0.5 / max(-mv.z, 1e-4);
          float hw = max(aHW*mix(1.35,1.0,uTree), uMinPx / max(pxPerWorld, 1e-6));
          mv.xyz += off * aSide * hw;
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: `
        varying vec3 vC;
        varying float vS;
        uniform float uAlpha;
        varying float vAlong;
        void main() {
          float e = max(1.0 - abs(vS), 0.0);
          float prof = e * e * (3.0 - 2.0 * e);
          float terminal=smoothstep(0.,.025,vAlong)*(1.-smoothstep(.975,1.,vAlong));
          gl_FragColor = vec4(vC * prof * uAlpha * terminal, uAlpha * terminal);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
      fog: false,
      toneMapped: false,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = `Ygg ribbon ${thread.id}`;
    mesh.matrixAutoUpdate = false;
    mesh.frustumCulled = false;
    mesh.onBeforeRender = renderer => {
      renderer.getCurrentViewport(viewport);
      material.uniforms.uRes2.value.set(viewport.z, viewport.w);
    };
    group.add(mesh);
    return { mesh };
  }

  function copyAttribute(geometry, name, attribute) {
    const previous = name === 'index' ? geometry.index : geometry.getAttribute(name);
    // Typed arrays from the source iframe belong to a different realm; recreate them here.
    const ArrayType = name === 'index' ? (attribute.array.BYTES_PER_ELEMENT > 2 ? Uint32Array : Uint16Array) : Float32Array;
    if (!previous || previous.array.length !== attribute.array.length ||
        previous.itemSize !== attribute.itemSize || previous.array.constructor !== ArrayType) {
      const next = new THREE.BufferAttribute(new ArrayType(attribute.array), attribute.itemSize, attribute.normalized);
      next.setUsage(THREE.DynamicDrawUsage);
      if (name === 'index') geometry.setIndex(next);
      else geometry.setAttribute(name, next);
    } else {
      previous.array.set(attribute.array);
      previous.needsUpdate = true;
    }
  }

  function updateCanopy(stage){
    const canopy=source.canopy;if(!canopy)return;
    for(const original of [canopy.litMesh,canopy.capMesh,canopy.sp?.pts]){
      if(!original)continue;let r=canopyRecords.get(original);
      if(!r){
        const mat=original.material;
        const vertex=stageShader+'\nuniform float uStageScale;\n'+mat.vertexShader.replace('vec4(position, 1.0)','vec4(stagePosition(position), 1.0)').replace('q * aScale * vB','q * aScale * vB * .32 * uStageScale').replace('aSize * pxPerWorld','aSize * .32 * uStageScale * pxPerWorld');
        const material=new THREE.ShaderMaterial({vertexShader:vertex,fragmentShader:mat.fragmentShader,uniforms:{uTree:{value:1},uRoot:{value:new THREE.Vector3()},uStageScale:{value:1},uAlpha:{value:0},uMatte:{value:new THREE.Vector4()},uRes2:{value:new THREE.Vector2()}},transparent:true,depthWrite:false,depthTest:true,side:THREE.DoubleSide,blending:mat.blending,toneMapped:false});
        const geometry=new THREE.BufferGeometry(),mesh=original.isPoints?new THREE.Points(geometry,material):new THREE.Mesh(geometry,material);mesh.frustumCulled=false;mesh.renderOrder=original.renderOrder;
        mesh.onBeforeRender=renderer=>{renderer.getCurrentViewport(viewport);material.uniforms.uRes2.value.set(viewport.z,viewport.w);};group.add(mesh);r={mesh};canopyRecords.set(original,r);
      }
      r.mesh.visible=original.visible;const u=r.mesh.material.uniforms;u.uRoot.value.copy(source.spine.getPointAt(0));u.uStageScale.value=stage?.scale??1;u.uAlpha.value=original.material.uniforms.uAlpha.value*(stage?.opacity??1);
      for(const [name,attribute] of Object.entries(original.geometry.attributes))copyAttribute(r.mesh.geometry,name,attribute);
      if(original.geometry.index)copyAttribute(r.mesh.geometry,'index',original.geometry.index);
    }
  }

  function update() {
    if (disposed) return;
    const stage=getStage?.();if(stage){placement.scale.setScalar(stage.scale);placement.position.set(0,1.9*stage.scale,0).add(stage.position);}
    const next = getSystem();
    if (source !== next) {
      clear();
      source = next;
    }
    group.visible = false;
    if (!source?.group || !source.threads) return;
    // Rendering the source composer is optional: refresh its matrices ourselves.
    source.group.updateWorldMatrix(true, true);
    group.matrix.fromArray(source.group.matrixWorld.elements);
    inverseGroup.copy(group.matrix).invert();
    let visible = true;
    for (let parent = source.group; parent; parent = parent.parent) visible &&= parent.visible;
    group.visible = visible;
    updateCanopy(stage);
    const live = new Set(source.threads);
    for (const [thread, record] of records) {
      if (!live.has(thread)) { remove(record); records.delete(thread); }
    }
    for (const thread of source.threads) {
      const original = thread.rib?.geo;
      if (!original || !thread.line) continue;
      let record = records.get(thread);
      if (!record) { record = create(thread); records.set(thread, record); }
      const { mesh } = record;
      mesh.visible = thread.line.visible;
      mesh.renderOrder = thread.line.renderOrder;
      mesh.matrix.fromArray(thread.line.matrixWorld.elements).premultiply(inverseGroup);
      const film=getFilm?.();const C=film?.C;const phase=C?THREE.MathUtils.smoothstep(film.t(),C.preTurn,C.turn+6):0;mesh.material.uniforms.uTree.value=phase;mesh.material.uniforms.uRoot.value.copy(source.spine.getPointAt(0));
      mesh.material.uniforms.uAlpha.value = (thread.mat?.uniforms?.uAlpha?.value ?? 1)*(stage?.opacity??1);
      mesh.material.uniforms.uMinPx.value = Math.max(0.75, thread.mat?.uniforms?.uMinPx?.value ?? 0.75);
      if (!visible || !mesh.visible) continue;
      for (const name of ['position', 'aCol', 'aTan', 'aSide', 'aHW']) {
        copyAttribute(mesh.geometry, name, original.attributes[name]);
      }
      if(!mesh.geometry.getAttribute('aAlong')||mesh.geometry.getAttribute('aAlong').count!==original.attributes.position.count){const n=original.attributes.position.count,along=new Float32Array(n);for(let i=0;i<n;i++)along[i]=Math.floor(i/2)/Math.max(1,n/2-1);mesh.geometry.setAttribute('aAlong',new THREE.BufferAttribute(along,1));}
      if (original.index) copyAttribute(mesh.geometry, 'index', original.index);
      mesh.geometry.setDrawRange(original.drawRange.start, original.drawRange.count);
    }
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    clear();
    scene.remove(placement);
    source = null;
  }

  return { update, dispose };
}
