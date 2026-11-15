import * as T from './vendor/three.module.js';
import {createOriginalSlime,animateOriginalSlime,reactOriginalSlime} from './rpg-original-slime.mjs';
import {sanitizeAppearance} from './rpg-appearance.mjs';
import {ITEMS} from './rpg-content.mjs';
import {batchDetails} from './rpg-geometry.mjs';

export function createSlimeRig(color,role='player',compact=false,{part,weaponModel}){
 const original=createOriginalSlime(T,new T.Color(color).getHex());
 const root=original.g,body=original.jelly,hand=original.arms[1].pivot,left=original.arms[0].pivot;
 const costume=new T.Group(),kit=new T.Group(),armorKit=new T.Group(),crown=new T.Group();
 body.add(costume,armorKit,crown);hand.add(kit);kit.position.set(.55,.12,.10);
 for(const leaf of original.leaves)crown.attach(leaf);
 const rigid=new T.Group();body.add(rigid);
 for(const child of [...body.children])if(child.isMesh)rigid.attach(child);
 batchDetails(rigid);batchDetails(crown);for(const arm of original.arms)batchDetails(arm.palm);
 let appearance=sanitizeAppearance({tint:color}),equipped='',armored='',triggered=null,hitAt=-10,lastTime=0,wasAir=0,landAt=-10;
 const owned=new Set(),geo=g=>{owned.add(g);return g;};
 const sphere=geo(new T.SphereGeometry(1,16,12)),box=geo(new T.BoxGeometry(1,1,1));
 const dress=(g,c,p,s,parent=costume)=>part(parent,g,c,p,s);
 const apron=c=>{const shape=new T.Shape();shape.moveTo(-.36,.0);shape.lineTo(.36,.0);shape.lineTo(.31,.64);shape.lineTo(-.31,.64);shape.closePath();dress(geo(new T.ShapeGeometry(shape)),c,[0,.32,1.06],[1,1,1]);};
 if(role==='hammer'){apron('#76503c');dress(geo(new T.CylinderGeometry(.045,.045,.8,8)),'#8a6747',[0,.15,0],[1,1,1],kit);dress(box,'#646d73',[0,.56,0],[.55,.24,.28],kit);dress(geo(new T.TorusGeometry(.12,.022,6,18)),'#d2b27c',[0,.73,1.08],[1,1,1]);}
 if(role==='stir'){apron('#e1d9b7');dress(geo(new T.CylinderGeometry(.59,.67,.12,20)),'#dddcc0',[0,1.64,0],[1,1,1]);dress(sphere,'#eeebd8',[0,1.78,0],[.45,.20,.40]);dress(geo(new T.CylinderGeometry(.035,.035,1.1,8)),'#9e7853',[0,.2,0],[1,1,1],kit);}
 if(role==='string'){dress(geo(new T.ConeGeometry(.67,.45,16)),'#788c57',[0,1.79,0],[1,1,1]);kit.add(weaponModel('reedbow'));}
 if(role==='levitate'){dress(geo(new T.CylinderGeometry(.76,.76,.09,20)),'#9181af',[0,1.60,0],[1,1,1]);dress(geo(new T.ConeGeometry(.59,1.02,20)),'#796696',[0,2.07,0],[1,1,1]);kit.add(weaponModel('dewspell'));}
 if(role==='wave'){dress(geo(new T.CylinderGeometry(.60,.64,.13,20)),'#53876a',[0,1.67,0],[1,1,1]);dress(sphere,'#729a70',[0,1.76,0],[.52,.16,.48]);}
 if(role==='read'){dress(sphere,'#cbbd96',[0,1.68,0],[.66,.14,.58]);dress(box,'#8c7154',[-.55,.1,.10],[.60,.64,.10],left);dress(box,'#e9dfbe',[-.55,.1,.16],[.52,.57,.025],left);}
 if(role==='count'){dress(geo(new T.TorusGeometry(.15,.021,6,20)),'#d2b573',[-.29,1.05,1.045],[1,1,1]);dress(box,'#8b6551',[-.5,.08,.08],[.44,.27,.29],left);}
 if(role==='bow'){apron('#efe4cf');dress(sphere,'#b784a0',[0,1.68,0],[.60,.14,.53]);}
 const hiddenCrown=role!=='player';
 function clearEquipment(group){group.traverse(o=>{if(o.geometry?.userData.owned||['TubeGeometry','OctahedronGeometry'].includes(o.geometry?.type))o.geometry.dispose();});group.clear();}
 const api={root,body,hand,left,kit,costume,original,
  setAppearance(value){appearance=sanitizeAppearance(value);root.scale.set(appearance.size*appearance.width,appearance.size*appearance.height,appearance.size*appearance.width);original.bodyMat.color.set(appearance.tint);crown.visible=appearance.crown&&!hiddenCrown;for(const cheek of original.cheeks)cheek.visible=appearance.blush;armorKit.visible=appearance.showGear;},
  setColor(value){if(!appearance.tint)original.bodyMat.color.set(value);},
  setWeapon(id){if(role!=='player'||id===equipped)return;clearEquipment(kit);if(id)kit.add(weaponModel(id));equipped=id;},
  setArmor(id){if(role!=='player'||id===armored)return;clearEquipment(armorKit);if(ITEMS[id]){const item=ITEMS[id];dress(geo(new T.TorusGeometry(.69,.055,6,24)),item.color,[0,.58,.14],[1,.8,1],armorKit).rotation.x=Math.PI/2;for(const side of [-1,1])dress(sphere,item.color,[side*.70,.64,.06],[.18,.24,.38],armorKit);}armored=id;},
  trigger(kind,time,duration=.4,combo=0){triggered={kind,start:time,duration,combo};},react(time){hitAt=time;original.hurtUntil=time+.23;original.reaction={a:0,b:0,va:2.5,vb:-2,s:0,vs:-3.2};},
  animate(time,moving=0,action=null,emote=0,air=0,emoteAge=time){
   let kind='',progress=1,combo=0;
   if(action?.remaining>0){kind=action.kind;progress=1-action.remaining/action.duration;combo=action.combo||0;triggered=null;}
   else if(triggered&&time-triggered.start<triggered.duration){kind=triggered.kind;progress=(time-triggered.start)/triggered.duration;combo=triggered.combo;}
   progress=Math.max(0,Math.min(1,progress));
   const hurt=Math.max(0,1-(time-hitAt)/.26);
   animateOriginalSlime(original,{time,speed:moving/7.5,kind,progress,combo,hit:hurt});
   for(const eye of original.eyes){eye.scale.x=.75*appearance.eyes;eye.scale.y*=appearance.eyes;eye.scale.z=.5*appearance.eyes;}
   for(const arm of original.arms)arm.pivot.scale.multiplyScalar(appearance.hands);
   if(wasAir>0&&air<=0)landAt=time;wasAir=air;const landing=Math.max(0,1-(time-landAt)/.2);
   if(air>0){body.scale.y*=1.10;body.scale.x*=.95;body.scale.z*=.95;}else if(landing){body.scale.y*=1-landing*.18;body.scale.x*=1+landing*.09;body.scale.z*=1+landing*.09;}
   reactOriginalSlime(original,Math.min(.05,lastTime?time-lastTime:1/60),time);lastTime=time;
   kit.visible=role!=='player'||appearance.showGear||['sword','bow','nova'].includes(kind);if(['slap','spit'].includes(kind))kit.visible=false;
   if(kind==='sword'){hand.rotation.set(-1.4*Math.sin(progress*Math.PI),1.1-Math.min(1,progress/.55)*2.5,0);hand.scale.setScalar(.85*appearance.hands);}
   if(kind==='bow'){const draw=progress<.36?progress/.36:Math.max(0,1-(progress-.36)/.25);hand.rotation.set(-1.1,-.65,0);hand.position.z=.65;left.rotation.set(-.9,.8,0);left.position.z=.7-draw*.65;}
   if(kind==='nova'){hand.rotation.x=-1.5*Math.sin(progress*Math.PI);left.rotation.x=-1.3*Math.sin(progress*Math.PI);}
   if(!kind&&!emote){
    if(role==='hammer'){const phase=(time*1.15)%1;hand.rotation.x=phase<.62?-.3-phase*2.1:-1.6+Math.min(1,(phase-.62)/.15)*1.85;hand.scale.setScalar(.9);body.rotation.x=Math.max(0,1-Math.abs(phase-.79)*10)*.10;}
    if(role==='stir'){hand.rotation.set(-.45+Math.cos(time*2)*.16,Math.sin(time*2)*.24,.15);hand.position.z=.35;}
    if(role==='string'){left.rotation.set(-.6,.25,0);hand.rotation.set(-.6,.45+Math.sin(time*1.8)*.22,.1);}
    if(role==='levitate'){hand.rotation.x=-.8;left.rotation.x=-.6;body.position.y+=.12+Math.sin(time*2)*.09;}
    if(role==='read'){left.rotation.x=-.3;hand.rotation.z=.2+Math.sin(time*1.8)*.15;}
    if(role==='count'){hand.rotation.z=.3+Math.sin(time*4)*.18;left.rotation.x=-.2;}
    if(role==='bow')body.rotation.x=Math.max(0,Math.sin(time*1.5))*.14;
    if(role==='wave'&&(time%8)<2){hand.rotation.x=-1.5;hand.rotation.z=.4+Math.sin(time*8)*.3;}
   }
   if(emote===1)body.rotation.z=Math.sin(emoteAge*7)*.16;
   if(emote===2)body.scale.y*=.63;
   if(emote===3){hand.rotation.x=-1.6;hand.rotation.z=.4+Math.sin(emoteAge*8)*.4;}
   if(emote===4)body.rotation.y=emoteAge*3;
   if(emote===5)body.position.y+=Math.abs(Math.sin(emoteAge*7))*.45;
  },
  dispose(){clearEquipment(kit);original.disposeOriginal();for(const g of owned)g.dispose();root.traverse(o=>{if(o.geometry?.userData.owned)o.geometry.dispose();});root.parent?.remove(root);}
 };
 api.setAppearance({tint:color});return api;
}
