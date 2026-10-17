"""Retract a statement: it stays in the data with status "retracted" and a reason,
so the app shows «Відкликано: <reason>» instead of silently dropping it, and the
pipeline never re-adds it.

    python -m pipeline.retract <id> --reason "<reason>" [--force] [--data data] [--now ISO]

Re-retracting an already retracted id changes nothing unless --force is given
(then only the reason is replaced). An unknown id is an error (exit 1).
"""
from __future__ import annotations

import argparse
import sys
from datetime import datetime, timezone
from pathlib import Path

from .models import STATUS_RETRACTED, parse_iso
from .run import auto_publish_enabled, load_data, write_outputs


RETRACTED = "retracted"
ALREADY = "already"
NOT_FOUND = "not_found"


def retract(data_dir: Path, statement_id: str, reason: str, now: datetime,
            force: bool = False) -> str:
    """Return RETRACTED, ALREADY (no change; use force to replace the reason) or NOT_FOUND."""
    published, pending = load_data(data_dir)
    for st in published + pending:
        if st.id == statement_id:
            if st.status == STATUS_RETRACTED and not force:
                return ALREADY
            st.status = STATUS_RETRACTED
            st.retract_reason = reason
            write_outputs(data_dir, published, pending, now, auto_publish_enabled())
            return RETRACTED
    return NOT_FOUND


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(prog="python -m pipeline.retract")
    ap.add_argument("id")
    ap.add_argument("legacy_reason", nargs="?", metavar="reason",
                    help="deprecated positional form; prefer --reason (works with a leading '-')")
    ap.add_argument("--reason", dest="reason")
    ap.add_argument("--force", action="store_true",
                    help="replace the reason of an already retracted statement")
    ap.add_argument("--data", default=str(Path(__file__).resolve().parent.parent / "data"))
    ap.add_argument("--now", help="override current time (ISO 8601) for the recomputed status")
    args = ap.parse_args(argv)
    reason = (args.reason if args.reason is not None else args.legacy_reason or "").strip()
    if not reason:
        print("A reason is required (--reason).", file=sys.stderr)
        return 2
    now = parse_iso(args.now) if args.now else datetime.now(timezone.utc)
    result = retract(Path(args.data), args.id, reason, now, force=args.force)
    if result == NOT_FOUND:
        print(f"Error: no statement with id {args.id} in {args.data}", file=sys.stderr)
        return 1
    if result == ALREADY:
        print(f"Already retracted: {args.id}; nothing changed (use --force to replace the reason).")
        return 0
    print(f"Retracted {args.id}: {reason}")
    return 0

if __name__ == "__main__":
    sys.exit(main())
