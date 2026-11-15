// Shared authored geography: the renderer, map and server use these same homes.
export const HABITATS=[
 ['mossmite','Mossbank Hollow',28,-104,'moss','#64735a'],
 ['brambleback','Bramble Thicket',28,-52,'bramble','#756d54'],
 ['copperfox','Copperwood Den',28,0,'den','#87715a'],
 ['dewhopper','Dewfern Glade',28,52,'reeds','#697f66'],
 ['lanternmoth','Lantern Orchard',28,104,'flowers','#7f805f'],
 ['quillhen','Quillgrass Rise',91,-104,'nest','#8a8065'],
 ['reedserpent','Whispering Reeds',91,-52,'reeds','#63796b'],
 ['acornimp','Acorn Copse',91,0,'grove','#7c795c'],
 ['pebblecrab','Pebblebank',91,52,'stones','#8a8776'],
 ['gloombloom','Duskpetal Garden',91,104,'flowers','#7d6b7a'],
 ['thimblebat','Hushstone Roost',136,-104,'roost','#696b76'],
 ['tanglefang','Silkroot Thicket',136,-52,'bramble','#716979'],
 ['barkguard','Oldbark Grove',136,0,'grove','#6a7459'],
 ['bogsnail','Softmoss Basin',136,52,'moss','#6c7a6b'],
 ['glasswing','Glassreed Clearing',136,104,'reeds','#6a8581'],
 ['cloudram','Cloudgrass Downs',184,-100,'stones','#7e8477'],
 ['ashwisp','Ashen Hearth',184,-50,'ash','#79716a'],
 ['rootgolem','Rootstone Sanctuary',184,0,'ruins','#7b7c68'],
 ['mudjaw','Siltbank Reach',184,50,'reeds','#727962'],
 ['sporecap','Sporewood Dell',184,100,'mushrooms','#7f6e66'],
 ['ironrook','Ironstone Roost',232,-80,'roost','#717b85'],
 ['frostfin','Frostglass Shelf',232,-40,'crystal','#788e92'],
 ['dunescorpion','Amber Dunes',232,0,'dunes','#9a896b'],
 ['starjelly','Starfall Hollow',232,40,'crystal','#80768f'],
 ['thornstalker','Thornwatch Den',232,80,'den','#687669']
].map(([species,name,x,z,theme,color],index)=>({species,name,x,z,theme,color,index,radius:18,entryX:x+(x<50?-20:20),entryZ:z}));
export const HABITAT_BY_SPECIES=new Map(HABITATS.map(h=>[h.species,h]));
export function habitatAt(x,z,padding=0){return HABITATS.find(h=>(x-h.x)**2+(z-h.z)**2<(h.radius+padding)**2);}
export const HABITAT_TRAILS=[
 {width:2.8,points:[[10,13],[30,19],[65,20],[114,23],[160,23],[208,23],[260,23]]},
 ...[5,114,159,207,255].map(x=>({width:2.2,points:[[x,-124],[x,-60],[x,23],[x,70],[x,124]]})),
 ...HABITATS.map(h=>({width:1.6,points:[[h.x<50?5:h.x+23,h.z],[h.entryX,h.entryZ],[h.x+(h.x<50?-13:13),h.z]]}))
];
