/**
 * SSAOPass replaces every mesh's material with MeshNormalMaterial. Transparent
 * optical surfaces must not contribute opaque depth, especially meshes whose
 * visible shader consumes world-space positions. Keep the room's physical AO.
 */
export function usePhysicalOcclusion(pass, scene) {
  const original = pass.render;
  const hidden = [];
  pass.render = function (...args) {
    scene.traverse(object => {
      if (!object.isMesh || !object.visible) return;
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      if (materials.some(material => material?.transparent || material?.visible === false)) {
        hidden.push(object);
        object.visible = false;
      }
    });
    try { return original.apply(this, args); }
    finally {
      for (const object of hidden) object.visible = true;
      hidden.length = 0;
    }
  };
  return () => { pass.render = original; };
}
