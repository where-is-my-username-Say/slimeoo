import * as T from './vendor/three.module.js';
import {batchDetails} from './rpg-geometry.mjs';
import {ITEMS} from './rpg-content.mjs';

const dome=new T.SphereGeometry(1.15,24,18,0,Math.PI*2,0,Math.PI*.78);
const sphere=new T.SphereGeometry(1,12,8),small=new T.SphereGeometry(1,8,6),box=new T.BoxGeometry(1,1,1);
const ramp=new T.DataTexture(new Uint8Array([65,65,65,145,145,145,215,215,215,255,255,255]),4,1,T.RGBFormat);ramp.minFilter=ramp.magFilter=T.NearestFilter;ramp.needsUpdate=true;
const outline=new T.MeshBasicMaterial({color:0x183c3b,side:T.BackSide});
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));

export function createSlimeRig(color,role,compact,{part,weaponModel}){
  const root=new T.Group(),body=new T.Group(),shell=new T.Group(),face=new T.Group();root.add(body);body.add(shell,face);
  const skin=new T.MeshToonMaterial({color:new T.Color(color).convertSRGBToLinear(),gradientMap:ramp});
  const add=(parent,g,m,p,s)=>{const mesh=new T.Mesh(g,m);mesh.position.set(...p);mesh.scale.set(...s);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;};
  const blob=(parent,p,s)=>add(parent,sphere,skin,p,s);
  const domeMesh=add(shell,dome,skin,[0,.62,0],[1,.84,1]);
  add(domeMesh,dome,outline,[0,-.015,0],[1.025,1.025,1.025]);
  blob(shell,[0,.32,0],[1.11,.35,1.11]);
  face.position.set(0,1.05,.90);
  const eyes=[];
  for(const side of [-1,1]){
    const eye=part(face,small,'#183d40',[side*.29,0,.07],[.086,.155,.058]);eyes.push(eye);
    part(shell,small,'#db9c91',[side*.49,.93,.93],[.135,.049,.027]);
    part(face,small,'#f2f7e9',[side*.29-.02,.05,.127],[.032,.032,.024]);
  }
  const smile=part(face,new T.TorusGeometry(.10,.022,6,16,Math.PI),'#285153',[0,-.16,.09]);smile.rotation.z=Math.PI;
  const mouth=part(face,small,'#162b32',[0,-.16,.11],[.12,.012,.042]);
  for(let i=0;i<7;i++){const a=(i-3)*.24;part(shell,small,'#b7a15f',[Math.sin(a)*.62,1.58+Math.cos(a)*.08,.15],[.072,.156,.042]).rotation.z=-a*1.4;}
  const shineMat=new T.MeshBasicMaterial({color:'#e6fff3',transparent:true,opacity:.48,depthWrite:false});
  add(shell,sphere,shineMat,[-.43,1.32,.72],[.24,.064,.032]);
  add(shell,small,shineMat,[-.68,1.17,.77],[.063,.035,.023]);
  const shadow=part(root,new T.CircleGeometry(1.2,24),'#344d46',[0,.024,0]);shadow.rotation.x=-Math.PI/2;shadow.material=shadow.material.clone();shadow.material.transparent=true;shadow.material.opacity=.19;shadow.material.depthWrite=false;shadow.castShadow=false;
  const arms=[];
  for(const side of [-1,1]){
    const pivot=new T.Group(),palm=new T.Group(),flesh=new T.Group();pivot.position.set(side*.83,.75,.12);body.add(pivot);pivot.add(flesh);palm.position.set(side*.55,0,.1);pivot.add(palm);
    blob(flesh,[side*.20,0,0],[.42,.196,.196]);blob(palm,[0,0,0],[.30,.255,.132]);
    for(let f=0;f<3;f++)blob(palm,[(f-1)*.16,.24,.015],[.085,.14,.081]);
    blob(palm,[-side*.29,.03,.02],[.096,.15,.12]);batchDetails(palm);arms.push({pivot,palm,side});
  }
  const hand=arms[1].pivot,left=arms[0].pivot,kit=new T.Group(),armorKit=new T.Group();kit.position.set(.57,.12,.14);hand.add(kit);body.add(armorKit);
  let equipped='',armored='',combo=0,visualAction=null,hitAt=-10,lastAir=0,landAt=-10;
  const sharedGeometry=new Set([dome,sphere,small,box]);
  const disposeParts=group=>{const geometries=new Set();group.traverse(m=>{if(m.geometry?.userData.owned||m.geometry?.type==='TubeGeometry'||m.geometry?.type==='OctahedronGeometry')geometries.add(m.geometry);});for(const g of geometries)g.dispose();group.clear();};
  const prop=(parent,g,c,p,s)=>part(parent,g,c,p,s);
  if(role==='hammer'){prop(shell,box,'#694d42',[0,.55,.97],[.8,.65,.09]);prop(kit,box,'#58616b',[0,.51,0],[.58,.25,.31],.6);prop(kit,new T.CylinderGeometry(.045,.045,.72,8),'#79553b',[0,.1,0]);}
  if(role==='stir'){prop(shell,new T.CylinderGeometry(.58,.63,.12,16),'#f3e8cb',[0,1.65,0]);prop(shell,sphere,'#efe3c5',[0,1.79,0],[.48,.24,.43]);prop(kit,new T.CylinderGeometry(.045,.045,1,8),'#b39765',[0,.26,0]);}
  if(role==='string'){prop(shell,new T.ConeGeometry(.72,.6,12),'#8b7846',[0,1.85,0]);kit.add(weaponModel('reedbow'));}
  if(role==='levitate'){prop(shell,new T.ConeGeometry(.62,1.1,12),'#79639f',[0,2.07,0]);prop(shell,new T.CylinderGeometry(.79,.79,.08,16),'#aa90c5',[0,1.59,0]);kit.add(weaponModel('dewspell'));}
  if(role==='wave'){prop(shell,new T.CylinderGeometry(.61,.7,.13,12),'#457c63',[0,1.69,0]);prop(shell,new T.ConeGeometry(.5,.4,12),'#6e9a78',[0,1.89,0]);}
  if(role==='read'){prop(left,box,'#916e52',[-.35,.2,.2],[.64,.65,.11]);prop(shell,sphere,'#d4c39b',[0,1.66,0],[.67,.14,.58]);}
  if(role==='count'){prop(shell,new T.TorusGeometry(.17,.025,6,20),'#d6b867',[-.29,1.05,1.04]);prop(left,box,'#976f4e',[-.4,.12,.1],[.45,.32,.3]);}
  if(role==='bow')prop(shell,sphere,'#d1a1b6',[0,1.67,0],[.65,.19,.52]);
  // The original silhouette and hands remain on every player; rigid ornaments share one draw.
  const attached=arms.map(a=>a.pivot);body.remove(...attached,face,armorKit);batchDetails(shell);body.add(...attached,face,armorKit);
  return {root,body,hand,left,kit,trigger(kind,t,duration=.4,nextCombo=0){combo=nextCombo;visualAction={kind,start:t,duration};},react(t){hitAt=t;},
    dispose(){const geometries=new Set();root.traverse(m=>{if(m.geometry&&!sharedGeometry.has(m.geometry)&&(m.geometry.userData.owned||['CircleGeometry','TubeGeometry','OctahedronGeometry'].includes(m.geometry.type)))geometries.add(m.geometry);});for(const g of geometries)g.dispose();skin.dispose();shineMat.dispose();shadow.material.dispose();root.parent?.remove(root);},
    setColor(next){skin.color.set(next).convertSRGBToLinear();},
    setArmor(id){if(role!=='player'||id===armored)return;disposeParts(armorKit);const item=ITEMS[id];if(item){prop(armorKit,box,item.color,[0,.55,.93],[.76,.43,.10]);for(const side of [-1,1])prop(armorKit,box,'#b9a572',[side*.33,.55,.995],[.055,.46,.035]);if(item.level>=5)for(const side of [-1,1])prop(armorKit,sphere,item.color,[side*.78,1.0,.06],[.28,.18,.37]);if(item.level>=10)prop(armorKit,box,item.color,[0,.75,-.85],[.88,.95,.12]);batchDetails(armorKit);}armored=id;},
    setWeapon(id){if(role!=='player'||id===equipped)return;disposeParts(kit);kit.add(weaponModel(id));kit.rotation.z=-.5;equipped=id;},
    animate(t,moving=0,action=null,emote=0,air=0,emoteAge=t){
      const speed=clamp(moving/7.5),hop=Math.abs(Math.sin(t*10))*speed;
      let kind='',progress=1;
      if(action?.remaining>0){kind=action.kind;progress=clamp(1-action.remaining/(action.duration||.4));combo=action.combo||0;visualAction=null;}else if(visualAction&&t-visualAction.start<visualAction.duration){kind=visualAction.kind;progress=clamp((t-visualAction.start)/visualAction.duration);}
      const slap=kind==='slap',spit=kind==='spit',cast=kind==='nova',sword=kind==='sword',bow=kind==='bow',puff=spit?Math.sin(progress*Math.PI):0;
      const wind=slap?Math.sin(Math.min(1,progress/.34)*Math.PI/2):0,release=slap?clamp((progress-.32)/.28):0,recovery=slap?clamp((progress-.62)/.38):0;
      const sy=1+hop*.11-speed*.04-(slap?Math.sin(progress*Math.PI)*.10:0)+puff*.06,sx=1/Math.sqrt(Math.max(.6,sy));body.scale.set(sx+puff*.09,sy,sx+puff*.09);body.position.y=hop*.14+Math.sin(t*3)*.018;
      body.rotation.set(-speed*.045,0,Math.sin(t*9)*speed*.025+(slap?(combo===1?-1:1)*Math.sin(progress*Math.PI)*.14:0));
      if(lastAir>0&&air<=0)landAt=t;lastAir=air;
      const landing=Math.max(0,1-(t-landAt)/.22),hurt=Math.max(0,1-(t-hitAt)/.28);
      if(air>0){body.scale.y*=1.10;body.scale.x*=.95;body.scale.z*=.95;}else if(landing>0){body.scale.y*=1-landing*.22;body.scale.x*=1+landing*.12;body.scale.z*=1+landing*.12;}
      body.rotation.x+=hurt*.24;skin.emissive.setScalar(hurt*.22);face.rotation.x=-speed*.07;shadow.scale.setScalar(air>0?.8:1-hop*.08);
      for(const eye of eyes)eye.scale.y=hurt>0?.065:(t%4)<.11?.025:.155;
      smile.visible=!spit;mouth.scale.y=spit?.05+puff*.16:.012;
      kit.visible=!slap&&!spit;
      for(const arm of arms){const active=slap&&arm.side===(combo===1?-1:1),strength=active?Math.sin(progress*Math.PI):0;arm.pivot.scale.setScalar(.55+strength*.8);arm.pivot.rotation.set(cast?-1.5*Math.sin(progress*Math.PI):0,active?arm.side*(wind*1.3-release*3)*(1-recovery):arm.side*.15,arm.side*(.12+Math.sin(t*4)*.06));arm.pivot.position.z=active?release*(1-recovery)*1.6:.10;arm.palm.rotation.y=active?-arm.side*.6:0;arm.palm.rotation.z=active?-arm.side*.22:arm.side*.2;}
      if(sword){const swing=Math.sin(progress*Math.PI);hand.rotation.x=-1.4*swing;hand.rotation.y=1.1-Math.min(1,progress/.55)*2.5;hand.scale.setScalar(.8);body.rotation.y=-.3*swing;}
      if(bow){const draw=progress<.36?progress/.36:Math.max(0,1-(progress-.36)/.25);hand.rotation.set(-1.1,-.65,0);hand.position.z=.65;hand.scale.setScalar(.8);left.rotation.set(-.9,.8,0);left.position.z=.7-draw*.65;body.rotation.y=.25;}
      if(cast){hand.scale.setScalar(.8);left.rotation.x=-1.3*Math.sin(progress*Math.PI);body.position.y+=Math.sin(progress*Math.PI)*.12;}
      if(role==='hammer'){const cycle=(t*1.25)%1;hand.rotation.x=cycle<.6?-.25-cycle*2.3:-1.63+Math.min(1,(cycle-.6)/.14)*1.8;hand.scale.setScalar(.9);body.rotation.x=Math.max(0,1-Math.abs(cycle-.76)*12)*.09;}
      if(role==='wave'||emote===3){hand.rotation.x=-1.6;hand.rotation.z=.4+Math.sin((emote===3?emoteAge:t)*8)*.4;}
      if(role==='stir'){hand.rotation.x=-.3+Math.cos(t*3)*.2;hand.rotation.z=Math.sin(t*3)*.25;}
      if(role==='levitate'){body.position.y+=.20+Math.sin(t*2)*.13;hand.rotation.z=.4+Math.sin(t)*.15;}
      if(role==='string'){left.rotation.x=-.4;hand.rotation.y=.5+Math.sin(t*2)*.25;}
      if(role==='read'){body.rotation.x=.06;left.rotation.x=-.35;hand.rotation.z=-.25+Math.sin(t*1.5)*.12;}
      if(role==='count'){hand.rotation.z=.4+Math.sin(t*5)*.2;left.rotation.x=Math.sin(t*5)*.15;}
      if(role==='bow')body.rotation.x=Math.max(0,Math.sin(t*1.5))*.19;
      if(emote===1)body.rotation.z=Math.sin(emoteAge*7)*.16;if(emote===2)body.scale.y*=.63;if(emote===4)body.rotation.y=emoteAge*3;if(emote===5)body.position.y+=Math.abs(Math.sin(emoteAge*7))*.45;
    }
  };
}
