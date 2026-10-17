"""Retract a statement: it stays in the data with status "retracted" and a reason,
so the app shows «Відкликано: <reason>» instead of silently dropping it, and the
pipeline never re-adds it.

    python -m pipeline.retract <id> "<reason>" [--data data] [--now ISO]
"""
from __future__ import annotations

import argparse
import sys
from datetime import datetime, timezone
from pathlib import Path

from .models import STATUS_RETRACTED, parse_iso
from .run import auto_publish_enabled, load_data, write_outputs


def retract(data_dir: Path, statement_id: str, reason: str, now: datetime) -> bool:
    published, pending = load_data(data_dir)
    for st in published + pending:
        if st.id == statement_id:
            st.status = STATUS_RETRACTED
            st.retract_reason = reason
            write_outputs(data_dir, published, pending, now, auto_publish_enabled())
            return True
    return False


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(prog="python -m pipeline.retract")
    ap.add_argument("id")
    ap.add_argument("reason")
    ap.add_argument("--data", default=str(Path(__file__).resolve().parent.parent / "data"))
    ap.add_argument("--now", help="override current time (ISO 8601) for the recomputed status")
    args = ap.parse_args(argv)
    if not args.reason.strip():
        print("A reason is required.", file=sys.stderr)
        return 2
    now = parse_iso(args.now) if args.now else datetime.now(timezone.utc)
    if not retract(Path(args.data), args.id, args.reason.strip(), now):
        print(f"No statement with id {args.id} in {args.data}", file=sys.stderr)
        return 1
    print(f"Retracted {args.id}: {args.reason.strip()}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
