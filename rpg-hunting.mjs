import {PONDS,MEADOW_BOUNDS,pondRadius,meadowHeight,trailAmount,meadowCoverNear,containMeadow} from './meadow-map.mjs';
import {inVillage} from './rpg-village-layout.mjs';
import {HABITAT_BY_SPECIES} from './rpg-habitats.mjs';

// Each family owns one named habitat; its three tiers have separate home positions.
export function dryHuntingPoint(x,z){
 if(x<6||inVillage({x,z})||Math.hypot(x,z)<15||Math.hypot(x/MEADOW_BOUNDS.x,z/MEADOW_BOUNDS.z)>.96)return false;
 if(PONDS.some(p=>pondRadius(p,x,z)<1.38))return false;
 if(meadowCoverNear(x,z).some(c=>Math.hypot(c.x-x,c.z-z)<c.r+2))return false;
 const h=meadowHeight(x,z);return Math.abs(h-meadowHeight(x+1.3,z))<.7&&Math.abs(h-meadowHeight(x,z+1.3))<.7;
}
export function huntingSpawns(species,tiers){
 const placed=[];
 for(const s of species)for(let i=0;i<tiers.length;i++){
  const home=HABITAT_BY_SPECIES.get(s.id),tier=tiers[i];if(!home)continue;
  const offset=[[-7,-7],[0,7],[8,-3]][i];
  let candidate=null;
  for(let j=0;j<240;j++){
   const angle=j*2.399963,range=j===0?0:1+Math.floor(j/16)*.8;
   const x=home.x+offset[0]+Math.sin(angle)*range,z=home.z+offset[1]+Math.cos(angle)*range;
   if(Math.hypot(x-home.x,z-home.z)>home.radius-2)continue;
   if(dryHuntingPoint(x,z)&&trailAmount(x,z)<.15&&placed.every(p=>Math.hypot(p.x-x,p.z-z)>8.5)){candidate={x,z};break;}
  }
  // Skip an obstructed habitat rather than placing a creature in water.
  if(candidate)placed.push({id:s.id+'-'+tier.level,species:s.id,tier:tier.level,...candidate});
 }
 return placed;
}
export function inCreatureTerritory(m,x,z){
 const h=HABITAT_BY_SPECIES.get(m.species);
 return !!h&&Math.hypot(x-h.x,z-h.z)<h.radius&&Math.hypot(x-m.homeX,z-m.homeZ)<11;
}
export function containHuntingCreature(m){
 const body={x:m.x,z:m.z,vx:0,vz:0,kx:0,kz:0,size:1};containMeadow(body);m.x=body.x;m.z=body.z;
 for(const pond of PONDS){const dx=m.x-pond.x,dz=m.z-pond.z,rx=pond.rx*1.38,rz=pond.rz*1.38,r=Math.hypot(dx/rx,dz/rz);if(r<1){m.x=pond.x+(r>.001?dx/r:rx);m.z=pond.z+(r>.001?dz/r:0);}}
 if(!inCreatureTerritory(m,m.x,m.z)||m.x<5||inVillage(m)||Math.hypot(m.x,m.z)<13){m.x=m.homeX;m.z=m.homeZ;m.target=0;m.phase='idle';}
}
