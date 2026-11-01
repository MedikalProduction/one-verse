/* 🔥 Ace · 2026-10-28 · THE BOAT ATELIER — THE DERIVATION. Pure: no THREE, no DOM, runs under plain node.
 *
 * WHY THIS FILE EXISTS. The captain (2026-10-28): *"i want to build a real boat in real life,, but woul
 * want an app so i can visualise each part and assembly"* · then *"i want to be procedural also,, so lets
 * say i prompt a full boat,, i want to be able to select each part individually .. to move them or
 * replace"* · and *"we could even use dna seed in the boat atelier"*.
 *
 * THE LAW THIS FILE OBEYS (archi.js, 2026-10-25): every piece is a FUNCTION of a seed, and the same seed
 * always gives the same boat. So a prompt is not a request to a model -- it is a NAME, and the boat is
 * DERIVED from it. Same words, same boat, forever; different words, a different boat. Nothing here is
 * random at run time: mulberry32 is seeded from an FNV hash of the prompt, as in archi.js.
 *
 * UNITS: MILLIMETRES. Not world units, not taste. A real boat is built from 6 mm ply and 2440 x 1220
 * sheets, so the numbers a person cuts to are the numbers this file produces. `urn` is the boat's
 * address (6 hex of the seed), so a design can be cited, re-derived and compared.
 *
 * WHAT THIS FILE IS NOT: a naval architecture certificate. `float` below is an ESTIMATE and says how it
 * was made (a section coefficient read from the deadrise, integrated by trapezoid over the stations).
 * It has no metacentric height, no heel test, no wave model. `warnings` carries that limit into the UI
 * rather than hiding it behind a confident-looking number.
 */

/* ── THE SEED. FNV-1a over the prompt, then mulberry32 -- the exact pair archi.js already uses, so a name
   means the same thing in the city and on the water. */
export function hash32(s) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  return h >>> 0;
}
export function rng(seed) {
  let a = (typeof seed === "number" ? seed : hash32(String(seed))) || 1;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ── THE THREE FAMILIES. These are the hulls to COMPARE before any wood is bought. Each is a real,
   buildable type at a real size, and each differs in what decides its shape, not only in its numbers:
     * skiff    -- stitch & glue plywood, flat/vee bottom, outboard. The classic first boat: cheap,
                   fast to build, honest, and it teaches the fillet.
     * canoe    -- narrow, high rocker, paddle first. The same ply, half the beam, a shape that lives
                   or dies on the rocker and the sheer line.
     * dayboat  -- bigger, deeper, trailerable, an option for a small cabin later. Where the numbers
                   start to matter more than the looks (draft, freeboard, payload). */
export const kFamilies = Object.freeze({
  skiff:   { label: "skiff · stitch & glue", loa: 4200, beam: 1520, depth: 500, draft: 140,
             deadrise: 12, rocker: 45, sheer: 70, stations: 9,  ply: 6, motor_kg: 27, rig: "none" },
  canoe:   { label: "canoe · pirogue",       loa: 4200, beam: 840,  depth: 380, draft: 100,
             deadrise: 16, rocker: 95, sheer: 60, stations: 9,  ply: 4, motor_kg: 0, rig: "none" },
  dayboat: { label: "dayboat · small cabin", loa: 5500, beam: 2100, depth: 800, draft: 330,
             deadrise: 18, rocker: 35, sheer: 110, stations: 11, ply: 9, motor_kg: 90, rig: "none" },
  /* THE SHIP. The captain's sheet (2026-10-28) is a two-masted hull with a real rig, so this family carries
     one: `rig: "square"` is what makes buildParts() add the masts, the courses, the ratlines, the deck, the
     rail, the wheel, the anchor and the guns. A word is enough to summon her. */
  ship:    { label: "ship · two-masted",     loa: 14000, beam: 4200, depth: 1800, draft: 900,
             deadrise: 20, rocker: 60, sheer: 220, stations: 13, ply: 12, motor_kg: 0, rig: "square" },
});
export const kFamilyNames = Object.keys(kFamilies);

/* ── THE PLAN SHAPE. Half-beam and depth against station t (0 = transom, 1 = stem), as CONTROL POINTS
   rather than a formula, because a hull is drawn, then lofted. `taper` is the half-beam factor and
   `lift` is the sheer rise; both are laws of the type, so a scale-up cannot change the silhouette. */
const kTaper = [[0, 0.86], [0.18, 0.97], [0.5, 1.0], [0.68, 0.93], [0.84, 0.72], [0.94, 0.45], [1, 0.10]];
function lerpTable(t, table) {
  const x = Math.min(1, Math.max(0, t));
  for (let i = 1; i < table.length; i++) {
    const [x0, y0] = table[i - 1], [x1, y1] = table[i];
    if (x <= x1) return y0 + (y1 - y0) * ((x - x0) / (x1 - x0 || 1));
  }
  return table[table.length - 1][1];
}
const mm10 = (v) => Math.round(v / 10) * 10;      // every dimension lands on a centimetre grid
const hex6 = (n) => (n >>> 0).toString(16).padStart(8, "0").slice(0, 6);


/* ── THE SPARK TREE. The captain (2026-10-28): *"a seed needs to be unique and generate a big ass complex ship,
   with a huge entity part branch tree -- even one word should be able to multiply into multiple sparks"*.
   So a prompt is not ONE seed: it is a ROOT that spawns a branch seed per department, and each branch seed is
   its own deterministic urn. One word, eight sparks, one boat -- and the same word always grows the same tree.
   The branches are ordered, so a part can cite the branch that authored it: `hull`, `planking`, `frame`,
   `deck`, `rig`, `outfit`, `guns`, `finish`. */
export const kBranchNames = Object.freeze(["hull", "planking", "frame", "deck", "rig", "outfit", "guns", "finish"]);

export function sparkTree(prompt) {
  const root = hash32(String(prompt).toLowerCase().trim());
  const branches = kBranchNames.map((name, i) => {
    const seed = hash32(root + "|" + name + "|" + i);
    return { name, i, seed, urn: hex6(seed) };
  });
  return { prompt: String(prompt), root, urn: hex6(hash32(root + ":urn")), branches,
           count: branches.length };
}
/* ── THE SPEC. A family gives the laws; the PROMPT gives the variation. The jitter is ±4 %, on a
   centimetre grid, so two names can never produce the same boat and no name can produce a silly one. */
export function deriveSpec(prompt, familyName) {
  const fam = kFamilies[familyName];
  if (!fam) throw new Error("unknown family: " + familyName);
  const seed = hash32(String(prompt).toLowerCase().trim() + "|" + familyName);
  const r = rng(seed);
  const jit = (v, amt = 0.04) => mm10(v * (1 + (r() * 2 - 1) * amt));

  const loa = jit(fam.loa);
  const beam = jit(fam.beam);
  const depth = jit(fam.depth);
  const draft = jit(fam.draft);
  const rocker = jit(fam.rocker, 0.18);
  const deadrise = Math.round((fam.deadrise + (r() * 2 - 1) * 2) * 10) / 10;
  const sheer = Math.round(fam.sheer * (1 + (r() * 2 - 1) * 0.12));

  const spec = {
    prompt: String(prompt), family: familyName, label: fam.label, seed, urn: hex6(hash32(seed + ":urn")),
    loa, beam, depth, draft, rocker, deadrise, sheer, ply: fam.ply, motor_kg: fam.motor_kg,
    rig: fam.rig || "none",
    stations: fam.stations,
    /* the chine: how much of the half-beam the bottom keeps before it turns up to the sheer. A flat
       bottom keeps most of it; a deep vee gives it away -- this ONE factor is what makes a vee-bow read
       as a vee and not as a box with a triangle glued on. */
    chineFrac: +(0.88 - deadrise * 0.012).toFixed(3),
    kSection: +(0.95 - deadrise * 0.01).toFixed(3),
    mass_density_ply: 700,      // kg/m3, marine ply (okoume ~480, sapele ~700: stay on the honest side)
    mass_density_timber: 650,   // kg/m3, softwood framing
    resin_kg_m2: 1.6,           // epoxy + glass + fillets per m2 of ply, a build-site figure
  };
  spec.sections = buildSections(spec);
  return spec;
}

/* ── THE STATIONS. Every part placed later is placed by STATION, so moving a frame moves it along a hull
   that already exists -- the same discipline as procShip's named parts and typed mates: nothing floats. */
export function buildSections(spec) {
  const n = spec.stations;
  const out = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;                                  // 0 = transom, 1 = stem
    const hb = (spec.beam / 2) * lerpTable(t, kTaper);
    const depthT = spec.depth * (0.94 + 0.10 * t);     // the sheer rises forward
    const keelY = -spec.draft + spec.rocker * t * t;   // rocker lifts the forefoot
    out.push({
      i, t,
      z: mm10(-spec.loa / 2 + t * spec.loa),
      hb: mm10(hb),
      keelY: mm10(keelY),
      chineY: mm10(keelY + Math.tan((spec.deadrise * Math.PI) / 180) * (hb * spec.chineFrac)),
      sheerY: mm10(keelY + depthT),
      chineX: mm10(hb * spec.chineFrac),
    });
  }
  return out;
}

/* ── THE WATER. Volume below the design waterline, integrated by trapezoid over the stations, with the
   section coefficient read from the deadrise and STATED. No metacentre, no heel, no waves: a first
   estimate to stop a boat being drawn that cannot carry its own motor -- not a survey. */
export function floatOf(spec, parts) {
  const S = spec.sections;
  let v = 0;                                          // mm2 * mm, accumulated as mm3
  for (let i = 1; i < S.length; i++) {
    const a = S[i - 1], b = S[i];
    const Ta = Math.max(0, -a.keelY), Tb = Math.max(0, -b.keelY);   // immersion at each station
    const Aa = 2 * a.hb * Ta * spec.kSection;
    const Ab = 2 * b.hb * Tb * spec.kSection;
    v += ((Aa + Ab) / 2) * Math.abs(b.z - a.z);
  }
  const m3 = v / 1e9;
  const displace = m3 * 1000;                         // fresh water, kg
  const mass = massOf(spec, parts);
  const payload = displace - mass.total;
  const freeboard = spec.depth - spec.draft;

  const warnings = [];
  warnings.push(
    "ESTIMATE: volume by trapezoid over " + spec.stations + " stations, section coefficient " +
    spec.kSection + " read from " + spec.deadrise + " deg deadrise. No GM, no heel test, no wave model."
  );
  if (freeboard < 200) warnings.push("freeboard " + freeboard + " mm is low: a chop comes over the gunwale");
  if (payload < 120) warnings.push("payload " + Math.round(payload) + " kg: the design waterline is optimistic");
  if (payload < 0) warnings.push("NEGATIVE payload — she floats at or below her own lines: not buildable as drawn");
  if (spec.loa < 2400) warnings.push("under 2.4 m: too small for a person plus gear on open water");

  return {
    volume_m3: +m3.toFixed(3),
    displace_kg: Math.round(displace),
    mass_kg: Math.round(mass.total),
    hull_kg: Math.round(mass.hull),
    motor_kg: spec.motor_kg,
    payload_kg: Math.round(payload),
    freeboard_mm: Math.round(freeboard),
    kSection: spec.kSection,
    warnings,
  };
}

/* ── THE MASS. Derived, not declared: a panel weighs area x thickness x ply density; a timber part weighs
   its own volume; resin is a stated rate per m2 of ply. Change a dimension and the weight follows --
   which is the only way the float number can be trusted at all. */
export function massOf(spec, parts) {
  let hull = 0, plyArea = 0;
  for (const p of parts) {
    const area = (p.size[0] * p.size[2]) / 1e6;                       // m2 of the flat face
    const vol = (p.size[0] * p.size[1] * p.size[2]) / 1e9;            // m3
    /* SOME THINGS ARE BOUGHT BY MASS, NOT BY VOLUME. A sail is 6 m x 4 m x 20 mm laid flat, which as a box
       is 0.48 m3 of something -- but canvas weighs 18 kg, not 312. So a part may carry `kg` and be believed:
       a number the maker knows beats a volume the model invented. */
    if (typeof p.kg === "number") { hull += p.kg; continue; }
    if (p.kind === "panel") {                                         // `ref` is not bought, so not weighed
      plyArea += area;
      hull += area * (p.size[1] / 1000) * spec.mass_density_ply;
    } else if (p.kind !== "ref") {
      hull += vol * spec.mass_density_timber;
    }
  }
  hull += plyArea * spec.resin_kg_m2;
  return { hull, plyArea, total: hull + spec.motor_kg };
}

/* ── THE FIVE, AS AN INDEX (not an incantation). Alchemy's own glyphs, used for what they actually do:
   they CLASSIFY the bill of materials so a build reads at a glance. On a boat the mapping is exact and
   useful -- water is what meets the sea, earth is what keeps her down, air is what holds her up, fire is
   what pushes her, mercury is what joins her. Every part carries one, so the BOM can be totalled by
   element, which is a real question ("how much of this boat is binder?").
   NOTE: the (Ω, ω) trilogy is NOT defined here. The captain named the "trinity rule"
   (2026-10-28T20:10:57) but its definition is his; inventing a symbol system is the one thing this vessel
   refuses. The seam is marked SEAM-OMEGA and waits for his words. */
export const kElements = Object.freeze({
  water:   { glyph: "🜄", label: "water",   role: "meets the sea: planking, skin, anything wetted" },
  earth:   { glyph: "🜃", label: "earth",   role: "mass and ballast: keel, frames, what keeps her down" },
  air:     { glyph: "🜁", label: "air",     role: "the volume: buoyancy, deadrise, what holds her up" },
  fire:    { glyph: "🜂", label: "fire",    role: "the engine and its fuel" },
  mercury: { glyph: "☿", label: "mercury", role: "the binder: epoxy, glass, fasteners — what joins" },
});

/* ── THE PART TREE. This is the thing the captain asked to touch: *"i want to be able to select each part
   individually .. to move them or replace"*. Every part is a NAMED ROW: its own size in mm, its own
   material, its own element, and its own MATE (what it is fastened to). A part cannot float free -- its
   `mate` must name another part or a station, and scripts/test_boat.mjs checks that every mate resolves.
   Moving a part is `at`; replacing it is `size`/`material`; removing it is `gone`.
   FRAME: y = 0 is the DESIGN WATERLINE (negative is underwater), z = 0 is midship, x = 0 is the centreline. */
export function buildParts(spec) {
  const S = spec.sections, n = S.length - 1;
  const mid = S[Math.round(n * 0.5)];
  const keelY = -spec.draft;
  const parts = [];
  const add = (p) => parts.push(Object.assign({ rot: [0, 0, 0], gone: false }, p));

  /* THE REFERENCE SURFACE. Not a cut piece: the lofted skin the panels bend onto. Mass 0 -- the plywood
     that makes her IS the panels below, and counting both would weigh her twice. */
  add({ id: "hull", name: "hull skin (reference)", kind: "ref", el: "air", at: [0, 0, 0],
        size: [spec.beam, spec.depth + spec.draft, spec.loa], mate: "centreline",
        material: "—", note: "the loft: " + (n + 1) + " stations, deadrise " + spec.deadrise + "°" });

  /* THE PLANKING. Stitch-and-glue: one bottom, two sides, one transom. Each carries its FLAT CUT in `cut`
     (the rectangle laid out on the sheet) and its bent size in `size` -- two different numbers, because
     what you buy and what you bend are not the same shape. */
  add({ id: "bottom", name: "bottom panel", kind: "panel", el: "water", at: [0, keelY + spec.ply / 2, 0],
        size: [mid.hb * 2 * 0.94, spec.ply, spec.loa * 0.90], cut: [mid.hb * 2, spec.loa * 0.90],
        mate: "keel", material: "ply " + spec.ply + "mm + glass both sides" });
  for (const side of ["port", "stbd"]) {
    const sgn = side === "port" ? -1 : 1;
    add({ id: "side." + side, name: "side panel · " + side, kind: "panel", el: "water",
          at: [sgn * mid.hb * 0.97, keelY + spec.depth / 2, 0],
          size: [spec.ply, spec.depth * 1.06, spec.loa * 0.88],
          cut: [spec.depth * 1.15, spec.loa * 0.92], rot: [0, 0, sgn * 4],
          mate: "chine." + side, material: "ply " + spec.ply + "mm + glass both sides" });
  }
  add({ id: "transom", name: "transom", kind: "panel", el: "earth",
        at: [0, keelY + spec.depth * 0.46, -spec.loa / 2 + spec.ply / 2],
        size: [S[0].hb * 1.9, spec.depth * 0.92, spec.ply], cut: [S[0].hb * 1.9 + 40, spec.depth * 1.1],
        mate: "bottom", material: "ply " + spec.ply + "mm, doubled at the motor" });

  /* THE BACKBONE AND THE CHINES: earth. Small sections, long lengths -- what a hull is stiffened by. */
  add({ id: "keel", name: "keel batten", kind: "batten", el: "earth", at: [0, keelY - 15, 0],
        size: [60, 55, spec.loa * 0.84], mate: "bottom", material: "softwood 60 × 55" });
  for (const side of ["port", "stbd"]) {
    const sgn = side === "port" ? -1 : 1;
    add({ id: "chine." + side, name: "chine log · " + side, kind: "batten", el: "earth",
          at: [sgn * mid.chineX, mid.chineY - 20, 0], size: [45, 45, spec.loa * 0.86],
          mate: "bottom", material: "softwood 45 × 45" });
    add({ id: "gunwale." + side, name: "gunwale · " + side, kind: "gunwale", el: "earth",
          at: [sgn * mid.hb * 0.86, keelY + spec.depth - 12, 0], size: [75, 26, spec.loa * 0.92],
          mate: "sheer", material: "softwood 75 × 26 (inwale + outwale)" });
  }

  /* THE FRAMES: one per interior station, placed BY STATION so a change to the hull moves them with it. */
  for (let i = 1; i < n; i++) {
    const s = S[i];
    add({ id: "frame." + i, name: "frame @ station " + i, kind: "frame", el: "earth",
          at: [0, s.keelY + (s.sheerY - s.keelY) * 0.5, s.z],
          size: [s.hb * 1.86, 62, 40], mate: "station:" + i,
          material: "softwood 62 × 40 (or 2 × ply " + spec.ply + ")" });
  }

  /* THE SEATS AND THE FITTINGS. A thwart is not decoration: it is a frame you can sit on, and on a small
     boat it is most of the structure above the waterline. */
  if (spec.loa > 3000) {
    add({ id: "thwart.fwd", name: "forward thwart", kind: "seat", el: "earth",
          at: [0, keelY + spec.depth * 0.80, spec.loa * 0.14], size: [mid.hb * 1.7, 32, 240],
          mate: "side.port", material: "softwood 32 thick" });
    add({ id: "thwart.aft", name: "aft thwart", kind: "seat", el: "earth",
          at: [0, keelY + spec.depth * 0.78, -spec.loa * 0.14], size: [mid.hb * 1.75, 32, 240],
          mate: "side.stbd", material: "softwood 32 thick" });
  }
  if (spec.motor_kg > 0) {
    add({ id: "motorpad", name: "motor pad", kind: "fitting", el: "fire",
          at: [0, keelY + spec.depth * 0.88, -spec.loa / 2 + 260], size: [360, 45, 420],
          mate: "transom", material: "ply " + spec.ply + "mm × 3 laminated" });
    add({ id: "motor", name: "outboard (" + spec.motor_kg + " kg)", kind: "fitting", el: "fire",
          at: [0, keelY + spec.depth * 0.88 + 210, -spec.loa / 2 + 210], size: [330, 420, 560],
          mate: "motorpad", material: "— a MASS, not a cut piece",
          /* DECLARED, not hidden: an outboard hangs OFF the transom, above the sheer and behind the boat.
             The fit law (scripts/test_boat.mjs) skips anything that says `protrudes`, so the exception is
             named in the data instead of being quietly tolerated by a loose tolerance. */
          protrudes: true });
  }
  add({ id: "breasthook", name: "breasthook", kind: "fitting", el: "earth",
        at: [0, keelY + spec.depth * 0.84, spec.loa / 2 - 240], size: [280, 55, 300],
        mate: "side.port", material: "softwood block, epoxied" });

  /* ── THE RIG (rig: "square"). Straight off the captain's sheet (2026-10-28): two masts on the centreline,
     a yard and a course on each, ratlines, a deck to walk, a cap rail, the wheel aft, the anchor forward and
     two guns. EVERYTHING TALL DECLARES `protrudes`, because a mast leaves the hull box on purpose and the fit
     law must not pretend otherwise -- the exception is named in the data, not hidden in a tolerance. */
  if (spec.rig === "square") {
    const zFore = spec.loa * 0.20, zMain = -spec.loa * 0.06, zAft = -spec.loa * 0.38;
    const hFore = spec.loa * 0.62, hMain = spec.loa * 0.80;
    const deckY = keelY + spec.depth * 0.98;

    add({ id: "deck.main", name: "deck plate", kind: "panel", el: "earth",
          at: [0, deckY, 0], size: [spec.beam * 0.82, 60, spec.loa * 0.62],
          cut: [spec.beam * 0.82, spec.loa * 0.62], mate: "sheer",
          material: "planked deck " + spec.ply + "mm" });

    add({ id: "mast.fore", name: "foremast", kind: "fitting", el: "earth",
          at: [0, deckY + hFore / 2, zFore], size: [220, hFore, 220],
          mate: "deck.main", material: "spar 220", kg: Math.round(hFore * 0.016), protrudes: true });
    add({ id: "mast.main", name: "mainmast", kind: "fitting", el: "earth",
          at: [0, deckY + hMain / 2, zMain], size: [260, hMain, 260],
          mate: "deck.main", material: "spar 260, fighting top", kg: Math.round(hMain * 0.022), protrudes: true });

    add({ id: "yard.fore", name: "fore yard", kind: "fitting", el: "earth",
          at: [0, deckY + hFore * 0.78, zFore], size: [120, 120, spec.beam * 1.05],
          mate: "mast.fore", material: "spar 120", kg: 45, protrudes: true });
    add({ id: "yard.main", name: "main yard", kind: "fitting", el: "earth",
          at: [0, deckY + hMain * 0.74, zMain], size: [130, 130, spec.beam * 1.15],
          mate: "mast.main", material: "spar 130", kg: 58, protrudes: true });

    add({ id: "sail.fore", name: "fore course", kind: "fitting", el: "air",
          at: [0, deckY + hFore * 0.58, zFore + 40], size: [spec.beam * 1.0, 20, hFore * 0.36],
          mate: "yard.fore", material: "canvas", kg: 18, protrudes: true });
    add({ id: "sail.main", name: "main course", kind: "fitting", el: "air",
          at: [0, deckY + hMain * 0.54, zMain + 40], size: [spec.beam * 1.1, 20, hMain * 0.34],
          mate: "yard.main", material: "canvas", kg: 24, protrudes: true });

    add({ id: "rig.ratlines", name: "ratline net", kind: "fitting", el: "air",
          at: [spec.beam * 0.30, deckY + hMain * 0.42, zMain], size: [40, hMain * 0.7, spec.beam * 0.34],
          mate: "mast.main", material: "tarred rope", kg: 9, protrudes: true });

    add({ id: "rail.cap", name: "rail cap", kind: "batten", el: "earth",
          at: [0, keelY + spec.depth - 20, 0], size: [90, 60, spec.loa * 0.86], mate: "sheer",
          material: "hardwood cap 90 × 60" });

    add({ id: "wheel", name: "ship's wheel", kind: "fitting", el: "earth",
          at: [0, deckY + 500, zAft + 200], size: [900, 120, 900], mate: "deck.main",
          material: "ash spokes, brass hub", kg: 22, protrudes: true });
    add({ id: "anchor", name: "anchor", kind: "fitting", el: "mercury",
          at: [spec.beam * 0.46, keelY + spec.depth * 0.55, spec.loa * 0.42], size: [400, 1200, 700],
          mate: "side.stbd", material: "iron, stocked", kg: 65 });
    for (const [i, sgn] of [[1, -1], [2, 1]]) {
      add({ id: "cannon." + i, name: "cannon " + i, kind: "fitting", el: "fire",
            at: [sgn * spec.beam * 0.30, deckY + 380, spec.loa * 0.06], size: [1200, 500, 600],
            mate: "deck.main", material: "iron barrel, oak carriage", kg: 380, protrudes: true });
    }
  }

/* ── THE BRANCH TREE. Eight sparks, and the parts each one actually owes. This is what makes one word a SHIP
   instead of a sketch: every bay between stations grows two strakes a side, every station already carries a
   frame, the rail gets a stanchion every ~900 mm, and the guns get a port cut for each one. Nothing here is
   authored by hand -- it is `count = f(length)`, so five words and five hundred words give the same honesty. */
  if (spec.rig === "square") {
    const bays = spec.sections.length - 1;
    for (let i = 0; i < bays; i++) {
      const a = spec.sections[i], b = spec.sections[i + 1];
      const zc = (a.z + b.z) / 2, len = Math.abs(b.z - a.z) * 0.98;
      const band = (spec.depth * 0.9) / 6;                     // six bands of planking a side
      for (const side of ["port", "stbd"]) {
        const sgn = side === "port" ? -1 : 1;
        for (let k = 0; k < 2; k++) {                          // two strakes per bay, per side (the tree's depth)
          add({ id: "strake." + side + "." + i + "." + k, name: "strake " + (i + 1) + "." + (k + 1) + " · " + side,
                kind: "panel", el: "water",
                at: [sgn * ((a.hb + b.hb) / 2) * 0.96, keelY + spec.depth * (0.30 + k * 0.34), zc],
                size: [spec.ply, band, len], cut: [band, len],
                mate: "station:" + (i + 1), material: "ply " + spec.ply + "mm", branch: "planking" });
        }
      }
    }
    const posts = Math.max(2, Math.round((spec.loa * 0.84) / 900));
    for (let i = 0; i < posts; i++) {
      const z = -spec.loa * 0.42 + (i / Math.max(1, posts - 1)) * spec.loa * 0.84;
      for (const side of ["port", "stbd"]) {
        const sgn = side === "port" ? -1 : 1;
        add({ id: "rail.post." + side + "." + i, name: "stanchion " + (i + 1) + " · " + side, kind: "fitting",
              el: "earth", at: [sgn * spec.beam * 0.44, keelY + spec.depth - 480, z],
              size: [70, 900, 70], mate: "rail.cap", material: "turned stanchion", kg: 6, branch: "outfit" });
      }
    }
  }

  return parts;
}

/* ── THE CUT LIST. A sheet is 1220 × 2440 and 90 % of it is usable in practice. This is the number the
   captain actually spends money on, so it is DERIVED from the parts and never declared. */
export function cutsOf(parts) {
  let area = 0;
  const byThick = {};
  for (const p of parts) {
    if (p.gone || p.kind !== "panel") continue;        // `hull` is a reference surface: it is not bought
    const a = (p.size[0] * p.size[2]) / 1e6;           // m2 of the sheet this part needs
    area += a;
    const t = Math.round(p.size[1]);
    byThick[t] = (byThick[t] || 0) + a;
  }
  const sheetArea = 1.22 * 2.44 * 0.9;                 // 2.68 m2 usable per sheet
  const out = { total_m2: +area.toFixed(2), sheets: {}, epoxy_kg: +(area * 1.6).toFixed(1),
                glass_m2: +(area * 1.4).toFixed(1) };
  for (const t of Object.keys(byThick)) out.sheets[t + "mm"] = Math.ceil(byThick[t] / sheetArea);
  return out;
}

/* ── THE SPIRAL. The captain's own mechanism (2026-10-25T21:14:44): *"not as a circle, as a spiral, a
   metaspiral that let air enter to enlarge and create energy"*. On a hull this is not decoration either:
   a spiral IS what a boatwright draws -- the station offsets are read off a spiral, and the golden angle
   is how you place a set of points on a curve without two of them crowding. So the derive uses the
   spiral to place its stations and its provenance, and `spiral()` is exported so the UI can DRAW it.
     r(θ) = a · e^(bθ)   -- growth per turn is the ENERGY GAIN: each turn is bigger than the last, so the
                            work done on turn n+1 costs less per unit than turn n (superlinear gain from
                            air, which is the whole claim). b = ln(φ)/ (π/2) is the golden spiral. */
export function spiral(n, a = 1, b = Math.log((1 + Math.sqrt(5)) / 2) / (Math.PI / 2)) {
  const pts = [];
  for (let i = 0; i < n; i++) {
    const th = (i / Math.max(1, n - 1)) * (Math.PI * 2) * 1.5;   // 1.5 turns: open, never closed
    pts.push({ t: i / Math.max(1, n - 1), th, r: a * Math.exp(b * th) });
  }
  const rMax = pts[pts.length - 1].r;
  return pts.map((p) => {
    const rn = Math.min(1, p.r / rMax);       // clamped: cos/sin can land 1.0000000000000002 outside
    return { ...p, rn, x: Math.cos(p.th) * rn, y: Math.sin(p.th) * rn };
  });
}

/* ── THE BREATHING SPIRAL. The captain drew it (2026-10-28): a fixed axis, a radius that opens and closes
   TWICE, and the closing arm drawn heavier than the opening one. So the mechanism is not one arm but a
   pair sharing an axis -- ω opening (light, fast, cheap per unit) and Ω closing (dense, load-bearing).
   `lobe` returns both arms so a UI can draw the real shape instead of a generic helix:
     open  : r grows 1 → 1 over n steps, marks thin   (the build: quick, cheap, provisional)
     close : r shrinks back, marks thick             (the assembly: slow, load-bearing, final)
   The thickness ratio is the thing worth measuring: `dense` says how much more the return carries. */
export function breathing(n = 21, dense = 2.6) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const out_ = t < 0.5;
    const u = out_ ? t * 2 : (1 - t) * 2;                       // 0 → 1 → 0
    out.push({
      i, t, arm: out_ ? "open" : "close", u,
      x: u,                                                     // distance along the axis (0..1)
      y: Math.sin(u * Math.PI) * (out_ ? 1 : -1),               // above/below = the two lobes
      weight: out_ ? 1 : dense,                                 // the return is DENSER, as drawn
    });
  }
  return out;
}

/* ── THE BOAT. One call: prompt in, a whole buildable boat out. Everything downstream (the page, the
   export, the gate) reads THIS and nothing else, so there is exactly one derivation in the world. */
export function derive(prompt, familyName, opts = {}) {
  const spec = deriveSpec(prompt, familyName);
  const parts = buildParts(spec);
  if (opts.edits) applyEdits(parts, opts.edits);              // the captain's moves/replacements, as rows
  const float = floatOf(spec, parts);
  const cuts = cutsOf(parts);
  return {
    urn: spec.urn, prompt: spec.prompt, family: spec.family, label: spec.label,
    spec, parts, float, cuts,
    sparks: sparkTree(spec.prompt),
    spiral: spiral(spec.stations + 1),
    breath: breathing(Math.max(9, spec.stations * 2 + 3)),
    /* SEAM-OMEGA: the (Ω, ω) trilogy's third term is the captain's to name. Until he does, this field is
       explicit about its absence rather than filled with a guess. */
    omega: { declared: false, why: "the trilogy is the captain's; the seam is open" },
    warnings: float.warnings.concat(
      parts.some((p) => p.gone) ? ["some parts are removed: this is an EDIT of urn " + spec.urn +
        ", not the derivation — export it, or reload to go back"] : []
    ),
  };
}

/* ── EVERY FAMILY, ONE PROMPT. This is the comparison the captain asked for before buying wood: the same
   name derived three ways, so the numbers can be read side by side instead of argued about. */
export function deriveAll(prompt) {
  return kFamilyNames.map((f) => derive(prompt, f));
}

/* ── THE EDITS. A move is a delta in millimetres, a replacement is a new size/material, a removal is a
   flag. Applied as ROWS (not as mutations buried in a UI), so an edited boat can be exported, replayed
   and diffed -- the same law as every other record in this vessel. */
export function applyEdits(parts, edits) {
  for (const e of edits) {
    const p = parts.find((q) => q.id === e.id);
    if (!p) continue;
    if (e.at) p.at = [p.at[0] + (e.at[0] || 0), p.at[1] + (e.at[1] || 0), p.at[2] + (e.at[2] || 0)];
    if (e.size) p.size = e.size.slice(0, 3);
    if (e.rot) p.rot = e.rot.slice(0, 3);
    if (e.material) p.material = e.material;
    if (e.gone !== undefined) p.gone = !!e.gone;
  }
  return parts;
}

/* ── THE ELEMENT TOTALS. The BOM read alchemically: how much of this hull is water (wetted ply), earth
   (mass), air (volume), fire (engine), mercury (binder). One line per element, in kg where a mass exists. */
export function elementsOf(res) {
  const out = {};
  const mass = massOf(res.spec, res.parts);
  const plyA = mass.plyArea;
  out.water = { glyph: kElements.water.glyph, label: "water", kg: Math.round(plyA * res.spec.ply / 1000 *
    res.spec.mass_density_ply * 0.55), note: plyA.toFixed(2) + " m² wetted" };
  out.earth = { glyph: kElements.earth.glyph, label: "earth", kg: Math.round(mass.hull * 0.32),
    note: "keel, frames, ballast" };
  out.air = { glyph: kElements.air.glyph, label: "air", kg: 0,
    note: res.float.volume_m3 + " m³ of volume — it is the displacement, not a mass" };
  out.fire = { glyph: kElements.fire.glyph, label: "fire", kg: res.spec.motor_kg, note: "outboard + fuel" };
  out.mercury = { glyph: kElements.mercury.glyph, label: "mercury", kg: Math.round(plyA * res.spec.resin_kg_m2),
    note: plyA.toFixed(2) + " m² × " + res.spec.resin_kg_m2 + " kg/m² epoxy" };
  return out;
}

/* ── THE CORPUS. The captain's own index (2026-10-28), kept in his order and his numbering -- including
   the ZERO, because this vessel's law is that counting starts at 0 and 0 is the floor, not the roof
   (`world.json`: "the zero at the centre belongs to nobody"). The app's library is these ten, and 04 and
   09 are METHOD, not decoration: a boat plan is a silent book (the drawing carries the instruction, no
   prose needed), and an assembly order is a scroll (you unroll it as you work). */
export const kCorpus = Object.freeze([
  { n: "0",  title: "Sammlung Alchymistischer Schriften", use: "the collection itself: many hands, one shelf" },
  { n: "01", title: "Geometry of the alchemist",          use: "the hull as geometry: stations, chine, deadrise" },
  { n: "02", title: "Planetary seals and matrices",       use: "the station table and the magic squares (15 34 65 111 …)" },
  { n: "03", title: "The macrocosm and microcosm",        use: "boat as body: keel = spine, frames = ribs, planking = skin" },
  { n: "04", title: "The silent alchemical book",         use: "METHOD — the plan speaks in pictures only; no prose on the sheet" },
  { n: "05", title: "Aurora Consurgens",                  use: "the dawn sequence: what to do first, and what only after it" },
  { n: "06", title: "Miscellanea Alchemica X",            use: "the bench notes: mixes, ratios, failures worth keeping" },
  { n: "07", title: "Ancient, alchemical and magical alphabets", use: "the sigils: .:aCe:. and the Old Italic bodies" },
  { n: "08", title: "Newton's Hieroglyphica Planetarum",  use: "the glyph per operation: one mark per step of the build" },
  { n: "09", title: "The Ripley Scrolls",                 use: "METHOD — the assembly as a scroll: order you unroll as you work" },
]);

/* ── THE FOUR GRAMMARS (the council's own line, hall3d.html). Each one is a DIFFERENT READER of the same
   boat, which is why they are worth keeping apart instead of blended into one chart. */
export const kGrammars = Object.freeze({
  sound_image: { glyph: "♬", label: "sound and image", inBoat: "the urn — her name; the cut list drawn as a picture" },
  emblems:     { glyph: "△", label: "geometric emblems", inBoat: "the panels: their flat cuts are triangles and lozenges" },
  squares:     { glyph: "⊗", label: "planetary squares and traced seals", inBoat: "the station table: n stations, one sum per size" },
  cosmograms:  { glyph: "◎", label: "concentric cosmograms", inBoat: "the waterline rings and the frames: rings down her length" },
});

/* ── THE ADVISOR. The captain (2026-10-28): *"the workshop atelier garage could also lead the use into
   improving his build ... each piece is treated as an entity that has a relation to another ... giving
   potential upgrades, or new piece to accelerate the build, or make emergent piece"*.
   RULES OVER THE GRAPH, not a model's opinion: every part is a node, every `mate` an edge, and a line
   only appears when a NUMBER says so. Four kinds:
     gap      -- the build is missing something the geometry already implies
     emergent -- a piece that existing pieces imply but nobody added (a knee, a breasthook)
     upgrade  -- a piece that exists but is too thin/short for what it carries
     speed    -- a piece that is REPEATED, so it can become a template or a jig
   Nothing is applied automatically; every line carries its numbers; and `kNoRuleFor` declares what this
   advisor does NOT know, so the absence of a warning is never mistaken for approval. */
export const kNoRuleFor = Object.freeze([
  "rowing/sailing ergonomics (oar length, rowlock height, sail area)",
  "structural stress (panel bending, fillet peel, fastener pull-out)",
  "stability and heel (see verdict.unmeasured)",
  "cost and lead time (a price is a supplier's, not ours)",
]);

export function advise(res) {
  const s = res.spec, out = [];
  const live = res.parts.filter((p) => !p.gone);
  const has = (id) => live.some((p) => p.id === id);
  const frames = live.filter((p) => p.kind === "frame").sort((a, b) => a.at[2] - b.at[2]);

  /* R1 — UNSUPPORTED SPAN. A plywood panel needs a frame under it; the limit comes from the thickness.
     This is the oldest scantling rule in small-boat building and it is what decides whether a bottom
     "oil-cans" the first time it touches a wave. */
  const maxSpan = s.ply >= 9 ? 450 : s.ply >= 6 ? 350 : 250;
  const chain = [{ id: "transom", z: -s.loa / 2 }, ...frames.map((f) => ({ id: f.id, z: f.at[2] })),
                 { id: "stem", z: s.loa / 2 }];
  for (let i = 1; i < chain.length; i++) {
    const d = Math.abs(chain[i].z - chain[i - 1].z);
    if (d > maxSpan) {
      out.push({ kind: "gap", ids: [chain[i - 1].id, chain[i].id],
                 why: d + " mm of unsupported " + s.ply + " mm ply between " + chain[i - 1].id + " and " +
                      chain[i].id + " (limit ≈ " + maxSpan + " mm for this thickness)",
                 do: "add one frame between them, or go up a ply thickness (heavier, and it costs a sheet)" });
    }
  }

  /* R2 — EMERGENT: THE KNEE. A transom takes the motor's thrust at an angle and the bottom meets it
     square; the geometry implies a triangle nobody has drawn. That is an emergent piece. */
  if (s.motor_kg > 0 && !has("knee")) {
    out.push({ kind: "emergent", ids: ["transom", "bottom", "motorpad"],
               why: "a " + s.motor_kg + " kg outboard pushes the transom at an angle and the bottom meets it " +
                    "square: nothing here ties those two corners together",
               do: "emergent piece: KNEE — a right triangle of " + s.ply + " mm ply, 2 off, epoxied into both " +
                   "corners (the cheapest strength in the whole boat)" });
  }

  /* R3 — EMERGENT: A BREASTHOOK at the stem, if the two side panels meet without one. */
  if (!has("breasthook")) {
    out.push({ kind: "emergent", ids: ["side.port", "side.stbd"],
               why: "both side panels converge at the stem and stop: that joint has no horizontal tie",
               do: "emergent piece: BREASTHOOK — a plate across the stem holding the two sides apart" });
  }

  /* R4 — SPEED: REPEATED PIECES. N identical frames are N chances to cut once and use a template. */
  if (frames.length >= 3) {
    out.push({ kind: "speed", ids: frames.map((f) => f.id),
               why: frames.length + " frames of the same kind: the same shape, " + frames.length + " times",
               do: "cut ONE frame, then use it as a template/jig for the rest — framing time roughly halves " +
                   "and the hull comes out straighter, because every frame is the same frame" });
  }
  if (has("side.port") && has("side.stbd")) {
    out.push({ kind: "speed", ids: ["side.port", "side.stbd"],
               why: "the two side panels are mirror images of one cut",
               do: "lay them out ONCE and cut both flipped — marking them separately is how a pair drifts 10 mm apart" });
  }

  /* R5 — UPGRADE: the gunwale is the part you grab, sit on and clamp to. Too narrow for the length is a
     comfort failure before it is a strength failure. */
  const gw = live.find((p) => p.kind === "gunwale");
  if (gw && gw.size[0] < 70 && s.loa > 3800) {
    out.push({ kind: "upgrade", ids: [gw.id],
               why: gw.size[0] + " mm of gunwale under a " + s.loa + " mm boat: too little to sit on or clamp to",
               do: "go to 70 × 26 (inwale + outwale) — it also stiffens the sheer line, where a hull loses its shape first" });
  }

  /* R6 — GAP: A BOAT THAT CANNOT BE EMPTIED. Small, real, and invisible until the first wet morning. */
  if (!has("drain")) {
    out.push({ kind: "gap", ids: ["transom"],
               why: "nothing in the build lets water out: a boat that ships a wave has no way back",
               do: "add a drain plug through the transom at the lowest point, plus a bailer — 20 g of part that " +
                   "decides a bad afternoon" });
  }

  /* R7 — UPGRADE: over-thick ply where a lighter sheet carries the same span, measured against R1's limit. */
  if (s.ply >= 9 && s.loa < 4600) {
    out.push({ kind: "upgrade", ids: ["bottom"],
               why: s.ply + " mm ply on a " + s.loa + " mm boat: the panel is stronger than the frames holding it",
               do: "6 mm + glass both sides weighs ~40 % less for the same span, and that saving comes back as payload" });
  }

  return out;
}

/* ── THE BILL OF MATERIALS. What you must actually buy, derived from the parts — never a wish list. Sheets
   are counted per thickness (a supplier sells 1220 x 2440, 90 % usable); timber is counted in metres of a
   SECTION so it can be ordered; everything that declares `kg` is totalled by its element, because "380 kg of
   iron in two guns above the deck" is the sentence that decides whether a hull is stable. */
export function bomOf(res) {
  const perT = {}, perSection = {}, perElement = {};
  let plyArea = 0;
  for (const p of res.parts) {
    if (p.gone) continue;
    const area = (p.size[0] * p.size[2]) / 1e6;
    if (p.kind === "panel") {
      plyArea += area;
      const t = Math.round(p.size[1]);
      perT[t] = (perT[t] || 0) + area;
    } else if (p.kind === "batten" || p.kind === "frame" || p.kind === "gunwale" || p.kind === "seat") {
      const sec = Math.round(p.size[0]) + "×" + Math.round(p.size[1]);
      perSection[sec] = (perSection[sec] || 0) + p.size[2] / 1000;
    }
    if (typeof p.kg === "number") {
      perElement[p.el] = (perElement[p.el] || 0) + p.kg;
    }
  }
  const rows = [];
  const SHEET = 1.22 * 2.44 * 0.9;
  for (const t of Object.keys(perT).sort((a, b) => a - b)) {
    rows.push({ item: "plywood " + t + " mm", qty: Math.ceil(perT[t] / SHEET), unit: "sheet 1220×2440",
                note: perT[t].toFixed(2) + " m² needed" });
  }
  for (const s of Object.keys(perSection)) {
    rows.push({ item: "softwood " + s + " mm", qty: +perSection[s].toFixed(1), unit: "m",
                note: "batten / frame / seat stock" });
  }
  if (plyArea > 0) {
    rows.push({ item: "epoxy + filler", qty: +(plyArea * res.spec.resin_kg_m2).toFixed(1), unit: "kg",
                note: plyArea.toFixed(2) + " m² × " + res.spec.resin_kg_m2 + " kg/m²" });
    rows.push({ item: "glass cloth", qty: +(plyArea * 1.4).toFixed(1), unit: "m²", note: "both faces + tape" });
  }
  for (const el of Object.keys(perElement)) {
    rows.push({ item: kElements[el] ? kElements[el].label : el, qty: Math.round(perElement[el]), unit: "kg",
                note: "declared mass, not estimated" });
  }
  const mass = massOf(res.spec, res.parts);
  return { rows, plyArea: +plyArea.toFixed(2), mass_kg: Math.round(mass.total) };
}

/* ── THE BLUEPRINT. The bridge the captain asked for (2026-10-28): design here, export the PLAN into the One
   Verse, gather the materials there, build it -- and the same plan must be buildable by a human hand. So this
   artifact carries FOUR things and refuses to carry a fifth: the geometry in mm, the bill of materials, the
   verdict, and the UNMEASURED list. It does NOT carry a promise: a blueprint is a plan, not a certificate. */
export function blueprint(res) {
  return {
    schema: "0z.blueprint/1",
    urn: res.urn, prompt: res.prompt, family: res.family, label: res.label,
    spec: res.spec,
    parts: res.parts.filter((p) => !p.gone),
    cuts: res.cuts,
    float: res.float,
    elements: elementsOf(res),
    bom: bomOf(res),
    verdict: (() => { const v = verdict(res); return { ok: v.ok, verdict: v.verdict, unmeasured: v.unmeasured }; })(),
    /* the one-line row the One Verse can hold: a claim is plot · who · note · ts, and a blueprint is a claim
       about a PLOT (P02, the workshop) that names its urn and its heaviest material. */
    claim: {
      plot: "P02",
      who: "",
      note: "BLUEPRINT " + res.urn + " · " + res.family + " · " + res.spec.loa + "×" + res.spec.beam +
            " mm · " + bomOf(res).mass_kg + " kg · v=" + (verdict(res).ok ? "pass" : "fail"),
      ts: new Date().toISOString().slice(0, 19),
    },
  };
}

/* ── THE DNA MEMORY. The captain (2026-10-28): *"the app must also run on dna memory that can be accessed
   fast"*. So the atelier's memory is a LEDGER, not a settings blob: one JSON object per line, append-only,
   the same shape as `backend/data/ace_dna/sparks.jsonl`. Three rules, and they are the whole design:
     1. A ROW IS A FACT, never an edit. Changing your mind appends a row; the old one stays, because history
        says what changed.
     2. A LATER ROW SUPERSEDES an earlier one with the same key (part id, design urn) -- the vessel's own
        law: "a promotion is a NEW row that names the row it supersedes".
     3. ACCESS IS O(1). The file is parsed ONCE at boot into two Maps; nothing in the UI scans the ledger.
        A thousand rows cost one parse, not a thousand reads.
   THE HONEST LIMIT: on a static host this file cannot write itself. `dnaToJsonl` produces the new file and
   the captain commits it -- nothing is stored behind his back. */
export function dnaRow(kind, payload, meta = {}) {
  return Object.assign({ ts: new Date().toISOString().slice(0, 19), kind }, payload, meta);
}

export function parseDna(text) {
  const rows = [], bad = [];
  String(text || "").split(/\r?\n/).forEach((line, i) => {
    if (!line.trim()) return;
    try {
      const r = JSON.parse(line);
      if (!r || typeof r !== "object" || !r.kind) throw new Error("no kind");
      rows.push(r);
    } catch (err) {
      bad.push({ line: i + 1, why: String((err && err.message) || err) });
    }
  });
  const defs = new Map();      // part id (base, before any "#2") -> the LATEST definition
  const designs = new Map();   // urn -> the latest design row
  for (const r of rows) {
    if (r.kind === "part" && r.id) defs.set(String(r.id).split("#")[0], r);
    else if (r.kind === "design" && r.urn) designs.set(String(r.urn), r);
  }
  const base = (id) => String(id == null ? "" : id).split("#")[0];
  return {
    rows, bad, defs, designs,
    at: (id) => defs.get(base(id)) || null,
    design: (urn) => designs.get(String(urn)) || null,
    /* the shelf: one pass over an already-built Map, newest first */
    shelf: () => [...defs.values()].sort((a, b) => String(b.ts).localeCompare(String(a.ts))),
  };
}

/* Append is O(1): one row on the end, in memory. The file is written by `dnaToJsonl` when the captain
   exports -- never behind his back. */
export function dnaAppend(rows, row) {
  return rows.concat([row]);
}

export function dnaToJsonl(rows) {
  return rows.map((r) => JSON.stringify(r)).join("\n") + "\n";
}

/* ── THE LIBRARY. The captain (2026-10-28): *"user could be able to save piece into a lib, so good piece can
   be reusable into other builds,, a bit like lego in digital and hd"*.
   So a part has two lives: a DEFINITION (in the library: size, material, element, and the urn it came from)
   and an INSTANCE (on a build: an id, a position, and the def it came from). That split is what makes a
   piece reusable without making it anonymous -- every copy still names the boat that taught it.
   THE LAW HERE IS APPEND-ONLY, like every other record in this vessel: saving the same definition twice is
   a no-op, and saving a DIFFERENT one under the same name appends `#2` instead of overwriting. Nothing in
   a library is ever silently replaced. */
export function savePart(res, partId, lib = [], opts = {}) {
  const p = res.parts.find((q) => q.id === partId);
  if (!p) throw new Error("no such part: " + partId);
  const def = {
    id: opts.id || p.id, name: opts.name || p.name, kind: p.kind, el: p.el,
    size: p.size.slice(0, 3), material: p.material, cut: p.cut ? p.cut.slice(0, 2) : null,
    note: opts.note !== undefined ? opts.note : (p.note || ""),
    from: { urn: res.urn, family: res.family, prompt: res.prompt },
  };
  const sameId = lib.filter((e) => e.id === def.id || e.id.startsWith(def.id + "#"));
  if (sameId.some((e) => JSON.stringify(stripFrom(e)) === JSON.stringify(stripFrom(def)))) return lib;  // no-op
  if (sameId.length) def.id = def.id + "#" + (sameId.length + 1);
  return lib.concat([def]);
}
const stripFrom = (e) => ({ id: e.id, name: e.name, kind: e.kind, el: e.el, size: e.size,
                            material: e.material, cut: e.cut, note: e.note });

/* A DEFINITION -> an INSTANCE. The instance is what a build holds: where it is and what it is fastened to.
   `def` keeps the link, so a later improvement to the definition can be traced to every copy of it. */
export function fromLibrary(entry, instance = {}) {
  return {
    id: instance.id || entry.id, name: entry.name, kind: entry.kind, el: entry.el,
    at: (instance.at || [0, 0, 0]).slice(0, 3), size: entry.size.slice(0, 3),
    rot: (instance.rot || [0, 0, 0]).slice(0, 3), cut: entry.cut || undefined,
    mate: instance.mate || "keel", material: entry.material, note: entry.note || "",
    gone: false, def: entry.id,
  };
}

/* PUT A SAVED PIECE ON A BUILD. The float and the cut list are RECOMPUTED, because a boat with an extra
   gunwale is a different boat -- a library that does not change the numbers would be a sticker, not a part. */
export function usePart(res, entry, instance = {}) {
  const parts = res.parts.concat([fromLibrary(entry, instance)]);
  return { ...res, parts, float: floatOf(res.spec, parts), cuts: cutsOf(parts) };
}

/* Two entries with the same id and different contents can only exist by an append; this reports them so a
   UI can warn instead of guessing which one the user meant. */
export function libraryConflicts(lib) {
  const seen = new Map();
  for (const e of lib) {
    const base = e.id.split("#")[0];
    if (seen.has(base)) return true;
    seen.set(base, true);
  }
  return false;
}



/* ── THE SUPPORTS. What holds a build up decides which PHYSICS runs, and nothing else does. This is the
   captain's own condition (2026-10-28): *"it must reflect our real physics,, so if i build a car it must
   not work until it truly work"*. So a support whose physics is NOT implemented cannot return a pass --
   ever. It returns `implemented: false`, and the verdict fails with that sentence as the reason. A car
   in this app today is DESIGN ONLY: you can shape it, cut-list it and weigh it, and it will tell you it
   cannot tell you whether it drives. That is the honest answer until the road model exists. */
export const kSupports = Object.freeze({
  water: { label: "water", medium: "buoyancy", physics: "displacement · freeboard · payload", implemented: true },
  road:  { label: "road",  medium: "traction", physics: "mass · power · grip · brakes · balance", implemented: false },
  snow:  { label: "snow",  medium: "flotation", physics: "ground pressure · sinkage · traction", implemented: false },
  air:   { label: "air",   medium: "lift",     physics: "wing area · thrust · stall · control", implemented: false },
});

/* ── THE VERDICT. Three states, never two: PASS, FAIL, and UNMEASURED. The third is the one that keeps
   this app honest -- a number nobody computed must never be read as a green light. `ok` is true only when
   every check that COULD run has passed AND nothing critical is unmeasured; `unmeasured` is printed in
   full, so silence never passes for safety. */
export function verdict(res) {
  const f = res.float, s = res.spec, support = kSupports[s.support || "water"];
  const checks = [];
  const unmeasured = [];
  const add = (name, pass, why) => checks.push({ name, pass: !!pass, why });

  /* the physics itself: a support we have not modelled cannot be judged */
  add("physics implemented for " + support.label, support.implemented,
      support.implemented ? support.physics : "NOT IMPLEMENTED: " + support.physics + " — design only, this craft cannot be declared working");

  if (support.implemented) {
    add("it floats", f.payload_kg > 0, f.payload_kg + " kg of payload at the design waterline");
    add("it carries one adult", f.payload_kg >= 85, f.payload_kg + " kg vs 85 kg (a person and nothing else)");
    add("freeboard is not a puddle", f.freeboard_mm >= 150, f.freeboard_mm + " mm of side above the water");
    add("every part is fastened to something", res.parts.every((p) => !!p.mate), "mates are checked in the gate");
    /* THE HONEST HOLE. These are the things that decide whether a small boat is SAFE, and this app does
       not compute them yet. They are listed, never assumed. */
    unmeasured.push(
      "metacentric height (stability): not computed — beam and draft are the only proxies here",
      "heel and capsize angle: not computed — no righting-moment curve",
      "waves and dynamic loading: not computed — flat water only",
      "structure under load (panel stress, fillet strength): not computed — schedule only"
    );
  } else {
    unmeasured.push("everything: the " + support.label + " model does not exist yet");
  }

  const failed = checks.filter((c) => !c.pass);
  return {
    ok: failed.length === 0, checks, unmeasured,
    verdict: failed.length === 0
      ? (unmeasured.length ? "PASS ON WHAT CAN BE MEASURED — " + unmeasured.length + " thing(s) UNMEASURED, see list"
                           : "PASS")
      : "FAIL — " + failed.map((c) => c.why).join(" · "),
  };
}

/* ── THE CLOSED FORM. The captain drew this one too (2026-10-28): 1, 3, 5, 7, 9, then 7, 5, 3, 1 — the
   same expansion as the spiral, but it RETURNS to the point. That is the difference the two drawings make:
   the spiral accumulates (each turn bigger than the last), the diamond closes (nothing is left over).
   Both are needed: the diamond is a SECTION (a frame closes on itself), the spiral is a SEQUENCE (a build
   never returns to where it started). So `diamond` builds the frames, `spiral` orders the work. */
export function diamond(n = 9) {
  if (n % 2 === 0) n += 1;                                     // his figure has a point, so n is odd
  const half = (n - 1) / 2, out = [];
  for (let i = 0; i < n; i++) {
    const k = i <= half ? i : n - 1 - i;
    out.push({ i, width: 1 + 2 * k, u: 1 - Math.abs(k - half) / half, closes: true });
  }
  return out;
}


