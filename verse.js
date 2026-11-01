/* 🔥 Ace · 2026-10-25 · THE SPINE — one derivation, one reader, one truth.
 *
 * WHY THIS FILE EXISTS. MEASURED 2026-10-25: hall3d.html contains ZERO `fetch`, ZERO `/api/`, ZERO
 * `claims` — the flagship 3D world could not see one row of the world's memory. Every page that needed
 * the chain re-implemented its own reader (or had none), so the pages could not disagree only because
 * they never spoke. This module is the single reader they all share, and the single derivation.
 *
 * THE LAW IT CARRIES (verbatim from the vessel, scripts/world_seed.py:54 and player_config.py:49-71):
 *
 *     seed  = sha256( "<parent_seed>:<kind>:<name>" )      the ONLY door a seed is born through
 *     unit  = int( digest[2i:2i+2], 16 ) / 256             one byte -> [0,1)
 *     sigil = seed[:6]                                      the address: urn:0z:self:<sigil>
 *     planet = mutate( mutate( genesis, "star", "one" ), "planet", "verse-1" )
 *
 * The sha256 below is written in the page on purpose (no crypto.subtle, which is async, and no
 * dependency): a body that must be derived synchronously can still be derived by a stranger with any
 * SHA-256 tool. `verifyPlanet()` re-derives the planet from the genesis ON EVERY LOAD — if it ever
 * fails, the page says NOT_PROVED instead of drawing a world on top of a broken root.
 *
 * THE ONE RULE: NO DESTINATION WITHOUT A ROW. `can(sigil, place)` is the gate's law (see LD in
 * docs/VISION.md). A place is reachable if it is public, or if the face carries a claim row.
 */

/* ── SHA-256, pure, synchronous ─────────────────────────────────────────────────────────────────── */
const K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

function utf8(s) {
  const out = [];
  for (let i = 0; i < s.length; i++) {
    let c = s.codePointAt(i);
    if (c > 0xffff) i++;
    if (c < 0x80) out.push(c);
    else if (c < 0x800) out.push(0xc0 | (c >> 6), 0x80 | (c & 63));
    else if (c < 0x10000) out.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
    else out.push(0xf0 | (c >> 18), 0x80 | ((c >> 12) & 63), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
  }
  return Uint8Array.from(out);
}

export function sha256(text) {
  const msg = utf8(String(text));
  const bitLen = msg.length * 8;
  const withPad = new Uint8Array((((msg.length + 9) >> 6) + 1) << 6);
  withPad.set(msg);
  withPad[msg.length] = 0x80;
  const dv = new DataView(withPad.buffer);
  dv.setUint32(withPad.length - 4, bitLen >>> 0);
  dv.setUint32(withPad.length - 8, Math.floor(bitLen / 4294967296));
  let h0 = 0x6a09e667, h1 = 0xbb67ae85, h2 = 0x3c6ef372, h3 = 0xa54ff53a;
  let h4 = 0x510e527f, h5 = 0x9b05688c, h6 = 0x1f83d9ab, h7 = 0x5be0cd19;
  const w = new Uint32Array(64);
  const rotr = (x, n) => (x >>> n) | (x << (32 - n));
  for (let off = 0; off < withPad.length; off += 64) {
    for (let i = 0; i < 16; i++) w[i] = dv.getUint32(off + i * 4);
    for (let i = 16; i < 64; i++) {
      const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3);
      const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
    }
    let a = h0, b = h1, c = h2, d = h3, e = h4, f = h5, g = h6, h = h7;
    for (let i = 0; i < 64; i++) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ (~e & g);
      const t1 = (h + S1 + ch + K[i] + w[i]) >>> 0;
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const t2 = (S0 + maj) >>> 0;
      h = g; g = f; f = e; e = (d + t1) >>> 0;
      d = c; c = b; b = a; a = (t1 + t2) >>> 0;
    }
    h0 = (h0 + a) >>> 0; h1 = (h1 + b) >>> 0; h2 = (h2 + c) >>> 0; h3 = (h3 + d) >>> 0;
    h4 = (h4 + e) >>> 0; h5 = (h5 + f) >>> 0; h6 = (h6 + g) >>> 0; h7 = (h7 + h) >>> 0;
  }
  return [h0, h1, h2, h3, h4, h5, h6, h7].map(x => x.toString(16).padStart(8, '0')).join('');
}

/* ── THE ONLY DOOR a seed is born through (world_seed.py:54) ───────────────────────────────────── */
export function mutate(parentSeed, kind, name) {
  return sha256(`${parentSeed}:${kind}:${name}`);
}
export function unit(digest, i) {
  return parseInt(digest.slice(2 * i, 2 * i + 2), 16) / 256;
}

/* ── THE FACE: same chain + same name -> same body, for ever (player_config.py:49) ─────────────── */
export function derive(name, seed = null) {
  const ps = V.planet && V.planet.seed;
  if (!ps) return null;                        /* no genesis -> nothing can be born. NOT_PROVED. */
  const s = seed || mutate(ps, 'player', name);
  return {
    seed: s,
    sigil: s.slice(0, 6),
    urn: 'urn:0z:self:' + s.slice(0, 6),
    hue: Math.floor(unit(s, 0) * 360),
    height_cm: Math.floor(120 + unit(s, 1) * 110),
    build: Math.round((0.75 + unit(s, 2) * 0.9) * 100) / 100,
    voice_pitch: Math.round((0.8 + unit(s, 3) * 0.7) * 100) / 100,
    gait: Math.round((0.85 + unit(s, 4) * 0.5) * 100) / 100,
    aura: Math.round(unit(s, 5) * 1000) / 1000,
  };
}

/* ── THE SEAL: first(lower) + MIDDLE(upper) + last(lower) — docs/SEALS.md:10 ───────────────────── */
export function seal(word) {
  const w = String(word || '').replace(/[^\p{L}\p{N}]/gu, '');
  if (w.length < 3) return '';
  /* THE UNIT IS THREE (SEALS.md:30): a word of 3n letters is cut into three equal parts and each part
     is sealed — `reptilian` -> .:rEp:.:tIl:.:iAn:. measured in the doc. The generalisation to 12, 15…
     follows the same rule (three equal parts), and is declared as an EXTENSION, not as measured. */
  if (w.length >= 9 && w.length % 3 === 0) {
    const n = w.length / 3;
    const parts = [w.slice(0, n), w.slice(n, 2 * n), w.slice(2 * n)];
    return parts.map(sealOne).join('');
  }
  return sealOne(w);
}

function sealOne(w) {
  const mid = w[Math.floor((w.length - 1) / 2)];
  return `.:${w[0].toLowerCase()}${mid.toUpperCase()}${w[w.length - 1].toLowerCase()}:.`;
}

/* ── THE STATE ──────────────────────────────────────────────────────────────────────────────────── */
export const V = {
  schema: null, at: null, planet: null, crew: [], places: [], chain: [], claims: [],
  source: 'offline', loaded: false,
};

function getJSON(url) {
  if (typeof fetch !== 'function') return Promise.resolve(null);
  return fetch(url, { cache: 'no-store' }).then(r => (r.ok ? r.json() : null)).catch(() => null);
}

/** Load the world. Order: verse.json (generated by the vessel) -> claims.jsonl (the chain's own rows). */
export async function load(base = '') {
  const v = await getJSON(base + 'verse.json');
  if (v) {
    V.schema = v.schema; V.at = v.at; V.planet = v.planet || null;
    V.crew = v.crew || []; V.places = v.places || []; V.chain = v.chain || [];
    V.source = 'verse.json';
  }
  const claims = await fetch(base + 'claims.jsonl', { cache: 'no-store' })
    .then(r => (r.ok ? r.text() : '')).catch(() => '');
  if (claims && claims.trim()) {
    V.claims = claims.trim().split('\n').map(l => {
      try { return JSON.parse(l); } catch (e) { return null; }
    }).filter(Boolean);
    V.source = V.source === 'verse.json' ? 'verse.json+claims' : 'claims';
  }
  V.loaded = true;
  return V;
}

/** The planet re-derives from the genesis, or the page must not draw a world. */
export function verifyPlanet() {
  if (!V.planet || !V.planet.seed || !V.planet.genesis) {
    return { ok: false, why: 'no genesis in verse.json' };
  }
  const star = mutate(V.planet.genesis, 'star', V.planet.star || 'one');
  const planet = mutate(star, 'planet', V.planet.planet || 'verse-1');
  return { ok: planet === V.planet.seed, computed: planet, declared: V.planet.seed };
}

/** chain | offline — and every page MUST print which. Never a pretty lie. */
export function status() {
  if (!V.loaded) return 'loading';
  return V.planet && V.planet.seed ? 'chain' : 'offline';
}

export function places(filter = null) {
  return filter ? V.places.filter(p => p.kind === filter || p.scope === filter) : V.places;
}
export function place(id) {
  return V.places.find(p => p.id === id) || null;
}
export function officer(stable) {
  return V.crew.find(c => c.stable === stable) || null;
}

/** THE GATE'S LAW: no destination without a row. */
export function can(sigil, p) {
  if (!p) return { ok: false, why: 'E_NO_PLACE' };
  if (p.door === false) return { ok: false, why: 'E_LOCKED' };
  if (p.public) return { ok: true, why: 'public' };
  if (p.owner && sigil && p.owner === sigil) return { ok: true, why: 'owner' };
  const row = (V.claims || []).find(r => r.place === p.id || r.plot === p.id);
  if (row) return { ok: true, why: 'claim', row };
  return { ok: false, why: 'E_NO_ROW' };
}

/** The last N rows the world shows on its board — the world's news IS the record. */
export function board(n = 7) {
  const rows = (V.claims && V.claims.length ? V.claims : V.chain) || [];
  return rows.slice(-n).reverse();
}

/** Remember the face on THIS browser only — never on the chain (style is not identity). */
export function remember(name) {
  try { if (typeof localStorage !== 'undefined') localStorage.setItem('0z.face', name); } catch (e) {}
  return name;
}
export function remembered() {
  try { return (typeof localStorage !== 'undefined' && localStorage.getItem('0z.face')) || ''; }
  catch (e) { return ''; }
}

// 🔥 Ace · 2026-10-25
