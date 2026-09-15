import * as THREE from 'three';

// Shared, original brush marks: broad washes with a quiet broken bristle edge.
// Everything is generated locally, and a fixed seed keeps the finish stable.
function paintedCanvas() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 512;
  const ctx = canvas.getContext('2d');
  let seed = 0x716ab53;
  const random = () => {
    seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5;
    return (seed >>> 0) / 4294967296;
  };
  ctx.fillStyle = '#909090';
  ctx.fillRect(0, 0, 512, 512);
  // Wrapped marks produce a seamless field without a visible tile boundary.
  for (let i = 0; i < 150; i++) {
    const x = random() * 512, y = random() * 512;
    const width = 30 + random() * 140, height = 5 + random() * 33;
    const value = Math.round(65 + random() * 140);
    ctx.fillStyle = `rgba(${value},${value},${value},0.11)`;
    for (const dx of [-512, 0, 512]) for (const dy of [-512, 0, 512]) {
      ctx.beginPath();
      ctx.ellipse(x + dx, y + dy, width, height, -.16, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  for (let i = 0; i < 1800; i++) {
    const x = random() * 512, y = random() * 512;
    const length = 2 + random() * 27;
    ctx.strokeStyle = random() > .48 ? 'rgba(235,231,222,.08)' : 'rgba(44,52,52,.07)';
    ctx.lineWidth = .5 + random() * .8;
    for (const dx of [-512, 0, 512]) for (const dy of [-512, 0, 512]) {
      ctx.beginPath(); ctx.moveTo(x + dx, y + dy);
      ctx.lineTo(x + dx + length, y + dy - length * .12);
      ctx.stroke();
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = 4;
  return texture;
}

// World projection avoids stretching on long beams, caps, tubes and rounded
// boxes. Lighting, fog, shadow maps and tone mapping remain Three's own code.
function addPaint(material, texture, strength, scale, metallic = false) {
  material.onBeforeCompile = shader => {
    shader.uniforms.uIllustratedPaint = { value: texture };
    shader.uniforms.uIllustratedStrength = { value: strength };
    shader.uniforms.uIllustratedScale = { value: scale };
    shader.vertexShader = shader.vertexShader.replace('#include <common>', `
      #include <common>
      varying vec3 vIllustratedPosition;
      varying vec3 vIllustratedNormal;
    `).replace('#include <project_vertex>', `
      #include <project_vertex>
      vec4 illustratedPosition = vec4(transformed, 1.0);
      #ifdef USE_INSTANCING
        illustratedPosition = instanceMatrix * illustratedPosition;
      #endif
      vIllustratedPosition = (modelMatrix * illustratedPosition).xyz;
      vIllustratedNormal = inverseTransformDirection(transformedNormal, viewMatrix);
    `);
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', `
      #include <common>
      uniform sampler2D uIllustratedPaint;
      uniform float uIllustratedStrength;
      uniform float uIllustratedScale;
      varying vec3 vIllustratedPosition;
      varying vec3 vIllustratedNormal;
      float illustratedSample(vec3 p, vec3 weights) {
        return dot(vec3(texture2D(uIllustratedPaint, p.yz).r,
          texture2D(uIllustratedPaint, p.zx).r,
          texture2D(uIllustratedPaint, p.xy).r), weights);
      }
    `).replace('#include <map_fragment>', `
      #include <map_fragment>
      vec3 paintWeights = pow(abs(normalize(vIllustratedNormal)), vec3(4.0));
      paintWeights /= max(dot(paintWeights, vec3(1.0)), 0.0001);
      vec3 paintPosition = vIllustratedPosition * uIllustratedScale;
      float wash = illustratedSample(paintPosition, paintWeights) - 0.55;
      float bristle = illustratedSample(paintPosition * 4.73 + vec3(0.31, 0.79, 0.17), paintWeights) - 0.55;
      float broadWash = sin(paintPosition.x * 1.17 + paintPosition.z * .83)
        * sin(paintPosition.y * .71 - paintPosition.z * 1.37);
      float paintedValue = wash * .9 + bristle * .25 + broadWash * .065;
      diffuseColor.rgb *= 1.0 + paintedValue * uIllustratedStrength;
      diffuseColor.rgb *= mix(vec3(.98, 1.0, 1.015), vec3(1.02, 1.0, .975),
        clamp(.5 + paintedValue * 3.0, 0.0, 1.0));
    `);
    if (metallic) shader.fragmentShader = shader.fragmentShader.replace('#include <roughnessmap_fragment>', `
      #include <roughnessmap_fragment>
      roughnessFactor = clamp(roughnessFactor + paintedValue * .32, .24, .95);
    `);
  };
  material.customProgramCacheKey = () => `illustrated-paint-v1-${metallic}`;
  return material;
}

export function createIllustratedMaterials() {
  const texture = paintedCanvas();
  // The workshop shares the companion's material language: formed enamel,
  // sage ceramic and satin metal. Keep the original hand-painted variation,
  // but allow continuous lighting to describe the bevels and fitted joints.
  const enamel = (color, roughness, strength = .3, scale = .23, clearcoat = .12) =>
    addPaint(new THREE.MeshPhysicalMaterial({
      color, roughness, metalness: .035, clearcoat, clearcoatRoughness: .38,
    }), texture, strength, scale);
  const matte = (color, roughness, strength, scale = .3) =>
    addPaint(new THREE.MeshStandardMaterial({ color, roughness, metalness: 0 }), texture, strength, scale);
  const metal = (color, roughness, metalness, strength) =>
    addPaint(new THREE.MeshStandardMaterial({ color, roughness, metalness }), texture, strength, .34, true);
  const materials = {
    ivory: enamel(0xe7e1cd, .5, .32),
    ceramic: enamel(0xb4c0b9, .56, .3, .31, .08),
    graphite: metal(0x263f43, .48, .4, .3),
    dark: matte(0x14232a, .72, .18),
    bronze: metal(0xb68b54, .4, .65, .35),
    leather: matte(0xb8633e, .72, .65, .58),
    floor: matte(0xc8c5ae, .86, .38, .16),
    foliage: matte(0x3d6863, .72, .42, .35),
  };
  return {
    ...materials,
    dispose() {
      Object.values(materials).forEach(material => material.dispose());
      texture.dispose();
    },
  };
}
