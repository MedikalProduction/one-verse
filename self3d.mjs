/* self3d.mjs -- THE BODY, IN VOLUME.  A derivation you can turn with a finger.
 *
 * The law is duplicated here ON PURPOSE, and it is a debt: `player_config.py` is the reference, this file
 * is the browser's copy. If a bound moves in one, it must move in the other -- and so the page says which
 * of the three layers it is showing: DERIVED (computed here), DECLARED (the name typed), never COMMITTED
 * (unless the chain says so).  A world you can walk through is still a claim until the chain holds it.
 */
import * as THREE from './vendor/three.module.js';

const PLANET = 'e51deae9247e6845';   // /api/world -> planet_seed (measured 2026-10-20)
const PLAYER = 0;

/* ── sha256, so the body needs no server ───────────────────────────────────────────────────────────── */
export const K_SHA = new Uint32Array([
  0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,
  0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,
  0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,
  0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,
  0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,
  0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,
  0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,
  0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2]);

function sha256Hex(str) {
  const H = new Uint32Array([0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,
                             0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19]);
  const bytes = new TextEncoder().encode(str);
  const len = bytes.length, bits = len * 8;
  const total = ((len + 9 + 63) >> 6) << 6;
  const buf = new Uint8Array(total);
  buf.set(bytes);
  buf[len] = 0x80;
  const dv = new DataView(buf.buffer);
  dv.setUint32(total - 4, bits >>> 0, false);
  dv.setUint32(total - 8, Math.floor(bits / 4294967296), false);
  const w = new Uint32Array(64);
  const rotr = (x, n) => (x >>> n) | (x << (32 - n));
  for (let off = 0; off < total; off += 64) {
    for (let i = 0; i < 16; i++) w[i] = dv.getUint32(off + i * 4, false);
    for (let i = 16; i < 64; i++) {
      const s0 = rotr(w[i-15],7) ^ rotr(w[i-15],18) ^ (w[i-15] >>> 3);
      const s1 = rotr(w[i-2],17) ^ rotr(w[i-2],19) ^ (w[i-2] >>> 10);
      w[i] = (w[i-16] + s0 + w[i-7] + s1) >>> 0;
    }
    let a = H[0], b = H[1], c = H[2], d = H[3], e = H[4], f = H[5], g = H[6], h = H[7];
    for (let i = 0; i < 64; i++) {
      const S1 = rotr(e,6) ^ rotr(e,11) ^ rotr(e,25);
      const ch = (e & f) ^ (~e & g);
      const t1 = (h + S1 + ch + K_SHA[i] + w[i]) >>> 0;
      const S0 = rotr(a,2) ^ rotr(a,13) ^ rotr(a,22);
      const mj = (a & b) ^ (a & c) ^ (b & c);
      const t2 = (S0 + mj) >>> 0;
      h = g; g = f; f = e; e = (d + t1) >>> 0;
      d = c; c = b; b = a; a = (t1 + t2) >>> 0;
    }
    H[0] = (H[0]+a)>>>0; H[1] = (H[1]+b)>>>0; H[2] = (H[2]+c)>>>0; H[3] = (H[3]+d)>>>0;
    H[4] = (H[4]+e)>>>0; H[5] = (H[5]+f)>>>0; H[6] = (H[6]+g)>>>0; H[7] = (H[7]+h)>>>0;
  }
  return Array.from(H, x => x.toString(16).padStart(8, '0')).join('');
}

/* bounds mirror player_config.K_* -- if one moves, the other moves with it, or the picture lies. */
const BND = { hue: [0, 359], height: [120, 230], build: [0.80, 1.60],
              voice: [0.70, 1.60], gait: [0.70, 1.60], aura: [0.02, 0.95] };
const unit = (hex, i) => parseInt(hex.slice(i, i + 6), 16) / 0xffffff;
const lerp = (r, lo, hi) => lo + (hi - lo) * r;

function readBody(seed, name, isTwin = false) {
  return {
    name, seed, isTwin,
    sigil: seed.slice(0, 6),
    urn: `urn:0z:me:${seed.slice(0, 6)}`,
    hue: Math.round(lerp(unit(seed, 0), BND.hue[0], BND.hue[1])),
    height: lerp(unit(seed, 6), BND.height[0], BND.height[1]),
    build: lerp(unit(seed, 12), BND.build[0], BND.build[1]),
    voice: lerp(unit(seed, 18), BND.voice[0], BND.voice[1]),
    gait: lerp(unit(seed, 24), BND.gait[0], BND.gait[1]),
    aura: lerp(unit(seed, 30), BND.aura[0], BND.aura[1]),
  };
}

function derive(name) {
  return readBody(sha256Hex(`${PLANET}:${PLAYER}:${name}`), name);
}

/* THE MIRROR: 15 - digit, digit by digit -> an involution. The twin is the same body read backwards. */
function mirrorHex(hex) {
  return hex.split('').map(ch => {
    const v = parseInt(ch, 16);
    return Number.isNaN(v) ? ch : (15 - v).toString(16);
  }).join('');
}

const twinOf = (t) => readBody(mirrorHex(t.seed), `${t.name} (D)`, true);


/* ── the volume ────────────────────────────────────────────────────────────────────────────────────── */
const GOLDEN = Math.PI * (3 - Math.sqrt(5));   // 2.399963 rad = 137.507764 deg -- phi, again

const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight, false);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x05070c);
scene.fog = new THREE.FogExp2(0x05070c, 0.010);

const camera = new THREE.PerspectiveCamera(42, innerWidth / innerHeight, 0.1, 4000);

/* the ground you stand on: 1 unit = 1 m, so the body's height is literally in metres */
const water = new THREE.Mesh(new THREE.PlaneGeometry(4000, 4000),
  new THREE.MeshBasicMaterial({ color: 0x060d18 }));
water.rotation.x = -Math.PI / 2;
water.position.y = -0.02;
scene.add(water);
scene.add(new THREE.GridHelper(400, 40, 0x14243a, 0x0b1524));
scene.add(new THREE.HemisphereLight(0x8fa8ff, 0x05070c, 1.25));
const keyLight = new THREE.DirectionalLight(0xffffff, 1.5);
keyLight.position.set(6, 12, 8);
scene.add(keyLight);
const rimLight = new THREE.DirectionalLight(0x4fd1a5, 0.6);
rimLight.position.set(-8, 4, -6);
scene.add(rimLight);

/* ── a body is a few solids, sized by four numbers ──────────────────────────────────────────────────
   height -> every length.  build -> width and depth.  voice -> neck and collar.  gait -> the stance.
   Nothing is sculpted; there is no mesh to licence.                                                    */
const group = new THREE.Group();
scene.add(group);
let halo = null;

function dress(shape) {
  while (group.children.length) {
    const c = group.children.pop();
    c.geometry?.dispose?.();
    c.material?.dispose?.();
  }
  const h = shape.height / 100;                 // metres
  const w = shape.build;
  const hue = shape.hue / 360;
  const skin = new THREE.Color().setHSL(hue, 0.32, 0.64);
  const cloth = new THREE.Color().setHSL(hue, 0.55, 0.40);
  const mat = (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.55, metalness: 0.08 });

  const add = (geo, m, x, y, z) => {
    const mesh = new THREE.Mesh(geo, m);
    mesh.position.set(x, y, z);
    group.add(mesh);
    return mesh;
  };
  // torso: wide at the shoulders, narrow at the waist, both by `build`
  add(new THREE.CylinderGeometry(0.17 * w, 0.13 * w, h * 0.30, 24), mat(cloth), 0, h * 0.58, 0);
  // hips
  add(new THREE.SphereGeometry(0.15 * w, 20, 14), mat(cloth), 0, h * 0.41, 0);
  // neck: its length is the voice -- a high voice carries further
  const neck = h * 0.03 * shape.voice;
  add(new THREE.CylinderGeometry(0.045 * w, 0.055 * w, neck, 16), mat(skin), 0, h * 0.745 + neck / 2, 0);
  // head
  const head = add(new THREE.SphereGeometry(h * 0.072, 26, 20), mat(skin),
                   0, h * 0.755 + neck + h * 0.072, 0);
  head.scale.set(0.92, 1.08, 0.95);
  // legs: the stance is the gait, so a wide walker stands wide
  const spread = 0.055 * w + 0.03 * (shape.gait - 0.7);
  for (const s of [-1, 1]) {
    add(new THREE.CapsuleGeometry(0.045 * w, h * 0.34, 6, 12), mat(skin), s * spread, h * 0.215, 0);
    add(new THREE.CapsuleGeometry(0.038 * w, h * 0.30, 6, 12), mat(skin), s * 0.075 * w, h * 0.065, 0.01);
  }
  // arms
  for (const s of [-1, 1]) {
    const arm = add(new THREE.CapsuleGeometry(0.036 * w, h * 0.26, 6, 12), mat(skin),
                    s * 0.165 * w, h * 0.52, 0);
    arm.rotation.z = -s * (0.10 + 0.10 * shape.gait);
  }

  /* ── THE AURA.  Every mote sits at i * GOLDEN, so the halo never repeats and never lines up.
     Its opacity is the aura itself: the field you carry is the field that shows.                     */

/* ── the HUD says WHICH LAYER you are looking at ──────────────────────────────────────────────────────
   DERIVED is computed here.  DECLARED is what you typed.  COMMITTED is not ours to claim: we ask the
   chain, and if it does not answer we say so out loud, in the panel, to your face.                    */
const hud = document.getElementById('traits');
const urnEl = document.getElementById('urn');
const nameEl = document.getElementById('name');
const startName = decodeURIComponent(location.hash.slice(1)) || 'captain';
let me = derive(startName);
let showTwin = false;
let committed;   // undefined = not asked yet, null = the gate did not answer

function bar(label, v, lo, hi, suffix) {
  const pct = Math.max(0, Math.min(100, Math.round(1000 * (v - lo) / (hi - lo)) / 10));
  const shown = hi >= 100 ? v.toFixed(0) : v.toFixed(2);
  return `<div class="row"><span>${label}</span><b>${shown}${suffix}</b></div>
          <div class="bar"><i style="width:${pct}%"></i></div>`;
}

function paintHUD() {
  const b = showTwin ? twinOf(me) : me;
  urnEl.textContent = b.urn + (showTwin ? '   (D — the mirror)' : '');
  let st = 'not asked';
  if (committed === null) st = 'chain unreadable';
  else if (committed === false) st = 'not committed';
  else if (committed) st = committed.name === b.name ? 'committed' : 'not in the chain';
  hud.innerHTML =
    `<div class="row"><span>hue</span><b>${b.hue}°</b></div>
     <div class="row"><span>sigil</span><b>${b.sigil}</b></div>` +
    bar('height', b.height, 120, 230, ' cm') +
    bar('build', b.build, 0.80, 1.60, '') +
    bar('voice', b.voice, 0.70, 1.60, '') +
    bar('gait', b.gait, 0.70, 1.60, '') +
    bar('aura', b.aura, 0.02, 0.95, '') +
    `<div class="row" style="margin-top:8px"><span>chain</span><b>${st}</b></div>`;
  nameEl.value = shape.name;
}

async function askChain() {
  try {
    const r = await fetch('/api/world', { cache: 'no-store' });
    const j = await r.json();
    const rows = (j.claims || []).filter((c) => String(c.plot) === 'PLAYER:0');
    committed = rows.length ? (rows[rows.length - 1].body || rows[rows.length - 1]) : false;
  } catch (e) {
    committed = null;
  }
}

  const n = 40 + Math.round(shape.aura * 360);
  const pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const a = i * GOLDEN;
    const y = (i / Math.max(1, n - 1)) - 0.5;

/* ── the eye: drag to turn, wheel to come closer, d for the twin ─────────────────────────────────────── */
let yaw = 0.55, pitch = 0.30, dist = 3.6, drag = false, px = 0, py = 0;
canvas.addEventListener('pointerdown', (e) => { drag = true; px = e.clientX; py = e.clientY; });
addEventListener('pointerup', () => { drag = false; });
addEventListener('pointermove', (e) => {
  if (!drag) return;
  yaw -= (e.clientX - px) * 0.006;
  pitch = Math.max(-0.4, Math.min(1.2, pitch + (e.clientY - py) * 0.004));
  px = e.clientX; py = e.clientY;
});
canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  dist = Math.max(1.6, Math.min(12, dist + e.deltaY * 0.0022));
}, { passive: false });
addEventListener('keydown', (e) => {
  if (e.key === 'd' || e.key === 'D') {
    showTwin = !showTwin;
    dress(showTwin ? twinOf(me) : me);
    paintHUD();
  }
});
nameEl.addEventListener('input', () => {
  const n = nameEl.value.trim();
  if (!n) return;
  me = derive(n);
  history.replaceState(null, '', '#' + encodeURIComponent(n));
  dress(showTwin ? twinOf(me) : me);
  paintHUD();
});
addEventListener('resize', () => {
  renderer.setSize(innerWidth, innerHeight, false);
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
});

/* ── the loop: the walk IS the gait ─────────────────────────────────────────────────────────────────── */
const clock = new THREE.Clock();
function frame() {
  const t = clock.getElapsedTime();
  const b = showTwin ? twinOf(me) : me;
  const h = b.height / 100;
  // a slow walker swings slowly: gait scales the cadence, never the amplitude
  const phase = t * 1.9 * b.gait;
  const legs = group.children.filter((c) => c.isMesh && c.position.y < h * 0.30);
  legs.forEach((c, i) => {
    c.rotation.x = Math.sin(phase + (i % 2 ? Math.PI : 0)) * 0.16 * Math.min(1, b.gait);
  });
  if (halo) {
    halo.rotation.y = t * 0.22 * b.gait;
    halo.position.y = Math.sin(phase * 0.5) * 0.012;
  }
  camera.position.set(Math.cos(yaw) * dist * Math.cos(pitch),
                      h * 0.55 + Math.sin(pitch) * dist,
                      Math.sin(yaw) * dist * Math.cos(pitch));
  camera.lookAt(0, h * 0.52, 0);
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}

dress(me);
paintHUD();
askChain().then(paintHUD);
frame();

/* THE DEBT, PAID IN PUBLIC: the law above is exported so `_parity.mjs` can weigh it against
   `player_config.py`.  A browser copy nobody checks is a picture nobody can trust. */
export { derive, sha256Hex, mirrorHex, twinOf, readBody, BND };

    const r = Math.sqrt(Math.max(0, 1 - 4 * y * y * 0.98)) * (h * 0.30) * (1 + 0.6 * shape.aura);
    pos[i * 3] = Math.cos(a) * r;
    pos[i * 3 + 1] = h * 0.55 + y * h * 0.95;
    pos[i * 3 + 2] = Math.sin(a) * r;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  halo = new THREE.Points(g, new THREE.PointsMaterial({
    color: new THREE.Color().setHSL(hue, 0.85, 0.70),
    size: 0.035 + 0.06 * shape.aura, transparent: true,
    opacity: 0.12 + 0.75 * shape.aura, sizeAttenuation: true,
    blending: THREE.AdditiveBlending, depthWrite: false }));
  group.add(halo);
}
