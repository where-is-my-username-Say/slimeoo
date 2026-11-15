export class WorldAudio{
 constructor(){this.volume=.7;this.unlocked=false;this.active=new Set();this.music=new Audio('./meadow-music.mp3');this.music.loop=true;this.music.preload='none';this.music.volume=.12;this.clips={slap:['smack-a.mp3','smack-b.mp3','smack-c.mp3'],spit:['spit-dry.mp3'],attack:['swing.mp3'],hit:['smack-d.mp3'],loot:['upgrade-fx.mp3'],jump:['dodge.mp3'],land:['landing.mp3'],cast:['nova-fx.mp3']};this.pools=new Map();for(const [name,files]of Object.entries(this.clips))this.pools.set(name,files.map(file=>{const a=new Audio('./'+file);a.preload='auto';return a;}));}
 unlock(){this.unlocked=true;this.music.volume=this.volume*.18;this.music.play().catch(()=>{});}
 play(name,distance=0){if(!this.unlocked||this.volume<=0||distance>28)return;const pool=this.pools.get(name);if(!pool)return;const free=pool.find(a=>a.paused)||pool[0];free.currentTime=0;free.volume=this.volume*Math.max(.05,1-distance/30)*.65;free.play().catch(()=>{});}
 setVolume(value){this.volume=Math.max(0,Math.min(1,value));this.music.volume=this.volume*.18;}
 suspend(){this.music.pause();for(const pool of this.pools.values())for(const a of pool)a.pause();}
 dispose(){this.suspend();this.music.src='';for(const pool of this.pools.values())for(const a of pool)a.src='';}
}
