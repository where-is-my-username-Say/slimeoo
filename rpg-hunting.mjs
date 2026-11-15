import {PONDS,MEADOW_BOUNDS,pondRadius,meadowHeight,trailAmount,meadowCoverNear,containMeadow} from './meadow-map.mjs';
import {inVillage} from './rpg-village-layout.mjs';

// Five small habitats per tier replace the old straight rows through the ponds.
export const HUNTING_CAMPS={
 1:[[14,29],[29,-17],[14,-36],[35,48],[36,7]],
 5:[[57,8],[73,-18],[84,19],[80,61],[51,-31]],
 10:[[101,20],[111,-15],[99,-43],[109,49],[88,70]]
};
export function dryHuntingPoint(x,z){
 if(x<6||inVillage({x,z})||Math.hypot(x,z)<15||Math.hypot(x/MEADOW_BOUNDS.x,z/MEADOW_BOUNDS.z)>.96)return false;
 if(PONDS.some(p=>pondRadius(p,x,z)<1.38))return false;
 if(meadowCoverNear(x,z).some(c=>Math.hypot(c.x-x,c.z-z)<c.r+2))return false;
 const h=meadowHeight(x,z);return Math.abs(h-meadowHeight(x+1.3,z))<.7&&Math.abs(h-meadowHeight(x,z+1.3))<.7;
}
export function huntingSpawns(species,tiers){
 const placed=[];
 for(const tier of tiers)for(let i=0;i<species.length;i++){
  const centre=HUNTING_CAMPS[tier.level][Math.floor(i/5)],member=i%5;
  let candidate=null;
  for(let j=0;j<400;j++){
   const angle=member*Math.PI*2/5+j*2.399963,range=3.6+(j%9)*.8+Math.floor(j/60)*1.5;
   const x=centre[0]+Math.sin(angle)*range,z=centre[1]+Math.cos(angle)*range;
   if(dryHuntingPoint(x,z)&&trailAmount(x,z)<.15&&placed.every(p=>Math.hypot(p.x-x,p.z-z)>3.8)){candidate={x,z};break;}
  }
  // Skip an obstructed habitat rather than placing a creature in water.
  if(candidate)placed.push({id:species[i].id+'-'+tier.level,species:species[i].id,tier:tier.level,...candidate});
 }
 return placed;
}
export function containHuntingCreature(m){
 const body={x:m.x,z:m.z,vx:0,vz:0,kx:0,kz:0,size:1};containMeadow(body);m.x=body.x;m.z=body.z;
 for(const pond of PONDS){const dx=m.x-pond.x,dz=m.z-pond.z,rx=pond.rx*1.38,rz=pond.rz*1.38,r=Math.hypot(dx/rx,dz/rz);if(r<1){m.x=pond.x+(r>.001?dx/r:rx);m.z=pond.z+(r>.001?dz/r:0);}}
 if(m.x<5||inVillage(m)||Math.hypot(m.x,m.z)<13){m.x=m.homeX;m.z=m.homeZ;m.target=0;m.phase='idle';}
}
