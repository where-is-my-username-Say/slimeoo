import * as T from './vendor/three.module.js';
import {NPCS} from './rpg-content.mjs';
import {meadowHeight} from './meadow-map.mjs';
import {slimeModel,weaponModel} from './rpg-actors.mjs';
import {batchDetails} from './rpg-geometry.mjs';
import {VILLAGE_BUILDINGS,VILLAGE_SOLIDS,VILLAGE_CENTER,wallSegments,villagePoint} from './rpg-village-layout.mjs';

export function makeVillage(scene){
 const root=new T.Group(),npcs=new Map(),animated=[],materials=new Map();scene.add(root);
 const box=new T.BoxGeometry(1,1,1),sphere=new T.SphereGeometry(1,12,8),cylinder=new T.CylinderGeometry(1,1,1,12);
 function material(color,emissive=false){const key=color+emissive;if(!materials.has(key))materials.set(key,new T.MeshToonMaterial({color,emissive:emissive?color:'#000000',emissiveIntensity:emissive?.5:0}));return materials.get(key);}
 function mesh(parent,geometry,color,x=0,y=0,z=0,sx=1,sy=1,sz=1){const m=new T.Mesh(geometry,material(color));m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
 const block=(p,c,x,y,z,w,h,d)=>mesh(p,box,c,x,y,z,w,h,d);
 function beam(p,a,b,r=.08,c='#6d5039'){const from=new T.Vector3(...a),to=new T.Vector3(...b),m=mesh(p,cylinder,c,...from.clone().add(to).multiplyScalar(.5).toArray(),r,from.distanceTo(to),r);m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),to.sub(from).normalize());return m;}
 function sign(p,text,x,y,z,w=4.8){const canvas=document.createElement('canvas');canvas.width=768;canvas.height=128;const ctx=canvas.getContext('2d');ctx.fillStyle='#443d31';ctx.fillRect(0,0,768,128);ctx.strokeStyle='#c8b386';ctx.lineWidth=5;ctx.strokeRect(8,8,752,112);ctx.fillStyle='#fff1ca';ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='bold 42px Georgia';ctx.fillText(text,384,69,720);const map=new T.CanvasTexture(canvas);map.encoding=T.sRGBEncoding;const m=new T.Mesh(new T.PlaneGeometry(w,.8),new T.MeshBasicMaterial({map,side:T.DoubleSide}));m.position.set(x,y,z);p.add(m);}
 function window(p,x,y,z){block(p,'#6b503b',x,y,z,1.48,1.65,.13);block(p,'#7a9b94',x,y,z+.08,1.20,1.36,.04);block(p,'#b6ab90',x,y,z+.12,.065,1.42,.035);block(p,'#b6ab90',x,y,z+.12,1.24,.065,.035);for(const side of [-1,1])block(p,'#6c8d73',x+side*.86,y,z+.04,.28,1.55,.12);block(p,'#977550',x,y-.9,z+.12,1.8,.18,.42);for(let i=-1;i<2;i++){mesh(p,sphere,'#77935b',x+i*.38,y-.75,z+.23,.26,.20,.22);mesh(p,sphere,i===0?'#e5bc86':'#c394a1',x+i*.38,y-.54,z+.23,.09,.09,.09);}}
 function lantern(p,x,y,z){beam(p,[x,y+.3,z],[x,y+.65,z-.25],.04);block(p,'#4f554b',x,y,z,.32,.47,.30);const glow=block(p,'#ffe0a3',x,y,z+.16,.23,.31,.025);glow.material=material('#ffe0a3',true);mesh(p,new T.ConeGeometry(.25,.2,4),'#5b6255',x,y+.33,z).rotation.y=Math.PI/4;}
 function roof(p,b){
  const rise=b.id==='mallow'?2.5:2.1,half=b.w/2+.6,len=Math.hypot(half,rise),angle=Math.atan2(rise,half);
  for(const side of [-1,1]){const slope=block(p,b.roof,side*half/2,b.h+rise/2,0,len,.18,b.d+1.2);slope.rotation.z=-side*angle;
   beam(p,[side*half,b.h,-b.d/2-.65],[side*half,b.h,b.d/2+.65],.10);
   for(let row=1;row<=6;row++){const f=row/7;beam(p,[side*half*f,b.h+rise*(1-f)+.12,-b.d/2-.6],[side*half*f,b.h+rise*(1-f)+.12,b.d/2+.6],.028,b.roof);}
  }
  beam(p,[0,b.h+rise,-b.d/2-.7],[0,b.h+rise,b.d/2+.7],.13);
  const triangle=new T.Shape();triangle.moveTo(-b.w/2,0);triangle.lineTo(b.w/2,0);triangle.lineTo(0,rise-.18);triangle.closePath();const g=new T.ShapeGeometry(triangle);
  for(const side of [-1,1]){const m=mesh(p,g,b.wall,0,b.h,side*b.d/2);m.material=material(b.wall).clone();m.material.side=T.DoubleSide;beam(p,[-b.w/2,b.h,side*(b.d/2+.04)],[0,b.h+rise-.18,side*(b.d/2+.04)],.09);beam(p,[b.w/2,b.h,side*(b.d/2+.04)],[0,b.h+rise-.18,side*(b.d/2+.04)],.09);}
 }
 function bench(p,x,z,w=2.6){block(p,'#8d6b49',x,.72,z,w,.15,.64);for(const side of [-1,1])block(p,'#72583d',x+side*(w/2-.22),.36,z,.16,.72,.5);}
 function shelf(p,x,z,kind){
  for(const y of [.65,1.55,2.45])block(p,'#866749',x,y,z,2.9,.12,.55);
  for(const side of [-1,1])block(p,'#70553d',x+side*1.42,1.35,z,.12,2.7,.55);
  for(let row=0;row<3;row++)for(let col=0;col<5;col++){
   const xx=x-1.1+col*.53,yy=.91+row*.9;
   if(kind==='bottles'){mesh(p,sphere,['#9ac69c','#bd9ec8','#d9b477'][(row+col)%3],xx,yy,z,.14,.20,.14);mesh(p,cylinder,'#9f865e',xx,yy+.22,z,.055,.13,.055);}
   else if(kind==='books'){block(p,['#a78274','#7f9d8a','#b5a275','#9382a4'][col%4],xx,yy+.09,z,.31,.54,.32);block(p,'#d4c49f',xx,yy+.09,z+.17,.25,.42,.02);}
   else block(p,['#a88260','#aeb395','#c6a78b'][col%3],xx,yy,z,.36,.38,.35);
  }
 }
 function table(p,x,z,w=2.6,d=1.2){block(p,'#9a7854',x,1,z,w,.16,d);for(const xx of [-1,1])for(const zz of [-1,1])block(p,'#76583d',x+xx*(w/2-.18),.5,z+zz*(d/2-.15),.12,1,.12);}
 for(const b of VILLAGE_BUILDINGS){
  const ground=meadowHeight(b.x,b.z),place=new T.Group();place.position.set(b.x,ground,b.z);place.rotation.y=b.yaw;root.add(place);
  block(place,'#9c9687',0,-.025,0,b.w+.5,.12,b.d+.5);
  for(let x=-b.w/2+.2;x<b.w/2;x+=.56)block(place,'#9d896b',x,.035,0,.53,.035,b.d-.3);
  for(const wall of wallSegments(b))block(place,b.wall,wall.x,b.h/2,wall.z,wall.w,b.h,wall.d);
  // The entrance is a real opening, wide enough for the largest cosmetic shape.
  block(place,b.wall,0,(b.h+3.1)/2,b.d/2,b.door,b.h-3.1,.36);
  for(const x of [-b.w/2,b.w/2])for(const z of [-b.d/2,b.d/2])block(place,'#70533c',x,b.h/2,z,.18,b.h,.18);
  for(const side of [-1,1]){block(place,'#70533c',side*(b.door/2+.06),1.6,b.d/2,.15,3.2,.45);const flank=new T.Group();flank.position.set(side*b.w/2,0,0);flank.rotation.y=side*Math.PI/2;place.add(flank);window(flank,0,2.25,.20);}
  block(place,'#70533c',0,3.17,b.d/2,b.door+.32,.17,.46);
  const openDoor=new T.Group();openDoor.position.set(-b.door/2,0,b.d/2+.22);openDoor.rotation.y=-Math.PI*.49;place.add(openDoor);block(openDoor,'#98724f',b.door*.23,1.45,0,b.door*.46,2.9,.12);for(const y of [.65,2.2])block(openDoor,'#514f43',b.door*.23,y,.08,b.door*.4,.1,.04);
  block(place,'#a29a86',0,.015,b.d/2+.55,b.door+.8,.06,1.3);
  roof(place,b);sign(place,b.title,0,b.h-.43,b.d/2+.24,Math.min(b.w-.7,6));lantern(place,b.door/2+.5,2.3,b.d/2+.40);
  const n=NPCS.find(n=>n.id===b.id),actor=slimeModel(n.color,n.animation);actor.root.position.set(n.x,meadowHeight(n.x,n.z)+.06,n.z);actor.root.rotation.y=b.yaw;root.add(actor.root);npcs.set(n.id,actor);
  const nx=b.npc[0],nz=b.npc[1];
  if(b.id==='ember'){
   block(place,'#8f8774',-b.w/2+1.5,1.5,-b.d/2+.8,2.5,3,1.5);block(place,'#333c37',-b.w/2+1.5,1.23,-b.d/2+1.58,1.7,1.5,.05);block(place,'#a79b81',-b.w/2+1.5,4.25,-b.d/2+.8,1,3.1,1);
   const fire=mesh(place,new T.ConeGeometry(.55,.95,8),'#ffc56e',-b.w/2+1.5,1.05,-b.d/2+1.69);fire.material=material('#ffbd66',true);animated.push({mesh:fire,type:'fire'});
   block(place,'#6d5742',nx+.8,.3,nz+1,.7,.6,.6);block(place,'#52636b',nx+.8,.78,nz+1,1.2,.27,.63);mesh(place,new T.ConeGeometry(.22,.55,8),'#62717a',nx+1.55,.77,nz+1).rotation.z=-Math.PI/2;
   for(let i=0;i<4;i++){const weapon=weaponModel(i%2?'ironblade':'dewblade');weapon.position.set(b.w/2-.55,1.3,-2+i*.75);weapon.rotation.z=.12;place.add(weapon);}
   const spark=mesh(place,new T.OctahedronGeometry(.06),'#ffe5a5',nx+.8,1.05,nz+1);spark.material=material('#ffe5a5',true);animated.push({mesh:spark,type:'spark'});
  }else if(b.id==='moss'){
   shelf(place,1.6,-b.d/2+.5,'bottles');mesh(place,new T.SphereGeometry(.46,16,10),'#536757',nx+.7,.57,nz+.8,1,.8,1);mesh(place,new T.CircleGeometry(.39,20),'#b2cc85',nx+.7,.88,nz+.8).rotation.x=-Math.PI/2;
   for(let i=0;i<5;i++){beam(place,[-3+i*1.3,3.5,-2.6],[-3+i*1.3,2.9,-2.6],.018);mesh(place,sphere,'#819d68',-3+i*1.3,2.7,-2.6,.14,.30,.14);}
  }else if(b.id==='mallow'){
   table(place,nx+.7,nz+1,2,1);shelf(place,-3.8,-b.d/2+.6,'goods');for(const x of [-3.8,.2]){table(place,x,1.4,2.2,1.3);bench(place,x,2.6,2.1);mesh(place,cylinder,'#d8c79f',x,1.23,1.4,.13,.25,.13);}sign(place,'REST · FOOD · GOOD COMPANY',-1,2.7,-b.d/2+.25,5);
  }else if(b.id==='tansy'){
   table(place,nx+.7,nz+1,1.8,.75);for(let i=0;i<4;i++){const bow=weaponModel('dewbow');bow.position.set(-b.w/2+.5,1.7,-2+i*1.1);bow.rotation.y=Math.PI/2;place.add(bow);}for(let i=0;i<7;i++)beam(place,[nx+.2+i*.16,1.1,nz+.7],[nx+.2+i*.16,1.1,nz+1.3],.018,'#dfd0a5');
  }else if(b.id==='luma'){
   shelf(place,-2.6,-b.d/2+.55,'books');shelf(place,2.5,-b.d/2+.55,'bottles');const crystal=mesh(place,new T.OctahedronGeometry(.38),'#c4a7e4',nx+.7,1.8,nz+.9);animated.push({mesh:crystal,type:'float',base:1.8});mesh(place,cylinder,'#aea0b9',nx+.7,.43,nz+.9,.7,.8,.7);
   mesh(place,new T.ConeGeometry(1.6,3,16),'#736187',0,b.h+3.1,-1);mesh(place,new T.TorusGeometry(.43,.045,6,24),'#ddc083',0,b.h+4.7,-1).rotation.y=.45;
  }else if(b.id==='scrip'){
   shelf(place,-2.7,-b.d/2+.55,'goods');shelf(place,2.6,-b.d/2+.55,'goods');table(place,nx+.6,nz+1,1.8,.8);for(let i=0;i<3;i++)block(place,['#9baa88','#ba969e','#c4af79'][i],-2.7,.6+i*.13,.5,1.3,.13,.8);
  }else if(b.id==='pip'){
   block(place,'#94714e',0,2,-b.d/2+.28,4,2,.14);for(let i=0;i<5;i++)block(place,'#eddfb9',-1.5+i*.73,2+(i%2)*.17,-b.d/2+.38,.54,.85,.025);table(place,-1.9,.3,1.2,.8);
  }else{table(place,1.5,.3,2,1.3);block(place,'#e4d7b1',1.5,1.10,.3,1.8,.02,1.1);shelf(place,-1.8,-b.d/2+.5,'books');}
  const moving=animated.filter(a=>a.mesh.parent===place).map(a=>a.mesh);place.remove(...moving);batchDetails(place);place.add(...moving);
 }
 const paths=new T.Group();root.add(paths);
 function pathStrip(a,b,width=2.6){const length=Math.hypot(b.x-a.x,b.z-a.z),steps=Math.ceil(length/.75);for(let i=0;i<steps;i++){const f=(i+.5)/steps,x=a.x+(b.x-a.x)*f,z=a.z+(b.z-a.z)*f;const m=block(paths,i%2?'#99917e':'#a29b87',x,meadowHeight(x,z)+.04,z,width,.055,length/steps+.03);m.rotation.y=Math.atan2(b.x-a.x,b.z-a.z);m.castShadow=false;}}
 const plaza=mesh(paths,new T.CircleGeometry(7,48),'#a39a87',VILLAGE_CENTER.x,meadowHeight(VILLAGE_CENTER.x,VILLAGE_CENTER.z)+.045,VILLAGE_CENTER.z);plaza.rotation.x=-Math.PI/2;plaza.castShadow=false;
 for(const b of VILLAGE_BUILDINGS){const entrance=villagePoint(b,0,b.d/2+.8),approach=villagePoint(b,0,b.d/2+3);pathStrip(entrance,approach,b.door);pathStrip(approach,VILLAGE_CENTER);}
 pathStrip(VILLAGE_CENTER,{x:-9,z:15},4.1);batchDetails(paths);
 const ring=mesh(root,new T.RingGeometry(8.65,8.9,64),'#d0b77e',0,.08,0);ring.rotation.x=-Math.PI/2;ring.castShadow=false;
 const obstacles=VILLAGE_SOLIDS.map(w=>{const c=Math.abs(Math.cos(w.yaw)),s=Math.abs(Math.sin(w.yaw));return {x:w.x,z:w.z,rx:(c*w.w+s*w.d)/2,rz:(s*w.w+c*w.d)/2,height:w.height,y:meadowHeight(w.x,w.z)};});
 return {root,npcs,obstacles,update(t,camera){for(const actor of npcs.values()){actor.root.visible=!camera||actor.root.position.distanceToSquared(camera.position)<85*85;if(actor.root.visible)actor.animate(t);}for(const a of animated){if(a.type==='fire'){a.mesh.scale.y=.9+Math.sin(t*12)*.15;a.mesh.rotation.y=t*.6;}if(a.type==='float'){a.mesh.position.y=a.base+Math.sin(t*2)*.16;a.mesh.rotation.y=t*.8;}if(a.type==='spark'){const phase=(t*1.15)%1;a.mesh.visible=phase>.75&&phase<.86;}}},dispose(){for(const a of npcs.values())a.dispose();const geos=new Set(),mats=new Set();root.traverse(o=>{if(o.geometry)geos.add(o.geometry);if(o.material)mats.add(o.material);});for(const g of geos)g.dispose();for(const m of mats){m.map?.dispose();m.dispose();}scene.remove(root);}};
}
