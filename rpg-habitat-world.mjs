import * as T from './vendor/three.module.js';
import {HABITATS} from './rpg-habitats.mjs';
import {SPECIES} from './rpg-content.mjs';
import {meadowHeight,PONDS,pondRadius,trailAmount} from './meadow-map.mjs';
import {batchDetails} from './rpg-geometry.mjs';

export function makeHabitats(scene){
 const root=new T.Group(),groups=[],materials=new Map(),textures=[];scene.add(root);
 const geos={ball:new T.IcosahedronGeometry(1,1),stem:new T.CylinderGeometry(.7,1,1,7),cap:new T.SphereGeometry(1,12,8,0,Math.PI*2,0,Math.PI/2),crystal:new T.OctahedronGeometry(1),ring:new T.TorusGeometry(1,.14,5,16),board:new T.BoxGeometry(1,1,1)};
 const material=color=>{if(!materials.has(color))materials.set(color,new T.MeshStandardMaterial({color,roughness:.95}));return materials.get(color);};
 function part(group,type,color,x,y,z,sx,sy,sz){const mesh=new T.Mesh(geos[type],material(color));mesh.position.set(x,y,z);mesh.scale.set(sx,sy,sz);mesh.receiveShadow=true;group.add(mesh);return mesh;}
 for(const h of HABITATS){
  const group=new T.Group();root.add(group);groups.push({group,x:h.x,z:h.z});
  const species=SPECIES.find(s=>s.id===h.species);
  const canvas=document.createElement('canvas');canvas.width=768;canvas.height=224;
  const c=canvas.getContext('2d');c.fillStyle='#3c443b';c.fillRect(0,0,768,224);c.strokeStyle='#8d9278';c.lineWidth=7;c.strokeRect(9,9,750,206);
  c.textAlign='center';c.fillStyle='#d2c8ad';c.font='bold 38px Georgia';c.fillText(h.name,384,66,716);
  c.font='28px system-ui';c.fillStyle='#b4c1aa';c.fillText(species.name,384,116,700);c.font='23px system-ui';c.fillText('DEW 1   /   BRIAR 5   /   ELDER 10',384,174,700);
  const texture=new T.CanvasTexture(canvas);texture.encoding=T.sRGBEncoding;textures.push(texture);
  const signMat=new T.MeshBasicMaterial({map:texture,side:T.DoubleSide});materials.set('sign-'+h.species,signMat);
  const sign=new T.Mesh(new T.PlaneGeometry(4.4,1.28),signMat),sx=h.entryX,sz=h.entryZ+2.2,sy=meadowHeight(sx,sz);
  sign.position.set(sx,sy+2.15,sz);sign.rotation.y=h.x<50?-Math.PI/2:Math.PI/2;group.add(sign);
  part(group,'stem','#625746',sx,sy+1,sz,.16,2,.16);
  // Small ground details supplement the collidable rocks and tree belts in meadow-map.
  for(let i=0;i<13;i++){
   const angle=i*2.399963+h.index*.4,r=12.5+(i%3)*1.35,x=h.x+Math.cos(angle)*r,z=h.z+Math.sin(angle)*r;
   if(PONDS.some(p=>pondRadius(p,x,z)<1.4)||trailAmount(x,z)>.16)continue;
   const y=meadowHeight(x,z),s=.65+(i%4)*.12;
   if(['mushrooms','moss'].includes(h.theme)){
    part(group,'stem','#ac9e84',x,y+.23*s,z,.12*s,.46*s,.12*s);
    part(group,'cap',h.theme==='moss'?'#849075':'#9a7467',x,y+.43*s,z,.55*s,.27*s,.55*s);
    part(group,'ball','#c0b496',x+.17*s,y+.67*s,z-.1*s,.07,.035,.07);
   }else if(h.theme==='crystal'){
    const gem=part(group,'crystal',h.color,x,y+.45*s,z,.25*s,.65*s,.28*s);gem.rotation.z=.2*Math.sin(i);
    part(group,'crystal','#a2aaa5',x+.32,y+.25*s,z+.1,.18,.35*s,.2);
   }else if(['reeds','flowers','bramble'].includes(h.theme)){
    for(let k=0;k<4;k++){
     const stem=part(group,'stem','#586c52',x+k*.14,y+.27*s,z+Math.sin(k)*.2,.025,.54*s,.025);stem.rotation.z=(k-1.5)*.16;
     if(h.theme==='flowers')part(group,'ball',h.index%2?'#a38b9d':'#b8aa78',x+k*.14,y+.55*s,z+Math.sin(k)*.2,.13,.07,.13);
     if(h.theme==='reeds')part(group,'stem','#84755c',x+k*.14,y+.59*s,z+Math.sin(k)*.2,.06,.16,.06);
    }
   }else if(['nest','roost','den'].includes(h.theme)){
    const nest=part(group,'ring','#81725a',x,y+.13,z,.7*s,.7*s,.40*s);nest.rotation.x=Math.PI/2;
    if(h.theme!=='den')for(let k=0;k<3;k++)part(group,'ball','#aca993',x+(k-1)*.2,y+.13,z,.13,.17,.13);
   }else if(['grove','ruins'].includes(h.theme)){
    const stone=part(group,'board',h.theme==='grove'?'#72634d':'#878b7d',x,y+.18,z,.65*s,.36,.75*s);stone.rotation.y=angle;
    part(group,'ball','#637457',x,y+.36,z,.4*s,.065,.38*s);
   }else{
    part(group,'ball',h.theme==='ash'?'#575955':h.color,x,y+.08,z,.65*s,.13,.5*s);
   }
  }
  batchDetails(group);group.updateMatrixWorld(true);group.traverse(o=>{o.matrixAutoUpdate=false;});
 }
 return {update(camera){for(const h of groups)h.group.visible=(camera.position.x-h.x)**2+(camera.position.z-h.z)**2<85*85;},dispose(){root.traverse(o=>o.geometry?.dispose());for(const g of Object.values(geos))g.dispose();for(const m of materials.values())m.dispose();for(const t of textures)t.dispose();scene.remove(root);}};
}
