#!/usr/bin/env python3
"""Merge a drop file (data/*.json) into the live published data and republish.

The backend stores ONE object, so a drop is added by merging rather than replacing:
existing strains keep their own `drop` tag (untagged ones fall into the bench), and
the incoming drop's strains replace any earlier copy of the same drop -- so re-running
this after an edit to the drop file is idempotent rather than duplicating cards.

Usage:
  python tools/publish_drop.py data/middletown_2026_09.json [--dry]

Team key comes from server/.publish_key.local (gitignored) or $TEAM_KEY.
"""
import json
import os
import sys
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
API = "https://kaleidescope-collab-804083036164.us-east1.run.app"
KEYFILE = os.path.join(ROOT, "server", ".publish_key.local")


def team_key():
    k = os.environ.get("TEAM_KEY")
    if k:
        return k.strip()
    if os.path.exists(KEYFILE):
        return open(KEYFILE, encoding="utf-8").read().strip()
    raise SystemExit("No team key: set $TEAM_KEY or create server/.publish_key.local")


def call(path, key, payload=None):
    req = urllib.request.Request(
        API + path,
        data=json.dumps(payload).encode() if payload is not None else None,
        headers={"X-Team-Key": key, "Content-Type": "application/json"},
        method="POST" if payload is not None else "GET",
    )
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.loads(r.read().decode() or "{}")


def main():
    src = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, "data", "middletown_2026_09.json")
    dry = "--dry" in sys.argv
    key = team_key()

    incoming = json.load(open(src, encoding="utf-8"))
    drop, new_strains = incoming["drop"], incoming["strains"]
    did = drop["id"]

    live = call("/data", key)
    live.setdefault("strains", [])
    live.setdefault("drops", [])

    kept = [s for s in live["strains"] if (s.get("drop") or "bench") != did]
    dropped = len(live["strains"]) - len(kept)
    live["strains"] = kept + new_strains

    live["drops"] = [d for d in live["drops"] if d.get("id") != did] + [drop]

    counts = {}
    for s in live["strains"]:
        k = s.get("drop") or "bench"
        counts[k] = counts.get(k, 0) + 1

    print("live before : %d strains, %d drops" % (len(kept) + dropped, len(live["drops"]) - 1))
    print("replacing   : %d existing '%s' strains with %d" % (dropped, did, len(new_strains)))
    print("after       : " + ", ".join("%s=%d" % kv for kv in sorted(counts.items())))

    if dry:
        print("\n--dry: not published.")
        return
    call("/publish", key, live)
    back = call("/data", key)
    print("\npublished. server now reports %d strains across %d drops."
          % (len(back.get("strains", [])), len(back.get("drops", []))))


if __name__ == "__main__":
    main()
