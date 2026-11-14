import { DurableObject } from 'cloudflare:workers';
const MAX_PLAYERS = 50;
const ORIGIN = 'https://slimeoo-plum.vercel.app';
const reply = (data, status=200) => new Response(JSON.stringify(data), {status, headers:{'content-type':'application/json','access-control-allow-origin':ORIGIN}});
export class GameRoom extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.players = new Map();
    for (const ws of ctx.getWebSockets()) {
      const p = ws.deserializeAttachment();
      if (p?.id) this.players.set(p.id, {...p, ws});
    }
    this.ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair('ping', 'pong'));
  }
  broadcast(message, except) {
    const payload = JSON.stringify(message);
    for (const p of this.players.values()) if (p.id !== except) {
      try { p.ws.send(payload); } catch {}
    }
  }
  async fetch(request) {
    if (request.headers.get('Upgrade')?.toLowerCase() !== 'websocket') {
      return reply({ok:true, players:this.players.size, maxPlayers:MAX_PLAYERS});
    }
    if (this.players.size >= MAX_PLAYERS) return reply({error:'room_full'}, 409);
    const [client, server] = Object.values(new WebSocketPair());
    const p = {id:crypto.randomUUID(),name:'Slime',x:0,y:0,z:0,yaw:0,hp:100,seq:0};
    server.serializeAttachment(p);
    this.ctx.acceptWebSocket(server);
    this.players.set(p.id,{...p,ws:server});
    server.send(JSON.stringify({type:'welcome',id:p.id,maxPlayers:MAX_PLAYERS,players:[...this.players.values()].map(({ws,...rest})=>rest)}));
    this.broadcast({type:'joined',id:p.id,name:p.name,count:this.players.size},p.id);
    return new Response(null,{status:101,webSocket:client});
  }
  webSocketMessage(ws, raw) {
    let msg;
    try { msg=JSON.parse(typeof raw==='string'?raw:new TextDecoder().decode(raw)); } catch { return; }
    const attachment=ws.deserializeAttachment();
    const p=attachment && this.players.get(attachment.id);
    if (!p || !msg || typeof msg.type!=='string') return;
    if (msg.type==='state') {
      if (!Number.isSafeInteger(msg.seq) || msg.seq<=p.seq) return;
      for (const key of ['x','y','z','yaw']) if (Number.isFinite(msg[key]) && Math.abs(msg[key])<100000) p[key]=msg[key];
      p.seq=msg.seq;
      ws.serializeAttachment({id:p.id,name:p.name,x:p.x,y:p.y,z:p.z,yaw:p.y,hp:p.hp,seq:p.seq});
      this.broadcast({type:'state',id:p.id,x:p.x,y:p.y,z:p.z,yaw:p.y,seq:p.seq},p.id);
    } else if (msg.type==='name') {
      p.name=String(msg.name||'Slime').slice(0,24);
      ws.serializeAttachment({id:p.id,name:p.name,x:p.x,y:p.y,z:p.z,yaw:p.y,hp:p.hp,seq:p.seq});
      this.broadcast({type:'name',id:p.id,name:p.name},p.id);
    } else if (msg.type==='action') {
      if (['slap','spit','dodge','emote'].includes(msg.action)) this.broadcast({type:'action',id:p.id,action:msg.action,at:Date.now()},p.id);
    } else if (msg.type==='ping') {
      ws.send(JSON.stringify({type:'pong',at:Date.now(),echo:msg.at??null}));
    }
  }
  webSocketClose(ws) { this.leave(ws); }
  webSocketError(ws) { this.leave(ws); }
  leave(ws) {
    const p=ws.deserializeAttachment();
    if (p && this.players.delete(p.id)) this.broadcast({type:'left',id:p.id,count:this.players.size});
    try { ws.close(); } catch {}
  }
}
export default {
  async fetch(request,env) {
    const url=new URL(request.url);
    const origin=request.headers.get('Origin');
    if (request.method==='OPTIONS') return new Response(null,{headers:{'access-control-allow-origin':ORIGIN,'access-control-allow-methods':'GET, OPTIONS','access-control-allow-headers':'Content-Type'}});
    if (url.pathname==='/health') return reply({ok:true,service:'slimeoo-multiplayer',maxPlayers:MAX_PLAYERS});
    const match=url.pathname.match(/^\/room\/([A-Za-z0-9-]{4,32})$/);
    if (!match) return reply({error:'not_found',endpoints:['/health','/room/ROOMCODE']},404);
    if (origin && origin!==ORIGIN) return reply({error:'origin_not_allowed'},403);
    const id=env.GAME_ROOM.idFromName(match[1].toUpperCase());
    return env.GAME_ROOM.get(id).fetch(request);
  }
};
