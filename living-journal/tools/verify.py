#!/usr/bin/env python3
"""
verify.py — check Living Journal invariants.

Exit 0 if all checks pass; exit 1 if any violation is found.
Run after every modifying operation, per AI-CHARTER.md §6.

Mechanical checks (best-effort; some invariants are semantic):
  C1  Every fragment file is valid JSON with required immutable fields.
  C2  Fragment status is in {unwoven, woven}.
  C3  Every entry has well-formed frontmatter and a recognized status.
  C4  Every source_fragment referenced by an entry resolves to a real fragment.
  C5  Every thread.fragment_ids resolves; every thread.entry_id resolves.
  C6  Every fragment listed in a thread has that thread's id in its thread_ids.
  C7  Entry frontmatter history is non-empty when status != seedling.
  C8  No orphaned archive directories without their entry.
"""

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
FRAGMENTS = ROOT / "fragments"
ENTRIES = ROOT / "entries"
THREADS = ROOT / "threads.json"
ARCHIVE = ENTRIES / ".archive"

REQUIRED_FRAGMENT_FIELDS = ("id", "captured_at", "text", "kind", "status")
VALID_FRAGMENT_STATUS = {"unwoven", "woven"}
VALID_ENTRY_STATUS = {"seedling", "sprouting", "blooming", "crystallized", "dissolved"}
FM_RE = re.compile(r"^---\s*\n(.*?)\n---", re.DOTALL)

violations: list[str] = []


def load_fragments() -> dict[str, dict]:
    out = {}
    for p in sorted(FRAGMENTS.glob("frag-*.json")):
        try:
            data = json.loads(p.read_text(encoding="utf-8"))
        except Exception as e:
            violations.append(f"C1  {p.name}: invalid JSON ({e})")
            continue
        for field in REQUIRED_FRAGMENT_FIELDS:
            if field not in data:
                violations.append(f"C1  {p.name}: missing required field '{field}'")
        if data.get("status") not in VALID_FRAGMENT_STATUS:
            violations.append(f"C2  {p.name}: invalid status '{data.get('status')}'")
        out[data.get("id", p.stem)] = data
    return out


def parse_frontmatter(raw: str) -> dict | None:
    m = FM_RE.match(raw)
    if not m:
        return None
    fm = {}
    current_key = None
    for line in m.group(1).splitlines():
        if not line.strip() or line.lstrip().startswith("#"):
            continue
        if line.startswith("  - ") and current_key:
            fm.setdefault(current_key, []).append(line[4:].strip())
            continue
        if ":" in line and not line.startswith(" "):
            key, _, val = line.partition(":")
            key = key.strip()
            val = val.strip()
            if val == "":
                fm[key] = []
                current_key = key
            else:
                fm[key] = val.strip("'\"")
                current_key = None
    return fm


def load_entries() -> dict[str, dict]:
    out = {}
    for p in sorted(ENTRIES.glob("entry-*.md")):
        raw = p.read_text(encoding="utf-8")
        fm = parse_frontmatter(raw)
        if fm is None:
            violations.append(f"C3  {p.name}: missing or malformed frontmatter")
            continue
        status = fm.get("status")
        if status not in VALID_ENTRY_STATUS:
            violations.append(f"C3  {p.name}: invalid status '{status}'")
        if status and status != "seedling" and not fm.get("history"):
            violations.append(f"C7  {p.name}: status '{status}' requires history entries")
        out[fm.get("id", p.stem)] = fm
    return out


def check_references(fragments: dict, entries: dict) -> None:
    # C4: source_fragments resolve
    for eid, fm in entries.items():
        for fid in fm.get("source_fragments", []) or []:
            if fid not in fragments:
                violations.append(f"C4  entry {eid}: references unknown fragment '{fid}'")

    # C5 + C6: threads consistency
    if not THREADS.exists():
        return
    try:
        threads = json.loads(THREADS.read_text(encoding="utf-8"))
    except Exception as e:
        violations.append(f"C5  threads.json: invalid JSON ({e})")
        return
    for t in threads.get("threads", []):
        tid = t.get("id", "<unknown>")
        for fid in t.get("fragment_ids", []) or []:
            if fid not in fragments:
                violations.append(f"C5  thread {tid}: unknown fragment '{fid}'")
                continue
            frag_threads = fragments[fid].get("thread_ids", []) or []
            if tid not in frag_threads:
                violations.append(
                    f"C6  fragment {fid} listed in thread {tid} but its thread_ids={frag_threads}"
                )
        eid = t.get("entry_id")
        if eid and eid not in entries:
            violations.append(f"C5  thread {tid}: unknown entry '{eid}'")


def check_archive(entries: dict) -> None:
    if not ARCHIVE.exists():
        return
    for d in ARCHIVE.iterdir():
        if not d.is_dir():
            continue
        if d.name not in entries:
            violations.append(f"C8  orphaned archive directory: {d.name}")


def main() -> int:
    if not FRAGMENTS.exists() or not ENTRIES.exists():
        print("error: not at journal root (no fragments/ or entries/)", file=sys.stderr)
        return 2
    fragments = load_fragments()
    entries = load_entries()
    check_references(fragments, entries)
    check_archive(entries)

    if violations:
        print("VIOLATIONS:")
        for v in violations:
            print(f"  {v}")
        print(f"\n{len(violations)} violation(s).")
        return 1

    print(f"clean: {len(fragments)} fragment(s), {len(entries)} entr{'y' if len(entries)==1 else 'ies'} — invariants hold")
    return 0


if __name__ == "__main__":
    sys.exit(main())
