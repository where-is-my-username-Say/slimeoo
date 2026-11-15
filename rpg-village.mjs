import * as T from './vendor/three.module.js';
import {NPCS,TOWN} from './rpg-content.mjs';
import {meadowHeight} from './meadow-map.mjs';
import {part,slimeModel,weaponModel} from './rpg-actors.mjs';
import {batchDetails} from './rpg-geometry.mjs';

export function makeVillage(scene){
 const root=new T.Group(),npcs=new Map(),animated=[],obstacles=[];scene.add(root);
 const box=new T.BoxGeometry(1,1,1),sphere=new T.SphereGeometry(1,12,8),cyl=new T.CylinderGeometry(1,1,1,12),ring=new T.TorusGeometry(1,.09,6,24);
 const mats=new Map();
 function texture(base,kind){const c=document.createElement('canvas');c.width=c.height=128;const x=c.getContext('2d');x.fillStyle=base;x.fillRect(0,0,128,128);for(let row=0;row<8;row++){for(let col=0;col<8;col++){const xx=col*20-(row%2)*10,yy=row*17;x.fillStyle=kind==='roof'?['#ffffff0c','#00000012','#ffffff18'][(row+col*3)%3]:'#ffffff0b';x.fillRect(xx,yy,19,16);x.strokeStyle='#182a2633';x.strokeRect(xx,yy,20,17);}}const tex=new T.CanvasTexture(c);tex.encoding=T.sRGBEncoding;tex.wrapS=tex.wrapT=T.RepeatWrapping;tex.anisotropy=4;return tex;}
 function material(color,kind=''){const k=color+kind;if(!mats.has(k))mats.set(k,new T.MeshStandardMaterial({color:kind?'#ffffff':new T.Color(color).convertSRGBToLinear(),map:kind?texture(color,kind):null,roughness:.85}));return mats.get(k);}
 function mesh(parent,g,c,p=[0,0,0],s=[1,1,1],kind=''){const m=new T.Mesh(g,material(c,kind));m.position.set(...p);m.scale.set(...s);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
 const block=(p,c,x,y,z,w,h,d,kind='')=>mesh(p,box,c,[x,y,z],[w,h,d],kind);
 function beam(p,a,b,r=.09,c='#68503b'){const from=new T.Vector3(...a),to=new T.Vector3(...b),m=mesh(p,cyl,c,from.clone().add(to).multiplyScalar(.5).toArray(),[r,from.distanceTo(to),r]);m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),to.sub(from).normalize());return m;}
 function sign(p,text,x,y,z,color='#d4b37c'){const c=document.createElement('canvas');c.width=512;c.height=128;const ctx=c.getContext('2d');ctx.fillStyle='#493c30';ctx.fillRect(0,0,512,128);ctx.strokeStyle=color;ctx.lineWidth=7;ctx.strokeRect(7,7,498,114);ctx.fillStyle='#fff0c9';ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='bold 43px Georgia';ctx.fillText(text,256,68,475);const tex=new T.CanvasTexture(c);tex.encoding=T.sRGBEncoding;const m=new T.Mesh(new T.PlaneGeometry(2.7,.68),new T.MeshBasicMaterial({map:tex}));m.position.set(x,y,z);p.add(m);}
 function roof(p,w,d,y,rise,color){const half=w/2+.35,angle=Math.atan2(rise,half),len=Math.hypot(half,rise);for(const side of [-1,1]){const m=block(p,color,side*half/2,y+rise/2,0,len,.18,d+.8,'roof');m.rotation.z=-side*angle;beam(p,[side*half,y,d/2+.45],[0,y+rise,d/2+.45],.10);beam(p,[side*half,y,-d/2-.45],[0,y+rise,-d/2-.45],.1);beam(p,[side*half,y,-d/2-.45],[side*half,y,d/2+.45],.09);for(let row=1;row<5;row++){const f=row/5;beam(p,[side*half*f,y+rise*(1-f)+.12,-d/2-.43],[side*half*f,y+rise*(1-f)+.12,d/2+.43],.025,color);}}beam(p,[0,y+rise,-d/2-.55],[0,y+rise,d/2+.55],.12);}
 function window(p,x,y,z,w=.75){block(p,'#614c3a',x,y,z,w+.18,1.06,.12);block(p,'#f0c77f',x,y,z+.075,w,.85,.04);block(p,'#78593e',x,y,z+.11,.055,.92,.04);block(p,'#78593e',x,y,z+.11,w,.055,.04);for(const side of [-1,1])block(p,'#6b8871',x+side*(w/2+.15),y,z+.03,.20,.98,.09);block(p,'#806144',x,y-.6,z+.14,w+.3,.22,.34);for(let i=0;i<3;i++){mesh(p,sphere,'#6c925e',[x+(i-1)*.24,y-.44,z+.17],[.2,.15,.19]);mesh(p,sphere,['#dcaa92','#e7d49a','#bfa5d5'][i],[x+(i-1)*.24,y-.30,z+.2],[.1,.1,.09]);}}
 function door(p,x,z){block(p,'#463b30',x,.94,z,1.15,1.9,.12);block(p,'#956d48',x,.90,z+.075,.91,1.75,.09);for(const xx of [-.27,0,.27])block(p,'#735237',x+xx,.90,z+.13,.025,1.7,.02);for(const y of [.37,1.35])block(p,'#3c4541',x,y,z+.15,.85,.08,.03);mesh(p,sphere,'#d4b56e',[x+.29,.9,z+.17],[.07,.07,.05]);block(p,'#b1a48a',x,.08,z+.30,1.6,.16,.8);}
 function lantern(p,x,y,z){beam(p,[x,y+.2,z],[x,y+.45,z-.25],.045);block(p,'#4b5248',x,y,z,.28,.40,.28);block(p,'#f6d78e',x,y,z+.151,.20,.27,.03);mesh(p,new T.ConeGeometry(.25,.17,4),'#566457',[x,y+.28,z],[1,1,1]).rotation.y=Math.PI/4;}
 function cottage(p,w,d,h,color,tiles){block(p,'#9c9882',0,.20,0,w+.35,.4,d+.35,'stone');block(p,color,0,h/2+.35,0,w,h,d);for(const x of [-w/2,w/2])for(const z of [-d/2,d/2])block(p,'#68503b',x,h/2+.35,z,.16,h+.15,.17);for(const y of [.48,h+.32])block(p,'#75583f',0,y,d/2+.035,w,.14,.12);
  const triangle=new T.Shape();triangle.moveTo(-w/2,0);triangle.lineTo(w/2,0);triangle.lineTo(0,1.6);triangle.closePath();const gable=new T.ExtrudeGeometry(triangle,{depth:.12,bevelEnabled:false});
  for(const z of [-d/2,d/2-.12]){mesh(p,gable,color,[0,h+.38,z]);beam(p,[0,h+.38,z+.13],[0,h+1.85,z+.13],.075);for(const side of [-1,1])beam(p,[side*w*.43,.6,z+.14],[side*w*.23,h+.3,z+.14],.055);}
  roof(p,w,d,h+.38,1.6,tiles);door(p,0,d/2+.07);window(p,-w*.31,1.85,d/2+.1);window(p,w*.31,1.85,d/2+.1);
  for(const side of [-1,1]){const flank=new T.Group();flank.position.set(side*w/2,0,-.3);flank.rotation.y=side*Math.PI/2;p.add(flank);window(flank,0,1.65,.06,.65);}
 }
 function barrel(p,x,z){mesh(p,cyl,'#926d47',[x,.5,z],[.42,.95,.42]);for(const y of [.21,.78])mesh(p,new T.TorusGeometry(.43,.045,5,12),'#4d5752',[x,y,z]).rotation.x=Math.PI/2;}
 function planter(p,x,z){mesh(p,cyl,'#9d6f55',[x,.20,z],[.32,.40,.32]);for(let i=0;i<3;i++)mesh(p,sphere,'#76955b',[x+Math.sin(i*2)*.15,.48,z+Math.cos(i*2)*.15],[.25,.24,.25]);}
 for(const n of NPCS){
  const actor=slimeModel(n.color,n.animation);actor.root.position.set(n.x,meadowHeight(n.x,n.z),n.z);actor.root.rotation.y=.25;root.add(actor.root);npcs.set(n.id,actor);
  const place=new T.Group();place.position.set(n.x,meadowHeight(n.x,n.z-4.5),n.z-4.5);root.add(place);
  if(n.id==='pip'){
   block(place,'#a2977d',0,.12,0,3.2,.24,2.6,'stone');for(const x of [-1.2,1.2])beam(place,[x,0,0],[x,2.6,0],.13);block(place,'#806044',0,1.65,0,2.6,1.7,.19);block(place,'#c7b691',0,1.65,.12,2.3,1.42,.04);roof(place,3,.5,2.6,.55,'#63866b');for(let i=0;i<4;i++)block(place,'#eee2bd',-.75+i*.49,1.7+(i%2)*.13,.16,.39,.63,.025);sign(place,'DEWBELL',0,2.6,.5);planter(place,1.7,.7);
  } else if(n.id==='ember'){
   block(place,'#8a8374',0,.15,0,6.4,.3,4.5,'stone');for(const x of [-2.7,2.7])for(const z of [-1.7,1.7])beam(place,[x,0,z],[x,3.1,z],.16);roof(place,5.8,4,3.1,1.05,'#615e67');block(place,'#988e7d',-1.3,1.35,-.6,2.3,2.7,1.9,'stone');block(place,'#333736',-1.3,1.05,.39,1.5,1.45,.09);block(place,'#b4a38a',-1.3,1.84,.5,1.9,.25,.3);block(place,'#9b8b79',-1.3,3.45,-.6,.95,2.6,.9,'stone');block(place,'#615c56',-1.3,4.85,-.6,1.2,.22,1.1);
   const fire=mesh(place,new T.ConeGeometry(.5,1,8),'#ffbc63',[-1.3,.9,.55],[1,1,1]);animated.push({m:fire,type:'fire',base:.9});
   block(place,'#47545b',1.2,.87,1,1.35,.32,.65);block(place,'#5e6260',1.2,.49,1,.55,.65,.44);beam(place,[1.2,1,1],[2,1.05,1],.13,'#56636b');for(let i=0;i<3;i++){const sword=weaponModel(['twigblade','dewblade','ironblade'][i]);sword.position.set(.55+i*.5,1.6,-1.7);sword.rotation.z=.25;place.add(sword);}barrel(place,2.6,-.8);sign(place,'WILDGLASS FORGE',.5,2.7,2.3,'#e3a96d');
  } else if(n.id==='mallow'){
   cottage(place,6,4.6,3.3,'#d5bc93','#a66e5e');const wing=new T.Group();wing.position.set(-3.5,0,-.7);wing.rotation.y=.12;place.add(wing);cottage(wing,2.3,3.4,2.35,'#c5ab83','#a66e5e');block(place,'#aaa08b',1.8,4,-1.1,.7,3,.7,'stone');block(place,'#68503b',0,2.5,2.65,6.4,.17,.13);for(const x of [-2.6,2.6])beam(place,[x,0,3.2],[x,2.5,3.2],.11);block(place,'#7c8f72',0,2.55,2.9,6.5,.15,1.2);sign(place,'THE DRIFTING ACORN',0,3.4,2.47);lantern(place,-.9,1.65,2.7);planter(place,2.9,3);barrel(place,-3.1,2.7);
  } else if(n.id==='moss'){
   cottage(place,4.8,3.4,2.6,'#c7c7a3','#5d8d86');const glass=new T.MeshStandardMaterial({color:'#78b6aa',roughness:.2,metalness:.25});const greenhouse=mesh(place,box,'#82aaa1',[2.8,1.35,-.3],[1.5,2.1,3]);greenhouse.material=glass;for(let i=0;i<4;i++)block(place,'#4a7565',2.8,1.35,-1.7+i*.95,1.6,2.2,.06);block(place,'#7b624d',0,.78,2.3,3.2,.14,1);for(let i=0;i<5;i++){const b=mesh(place,new T.SphereGeometry(.13,8,6),['#af89c5','#7ba9c0','#c99a67'][i%3],[-1.1+i*.53,1,2.3],[1,1.25,1]);mesh(place,cyl,'#ad9e7b',[-1.1+i*.53,1.19,2.3],[.055,.15,.055]);animated.push({m:b,type:'bottle',base:1});}sign(place,'DEWDROP APOTHECARY',0,2.65,1.9);planter(place,-2.8,1.6);planter(place,3.3,1.6);
  } else if(n.id==='luma'){
   mesh(place,cyl,'#aaa3bd',[0,2.1,-.5],[2,4.2,2]);for(let i=0;i<8;i++){const a=i/8*Math.PI*2;beam(place,[Math.sin(a)*1.98,.2,-.5+Math.cos(a)*1.98],[Math.sin(a)*1.98,4.2,-.5+Math.cos(a)*1.98],.07,'#786f91');}mesh(place,new T.ConeGeometry(2.6,3.4,12),'#655980',[0,5.6,-.5]);mesh(place,cyl,'#a99971',[0,4.05,-.5],[2.15,.13,2.15]);door(place,0,1.55);window(place,0,3,1.54,.6);for(const side of [-1,1]){const hoop=mesh(place,ring,'#d2ba7c',[0,7.35,-.5],[.65,.65,.65]);hoop.rotation.set(.5,side*.7,.4);}const crystal=mesh(place,new T.OctahedronGeometry(.34),'#c9b1ee',[0,7.5,-.5]);animated.push({m:crystal,type:'float',base:7.5});sign(place,'SUNPETAL ARCANA',0,2.05,1.8);planter(place,2,1.5);
  } else if(n.id==='tansy'){
   cottage(place,5.5,3.2,2.5,'#c0bd92','#69866b');for(const side of [-1,1])beam(place,[side*2.7,0,2.6],[side*2.7,2.4,2.6],.1);block(place,'#b8bd88',0,2.45,2.2,5.8,.12,1.3);block(place,'#8b6846',0,.95,2.6,3.3,.2,.9);for(let i=0;i<3;i++){const bow=weaponModel('dewbow');bow.position.set(-1+i,1.1,1.9);bow.scale.setScalar(.7);place.add(bow);}const target=mesh(place,new T.CylinderGeometry(.7,.7,.12,24),'#d4bb7d',[3.8,1.2,.6]);target.rotation.x=Math.PI/2;for(const [r,c] of [[.45,'#72866a'],[.2,'#ac6657']]){const m=mesh(place,new T.CircleGeometry(r,24),c,[3.8,1.2,.68]);}beam(place,[3.8,0,.6],[3.8,1.1,.6],.1);sign(place,'THE WILLOW FLETCHER',0,2.75,1.9);
  } else if(n.id==='scrip'){
   block(place,'#8c6344',0,.95,0,3.8,.55,2.1);for(const x of [-1.4,1.4])for(const z of [-1.1,1.1]){const wheel=mesh(place,ring,'#503e31',[x,.6,z],[.58,.58,.58]);for(let i=0;i<6;i++){const a=i*Math.PI/3;beam(place,[x,.6,z],[x+Math.sin(a)*.55,.6+Math.cos(a)*.55,z],.025);}mesh(place,cyl,'#ad8d56',[x,.6,z],[.13,.15,.13]).rotation.x=Math.PI/2;}for(const x of [-1.8,1.8])beam(place,[x,.9,-.9],[x,3,-.9],.08);for(let i=0;i<8;i++)block(place,i%2?'#819d8b':'#e3cda0',-1.9+i*.54,2.75,0,.54,.10,2.7);for(let i=0;i<4;i++)block(place,['#b5a0be','#8dad9c','#cfb380','#a77669'][i],[-1.2,-.4,.5,1.25][i],1.55,0,.65,.7,.7);sign(place,'SCRIP & SUNDRIES',0,2.1,1.2);barrel(place,2.5,.4);
  } else if(n.id==='fern'){
   for(const x of [-1.7,1.7])for(const z of [-1,1])beam(place,[x,0,z],[x,2.6,z],.1);roof(place,3.6,2.5,2.6,.7,'#b89869');block(place,'#8b6a48',0,.95,.4,2.8,.19,1.6);block(place,'#d8d2ae',0,1.06,.4,2.3,.03,1.25);for(let i=0;i<4;i++)beam(place,[-1+i*.6,1.09,-.1],[-.7+i*.6,1.09,.8],.02,'#8f9a6d');sign(place,'THE PATHFINDER',0,2.5,1.5);mesh(place,cyl,'#b3a17d',[2,.7,.4],[.24,1.4,.24]).rotation.z=.2;planter(place,-2,1);
  }
  // Work surfaces sit within reach of the articulated NPC hands.
  const station=new T.Group();station.position.set(n.x,meadowHeight(n.x,n.z),n.z);root.add(station);
  if(n.id==='ember'){
   block(station,'#6b5140',.75,.28,.9,.7,.56,.65);block(station,'#47545b',.75,.74,.9,1.05,.23,.5);beam(station,[.75,.76,.9],[1.5,.76,.9],.10,'#627179');
   const sparks=new T.Mesh(new T.OctahedronGeometry(.05),new T.MeshBasicMaterial({color:'#ffe2a2'}));sparks.position.set(.85,.95,.9);station.add(sparks);animated.push({m:sparks,type:'spark',base:.95});
   for(let i=0;i<4;i++){block(place,'#5a4f42',2,1.7+i*.18,-1.6,.7,.07,.10);beam(place,[1.8+i*.15,.9,-1.5],[1.8+i*.15,1.8,-1.5],.035,'#a7a595');}
  }else if(n.id==='moss'){
   mesh(station,cyl,'#556e5b',[.65,.4,.65],[.40,.65,.40]);mesh(station,cyl,'#abc77e',[.65,.75,.65],[.34,.035,.34]);
   for(let i=0;i<3;i++){beam(place,[-1.2+i*.8,2.3,1.9],[-1.2+i*.8,1.85,1.9],.02);mesh(place,sphere,'#739267',[-1.2+i*.8,1.78,1.9],[.16,.27,.12]);}
  }else if(n.id==='tansy'){
   block(station,'#94704f',.65,.52,.75,1.2,.10,.45);for(const x of [.2,1.1])block(station,'#71553c',x,.26,.75,.10,.52,.35);for(let i=0;i<5;i++)beam(station,[.18+i*.18,.6,.55],[.18+i*.18,.6,1.05],.012,'#decda3');
  }else if(n.id==='mallow'){
   block(place,'#806047',1.5,.7,3.0,1.45,.14,.7);for(const x of [.95,2.05])block(place,'#69513b',x,.35,3,.12,.7,.5);mesh(place,cyl,'#c7b38d',[1.2,.91,3],[.12,.24,.12]);mesh(place,sphere,'#d3a467',[1.7,.84,3],[.25,.09,.16]);
  }
  const movingStation=animated.filter(a=>a.m.parent===station).map(a=>a.m);station.remove(...movingStation);batchDetails(station);station.add(...movingStation);
  lantern(place,2.2,2.2,1.3);
  const moving=animated.filter(a=>a.m.parent===place).map(a=>a.m);if(moving.length)place.remove(...moving);batchDetails(place);if(moving.length)place.add(...moving);
  // Camera collision volumes do not alter the established server movement map.
  if(!['pip','fern','scrip'].includes(n.id))obstacles.push({x:place.position.x,z:place.position.z,rx:n.id==='mallow'?4.9:3.2,rz:2.4,height:n.id==='luma'?8:5.5,y:place.position.y});
 }
 const duel=part(root,new T.RingGeometry(8.65,8.9,64),'#c9a778',[0,.09,0]);duel.rotation.x=-Math.PI/2;
 for(const x of [5,51,95]){const gate=new T.Group();gate.position.set(x,meadowHeight(x,9),9);root.add(gate);for(const side of [-1,1])beam(gate,[0,0,side*2],[0,3.4,side*2],.14);block(gate,x===5?'#92b18c':x===51?'#b9a170':'#a58cb7',0,3.3,0,.22,.7,4.8);batchDetails(gate);}
 // Individual garden edges and stepping paths tie the different workshops together.
 const landscape=new T.Group();root.add(landscape);
 for(const n of NPCS){for(let i=0;i<6;i++){const z=n.z+1.5+i*.6,x=n.x+Math.sin(i*2.1)*.18;const stone=mesh(landscape,cyl,i%2?'#b8b096':'#c4b99b',[x,meadowHeight(x,z)+.035,z],[.65,.08,.39]);stone.rotation.y=i*.7;stone.castShadow=false;}for(const side of [-1,1])for(let i=0;i<3;i++){const x=n.x+side*(3.4+i*.32),z=n.z-1.8-i*.65;mesh(landscape,sphere,'#77905e',[x,meadowHeight(x,z)+.22,z],[.40,.30,.36]);mesh(landscape,smallFlowerGeometry(),i%2?'#dfbd87':'#c29ab5',[x,meadowHeight(x,z)+.46,z],[.09,.09,.09]);}}
 function smallFlowerGeometry(){return sphere;}
 batchDetails(landscape);
 return {root,npcs,obstacles,update(t,camera){for(const a of npcs.values()){a.root.visible=!camera||a.root.position.distanceToSquared(camera.position)<85*85;if(a.root.visible)a.animate(t,0);}for(const {m,type,base} of animated){if(type==='fire'){m.scale.y=.8+Math.sin(t*12)*.13;m.rotation.y=t*.7;}if(type==='float'){m.rotation.y=t*.7;m.position.y=base+Math.sin(t*2)*.17;}if(type==='spark'){const cycle=(t*1.25)%1;m.visible=cycle>.72&&cycle<.88;m.position.y=base+Math.max(0,cycle-.72)*2;}}},dispose(){for(const a of npcs.values())a.dispose();const geometries=new Set(),materials=new Set();root.traverse(m=>{if(m.geometry)geometries.add(m.geometry);if(m.material)materials.add(m.material);});for(const g of geometries)g.dispose();for(const m of materials){m.map?.dispose();m.dispose();}scene.remove(root);}};
}
