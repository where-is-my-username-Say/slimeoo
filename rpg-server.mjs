import {ITEMS,STARTERS,FIRST_DROP,NPCS,SPECIES,TIERS,TOWN,inTown,XP_TO_NEXT,makeSpawns,migrateCharacter,statsFor} from './rpg-content.mjs';
import {MEADOW_SPAWN,containMeadow} from './meadow-map.mjs';
const send=(p,m)=>{if(m.t==='rpg.world'&&p.ws.bufferedAmount>262144)return;try{p.ws.send(JSON.stringify(m));}catch{}};
const dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const inDuel=p=>Math.hypot(p.x,p.z)<=8.8;
const copy=o=>structuredClone(o);
export class RPGWorld {
 constructor(storage,players,broadcast,random=Math.random,now=()=>Date.now()){
  this.storage=storage;this.players=players;this.broadcast=broadcast;this.random=random;this.now=now;this.queue=Promise.resolve();this.epoch=crypto.randomUUID();this.pending=[];this.lastSnapshot=0;this.lastTick=now();
  this.monsters=makeSpawns().map(spawn=>{const s=SPECIES.find(s=>s.id===spawn.species),tier=TIERS.find(t=>t.level===spawn.tier);return {...spawn,homeX:spawn.x,homeZ:spawn.z,hp:Math.round(s.hp*tier.hp),maxHp:Math.round(s.hp*tier.hp),phase:'idle',until:0,target:0,angle:0,generation:0,damage:new Map()};});
 }
 enqueue(fn){const work=this.queue.then(fn);this.queue=work.catch(()=>{});return work;}
 roster(){return [...this.players.values()].filter(p=>p.joined&&p.character);}
 publicCharacter(p){return {id:p.id,level:p.character.level,weapon:p.character.gear.weapon,armor:p.character.gear.armor,maxHp:statsFor(p.character).maxHp};}
 character(p){send(p,{t:'rpg.character',character:p.character,hp:p.hp,mana:p.mana,stats:statsFor(p.character)});}
 async join(p,m,authenticatedKey=null){
  if(authenticatedKey){p.characterKey=authenticatedKey;}else{
   if(typeof m.characterToken!=='string'||!/^slm_[a-f0-9]{64}$/.test(m.characterToken))throw Error('A valid character key is required. Refresh this page.');
   const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(m.characterToken));p.characterKey='character:'+Array.from(new Uint8Array(hash),n=>n.toString(16).padStart(2,'0')).join('');
   if(await this.storage.get('auth:binding:'+p.characterKey))throw Error('This save is linked to Google. Sign in to load it.');
  }
  for(const old of this.players.values())if(old!==p&&old.characterKey===p.characterKey){old.joined=false;send(old,{t:'error',message:'This character was opened on another device.'});try{old.ws.close(4001,'Character moved');}catch{}}
  if(this.roster().length>=50)throw Error('Open Meadow is full. Try again shortly.');
  p.character=migrateCharacter(await this.storage.get(p.characterKey),{name:m.name,color:m.color,loadout:m.loadout,...m.legacy});
  p.character.name=String(m.name||p.character.name).replace(/[\x00-\x1f]/g,'').slice(0,16);p.character.color=Math.max(0,Math.min(3,Number(m.color??p.character.color)||0));p.name=p.character.name;p.color=p.character.color;p.ranks={};p.size=1;
  // Only cosmetics are migrated from the old client. XP, gold and equipment are never accepted from it.
  const spread=Math.sqrt(this.roster().length)*1.2;
  p.x=MEADOW_SPAWN.x+Math.cos(p.id*2.4)*spread;p.z=MEADOW_SPAWN.z+Math.sin(p.id*2.4)*spread;p.hp=statsFor(p.character).maxHp;p.mana=statsFor(p.character).maxMana;p.rpgAttackUntil=0;p.rpgFocusUntil=0;p.rpgDodgeUntil=0;p.joined=true;p.rpg=true;
  await this.storage.put(p.characterKey,copy(p.character));
  send(p,{t:'rpg.ready',version:1,character:p.character,hp:p.hp,mana:p.mana,stats:statsFor(p.character),monsters:this.snapshot(),heroes:this.roster().map(q=>this.publicCharacter(q))});
 }
 snapshot(){return this.monsters.map(m=>({id:m.id,species:m.species,tier:m.tier,x:+m.x.toFixed(2),z:+m.z.toFixed(2),hp:m.hp,maxHp:m.maxHp,phase:m.phase,until:m.until,angle:m.angle,target:m.target}));}
 async command(p,m){if(!p.joined||!p.character)return;const now=this.now();
  if(!m.op||typeof m.op!=='string'||!/^[-a-zA-Z0-9_:]{8,90}$/.test(m.op))return;
  if(p.character.seen.includes(m.op)){this.character(p);send(p,{t:'rpg.ack',op:m.op,duplicate:true});return;}
  if(now-(p.lastRpgCommand||0)<65){send(p,{t:'rpg.reject',op:m.op,message:'A little too fast.'});return;}p.lastRpgCommand=now;
  const before=copy(p.character),c=p.character;let changed=false;
  const fail=message=>{throw Error(message);};
  try{
   if(m.t==='rpg.save'){
    // A checkpoint can only save the server's current character, never client progress.
   }else if(m.t==='rpg.jump'){
    if(p.hp<=0||now<(p.jumpReady||0))fail('Wait until you land.');p.air=.7;p.jumpReady=now+750;this.broadcast({t:'rpg.fx',kind:'jump',who:p.id,x:p.x,z:p.z});
   }else if(m.t==='rpg.gesture'){
    if(!['slap','spit'].includes(m.kind)||p.hp<=0)fail('Cannot act now.');if(now<(p.gestureReady||0))fail('Recovering.');p.gestureReady=now+(m.kind==='slap'?550:850);const reach=m.kind==='slap'?3.8:13,power=m.kind==='slap'?Math.max(4,Math.round(statsFor(c).power*.65)):Math.max(3,Math.round(statsFor(c).power*.55));
    const target=this.monsters.find(q=>q.id===m.target&&q.hp>0),rival=this.players.get(Number(m.targetPlayer));
    p.attack=m.kind;p.attackTime=m.kind==='slap'?.35:.48;p.duration=p.attackTime;
    this.broadcast({t:'rpg.fx',kind:m.kind,who:p.id,target:target?.id,x:p.x,z:p.z,tx:target?.x??(p.x+Math.sin(p.r)*reach),tz:target?.z??(p.z+Math.cos(p.r)*reach)});
    if(target&&!inTown(p)&&dist(p,target)<=reach)this.pending.push({at:now+180,p:p.id,monster:target.id,generation:target.generation,power,weapon:'gesture',reach});
    if(rival?.joined&&rival.id!==p.id&&inDuel(p)&&inDuel(rival)&&dist(p,rival)<=reach)this.pending.push({at:now+180,p:p.id,duel:rival.id,power,reach});
   }else if(m.t==='rpg.attack'){
    const monster=this.monsters.find(q=>q.id===m.target);if(!monster||monster.hp<=0)fail('Choose a living creature.');if(inTown(p)||p.hp<=0)fail('Leave the safe town to hunt.');if(now<p.rpgAttackUntil)fail('Recovering from your last attack.');
    const weapon=ITEMS[c.gear.weapon],kind=weapon.kind,reach=kind==='sword'?3.8:kind==='bow'?weapon.id==='thornbow'?21:18:15;
    if(dist(p,monster)>reach)fail('Move closer to your target.');const focus=m.focus===true;
    if(focus&&!c.skills.includes('focus'))fail('Reach level 2 to learn Focus.');if(focus&&now<p.rpgFocusUntil)fail('Focus is recovering.');
    const cost=(kind==='spell'?weapon.level>=10?8:5:0)+(focus?12:0);if(p.mana<cost)fail('Not enough mana.');p.mana-=cost;
    const recovery=kind==='sword'?.62:kind==='bow'?.86:1.0;p.rpgAttackUntil=now+recovery*1000;if(focus)p.rpgFocusUntil=now+8000;
    p.r=Math.atan2(monster.x-p.x,monster.z-p.z);p.attack=kind==='spell'?'nova':kind==='bow'?'spit':'slap';p.attackTime=recovery;p.duration=recovery;
    this.pending.push({at:now+(kind==='sword'?160:kind==='bow'?310:400),p:p.id,monster:monster.id,generation:monster.generation,power:Math.round(statsFor(c).power*(focus?1.75:1)),weapon:weapon.id,reach});
    this.broadcast({t:'rpg.fx',kind:'attack',who:p.id,target:monster.id,weapon:weapon.id,focus,x:p.x,z:p.z,tx:monster.x,tz:monster.z});
   }else if(m.t==='rpg.dodge'){
    if(p.hp<=0||now<(p.rpgDashReady||0))fail('Dodge is recovering.');const angle=Number.isFinite(m.angle)?m.angle:p.r;p.kx=Math.sin(angle)*17;p.kz=Math.cos(angle)*17;p.dashTime=.22;p.rpgDodgeUntil=now+350;p.rpgDashReady=now+1400;this.broadcast({t:'rpg.fx',kind:'dodge',who:p.id,x:p.x,z:p.z});
   }else if(m.t==='rpg.equip'){
    const gear=ITEMS[m.item];if(!gear||!c.inventory[m.item]||!['sword','bow','spell','armor'].includes(gear.kind))fail('You do not own that equipment.');if(c.level<gear.level)fail('Requires level '+gear.level+'.');c.gear[gear.kind==='armor'?'armor':'weapon']=gear.id;changed=true;
   }else if(m.t==='rpg.use'){
    if(!c.inventory.potion)fail('No tonics left.');if(p.hp<=0)fail('Return to town first.');if(p.hp>=statsFor(c).maxHp)fail('Your health is full.');c.inventory.potion--;p.hp=Math.min(statsFor(c).maxHp,p.hp+35);changed=true;
   }else if(['rpg.buy','rpg.sell','rpg.upgrade','rpg.claim','rpg.rest'].includes(m.t)){
    const npc=NPCS.find(n=>n.id===m.npc);if(!inTown(p)||!npc||dist(p,npc)>6.5)fail('Speak to the villager in person.');
    if(m.t==='rpg.buy'){const item=ITEMS[m.item];if(!npc.stock?.includes(m.item)||!item)fail('Not sold here.');if(c.gold<item.price)fail('Not enough gold.');if(Object.keys(c.inventory).filter(k=>c.inventory[k]>0).length>=32&&!c.inventory[item.id])fail('Your bag is full.');c.gold-=item.price;c.inventory[item.id]=(c.inventory[item.id]||0)+1;changed=true;}
    if(m.t==='rpg.sell'){const item=ITEMS[m.item];if(npc.id!=='scrip'||!item||!c.inventory[item.id])fail('Nothing to sell.');if(Object.values(c.gear).includes(item.id))fail('Unequip it before selling.');c.inventory[item.id]--;c.gold+=item.kind==='material'?item.price:Math.max(1,Math.floor(item.price*.4));changed=true;}
    if(m.t==='rpg.upgrade'){if(npc.id!=='ember')fail('Visit Ember at the forge.');const item=c.gear.weapon,rank=c.upgrades[item]||0;if(rank>=3)fail('Phase 1 forging stops at +3.');if((c.inventory.shard||0)<3||c.gold<12*(rank+1))fail('Needs 3 shards and '+12*(rank+1)+' gold.');c.inventory.shard-=3;c.gold-=12*(rank+1);c.upgrades[item]=rank+1;changed=true;}
    if(m.t==='rpg.claim'){const quest=c.quests.firstSteps;if(npc.id!=='pip'||quest.kills<3||quest.claimed)fail('Pip needs three farm creatures defeated.');quest.claimed=true;c.inventory.dewvest=(c.inventory.dewvest||0)+1;c.gold+=25;this.addXP(c,20);changed=true;}
    if(m.t==='rpg.rest'){if(npc.id!=='mallow')fail('Visit Mallow at the inn.');p.hp=statsFor(c).maxHp;p.mana=statsFor(c).maxMana;}
   }else if(m.t==='rpg.respawn'){
    if(p.hp>0)fail('You are still standing.');p.x=TOWN.x;p.z=TOWN.z;p.vx=p.vz=p.kx=p.kz=0;p.hp=statsFor(c).maxHp;p.mana=statsFor(c).maxMana;
   }else fail('Unknown RPG action.');
   c.seen.push(m.op);c.seen=c.seen.slice(-256);c.revision++;c.updatedAt=now;
   await this.storage.put(p.characterKey,copy(c));
   this.character(p);send(p,{t:'rpg.ack',op:m.op,revision:c.revision,savedAt:c.updatedAt});if(changed)this.broadcast({t:'rpg.heroes',heroes:this.roster().map(q=>this.publicCharacter(q))});
  }catch(error){p.character=before;send(p,{t:'rpg.reject',op:m.op,message:error.message||'Action could not be saved. Try again.'});}
 }
 addXP(c,xp){c.xp+=xp;while(c.xp>=XP_TO_NEXT(c.level)&&c.level<50){c.xp-=XP_TO_NEXT(c.level);c.level++;}if(c.level>=2&&!c.skills.includes('focus'))c.skills.push('focus');}
 async reward(monster){
  const participants=this.roster().filter(p=>monster.damage.has(p.characterKey)&&dist(p,monster)<36&&p.hp>0);if(!participants.length)return;
  const receipt='reward:'+this.epoch+':'+monster.id+':'+monster.generation;
  const entries={},rewards=[];for(const p of participants){const c=copy(p.character);if(c.seen.includes(receipt))continue;const first=c.kills===0,xp=Math.round((8+SPECIES.findIndex(s=>s.id===monster.species)%5*2)*Math.pow(monster.tier,.85)/Math.sqrt(participants.length));this.addXP(c,xp);c.kills++;c.quests.firstSteps.kills=Math.min(3,c.quests.firstSteps.kills+1);c.gold+=Math.round(5+monster.tier*1.6);c.inventory.shard=(c.inventory.shard||0)+1;const loot=['shard'];
   if(first){const drop=FIRST_DROP[c.loadout]||'dewblade';c.inventory[drop]=(c.inventory[drop]||0)+1;loot.push(drop);}
   else if(this.random()<.14){const kinds=monster.tier===1?['dewblade','dewbow','dewspell','dewvest']:monster.tier===5?['ironblade','ironbow','ironspell','ironvest']:['thornblade','thornbow','thornspell','thornvest'];const sourceIndex=[0,0,3,1,3,1,0,2,1,0,3,3,1,3,2,2,2,1,0,2,1,2,3,2,0][SPECIES.findIndex(s=>s.id===monster.species)];const drop=kinds[sourceIndex];c.inventory[drop]=(c.inventory[drop]||0)+1;loot.push(drop);}
   if(this.random()<.035){c.inventory.petal=(c.inventory.petal||0)+1;loot.push('petal');}c.seen.push(receipt);c.seen=c.seen.slice(-256);c.revision++;c.updatedAt=this.now();entries[p.characterKey]=c;rewards.push({p,c,xp,loot,levelUp:c.level>p.character.level});
  }
  // One atomic multi-key write commits the entire party reward before notifying clients.
  if(!rewards.length)return;
  await this.storage.transaction(async txn=>{await txn.put(entries);});
  for(const {p,c,xp,loot,levelUp}of rewards){p.character=c;if(levelUp){p.hp=statsFor(c).maxHp;p.mana=statsFor(c).maxMana;}this.character(p);send(p,{t:'rpg.loot',xp,loot,levelUp,source:monster.id,revision:c.revision});}
 }
 async tick(){const now=this.now(),dt=Math.min(.12,Math.max(0,(now-this.lastTick)/1000));this.lastTick=now;const players=this.roster();if(!players.length)return;
  for(const p of players){const stats=statsFor(p.character);if(inTown(p)&&p.hp>0)p.hp=Math.min(stats.maxHp,p.hp+dt*10);p.mana=Math.min(stats.maxMana,p.mana+dt*4);}
  for(const hit of this.pending.filter(h=>h.at<=now)){const p=this.players.get(hit.p);if(hit.duel){const rival=this.players.get(hit.duel);if(p?.joined&&rival?.joined&&p.hp>0&&rival.hp>0&&inDuel(p)&&inDuel(rival)&&dist(p,rival)<=hit.reach+1&&now>=rival.rpgDodgeUntil){rival.hp=Math.max(0,rival.hp-hit.power);this.broadcast({t:'rpg.fx',kind:'hurt',who:rival.id,damage:hit.power,x:rival.x,z:rival.z});if(!rival.hp)send(rival,{t:'rpg.down'});}continue;}
   const m=this.monsters.find(m=>m.id===hit.monster);if(!p?.joined||p.hp<=0||!m||m.hp<=0||hit.generation!==m.generation||dist(p,m)>hit.reach+3)continue;
   const victims=[m];if(['ironblade','ironbow','thornspell'].includes(hit.weapon))for(const q of this.monsters)if(q!==m&&q.hp>0&&dist(q,m)<4&&victims.length<3)victims.push(q);
   for(const victim of victims){const guarding=victim.phase==='windup'&&SPECIES.find(s=>s.id===victim.species).pattern==='guard';const damage=Math.max(1,hit.power-(guarding?Math.round(hit.power*.5):0));victim.hp=Math.max(0,victim.hp-damage);victim.damage.set(p.characterKey,(victim.damage.get(p.characterKey)||0)+damage);this.broadcast({t:'rpg.fx',kind:'hit',who:p.id,target:victim.id,damage,x:victim.x,z:victim.z});if(['ironspell','thornblade'].includes(hit.weapon)&&victim.phase==='windup'){victim.phase='recover';victim.until=now+1200;}if(victim.hp===0){victim.phase='dead';victim.until=now+14000;victim.rewardPending=true;await this.reward(victim);victim.rewardPending=false;}}
  }
  this.pending=this.pending.filter(h=>h.at>now);
  for(const m of this.monsters){const s=SPECIES.find(s=>s.id===m.species),tier=TIERS.find(t=>t.level===m.tier);
   if(m.hp<=0){if(m.rewardPending){try{await this.reward(m);m.rewardPending=false;}catch{continue;}}if(now>=m.until){m.hp=m.maxHp;m.x=m.homeX;m.z=m.homeZ;m.phase='idle';m.generation++;m.damage.clear();}continue;}
   let target=players.find(p=>p.id===m.target&&p.hp>0&&!inTown(p)&&dist(p,m)<22&&dist(m,{x:m.homeX,z:m.homeZ})<18);
   if(!target){target=players.filter(p=>p.hp>0&&!inTown(p)&&dist(p,m)<(m.tier===1?6.5:9)).sort((a,b)=>dist(a,m)-dist(b,m))[0];m.target=target?.id||0;}
   if(!target){m.phase='idle';const dx=m.homeX-m.x,dz=m.homeZ-m.z,len=Math.hypot(dx,dz);if(len>.3){m.x+=dx/len*dt*2;m.z+=dz/len*dt*2;}continue;}
   const distance=dist(m,target),ranged=['line','lob','cone','bolt'].includes(s.pattern),reach=ranged?8:s.pattern==='slam'||s.pattern==='ring'?4.6:2.8;
   if(m.phase==='windup'&&now>=m.until){
    let struck=distance<reach+1;
    const facing=Math.abs(Math.atan2(Math.sin(Math.atan2(target.x-m.x,target.z-m.z)-m.angle),Math.cos(Math.atan2(target.x-m.x,target.z-m.z)-m.angle)));
    if(['line','bolt','charge','cone','pounce','lob'].includes(s.pattern))struck=struck&&facing<(s.pattern==='cone'?.75:.38);
    if(s.pattern==='charge'||s.pattern==='pounce'){m.x+=Math.sin(m.angle)*2.5;m.z+=Math.cos(m.angle)*2.5;}
    if(struck&&now>=target.rpgDodgeUntil&&!inTown(target)&&!(s.pattern==='slam'&&target.air>.15)){const damage=Math.max(1,Math.round(s.damage*tier.damage)-statsFor(target.character).armor);target.hp=Math.max(0,target.hp-damage);this.broadcast({t:'rpg.fx',kind:'hurt',who:target.id,target:m.id,damage,x:target.x,z:target.z});if(!target.hp){send(target,{t:'rpg.down'});target.ix=target.iz=0;}}
    m.phase='recover';m.until=now+900;continue;
   }
   if(m.phase==='windup'||m.phase==='recover'&&now<m.until)continue;
   if(distance<reach){m.angle=Math.atan2(target.x-m.x,target.z-m.z);m.phase='windup';m.until=now+s.windup*1000;}
   else{m.phase='walk';m.angle=Math.atan2(target.x-m.x,target.z-m.z);m.x+=Math.sin(m.angle)*dt*(2.3+m.tier*.06);m.z+=Math.cos(m.angle)*dt*(2.3+m.tier*.06);if(inTown(m)){m.x-=Math.sin(m.angle)*dt*3;m.z-=Math.cos(m.angle)*dt*3;}}
  }
  if(now-this.lastSnapshot>=150){this.lastSnapshot=now;const monsters=this.snapshot(),heroes=players.map(p=>({...this.publicCharacter(p),hp:Math.ceil(p.hp),mana:Math.floor(p.mana)}));for(const p of players)send(p,{t:'rpg.world',at:now,monsters:monsters.filter(m=>dist(m,p)<62),heroes});}
 }
}
