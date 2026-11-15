// Character construction and slap/spit movement copied from the supplied original HTML.
// Reference SHA256: DA2CFB6D1F02EEA0B85E5EA8C27DBCD421AE389CC79CAF2B10B0D19218E3853B
export function createOriginalSlime(T,color=0x29977c){
const scene=new T.Group(),COLORS=[color],TAU=Math.PI*2;
const ramp=new T.DataTexture(new Uint8Array([45,45,45,125,125,125,205,205,205,255,255,255]),4,1,T.RGBFormat);ramp.minFilter=ramp.magFilter=T.NearestFilter;ramp.needsUpdate=true;
const colorMaterials=new Map();const mat=c=>{if(!colorMaterials.has(c))colorMaterials.set(c,new T.MeshToonMaterial({color:c,gradientMap:ramp}));return colorMaterials.get(c);};const outlineMat=new T.MeshBasicMaterial({color:0x17262e,side:T.BackSide});
function mesh(geo,m,x=0,y=0,z=0,parent=scene){const o=new T.Mesh(geo,typeof m==='number'?mat(m):m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o}
function makeSlime(color){const g=new T.Group(),jelly=new T.Group();g.add(jelly);scene.add(g);const bodyMat=new T.MeshToonMaterial({color:COLORS[color],gradientMap:ramp});const body=mesh(new T.SphereGeometry(1.15,32,24,0,TAU,0,Math.PI*.78),bodyMat,0,.62,0,jelly);body.scale.set(1,.84,1);const skirt=mesh(new T.SphereGeometry(.99,24,16),bodyMat,0,.32,0,jelly);skirt.scale.set(1.12,.35,1.12);const face=new T.Group();face.position.set(0,1.05,.90);jelly.add(face);const eyes=[];for(const side of[-1,1]){const eye=mesh(new T.SphereGeometry(.115,12,10),0x183d40,side*.29,0,.07,face);eye.scale.set(.75,1.35,.5);eyes.push(eye);mesh(new T.SphereGeometry(.032,8,6),new T.MeshBasicMaterial({color:0xf2f7e9}),side*.29-.02,.05,.127,face);const cheek=mesh(new T.SphereGeometry(.09,10,8),0xdb9c91,side*.49,-.12,.02,face);cheek.scale.set(1.5,.55,.3)}const smile=mesh(new T.TorusGeometry(.10,.022,6,16,Math.PI),0x285153,0,-.16,.09,face);smile.rotation.z=Math.PI;for(let i=0;i<7;i++){const a=(i-3)*.24,leaf=mesh(new T.SphereGeometry(.12,8,6),0xb7a15f,Math.sin(a)*.62,1.58+Math.cos(a)*.08,.15,jelly);leaf.scale.set(.6,1.3,.35);leaf.rotation.z=-a*1.4;}const shine=mesh(new T.SphereGeometry(.16,12,10),new T.MeshBasicMaterial({color:0xc9e7da,transparent:true,opacity:.4}),-.43,1.32,.72,jelly);shine.scale.set(1.5,.4,.2);const shadow=mesh(new T.CircleGeometry(1.2,32),new T.MeshBasicMaterial({color:0x344d46,transparent:true,opacity:.22,depthWrite:false}),0,.015,0,g);shadow.rotation.x=-Math.PI/2;const arms=[];for(const side of[-1,1]){const pivot=new T.Group();pivot.position.set(side*.83,.75,.12);jelly.add(pivot);const stem=mesh(new T.SphereGeometry(.28,14,10),bodyMat,side*.20,0,0,pivot);stem.scale.set(1.5,.7,.7);const palm=new T.Group();palm.position.set(side*.55,0,.1);pivot.add(palm);const pad=mesh(new T.SphereGeometry(.30,16,12),bodyMat,0,0,0,palm);pad.scale.set(1,.85,.44);for(let f=0;f<3;f++){const finger=mesh(new T.SphereGeometry(.09,10,8),bodyMat,(f-1)*.16,.24,.015,palm);finger.scale.set(.95,1.55,.9)}const thumb=mesh(new T.SphereGeometry(.12,10,8),bodyMat,-side*.29,.03,.02,palm);thumb.scale.set(.8,1.25,1);arms.push({pivot,palm,side})}
 const mouth=mesh(new T.SphereGeometry(.12,14,10),0x162b32,0,-.16,.11,face);mouth.scale.set(1,.1,.35);
 const outlines=[];jelly.traverse(o=>{if(o.isMesh&&o.material===bodyMat){const edge=new T.Mesh(o.geometry,outlineMat);edge.scale.setScalar(1.035);outlines.push([o,edge])}});outlines.forEach(([o,edge])=>o.add(edge));
 return{g,jelly,body,bodyMat,face,eyes,shadow,arms,mouth,smile,x:0,z:0,r:0}}

const result=makeSlime(0);scene.remove(result.g);result.shadow.castShadow=false;result.shadow.receiveShadow=false;
result.leaves=result.jelly.children.filter(o=>o.material?.color?.getHex()===0xb7a15f);
result.cheeks=result.face.children.filter(o=>o.material?.color?.getHex()===0xdb9c91);
const geometries=new Set(),materials=new Set();result.g.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material)materials.add(o.material);});result.disposeOriginal=()=>{for(const g of geometries)g.dispose();for(const m of materials)m.dispose();ramp.dispose();};
return result;
}
export function animateOriginalSlime(m,{time=0,speed=0,kind='',progress=1,combo=0,hit=0,phase=0}={}){
const clock=time,i=phase,p={combo,hit,color:0},COLORS=[m.bodyMat.color],clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
speed=clamp(speed,0,1);const hop=Math.abs(Math.sin(clock*10+i))*speed,slapping=kind==='slap',spitting=kind==='spit';
m.jelly.rotation.x=0;m.jelly.rotation.y=0;
const wind=slapping?Math.sin(Math.min(1,progress/.34)*Math.PI/2):0,release=slapping?clamp((progress-.32)/.28,0,1):0,recovery=slapping?clamp((progress-.62)/.38,0,1):0,puff=spitting?Math.sin(progress*Math.PI):0;
const sy=1+hop*.11-speed*.04-(slapping?Math.sin(progress*Math.PI)*.10:0)+puff*.06;
const sx=1/Math.sqrt(Math.max(.6,sy));m.jelly.scale.set(sx+puff*.09,sy,sx+puff*.09);m.jelly.position.y=hop*.14;m.jelly.rotation.z=Math.sin(clock*9)*speed*.025+(slapping?(p.combo===1?-1:1)*Math.sin(progress*Math.PI)*.14:0);
m.bodyMat.color.set(COLORS[p.color]);m.bodyMat.emissive.setScalar(p.hit>0?.5:0);m.face.rotation.x=-speed*.07;m.eyes.forEach(e=>e.scale.y=(clock+i)%4<.1?.2:1.35);m.shadow.scale.setScalar(1-hop*.08);m.smile.visible=!spitting;m.mouth.scale.y=spitting?.3+puff*1.7:.10;
for(const arm of m.arms){const active=slapping&&arm.side===(p.combo===1?-1:1);const strength=active?Math.sin(progress*Math.PI):0;arm.pivot.scale.setScalar(.55+strength*.8);arm.pivot.rotation.set(0,active?arm.side*(wind*1.3-release*3.0)*(1-recovery):arm.side*.15,arm.side*(.12+Math.sin(clock*4+i)*.06));arm.pivot.position.z=active?release*(1-recovery)*1.6:.10;arm.palm.rotation.y=active?-arm.side*.6:0;arm.palm.rotation.z=active?arm.side*-.22:arm.side*.2;}

}
export function createOriginalSpit(T,color){
 const root=new T.Group(),material=new T.MeshStandardMaterial({color,emissive:color,emissiveIntensity:.4,roughness:.1,transparent:true,opacity:.93}),geometry=new T.SphereGeometry(1,12,8),core=new T.Mesh(geometry,material);root.add(core);const blobs=[];
 for(let i=0;i<3;i++){const blob=new T.Mesh(geometry,material);root.add(blob);blobs.push(blob);}
 const canvas=document.createElement('canvas');canvas.width=canvas.height=32;const ctx=canvas.getContext('2d'),gradient=ctx.createRadialGradient(16,16,0,16,16,16);gradient.addColorStop(0,'rgba(255,255,255,.7)');gradient.addColorStop(.3,'rgba(255,255,255,.18)');gradient.addColorStop(1,'rgba(255,255,255,0)');ctx.fillStyle=gradient;ctx.fillRect(0,0,32,32);
 const glowTexture=new T.CanvasTexture(canvas),glow=new T.Sprite(new T.SpriteMaterial({map:glowTexture,color,blending:T.AdditiveBlending,transparent:true,depthWrite:false,opacity:.7}));glow.scale.set(2.2,2.2,1);root.add(glow);
 root.userData={core,blobs,ownedTextures:[glowTexture]};return root;
}
export function animateOriginalSpit(root,time,phase=0){const {core,blobs}=root.userData,w=Math.sin(time*30+phase);core.scale.set(.34+w*.03,.3-w*.03,.52+Math.abs(w)*.1);blobs.forEach((q,k)=>{q.position.set(Math.sin(time*20+k)*.05,-.04*k,-.4*(k+1));q.scale.setScalar(.26/(k+1)+.02);});}

export function reactOriginalSlime(m,dt,time){
const t=m.reaction||(m.reaction={a:0,b:0,va:0,vb:0,s:0,vs:0});t.va+=(-90*t.a-9*t.va)*dt;t.vb+=(-90*t.b-9*t.vb)*dt;t.vs+=(-120*t.s-8*t.vs)*dt;t.a+=t.va*dt;t.b+=t.vb*dt;t.s+=t.vs*dt;m.g.rotation.x=t.b;m.g.rotation.z=t.a;m.jelly.scale.y*=1+t.s;m.jelly.scale.x*=1-t.s*.5;m.jelly.scale.z*=1-t.s*.5;
if(time<(m.hurtUntil||0)){m.eyes.forEach(e=>e.scale.set(1.15,.25,.5));m.mouth.scale.set(1.8,1.6,.35);m.smile.visible=false;for(const a of m.arms)a.pivot.rotation.z+=Math.sin(time*40)*.5;}
else{m.mouth.scale.x=1;m.mouth.scale.z=.35;}
}
