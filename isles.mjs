/* 🔥 Ace · 2026-11-05 · THE ISLES — derived from names, in the same law as the hull.
 *
 * WHY THIS FILE EXISTS. The captain: "des iles.. une histoire qui se creer mais une histoire coherente".
 * A world of one island is a backdrop; a world of derived islands is a WORLD, because the same seed law
 * that builds a hull can build a coast -- and then the chart, the secrets and the story all read from ONE
 * number instead of from an author's mood.
 *
 * PURE, LIKE boat.mjs: no THREE, no DOM, no network, no clock. FNV-1a over a name -> mulberry32 -> every
 * property of the island. The same name gives the same coast, forever, on any machine.
 *
 * THE SECRET IS FAIR, NOT HIDDEN. Five islands each keep one piece of the name of the twentieth (the one
 * who went home and left a cold stone at the table). Because the name is DERIVED and the seal is DERIVED,
 * any player who puts the pieces together reaches the same answer -- and scripts/seal_gate.py can prove the
 * pieces fit. A mystery whose answer is a derivation cannot be arbitrary, which is the whole point.
 */
import { hash32, rng } from "./boat.mjs";

/* THE SYLLABLES. A name has to be READABLE out loud, because a player will say it to another player. */
const SYL = ["ka", "ro", "mi", "su", "ta", "ne", "vi", "dha", "lo", "ra", "shi", "ul", "ma", "ke", "or", "sa"];

export function hiddenName(seed) {
  const g = rng(hash32(seed));
  const count = 2 + (g() < 0.55 ? 0 : 1);
  let s = "";
  for (let i = 0; i < count; i++) s += SYL[Math.floor(g() * SYL.length)];
  return s;
}

/* THE SEAL LAW, the same one scripts/seal_gate.py measures: first low, the MIDDLE high, last low.
   🔥 MEASURED 2026-11-05, twice, from the captain's own hand (`.:oWé:.` then "les accents sont très
   importants pour les variations et les subtilités"):
   (1) this function used an ASCII test, so `é` was DROPPED -- "owé" -> "ow" -> seal EMPTY, while Python
       returned .:oWé:. THE SAME NAME HAD TWO SEALS.
   (2) even fixed to letters, a DECOMPOSED accent ("e" + U+0301) is a LETTER plus a COMBINING MARK, so the
       mark was still dropped and /rosé/ written two ways gave two seals. An accent is a DIMENSION OF
       VARIATION, not decoration: "rose" and "rosé" are two different things in this world.
   THE LAW NOW: normalise to NFC (one spelling of a name), then keep every LETTER, NUMBER and MARK of any
   script, walking CODE POINTS rather than UTF-16 units. Python does the same thing with unicodedata,
   and scripts/seal_parity.py proves the two agree -- not on one name, on the awkward ones.          */
export function sealOf(name) {
  const keep = [...String(name).normalize("NFC")].filter((c) => /[\p{L}\p{N}\p{M}]/u.test(c));
  if (keep.length < 3) return "";
  const mid = Math.floor((keep.length - 1) / 2);
  return ".:" + keep[0].toLowerCase() + keep[mid].toUpperCase() + keep[keep.length - 1].toLowerCase() + ":.";
}

export const ISLE_SEEDS = [
  "the bell",
  "the ninth fathom",
  "the cold chair",
  "the salt garden",
  "the wreck of the twelfth",
];

const RESOURCES = ["fresh water", "timber", "iron", "salt", "fire"];
const RULES = [
  "the first mark is written small",
  "the middle is a capital, always",
  "the last letter never closes the O",
];

/* ONE ISLAND. Everything here is a function of the seed; nothing is chosen by taste. */
export function deriveIsle(seed, keepers) {
  const h = hash32(seed);
  const g = rng(h);
  const name = seed;
  const bearing = Math.round(15 + g() * 330);            // degrees, 0 = north
  const distance = Math.round(70 + g() * 170);           // metres from the origin
  const r = 8 + g() * 18;                                // radius, metres
  const peaks = 1 + Math.floor(g() * 3);                 // 1..3 crowns
  const height = 6 + g() * 16;
  const rock = 0.5 + g() * 0.5;                          // how black the stone is
  const resource = RESOURCES[Math.floor(g() * RESOURCES.length)];
  const keeper = keepers && keepers.length ? keepers[h % keepers.length] : "nobody";
  return { seed, name, seal: sealOf(name), bearing, distance, r, peaks, height, rock, resource, keeper, h };
}

/* THE FIVE, and the fragments. The answer never ships in the JSON: only the pieces do. */
export function deriveIsles(keepers) {
  const secret = hiddenName("the twentieth chair");
  const seal = sealOf(secret);
  const letters = seal.slice(2, 5).split("");            // ".:xYz:." -> x, Y, z
  const list = ISLE_SEEDS.map((s, i) => {
    const isle = deriveIsle(s, keepers);
    isle.secret = i < 3
      ? { kind: "letter", at: i, value: letters[i], where: ["first", "middle", "last"][i] }
      : { kind: "rule", text: RULES[i - 3] };
    isle.index = i;
    return isle;
  });
  return { isles: list, secret: { name: secret, seal }, fragments: 3 };
}

/* THE POLAR OF A CARTESIAN ISLAND: the page needs x/z, so the conversion lives here, once. */
export function isleAt(isle, originZ = 26) {
  const a = (isle.bearing * Math.PI) / 180;
  return { x: Math.sin(a) * isle.distance, z: originZ - Math.cos(a) * isle.distance };
}
