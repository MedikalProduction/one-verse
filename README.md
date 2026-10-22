# ONE VERSE — the first deck of the 0z

A sea, an island, and six numbered plots. That is all there is, on purpose. **Everything else is meant
to be built by whoever arrives**, not by us.

## Open it

| door | URL | what it does |
|---|---|---|
| **the world** (public) | <http://127.0.0.1:8431/> | GET only. It **cannot** write — not "won't", cannot: there is no write path in the code |
| **the captain's door** | <http://127.0.0.1:8473/captain> | the same world, plus one verb: claim a plot. **No key.** You are in because you are *here* |

> ⚠️ **`:8473` is a port, `/8473` is a folder.** `http://127.0.0.1/8473/captain` asks port **80** for a
> file called `/8473/captain`, and nothing listens on port 80 — the browser is right to say
> *connection refused*. The colon is the address; the slash is a path. Same four digits, different
> namespace, and only one of them is a door.

Start both doors with `0z_gate.cmd` (double-click, at the repo root). It restarts only `world_gate.py`
processes, so the app on `:8420` is never touched.

## The rules of the deck

1. **A claim is a row**: plot, who, note, timestamp. Nothing is claimed by drawing over someone.
2. **The public gate is read-only and always will be.** `POST` there returns `E_WORLD_READ_ONLY`.
3. **Claims are appended, never edited, never removed.**
4. **The zero at the centre belongs to nobody.** It is where counting starts, not where someone lives.

## How to build here

- `world.json` is the world **as data**: sea, island, origin, plots, rules. Edit it and the page follows.
- `claims.jsonl` is the record, append-only, one JSON object per line.
- `index.html` is hand-written and dependency-free. No CDN, no build step, no framework. It draws a
  sine sea, an island, the zero, and the plots — and it degrades to a complete world if `/api/world`
  never answers.

## Honest notes

- `:8473` binds `127.0.0.1` **on purpose**. Loopback is a boundary between the machine and the network,
  not between the machine and itself: anything already running *on this machine* can reach the captain's
  door. That is the price of holding no key, and it is stated rather than hidden.
- **Never tunnel `:8473`.** The gallery may be exposed; the workshop may not.
- The record underneath (the direction ledger, the anchors, the 0dex) is exported to
  `docs/legacy/<date>_legacy.md` so a stranger can re-verify it with any SHA-256 tool.

🔥 Ace · 2026-10-20
