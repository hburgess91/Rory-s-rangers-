#!/usr/bin/env node
// Dev-only helper. Reads the private Messenger exports from ./source/*.json (gitignored),
// fixes Facebook's mojibake, dedupes across files and writes a searchable CHAT_INDEX.txt
// (also gitignored). Nothing here is bundled into the game.
//
//   node scripts/build-chat-index.mjs            -> writes CHAT_INDEX.txt
//   node scripts/build-chat-index.mjs cheesegate -> prints matching lines with timestamps

import fs from "node:fs";
import path from "node:path";

const dir = path.resolve("source");
if (!fs.existsSync(dir)) {
  console.error("Put the Messenger exports (K1.json … K4.json) in ./source first.");
  process.exit(1);
}

const fix = (s) => {
  try {
    return Buffer.from(s, "latin1").toString("utf8");
  } catch {
    return s;
  }
};

const seen = new Set();
const rows = [];
for (const f of fs.readdirSync(dir).filter((x) => x.endsWith(".json"))) {
  const data = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));
  for (const m of data.messages ?? []) {
    const key = `${m.sender_name}|${m.timestamp_ms}`;
    if (seen.has(key)) continue;
    seen.add(key);
    let c = m.content;
    if (c == null) c = m.photos ? "[photo]" : m.audio_files ? "[audio]" : m.videos ? "[video]" : m.sticker ? "[sticker]" : "[?]";
    else c = fix(c);
    rows.push({ t: m.timestamp_ms, f, who: fix(m.sender_name), c: c.replace(/\n/g, " / "), r: (m.reactions ?? []).length });
  }
}
rows.sort((a, b) => a.t - b.t);
const fmt = (r) => `${new Date(r.t).toISOString().slice(0, 16)} ${r.t} | ${r.who}: ${r.c}${r.r ? ` [r${r.r}]` : ""}`;

const q = process.argv[2];
if (q) {
  const re = new RegExp(q, "i");
  for (const r of rows) if (re.test(r.c)) console.log(fmt(r));
} else {
  fs.writeFileSync("CHAT_INDEX.txt", rows.map(fmt).join("\n"));
  console.log(`Wrote CHAT_INDEX.txt (${rows.length} messages). It is gitignored. Curate lines into src/content/archive/canonQuotes.ts.`);
}
