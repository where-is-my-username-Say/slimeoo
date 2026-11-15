export class WorldAudio{
 constructor(){
  this.volume=.7;this.unlocked=false;this.context=null;this.buffers=new Map();this.active=new Set();this.recent=new Map();
  this.clips={slap:['smack-a.mp3','smack-b.mp3','smack-c.mp3'],spit:['spit-mouth-short.wav'],spitImpact:['splat.mp3'],attack:['swing.mp3'],hit:['smack-d.mp3'],loot:['upgrade-fx.mp3'],jump:['dodge.mp3'],land:['landing.mp3'],cast:['nova-fx.mp3']};
  this.music=new Audio('./meadow-music.mp3');this.music.loop=true;this.music.preload='none';this.music.volume=.12;
 }
 unlock(){
  this.unlocked=true;
  if(!this.context){const AudioCtx=window.AudioContext||window.webkitAudioContext;if(AudioCtx){this.context=new AudioCtx();this.master=this.context.createGain();this.master.gain.value=this.volume;this.master.connect(this.context.destination);for(const files of Object.values(this.clips))for(const file of files)fetch('./'+file).then(r=>{if(!r.ok)throw Error('Audio unavailable');return r.arrayBuffer();}).then(b=>this.context.decodeAudioData(b)).then(b=>this.buffers.set(file,b)).catch(()=>{});}}
  this.context?.resume().catch(()=>{});this.music.volume=this.volume*.14;if(this.volume>0)this.music.play().catch(()=>{});
 }
 play(name,distance=0,pan=0){
  if(!this.unlocked||this.volume<=0||distance>=28||!this.context)return;
  const now=this.context.currentTime,near=distance<5;
  if(this.active.size>=(near?12:8)||(!near&&now-(this.recent.get(name)||-10)<.09))return;
  const files=(this.clips[name]||[]).filter(f=>this.buffers.has(f));if(!files.length)return;
  const source=this.context.createBufferSource(),gain=this.context.createGain();source.buffer=this.buffers.get(files[Math.floor(Math.random()*files.length)]);source.playbackRate.value=1;
  const level={spit:.48,spitImpact:.24,slap:.62,attack:.28,jump:.24,land:.22,cast:.35,hit:.48,loot:.45}[name]||.4;
  gain.gain.value=level*Math.pow(1-distance/28,2);source.connect(gain);
  const panner=this.context.createStereoPanner?.();if(panner){panner.pan.value=Math.max(-.85,Math.min(.85,pan));gain.connect(panner);panner.connect(this.master);}else gain.connect(this.master);
  this.recent.set(name,now);this.active.add(source);source.onended=()=>{source.disconnect();gain.disconnect();panner?.disconnect();this.active.delete(source);};source.start();
 }
 setVolume(value){this.volume=Math.max(0,Math.min(1,value));if(this.master)this.master.gain.value=this.volume;this.music.volume=this.volume*.14;if(!this.volume)this.music.pause();}
 suspend(){this.music.pause();for(const source of this.active){try{source.stop();}catch{}}this.context?.suspend().catch(()=>{});}
 dispose(){this.suspend();this.music.src='';this.context?.close().catch(()=>{});this.buffers.clear();}
}
