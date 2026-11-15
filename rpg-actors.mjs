import {createCreature} from './rpg-creatures.mjs';
import {createSlimeRig} from './rpg-slime.mjs';
import * as T from './vendor/three.module.js';
import {SPECIES,TIERS,ITEMS} from './rpg-content.mjs';
const sphere=new T.SphereGeometry(1,14,10),ball=new T.SphereGeometry(1,8,6),box=new T.BoxGeometry(1,1,1),cone=new T.ConeGeometry(1,1,8),cyl=new T.CylinderGeometry(1,1,1,8),torus=new T.TorusGeometry(1,.14,6,20);
const cache=new Map();
const crowdGeometry=new Map(),crowdMaterial=new T.MeshStandardMaterial({vertexColors:true,roughness:.55,metalness:.05});
export function material(color,metal=0){const key=color+':'+metal;if(!cache.has(key))cache.set(key,new T.MeshStandardMaterial({color:new T.Color(color).convertSRGBToLinear(),roughness:metal?.4:.65,metalness:metal}));return cache.get(key);}
export function part(parent,geo,color,pos=[0,0,0],scale=[1,1,1],metal=0){const m=new T.Mesh(geo,material(color,metal));m.position.set(...pos);m.scale.set(...scale);parent.add(m);return m;}
const eye=(root,x,y,z,size=.09)=>{part(root,ball,'#202e35',[x,y,z],[size,size*1.3,size*.6]);part(root,ball,'#fff9df',[x-size*.2,y+size*.3,z+size*.5],[size*.25,size*.3,size*.2]);};
function leaf(parent,color,pos,scale){const m=part(parent,sphere,color,pos,scale);m.rotation.z=.5;return m;}
export function weaponModel(id){const item=ITEMS[id];const root=new T.Group();if(!item)return root;const color=item.color;
 if(item.kind==='sword'){const blade=part(root,box,color,[0,.8,0],[id.includes('thorn')?.28:id.includes('iron')?.38:.15,1.6,.08],.6);if(id.includes('thorn'))for(const side of [-1,1])for(let i=0;i<3;i++)part(root,cone,'#e0c785',[side*.2,.4+i*.35,0],[.13,.3,.12]).rotation.z=side*-.6;part(root,box,'#dab565',[0,.04,0],[.6,.1,.16],.5);part(root,cyl,'#765743',[0,-.23,0],[.07,.45,.07]);}
 if(item.kind==='bow'){const curve=new T.EllipseCurve(0,0,.55,1.1,-Math.PI*.5,Math.PI*.5);const geo=new T.TubeGeometry(new T.CatmullRomCurve3(curve.getPoints(20).map(p=>new T.Vector3(p.x,p.y,0))),20,.065,5,false);root.add(new T.Mesh(geo,material(color,.2)));part(root,box,'#f5e4b9',[0,0,0],[.018,2.1,.018]);}
 if(item.kind==='spell'){part(root,cyl,'#8c6956',[0,.3,0],[.065,1.5,.065]);part(root,new T.OctahedronGeometry(.28),color,[0,1.15,0]);const ring=part(root,torus,'#e2bd74',[0,1.15,0],[.4,.4,.4],.5);ring.rotation.x=.4;}
 return root;
}
export function slimeModel(color='#29977c',role='player',compact=false){return createSlimeRig(color,role,compact,{part,weaponModel});}
export function enemyModel(speciesId,tierLevel){return createCreature(speciesId,tierLevel,{slimeModel});}
export function itemIcon(item){if(!item)return '◇';return {sword:'⚔',bow:'➶',spell:'✦',armor:'♜',consumable:'♜',material:'◆'}[item.kind]||'◆';}
