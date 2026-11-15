import * as T from './vendor/three.module.js';
import {slimeModel} from './rpg-actors.mjs';
import {sanitizeAppearance,ORIGINAL_COLORS} from './rpg-appearance.mjs';
import {createOriginalSpit,animateOriginalSpit} from './rpg-original-slime.mjs';

export function createCharacterMenu({renderer,onChange,onSound,initial}){
 const $=id=>document.getElementById(id),scene=new T.Scene();scene.background=new T.Color('#e1e7d4');
 const camera=new T.PerspectiveCamera(38,1,.1,40);camera.position.set(2.4,1.9,5.0);camera.lookAt(0,.9,0);
 scene.add(new T.HemisphereLight('#fff9e6','#8a9c76',1));const sun=new T.DirectionalLight('#fff2d2',1.4);sun.position.set(-3,6,5);scene.add(sun);
 const slime=slimeModel('#29977c'),pedestal=new T.Mesh(new T.CylinderGeometry(2.7,2.85,.13,64),new T.MeshToonMaterial({color:'#d2d9c0'}));pedestal.position.y=-.11;scene.add(pedestal,slime.root);
 const area=$('character-preview');let appearance=sanitizeAppearance(initial),yaw=.15,drag=null,demo=null,projectile=null,spitAt=0,combo=0;
 function sync(){
  slime.setAppearance(appearance);$('custom-color').value=appearance.tint;
  for(const key of ['size','width','height','hands','eyes']){$('shape-'+key).value=appearance[key];$('value-'+key).textContent=Math.round(appearance[key]*100)+'%';}
  for(const key of ['crown','blush','showGear'])$('look-'+key).checked=appearance[key];
  document.querySelectorAll('#colors button').forEach((b,i)=>{b.classList.toggle('chosen',ORIGINAL_COLORS[i]===appearance.tint);b.setAttribute('aria-pressed',String(ORIGINAL_COLORS[i]===appearance.tint));});
 }
 const change=()=>{appearance=sanitizeAppearance(appearance);sync();onChange({...appearance});};
 for(const key of ['size','width','height','hands','eyes'])$('shape-'+key).addEventListener('input',e=>{appearance[key]=Number(e.target.value);change();});
 for(const key of ['crown','blush','showGear'])$('look-'+key).addEventListener('change',e=>{appearance[key]=e.target.checked;change();});
 $('custom-color').addEventListener('input',e=>{appearance.tint=e.target.value;change();});
 $('reset-look').onclick=()=>{appearance=sanitizeAppearance();change();};
 area.addEventListener('pointerdown',e=>{drag={id:e.pointerId,x:e.clientX};area.setPointerCapture(e.pointerId);});
 area.addEventListener('pointermove',e=>{if(drag?.id===e.pointerId){yaw+=(e.clientX-drag.x)*.012;drag.x=e.clientX;}});
 for(const event of ['pointerup','pointercancel'])area.addEventListener(event,()=>drag=null);
 area.addEventListener('keydown',e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();yaw+=e.key==='ArrowLeft'?-.15:.15;}});
 document.querySelectorAll('[data-preview]').forEach(button=>button.onclick=()=>{
  const kind=button.dataset.preview,time=performance.now()/1000;demo={kind,start:time};
  if(kind==='slap'){slime.trigger('slap',time,.36,combo++%3);onSound('slap');}
  if(kind==='spit'){slime.trigger('spit',time,.34);spitAt=time+.14;}
 });
 sync();
 return {set(value){appearance=sanitizeAppearance(value);sync();},setColor(value){appearance.tint=value;change();},setWeapon(id){slime.setWeapon(id);},
  render(time){
   const rect=area.getBoundingClientRect();renderer.setRenderTarget(null);renderer.setScissorTest(false);renderer.setViewport(0,0,innerWidth,innerHeight);renderer.setClearColor('#f1eddc',1);renderer.clear();
   if(rect.width<1||rect.height<1||rect.bottom<0||rect.top>innerHeight)return;
   const t=time/1000,age=demo?t-demo.start:10;
   if(spitAt&&t>=spitAt){spitAt=0;if(projectile){scene.remove(projectile.mesh);for(const texture of projectile.mesh.userData.ownedTextures||[])texture.dispose();projectile.mesh.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});}const mesh=createOriginalSpit(T,appearance.tint);mesh.position.set(0,appearance.size,1.3);scene.add(mesh);projectile={mesh,start:t};onSound('spit');}
   slime.root.rotation.y=yaw;slime.root.position.y=demo?.kind==='jump'&&age<.7?Math.sin(age/.7*Math.PI)*1.3:0;
   slime.animate(t,demo?.kind==='walk'&&age<2.5?6:0,null,demo?.kind==='wave'&&age<2?3:0,slime.root.position.y>0?.7-age:0,age);
   if(projectile){const f=(t-projectile.start)/.48;projectile.mesh.position.set(Math.sin(yaw)*(1.3+f*4),appearance.size-.3*f,Math.cos(yaw)*(1.3+f*4));projectile.mesh.rotation.y=yaw;animateOriginalSpit(projectile.mesh,t);if(f>=1){scene.remove(projectile.mesh);for(const texture of projectile.mesh.userData.ownedTextures||[])texture.dispose();const g=new Set(),m=new Set();projectile.mesh.traverse(o=>{if(o.geometry)g.add(o.geometry);if(o.material)m.add(o.material);});g.forEach(o=>o.dispose());m.forEach(o=>o.dispose());projectile=null;}}
   camera.aspect=rect.width/rect.height;camera.updateProjectionMatrix();renderer.setViewport(rect.left,innerHeight-rect.bottom,rect.width,rect.height);renderer.setScissor(rect.left,innerHeight-rect.bottom,rect.width,rect.height);renderer.setScissorTest(true);renderer.render(scene,camera);renderer.setScissorTest(false);renderer.setViewport(0,0,innerWidth,innerHeight);
  },dispose(){slime.dispose();pedestal.geometry.dispose();pedestal.material.dispose();}
 };
}
