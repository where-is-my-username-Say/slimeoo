import * as T from './vendor/three.module.js';

// Bake rigid details per material while keeping the face and hands articulated.
export function batchDetails(root, materialOverride=null) {
  root.updateMatrixWorld(true);
  const inverse=new T.Matrix4().copy(root.matrixWorld).invert(),groups=new Map();
  root.traverse(mesh=>{if(!mesh.isMesh||Array.isArray(mesh.material))return;const key=materialOverride||mesh.material;if(!groups.has(key))groups.set(key,[]);groups.get(key).push(mesh);});
  for(const [mat,meshes] of groups){
    if(meshes.length<2&&!materialOverride)continue;
    const positions=[],normals=[],colors=[],uvs=[];
    for(const mesh of meshes){const g=mesh.geometry.index?mesh.geometry.toNonIndexed():mesh.geometry.clone();g.applyMatrix4(new T.Matrix4().multiplyMatrices(inverse,mesh.matrixWorld));const p=g.attributes.position,n=g.attributes.normal,uv=g.attributes.uv,c=mesh.material.color;for(let i=0;i<p.count;i++){positions.push(p.getX(i),p.getY(i),p.getZ(i));normals.push(n.getX(i),n.getY(i),n.getZ(i));colors.push(c.r,c.g,c.b);uvs.push(uv?.getX(i)||0,uv?.getY(i)||0);}g.dispose();mesh.parent.remove(mesh);}
    const g=new T.BufferGeometry();g.userData.owned=true;g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('normal',new T.Float32BufferAttribute(normals,3));g.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));if(materialOverride)g.setAttribute('color',new T.Float32BufferAttribute(colors,3));g.computeBoundingSphere();const mesh=new T.Mesh(g,mat);mesh.castShadow=meshes.some(m=>m.castShadow);mesh.receiveShadow=meshes.some(m=>m.receiveShadow);root.add(mesh);
  }
}
