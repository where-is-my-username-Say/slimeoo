import {MAP_REVISION} from './meadow-map.mjs';
export const randomKey=()=>Array.from(crypto.getRandomValues(new Uint8Array(32)),n=>n.toString(16).padStart(2,'0')).join('');
export class MeadowConnection{
 constructor(endpoint,onMessage,onStatus){this.endpoint=endpoint;this.onMessage=onMessage;this.onStatus=onStatus;this.id=0;this.sequence=0;this.pending=new Map();this.poses=new Map();this.roster=[];this.closed=true;this.retry=0;this.lastPing=0;this.rtt=0;this.generation=0;}
 connect(identity){this.stop();this.identity=identity;this.closed=false;this.open();}
 open(){const generation=++this.generation;const url=new URL('/room/OPEN-MEADOW',this.endpoint);url.protocol=url.protocol==='https:'?'wss:':'ws:';this.onStatus('Connecting to Open Meadow…');this.socket=new WebSocket(url);this.socket.binaryType='arraybuffer';
  this.socket.onopen=async()=>{if(generation!==this.generation)return;try{const credentials=this.credentials?await this.credentials():{};if(generation!==this.generation||this.socket.readyState!==1)return;this.socket.send(JSON.stringify({t:'join',protocol:2,map:MAP_REVISION,rpg:1,...this.identity,...credentials}));}catch(error){this.closed=true;this.socket.close(4003,'Sign in again');this.onMessage({t:'auth.expired',message:error.message});this.onStatus('Google session expired. Sign in again.');}};
  this.socket.onmessage=e=>{if(generation!==this.generation)return;if(typeof e.data!=='string'){this.binary(e.data);return;}let m;try{m=JSON.parse(e.data);}catch{return;}
   if(m.t==='joined'){this.id=m.id;this.sequence=0;this.retry=0;this.roster=m.roster;this.onStatus('Connected · '+m.players+'/50');for(const command of this.pending.values())this.socket.send(JSON.stringify(command));}
   if(m.t==='roster')this.roster=m.roster;
   if(m.t==='rpg.ack'||m.t==='rpg.reject')this.pending.delete(m.op);
   if(m.t==='pong')this.rtt=Math.round(performance.now()-m.stamp);
   if(m.t==='error')this.onStatus(m.message);
   this.onMessage(m);
  };
  this.socket.onclose=event=>{if(generation!==this.generation||this.closed)return;this.id=0;if(event.code===4003){this.closed=true;this.onMessage({t:'auth.expired',message:'Sign in again to load your Google character.'});return;}if(event.code===4001){this.closed=true;this.onStatus('Character active on another device. Reload to move it here.');return;}this.onStatus('Reconnecting… your progress is saved.');clearTimeout(this.timer);this.timer=setTimeout(()=>this.open(),Math.min(5000,800*2**this.retry++));};
  this.socket.onerror=()=>this.onStatus('World connection interrupted. Retrying…');
 }
 binary(buffer){if(!(buffer instanceof ArrayBuffer)||buffer.byteLength<12)return;const v=new DataView(buffer);if(v.getUint8(0)!==55||v.getUint8(1)!==2)return;const count=v.getUint8(10);if(buffer.byteLength!==12+count*33)return;const ids=new Set();for(let i=0;i<count;i++){const o=12+i*33,id=v.getUint16(o);ids.add(id);this.poses.set(id,{id,receivedAt:performance.now(),combo:v.getUint8(o+28),emoteAge:v.getUint16(o+31)/1000,x:v.getInt16(o+2)/100,z:v.getInt16(o+4)/100,r:v.getInt16(o+6)/10000,vx:v.getInt16(o+8)/300,vz:v.getInt16(o+10)/300,hp:v.getUint16(o+16)/10,attack:v.getUint8(o+19),attackTime:v.getUint8(o+20)/100,duration:v.getUint8(o+21)/100,air:v.getUint8(o+24)/100,emote:v.getUint8(o+30)});}for(const id of this.poses.keys())if(!ids.has(id))this.poses.delete(id);this.onMessage({t:'poses',poses:this.poses});}
 input(x,z,aim,ready=true){if(!this.id||this.socket?.readyState!==1)return;const b=new ArrayBuffer(22),v=new DataView(b);v.setUint8(0,54);v.setUint8(1,2);v.setUint8(2,ready?1:0);v.setUint32(4,++this.sequence);v.setInt16(8,Math.round(x*16000));v.setInt16(10,Math.round(z*16000));v.setInt16(12,Math.round(Math.atan2(Math.sin(aim),Math.cos(aim))*10000));this.socket.send(b);if(performance.now()-this.lastPing>2000){this.lastPing=performance.now();this.socket.send(JSON.stringify({t:'ping',stamp:this.lastPing}));}}
 command(t,fields={}){if(!this.id||this.socket?.readyState!==1)return false;const command={t,...fields,op:Date.now().toString(36)+'_'+randomKey().slice(0,14)};this.pending.set(command.op,command);this.socket.send(JSON.stringify(command));return command.op;}
 emote(key='wave'){if(this.id&&this.socket?.readyState===1)this.socket.send(JSON.stringify({t:'emote',key}));}
 chat(text){if(this.id&&this.socket?.readyState===1)this.socket.send(JSON.stringify({t:'chat',text}));}
 reconnect(){this.socket?.close(1000,'Reconnect test');}
 stop(){this.closed=true;this.generation++;clearTimeout(this.timer);this.socket?.close(1000,'Leaving world');this.id=0;}
}
