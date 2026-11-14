import { DurableObject } from 'cloudflare:workers';
import { MAP_REVISION, MEADOW_SPAWN, containMeadow, meadowWaterPace } from './meadow-map.mjs';
import { RPGWorld } from './rpg-server.mjs';

const CAP=50, PROTOCOL=2, INPUT=54, STATE=55, PLAYER_BYTES=33;
// These indices are the emote values in the browser's 33-byte player records.
const EMOTES = ['none', 'dance', 'sit', 'wave', 'spin', 'bounce'];
const EMOTE_DURATIONS = [0, 0, 0, 1.65, 1.15, 1.45];
const ALLOWED_ORIGINS=new Set(['https://slimeoo-plum.vercel.app']);
const cors={ 'Access-Control-Allow-Origin':'*', 'Access-Control-Allow-Methods':'GET, OPTIONS', 'Content-Type':'application/json' };
const response=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:cors});
const bounded=(v,lo,hi)=>Math.min(hi,Math.max(lo,Number.isFinite(v)?v:0));
const wrap=a=>Math.atan2(Math.sin(a),Math.cos(a));
const meadowSize=ranks=>[1,1.10,1.19,1.29][ranks?.colossus]||1;
const send=(ws,p)=>{try{ws.send(JSON.stringify(p));}catch{}};
export class GameRoom extends DurableObject {
  constructor(ctx,env){
    super(ctx,env); this.players=new Map(); this.tickNumber=0; this.chatId=0; this.loop=null;
    this.rpg=new RPGWorld(ctx.storage,this.players,packet=>this.broadcast(packet));
    // A restored socket only has its ID attached. Ask clients to rejoin for a fresh state.
    for(const ws of ctx.getWebSockets()) {
      try { ws.close(1012, 'Open Meadow restarted'); } catch {}
    }
  }
  startTicking(){
    if(this.loop===null) this.loop=setInterval(()=>this.tick(),50);
  }
  roster(){return [...this.players.values()].filter(p=>p.joined).map(p=>({id:p.id,name:p.name,color:p.color,ranks:p.ranks,wins:p.wins||0,...(p.character?this.rpg.publicCharacter(p):{})}));}
  broadcast(data){const raw=JSON.stringify(data);for(const p of this.players.values())if(p.joined)try{p.ws.send(raw);}catch{}}
  async fetch(req){
    if(req.headers.get('Upgrade')?.toLowerCase()!=='websocket')return response({ok:true,protocol:PROTOCOL,capacity:CAP,players:this.roster().length,map:MAP_REVISION});
    // Leave a few pending connections so a reconnect can replace its existing slot.
    if(this.players.size>=CAP+12)return response({error:'room_full',message:'Open Meadow is full.'},409);
    const pair=new WebSocketPair(),[client,server]=Object.values(pair);
    const taken=new Set(this.players.keys()); let id=1;while(taken.has(id)&&id<=65535)id++;
    const p={id,map:'',openedAt:Date.now(),name:'Slime',color:0,ranks:{},wins:0,joined:false,x:0,z:0,r:0,vx:0,vz:0,kx:0,kz:0,hp:100,en:0,seq:0,ready:false,actions:[0,0,0,0],attack:'',attackTime:0,duration:0,contactTime:0,dashTime:0,dash:0,air:0,stun:0,shield:0,emote:0,emoteAge:0,emoteUntil:0,chatAt:0};
    server.binaryType='arraybuffer';
    server.serializeAttachment({id});this.ctx.acceptWebSocket(server);this.players.set(id,{...p,ws:server});
    this.startTicking();
    return new Response(null,{status:101,webSocket:client});
  }
  async webSocketMessage(ws,raw){
    const id=ws.deserializeAttachment()?.id,p=this.players.get(id);if(p?.ws!==ws)return;
    if(typeof raw!=='string'){
      if(!p.joined)return;
      const buf=raw instanceof Blob?await raw.arrayBuffer():raw;
      if(this.players.get(id)!==p||!(buf instanceof ArrayBuffer)||buf.byteLength!==22)return;
      const v=new DataView(buf);if(v.getUint8(0)!==INPUT||v.getUint8(1)!==PROTOCOL)return;
      const seq=v.getUint32(4);if(seq<=p.seq)return;
      p.seq=seq;p.ready=v.getUint8(2)===1;
      p.ix=bounded(v.getInt16(8)/16000,-1,1);p.iz=bounded(v.getInt16(10)/16000,-1,1);
      p.aim=wrap(v.getInt16(12)/10000);
      for(let i=0;i<4;i++){
        const count=v.getUint16(14+i*2);if(count===p.actions[i])continue;
        p.actions[i]=count;
        if(p.rpg)continue;
        if (p.emote) p.emote=p.emoteAge=p.emoteUntil=0;
        if(i===0){p.attack='slap';p.attackTime=.33;p.duration=.33;p.contactTime=.14;}
        if(i===1){p.attack='spit';p.attackTime=.48;p.duration=.48;p.contactTime=.2;}
        if(i===2&&p.dash<=0){p.dashTime=.2;p.dash=1.1;p.kx=p.ix*15;p.kz=p.iz*15;}
        if(i===3&&p.en>=100){p.en=0;p.attack='nova';p.attackTime=.7;p.duration=.7;p.contactTime=.35;}
      }
      return;
    }
    if(raw.length>16000)return;
    let m;try{m=JSON.parse(raw);}catch{return;}if(!m||typeof m.t!=='string')return;
    if(m.t==='leave'){this.leave(ws);return;}
    if(m.t==='join'){
      if(m.protocol!==PROTOCOL || m.map!==undefined && m.map!==MAP_REVISION){
        send(ws,{t:'error',message:'Open Meadow has updated. Refresh the game to rejoin.'});this.leave(ws);return;
      }
      if(p.joined)return;
      if(m.rpg===1){
        if(this.roster().length>=CAP){send(ws,{t:'error',message:'Open Meadow is full.'});this.leave(ws);return;}
        p.map=MAP_REVISION;
        try{await this.rpg.enqueue(()=>this.rpg.join(p,m));if(this.players.get(id)!==p)return;send(ws,{t:'joined',id:p.id,x:p.x,z:p.z,map:MAP_REVISION,players:this.roster().length,roster:this.roster()});this.broadcast({t:'roster',players:this.roster().length,roster:this.roster()});}
        catch(error){send(ws,{t:'error',message:error.message||'Character could not be loaded.'});this.leave(ws);}return;
      }
      const browserKey = typeof m.browserKey === 'string' && /^[a-f0-9-]{16,64}$/.test(m.browserKey) ? m.browserKey : '';
      if (browserKey) {
        for (const other of [...this.players.values()]) {
          if (other.id !== p.id && other.browserKey === browserKey) {
            send(other.ws,{t:'error',message:'This browser opened Open Meadow in another tab.'});
            this.leave(other.ws);
          }
        }
      }
      if(this.roster().length>=CAP){send(ws,{t:'error',message:'Open Meadow is full.'});this.leave(ws);return;}
      p.browserKey = browserKey;
      p.map=m.map||'';
      p.joined=true;p.name=String(m.name||'Slime').slice(0,16);p.color=bounded(m.color|0,0,3);
      p.ranks=m.ranks&&typeof m.ranks==='object'?m.ranks:{};
      p.size=meadowSize(p.ranks);
      p.x=MEADOW_SPAWN.x+(Math.random()-.5)*5;p.z=MEADOW_SPAWN.z+(Math.random()-.5)*5;
      if(p.map===MAP_REVISION) { p.r=MEADOW_SPAWN.r;containMeadow(p); }
      send(ws,{t:'joined',id:p.id,x:p.x,z:p.z,map:MAP_REVISION,players:this.roster().length,roster:this.roster()});
      this.broadcast({t:'roster',players:this.roster().length,roster:this.roster()});
    }else if(!p.joined)return;
    else if(m.t.startsWith('rpg.')){await this.rpg.enqueue(()=>this.rpg.command(p,m));return;}
    else if(m.t==='ping'&&Number.isFinite(m.stamp))send(ws,{t:'pong',stamp:m.stamp});
    else if(m.t==='build'){
      if(p.rpg)return;
      p.ranks=m.ranks&&typeof m.ranks==='object'?m.ranks:{};
      p.size=meadowSize(p.ranks);
      send(ws,{t:'build',ok:true});this.broadcast({t:'roster',players:this.roster().length,roster:this.roster()});
    }else if(m.t==='chat'){
      const now=Date.now();if(now-p.chatAt<750){send(ws,{t:'chatWait'});return;}
      const text=String(m.text||'').replace(/[\x00-\x1f\x7f]/g,' ').trim().slice(0,320);if(!text)return;
      p.chatAt=now;this.broadcast({t:'chat',id:++this.chatId,who:p.id,name:p.name,color:p.color,text});
    }else if(m.t==='voiceSignal'){
      const target=this.players.get(m.to);
      if(!target?.joined||target.id===p.id||!m.data||typeof m.data!=='object')return;
      const d=m.data;
      if(!['offer','answer','ice','end'].includes(d.kind))return;
      if(JSON.stringify(d).length>14000)return;
      send(target.ws,{t:'voiceSignal',from:p.id,data:d});
    }else if(m.t==='emote'){
      if(m.key==='playSlap'){
        p.emote=p.emoteAge=p.emoteUntil=0;
        p.attack='slap';p.attackTime=.3;p.duration=.3;p.contactTime=.12;
        return;
      }
      const next=m.key==='random' ? 1+Math.floor(Math.random()*(EMOTES.length-1)) : EMOTES.indexOf(m.key);
      if(next<0)return;
      p.emote=p.emote===next?0:next;
      p.emoteAge=0;
      const duration=EMOTE_DURATIONS[p.emote];
      p.emoteUntil=duration?Date.now()+duration*1000:0;
    }
  }
  tick(){
    const players=[];
    const now=Date.now();
    for(const p of this.players.values()) {
      if(p.joined) players.push(p);
      else if(now-(p.openedAt||0)>8000) this.leave(p.ws);
    }
    if(!players.length)return;
    const dt=.05, factor=1-Math.exp(-19*dt), drag=Math.exp(-12.5*dt);this.tickNumber++;
    for(const p of players){
      p.dash=Math.max(0,p.dash-dt);p.dashTime=Math.max(0,p.dashTime-dt);p.air=Math.max(0,p.air-dt);
      p.attackTime=Math.max(0,p.attackTime-dt);if(!p.attackTime)p.attack='';
      if(p.emote){
        p.emoteAge+=dt;
        if(p.emoteUntil && now>=p.emoteUntil || Math.hypot(p.ix||0,p.iz||0)>.12) p.emote=p.emoteAge=p.emoteUntil=0;
      }
      const ix=p.ix||0,iz=p.iz||0,len=Math.max(1,Math.hypot(ix,iz));
      const expanded=p.map===MAP_REVISION;
      const speed=(p.rpg&&p.hp<=0?0:7.35)*(expanded?meadowWaterPace(p.x,p.z):1);
      const targetX=ix/len*speed,targetZ=iz/len*speed;
      p.vx+=(targetX-p.vx)*factor;p.vz+=(targetZ-p.vz)*factor;
      p.x+=(p.vx+p.kx)*dt;p.z+=(p.vz+p.kz)*dt;
      if(expanded) containMeadow(p);
      else {p.x=bounded(p.x,-90,90);p.z=bounded(p.z,-90,90);}
      p.kx*=drag;p.kz*=drag;
      if(p.ready&&!p.attack)p.r=p.aim||0;
    }
    if(this.tickNumber%2===0)void this.rpg.enqueue(()=>this.rpg.tick()).catch(()=>{});
    // Encode the common snapshot once. Each socket has its own acknowledgement.
    const data=new ArrayBuffer(12+players.length*PLAYER_BYTES),v=new DataView(data);
    v.setUint8(0,STATE);v.setUint8(1,PROTOCOL);v.setUint32(2,this.tickNumber);v.setUint8(10,players.length);v.setUint8(11,0);
    let o=12;const num=(at,n,scale)=>v.setInt16(at,Math.round(bounded(n*scale,-32767,32767)));
    const timer=(at,n)=>v.setUint8(at,Math.round(bounded(n,0,2.55)*100));
    for(const p of players){
        v.setUint16(o,p.id);num(o+2,p.x,100);num(o+4,p.z,100);num(o+6,wrap(p.r),10000);
        num(o+8,p.vx,300);num(o+10,p.vz,300);num(o+12,p.kx,300);num(o+14,p.kz,300);
        v.setUint16(o+16,Math.round(p.hp*10));v.setUint8(o+18,Math.round(p.en));
        v.setUint8(o+19,({slap:1,spit:2,nova:3}[p.attack]||0));
        timer(o+20,p.attackTime);timer(o+21,p.duration);timer(o+22,p.contactTime);
        timer(o+23,p.dashTime);timer(o+24,p.air);timer(o+25,p.dash);
        timer(o+26,p.stun);timer(o+27,0);v.setUint8(o+28,0);v.setUint8(o+29,0);
        v.setUint8(o+30,p.emote||0);v.setUint16(o+31,Math.round(bounded(p.emoteAge%40,0,40)*1000));o+=PLAYER_BYTES;
    }
    for(const receiver of players){
      const socket=receiver.ws;
      if(socket.readyState!==1 || socket.bufferedAmount>=262144) continue;
      v.setUint32(6,receiver.seq);
      try{socket.send(data.slice(0));}catch{}
    }
  }
  webSocketClose(ws){this.leave(ws);}webSocketError(ws){this.leave(ws);}
  leave(ws){
    const id=ws.deserializeAttachment()?.id;
    if(this.players.get(id)?.ws===ws){
      this.players.delete(id);
      this.broadcast({t:'roster',players:this.roster().length,roster:this.roster()});
      if(!this.players.size && this.loop!==null){clearInterval(this.loop);this.loop=null;}
    }
    try{ws.close();}catch{}
  }
}
export default {
  async fetch(req,env){
    const u=new URL(req.url),origin=req.headers.get('Origin');
    if(req.method==='OPTIONS')return new Response(null,{headers:cors});
    if(u.pathname==='/health')return response({ok:true,service:'slimeoo-multiplayer',protocol:PROTOCOL,maxPlayers:CAP,map:MAP_REVISION,rpg:1});
    if(origin&&origin!==u.origin&&!ALLOWED_ORIGINS.has(origin)&&!/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin))return response({error:'origin_not_allowed',origin},403);
    if(u.pathname==='/api/room'||u.pathname==='/room'||u.pathname==='/room/OPEN-MEADOW'){
      if(!env.GAME_ROOM)return response({error:'GAME_ROOM binding missing'},503);
      const id=env.GAME_ROOM.idFromName('OPEN-MEADOW');return env.GAME_ROOM.get(id).fetch(req);
    }
    return env.ASSETS?env.ASSETS.fetch(req):response({error:'not_found'},404);
  }
};
