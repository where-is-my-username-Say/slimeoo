// One layout drives architecture, NPC positions, paths and authoritative collision.
export const VILLAGE_CENTER={x:-32,z:16};
export const VILLAGE_BUILDINGS=[
 {id:'ember',x:-51,z:3,yaw:Math.PI/2,w:10,d:9,h:4.1,door:3.2,title:'WILDGLASS FORGE',wall:'#978a79',roof:'#4e5961',npc:[-1,-1.6]},
 {id:'tansy',x:-52,z:26,yaw:Math.PI/2,w:9,d:8,h:3.9,door:3.2,title:'WILLOW FLETCHER',wall:'#a2a18a',roof:'#526c5b',npc:[1,-1.8]},
 {id:'mallow',x:-34,z:40,yaw:Math.PI,w:12,d:10,h:4.5,door:3.6,title:'THE DRIFTING ACORN',wall:'#b1a08b',roof:'#865c50',npc:[2,-2.2]},
 {id:'luma',x:-15,z:34,yaw:Math.PI,w:9,d:9,h:4.6,door:3.2,title:'SUNPETAL ARCANA',wall:'#a09aa9',roof:'#655570',npc:[0,-1.7]},
 {id:'moss',x:-16,z:-6,yaw:0,w:10,d:8,h:4,door:3.2,title:'DEWDROP APOTHECARY',wall:'#9ba68e',roof:'#4d716b',npc:[-1.4,-1.6]},
 {id:'scrip',x:-34,z:-8,yaw:0,w:9,d:8,h:3.8,door:3.2,title:'SCRIP & SUNDRIES',wall:'#afa18b',roof:'#727d65',npc:[1.3,-1.6]},
 {id:'pip',x:-25,z:4,yaw:0,w:7,d:6,h:3.6,door:3.2,title:'WARDEN’S LODGE',wall:'#a3a696',roof:'#536b60',npc:[0,-.8]},
 {id:'fern',x:-7,z:24,yaw:-Math.PI/2,w:7,d:6,h:3.5,door:3.2,title:'THE PATHFINDER',wall:'#a7a295',roof:'#8a755c',npc:[0,-.8]}
].map(b=>({...b,door:b.id==='mallow'?4.4:4}));
export const villagePoint=(b,x,z)=>({x:b.x+Math.cos(b.yaw)*x+Math.sin(b.yaw)*z,z:b.z-Math.sin(b.yaw)*x+Math.cos(b.yaw)*z});
export const buildingFor=id=>VILLAGE_BUILDINGS.find(b=>b.id===id);
export function inVillage(p){return p.x>-63&&p.x<-3&&p.z>-17&&p.z<49&&Math.hypot(p.x,p.z)>11;}
export function buildingAt(x,z){return VILLAGE_BUILDINGS.find(b=>{const dx=x-b.x,dz=z-b.z,c=Math.cos(b.yaw),s=Math.sin(b.yaw);return Math.abs(c*dx-s*dz)<b.w/2&&Math.abs(s*dx+c*dz)<b.d/2;});}
export function wallSegments(b){const side=(b.w-b.door)/2;return [
 {x:0,z:-b.d/2,w:b.w+.36,d:.36},
 {x:-b.w/2,z:0,w:.36,d:b.d},{x:b.w/2,z:0,w:.36,d:b.d},
 {x:-(b.w+b.door)/4,z:b.d/2,w:side,d:.36},{x:(b.w+b.door)/4,z:b.d/2,w:side,d:.36}
 ];}
export const VILLAGE_SOLIDS=VILLAGE_BUILDINGS.flatMap(b=>wallSegments(b).map(w=>({...villagePoint(b,w.x,w.z),w:w.w,d:w.d,yaw:b.yaw,height:b.h,building:b.id})));
export function containVillage(p){
 if(p.x<-65||p.x>0||p.z<-20||p.z>52)return;
 const radius=.83;
 for(let pass=0;pass<2;pass++)for(const wall of VILLAGE_SOLIDS){
  const c=Math.cos(wall.yaw),s=Math.sin(wall.yaw),dx=p.x-wall.x,dz=p.z-wall.z;
  let x=c*dx-s*dz,z=s*dx+c*dz;const rx=wall.w/2+radius,rz=wall.d/2+radius;
  if(Math.abs(x)>=rx||Math.abs(z)>=rz)continue;
  const nx=rx-Math.abs(x),nz=rz-Math.abs(z);let ax=0,az=0;
  if(nx<nz){ax=x<0?-1:1;x=ax*rx;}else{az=z<0?-1:1;z=az*rz;}
  p.x=wall.x+c*x+s*z;p.z=wall.z-s*x+c*z;
  const wx=c*ax+s*az,wz=-s*ax+c*az;
  for(const [vx,vz]of [['vx','vz'],['kx','kz']]){const into=(p[vx]||0)*wx+(p[vz]||0)*wz;if(into<0){p[vx]=(p[vx]||0)-into*wx;p[vz]=(p[vz]||0)-into*wz;}}
 }
}
