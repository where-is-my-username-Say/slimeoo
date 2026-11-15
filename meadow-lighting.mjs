/* The sky and water share the same sun direction as the directional shadow map. */
export const skyGlsl = `
  float skyHash(vec2 p) {
    p = fract(p * vec2(.1031, .1030));
    p += dot(p, p.yx + 33.33);
    return fract((p.x + p.y) * p.x);
  }
  float skyNoise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    f = f*f*(3.-2.*f);
    return mix(mix(skyHash(i), skyHash(i+vec2(1,0)), f.x),
      mix(skyHash(i+vec2(0,1)), skyHash(i+vec2(1,1)), f.x), f.y);
  }
  vec3 meadowSky(vec3 ray, vec3 sunDir) {
    float h = max(0., ray.y);
    vec3 sky = mix(vec3(.59,.68,.58), vec3(.225,.471,.622), smoothstep(0., .62, h));
    sky = mix(sky,vec3(.106,.287,.48),smoothstep(.42,1.,h)*.82);
    vec2 p = ray.xz * (4.8 + 9.5*h) + vec2(1.2,7.9);
    float clouds = skyNoise(p)*.58 + skyNoise(p*2.10+7.3)*.28 + skyNoise(p*4.32)*.14;
    float layer = smoothstep(.52,.68,clouds)*smoothstep(.045,.15,h)*(1.-smoothstep(.46,.77,h));
    vec3 color = mix(sky,mix(vec3(.70,.76,.74),vec3(.98,.95,.84),smoothstep(.55,.75,clouds)),layer*.84);
    float facing = max(0.,dot(ray,sunDir));
    color += vec3(.19,.143,.082)*pow(facing,42.);
    color = mix(color,vec3(1.,.935,.72),smoothstep(.99915,.99962,facing));
    return color;
  }
`;

const fullscreenVertex = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0., 1.);
  }
`;
const depthGlsl = `
  uniform sampler2D sceneDepth;
  uniform vec2 clipRange;
  float depthAt(vec2 p) {
    float d = texture2D(sceneDepth, p).r;
    return clipRange.x * clipRange.y / (clipRange.y - d * (clipRange.y - clipRange.x));
  }
`;

// World-space ray marching uses the directional-light shadow map as a visibility field.
// Camera depth stops the integration at the visible surface. Bilateral upsampling keeps edges clean.
export function createMeadowLighting(T, renderer, sun, direction) {
  let sceneTarget = null, scatterTarget = null, rays = null, final = null, quad = null;
  const pass = new T.Scene(), camera = new T.Camera();
  const viewport = new T.Vector2();
  const depthRange = new T.Vector2();
  const depthSupport = renderer.capabilities.isWebGL2 || renderer.extensions.has('WEBGL_depth_texture');

  function initialize(quality) {
    sceneTarget = new T.WebGLRenderTarget(1, 1, { minFilter:T.LinearFilter, magFilter:T.LinearFilter, depthBuffer:true, stencilBuffer:false });
    sceneTarget.texture.encoding = renderer.outputEncoding;
    sceneTarget.depthTexture = new T.DepthTexture(1, 1, T.UnsignedIntType);
    sceneTarget.depthTexture.minFilter = sceneTarget.depthTexture.magFilter = T.NearestFilter;
    const floating=renderer.capabilities.isWebGL2&&renderer.extensions.has('EXT_color_buffer_float');
    scatterTarget = new T.WebGLRenderTarget(1, 1, { type:floating?T.HalfFloatType:T.UnsignedByteType,minFilter:T.LinearFilter, magFilter:T.LinearFilter, depthBuffer:false, stencilBuffer:false });
    const steps = quality === 2 ? 32 : 20;
    const sunTexel = new T.Vector2();
    rays = new T.ShaderMaterial({
      vertexShader:fullscreenVertex, depthWrite:false, depthTest:false, toneMapped:false,
      uniforms: {
        sceneDepth:{value:sceneTarget.depthTexture}, clipRange:{value:depthRange}, inverseProjection:{value:null},
        cameraWorld:{value:null}, sunDirection:{value:direction}, shadowDepth:{value:null}, sunMatrix:{value:sun.shadow.matrix},
        sunTexel:{value:sunTexel}
      },
      fragmentShader: `
        varying vec2 vUv;
        ${depthGlsl}
        uniform sampler2D shadowDepth;
        uniform mat4 inverseProjection, cameraWorld, sunMatrix;
        uniform vec2 sunTexel;
        uniform vec3 sunDirection;
        #include <packing>
        float litBySun(vec3 p) {
          vec4 coord = sunMatrix * vec4(p,1.);
          if (any(lessThan(coord.xyz,vec3(0.))) || any(greaterThan(coord.xyz,vec3(1.)))) return 1.;
          float receiver = coord.z - .00065;
          float found = step(receiver, unpackRGBAToDepth(texture2D(shadowDepth,coord.xy)));
          ${quality === 2 ? `found = (2.*found
            + step(receiver,unpackRGBAToDepth(texture2D(shadowDepth,coord.xy+sunTexel*vec2(.84,.52))))
            + step(receiver,unpackRGBAToDepth(texture2D(shadowDepth,coord.xy-sunTexel*vec2(.84,.52)))))*.25;` : ''}
          float edge = min(min(coord.x,1.-coord.x),min(coord.y,1.-coord.y));
          return mix(1.,found,smoothstep(.0,.08,edge));
        }
        void main() {
          float surface = depthAt(vUv);
          vec3 local = normalize((inverseProjection * vec4(vUv*2.-1.,1.,1.)).xyz);
          vec3 ray = mat3(cameraWorld) * local;
          vec3 origin = cameraWorld[3].xyz;
          float distance = min(${quality === 2 ? '48.' : '35.'},surface/max(.12,-local.z));
          float towardSun = max(0.,dot(ray,sunDirection));
          float forwardScatter = .29 + .35*pow(towardSun,3.) + 1.16*pow(towardSun,9.);
          float stepLength = max(0.,distance-.55)/float(${steps});
          float interleaved = fract(52.9829189 * fract(dot(gl_FragCoord.xy,vec2(.06711056,.00583715))));
          float integral = 0.;
          for (int i=0; i<${steps}; i++) {
            float travel = .55 + (float(i) + .26 + .48*interleaved)*stepLength;
            vec3 position = origin+ray*travel;
            float density = exp(-max(0.,position.y-origin.y+1.1)*.115);
            float visibility = litBySun(position);
            integral += density*visibility*exp(-travel*.019);
          }
          float scatter = integral*stepLength*forwardScatter*.012;
          gl_FragColor = vec4(clamp(scatter,0.,.45),0.,0.,1.);
        }
      `
    });
    final = new T.ShaderMaterial({
      vertexShader:fullscreenVertex, depthWrite:false, depthTest:false, toneMapped:false,
      uniforms: {
        sceneColor:{value:sceneTarget.texture}, sceneDepth:{value:sceneTarget.depthTexture},
        clipRange:{value:depthRange}, scatterColor:{value:scatterTarget.texture}, scatterSize:{value:new T.Vector2()}
      },
      fragmentShader: `
        varying vec2 vUv;
        uniform sampler2D sceneColor, scatterColor;
        uniform vec2 scatterSize;
        ${depthGlsl}
        void main() {
          vec2 q = vUv*scatterSize-.5;
          vec2 cell = floor(q), f = fract(q);
          float surface = depthAt(vUv), sum = 0., weight = 0.;
          for (int y=0;y<2;y++) {
            for (int x=0;x<2;x++) {
              vec2 corner=vec2(float(x),float(y));
              vec2 sampleUv=clamp((cell+corner+.5)/scatterSize,.5/scatterSize,1.-.5/scatterSize);
              vec2 s=texture2D(scatterColor,sampleUv).rg;
              vec2 w=mix(1.-f,f,corner);
              float depthWeight=1./(1.+abs(depthAt(sampleUv)-surface)*.82);
              float importance=w.x*w.y*depthWeight;
              sum+=s.x*importance;weight+=importance;
            }
          }
          vec3 color=texture2D(sceneColor,vUv).rgb;
          float light=sum/max(.0001,weight);
          color=mix(color,vec3(1.,.922,.783),light*.58);
          gl_FragColor=vec4(color,1.);
        }
      `
    });
    quad = new T.Mesh(new T.PlaneGeometry(2,2),rays);
    quad.frustumCulled = false;
    pass.add(quad);
  }

  function render(scene, view, quality) {
    if (!depthSupport || quality === 0 || !renderer.shadowMap.enabled) {
      renderer.render(scene,view);
      return;
    }
    if (!sceneTarget) initialize(quality);
    renderer.getDrawingBufferSize(viewport);
    const width = Math.max(2,viewport.x), height = Math.max(2,viewport.y);
    if (sceneTarget.width !== width || sceneTarget.height !== height) {
      sceneTarget.setSize(width,height);
      const pixelStride = quality === 2 ? 2 : 3;
      const maxWidth = quality === 2 ? 960 : 640;
      const maxHeight = quality === 2 ? 540 : 360;
      const scale = Math.min(1/pixelStride,maxWidth/width,maxHeight/height);
      scatterTarget.setSize(Math.max(2,Math.round(width*scale)),Math.max(2,Math.round(height*scale)));
      final.uniforms.scatterSize.value.set(scatterTarget.width,scatterTarget.height);
    }
    renderer.setRenderTarget(sceneTarget);
    renderer.render(scene,view);
    const shadow = sun.shadow.map;
    if (!shadow) { renderer.setRenderTarget(null); renderer.render(scene,view); return; }
    depthRange.set(view.near,view.far);
    rays.uniforms.inverseProjection.value = view.projectionMatrixInverse;
    rays.uniforms.cameraWorld.value = view.matrixWorld;
    rays.uniforms.shadowDepth.value = shadow.texture;
    rays.uniforms.sunTexel.value.set(1/shadow.width,1/shadow.height);
    quad.material = rays;
    renderer.setRenderTarget(scatterTarget);
    renderer.render(pass,camera);
    quad.material = final;
    renderer.setRenderTarget(null);
    renderer.render(pass,camera);
  }

  function release() {
    if (!quad) return;
    pass.remove(quad);
    quad.geometry.dispose();
    sceneTarget.dispose();
    if (sceneTarget.depthTexture) sceneTarget.depthTexture.dispose();
    scatterTarget.dispose();
    rays.dispose();
    final.dispose();
    sceneTarget = scatterTarget = rays = final = quad = null;
  }
  return { render, release };
}
