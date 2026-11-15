import {HABITATS} from './rpg-habitats.mjs';
import {
  MAP_REVISION, MEADOW_BOUNDS, MEADOW_SPAWN, PONDS, MEADOW_TREES, MEADOW_BOULDERS,
  meadowRandom, meadowHeight, pondRadius, pondBankHeight, trailAmount, containMeadow, meadowCoverNear, meadowWaterPace
} from './meadow-map.mjs';
import { createMeadowLighting, skyGlsl } from './meadow-lighting.mjs';

export { MAP_REVISION, MEADOW_BOUNDS, MEADOW_SPAWN, meadowHeight, containMeadow, meadowCoverNear, meadowWaterPace };

const tau = Math.PI * 2;
const windX = .922, windZ = .387;
const reflectionLayer = 1;
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const mix = (a, b, t) => a + (b - a) * t;
const ease = (a, b, x) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

export function createMeadow(T, renderer, sun) {
  const root = new T.Group();
  root.name = 'Open Meadow world';
  root.visible = false;
  const random = meadowRandom(12698);
  const time = { value: 0 }, sway = { value: 0 };
  const lightDirection = new T.Vector3(-.53, .43, -.73).normalize();
  const look = { lightDirection, fog: new T.FogExp2(0x8d9e98, .009), sky: 0x8d9e98,
    hemi: 0xd6e3dd, ground: 0x61755b, sun: 0xffead0, hemiPower: .60, sunPower: 1.15, rimPower: .17 };
  const lighting = createMeadowLighting(T, renderer, sun, lightDirection);
  const lod = [];
  const frameSphere = new T.Sphere(new T.Vector3(), 1);
  const frameFrustum = new T.Frustum(), viewProjection = new T.Matrix4();
  const dummy = new T.Object3D(), yAxis = new T.Vector3(0, 1, 0), branchAxis = new T.Vector3();
  const scratchColor = new T.Color();
  const earthColor = hex => new T.Color(hex).convertSRGBToLinear();
  const tileSize = 28;
  let tier = -1, motionScale = 1;

  function add(geometry, material, parent = root, reflect = true) {
    const mesh = new T.Mesh(geometry, material);
    if (reflect) mesh.layers.enable(reflectionLayer);
    parent.add(mesh);
    return mesh;
  }
  function batch(geo, mat, list, { cast = false, reflect = true, detail = null, depth = null, name = '' } = {}) {
    if (!list.length) return;
    // Three r128 culls geometry bounds, so give each tile a bounding sphere while sharing GPU attributes.
    const geometry = new T.BufferGeometry();
    geometry.setIndex(geo.index);
    for (const key in geo.attributes) geometry.setAttribute(key, geo.attributes[key]);
    const maxExtent = geo.boundingSphere ?? (geo.computeBoundingSphere(), geo.boundingSphere);
    const bounds = new T.Box3();
    const v = new T.Vector3();
    const mesh = new T.InstancedMesh(geometry, mat, list.length);
    mesh.name = name;
    mesh.frustumCulled = true;
    for (const [i, item] of list.entries()) {
      const [x,y,z,yaw,sx,sy,sz,color,roll = 0,axis] = item;
      dummy.position.set(x,y,z);
      dummy.scale.set(sx,sy,sz);
      if (axis) dummy.quaternion.setFromUnitVectors(yAxis, branchAxis.set(...axis).normalize());
      else dummy.rotation.set(0,yaw,roll);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      mesh.setColorAt(i, scratchColor.setHex(color).convertSRGBToLinear());
      const r = (maxExtent.radius + maxExtent.center.length()) * Math.max(sx,sy,sz) + .27;
      bounds.expandByPoint(v.set(x-r,y-r,z-r));
      bounds.expandByPoint(v.set(x+r,y+r,z+r));
    }
    geometry.boundingSphere = bounds.getBoundingSphere(new T.Sphere());
    mesh.matrixAutoUpdate = false;
    mesh.receiveShadow = true;
    mesh.castShadow = cast;
    if (depth) mesh.customDepthMaterial = depth;
    if (reflect) mesh.layers.enable(reflectionLayer);
    root.add(mesh);
    if (detail) lod.push({ mesh, center: geometry.boundingSphere.center, distance: detail });
    return mesh;
  }

  function windMaterial(mat, bend, pinBase, label) {
    mat.customProgramCacheKey = () => 'meadow-wind-' + label;
    mat.onBeforeCompile = shader => {
      shader.uniforms.meadowTime = time;
      shader.uniforms.meadowSway = sway;
      shader.vertexShader = `
        uniform float meadowTime, meadowSway;
        vec3 meadowBend(vec3 base, float h) {
          float phase = dot(base.xz, vec2(${windX},${windZ}));
          float gust = sin(phase*.18-meadowTime*1.80) + .30*sin(phase*.45-meadowTime*2.9);
          float weight = ${pinBase ? 'pow(clamp(h, 0., 1.), 1.35)' : '(.54 + h*.23)'};
          return vec3(${windX}, 0., ${windZ}) * gust * weight * ${bend.toFixed(3)} * meadowSway;
        }
      ` + shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace('#include <project_vertex>', `
        vec4 mvPosition = vec4(transformed, 1.);
        vec3 windDelta = vec3(0.);
        #ifdef USE_INSTANCING
          windDelta = meadowBend(instanceMatrix[3].xyz, position.y);
          mvPosition = instanceMatrix * mvPosition;
          mvPosition.xyz += windDelta;
        #endif
        mvPosition = modelViewMatrix * mvPosition;
        gl_Position = projectionMatrix * mvPosition;
      `).replace('#include <worldpos_vertex>', `
        #if defined(USE_ENVMAP) || defined(DISTANCE) || defined(USE_SHADOWMAP)
          vec4 worldPosition = vec4(transformed, 1.);
          #ifdef USE_INSTANCING
            worldPosition = instanceMatrix * worldPosition;
            worldPosition.xyz += windDelta;
          #endif
          worldPosition = modelMatrix * worldPosition;
        #endif
      `);
    };
    return mat;
  }

  const sky = add(new T.SphereGeometry(1, 36, 18), new T.ShaderMaterial({
    side: T.BackSide, depthWrite: false, depthTest: false, toneMapped: false, fog: false,
    uniforms: { sunDirection: { value: lightDirection } },
    vertexShader: `
      varying vec3 vSky;
      void main() {
        vSky = position;
        vec4 clip = projectionMatrix * vec4(mat3(viewMatrix) * position, 1.);
        gl_Position = clip.xyww;
      }
    `,
    fragmentShader: `
      uniform vec3 sunDirection;
      varying vec3 vSky;
      ${skyGlsl}
      void main() {
        gl_FragColor = vec4(meadowSky(normalize(vSky), sunDirection), 1.);
        #include <encodings_fragment>
      }
    `
  }));
  sky.name = 'Meadow sky';
  sky.frustumCulled = false;
  sky.renderOrder = -20;

  const textureSize = 128;
  const detailPixels = new Uint8Array(textureSize * textureSize * 4);
  for (let z = 0, i = 0; z < textureSize; z++) {
    for (let x = 0; x < textureSize; x++, i += 4) {
      const wave = Math.cos(x * tau / 32 + Math.sin(z * tau / 32)) * Math.sin(z * tau / 32);
      const brightness = Math.round(clamp(224 + wave * 13 + (random() - .5) * 41, 0, 255));
      detailPixels.set([brightness, brightness, brightness, 255], i);
    }
  }
  const terrainDetail = new T.DataTexture(detailPixels, textureSize, textureSize, T.RGBAFormat);
  terrainDetail.encoding = T.LinearEncoding;
  terrainDetail.wrapS = terrainDetail.wrapT = T.RepeatWrapping;
  terrainDetail.magFilter = T.LinearFilter;
  terrainDetail.minFilter = T.LinearMipmapLinearFilter;
  terrainDetail.generateMipmaps = true;
  terrainDetail.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
  terrainDetail.needsUpdate = true;
  const turf = new T.MeshStandardMaterial({ color: 0xffffff, roughness: 1, vertexColors: true, map: terrainDetail });
  const shadeSources = MEADOW_TREES.map(t => ({
    x: t.x - lightDirection.x * 2.1 * t.s, z: t.z - lightDirection.z * 2.1 * t.s, s: t.s
  }));
  const earth = {
    grass: earthColor(0x768765), sage: earthColor(0x596e55), clearing: earthColor(0x899274),
    path: earthColor(0x9a8e77), fern: earthColor(0x586e53), rock: earthColor(0x839184),
    sand: earthColor(0x969582), silt: earthColor(0x57766b), basin: earthColor(0x345b57)
  };
  const terrainColor = new T.Color(),habitatPaint=HABITATS.map(h=>({...h,tint:earthColor(h.color)})),groundTiles=[];
  function paintGround(x, y, z, slope, color, shade, habitats) {
    const swatch = .49 + Math.sin(x * .11 + z * .071) * .19 + Math.cos(z * .185 - x * .058) * .15 +
      Math.sin(z * .53 + x * .34) * .055;
    color.copy(earth.sage).lerp(earth.grass, swatch);
    const open = Math.max(
      1 - ease(9, 29, Math.hypot((x + 23) * .91, z - 14)),
      .80 * (1 - ease(11, 39, Math.hypot(x - 83, z + 5))),
      .65 * (1 - ease(12, 36, Math.hypot(x - 4, z - 34)))
    );
    color.lerp(earth.clearing, open * .60);
    color.lerp(earth.fern, .48 * (1 - ease(15, 55, Math.hypot(x + 68, z + 39))));
    color.lerp(earth.rock, .61 * ease(.27, .57, slope));
    for(const home of habitats){const blend=1-ease(home.radius*.5,home.radius+5,Math.hypot(x-home.x,z-home.z));if(blend>0)color.lerp(home.tint,blend*.72);}
    const path = trailAmount(x, z);
    if (path > 0) color.lerp(earth.path, path * (.77 + .10 * Math.sin(x * .9 + z * 1.4)));
    for (const p of PONDS) {
      if (Math.abs(x-p.x) > p.rx*1.16 || Math.abs(z-p.z) > p.rz*1.16) continue;
      const r = pondRadius(p,x,z);
      color.lerp(earth.sand, .88 * (1 - ease(1.015, 1.17, r)));
      if (r < 1) {
        color.lerp(earth.silt, ease(0, .62, p.level - y));
        color.lerp(earth.basin, .73 * ease(.60, p.depth, p.level - y));
      }
    }
    let canopyShade = 0;
    for (const t of shade) {
      const d = ((x - t.x) / (3.85*t.s)) ** 2 + ((z - t.z) / (3.32*t.s)) ** 2;
      if (d < 1) canopyShade = Math.max(canopyShade, (1 - d) ** 2);
    }
    return color.multiplyScalar((.94 + .07 * Math.sin(x * 2.13 + z * 1.78) * Math.cos(z * 1.5)) * (1 - .29 * canopyShade));
  }

  function groundTile(cx, cz, subdivisions) {
    const count = (subdivisions + 1) ** 2;
    const vertices = new Float32Array(count * 3), normals = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3), uv = new Float32Array(count * 2);
    const indices = new Uint16Array(subdivisions * subdivisions * 6);
    const width = subdivisions + 1, step = tileSize / subdivisions;
    const habitats=habitatPaint.filter(h=>h.x>cx-24&&h.x<cx+tileSize+24&&h.z>cz-24&&h.z<cz+tileSize+24);
    const shade = shadeSources.filter(t=>t.x>=cx-6&&t.x<=cx+tileSize+6&&t.z>=cz-6&&t.z<=cz+tileSize+6);
    for (let z = 0, i = 0, k = 0; z < width; z++) {
      for (let x = 0; x < width; x++, i++) {
        const wx = cx + x * step, wz = cz + z * step, y = meadowHeight(wx, wz);
        const dx = (meadowHeight(wx - .22, wz) - meadowHeight(wx + .22, wz)) / .44;
        const dz = (meadowHeight(wx, wz - .22) - meadowHeight(wx, wz + .22)) / .44;
        const length = Math.hypot(dx, 1, dz);
        vertices.set([wx, y, wz], i * 3);
        normals.set([dx/length, 1/length, dz/length], i * 3);
        paintGround(wx, y, wz, Math.hypot(dx, dz), terrainColor, shade, habitats).toArray(colors, i * 3);
        uv.set([wx * .42, wz * .42], i * 2);
        if (z < subdivisions && x < subdivisions) {
          indices.set([i, i + width, i + 1, i + 1, i + width, i + width + 1], k);
          k += 6;
        }
      }
    }
    const geo = new T.BufferGeometry();
    geo.setAttribute('position', new T.BufferAttribute(vertices, 3));
    geo.setAttribute('normal', new T.BufferAttribute(normals, 3));
    geo.setAttribute('color', new T.BufferAttribute(colors, 3));
    geo.setAttribute('uv', new T.BufferAttribute(uv, 2));
    geo.setIndex(new T.BufferAttribute(indices, 1));
    const ground = add(geo, turf);
    ground.name = 'Meadow terrain tile';
    ground.receiveShadow = true;
    ground.castShadow = !PONDS.some(p=>p.x>=cx-12 && p.x<=cx+tileSize+12 && p.z>=cz-12 && p.z<=cz+tileSize+12);
    ground.matrixAutoUpdate=false;
    groundTiles.push({mesh:ground,x:cx+tileSize/2,z:cz+tileSize/2});
  }

  const tiles = new Map();
  function tile(x, z) {
    const ix = Math.floor(x / tileSize), iz = Math.floor(z / tileSize);
    const key = ix * 1000 + iz;
    if (!tiles.has(key)) tiles.set(key, { x: ix * tileSize, z: iz * tileSize, trunks: [], crowns: [], tips: [],
      stones: [], moss: [], shrubs: [], grass: [], extraGrass: [], flowers: [], blossoms: [], rushes: [], seedheads: [] });
    return tiles.get(key);
  }
  const extentX=Math.ceil((MEADOW_BOUNDS.x+28)/tileSize)*tileSize,extentZ=Math.ceil((MEADOW_BOUNDS.z+28)/tileSize)*tileSize;
  for(let x=-extentX;x<extentX;x+=tileSize)for(let z=-extentZ;z<extentZ;z+=tileSize){
    if(Math.hypot((x+14)/(MEADOW_BOUNDS.x+35),(z+14)/(MEADOW_BOUNDS.z+35))>1)continue;
    groundTile(x,z,Math.abs(x)<140&&Math.abs(z)<112?20:14);
    if(Math.hypot((x+14)/MEADOW_BOUNDS.x,(z+14)/MEADOW_BOUNDS.z)<1.04)tile(x+14,z+14);
  }

  const rockGeo = new T.IcosahedronGeometry(1, 1);
  const crownGeo = new T.IcosahedronGeometry(1, 1);
  for (let i = 0, attr = crownGeo.attributes.position; i < attr.count; i++) {
    const x = attr.getX(i), y = attr.getY(i), z = attr.getZ(i);
    const factor = 1 + Math.sin(x * 8.8 + z * 6.2) * Math.cos(y * 7.1 - z * 3.2) * .085;
    attr.setXYZ(i, x*factor, y*factor, z*factor);
  }
  crownGeo.computeVertexNormals();
  const firGeo = new T.LatheGeometry([
    [0,-.50],[.72,-.46],[1,-.36],[.64,-.13],[.33,.16],[.17,.35],[0,.51]
  ].map(([radius,y])=>new T.Vector2(radius,y)),9);
  const firLite = new T.ConeGeometry(1, 1, 6, 1);
  const barkLite = new T.CylinderGeometry(.73, 1, 1, 5);
  const crownLite = new T.IcosahedronGeometry(1,0);
  const logGeo = new T.CylinderGeometry(.71, 1, 1, 8);
  const flowerGeo = new T.IcosahedronGeometry(1, 0);
  const wood = new T.MeshStandardMaterial({ roughness: .97, color: 0xffffff, flatShading: true });
  const stone = new T.MeshStandardMaterial({ roughness: .96, color: 0xffffff, flatShading: true });
  const leaves = windMaterial(new T.MeshStandardMaterial({ roughness: 1, color: 0xffffff, flatShading: true }), .19, false, 'leaves');
  const leafDepth = windMaterial(new T.MeshDepthMaterial({ depthPacking: T.RGBADepthPacking }), .19, false, 'leaves-depth');
  const grassMaterial = windMaterial(new T.MeshStandardMaterial({ roughness: 1, color: 0xffffff, side: T.DoubleSide }), .22, true, 'grass');
  const firLeaves = windMaterial(new T.MeshStandardMaterial({ roughness: .97, color: 0xffffff, flatShading: true }), .105, false, 'fir');
  const firDepth = windMaterial(new T.MeshDepthMaterial({ depthPacking: T.RGBADepthPacking }), .105, false, 'fir-depth');
  const canopyColors = [0x547354,0x68865e,0x648655,0x799365,0x8a9e6e,0x608266,0x789373];
  const evergreen = [0x486a59,0x577b65,0x4d745e,0x62846b];
  const woodColors = [0x6f6451,0x736653,0x7f6a52,0x615b4c], stoneColors = [0x839085,0x9da497,0x727e73,0xa3a899];
  const grassColors = [0x819763,0x769259,0x63814f,0x99a672,0x70885c,0x98aa74];
  const wildflowerColors = [0xd6c88d,0xbaa5c1,0xe5d9bb,0xe1ba8c,0xa1b6ce,0xccaea9];
  const firTrees = new Map(), treeLod = [];
  function branch(list, x, y, z, dx, dy, dz, r, color) {
    list.push([x + dx * .5, y + dy * .5, z + dz * .5, 0, r, Math.hypot(dx,dy,dz), r, color, 0, [dx,dy,dz]]);
  }
  for (const [i, tree] of MEADOW_TREES.entries()) {
    const {x,z,s,form} = tree, y = meadowHeight(x,z), a = random()*tau;
    const group = tile(x, z), bark = woodColors[i % woodColors.length], fir = form === 1, willow = form === 2;
    const height = (fir ? 6.25 : willow ? 4.9 : 5.55) * s, lean = Math.sin(a) * .37 * s;
    branch(group.trunks, x, y - .16, z, lean, height + .16, Math.cos(a) * .35 * s, s * (fir ? .40 : .56), bark);
    if (fir) {
      if (!firTrees.has(group)) firTrees.set(group, []);
      const cones = firTrees.get(group);
      for (let j = 0; j < 3; j++) {
        const width = (2.05 - j * .44) * s;
        cones.push([x + lean * (j + 1) / 3, y + (3.25 + j * 1.67) * s, z, a + j * .24, width,
          (3.35 - j * .27) * s, width, evergreen[(i + j) % evergreen.length], lean * -.16]);
      }
      continue;
    }
    const spread = willow ? 1.23 : 1;
    group.crowns.push([x+lean, y+height+.26*s, z, a, 1.88*s*spread, 1.40*s, 1.70*s*spread, canopyColors[i % 7]]);
    for (let j = 0; j < 4; j++) {
      const angle = a + j*tau/4, dx = Math.cos(angle)*s*spread, dz = Math.sin(angle)*s*spread;
      const branchY = y + height * (.69 + j * .045), tipY = (willow ? .70 : 1.30) * s;
      branch(group.trunks, x + lean * .62, branchY, z, dx * 1.49, tipY, dz * 1.49, .21*s, bark);
      group.crowns.push([x + dx * 1.63, branchY+tipY+.37*s, z+dz*1.63, angle,
        (1.36+random()*.30)*s, (willow ? 1.35 : 1.03)*s, (1.27+random()*.28)*s, canopyColors[(i+j+1)%7], dx*.10]);
      group.tips.push([x+dx*2.09, branchY+tipY+(willow ? -.65 : .74)*s, z+dz*2.09, angle,
        .88*s, (willow?1.36:.67)*s, .87*s, canopyColors[(i+j+4)%7], dz*.20]);
    }
    if (i%4===0) {
      for (let j = 0; j < 3; j++) {
        const angle = a + j * tau / 3;
        branch(group.trunks, x, y+.17, z, Math.cos(angle)*s*1.22, -.23, Math.sin(angle)*s*1.22, .21*s, bark);
      }
    }
  }
  for (const [i, o] of MEADOW_BOULDERS.entries()) {
    const group = tile(o.x,o.z), y = meadowHeight(o.x,o.z), a = random()*tau;
    group.stones.push([o.x,y+o.height*.39,o.z,a,o.r*1.12,o.height*.61,o.r*.89,stoneColors[i%4],.18]);
    group.moss.push([o.x-.20,y+o.height*.88,o.z+.15,a,.72*o.r,.15+.11*o.height,.58*o.r,0x778b5f,.18]);
  }

  function makeBladeCluster(count) {
    const pos = [];
    for (let i = 0; i < count; i++) {
      const angle = i * 2.4, x = (i*.71%1 - .5) * .54, z = (i*.43%1 - .5) * .49;
      const dx = Math.cos(angle), dz = Math.sin(angle), h = .37 + (i*.37%1) * .55, w = .047 + i%3*.009;
      const a = [x-dx*w,0,z-dz*w], b = [x+dx*w,0,z+dz*w];
      const mid = [x+dz*.11,h*.60,z-dx*.11], end = [x+dz*.25,h,z-dx*.25];
      const c = [mid[0]+dx*w*.69,mid[1],mid[2]+dz*w*.69], d = [mid[0]-dx*w*.69,mid[1],mid[2]-dz*w*.69];
      pos.push(...a,...b,...c,...a,...c,...d,...d,...c,...end);
    }
    const geo = new T.BufferGeometry();
    geo.setAttribute('position', new T.Float32BufferAttribute(pos,3));
    geo.computeVertexNormals();
    return geo;
  }
  const blades = makeBladeCluster(5);
  const reeds = makeBladeCluster(4);
  const stalk = new T.CylinderGeometry(.034,.049,1,4);
  const floralPatches = [[-20,12,4,2.5],[-33,23,5,3],[-46,-19,8,4],[-76,-11,7,4],[-73,13,8,6],
    [-14,-18,5,3],[13,24,9,6],[32,31,7,4],[46,48,4,4],[80,34,7,6],[91,-11,9,7],[66,-43,6,4],[32,-67,6,5]];
  for (const [x0,z0,rx,rz] of floralPatches) {
    for (let i = 0; i < 28; i++) {
      const a = random()*tau, l = Math.sqrt(random()), x = x0 + Math.cos(a)*rx*l, z = z0 + Math.sin(a)*rz*l;
      if (trailAmount(x,z) > .24 || PONDS.some(p=>pondRadius(p,x,z) < 1.025)) continue;
      const group = tile(x,z), y = meadowHeight(x,z), height = .37 + random()*.56, c = wildflowerColors[i%6];
      group.flowers.push([x,y+height*.5,z,a,.42,height,.42,0x748a5c,.10]);
      group.blossoms.push([x-.04,y+height,z,a,.145,.082,.145,c,.14]);
      if (i%3 === 0) group.blossoms.push([x+.13,y+height*.81,z+.08,a,.092,.055,.092,c,.17]);
    }
  }

  // Keep foliage off trails and the fight ring; dense patches grow where the terrain has water and shade.
  for (const group of tiles.values()) {
    for (let i = 0; i < 152; i++) {
      const x = group.x + random()*tileSize, z = group.z + random()*tileSize;
      if (Math.hypot(x/MEADOW_BOUNDS.x,z/MEADOW_BOUNDS.z)>1 || Math.hypot(x,z)<10.8 || trailAmount(x,z)>.17 ||
          PONDS.some(p=>pondRadius(p,x,z) < 1.025)) continue;
      const growth = .60 + .20*Math.sin(z*.37+x*.18) + .19*Math.cos(x*.47-z*.10);
      if (random() > growth) continue;
      const y = meadowHeight(x,z), a = random()*tau, s = .48 + random()*.81;
      (i%4===0 ? group.grass : group.extraGrass).push([x,y-.015,z,a,s,s,s,grassColors[i%6]]);
      if (i%22===2 && Math.hypot(x+24,z-15)>6.4 && Math.hypot(x,z)>16) {
        group.shrubs.push([x,y+.19,z,a,.79*s,.39*s,.75*s,canopyColors[i%7],.14]);
        group.shrubs.push([x+.42*s,y+.29*s,z+.26*s,a,.51*s,.49*s,.62*s,canopyColors[(i+3)%7],-.11]);
      }
      if (i%31===6) group.stones.push([x,y-.015,z,a,s*.30,s*.15,s*.25,stoneColors[i%4],.19]);
    }
  }
  for (const [pondIndex, p] of PONDS.entries()) {
    for (let i = 0; i < 72; i++) {
      const a = i*tau/72 + random()*.08, shoreline = .96+random()*.19;
      const x = p.x + Math.cos(a)*p.rx*shoreline, z = p.z+Math.sin(a)*p.rz*shoreline;
      const group=tile(x,z), y=meadowHeight(x,z), s=.52+random()*.72;
      if (i%5===1) group.stones.push([x,y+.06,z,a,s*.75,s*.45,s*.54,stoneColors[(i+pondIndex)%4],.16]);
      if (Math.sin(a*3+pondIndex*2) < -.28 && i%7!==2) {
        group.rushes.push([x,y-.05,z,a,s*1.00,s*1.83,s,0x829869]);
        if (i%2===0) group.seedheads.push([x-.14,y+s*1.31,z+.14,a,.073,s*.28,.073,0x876b49,.13]);
      }
    }
  }
  for (const group of tiles.values()) {
    const fir=firTrees.get(group)??[];
    const trees=[
      [logGeo,barkLite,wood,group.trunks,null,'Tree trunks and branches'],
      [crownGeo,crownLite,leaves,group.crowns,leafDepth,'Broadleaf crowns'],
      [firGeo,firLite,firLeaves,fir,firDepth,'Fir crowns']
    ];
    for (const [near,far,mat,list,depth,name] of trees) {
      if (!list.length) continue;
      const high=batch(near,mat,list,{cast:true,depth,name});
      const low=batch(far,mat,list,{cast:true,depth,name:name+' (distance)'});
      low.visible=false;
      treeLod.push({high,low,center:high.geometry.boundingSphere.center});
    }
    batch(crownGeo,leaves,group.tips,{reflect:false,detail:[0,31,53],name:'Near canopy leaves'});
    batch(rockGeo,stone,group.stones,{cast:true,detail:[65,95,125],name:'Meadow rocks'});
    batch(rockGeo,stone,group.moss,{detail:[18,34,52],name:'Rock moss'});
    batch(crownGeo,leaves,group.shrubs,{reflect:false,detail:[23,41,60],name:'Low shrubs'});
    batch(blades,grassMaterial,group.grass,{reflect:false,detail:[26,39,56],name:'Grass clumps'});
    batch(blades,grassMaterial,group.extraGrass,{reflect:false,detail:[0,24,38],name:'Near grass detail'});
    batch(stalk,grassMaterial,group.flowers,{reflect:false,detail:[14,31,46],name:'Wildflower stems'});
    batch(flowerGeo,leaves,group.blossoms,{reflect:false,detail:[16,33,48],name:'Wildflower petals'});
    batch(reeds,grassMaterial,group.rushes,{detail:[28,43,59],name:'Shoreline reeds'});
    batch(stalk,grassMaterial,group.seedheads,{reflect:false,detail:[15,32,43],name:'Reed seedheads'});
  }

  const farRidges = [];
  for (let i=0; i<38; i++) {
    const a=i*tau/38, width=12+random()*21, h=7+random()*17, distance=MEADOW_BOUNDS.x+35+random()*38;
    farRidges.push([Math.cos(a)*distance, -1 + random()*3, Math.sin(a)*(MEADOW_BOUNDS.z+35+random()*30), a, width, h,
      9 + random()*19, [0x728f87,0x839c8e,0x748a84,0x8ba494][i%4], .10*Math.sin(i)]);
  }
  batch(rockGeo,stone,farRidges,{name:'Distant ridgelines',reflect:false});

  addLandmarks();
  const ponds = makePonds(T,root,renderer,time,lightDirection);
  const wind = makeWind(T,root,time,sway);
  const butterflies = makeButterflies(T,root,time,sway,floralPatches);
  const shadowTarget = new T.Vector3();
  const shadowPosition = new T.Vector3();
  let lastShadowX = Infinity, lastShadowZ = Infinity;
  const cameraForward = new T.Vector3();

  function update(camera, now, quality, reduced) {
    time.value = reduced ? 0 : now;
    sway.value = reduced ? 0 : quality === 0 ? .56 : 1;
    motionScale = reduced ? 0 : 1;
    if (tier !== quality) {
      tier = quality;
      lighting.release();
      ponds.release();
      lastShadowX = lastShadowZ = Infinity;
    }
    const x = camera.position.x, z = camera.position.z;
    const groundRange=[130,155,180][tier];
    for(const tile of groundTiles)tile.mesh.visible=(tile.x-x)**2+(tile.z-z)**2<groundRange*groundRange;
    for (const { mesh,center,distance } of lod) {
      const range = distance[tier];
      if (!range) { mesh.visible = false; continue; }
      const d = range + (mesh.visible ? 2 : 0) + .32*mesh.geometry.boundingSphere.radius;
      mesh.visible = (center.x-x)**2+(center.z-z)**2 < d*d;
    }
    const distanceLimit=[27,45,63][tier];
    for (const {high,low,center} of treeLod) {
      const range=distanceLimit+(high.visible?2:0);
      high.visible=(x-center.x)**2+(z-center.z)**2<range*range;
      low.visible=!high.visible&&(x-center.x)**2+(z-center.z)**2<155*155;
    }
    wind.update(camera, tier, motionScale);
    butterflies.update(camera, tier);
    viewProjection.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse);
    frameFrustum.setFromProjectionMatrix(viewProjection);
    ponds.update(camera, frameFrustum, frameSphere, tier, motionScale);

    if (tier > 0) {
      camera.getWorldDirection(cameraForward);
      const anchorX = Math.round((x+cameraForward.x*11)/1.75)*1.75;
      const anchorZ = Math.round((z+cameraForward.z*11)/1.75)*1.75;
      if (anchorX !== lastShadowX || anchorZ !== lastShadowZ) {
        lastShadowX = anchorX;
        lastShadowZ = anchorZ;
        shadowTarget.set(anchorX,clamp(meadowHeight(anchorX,anchorZ),0,8)*.50,anchorZ);
        shadowPosition.copy(lightDirection).multiplyScalar(79).add(shadowTarget);
        sun.target.position.copy(shadowTarget);
        sun.position.copy(shadowPosition);
        sun.target.updateMatrixWorld();
        sun.updateMatrixWorld();
        renderer.shadowMap.needsUpdate = true;
      }
    }
  }

  function render(scene,camera) {
    ponds.reflect(scene,camera,tier);
    lighting.render(scene,camera,tier);
  }
  function release() {
    ponds.release();
    lighting.release();
    tier = -1;
  }
  return { root, look, update, render, release };

  function addLandmarks() {
    const board = new T.BoxGeometry();
    const props = [], steps = [];
    const benches = [[-25,20, .12],[-31,16.8,1.72],[-25,9.9,.24],[-71,-21,.55],[45,42,1.1],
      [76,54,-.9],[46,-66,.65],[98,-23,-.9],[-78,19,.78]];
    for (const [x,z,yaw] of benches) {
      const y = meadowHeight(x,z), ux = Math.cos(yaw), uz = -Math.sin(yaw), bx = Math.sin(yaw), bz = Math.cos(yaw);
      for (const shift of [-.77,.77]) {
        props.push([x+ux*shift,y+.27,z+uz*shift,yaw,.22,.54,.47,0x6b604d]);
        props.push([x+ux*shift+bx*.24,y+.68,z+uz*shift+bz*.24,yaw,.13,.66,.14,0x726451]);
      }
      props.push([x,y+.58,z,yaw,2.10,.17,.63,0x9d8763]);
      props.push([x+bx*.27,y+.95,z+bz*.27,yaw,2.11,.28,.14,0x927955]);
    }
    for (let i=0;i<21;i++) {
      const a=i*tau/21, x=-24+Math.cos(a)*4.25,z=15+Math.sin(a)*3.9;
      steps.push([x,meadowHeight(x,z)+.025,z,-a,.54+random()*.40,.092,.41+random()*.22,stoneColors[i%4],.10]);
    }
    const signs = [
      [-24.8,10.4,'Open Meadow',.10],[-60,-17.5,'Sunmist Pool',.64],[44,38,'Reedmere',-.65],
      [47,-62,'Kingfisher Tarn',.3],[-75,13,'Fernwood',.68],[93,-14,'Windward Hill',.15]
    ];
    for (const [x,z,name,yaw] of signs) {
      const y=meadowHeight(x,z);
      props.push([x,y+1.08,z,yaw,.19,2.19,.19,0x67584a]);
      const sign = document.createElement('canvas');
      sign.width=512; sign.height=116;
      const c=sign.getContext('2d');
      c.fillStyle='#695643'; c.fillRect(0,12,512,92);
      c.fillStyle='#81694f'; c.fillRect(13,21,486,74);
      c.strokeStyle='#ac8f64';c.lineWidth=2;c.strokeRect(17,24,478,68);
      c.fillStyle='#f5e7c5';c.font='600 36px Georgia';c.textAlign='center';c.textBaseline='middle';
      c.fillText(name,256,59,456);
      const map = new T.CanvasTexture(sign);
      map.encoding=T.sRGBEncoding;
      const panel=add(new T.PlaneGeometry(3.45,.782),new T.MeshBasicMaterial({map,alphaTest:.48,side:T.DoubleSide,toneMapped:false}),root,false);
      panel.name=name;panel.position.set(x,y+2.13,z);panel.rotation.y=yaw;
    }
    batch(board,wood,props,{cast:true,name:'Meadow benches and signposts'});
    batch(rockGeo,stone,steps,{name:'Spawn clearing pavers'});
  }
}

function makePonds(T, root, renderer, time, lightDirection) {
  const reflectionCamera = new T.PerspectiveCamera();
  reflectionCamera.layers.set(reflectionLayer);
  const forward = new T.Vector3(), target = new T.Vector3(), eye = new T.Vector3();
  const clipPlane = new T.Plane(), contact = new T.Vector3(), up = new T.Vector3(0,1,0), clip = new T.Vector4(), corner = new T.Vector4();
  const viewport = new T.Vector2();
  const reflectProjection = new T.Matrix4();
  const pondPad = new T.Vector2();
  let reflection = null, lastReflection = -Infinity, selected = null, lastPond = null;
  const fishRandom = meadowRandom(752003);
  const sea = [0xcf8750,0xe7c697,0x89ad9a,0xb9624e,0x948c6e];
  const surface = [];
  const shape = new T.CircleGeometry(1, 72);
  shape.rotateX(-Math.PI / 2);
  const fishGeometry = new T.BufferGeometry();
  // A pointed head, tapered body and split tail. The tail vertices flex in the shader.
  fishGeometry.setAttribute('position',new T.Float32BufferAttribute([
    .37,.00,.00, .06,.085,-.115, .06,.086,.115,
    .06,.086,.115, .06,.085,-.115, -.31,.015,0.,
    .37,.00,.00, .06,.086,.115, .06,-.075,0.,
    .37,.00,.00, .06,-.075,0., .06,.085,-.115,
    .06,-.075,0., .06,.086,.115, -.31,.015,0.,
    .06,.085,-.115, .06,-.075,0., -.31,.015,0.,
    -.27,.02,0., -.51,.102,-.13, -.48,.056,0.,
    -.27,.02,0., -.48,.056,0., -.51,.095,.13
  ],3));
  fishGeometry.computeVertexNormals();
  const fishColor = new T.Color();
  const fishMotion = {value:1};
  const swim = `
    vec3 fishSwimAt(vec4 spot,vec4 setup,vec4 route,float now) {
      float a=route.x+now*route.y;
      float school=route.z;
      vec2 offsets=vec2(cos(a),sin(a))*(.35+school*.11);
      offsets+=.105*vec2(sin(a*2.13+route.w),cos(a*1.81+route.w));
      offsets+=.11*vec2(cos(now*.20+school*2.8),sin(now*.17+school*2.4));
      float rise=pow(.5+.5*sin(now*setup.w+route.w),6.);
      return vec3(spot.x+offsets.x*spot.z,setup.x-mix(setup.y,.15,rise),spot.y+offsets.y*spot.w);
    }
  `;
  const fishMaterial = new T.ShaderMaterial({
    side:T.DoubleSide,fog:true,
    uniforms:{...T.UniformsLib.fog,waterTime:time,fishMotion},
    vertexShader:`
      uniform float waterTime, fishMotion;
      attribute vec4 fishSetup,fishSpot,fishSwim;
      varying vec3 vFishColor;
      #include <fog_pars_vertex>
      ${swim}
      void main() {
        float t=waterTime;
        vec3 swim=fishSwimAt(fishSpot,fishSetup,fishSwim,t);
        vec3 next=fishSwimAt(fishSpot,fishSetup,fishSwim,t+.06);
        vec2 heading=normalize(next.xz-swim.xz+vec2(.0001,0.));
        vec3 p=position*fishSetup.z;
        p.z+=pow(clamp(-position.x*1.8,0.,1.),2.)*sin(t*11.+fishSwim.w)*fishSetup.z*.13*fishMotion;
        vec3 world=swim+vec3(heading.x*p.x-heading.y*p.z,p.y,heading.y*p.x+heading.x*p.z);
        vFishColor=instanceColor*(.70+.26*normal.y+.16*clamp(position.x+.5,0.,1.));
        vec4 mvPosition=viewMatrix*vec4(world,1.);
        gl_Position=projectionMatrix*mvPosition;
        #include <fog_vertex>
      }
    `,
    fragmentShader:`
      varying vec3 vFishColor;
      #include <fog_pars_fragment>
      void main() {
        gl_FragColor=vec4(vFishColor,1.);
        #include <tonemapping_fragment>
        #include <encodings_fragment>
        #include <fog_fragment>
      }
    `
  });
  // A mesh per pond lets distance and frustum tests skip the entire school.
  for (const [index,p] of PONDS.entries()) {
    const fish = new T.InstancedMesh(fishGeometry.clone(),fishMaterial,12);
    const params=new T.InstancedBufferAttribute(new Float32Array(12*4),4);
    const spots=new T.InstancedBufferAttribute(new Float32Array(12*4),4);
    const routes=new T.InstancedBufferAttribute(new Float32Array(12*4),4);
    fish.geometry.setAttribute('fishSetup',params);
    fish.geometry.setAttribute('fishSpot',spots);
    fish.geometry.setAttribute('fishSwim',routes);
    const swimmers=[];
    for (let i=0;i<12;i++) {
      const school=i%3, size=.77+fishRandom()*.75;
      const depth=.59+fishRandom()*.60, offset=.187+fishRandom()*.10;
      const a=school*2.17+Math.floor(i/3)*.14+fishRandom()*.365, rate=.28+school*.035+fishRandom()*.045;
      const affinity=fishRandom()*tau;
      params.setXYZW(i,p.level,depth,size,offset);
      spots.setXYZW(i,p.x,p.z,p.rx,p.rz);
      routes.setXYZW(i,a,rate,school,affinity);
      fish.setColorAt(i,fishColor.setHex(sea[(i+index)%sea.length]).convertSRGBToLinear());
      swimmers.push({a,rate,school,affinity,offset});
    }
    fish.count=0;
    fish.name=p.name+' fish';
    fish.frustumCulled=false;
    root.add(fish);
    const mat=new T.ShaderMaterial({
      transparent:true,depthWrite:false,fog:true,
      uniforms:{...T.UniformsLib.fog,
        meadowTime:time, sunDirection:{value:lightDirection}, center:{value:new T.Vector2(p.x,p.z)},
        pondSize:{value:new T.Vector2(p.rx,p.rz)}, pondDepth:{value:p.depth},
        reflectionTex:{value:null}, reflectionCameraMatrix:{value:reflectProjection},
        hasReflection:{value:0}, waterDetail:{value:1}, motion:{value:1}, ripples:{value:Array.from({length:5},()=>new T.Vector4())}
      },
      vertexShader:`
        uniform float meadowTime,motion;
        uniform vec2 center,pondSize;
        uniform mat4 reflectionCameraMatrix;
        varying vec3 vWorld;
        varying vec4 vReflection;
        #include <fog_pars_vertex>
        void main() {
          vec4 world=modelMatrix*vec4(position,1.);
          float edge=1.-smoothstep(.81,1.,length((world.xz-center)/pondSize));
          world.y+=.040*sin(world.x*.79+world.z*.23-meadowTime*1.6)*edge*motion;
          world.y+=.021*sin(world.z*.84-world.x*.31+meadowTime*1.22)*edge*motion;
          vWorld=world.xyz;vReflection=reflectionCameraMatrix*world;
          vec4 mvPosition=viewMatrix*world;
          gl_Position=projectionMatrix*mvPosition;
          #include <fog_vertex>
        }
      `,
      fragmentShader:`
        uniform float meadowTime,pondDepth,hasReflection,waterDetail,motion;
        uniform vec2 center,pondSize;
        uniform vec3 sunDirection;
        uniform sampler2D reflectionTex;
        uniform vec4 ripples[5];
        varying vec3 vWorld;
        varying vec4 vReflection;
        #include <fog_pars_fragment>
        ${skyGlsl}
        void main() {
          vec2 p=vWorld.xz;
          float edge=length((p-center)/pondSize);
          float depth=pondDepth*(1.-smoothstep(.17,1.,edge));
          vec2 air=vec2(.922,.387);
          float waveA=dot(p,air)*3.12-meadowTime*2.23;
          float waveB=dot(p,vec2(-.387,.922))*4.2+meadowTime*1.8;
          float waveC=dot(p,vec2(.62,.78))*7.25-meadowTime*2.9;
          vec3 normal=normalize(vec3((cos(waveA)*.045+cos(waveC)*.027*waterDetail)*motion,
            1.,(cos(waveB)*.040-cos(waveC)*.016*waterDetail)*motion));
          vec3 view=normalize(cameraPosition-vWorld);
          float fresnel=pow(1.-max(0.,dot(view,normal)),3.35);
          vec3 reflected=reflect(-view,normal);
          vec3 sky=meadowSky(reflected,sunDirection);
          if (hasReflection>.5) {
            vec2 uv=vReflection.xy/vReflection.w*.5+.5+normal.xz*.070;
            float inFrame=smoothstep(0.,.045,min(min(uv.x,uv.y),min(1.-uv.x,1.-uv.y)));
            sky=mix(sky,texture2D(reflectionTex,uv).rgb,inFrame*.87);
          }
          vec3 water=mix(vec3(.236,.432,.340),vec3(.051,.217,.198),smoothstep(0.,2.45,depth));
          float caustic=pow(.5+.5*sin(waveA+sin(waveB)*.71)*sin(waveB+cos(waveC)*.44),6.);
          water+=vec3(.145,.205,.119)*caustic*(1.-smoothstep(.0,1.8,depth))*(.37+.63*waterDetail);
          float light=pow(max(0.,dot(normal,normalize(sunDirection+view))),42.);
          vec3 color=mix(water,sky,.16+.70*fresnel);
          color+=vec3(.54,.45,.29)*light*.43;
          float ripple=0.;
          if(waterDetail>.25) {
            for(int i=0;i<5;i++) {
              vec4 event=ripples[i];
              float d=length(p-event.xy);
              float band=exp(-11.*abs(d-event.z));
              ripple=max(ripple,band*event.w);
            }
          }
          float wash=exp(-abs(edge-.975)*106.)*(.049+.028*sin(waveA+waveB));
          color+=vec3(.40,.52,.43)*(ripple+wash);
          float alpha=clamp(.17+depth*.116+fresnel*.54+ripple*.37,.0,.86)*(1.-smoothstep(.947,1.004,edge));
          gl_FragColor=vec4(color,alpha);
          #include <encodings_fragment>
          #include <fog_fragment>
        }
      `
    });
    const mesh=new T.Mesh(shape,mat);
    mesh.name=p.name+' water';
    mesh.position.set(p.x,p.level,p.z);
    mesh.scale.set(p.rx,1,p.rz);
    mesh.renderOrder=4;
    root.add(mesh);
    surface.push({p,fish,swimmers,mesh});
  }
  fishGeometry.dispose();

  function update(camera,frustum,sphere,tier,motion) {
    fishMotion.value=motion;selected=null;
    let closest=Infinity;
    for (const entry of surface) {
      const {p,mesh,fish}=entry;
      const distance=Math.hypot(camera.position.x-p.x,camera.position.z-p.z);
      sphere.center.set(p.x,p.level,p.z);
      sphere.radius=Math.max(p.rx,p.rz)+1.25;
      const visible=frustum.intersectsSphere(sphere);
      fish.count=visible && distance<[32,51,70][tier] ? [6,9,12][tier] : 0;
      fish.visible=fish.count>0;
      mesh.material.uniforms.waterDetail.value=tier===0?.12:tier===1?.74:1;
      mesh.material.uniforms.motion.value=motion;
      mesh.material.uniforms.hasReflection.value=0;
      if (tier===2 && visible && distance<Math.max(p.rx,p.rz)+41 && distance<closest && camera.position.y>p.level+.18) {
        closest=distance;
        selected=entry;
      }
      let count=0;
      const uniforms=mesh.material.uniforms;
      const rings=uniforms.ripples.value;
      if (fish.visible && motion>0 && tier>0) {
        const now=time.value;
        for (let i=0;i<fish.count && count<rings.length;i++) {
          const a=entry.swimmers[i];
          const peak=(now*a.offset+a.affinity-Math.PI*.5)/tau;
          const since=(peak-Math.floor(peak))*tau/a.offset;
          if (since>1.65) continue;
          const born=now-since, angle=a.a+born*a.rate;
          const x=p.x+p.rx*(Math.cos(angle)*(.35+a.school*.11)+.105*Math.sin(angle*2.13+a.affinity)+.11*Math.cos(born*.20+a.school*2.8));
          const z=p.z+p.rz*(Math.sin(angle)*(.35+a.school*.11)+.105*Math.cos(angle*1.81+a.affinity)+.11*Math.sin(born*.17+a.school*2.4));
          rings[count++].set(x,z,.20+since*.85,.27*ease(0,.14,since)*(1-ease(.33,1.65,since)));
        }
      }
      for (;count<rings.length;count++) rings[count].w=0;
    }
  }

  function reflect(scene, camera, tier) {
    if (tier!==2 || !selected) return;
    const {p,mesh}=selected;
    const now=performance.now();
    renderer.getDrawingBufferSize(viewport);
    pondPad.set(Math.min(368,Math.max(120,Math.round(viewport.x*.29))),Math.min(224,Math.max(70,Math.round(viewport.y*.29))));
    if (!reflection) {
      reflection=new T.WebGLRenderTarget(pondPad.x,pondPad.y,{depthBuffer:true,stencilBuffer:false});
      lastReflection=-Infinity;
    }
    if (reflection.width!==pondPad.x || reflection.height!==pondPad.y) {
      reflection.setSize(pondPad.x,pondPad.y);
      lastReflection=-Infinity;
    }
    if (lastPond!==p || now-lastReflection>66) {
      lastPond=p;lastReflection=now;
      camera.getWorldDirection(forward);
      target.copy(camera.position).add(forward);
      target.y=2*p.level-target.y;
      eye.copy(camera.position);
      eye.y=2*p.level-eye.y;
      reflectionCamera.position.copy(eye);
      reflectionCamera.up.set(0,1,0);
      reflectionCamera.lookAt(target);
      reflectionCamera.far=camera.far;
      reflectionCamera.near=camera.near;
      reflectionCamera.projectionMatrix.copy(camera.projectionMatrix);
      reflectionCamera.updateMatrixWorld();
      reflectProjection.multiplyMatrices(reflectionCamera.projectionMatrix,reflectionCamera.matrixWorldInverse);
      // An oblique near plane clips the pond bed out of the mirror pass.
      contact.set(p.x,p.level,p.z);
      clipPlane.setFromNormalAndCoplanarPoint(up,contact).applyMatrix4(reflectionCamera.matrixWorldInverse);
      clip.set(clipPlane.normal.x,clipPlane.normal.y,clipPlane.normal.z,clipPlane.constant);
      const matrix=reflectionCamera.projectionMatrix.elements;
      corner.set((Math.sign(clip.x)+matrix[8])/matrix[0],(Math.sign(clip.y)+matrix[9])/matrix[5],-1,(1+matrix[10])/matrix[14]);
      clip.multiplyScalar(2/clip.dot(corner));
      matrix[2]=clip.x;matrix[6]=clip.y;matrix[10]=clip.z+1-.0015;matrix[14]=clip.w;
      const update=renderer.shadowMap.needsUpdate;
      renderer.shadowMap.needsUpdate=false;
      renderer.setRenderTarget(reflection);
      renderer.render(scene,reflectionCamera);
      renderer.setRenderTarget(null);
      renderer.shadowMap.needsUpdate=update;
    }
    mesh.material.uniforms.reflectionTex.value=reflection.texture;
    mesh.material.uniforms.hasReflection.value=1;
  }
  function release() {
    if (reflection) reflection.dispose();
    reflection=null;
    lastPond=null;
    for (const {mesh} of surface) {
      mesh.material.uniforms.hasReflection.value=0;
      mesh.material.uniforms.reflectionTex.value=null;
    }
  }
  return {update,reflect,release};
}

function makeButterflies(T,root,time,sway,habitats) {
  const rng=meadowRandom(64286), entries=[];
  const positions = [
    // Both wings attach to the centerline. Vertex z is the span, x is nose-to-tail.
    .25,0.,0., .39,0.,.43, .09,0.,.57,  .25,0.,0., .09,0.,.57, -.10,0.,.36,
    -.10,0.,.36, -.23,0.,.38, -.28,0.,.19, -.28,0.,.19, -.26,0.,0., -.10,0.,.36,
    .25,0.,0., .09,0.,-.57, .39,0.,-.43, .25,0.,0., -.10,0.,-.36, .09,0.,-.57,
    -.10,0.,-.36, -.28,0.,-.19, -.23,0.,-.38, -.28,0.,-.19, -.10,0.,-.36, -.26,0.,0.
  ];
  const baseGeometry=new T.BufferGeometry();
  baseGeometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));
  const palettes=[0xe5bc86,0xdbad76,0xf1dccc,0xbad4c8,0xc2aacc,0xd8c2a5];
  const dummy=new T.Object3D(),color=new T.Color();
  const material=new T.ShaderMaterial({
    side:T.DoubleSide,fog:true,
    uniforms:{...T.UniformsLib.fog,butterflyTime:time,sway},
    vertexShader:`
      uniform float butterflyTime,sway;
      attribute vec4 butterflySeed;
      attribute vec3 butterflyHops;
      varying vec3 vWings;
      varying vec2 vShape;
      #include <fog_pars_vertex>
      vec3 fly(vec3 origin,vec4 seed,vec3 hops,float t) {
        float turn=t*seed.y+seed.x;
        float hover=pow(.5+.5*sin(turn*1.25+seed.x),5.);
        vec2 xz=vec2(cos(turn)+.34*sin(turn*1.77+seed.x),.90*sin(turn)+.25*cos(turn*1.61));
        float drift=sin(t*1.24-dot(origin.xz,vec2(.166,.070)))*.35*sway;
        float lift=.51+sin(turn*3.6)*.28+sin(turn*1.28+seed.x)*.55;
        return origin+vec3(xz.x*hops.x+drift*.922,.91+lift-hover*.71,xz.y*hops.z+drift*.387);
      }
      void main() {
        vec3 origin=instanceMatrix[3].xyz;
        vec3 at=fly(origin,butterflySeed,butterflyHops,butterflyTime);
        vec3 next=fly(origin,butterflySeed,butterflyHops,butterflyTime+.041);
        vec2 heading=normalize(next.xz-at.xz+vec2(.0001,.0001));
        vec3 body=position*butterflySeed.z;
        float flap=(.43+sin(butterflyTime*butterflySeed.w+butterflySeed.x*6.)*.83)*sway;
        body.y+=abs(body.z)*sin(flap);body.z*=cos(flap);
        vec3 world=at+vec3(heading.x*body.x-heading.y*body.z,body.y,heading.y*body.x+heading.x*body.z);
        vec4 mvPosition=viewMatrix*vec4(world,1.);
        gl_Position=projectionMatrix*mvPosition;
        vShape=position.xz;vWings=instanceColor;
        #include <fog_vertex>
      }
    `,
    fragmentShader:`
      varying vec3 vWings;
      varying vec2 vShape;
      #include <fog_pars_fragment>
      void main() {
        float stripe=smoothstep(.37,.53,abs(vShape.y));
        float mark=1.-smoothstep(.06,.112,length(vec2(vShape.x-.16,abs(vShape.y)-.31)));
        vec3 color=mix(vWings,vec3(.28,.217,.168),stripe*.64);
        color=mix(color,vec3(.92,.87,.73),mark*.78);
        color=mix(color,vec3(.31,.24,.18),1.-smoothstep(.024,.068,abs(vShape.y)));
        gl_FragColor=vec4(color,1.);
        #include <encodings_fragment>
        #include <fog_fragment>
      }
    `
  });
  for (const [id,[x,z,rx,rz]] of habitats.entries()) {
    const size=4;
    const geo=baseGeometry.clone();
    const seed=new T.InstancedBufferAttribute(new Float32Array(size*4),4);
    const hops=new T.InstancedBufferAttribute(new Float32Array(size*3),3);
    geo.setAttribute('butterflySeed',seed);geo.setAttribute('butterflyHops',hops);
    geo.boundingSphere=new T.Sphere(new T.Vector3(x,meadowHeight(x,z)+2,z),Math.max(rx,rz)+4);
    const mesh=new T.InstancedMesh(geo,material,size);
    for (let i=0;i<size;i++) {
      const bx=x+(rng()-.5)*rx*.58,bz=z+(rng()-.5)*rz*.64;
      dummy.position.set(bx,meadowHeight(bx,bz),bz);
      dummy.updateMatrix();
      mesh.setMatrixAt(i,dummy.matrix);
      mesh.setColorAt(i,color.setHex(palettes[(i+id)%palettes.length]).convertSRGBToLinear());
      seed.setXYZW(i,rng()*tau,.43+rng()*.51,.43+rng()*.23,17+rng()*19);
      hops.setXYZ(i,rx*(.30+rng()*.34),0,rz*(.44+rng()*.34));
    }
    mesh.name='Meadow butterflies';mesh.visible=false;mesh.frustumCulled=true;mesh.matrixAutoUpdate=false;root.add(mesh);
    entries.push({x,z,mesh});
  }
  baseGeometry.dispose();
  return { update(camera,tier) {
    const range=[18,33,48][tier], x=camera.position.x,z=camera.position.z;
    for (const entry of entries) {
      entry.mesh.visible=(entry.x-x)**2+(entry.z-z)**2<range*range;
      entry.mesh.count=[1,2,4][tier];
    }
  }};
}

function makeWind(T,root,time,sway) {
  const rng=meadowRandom(73339);
  const trails=new T.BufferGeometry(), count=24, segments=12;
  const points=[], seeds=[], positions=[];
  const leaves=new T.BufferGeometry(), leafSeeds=[], leafPositions=[];
  const base={value:new T.Vector3()};
  const windDetail={value:0};
  for(let i=0;i<count;i++) {
    const seed=[rng(),rng(),rng(),rng()];
    for(let j=0;j<segments;j++) {
      for(const [at,side] of [[j,-1],[j,1],[j+1,-1],[j,1],[j+1,1],[j+1,-1]]) {
        points.push(at/segments,side);seeds.push(...seed);positions.push(0,0,0);
      }
    }
  }
  trails.setAttribute('position',new T.Float32BufferAttribute(positions,3));
  trails.setAttribute('trail',new T.Float32BufferAttribute(points,2));
  trails.setAttribute('seed',new T.Float32BufferAttribute(seeds,4));
  for(let i=0;i<19;i++) {
    const seed=[rng(),rng(),rng(),rng()];
    for(const point of [[-.13,0.,0.],[.02,.03,.079],[.17,0.,0.],[-.13,0.,0.],[.17,0.,0.],[.02,.028,-.079]]) {
      leafPositions.push(...point);leafSeeds.push(...seed);
    }
  }
  leaves.setAttribute('position',new T.Float32BufferAttribute(leafPositions,3));
  leaves.setAttribute('seed',new T.Float32BufferAttribute(leafSeeds,4));
  const uniforms={...T.UniformsLib.fog,breezeTime:time,sway,anchor:base,detail:windDetail};
  const drift=`
    uniform float breezeTime,sway,detail;
    uniform vec3 anchor;
    attribute vec4 seed;
    varying float vAlpha;
    vec3 windPosition(float velocity) {
      vec2 air=vec2(.922,.387), crosswind=vec2(-.387,.922);
      float length=72.;
      vec2 track=vec2(dot(anchor.xz,air),dot(anchor.xz,crosswind));
      vec2 uv=mod(vec2(seed.x,seed.y)*length+vec2(breezeTime*velocity,0.)-track+length*.5,length)-length*.5;
      vec2 p=anchor.xz+uv.x*air+uv.y*crosswind;
      return vec3(p.x,anchor.y+.94+seed.z*3.3+sin(breezeTime*1.45+seed.x*31.)*.44,p.y);
    }
    float veil(vec3 pos) {
      return (1.-smoothstep(21.,35.,length(pos.xz-anchor.xz)))*sway;
    }
  `;
  const trailMaterial=new T.ShaderMaterial({
    side:T.DoubleSide,transparent:true,depthWrite:false,fog:true,uniforms,
    vertexShader:`
      ${drift}
      attribute vec2 trail;
      #include <fog_pars_vertex>
      void main() {
        vec3 head=windPosition(mix(1.38,2.75,seed.z));
        float at=trail.x;
        vec3 p=head+vec3(.922,0.,.387)*at*(1.85+seed.w*2.31);
        p.y+=sin(at*3.141593+seed.y*3.0)*.19;
        vec3 widthAxis=normalize(cross(vec3(.922,.008,.387),normalize(cameraPosition-p))+vec3(0.,.0001,0.));
        p+=widthAxis*trail.y*.050*sin(at*3.141593);
        vAlpha=veil(p)*sin(at*3.141593)*(.21+.24*sin(breezeTime*.87+seed.x*31.))*(.62+.38*detail);
        vec4 mvPosition=viewMatrix*vec4(p,1.);
        gl_Position=projectionMatrix*mvPosition;
        #include <fog_vertex>
      }
    `,
    fragmentShader:`
      varying float vAlpha;
      #include <fog_pars_fragment>
      void main() {
        gl_FragColor=vec4(.84,.92,.82,max(0.,vAlpha)*.46);
        #include <encodings_fragment>
        #include <fog_fragment>
      }
    `
  });
  const leafMaterial=new T.ShaderMaterial({
    side:T.DoubleSide,transparent:true,depthWrite:false,fog:true,uniforms,
    vertexShader:`
      ${drift}
      varying float vTint;
      #include <fog_pars_vertex>
      void main() {
        vec3 base=windPosition(mix(1.05,2.15,seed.w));
        float angle=breezeTime*2.1+seed.z*38., tilt=breezeTime*4.3+seed.z*23.;
        vec3 world=base+vec3(cos(angle)*position.x-sin(angle)*position.z,
          position.y+sin(tilt)*position.x,sin(angle)*position.x+cos(angle)*position.z);
        vAlpha=veil(base)*smoothstep(.0,.18,fract(seed.x+breezeTime*.26))*.7;
        vTint=seed.w;
        vec4 mvPosition=viewMatrix*vec4(world,1.);
        gl_Position=projectionMatrix*mvPosition;
        #include <fog_vertex>
      }
    `,
    fragmentShader:`
      varying float vAlpha,vTint;
      #include <fog_pars_fragment>
      void main() {
        gl_FragColor=vec4(mix(vec3(.43,.53,.30),vec3(.50,.41,.225),vTint),vAlpha);
        #include <encodings_fragment>
        #include <fog_fragment>
      }
    `
  });
  const breeze=new T.Mesh(trails,trailMaterial), litter=new T.Mesh(leaves,leafMaterial);
  breeze.name='Wind streaks';litter.name='Drifting leaves';
  breeze.frustumCulled=litter.frustumCulled=false;
  breeze.renderOrder=2;litter.renderOrder=2;
  root.add(breeze,litter);
  return {update(camera,tier,motion) {
    breeze.visible=litter.visible=tier>0&&motion>0;
    if (!breeze.visible) return;
    base.value.set(camera.position.x,meadowHeight(camera.position.x,camera.position.z),camera.position.z);
    windDetail.value=tier===2?1:.5;
    trails.setDrawRange(0,segments*6*(tier===2?count:13));
    leaves.setDrawRange(0,6*(tier===2?19:8));
  }};
}
