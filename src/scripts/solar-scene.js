import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

// The brand is rendered entirely as GPU-animated surface grains. Product-mode
// textures are procedural; photographic backdrops live in the parent HTML layer.
function solarTexture(cols = 2, rows = 3) {
  const canvas = document.createElement('canvas');
  canvas.width = 768; canvas.height = 1024;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#667783'; ctx.fillRect(0, 0, 768, 1024);
  const gap = cols > 4 ? 3 : 8;
  const w = (768 - gap * (cols + 1)) / cols;
  const h = (1024 - gap * (rows + 1)) / rows;
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const x = gap + col * (w + gap), y = gap + row * (h + gap), c = Math.min(23, w * .09);
      const grad = ctx.createLinearGradient(x, y, x + w, y + h);
      grad.addColorStop(0, '#142b42'); grad.addColorStop(.5, '#0a1424'); grad.addColorStop(1, '#102031');
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.moveTo(x + c, y); ctx.lineTo(x + w - c, y); ctx.lineTo(x + w, y + c);
      ctx.lineTo(x + w, y + h - c); ctx.lineTo(x + w - c, y + h); ctx.lineTo(x + c, y + h);
      ctx.lineTo(x, y + h - c); ctx.lineTo(x, y + c); ctx.closePath(); ctx.fill();
      ctx.save(); ctx.clip();
      ctx.strokeStyle = 'rgba(154,187,210,.28)'; ctx.lineWidth = 1;
      for (let line = 8; line < h; line += 12) {
        ctx.beginPath(); ctx.moveTo(x, y + line); ctx.lineTo(x + w, y + line); ctx.stroke();
      }
      ctx.strokeStyle = 'rgba(210,223,230,.78)'; ctx.lineWidth = 2.3;
      for (let bus = 1; bus < 4; bus++) {
        ctx.beginPath(); ctx.moveTo(x + w * bus / 4, y); ctx.lineTo(x + w * bus / 4, y + h); ctx.stroke();
      }
      ctx.restore();
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function brushedTexture() {
  const canvas = document.createElement('canvas'); canvas.width = 256; canvas.height = 512;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#a7adb0'; ctx.fillRect(0, 0, 256, 512);
  let seed = 512;
  for (let i = 0; i < 1500; i++) {
    seed = (seed * 16807) % 2147483647;
    const x = seed % 256, value = 118 + seed % 90;
    ctx.strokeStyle = `rgba(${value},${value + 2},${value + 4},.2)`;
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 512); ctx.stroke();
  }
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

function spriteTexture() {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 64;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(.16, 'rgba(255,255,255,.8)');
  gradient.addColorStop(.5, 'rgba(255,255,255,.13)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gradient; ctx.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(canvas);
}

const clamp = THREE.MathUtils.clamp;
const smooth = (x) => x * x * (3 - 2 * x);

/**
 * Mount the solar N. Events on container: solar-ready / solar-error.
 * Returned methods are safe even when WebGL is unavailable.
 */
export function mountSolarScene(container, opts = {}) {
  const noop = { setMode() {}, setObject() {}, setMotion() {}, replay() {}, dispose() {} };
  if (!container) return noop;
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  } catch (error) {
    container.dispatchEvent(new CustomEvent('solar-error', { detail: { reason: 'webgl-unavailable' } }));
    return noop;
  }

  const mobile = matchMedia('(max-width: 760px)').matches;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let motionEnabled = opts.motion !== false && !reducedMotion.matches;
  let disposed = false, inView = true, frame = 0, frameRequestedAt = 0, ready = false;
  let mode = opts.mode === 'day' ? 'day' : 'night';
  let objectMode = opts.object === 'product' ? 'product' : 'brand';
  let day = mode === 'day' ? 1 : 0;
  let clock = motionEnabled ? 0 : 5;
  let introStart = 0, lastTime = 0;
  let referenceReady = false, referencePending = true, referenceRequest = 0;
  const dpr = Math.min(window.devicePixelRatio || 1, mobile ? 1 : 1.5);
  renderer.setPixelRatio(dpr);
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;
  renderer.shadowMap.enabled = !mobile;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const canvas = renderer.domElement;
  canvas.className = 'solar-render-canvas';
  canvas.style.cssText = 'display:block;width:100%;height:100%;position:absolute;inset:0;';
  canvas.setAttribute('aria-hidden', 'true');
  container.appendChild(canvas);

  const scene = new THREE.Scene();
  // The HTML application/factory photography remains visible through the stage.
  scene.background = null;
  const camera = new THREE.PerspectiveCamera(37, 1, .1, 60);
  const cameraTarget = new THREE.Vector3(0, -.06, 0);
  camera.position.set(3.45, 1.85, 8.8);
  camera.lookAt(cameraTarget);

  const environmentSource = new RoomEnvironment();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const environment = pmrem.fromScene(environmentSource, .06);
  scene.environment = environment.texture;
  scene.environmentIntensity = .72;
  environmentSource.dispose(); pmrem.dispose();

  const solarMap = solarTexture(), metalMap = brushedTexture(), glowMap = spriteTexture();
  const metal = new THREE.MeshStandardMaterial({ color: 0xb7c2c8, map: metalMap, metalness: .92, roughness: .29, envMapIntensity: 1.1 });
  const darkMetal = new THREE.MeshStandardMaterial({ color: 0x26343d, metalness: .82, roughness: .3 });
  const panel = new THREE.MeshPhysicalMaterial({ map: solarMap, color: 0xddeafa, metalness: .42, roughness: .24, clearcoat: .9, clearcoatRoughness: .15, envMapIntensity: .65 });
  const led = new THREE.MeshStandardMaterial({ color: 0xffe5bd, emissive: 0xffd096, emissiveIntensity: 2.1, roughness: .34 });
  const ledMaterials = [];
  // The full hero canvas and the compact assembled-logo slot are independent.
  // The layout parent positions the subject; particles may leave that slot.
  const brandLayout = new THREE.Group();scene.add(brandLayout);
  const brandSlot=container.parentElement?.querySelector('.a-hero-brand-slot');
  const n = new THREE.Group();n.position.y=-.04;brandLayout.add(n);
  const model = new THREE.Group(); n.add(model);

  function block(w, h, d, material, x, y, z, radius = .025) {
    const mesh = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 2, radius), material);
    mesh.position.set(x, y, z); mesh.castShadow = true; mesh.receiveShadow = true;
    return mesh;
  }

  // Tall uprights preserve the N silhouette even while the particle cloud moves.
  model.add(block(.46, 2.92, .51, metal, -1.03, 0, -.02));
  model.add(block(.46, 2.92, .51, metal, 1.03, 0, -.02));
  model.add(block(.04, 2.82, .025, darkMetal, -1.25, 0, .246, .005));
  model.add(block(.04, 2.82, .025, darkMetal, 1.25, 0, .246, .005));

  const diagonal = new THREE.Group(); diagonal.rotation.z = .65; model.add(diagonal);
  const plates = [];
  for (let i = 0; i < 3; i++) {
    const louver = new THREE.Group();
    // Overlapping louvers share the uprights' lower datum instead of extending
    // through the plinth. The whole N remains grounded while particles move.
    louver.position.set(0, .815 - i * .815, .15 + i * .035);
    louver.rotation.x = -.11;
    louver.add(block(1.02, 1.25, .18, metal, 0, 0, 0, .035));
    const pv = new THREE.Mesh(new THREE.PlaneGeometry(.91, 1.12), panel);
    pv.position.set(0, .025, .096); louver.add(pv);
    const ledMaterial = led.clone(); ledMaterials.push(ledMaterial);
    // Each segment has a separate LED channel, with a recessed dark surround.
    louver.add(block(.87, .09, .035, darkMetal, 0, -.59, .08, .01));
    louver.add(block(.8, .034, .025, ledMaterial, 0, -.584, .108, .007));
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowMap, color: 0xffcf8d, transparent: true, opacity: .09, blending: THREE.AdditiveBlending, depthWrite: false }));
    glow.position.set(0, -.62, .15); glow.scale.set(.95, .14, 1); louver.add(glow);
    diagonal.add(louver); plates.push(louver);
  }
  // A warm-lit base aperture makes the lighting function legible from a distance.
  const baseLed = led.clone(); ledMaterials.push(baseLed);
  model.add(block(.38, .055, .022, baseLed, 1.035, -1.34, .25, .005));

  // Reference: docs/spec-reference/image13.png, manufacturer's workbook Sheet1 D6.
  // Panel 15.0 x 10.2 cm; expanded fixture 23.5 x 13.5 x 13 cm.
  // This is a visual structure reconstruction, not manufacturing CAD: the panel
  // uses its documented aspect ratio; unseen hinge/depth details are illustrative.
  const product = new THREE.Group(); n.add(product);
  const housing = new THREE.MeshStandardMaterial({ color: 0x171c20, metalness: .18, roughness: .4, envMapIntensity: 1.2 });
  const reflector = new THREE.MeshStandardMaterial({ color: 0xadb6b6, metalness: .18, roughness: .46 });
  const chipMaterial = new THREE.MeshStandardMaterial({ color: 0xe9db8b, emissive: 0xffe6a2, emissiveIntensity: .18, roughness: .4 });
  const productHeads = [];
  const chipMatrix = new THREE.Matrix4();
  const chipGeometry = new RoundedBoxGeometry(.061, .06, .012, 1, .005);
  const headSpecs = [
    { x: 0, y: -.375, z: .16, angle: 0, w: 1.17, h: .88, sensor: true },
    { x: -1.185, y: -.375, z: -.015, angle: .18, w: 1.17, h: .88 },
    { x: 1.185, y: -.375, z: -.015, angle: -.18, w: 1.17, h: .88 },
  ];
  product.add(block(2.55, .14, .18, housing, 0, -.28, -.19, .045));
  product.add(block(.38, .86, .3, housing, 0, .24, -.32, .06));
  headSpecs.forEach((spec) => {
    const head = new THREE.Group(); head.position.set(spec.x, spec.y, spec.z); head.rotation.y = spec.angle;
    head.add(block(spec.w, spec.h, .23, housing, 0, 0, 0, .11));
    head.add(block(spec.w - .14, spec.h - .13, .03, reflector, 0, 0, .126, .065));
    const inset = block(spec.w - .25, spec.h - .24, .018, new THREE.MeshStandardMaterial({ color: 0xbcc4c3, roughness: .47, metalness: .08 }), 0, 0, .146, .05);
    head.add(inset);
    const cols = 6, rows = 5;
    const locations = [];
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        // The centre head's LEDs surround the upper PIR recess, as in image13.
        if (spec.sensor && row >= 3 && (col === 2 || col === 3)) continue;
        locations.push([(col - (cols - 1) / 2) * (spec.w - .34) / (cols - 1), (row - (rows - 1) / 2) * (spec.h - .32) / (rows - 1), .166]);
      }
    }
    const chips = new THREE.InstancedMesh(chipGeometry, chipMaterial, locations.length);
    locations.forEach((location, index) => {
      chipMatrix.makeTranslation(...location); chips.setMatrixAt(index, chipMatrix);
    });
    if (spec.sensor) {
      // Integrated upper-central sensor housing; there is no hanging lower PIR.
      const sensorShape = new THREE.Shape();
      sensorShape.moveTo(-.23, .43); sensorShape.lineTo(.23, .43);
      sensorShape.lineTo(.155, .035); sensorShape.quadraticCurveTo(0, -.015, -.155, .035);
      sensorShape.closePath();
      const sensorHousing = new THREE.Mesh(new THREE.ExtrudeGeometry(sensorShape, { depth: .038, bevelEnabled: true, bevelThickness: .012, bevelSize: .018, bevelSegments: 2, steps: 1 }), housing);
      sensorHousing.position.z = .151; head.add(sensorHousing);
      const pir = new THREE.Mesh(new THREE.IcosahedronGeometry(.128, 2), new THREE.MeshStandardMaterial({ color: 0xe8eeeb, metalness: 0, roughness: .54, flatShading: true }));
      pir.position.set(0, .235, .22); head.add(pir);
    }
    head.add(chips); product.add(head); productHeads.push(head);
  });
  const productPanel = new THREE.Group(); productPanel.position.set(0, .69, -.3); productPanel.rotation.x = -.82;
  productPanel.add(block(2.25, 1.53, .11, housing, 0, 0, 0, .035));
  productPanel.add(block(2.12, 1.4, .015, darkMetal, 0, 0, .061, .012));
  const productSolarMap = solarTexture(12, 2);
  const productPanelMaterial = panel.clone(); productPanelMaterial.map = productSolarMap;
  const productPv = new THREE.Mesh(new THREE.PlaneGeometry(2.05, 1.33), productPanelMaterial);
  productPv.position.z = .073; productPanel.add(productPv); product.add(productPanel);
  product.position.y = .05;
  model.visible = false; product.visible = objectMode === 'product';

  // Product lighting is independent of the photographic backdrop. There is no
  // rendered room, platform, floor or opaque mesh beneath the particle N.
  const hemisphere = new THREE.HemisphereLight(0xd7eced, 0x263235, .9); scene.add(hemisphere);
  const key = new THREE.DirectionalLight(0xe0edff, 2.4); key.position.set(-3, 5, 4); scene.add(key);
  const rim = new THREE.DirectionalLight(0xa8d1d9, 2.8); rim.position.set(4, 3, -2); scene.add(rim);
  const fill = new THREE.DirectionalLight(0xd5e4df, .9); fill.position.set(-4, 0, 3); scene.add(fill);

  // Sample the actual N surfaces once. Each visible grain is an independently
  // animated GPU point; the hidden source geometry supplies no opaque pixels.
  let randomState = 9317;
  const rand = () => { randomState = (randomState * 16807) % 2147483647; return (randomState - 1) / 2147483646; };
  const gaussian = () => Math.sqrt(-2*Math.log(Math.max(rand(),.000001)))*Math.cos(rand()*Math.PI*2);
  const count = mobile ? 28000 : 72000;
  model.updateWorldMatrix(true, true);
  const inverseParent = n.matrixWorld.clone().invert();
  const triangles = []; let totalArea = 0;
  const va = new THREE.Vector3(), vb = new THREE.Vector3(), vc = new THREE.Vector3();
  const ab = new THREE.Vector3(), ac = new THREE.Vector3();
  model.traverse(mesh => {
    if (!mesh.isMesh) return;
    const geometry = mesh.geometry, position = geometry.attributes.position, index = geometry.index;
    const matrix = inverseParent.clone().multiply(mesh.matrixWorld);
    const length = index ? index.count : position.count;
    const tint = mesh.material === panel ? [0.64, .8, .87] : [.79, .91, .94];
    const isLed = ledMaterials.includes(mesh.material);
    for(let i = 0; i < length; i += 3) {
      va.fromBufferAttribute(position, index ? index.getX(i) : i).applyMatrix4(matrix);
      vb.fromBufferAttribute(position, index ? index.getX(i+1) : i+1).applyMatrix4(matrix);
      vc.fromBufferAttribute(position, index ? index.getX(i+2) : i+2).applyMatrix4(matrix);
      ab.subVectors(vb,va); ac.subVectors(vc,va);
      const normal = ab.clone().cross(ac), area = normal.length() * .5;
      if (area < .000001) continue;
      totalArea += area;
      triangles.push({a:va.clone(),b:vb.clone(),c:vc.clone(),normal:normal.normalize(),area:totalArea,tint:isLed?[1,.77,.45]:tint,warm:isLed?1:0});
    }
  });
  const homes = new Float32Array(count*3), normals = new Float32Array(count*3);
  const starts = new Float32Array(count*3), tones = new Float32Array(count*3);
  const seeds = new Float32Array(count*3), sizes = new Float32Array(count);
  for(let i=0;i<count;i++) {
    const target = rand()*totalArea; let low=0, high=triangles.length-1;
    while(low<high) {const mid=(low+high)>>1; if(triangles[mid].area<target)low=mid+1;else high=mid;}
    const tri=triangles[low], r=Math.sqrt(rand()), v=rand(), j=i*3;
    va.copy(tri.a).multiplyScalar(1-r).addScaledVector(tri.b,r*(1-v)).addScaledVector(tri.c,r*v);
    // A granular shell rather than perfectly flat sampled planes.
    va.addScaledVector(tri.normal,(rand()-.4)*.032);
    homes.set([va.x,va.y,va.z],j); normals.set([tri.normal.x,tri.normal.y,tri.normal.z],j);
    tones.set(tri.tint,j); seeds.set([rand(),rand(),tri.warm],j);
    sizes[i] = .6 + Math.pow(rand(),1.1)*1.2;
    // A soft ellipsoidal distribution has no flat sides or uniform box edge.
    starts.set([gaussian()*2.2,gaussian()*1.65,gaussian()*.65],j);
  }
  const particleGeometry = new THREE.BufferGeometry();
  particleGeometry.setAttribute('position',new THREE.BufferAttribute(homes,3));
  particleGeometry.setAttribute('aNormal',new THREE.BufferAttribute(normals,3));
  particleGeometry.setAttribute('aScatter',new THREE.BufferAttribute(starts,3));
  particleGeometry.setAttribute('aTint',new THREE.BufferAttribute(tones,3));
  particleGeometry.setAttribute('aSeed',new THREE.BufferAttribute(seeds,3));
  particleGeometry.setAttribute('aSize',new THREE.BufferAttribute(sizes,1));
  const uniforms={
    uTime:{value:0},uIntro:{value:1},uMotion:{value:motionEnabled?1:0},uDay:{value:day},
    uPixelRatio:{value:dpr},uSize:{value:mobile?1.8:2.05},
    uPointer:{value:new THREE.Vector3(100,100,100)},uRepel:{value:0},
    uFollow:{value:0},uReference:{value:0},uScroll:{value:0},
    uGlow:{value:0},uInertia:{value:0},uViewport:{value:new THREE.Vector2(1,1)},
  };
  const particleMaterial = new THREE.ShaderMaterial({
    // Normal alpha compositing preserves each grain's sampled material colour.
    // No additive blending, bloom or ACES exposure is applied to this shader.
    uniforms, transparent:true, depthWrite:true, depthTest:true,
    blending:THREE.NormalBlending,toneMapped:false,
    vertexShader:`
      attribute vec3 aNormal;
      attribute vec3 aScatter;
      attribute vec3 aTint;
      attribute vec3 aSeed;
      attribute float aSize;
      uniform float uTime,uIntro,uMotion,uDay,uPixelRatio,uSize,uRepel,uFollow,uReference,uScroll,uGlow,uInertia;
      uniform vec3 uPointer;
      uniform vec2 uViewport;
      varying vec3 vTint;
      varying float vLight,vAlpha,vWarm;
      void main(){
        float t=uTime, phase=aSeed.x*6.2831853;
        vec3 p=position;
        // Coherent curl-like ripples travel over the whole surface. Most grains
        // stay attached; a small shifting population releases and gathers again.
        vec3 flow=vec3(
          sin(p.y*2.15+t*.73)+cos(p.z*3.1-t*.47),
          sin(p.z*2.3+t*.51)+cos(p.x*2.05+t*.6),
          sin(p.x*2.4-t*.57)+cos(p.y*2.3+t*.49)
        );
        float wave=sin(t*.72-p.y*2.2+p.x*.7);
        float shed=pow(.5+.5*sin(t*.36+p.y*.65),7.0)*smoothstep(.74,.98,aSeed.y);
        float live=1.0-aSeed.z*.94;
        p+=uMotion*live*(flow*.012+aNormal*wave*.017);
        p+=uMotion*live*aNormal*shed*(.07+.09*aSeed.x);
        p+=uMotion*live*vec3(sin(t*1.2+phase),cos(t*.93+phase),sin(t*.78+phase))*(.005+shed*.025);
        // Reassembly has a shallow spiral, never a random full-screen starfield.
        float angle=(1.0-uIntro)*1.5;
        vec3 start=aScatter;
        start.xz=mat2(cos(angle),-sin(angle),sin(angle),cos(angle))*start.xz;
        p=mix(start,p,uIntro);
        vec3 diff=p-uPointer;
        float influence=exp(-dot(diff.xy,diff.xy)*3.7)*uRepel*(1.0+.16*uInertia);
        vec3 outward=normalize(vec3(diff.xy,.35+.3*aSeed.y));
        p+=outward*(.66+.3*aSeed.x)*influence;
        p+=vec3(sin(t*.72+phase),cos(t*.63+phase),sin(t*.58+phase))*.10*influence;
        // Independent curved paths carry a dense subset all the way to the
        // pointer, even across the far side of the hero. The remaining body
        // preserves the N; the wordmark stays almost entirely assembled.
        float following=smoothstep(.64,.80,aSeed.y)*(1.0-aSeed.z*.97);
        float head=smoothstep(.48,.68,aSeed.x);
        float along=mix(.10+.80*aSeed.x,.995,head);
        float travel=clamp(uFollow*along,0.0,1.0);
        float radius=.055+.14*sqrt(aSeed.x);
        vec3 destination=uPointer+vec3(cos(phase*3.7)*radius,sin(phase*3.7)*radius,(aSeed.x-.5)*.16);
        vec3 journey=destination-position;
        vec3 side=normalize(vec3(-journey.y,journey.x,0.0)+vec3(.0001,0.0,.0001));
        float bend=(.28+min(length(journey.xy)*.08,.55))*sin(phase*2.3);
        vec3 control=(position+destination)*.5+side*bend+vec3(0.0,0.0,.16+.18*aSeed.x);
        vec3 trail=(1.0-travel)*(1.0-travel)*position+2.0*(1.0-travel)*travel*control+travel*travel*destination;
        p+=following*(trail-position);
        // A small scattered subset responds to scroll; no continuous surface
        // wave or sheet deformation crosses the complete N.
        float loose=smoothstep(.58,.98,aSeed.y)*(1.0-aSeed.z*.82);
        p+=uScroll*loose*(normalize(vec3(position.xy,.5))*(.06+.08*aSeed.y)
          +vec3(sin(phase),cos(phase),sin(phase*.7))*.025);
        vec4 mv=modelViewMatrix*vec4(p,1.0);
        gl_Position=projectionMatrix*mv;
        gl_PointSize=clamp(uSize*aSize*uPixelRatio*(7.0/-mv.z),1.1*uPixelRatio,mix(4.8,18.0,uGlow)*uPixelRatio);
        vec3 normal=normalize(normalMatrix*aNormal);
        float lighting=.6+.4*max(dot(normal,normalize(vec3(-.35,.65,1.0))),0.0);
        float ribbon=pow(.5+.5*sin(p.y*2.4-p.x*1.3-t*.8),10.0);
        float crown=exp(-dot(p.xy-vec2(-.25,.7),p.xy-vec2(-.25,.7))*1.4);
        float movingLight=exp(-dot(p.xy-uPointer.xy,p.xy-uPointer.xy)*.8)*uRepel;
        vLight=mix(lighting*(.91+.17*sin(phase)+.2*ribbon)+crown*.22,(.9+.12*max(dot(normal,normalize(vec3(-.35,.6,1.0))),0.0))*(1.0+movingLight*.1),uReference);
        // Reference colours are immutable through formation/scatter and day
        // changes: silver metal, blue-black PV and warm LED remain distinct.
        vTint=mix(aTint,vec3(.94,.95,.87),uDay*.16*(1.0-uReference));
        vTint=mix(vTint,vec3(.55,.84,.77),(1.0-smoothstep(-1.5,.3,p.y))*.12*(1.0-uReference));
        vWarm=aSeed.z*(1.0-uReference);
        vAlpha=mix(.62,.995,uIntro);
        // Only the outer full-canvas edge fades. The assembled-logo slot has
        // no clip, mask or exclusion zone, so dispersed grains can cross it.
        vec2 ndc=gl_Position.xy/gl_Position.w;
        float edgePx=min((1.0-abs(ndc.x))*uViewport.x*.5,(1.0-abs(ndc.y))*uViewport.y*.5);
        vAlpha*=smoothstep(0.0,24.0,edgePx);
      }
    `,
    fragmentShader:`
      uniform float uReference;
      varying vec3 vTint;
      varying float vLight,vAlpha,vWarm;
      void main(){
        vec2 p=gl_PointCoord*2.0-1.0;
        float r2=dot(p,p);
        if(r2>.96)discard;
        float z=sqrt(max(0.0,1.0-r2));
        // Individual pearl-like grains with a tiny directional highlight.
        float diffuse=.49+.51*max(dot(vec3(p.x,-p.y,z),normalize(vec3(-.45,.6,.9))),0.0);
        float glint=pow(max(dot(vec3(p.x,-p.y,z),normalize(vec3(-.3,.4,1.0))),0.0),22.0);
        vec3 fallbackColour=vTint*vLight*diffuse+vec3(.42,.45,.43)*glint+vWarm*vec3(.23,.13,.025);
        // A colour-matched specular modulation, never a white additive sparkle.
        // Scalar light changes keep the source RGB ratios even while dispersed.
        vec3 referenceColour=vTint*vLight*(.91+.09*diffuse)*(1.0+.08*glint);
        referenceColour/=max(1.0,max(referenceColour.r,max(referenceColour.g,referenceColour.b)));
        vec3 colour=mix(fallbackColour,referenceColour,uReference);
        float alpha=(1.0-smoothstep(.68,.96,r2))*vAlpha;
        if(alpha<.12)discard;
        gl_FragColor=vec4(colour,alpha);
        #include <colorspace_fragment>
      }
    `,
  });
  const particles=new THREE.Points(particleGeometry,particleMaterial);
  particles.frustumCulled=false; particles.visible=false; n.add(particles);
  // Only source-image LED core samples receive this small additive halo layer.
  // Main N grains continue to use normal blending and keep their own colours.
  const ledGlowGeometry=new THREE.BufferGeometry();
  const ledGlowMaterial=new THREE.ShaderMaterial({
    uniforms:{...uniforms,uGlow:{value:1},uSize:{value:mobile?7.4:8.1}},
    vertexShader:particleMaterial.vertexShader,
    fragmentShader:`
      varying float vAlpha;
      uniform float uTime,uMotion;
      void main(){
        vec2 p=gl_PointCoord*2.0-1.0;float r2=dot(p,p);
        if(r2>1.0)discard;
        float halo=exp(-r2*4.1)*(1.0-smoothstep(.6,1.0,r2));
        float shimmer=1.0+sin(uTime*.9)*.045*uMotion;
        gl_FragColor=vec4(vec3(1.0,.48,.105),halo*.115*vAlpha*shimmer);
        #include <colorspace_fragment>
      }
    `,
    transparent:true,depthWrite:false,depthTest:true,blending:THREE.AdditiveBlending,toneMapped:false,
  });
  const ledGlow=new THREE.Points(ledGlowGeometry,ledGlowMaterial);
  ledGlow.frustumCulled=false;ledGlow.visible=false;ledGlow.renderOrder=1;n.add(ledGlow);
  let referenceWidth=3.1;
  // Preserve the approved image's silhouette, louvers, colours and both text
  // lines. A layered particle relief supplies depth without inventing a new N.
  const referenceImage = new Image();
  referenceImage.decoding='async';
  function useReferenceImage(){
    if(disposed)return;
    try{
      const sample=document.createElement('canvas');
      sample.width=Math.min(720,referenceImage.naturalWidth);
      sample.height=Math.round(sample.width*referenceImage.naturalHeight/referenceImage.naturalWidth);
      const ctx=sample.getContext('2d',{willReadFrequently:true});
      ctx.drawImage(referenceImage,0,0,sample.width,sample.height);
      const pixels=ctx.getImageData(0,0,sample.width,sample.height).data;
      const cutoff=220;
      const rawAlpha=(x,y)=>(x<0||y<0||x>=sample.width||y>=sample.height)?0:pixels[(y*sample.width+x)*4+3];
      const validPixel=(x,y,text=false)=>{
        const k=(y*sample.width+x)*4,r=pixels[k],g=pixels[k+1],b=pixels[k+2];
        if(rawAlpha(x,y)<cutoff)return false;
        if(text&&Math.max(r,g,b)-Math.min(r,g,b)>34)return false;
        const edge=rawAlpha(x-1,y)<cutoff||rawAlpha(x+1,y)<cutoff||rawAlpha(x,y-1)<cutoff||rawAlpha(x,y+1)<cutoff;
        // Reject isolated chromatic cutout fringe, retaining warm interior LEDs.
        if(edge&&((r>g*1.55&&r>b*1.5)||(r>180&&g>150&&b<55)))return false;
        return true;
      };
      let minX=sample.width,minY=sample.height,maxX=0,maxY=0;
      const rows=new Uint32Array(sample.height);
      for(let y=0;y<sample.height;y++)for(let x=0;x<sample.width;x++){
        if(!validPixel(x,y))continue;
        rows[y]++;minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);
      }
      if(maxX<=minX||maxY<=minY)throw new Error('empty-brand-target');
      // The first clear horizontal gap in the lower half separates the N
      // sculpture from its wordmark; text is allocated a dense, stable sample.
      let textStart=minY+(maxY-minY)*.79,runStart=0;
      for(let y=Math.floor(minY+(maxY-minY)*.58);y<maxY-8;y++){
        if(rows[y]<2){if(!runStart)runStart=y;}
        else if(runStart){if(y-runStart>=3){textStart=y;break;}runStart=0;}
      }
      const body=[],text=[];
      const alpha=rawAlpha;
      for(let y=minY;y<=maxY;y++)for(let x=minX;x<=maxX;x++){
        if(!validPixel(x,y,y>=textStart))continue;
        (y>=textStart?text:body).push(y*sample.width+x);
      }
      const h=maxY-minY+1,unit=3.65/h,centerX=(minX+maxX)/2,centerY=(minY+maxY)/2;
      referenceWidth=(maxX-minX+1)*unit;
      const colour=new THREE.Color(),glowIndices=[];
      const pixelLuma=(px,py)=>{
        const k=(Math.max(0,Math.min(sample.height-1,py))*sample.width+Math.max(0,Math.min(sample.width-1,px)))*4;
        return (pixels[k]*.2126+pixels[k+1]*.7152+pixels[k+2]*.0722)/255;
      };
      // Narrow traces of the three luminous apertures in the approved 720px
      // target. Combined with colour/luminance they exclude gold metal edges.
      const nearStrip=(x,y,ax,ay,bx,by,radius)=>{
        const scale=sample.width/720;ax*=scale;ay*=scale;bx*=scale;by*=scale;
        const dx=bx-ax,dy=by-ay,t=Math.max(0,Math.min(1,((x-ax)*dx+(y-ay)*dy)/(dx*dx+dy*dy)));
        return Math.hypot(x-ax-t*dx,y-ay-t*dy)<radius*scale;
      };
      for(let i=0;i<count;i++){
        const isText=text.length&&i<count*.16;
        const bucket=isText?text:body;const pixel=bucket[Math.floor(rand()*bucket.length)];
        const x=pixel%sample.width,y=Math.floor(pixel/sample.width),j=i*3,k=pixel*4;
        const luminance=(pixels[k]*.2126+pixels[k+1]*.7152+pixels[k+2]*.0722)/255;
        const edge=alpha(x-2,y)<cutoff||alpha(x+2,y)<cutoff||alpha(x,y-2)<cutoff||alpha(x,y+2)<cutoff;
        const gx=(alpha(x-2,y)-alpha(x+2,y))/255,gy=(alpha(x,y+2)-alpha(x,y-2))/255;
        // Most particles exactly reproduce the frontal target. Layered edge
        // shells and recessed low-luminance panels add modest parallax depth.
        const r=pixels[k],g=pixels[k+1],b=pixels[k+2];
        const pv=!isText&&luminance<.4&&b>r*1.06;
        const metal=!isText&&!pv&&Math.max(r,g,b)-Math.min(r,g,b)<48;
        let z=isText?.015:pv?.085+luminance*.12:.17+luminance*.24;
        let shell=false;
        if(!isText&&edge&&rand()<.55){z-=rand()*.36;shell=true;}
        else if(!isText&&rand()<.09){z-=.2+rand()*.15;shell=true;}
        homes.set([(x-centerX+(rand()-.5)*.7)*unit,(centerY-y+(rand()-.5)*.7)*unit,z],j);
        const dx=pixelLuma(x-5,y)-pixelLuma(x+5,y),dy=pixelLuma(x,y+5)-pixelLuma(x,y-5);
        va.set(shell?gx*.85:dx*.48,shell?gy*.85:dy*.48,1).normalize();normals.set([va.x,va.y,va.z],j);
        colour.setRGB(pixels[k]/255,pixels[k+1]/255,pixels[k+2]/255,THREE.SRGBColorSpace);
        if(isText)colour.setRGB(.76,.86,.88).multiplyScalar(.88+.12*luminance);
        else {
          // Lift the darkest PV detail without injecting white into blue-black
          // cells; the gain is scalar in linear RGB, preserving colour ratios.
          const detailGain=1.04+.22*Math.pow(1-luminance,2);
          const facet=shell?.76:pv?.98:metal?1.055:.97;
          colour.multiplyScalar(detailGain*facet);
          if(shell){colour.r*=1.025;colour.b*=.97;}
          else if(pv){colour.r*=.985;colour.b*=1.025;}
        }
        tones.set([colour.r,colour.g,colour.b],j);
        seeds.set([rand(),rand(),isText?1:0],j);
        sizes[i]=isText?.72+rand()*.43:.78+rand()*.83;
        const onLed=nearStrip(x,y,165,167,493,341,4.2)||nearStrip(x,y,252,296,495,424,4.5)||nearStrip(x,y,436,532,600,532,6);
        if(!isText&&!shell&&onLed&&r>248&&g>215&&r-b>20&&luminance>.86)glowIndices.push(i);
      }
      ['position','aNormal','aTint','aSeed','aSize'].forEach(name=>{particleGeometry.attributes[name].needsUpdate=true;});
      particleGeometry.computeBoundingSphere();
      const glowCount=Math.min(mobile?250:700,glowIndices.length);
      for(const name of ['position','aNormal','aScatter','aTint','aSeed','aSize']){
        const original=particleGeometry.attributes[name],values=new Float32Array(glowCount*original.itemSize);
        for(let j=0;j<glowCount;j++){
          const sourceIndex=glowIndices[Math.floor(j*glowIndices.length/glowCount)];
          for(let c=0;c<original.itemSize;c++)values[j*original.itemSize+c]=original.array[sourceIndex*original.itemSize+c];
          if(name==='position')values[j*3+2]+=.018;
        }
        ledGlowGeometry.setAttribute(name,new THREE.BufferAttribute(values,original.itemSize));
      }
      ledGlowGeometry.setDrawRange(0,glowCount);
      canvas.dataset.particleCount=String(count);canvas.dataset.ledGlowCount=String(glowCount);
      uniforms.uReference.value=1;uniforms.uSize.value=mobile?2.0:2.32;
      window.clearTimeout(referenceRequest);referenceReady=true;referencePending=false;
      particles.visible=objectMode==='brand';ledGlow.visible=objectMode==='brand'&&glowCount>0;coreGlow.material.opacity=0;
      introStart=motionEnabled?clock:clock-5;resize();requestDraw();
    }catch(error){useProceduralFallback();}
  }
  function useProceduralFallback(){
    if(disposed||referenceReady)return;referencePending=false;
    particles.visible=objectMode==='brand';requestDraw();
  }
  referenceImage.onload=useReferenceImage;referenceImage.onerror=useProceduralFallback;
  referenceRequest=window.setTimeout(useProceduralFallback,12000);
  referenceImage.src=opts.targetImage||'/images/brand/solar-n-lockup.png';
  // A restrained warm energy core supports the bead sculpture, not a bloom pass
  // that would flatten fine grain or destroy the canvas alpha channel.
  const coreGlow=new THREE.Sprite(new THREE.SpriteMaterial({map:glowMap,color:0xffd7a2,transparent:true,opacity:.13,blending:THREE.AdditiveBlending,depthWrite:false}));
  coreGlow.position.set(-.22,.55,-.22);coreGlow.scale.set(1.85,1.85,1);coreGlow.visible=objectMode==='brand';n.add(coreGlow);
  const pointer = new THREE.Vector2(), pointerTarget = new THREE.Vector2(),rayPointerTarget=new THREE.Vector2();
  const repulsion = new THREE.Vector3(100, 100, 1);
  const raycaster = new THREE.Raycaster();
  const mousePlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -.2);
  const mouseHit = new THREE.Vector3();
  let pointerActive=false,pointerWasActive=false,inertiaTarget=0,inertia=0,lastPointerX=null,lastPointerTime=0,follow=0;

  let repel=0,scrollTarget=0,scrollEnergy=0,scrollTilt=0,scrollDirection=0,lastScrollY=window.scrollY,lastScrollTime=performance.now();
  function draw(timestamp = performance.now()) {
    frame=0;
    if(disposed||!inView||document.hidden)return;
    const delta=Math.min(lastTime?(timestamp-lastTime)/1000:.016,.05);lastTime=timestamp;
    if(motionEnabled&&inView&&!document.hidden)clock+=delta;
    const desiredDay=mode==='day'?1:0;
    day=motionEnabled?THREE.MathUtils.damp(day,desiredDay,3,delta):desiredDay;
    const showingProduct=objectMode==='product';
    renderer.toneMappingExposure=showingProduct?.98:1;
    hemisphere.intensity=.9+day*.65;key.intensity=2.4+day*.8;
    scene.environmentIntensity=.8+day*.25;
    const elapsed=clock-introStart;
    const intro=motionEnabled?smooth(clamp(elapsed/2.8,0,1)):1;
    pointer.lerp(pointerTarget,motionEnabled?1-Math.exp(-delta*3.2):1);
    n.rotation.y=(referenceReady?0:-.08)+pointer.x*(referenceReady?.16:.12)+(motionEnabled?Math.sin(clock*.23)*(referenceReady?.012:.045):0);
    if(timestamp-lastScrollTime>100)scrollTarget=0;
    scrollEnergy=THREE.MathUtils.damp(scrollEnergy,scrollTarget,4.2,delta);
    scrollTilt=THREE.MathUtils.damp(scrollTilt,scrollDirection*scrollEnergy*.025,3.5,delta);
    n.rotation.x=pointer.y*(referenceReady?-.055:-.035)+scrollTilt;
    n.position.y=motionEnabled?Math.sin(clock*.55)*.022:0;
    product.scale.setScalar(.985+intro*.015);
    chipMaterial.emissiveIntensity=.18-day*.17;
    coreGlow.visible=!showingProduct&&!referenceReady;
    coreGlow.material.opacity=(.11+.025*Math.sin(clock*.8))*(1-day*.65)*intro;
    if(pointerActive&&motionEnabled){
      raycaster.setFromCamera(rayPointerTarget,camera);
      raycaster.ray.intersectPlane(mousePlane,mouseHit);
      n.worldToLocal(repulsion.copy(mouseHit));
      if(!pointerWasActive)uniforms.uPointer.value.copy(repulsion);
      else uniforms.uPointer.value.lerp(repulsion,1-Math.exp(-delta*7));
      pointerWasActive=true;
    }
    if(!pointerActive)pointerWasActive=false;
    const recentlyMoved=pointerActive&&timestamp-lastPointerTime<140;
    repel=THREE.MathUtils.damp(repel,recentlyMoved&&motionEnabled?1:0,recentlyMoved?4.2:3.0,delta);
    const followingPointer=pointerActive&&timestamp-lastPointerTime<320&&motionEnabled;
    follow=THREE.MathUtils.damp(follow,followingPointer?1:0,followingPointer?9:3.2,delta);
    if(!followingPointer&&follow<.006)follow=0;
    uniforms.uFollow.value=motionEnabled?follow:0;
    uniforms.uScroll.value=motionEnabled?scrollEnergy:0;
    if(timestamp-lastPointerTime>100)inertiaTarget=0;
    inertia=THREE.MathUtils.damp(inertia,inertiaTarget,3.5,delta);
    uniforms.uInertia.value=motionEnabled?inertia:0;
    uniforms.uTime.value=clock;
    uniforms.uIntro.value=intro;
    uniforms.uMotion.value=motionEnabled?1:0;
    uniforms.uDay.value=day;
    uniforms.uRepel.value=repel;
    try{
      renderer.render(scene,camera);
      if(!ready&&(!referencePending||showingProduct)){ready=true;container.dispatchEvent(new CustomEvent('solar-ready'));}
    }catch(error){
      container.dispatchEvent(new CustomEvent('solar-error',{detail:{reason:'render-error'}}));
      dispose();return;
    }
    if(motionEnabled&&inView&&!document.hidden)requestDraw();
  }

  function stopFrame(){
    if(frame)cancelAnimationFrame(frame);
    frame=0;frameRequestedAt=0;
  }
  function syncViewportVisibility(rect=container.getBoundingClientRect()){
    const visible=rect.width>0&&rect.height>0&&rect.right>0&&rect.bottom>0&&rect.left<window.innerWidth&&rect.top<window.innerHeight;
    if(visible!==inView){inView=visible;lastTime=0;}
    if(!visible)stopFrame();
    return visible;
  }
  function requestDraw(restart=false) {
    if(disposed||document.hidden||!inView)return;
    const now=performance.now();
    // Browser suspension / restored layout can leave a nonzero request token
    // without a delivered callback. A fresh input must be able to wake it.
    if(frame&&(restart||now-frameRequestedAt>500))stopFrame();
    if(!frame){frameRequestedAt=now;frame=requestAnimationFrame(draw);}
  }
  function resize() {
    if (disposed) return;
    syncViewportVisibility();
    const width = Math.max(container.clientWidth, 1), height = Math.max(container.clientHeight, 1);
    camera.aspect = width / height;
    // A fixed frontal camera covers the entire visual. Fit the assembled
    // reference inside its separate CSS slot, not inside a cropped canvas.
    const halfFov=Math.tan(THREE.MathUtils.degToRad(camera.fov*.5));
    const distance=7.2;
    camera.position.set(0,cameraTarget.y,distance);
    camera.lookAt(cameraTarget);camera.updateProjectionMatrix();
    const fullRect=container.getBoundingClientRect();
    const targetRect=brandSlot?.getBoundingClientRect()||fullRect;
    const left=targetRect.left-fullRect.left,top=targetRect.top-fullRect.top;
    const slotWidth=Math.max(targetRect.width,1),slotHeight=Math.max(targetRect.height,1);
    const viewHeight=2*distance*halfFov,viewWidth=viewHeight*camera.aspect;
    const slotWorldWidth=slotWidth/width*viewWidth,slotWorldHeight=slotHeight/height*viewHeight;
    const subjectWidth=referenceReady?referenceWidth+.24:3.7;
    const subjectHeight=referenceReady?3.87:3.7;
    const fit=Math.max(.05,Math.min(slotWorldWidth/subjectWidth,slotWorldHeight/subjectHeight));
    // Phone-only art direction: keep the full-hero interaction canvas while
    // reducing the complete assembled mark (N + wordmark + LEDs) by one fifth.
    const phoneScale=matchMedia('(max-width: 760px)').matches ? .8 : 1;
    brandLayout.scale.setScalar(fit*phoneScale);
    brandLayout.position.set(((left+slotWidth*.5)/width-.5)*viewWidth,
      cameraTarget.y+(.5-(top+slotHeight*.5)/height)*viewHeight,0);
    brandLayout.updateMatrixWorld(true);
    uniforms.uViewport.value.set(width,height);
    renderer.setSize(width,height,false);
    requestDraw();
  }
  function onMove(event) {
    if(disposed||!motionEnabled||reducedMotion.matches||document.hidden)return;
    const rect=container.getBoundingClientRect();
    // Observer delivery is asynchronous. Re-evaluate the current geometry
    // before rejecting input so a resized/re-entered stage can wake itself.
    if(!syncViewportVisibility(rect))return;
    const now=performance.now();
    // Whole-viewport motion controls gentle tilt, while the ray still uses the
    // actual model viewport so local repulsion never jumps to the wrong place.
    pointerTarget.set(event.clientX/window.innerWidth*2-1,-event.clientY/window.innerHeight*2+1);
    rayPointerTarget.set(((event.clientX-rect.left)/rect.width)*2-1,-((event.clientY-rect.top)/rect.height)*2+1);
    if(lastPointerX!==null){
      const dt=Math.max(16,now-lastPointerTime),velocity=(event.clientX-lastPointerX)/window.innerWidth/(dt/1000);
      inertiaTarget=clamp(Math.abs(velocity)*.24,0,1);
    }
    lastPointerX=event.clientX;lastPointerTime=now;pointerActive=true;requestDraw();
  }
  function onLeave() {pointerTarget.set(0,0);pointerActive=false;lastPointerX=null;}
  function onWindowOut(event){if(!event.relatedTarget)onLeave();}
  function onDown(event){
    if(event.isPrimary===false)return;onMove(event);
    if(motionEnabled)requestDraw();
  }
  function onUp(event){
    if(event.pointerType!=='mouse'){pointerActive=false;pointerTarget.set(0,0);lastPointerX=null;}
    if(motionEnabled)requestDraw();
  }
  function onScroll(){
    const now=performance.now(),y=window.scrollY,dy=y-lastScrollY,dt=Math.max(16,now-lastScrollTime);
    lastScrollY=y;lastScrollTime=now;
    if(disposed||!motionEnabled||reducedMotion.matches||document.hidden||!syncViewportVisibility())return;
    scrollDirection=Math.sign(dy);
    scrollTarget=clamp(Math.abs(dy)/dt*.18,0,.5);
    requestDraw();
  }
  function onVisibility(){
    lastTime=0;stopFrame();
    if(document.hidden){onLeave();return;}
    syncViewportVisibility();requestDraw();
  }
  function onPageShow(){
    if(disposed)return;
    lastTime=0;stopFrame();resize();
  }
  function onMotionPreference(event) { if (event.matches) setMotion(false); }
  function onContextLost(event) {
    event.preventDefault();
    container.dispatchEvent(new CustomEvent('solar-error', { detail: { reason: 'context-lost' } }));
    dispose();
  }
  const observer = new ResizeObserver(resize);observer.observe(container);
  if(brandSlot)observer.observe(brandSlot);
  container.addEventListener('solar-layout-change',resize);
  const intersection = new IntersectionObserver(() => {
    if(disposed)return;
    syncViewportVisibility();lastTime=0;
    if(inView)requestDraw();
  }, { rootMargin: '0px' }); intersection.observe(container);
  window.addEventListener('pointermove',onMove,{passive:true});
  window.addEventListener('pointerout',onWindowOut,{passive:true});
  window.addEventListener('blur',onLeave);
  window.addEventListener('pageshow',onPageShow);
  container.addEventListener('pointerdown',onDown,{passive:true});
  window.addEventListener('pointerup',onUp,{passive:true});
  window.addEventListener('pointercancel',onUp,{passive:true});
  window.addEventListener('scroll',onScroll,{passive:true});
  document.addEventListener('visibilitychange', onVisibility);
  reducedMotion.addEventListener('change', onMotionPreference);
  canvas.addEventListener('webglcontextlost', onContextLost);

  function setMode(value) { mode = value === 'day' ? 'day' : 'night'; requestDraw(); }
  function setObject(value) {
    objectMode = value === 'product' ? 'product' : 'brand';
    model.visible = false; product.visible = objectMode === 'product';
    particles.visible=objectMode==='brand'&&!referencePending;coreGlow.visible=objectMode==='brand'&&!referenceReady;ledGlow.visible=objectMode==='brand'&&referenceReady;
    introStart = motionEnabled ? clock : clock - 5;
    requestDraw();
  }
  function setMotion(value) {
    motionEnabled = Boolean(value)&&!reducedMotion.matches;
    if (!motionEnabled) { introStart=clock-5;pointerTarget.set(0,0);scrollEnergy=0;scrollTarget=0;follow=0;repel=0;pointerActive=false;inertiaTarget=0;inertia=0; }
    lastTime = 0; requestDraw();
  }
  function replay() { introStart = motionEnabled ? clock : clock - 5; requestDraw(); }
  function dispose() {
    if (disposed) return; disposed = true;
    stopFrame();
    window.clearTimeout(referenceRequest);referenceImage.onload=null;referenceImage.onerror=null;
    observer.disconnect();intersection.disconnect();
    container.removeEventListener('solar-layout-change',resize);
    window.removeEventListener('pointermove',onMove);window.removeEventListener('pointerout',onWindowOut);window.removeEventListener('blur',onLeave);window.removeEventListener('pageshow',onPageShow);
    container.removeEventListener('pointerdown',onDown);window.removeEventListener('pointerup',onUp);window.removeEventListener('pointercancel',onUp);window.removeEventListener('scroll',onScroll);
    document.removeEventListener('visibilitychange', onVisibility); reducedMotion.removeEventListener('change', onMotionPreference);
    canvas.removeEventListener('webglcontextlost', onContextLost);
    const geometries = new Set(), materials = new Set();
    scene.traverse((object) => {
      if (object.geometry) geometries.add(object.geometry);
      if (object.material) (Array.isArray(object.material) ? object.material : [object.material]).forEach((material) => materials.add(material));
    });
    geometries.forEach((geometry) => geometry.dispose()); materials.forEach((material) => material.dispose());
    led.dispose(); solarMap.dispose(); productSolarMap.dispose(); metalMap.dispose(); glowMap.dispose(); environment.dispose();
    renderer.dispose(); canvas.remove();
  }
  resize();
  return { setMode, setObject, setMotion, replay, dispose };
}
