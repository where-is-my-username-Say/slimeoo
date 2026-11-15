import {HABITATS,HABITAT_TRAILS,habitatAt} from './rpg-habitats.mjs';
import {containVillage,inVillage,VILLAGE_BUILDINGS} from './rpg-village-layout.mjs';
/* Open Meadow geometry and horizontal collision, shared with the Durable Object. */
export const MAP_REVISION = 'meadow-4-habitats';
export const MEADOW_BOUNDS = Object.freeze({ x: 320, z: 190 });
export const MEADOW_SPAWN = Object.freeze({ x: -24, z: 15, r: 2.06 });

export const PONDS = [
  { name: 'Sunmist Pool', x: -62, z: -32, rx: 15, rz: 10, level: .18, depth: 2.35 },
  { name: 'Reedmere', x: 59, z: 43, rx: 17, rz: 11.5, level: .36, depth: 2.7 },
  { name: 'Kingfisher Tarn', x: 55, z: -55, rx: 12, rz: 9, level: .65, depth: 2.15 }
];

const TAU = Math.PI * 2;
const mix = (a, b, t) => a + (b - a) * t;
function smooth(lo, hi, x) {
  const t = Math.max(0, Math.min(1, (x - lo) / (hi - lo)));
  return t * t * (3 - 2 * t);
}

export function meadowRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

// The main circuit visits each landmark. A flatter shortcut links the spawn and ring.
const trailRoutes = [
  ...HABITAT_TRAILS,
  { width: 3.4, points: [[-24,15],[-14,15],[-8,12],[0,11],[10,13],[21,18],[29,26],[40,36]] },
  { width: 2.8, points: [[-24,15],[-39,13],[-54,3],[-71,-9],[-71,-19],[-79,-29],[-85,-44],[-74,-61],[-55,-68],[-26,-66],[-8,-61],[14,-60],[31,-62],[45,-69],[62,-67],[75,-59],[85,-42],[89,-23],[101,-10],[99,11],[90,27],[79,38],[74,52],[62,58],[46,54],[40,36]] },
  { width: 2.6, points: [[-71,-19],[-57,-16],[-40,-13],[-20,-9],[-12,-5],[-11,2],[-14,15]] },
  { width: 2.4, points: [[12,-60],[14,-45],[16,-32],[17,-18],[16,-7],[15,2],[10,13]] },
  { width: 2.5, points: [[-71,-9],[-81,6],[-80,19],[-69,34],[-52,40],[-33,32],[-24,15]] }
];
const trailCells = new Map();
const TILE = 16;
const tileKey = (x, z) => (x + 256) * 512 + z + 256;
for (const { points, width } of trailRoutes) {
  let last = points[0];
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[Math.max(i - 1, 0)], b = points[i], c = points[i + 1], d = points[Math.min(i + 2, points.length - 1)];
    const steps = Math.ceil(Math.hypot(c[0] - b[0], c[1] - b[1]) / 1.7);
    for (let j = 1; j <= steps; j++) {
      const t = j / steps, tt = t * t, ttt = tt * t;
      const next = b.map((v, k) => .5 * (2 * v + (c[k] - a[k]) * t +
        (2 * a[k] - 5 * v + 4 * c[k] - d[k]) * tt + (3 * v - a[k] - 3 * c[k] + d[k]) * ttt));
      const segment = { x: last[0], z: last[1], dx: next[0] - last[0], dz: next[1] - last[1], width };
      segment.invLength = 1 / (segment.dx ** 2 + segment.dz ** 2);
      const margin = width + 1.7;
      for (let x = Math.floor((Math.min(last[0], next[0]) - margin) / TILE); x <= Math.floor((Math.max(last[0], next[0]) + margin) / TILE); x++) {
        for (let z = Math.floor((Math.min(last[1], next[1]) - margin) / TILE); z <= Math.floor((Math.max(last[1], next[1]) + margin) / TILE); z++) {
          const key = tileKey(x, z);
          if (!trailCells.has(key)) trailCells.set(key, []);
          trailCells.get(key).push(segment);
        }
      }
      last = next;
    }
  }
}

export function trailAmount(x, z) {
  const segments = trailCells.get(tileKey(Math.floor(x / TILE), Math.floor(z / TILE)));
  let amount = 0;
  if (segments) {
    for (const s of segments) {
      const px = x - s.x, pz = z - s.z;
      const t = Math.max(0, Math.min(1, (px * s.dx + pz * s.dz) * s.invLength));
      const distance = Math.hypot(px - s.dx * t, pz - s.dz * t);
      amount = Math.max(amount, 1 - smooth(s.width * .50, s.width + 1.05, distance));
    }
  }
  return amount;
}

export function pondRadius(p, x, z) {
  return Math.hypot((x - p.x) / p.rx, (z - p.z) / p.rz);
}

export function pondBankHeight(p, radius) {
  return p.level + (radius < 1 ? -p.depth * (1 - smooth(.17, 1, radius)) : 1.15 * smooth(1, 1.32, radius));
}

const hills = [
  [-92,-40,37,33,7.3], [-63,-73,42,28,5.7], [5,-81,32,28,4.5], [91,-24,42,34,9.8],
  [105,30,35,39,5.0], [42,84,47,28,6.1], [-45,61,45,30,5.3], [-105,37,32,45,6.4], [152,-133,30,24,7], [210,128,42,23,6], [266,40,23,70,8], [171,-28,24,18,3.5]
];

export function meadowHeight(x, z) {
  const fromCentre = Math.hypot(x, z);
  if (fromCentre < 12) return 0;
  let y = .33 + .43 * Math.sin(x * .065 + z * .022) * Math.cos(z * .064) + .32 * Math.cos(x * .043 - z * .087);
  for (const [hx,hz,rx,rz,h] of hills) {
    const d = ((x - hx) / rx) ** 2 + ((z - hz) / rz) ** 2;
    if (d < 1) y += h * (1 - d) ** 2;
  }
  const edge = Math.hypot(x / MEADOW_BOUNDS.x, z / MEADOW_BOUNDS.z);
  y += 4.0 * smooth(.91, 1.22, edge) * (.62 + .38 * Math.sin(x * .07 + z * .042));
  y *= smooth(12, 30, fromCentre);
  for (const p of PONDS) {
    if (Math.abs(x - p.x) > p.rx * 1.35 || Math.abs(z - p.z) > p.rz * 1.35) continue;
    const d = pondRadius(p, x, z);
    if (d < 1.35) return mix(pondBankHeight(p, d), y, smooth(1.11, 1.35, d));
  }
  // A level village terrace joins gently to the surrounding meadow.
  const villageEdge=Math.max(Math.abs((x+32)/31),Math.abs((z-16)/32));
  return mix(.12,y,smooth(.85,1.12,villageEdge));
}

const landscapeRandom = meadowRandom(8191832);
const trees = [
  { x:-29,z:7,s:1.32,form:0 }, { x:-36,z:19,s:1.27,form:0 },
  { x:-16,z:22,s:.97,form:1 }, { x:-11,z:-12,s:1.12,form:0 },
  { x:9,z:-15,s:1.02,form:0 }, { x:14,z:17.1,s:1.25,form:0 },
  { x:-46,z:-22,s:1.53,form:0 }, { x:-65,z:-42,s:1.54,form:1 },
  { x:41,z:44,s:1.26,form:0 }, { x:66,z:57,s:1.05,form:1 },
  { x:56,z:-42,s:1.42,form:0 }, { x:70,z:-52,s:1.22,form:1 }
].filter(t=>Math.hypot(t.x+24,t.z-15)>=25&&!(t.x>0&&t.x<126&&t.z>-106&&t.z<108));
const forestPatches = [
  [-84,-33,32,28,28,.25], [-58,-60,30,26,24,.58], [-30,-38,17,24,14,.49],
  [-84,15,25,29,19,.40], [-44,39,21,20,13,.20], [17,63,37,28,24,.35],
  [105,48,27,38,19,.42], [78,-53,29,29,20,.65], [20,-74,31,20,17,.62],
  [111,-28,24,26,12,.57]
];
function canPlant(x, z, radius = 0) {
  if(inVillage({x,z})||VILLAGE_BUILDINGS.some(b=>Math.hypot(x-b.x,z-b.z)<Math.max(b.w,b.d)*.8+4)||Math.hypot(x+24,z-15)<25 || habitatAt(x,z,-2))return false;
  if (Math.hypot(x / MEADOW_BOUNDS.x, z / MEADOW_BOUNDS.z) > 1 || Math.hypot(x + 24, z - 15) < 5.5 ||
      Math.hypot(x, z) < 14 || trailAmount(x, z) > .17 ||
      PONDS.some(p => pondRadius(p, x, z) < 1.12)) return false;
  return trees.every(t => (t.x - x) ** 2 + (t.z - z) ** 2 > (3.3 + 1.7 * t.s + radius) ** 2);
}
for (const [x, z, rx, rz, count, fir] of forestPatches) {
  for (let attempt = 0, accepted = 0; attempt < count * 9 && accepted < count; attempt++) {
    const angle = landscapeRandom() * TAU, length = Math.sqrt(landscapeRandom());
    const tx = x + Math.cos(angle) * rx * length, tz = z + Math.sin(angle) * rz * length;
    if (!canPlant(tx, tz)) continue;
    const s = .65 + landscapeRandom() * .89, pick = landscapeRandom();
    trees.push({ x: tx, z: tz, s, form: pick < fir ? 1 : pick > .87 ? 2 : 0 });
    accepted++;
  }
}
// Sparse belts frame each habitat; keep its fighting space and connecting paths clear.
for(const h of HABITATS){
 if(['dunes','ash','crystal','stones','roost'].includes(h.theme))continue;
 for(let i=0;i<10;i++){
  const a=i*TAU/10+.21,tx=h.x+Math.cos(a)*22,tz=h.z+Math.sin(a)*22;
  if(canPlant(tx,tz))trees.push({x:tx,z:tz,s:.65+landscapeRandom()*.4,form:h.theme==='bramble'?1:0});
 }
}
export const MEADOW_TREES = trees.filter(t=>!inVillage(t)&&VILLAGE_BUILDINGS.every(b=>Math.hypot(t.x-b.x,t.z-b.z)>Math.max(b.w,b.d)*.8+4));

export const MEADOW_BOULDERS = [
 ...HABITATS.flatMap(h=>[.65,2.65,4.35].map((a,i)=>({x:h.x+Math.cos(a)*16.7,z:h.z+Math.sin(a)*16.7,r:['ruins','roost'].includes(h.theme)?1.35: .75,height:['ruins','roost'].includes(h.theme)?2.8:1.1}))).filter(p=>PONDS.every(pond=>pondRadius(pond,p.x,p.z)>1.4)&&trailAmount(p.x,p.z)<.15),
  { x: -12.8, z: -11, r: 1.48, height: 1.95 }, { x: 24, z: -10, r: 1.93, height: 2.65 },
  { x: -48, z: -34, r: 1.66, height: 1.65 }, { x: -54, z: -41, r: 1.4, height: 2.02 },
  { x: -74, z: -26, r: 1.27, height: 1.4 }, { x: 52, z: 52.9, r: 1.3, height: 1.85 },
  { x: 74.6, z: 46.5, r: 1.57, height: 2.01 }, { x: 47, z: 37, r: 1.48, height: 1.94 },
  { x: 44.3, z: -56.8, r: 1.18, height: 1.77 }, { x: 61, z: -62.5, r: 1.28, height: 1.83 },
  { x: 90, z: -19, r: 2.56, height: 3.8 }, { x: 96.3, z: -25, r: 2.22, height: 3.05 },
  { x: -80, z: 29.5, r: 1.63, height: 2.34 }, { x: -33, z: 43, r: 2.1, height: 2.43 },
  { x: 25, z: 60, r: 1.5, height: 2.5 }, { x: 34, z: -38, r: 1.14, height: 1.8 }
];
const covers = [...MEADOW_BOULDERS, ...MEADOW_TREES.map(t => ({
  x: t.x, z: t.z, r: (t.form === 1 ? .44 : .59) * t.s, height: (t.form === 1 ? 6.4 : 5.15) * t.s
}))];
const coverCells = new Map(), noCover = [];
for (const cover of covers) {
  const radius = cover.r + 2.4;
  for (let x = Math.floor((cover.x - radius) / TILE); x <= Math.floor((cover.x + radius) / TILE); x++) {
    for (let z = Math.floor((cover.z - radius) / TILE); z <= Math.floor((cover.z + radius) / TILE); z++) {
      const key = tileKey(x, z);
      if (!coverCells.has(key)) coverCells.set(key, []);
      coverCells.get(key).push(cover);
    }
  }
}

export function meadowCoverNear(x, z) {
  return coverCells.get(tileKey(Math.floor(x / TILE), Math.floor(z / TILE))) ?? noCover;
}

const DEEP_WATER = .715;
export function meadowWaterPace(x, z) {
  for (const p of PONDS) {
    if (Math.abs(x - p.x) >= p.rx || Math.abs(z - p.z) >= p.rz) continue;
    return mix(.52, 1, smooth(DEEP_WATER, 1, pondRadius(p, x, z)));
  }
  return 1;
}

// Both the fixed-step server and client prediction resolve the same landscape.
// Sliding keeps the tangential part of movement when you reach a tree or deep water.
export function containMeadow(player) {
  containVillage(player);
  const pad = .83 * (player.size || 1);
  const bounds = MEADOW_BOUNDS;
  const edge = Math.hypot(player.x / bounds.x, player.z / bounds.z);
  if (edge > 1) {
    player.x /= edge;
    player.z /= edge;
    slide(player, player.x / (bounds.x ** 2), player.z / (bounds.z ** 2), -1);
  }
  for (let pass = 0; pass < 2; pass++) {
    let moved = false;
    for (const pond of PONDS) {
      const rx = pond.rx * DEEP_WATER + pad, rz = pond.rz * DEEP_WATER + pad;
      const dx = player.x - pond.x, dz = player.z - pond.z;
      if (Math.abs(dx) >= rx || Math.abs(dz) >= rz) continue;
      const distance = Math.hypot(dx / rx, dz / rz);
      if (distance >= 1) continue;
      const x = distance > .00001 ? dx / distance : rx, z = distance > .00001 ? dz / distance : 0;
      player.x = pond.x + x;
      player.z = pond.z + z;
      slide(player, x / (rx * rx), z / (rz * rz));
      moved = true;
    }
    for (const cover of meadowCoverNear(player.x, player.z)) {
      const dx = player.x - cover.x, dz = player.z - cover.z, limit = cover.r + pad;
      const distanceSquared = dx * dx + dz * dz;
      if (distanceSquared >= limit * limit) continue;
      const distance = Math.sqrt(distanceSquared);
      const nx = distance > .00001 ? dx / distance : 1, nz = distance > .00001 ? dz / distance : 0;
      player.x = cover.x + nx * limit;
      player.z = cover.z + nz * limit;
      slide(player, nx, nz);
      moved = true;
    }
    if (!moved) break;
  }
}

function slide(player, x, z, direction = 1) {
  const length = Math.hypot(x, z);
  const nx = x / length, nz = z / length;
  const motion = Math.min(0, direction * (player.vx * nx + player.vz * nz)) * direction;
  const knock = Math.min(0, direction * (player.kx * nx + player.kz * nz)) * direction;
  player.vx -= motion * nx;
  player.vz -= motion * nz;
  player.kx -= knock * nx;
  player.kz -= knock * nz;
}
