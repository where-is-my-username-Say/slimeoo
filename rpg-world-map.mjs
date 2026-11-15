import {HABITATS,HABITAT_TRAILS} from './rpg-habitats.mjs';
import {PONDS} from './meadow-map.mjs';
import {SPECIES,TOWN} from './rpg-content.mjs';

export function habitatLegend(){return '<ol class="habitat-key">'+HABITATS.map(h=>`<li><b>${SPECIES.find(s=>s.id===h.species).name}</b><span>${h.name}</span></li>`).join('')+'</ol>';}
export function drawWorldMap(canvas,{local,poses,monsters,id}){
 if(!canvas)return;const c=canvas.getContext('2d'),w=canvas.width,h=canvas.height,large=w>300;
 // The atlas frames settled land; the minimap follows the player at walking scale.
 const spanX=large?390:140,spanZ=spanX*h/w,cx=large?95:local.x,cz=large?0:local.z;
 const sx=x=>(x-cx)/spanX*w+w/2,sz=z=>(z-cz)/spanZ*h+h/2;
 c.fillStyle='#36463e';c.fillRect(0,0,w,h);
 c.strokeStyle='#8e8265';c.lineWidth=large?2:1;
 for(const route of HABITAT_TRAILS){c.beginPath();route.points.forEach(([x,z],i)=>i?c.lineTo(sx(x),sz(z)):c.moveTo(sx(x),sz(z)));c.stroke();}
 for(const p of PONDS){c.fillStyle='#557b7e';c.beginPath();c.ellipse(sx(p.x),sz(p.z),p.rx/spanX*w,p.rz/spanZ*h,0,0,Math.PI*2);c.fill();}
 for(const home of HABITATS){
  c.fillStyle=home.color;c.globalAlpha=.65;c.beginPath();c.ellipse(sx(home.x),sz(home.z),home.radius/spanX*w,home.radius/spanZ*h,0,0,Math.PI*2);c.fill();c.globalAlpha=1;
  if(large){c.fillStyle='#ece5d1';c.font='bold 12px system-ui';c.textAlign='center';c.fillText(String(home.index+1),sx(home.x),sz(home.z)+4);}
 }
 c.fillStyle='#93977b';c.beginPath();c.ellipse(sx(TOWN.x),sz(TOWN.z),TOWN.radius/spanX*w,TOWN.radius/spanZ*h,0,0,Math.PI*2);c.fill();
 c.strokeStyle='#c7ab77';c.beginPath();c.ellipse(sx(0),sz(0),8.8/spanX*w,8.8/spanZ*h,0,0,Math.PI*2);c.stroke();
 for(const m of monsters.values())if(m.hp>0){c.fillStyle=m.tier===1?'#aec08e':m.tier===5?'#c6a76e':'#ad98bf';c.fillRect(sx(m.x)-1,sz(m.z)-1,2,2);}
 for(const p of poses.values()){if(p.id===id)continue;c.fillStyle='#9ebbc0';c.beginPath();c.arc(sx(p.x),sz(p.z),2,0,7);c.fill();}
 c.fillStyle='#f2e5bd';c.beginPath();c.arc(sx(local.x),sz(local.z),3.3,0,7);c.fill();
 if(large){c.textAlign='center';c.fillStyle='#e4dfcd';c.font='bold 12px Georgia';c.fillText('DEWBELL',sx(TOWN.x),sz(TOWN.z));c.font='9px system-ui';c.fillText('DUEL RING',sx(0),sz(-12));}
}
