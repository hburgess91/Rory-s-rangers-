"""Publish step (run on dist/ after vite build): bake small pictures into art/manifest.json as data: URLs so the
hosted build stays well under its file limit. Same bytes, same quality. Writes dist/packed_list.json."""
import json, base64, os, sys
LIMIT = 48 * 1024
d = sys.argv[1]
m = json.load(open(f"{d}/art/manifest.json"))
emb = set()
for sec in ("chars", "images", "sheets"):
    for k, v in m.get(sec, {}).items():
        f = v["file"]
        if f.startswith("data:"): continue
        p = f"{d}/art/{f}"
        if os.path.getsize(p) <= LIMIT:
            v["file"] = "data:image/png;base64," + base64.b64encode(open(p, "rb").read()).decode()
            emb.add("art/" + f)
json.dump(m, open(f"{d}/art/manifest.json", "w"), separators=(",", ":"))
json.dump(sorted(emb), open(f"{d}/packed_list.json", "w"))
print(len(emb), "embedded; manifest", os.path.getsize(f"{d}/art/manifest.json") // 1024, "KB")
