/* 🔥 Ace · 2026-10-25 · THE ARCHITECTURE LIBRARY — modular pieces, so a city composes instead of being drawn.
 *
 * WHY THIS FILE EXISTS. The captain, looking at the first street: *"dont make like 10 times the same
 * house bro ,, i want each assets and entity to be unique"* — and the method: *"make some modualr pieces,,
 * that you keep in a archi lib,, so you can compose cities faster and faster, modularly"*. The references
 * are Kowloon density + favela colour: PASTELS and ANTHRACITE, never neon.
 *
 * THE RULE OF THIS LIBRARY: every piece is a FUNCTION of a seed, and no piece decides its own colour.
 * A house is not authored — it is COMPOSED: floors, setback, balcony rhythm, shutter state, the number
 * of AC units, the pipes, the cables, the laundry, the roof tank, the antenna. Two houses from two seeds
 * cannot be the same, and the same seed always gives the same house (so a city can be re-derived, like
 * everything else in this world).
 *
 * VOLUME 1 PIECES: plinth · floorBand · wallPanel · window · shutter · balcony · rail · ac · pipe ·
 * drain · cable · laundry · awning · tank · antenna · stair · planter · tree · lamp. Everything is
 * primitives: no textures, no assets, nothing that has to be stored — the whole library is code.
 */

/* ── THE PALETTE. Anthracite carries the city; pastels are its patches. NOT neon: saturation stays under
   .45 and lightness between .28 and .72, which is what makes a shophouse read as paint, not as a light. */
export const PALETTE = {
  anthracite: [0x30343b, 0x363a42, 0x3d414a, 0x44484f],
  plaster: [0xd9a7a0, 0xe3c08a, 0xa9c0b0, 0x9db4cf, 0xc7a8bd, 0xd6ccb2, 0xb0bd9a, 0xdfae86,
            0x8fa8a0, 0xcfaeae],
  trim: [0x1d1f24, 0x2a2c31, 0x3d4046],
  wood: [0x6a4a2e, 0x7a5433, 0x5a3f28],
  metal: [0x8c939a, 0x7d848b],
  glow: 0xffca7a,
};

/* ── SEEDED RANDOM. mulberry32 over a string hash: deterministic, tiny, and the same in every browser. */
export function hash32(s) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  return h >>> 0;
}
export function rng(seed) {
  let a = hash32(String(seed)) || 1;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const pick = (r, arr) => arr[Math.floor(r() * arr.length) % arr.length];

/* ── THE MATERIALS. One material per colour, cached: ten houses must not create three hundred materials. */
export function makeLibrary(THREE) {
  const cache = new Map();
  const mat = (hex, opts = {}) => {
    const key = hex + JSON.stringify(opts);
    if (!cache.has(key)) {
      cache.set(key, new THREE.MeshStandardMaterial({
        color: hex, roughness: opts.roughness ?? 0.92, metalness: opts.metalness ?? 0.02,
        emissive: opts.emissive ?? 0x000000, emissiveIntensity: opts.emissiveIntensity ?? 0,
      }));
    }
    return cache.get(key);
  };
  return { mat, cache };
}

/* ── THE COMPOSER. A house is COMPOSED from its seed: floors, setback, balcony rhythm, shutters, the
   number of AC units, the pipes, the wires, the laundry, the tank on the roof. Nothing is authored twice,
   and the same seed always gives the same house — so a city can be re-derived, like everything else here.
   The door opening is a HOLE in the ground floor (two side panels + a lintel), because a door you can walk
   through must be a hole and not a picture of one. */
export function composeHouse(THREE, opts) {
  const { seed, front = [7, 5.2, 6], lit = "warm", door = [1.9, 3.2] } = opts || {};
  const r = rng(seed);
  const { mat } = makeLibrary(THREE);
  const P = pieces(THREE);
  const g = new THREE.Group();
  const [Fw, , Fd] = front;
  const [dw, dh] = door;

  const w = Fw * (0.94 + r() * 0.28);
  const d = Fd * (0.9 + r() * 0.24);
  const floors = 2 + Math.floor(r() * 4);              /* 2..5 */
  const fh = 2.55 + r() * 0.45;
  const H = floors * fh + 0.4;

  /* the colour: plaster most of the time, anthracite sometimes. Pastel, never neon. */
  const bodyHex = r() < 0.74
    ? PALETTE.plaster[Math.floor(r() * PALETTE.plaster.length)]
    : PALETTE.anthracite[Math.floor(r() * PALETTE.anthracite.length)];
  const trimHex = PALETTE.trim[Math.floor(r() * PALETTE.trim.length)];
  const bodyMat = mat(bodyHex);
  const trimMat = mat(trimHex);
  const metalMat = mat(PALETTE.metal[Math.floor(r() * PALETTE.metal.length)], { metalness: 0.55, roughness: 0.5 });
  const woodMat = mat(PALETTE.wood[Math.floor(r() * PALETTE.wood.length)], { roughness: 0.95 });
  const glassLit = mat(0x1a1610, { emissive: PALETTE.glow, emissiveIntensity: lit === "dark" ? 0.03 : 1.25,
                                    roughness: 0.4 });
  const glassDark = mat(0x14181e, { roughness: 0.35, metalness: 0.25 });

  const add = (m, x, y, z) => { m.position.set(x, y, z); g.add(m); return m; };
  const B = (bw, bh, bd, m) => {
    const x = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, bd), m);
    x.castShadow = true; x.receiveShadow = true; return x;
  };

  /* THE PLINTH */
  add(B(w + 0.45, 0.4, d + 0.45, trimMat), 0, 0.2, 0);

  /* THE GROUND FLOOR IS A FRAME, so the door is a HOLE */
  const side = (w - dw) / 2;
  add(B(side, fh, d, bodyMat), -(dw + side) / 2, fh / 2 + 0.4, 0);
  add(B(side, fh, d, bodyMat), (dw + side) / 2, fh / 2 + 0.4, 0);
  add(B(dw, fh - dh, d, bodyMat), 0, dh + 0.4 + (fh - dh) / 2, 0);
  add(B(dw + 0.28, dh + 0.2, 0.34, trimMat), 0, (dh + 0.2) / 2 + 0.4, d / 2 - 0.16);

  /* steps: two stones, because a door flush on the ground looks pasted on */
  add(B(dw + 0.5, 0.16, 0.5, trimMat), 0, 0.48, d / 2 + 0.22);
  add(B(dw + 0.7, 0.16, 0.4, trimMat), 0, 0.33, d / 2 + 0.5);

  /* THE FLOORS ABOVE */
  for (let f = 1; f < floors; f++) {
    const y0 = 0.4 + f * fh;
    const shrink = (r() < 0.4) ? 0.35 + r() * 0.5 : 0;   /* setback = a stack that grew over time */
    const bw = w - shrink * 2;
    add(B(bw, fh, d - shrink, bodyMat), 0, y0 + fh / 2, -shrink / 2);
    add(B(bw + 0.18, 0.14, d - shrink + 0.18, trimMat), 0, y0, -shrink / 2);

    const n = 1 + Math.floor(r() * 3);
    for (let i = 0; i < n; i++) {
      const wx = n === 1 ? 0 : (-bw / 2 + 0.9 + i * ((bw - 1.8) / (n - 1 || 1)));
      const ww = 0.62 + r() * 0.5, wh = 1.0 + r() * 0.35;
      const win = P.window(THREE, trimMat, (r() < (lit === "dark" ? 0.25 : 0.62)) ? glassLit : glassDark,
                           ww, wh);
      add(win, wx, y0 + fh * 0.55, (d - shrink) / 2 + 0.04);
      if (r() < 0.5) {
        for (const s of [-1, 1]) {
          add(B(0.18, wh, 0.05, woodMat), wx + s * (ww / 2 + 0.14), y0 + fh * 0.55, (d - shrink) / 2 + 0.07);
        }
      }
      if (r() < 0.62) {
        const ac = P.ac(metalMat);
        add(ac, wx + (r() < 0.5 ? 0.55 : -0.55), y0 + fh * 0.32, (d - shrink) / 2 + 0.18);
      }
    }

    if (r() < 0.66) {
      const wide = Math.min(bw * 0.92, 3.4);
      add(P.balcony(THREE, trimMat, wide, 1.15), 0, y0 + 0.22, (d - shrink) / 2 + 0.55);
      if (r() < 0.55) {
        add(P.laundry(THREE, PALETTE.plaster, 2 + Math.floor(r() * 3)),
            -wide * 0.2 + r() * 0.6, y0 + 0.75, (d - shrink) / 2 + 0.85);
      }
    }
  }

  /* THE PIPES: on an edge, never in the middle (nobody builds a pipe through a window) */
  const pipeH = H - 0.6;
  add(P.pipe(THREE, metalMat, pipeH, 0.055), (r() < 0.5 ? -1 : 1) * (w / 2 - 0.22), 0.4 + pipeH / 2, d / 2 + 0.12);
  if (r() < 0.5) {
    add(P.pipe(THREE, metalMat, pipeH * 0.7, 0.04), -(w / 2 - 0.5), 0.4 + pipeH * 0.35, d / 2 + 0.1);
  }

  /* THE ROOF: a parapet, and the skyline's own furniture */
  const top = 0.4 + floors * fh;
  for (const [px, pz, pw, pd] of [[0, -d / 2 + 0.1, w, 0.2], [0, d / 2 - 0.1, w, 0.2],
                                   [-w / 2 + 0.1, 0, 0.2, d], [w / 2 - 0.1, 0, 0.2, d]]) {
    add(B(pw, 0.45, pd, trimMat), px, top + 0.22, pz);
  }
  if (r() < 0.5) add(P.tank(THREE, metalMat), (r() - 0.5) * (w * 0.4), top + 0.9, (r() - 0.5) * d * 0.4);
  if (r() < 0.65) add(P.antenna(THREE, metalMat), (r() - 0.5) * (w * 0.5), top + 0.4, (r() - 0.5) * d * 0.4);

  /* THE WIRES: a dense city's sky is mostly cables */
  const wireMat = mat(0x14161a, { roughness: 0.9 });
  const nWire = 1 + Math.floor(r() * 3);
  for (let i = 0; i < nWire; i++) {
    const a = new THREE.Vector3(-w / 2 - 0.6, top - 0.6 - r() * 1.2, (r() - 0.5) * d);
    const b = new THREE.Vector3(w / 2 + 0.6, top - 1.0 - r() * 1.4, (r() - 0.5) * d);
    g.add(P.cable(THREE, wireMat, a, b, 0.5 + r() * 0.6));
  }

  /* THE STREET EDGE: a planter or a tree, so the architecture meets the ground */
  if (r() < 0.75) {
    const leaf = mat(0x2f4a33, { roughness: 1 });
    const leaf2 = mat(0x3b5a3c, { roughness: 1 });
    const potMat = mat(0x5a4030, { roughness: 1 });
    if (r() < 0.55) {
      add(P.tree(THREE, woodMat, [leaf, leaf2], 0.85 + r() * 0.5),
          (r() < 0.5 ? -1 : 1) * (w / 2 + 1.1), 0, d / 2 - 0.4);
    } else {
      add(P.planter(THREE, potMat, leaf, 0.9 + r() * 0.4),
          (r() < 0.5 ? -1 : 1) * (dw / 2 + 0.8), 0.4, d / 2 + 0.55);
    }
  }

  return { group: g, w, h: top + 0.45, d, doorZ: d / 2, doorW: dw, doorH: dh };
}


export function pieces(THREE) {
  const box = (w, h, d, m) => { const x = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
    x.castShadow = true; x.receiveShadow = true; return x; };

  return {
    /* an air conditioner: the single prop that says "people live stacked on top of each other" */
    ac(m) {
      const g = new THREE.Group();
      const body = box(0.52, 0.34, 0.26, m); g.add(body);
      const fan = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.035, 6, 14), m);
      fan.position.z = 0.135; g.add(fan);
      const bracket = box(0.5, 0.04, 0.2, m); bracket.position.y = -0.19; g.add(bracket);
      return g;
    },
    /* a window: dark glass, or lit — the lamp state is passed in, never invented here */
    window(THREE, m, litMat, w, h) {
      const g = new THREE.Group();
      const frame = box(w + 0.1, h + 0.1, 0.06, m); g.add(frame);
      const glass = new THREE.Mesh(new THREE.PlaneGeometry(w, h), litMat || m);
      glass.position.z = 0.04; g.add(glass);
      const bar = box(0.035, h, 0.02, m); bar.position.z = 0.06; g.add(bar);
      return g;
    },
    /* a balcony: a slab and three rails. Cheap, and it is the whole silhouette of a favela tower. */
    balcony(THREE, m, wide, deep) {
      const g = new THREE.Group();
      const slab = box(wide, 0.09, deep, m); g.add(slab);
      const railTop = box(wide, 0.04, 0.04, m); railTop.position.set(0, 0.46, deep / 2 - 0.02); g.add(railTop);
      for (let i = -3; i <= 3; i++) {
        const post = box(0.03, 0.46, 0.03, m);
        post.position.set(i * (wide / 7), 0.23, deep / 2 - 0.02);
        g.add(post);
      }
      const side = box(0.04, 0.04, deep, m); side.position.set(wide / 2 - 0.02, 0.46, 0); g.add(side);
      return g;
    },
    /* the vertical pipe that every dense city has, and nobody draws */
    pipe(THREE, m, h, r0) {
      const p = new THREE.Mesh(new THREE.CylinderGeometry(r0, r0, h, 6), m);
      p.castShadow = true; return p;
    },
    /* cables: a real curve, because a city's sky is mostly wires */
    cable(THREE, m, a, b, sag) {
      const mid = a.clone().add(b).multiplyScalar(0.5); mid.y -= sag;
      const curve = new THREE.CatmullRomCurve3([a, mid, b]);
      return new THREE.Mesh(new THREE.TubeGeometry(curve, 12, 0.012, 4, false), m);
    },
    /* laundry: the tell that a balcony is used and not decoration */
    laundry(THREE, colors, count) {
      const g = new THREE.Group();
      for (let i = 0; i < count; i++) {
        const c = colors[Math.floor(Math.random() * colors.length)];
        const cloth = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.34),
          new THREE.MeshStandardMaterial({ color: c, roughness: 1, side: THREE.DoubleSide }));
        cloth.position.set(-0.6 + i * 0.4, -0.2, 0);
        g.add(cloth);
      }
      return g;
    },
    /* the rooftop tank: a cylinder and a cone, and the skyline stops being rectangles */
    tank(THREE, m) {
      const g = new THREE.Group();
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.8, 12), m);
      body.castShadow = true; g.add(body);
      const cap = new THREE.Mesh(new THREE.ConeGeometry(0.44, 0.22, 12), m);
      cap.position.y = 0.5; g.add(cap);
      for (const s of [-1, 1]) {
        const leg = box(0.06, 0.35, 0.06, m); leg.position.set(s * 0.26, -0.55, 0); g.add(leg);
      }
      return g;
    },
    antenna(THREE, m) {
      const g = new THREE.Group();
      const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.5, 5), m);
      mast.position.y = 0.75; g.add(mast);
      for (const y of [1.1, 1.35]) {
        const bar = box(0.36, 0.02, 0.02, m); bar.position.y = y; g.add(bar);
      }
      return g;
    },
    /* a tree: trunk + two canopies. Three cones would read as a Christmas tree; these are lumps. */
    tree(THREE, trunkMat, leafMats, scale = 1) {
      const g = new THREE.Group();
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.13 * scale, 0.2 * scale, 1.5 * scale, 7),
        trunkMat);
      trunk.position.y = 0.75 * scale; trunk.castShadow = true; g.add(trunk);
      const a = leafMats[0], b = leafMats[1] || leafMats[0];
      const c1 = new THREE.Mesh(new THREE.SphereGeometry(1.0 * scale, 9, 7), a);
      c1.position.y = 1.9 * scale; c1.scale.set(1, 0.78, 1); c1.castShadow = true; g.add(c1);
      const c2 = new THREE.Mesh(new THREE.SphereGeometry(0.72 * scale, 8, 6), b);
      c2.position.set(0.45 * scale, 2.45 * scale, -0.2 * scale); c2.castShadow = true; g.add(c2);
      return g;
    },
    planter(THREE, potMat, leafMat, scale = 1) {
      const g = new THREE.Group();
      const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.26 * scale, 0.2 * scale, 0.34 * scale, 8), potMat);
      pot.position.y = 0.17 * scale; pot.castShadow = true; g.add(pot);
      const bush = new THREE.Mesh(new THREE.SphereGeometry(0.32 * scale, 8, 6), leafMat);
      bush.position.y = 0.52 * scale; bush.scale.set(1, 0.8, 1); g.add(bush);
      return g;
    },
  };
}

// 🔥 Ace · 2026-10-25
