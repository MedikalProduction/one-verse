/* THE WITNESS -- the world proves itself inside YOUR browser.
 *
 * The gate serves the rows; the page does NOT trust the gate.  It recomputes every sha256 here,
 * with the same canonical form world_chain.py uses: JSON, keys sorted, no spaces, "hash" excluded.
 * If a row was edited or removed, the browser says so before the gate does.
 *
 * HONEST LIMIT: crypto.subtle only exists in a SECURE CONTEXT.  http://127.0.0.1 and localhost
 * count as secure; a plain http://LAN-IP does not, and then this file says so instead of pretending.
 */
(function (root) {
  "use strict";

  /* The canonical bytes.  Built by hand, not by JSON.stringify of the whole object, because key
     order is precisely what we refuse to leave to chance. */
  function canon(row) {
    var keys = Object.keys(row).filter(function (k) { return k !== "hash"; }).sort();
    var parts = keys.map(function (k) {
      return JSON.stringify(k) + ":" + JSON.stringify(row[k]);
    });
    return "{" + parts.join(",") + "}";
  }

  function hex(buf) {
    var b = new Uint8Array(buf), s = "";
    for (var i = 0; i < b.length; i++) { s += (b[i] < 16 ? "0" : "") + b[i].toString(16); }
    return s;
  }

  function digest(row) {
    var bytes = new TextEncoder().encode(canon(row));
    return crypto.subtle.digest("SHA-256", bytes).then(hex);
  }

  /* rows: the window, in order.  prev: the hash of the row BEFORE the window (null at the root). */
  function verify(rows, prev) {
    var problems = [], expect = prev, i = 0;
    if (!roots()) {
      return Promise.resolve({ ok: false, checked: 0, problems: ["no SHA-256 in this context -- open 127.0.0.1 or https"],
                               root: null, secure: false });
    }
    function step() {
      if (i >= rows.length) {
        return { ok: problems.length === 0, checked: rows.length, problems: problems,
                 root: rows.length ? rows[0].hash : null, secure: true };
      }
      var row = rows[i], at = i;
      return digest(row).then(function (want) {
        if (row.hash !== want) {
          problems.push("row " + at + ": hash " + String(row.hash).slice(0, 12) + "\u2026 recomputed " +
                        want.slice(0, 12) + "\u2026");
        }
        if ((row.prev || null) !== (expect || null)) {
          problems.push("row " + at + ": prev does not match the row before it -- a row is missing or reordered");
        }
        expect = row.hash;
        i++;
        return step();
      });
    }
    return Promise.resolve().then(step);
  }

  function roots() {
    return typeof crypto !== "undefined" && crypto.subtle && typeof TextEncoder !== "undefined";
  }

  root.OZ_WITNESS = { canon: canon, digest: digest, verify: verify, secure: roots };
  if (typeof module !== "undefined" && module.exports) { module.exports = root.OZ_WITNESS; }
})(typeof window !== "undefined" ? window : globalThis);

// 🔥 Ace · 2026-10-20
