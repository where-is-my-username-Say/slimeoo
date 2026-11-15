import {containMeadow} from './meadow-map.mjs';
export const RPG_VERSION=1;
export const TOWN={x:-24,z:15,radius:19,name:'Dewbell Village'};
export const inTown=(p)=>Math.hypot(p.x-TOWN.x,p.z-TOWN.z)<TOWN.radius;
export const XP_TO_NEXT=level=>Math.round(48*Math.pow(level,1.65));
const item=(id,name,kind,power,level,specialty,source,price,color)=>({id,name,kind,power,level,specialty,source,price,color});
export const ITEMS=Object.fromEntries([
 item('twigblade','Twigblade','sword',4,1,'Quick cuts · 0.62s recovery','Starter kit',8,'#b5bdaa'),
 item('reedbow','Reed Bow','bow',4,1,'Long reach · 0.85s draw','Starter kit',8,'#bba776'),
 item('cinder','Cinder Seed','spell',5,1,'A traveling ember · 5 mana','Starter kit',8,'#ffb368'),
 item('dewblade','Dewsteel Shortsword','sword',7,1,'Short recovery · good for kiting','First hunt / Dewhopper',30,'#a3e5c1'),
 item('dewbow','Willow Recurve','bow',7,1,'Fast draw · reach 17','First hunt / Lanternmoth',30,'#d4e79b'),
 item('dewspell','Sunpetal Sigil','spell',9,1,'Bright ember · 5 mana','First hunt / Gloombloom',30,'#ffd38c'),
 item('ironblade','Boar-Tusk Cleaver','sword',13,5,'Wide sweep · hits nearby enemies','Brambleback / Ember’s forge',110,'#e2ba94'),
 item('ironbow','Glasswing Longbow','bow',12,5,'Pierces a second nearby target','Glasswing / Tansy’s shop',110,'#a9dfec'),
 item('ironspell','Stormglass Seal','spell',15,5,'Interrupts a windup','Ashwisp / Luma’s shop',110,'#b6a2f4'),
 item('thornblade','Thorn King’s Edge','sword',22,10,'Heavy finisher · breaks attacks','Thornstalker / Elder farm',300,'#f0c96f'),
 item('thornbow','Starfall Bow','bow',20,10,'Far shot · 21 range','Ironrook / Elder farm',300,'#cfbfef'),
 item('thornspell','Rootfire Grimoire','spell',26,10,'Burning splash · 8 mana','Rootgolem / Elder farm',300,'#fb986b'),
 item('vest','Patched Tunic','armor',1,1,'A little protection','Starter kit',8,'#8cb6a2'),
 item('dewvest','Dewguard Jacket','armor',3,1,'Lightweight · +8 maximum health','First Steps quest / Scrip',35,'#9ddebf'),
 item('ironvest','Barkwoven Coat','armor',6,5,'Firm protection · +18 health','Barkguard / Ember’s forge',95,'#d6ba94'),
 item('thornvest','Elderwild Mantle','armor',10,10,'+32 maximum health','Elder enemies',260,'#bca1df'),
 item('potion','Dewdrop Tonic','consumable',35,1,'Restores 35 health','Moss’s apothecary',8,'#e699a9'),
 item('shard','Wildglass Shard','material',0,1,'Forge upgrades; old farms remain useful','All farm creatures',3,'#a6dfe4'),
 item('petal','Golden Dewpetal','material',0,1,'Rare trade good · sells for 18 gold','Rare drop: any farm tier',18,'#f7cd78'),
].map(i=>[i.id,i]));
export const STARTERS={sword:'twigblade',bow:'reedbow',spell:'cinder'};
export const FIRST_DROP={sword:'dewblade',bow:'dewbow',spell:'dewspell'};
export const NPCS=[
 {id:'pip',name:'Pip',title:'Village warden',role:'quest',x:-20,z:16,color:'#9ed990',animation:'wave',say:'Every great slime begins with one small hunt. Follow the east path into Dewwild Farm.'},
 {id:'ember',name:'Ember',title:'Wildglass smith',role:'smith',x:-33,z:5,color:'#eea16e',animation:'hammer',say:'Good steel is grown, then forged. Bring me 3 wildglass shards and 12 gold.',stock:['ironblade','ironvest']},
 {id:'moss',name:'Moss',title:'Dewdrop apothecary',role:'potions',x:-14,z:3,color:'#b5c1e8',animation:'stir',say:'A tonic for the brave. Rest in town to heal for free.',stock:['potion']},
 {id:'tansy',name:'Tansy',title:'Willow fletcher',role:'shop',x:-37,z:21,color:'#d9bd72',animation:'string',say:'Keep your distance. Let the wildglass do the rest.',stock:['dewbow','ironbow']},
 {id:'luma',name:'Luma',title:'Sunpetal arcanist',role:'shop',x:-12,z:25,color:'#b9a0df',animation:'levitate',say:'An ember is a promise. Cast, move, and cast again.',stock:['dewspell','ironspell']},
 {id:'mallow',name:'Mallow',title:'The Drifting Acorn inn',role:'inn',x:-29,z:29,color:'#e5bbc9',animation:'bow',say:'Welcome home, wanderer. Your progress is already safe with us.'},
 {id:'scrip',name:'Scrip',title:'Traveling outfitter',role:'shop',x:-26,z:-1,color:'#8acbc5',animation:'count',say:'Buy the things you need. Sell only what you can spare.',stock:['dewblade','dewvest']},
 {id:'fern',name:'Fern',title:'Farm cartographer',role:'map',x:-7,z:13,color:'#a6d0a7',animation:'read',say:'One farm, three trails. Green is level 1, amber is level 5, violet is level 10. Watch their windups.'},
];
// 25 authored families. Each has three server-spawned variants, not palette-only duplicates.
export const SPECIES=[
 ['dewhopper','Dewhopper','frog','pounce','#91bf70',18,3,.9,'Dewblade fragments'],
 ['brambleback','Brambleback','boar','charge','#bb957d',25,4,1.2,'Tusk steel'],
 ['mossmite','Mossmite','beetle','guard','#738c63',24,3,1,'Shell plates'],
 ['lanternmoth','Lanternmoth','moth','cone','#e2c98b',17,3,.9,'Willow thread'],
 ['pebblecrab','Pebblecrab','crab','sweep','#d69972',25,4,1.1,'Stone pincers'],
 ['thimblebat','Thimblebat','bat','pounce','#9c8bba',17,3,.7,'Night leather'],
 ['acornimp','Acorn Imp','imp','lob','#b18b5c',21,4,1,'Acorn caps'],
 ['gloombloom','Gloombloom','flower','ring','#d193b6',20,3,1.3,'Sunpetal sigils'],
 ['reedserpent','Reedserpent','snake','line','#76b5a0',21,4,1,'Reed scales'],
 ['copperfox','Copperfox','fox','charge','#cb8a5e',22,4,.8,'Copper fur'],
 ['barkguard','Barkguard','tree','slam','#85936a',32,5,1.5,'Barkwoven coats'],
 ['cloudram','Cloudram','ram','charge','#c7d0c8',27,4,1.15,'Cloud wool'],
 ['glasswing','Glasswing','dragonfly','line','#8ac7d4',19,4,.8,'Glasswing frames'],
 ['bogsnail','Bogsnail','snail','ring','#b2a49c',30,3,1.5,'Spiral shells'],
 ['tanglefang','Tanglefang','spider','cone','#a384a7',22,4,.95,'Tangle silk'],
 ['ashwisp','Ashwisp','wisp','bolt','#e6a86f',18,4,1.2,'Stormglass seals'],
 ['frostfin','Frostfin','fish','bolt','#9bc8d7',20,4,1,'Frost scales'],
 ['quillhen','Quillhen','bird','cone','#caa76d',20,3,.9,'Golden quills'],
 ['mudjaw','Mudjaw','croc','sweep','#8a9c79',28,5,1.3,'Mudjaw teeth'],
 ['sporecap','Sporecap','mushroom','ring','#c48a7c',24,3,1.35,'Wild spores'],
 ['ironrook','Ironrook','rook','line','#818ea3',26,5,1.1,'Starfall feathers'],
 ['rootgolem','Rootgolem','golem','slam','#a9a18a',36,6,1.8,'Rootfire tomes'],
 ['dunescorpion','Dunescorpion','scorpion','line','#ceaa78',27,5,1.1,'Amber stingers'],
 ['starjelly','Starjelly','jelly','ring','#b4a7d9',23,4,1.4,'Star jelly'],
 ['thornstalker','Thornstalker','wolf','pounce','#919e8f',29,5,.9,'Thorn King steel'],
].map(([id,name,form,pattern,color,hp,damage,windup,source],i)=>({id,name,form,pattern,color,hp,damage,windup,source,index:i}));
export const TIERS=[{level:1,name:'Dew',x:8,hp:1,damage:1,color:'#abd795'},{level:5,name:'Briar',x:54,hp:3.4,damage:2.6,color:'#e3b56f'},{level:10,name:'Elder',x:98,hp:8,damage:5,color:'#c3a5df'}];
export function makeSpawns(){return TIERS.flatMap(t=>SPECIES.map((s,i)=>{const row=i===0?0:(i%2?1:-1)*Math.ceil(i/2),position={x:t.x+(i%3)*5,z:15+row*4,vx:0,vz:0,kx:0,kz:0,size:1};containMeadow(position);return {id:s.id+'-'+t.level,species:s.id,tier:t.level,x:position.x,z:position.z};}));}
export const statsFor=c=>{const armor=ITEMS[c.gear.armor];const bonus=armor?.id==='dewvest'?8:armor?.id==='ironvest'?18:armor?.id==='thornvest'?32:0;return {maxHp:60+(c.level-1)*7+bonus,maxMana:40+(c.level-1)*3,armor:(armor?.power||0)+(c.upgrades?.[c.gear.armor]||0),power:(ITEMS[c.gear.weapon]?.power||4)+(c.upgrades?.[c.gear.weapon]||0)*2+Math.floor(c.level/3)};};
export function newCharacter(name='Slime',color=0,loadout='sword'){const chosen=STARTERS[loadout]||STARTERS.sword;return {schema:1,revision:0,name:String(name).slice(0,16),color:Math.max(0,Math.min(3,Number(color)||0)),level:1,xp:0,gold:0,kills:0,inventory:{twigblade:1,reedbow:1,cinder:1,vest:1,potion:3},gear:{weapon:chosen,armor:'vest'},upgrades:{},quests:{firstSteps:{kills:0,claimed:false}},skills:[],builds:[],seen:[],loadout,createdAt:Date.now()};}
export function migrateCharacter(saved,legacy={}){if(!saved)return {...newCharacter(legacy.name,legacy.color,legacy.loadout),legacy:{wins:Math.max(0,Number(legacy.wins)||0),cosmeticRanks:legacy.ranks||{}}};if(saved.schema===1)return saved;return {...newCharacter(saved.name||legacy.name,saved.color,saved.loadout),...saved,schema:1,inventory:{...newCharacter().inventory,...saved.inventory},gear:{weapon:'twigblade',armor:'vest',...saved.gear},quests:saved.quests||{firstSteps:{kills:0,claimed:false}},skills:saved.skills||[],builds:saved.builds||[],upgrades:saved.upgrades||{},seen:saved.seen||[],revision:saved.revision||0};}
