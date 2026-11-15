import * as T from './vendor/three.module.js';
import {SPECIES,TIERS} from './rpg-content.mjs';

// Dewwild creatures inherit Slimoo's face, jelly and hands, with authored wildlife
// features instead of disconnected box bodies and stick legs.
export function createCreature(speciesId,tierLevel,{slimeModel}){
 const species=SPECIES.find(s=>s.id===speciesId),tier=TIERS.find(t=>t.level===tierLevel);
 const rig=slimeModel(species.color,'creature'),root=rig.root,details=rig.costume,materials=new Map(),geometries=new Set(),wings=[],feelers=[];
 const form=species.form,flying=['moth','bat','dragonfly','bird','rook','wisp'].includes(form);
 rig.setAppearance({tint:species.color,size:tierLevel===10?1.20:tierLevel===5?1.02:.88,width:['boar','crab','golem','frog'].includes(form)?1.16:.95,height:['snake','croc','crab'].includes(form)?.86:1,crown:false,blush:false,hands:.85});
 function mat(color){if(!materials.has(color))materials.set(color,new T.MeshToonMaterial({color}));return materials.get(color);}
 function add(geo,color,p,s=[1,1,1],parent=details){geometries.add(geo);const m=new T.Mesh(geo,mat(color));m.position.set(...p);m.scale.set(...s);m.castShadow=true;parent.add(m);return m;}
 const ball=new T.SphereGeometry(1,16,12),cone=new T.ConeGeometry(1,1,16),torus=new T.TorusGeometry(1,.10,8,32);
 const blob=(c,p,s,parent)=>add(ball,c,p,s,parent);
 const horn=(c,p,s)=>add(cone,c,p,s);
 const cream='#e3d4ac',dark='#536457',accent=tier.color;
 if(['fox','wolf','imp','boar','ram'].includes(form)){
  for(const side of [-1,1]){const ear=horn(form==='boar'?'#aa8472':species.color,[side*.58,1.68,.05],[.23,.52,.24]);ear.rotation.z=side*-.28;if(form!=='ram')horn(cream,[side*.58,1.69,.19],[.12,.26,.05]);}
  if(form==='boar')for(const side of [-1,1])horn(cream,[side*.48,.57,.96],[.09,.36,.10]).rotation.z=-side*.3;
  if(form==='ram')for(const side of [-1,1])add(torus,'#ae9872',[side*.91,1.26,0],[.28,.40,.28]).rotation.y=Math.PI/2;
  if(['fox','wolf'].includes(form)){const tail=blob(species.color,[0,.62,-1.12],[.33,.35,.85]);tail.rotation.x=-.45;blob(cream,[0,.93,-1.65],[.22,.26,.35]);}
 }
 if(form==='frog'){for(const side of [-1,1]){blob('#a9c987',[side*.6,1.53,.16],[.30,.24,.27]);blob(species.color,[side*.91,.18,-.30],[.36,.18,.48]);}for(let i=0;i<5;i++)blob('#719653',[Math.sin(i*2)*.62,1.3,Math.cos(i*2)*.62],[.08,.04,.08]);}
 if(['beetle','snail','crab','spider','scorpion'].includes(form)){
  const shell=blob(form==='snail'?'#bc9e72':species.color,[0,.93,-.47],[1.03,.76,.70]);
  if(form==='snail'){for(let i=0;i<3;i++)add(torus,'#806e50',[0,1.03,-1.08],[.48-i*.12,.48-i*.12,.23]);}
  else{add(new T.TorusGeometry(.72,.035,6,24,Math.PI),'#d0b985',[0,1.03,-.56],[1,.55,1]).rotation.x=Math.PI/2;}
  for(const side of [-1,1])for(let i=0;i<(form==='spider'?3:2);i++){const leg=blob(dark,[side*(1.0+i*.04),.26,-.2-i*.34],[.40,.09,.11]);leg.rotation.z=side*-.3;feelers.push(leg);}
  if(['crab','scorpion'].includes(form))for(const side of [-1,1])add(new T.TorusGeometry(.23,.10,8,20,Math.PI*1.6),species.color,[side*1.45,.66,.55],[1,1,.65]).rotation.z=side*.5;
  if(form==='scorpion')add(new T.TorusGeometry(.54,.14,8,24,Math.PI*1.2),species.color,[0,1.13,-.83],[1,1,1]).rotation.y=Math.PI/2;
 }
 if(flying||form==='fish'){
  for(const side of [-1,1]){const pivot=new T.Group();pivot.position.set(side*.75,1,0);details.add(pivot);wings.push({pivot,side});
   const shape=new T.Shape();shape.moveTo(0,0);shape.quadraticCurveTo(side*.8,.85,side*1.5,.35);shape.quadraticCurveTo(side*1.2,-.15,side*.6,-.18);shape.quadraticCurveTo(side*.2,-.5,0,0);const wing=add(new T.ShapeGeometry(shape),form==='bat'?'#847799':form==='moth'?'#d9c6a3':'#b6d0bd',[0,0,0],[1,1,1],pivot);wing.material=wing.material.clone();wing.material.side=T.DoubleSide;materials.set('wing'+side,wing.material);
   for(let i=0;i<3;i++){const feather=blob(species.color,[side*(.7+i*.20),.1-i*.06,.025],[.33,.07,.08],pivot);feather.rotation.z=side*-.2;}
  }
  if(['bird','rook'].includes(form))horn('#d7b279',[0,.83,1.06],[.12,.30,.12]).rotation.x=Math.PI/2;
  if(form==='wisp'){const light=add(new T.OctahedronGeometry(.22),cream,[0,1.96,0]);feelers.push(light);}
 }
 if(['snake','croc'].includes(form)){
  const curve=new T.CatmullRomCurve3([new T.Vector3(0,.25,-.7),new T.Vector3(.35,.23,-1.3),new T.Vector3(.1,.25,-1.8),new T.Vector3(-.45,.3,-2.15)]);add(new T.TubeGeometry(curve,18,.21,8,false),species.color,[0,0,0]);
  if(form==='croc')for(let i=0;i<5;i++)horn('#b9c58b',[0,1.5-i*.15,-.12-i*.25],[.15,.22,.18]);
 }
 if(form==='mushroom'){blob('#e3d6b6',[0,1.57,0],[.60,.16,.60]);blob(species.color,[0,1.80,0],[1.15,.42,.96]);for(let i=0;i<7;i++)blob(cream,[Math.sin(i*2.4)*.65,2.12-Math.abs(Math.sin(i))*.08,Math.cos(i*2.4)*.56],[.14,.045,.14]);}
 if(form==='flower'){for(let i=0;i<8;i++){const a=i/8*Math.PI*2;const petal=blob(species.color,[Math.sin(a)*.72,1.52,Math.cos(a)*.72],[.24,.10,.43]);petal.rotation.y=a;}blob('#e6cb7d',[0,1.61,0],[.44,.12,.44]);}
 if(form==='tree'){for(let i=0;i<5;i++){const a=i*2.4;blob('#7e9d67',[Math.sin(a)*.60,1.66+Math.sin(i)*.14,Math.cos(a)*.60],[.54,.34,.49]);}for(const side of [-1,1])horn('#ad9470',[side*.72,1.45,0],[.10,.65,.10]).rotation.z=side*-.6;}
 if(form==='golem'){for(const side of [-1,1])blob('#a6a58a',[side*.83,.82,0],[.30,.40,.44]);for(let i=0;i<3;i++)horn(accent,[(i-1)*.42,1.65,-.2],[.12,.42,.15]);}
 if(form==='jelly'){for(let i=0;i<5;i++){const a=i/5*Math.PI*2,stem=blob(species.color,[Math.sin(a)*.63,.12,Math.cos(a)*.63],[.08,.28,.08]);feelers.push(stem);}}
 if(tierLevel>=5)for(const side of [-1,1])horn(accent,[side*.66,1.58,-.35],[.11,tierLevel===10?.48:.28,.14]);
 let previous='idle';
 return {root,react:time=>rig.react(time),dispose(){rig.dispose();for(const g of geometries)g.dispose();for(const m of materials.values())m.dispose();},animate(time,phase){
  if(phase==='recover'&&previous==='windup')rig.trigger(['bolt','lob','cone','line'].includes(species.pattern)?'spit':'slap',time,.5);
  previous=phase;rig.animate(time,phase==='walk'?4:0);
  if(phase==='windup'){rig.body.scale.y*=.88;rig.body.scale.x*=1.06;rig.body.rotation.x=-.10;rig.hand.rotation.y=1.05;}
  if(flying)rig.body.position.y+=.28+Math.sin(time*3+species.index)*.12;
  for(const {pivot,side}of wings)pivot.rotation.z=side*Math.sin(time*(form==='dragonfly'?20:7))*.3;
  for(let i=0;i<feelers.length;i++)feelers[i].rotation.x=Math.sin(time*(phase==='walk'?9:3)+i)*.18;
 }};
}
