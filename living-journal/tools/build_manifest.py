#!/usr/bin/env python3
"""
build_manifest.py — regenerate manifest.json for the Living Journal viewer.

The viewer (index.html) is static; it reads manifest.json to render. This
script walks fragments/ and entries/ and produces a single JSON the page
can fetch. Run after any weave pass, or on a schedule.

Usage:  python3 tools/build_manifest.py
"""

import json
import re
from pathlib import Path
from datetime import datetime, timezone

ROOT = Path(__file__).resolve().parent.parent
FRAGMENTS_DIR = ROOT / "fragments"
ENTRIES_DIR = ROOT / "entries"
MANIFEST = ROOT / "manifest.json"

FRONTMATTER_RE = re.compile(r"^---\s*\n(.*?)\n---\s*\n(.*)$", re.DOTALL)


def parse_entry(path: Path) -> dict:
    raw = path.read_text(encoding="utf-8")
    m = FRONTMATTER_RE.match(raw)
    if not m:
        return {"id": path.stem, "title": path.stem, "status": "seedling",
                "source_fragments": [], "last_woven": None, "preview": raw[:240]}

    fm_text, body = m.group(1), m.group(2)
    fm = parse_simple_yaml(fm_text)

    preview = body.strip()
    if len(preview) > 320:
        preview = preview[:320].rstrip() + "…"

    return {
        "id": fm.get("id", path.stem),
        "title": fm.get("title", path.stem),
        "status": fm.get("status", "seedling"),
        "source_fragments": fm.get("source_fragments", []) or [],
        "last_woven": fm.get("last_woven"),
        "preview": preview,
    }


def parse_simple_yaml(text: str) -> dict:
    """Tiny YAML parser — handles flat keys, scalars, and inline lists.
    Sufficient for the journal's frontmatter shape."""
    out = {}
    current_key = None
    for line in text.splitlines():
        if not line.strip() or line.lstrip().startswith("#"):
            continue
        if line.startswith("  - ") and current_key:
            out.setdefault(current_key, []).append(line[4:].strip())
            continue
        if ":" in line and not line.startswith(" "):
            key, _, val = line.partition(":")
            key = key.strip()
            val = val.strip()
            if val == "":
                out[key] = []
                current_key = key
            elif val.startswith("[") and val.endswith("]"):
                inner = val[1:-1].strip()
                out[key] = [s.strip() for s in inner.split(",") if s.strip()] if inner else []
                current_key = None
            else:
                out[key] = val.strip("'\"")
                current_key = None
    return out


def parse_fragment(path: Path) -> dict:
    data = json.loads(path.read_text(encoding="utf-8"))
    return {
        "id": data.get("id", path.stem),
        "captured_at": data.get("captured_at"),
        "text": data.get("text", ""),
        "kind": data.get("kind", "memory"),
        "thread_ids": data.get("thread_ids", []) or [],
        "status": data.get("status", "unwoven"),
    }


def main():
    fragments = sorted(
        (parse_fragment(p) for p in FRAGMENTS_DIR.glob("frag-*.json")),
        key=lambda f: f.get("captured_at") or "",
    )
    entries = sorted(
        (parse_entry(p) for p in ENTRIES_DIR.glob("entry-*.md")),
        key=lambda e: e.get("last_woven") or e.get("id"),
        reverse=True,
    )

    manifest = {
        "version": "1.0",
        "generated_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "entries": entries,
        "fragments": fragments,
    }
    MANIFEST.write_text(json.dumps(manifest, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"manifest written: {len(entries)} entries, {len(fragments)} fragments")


if __name__ == "__main__":
    main()
