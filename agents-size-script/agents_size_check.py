#!/usr/bin/env python3
"""Check whether AGENTS.md plus docs markdown fits within a size limit."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Iterable


DEFAULT_LIMIT_KB = 23
MARKDOWN_SUFFIXES = {".md", ".markdown"}


def find_agents_file(root: Path) -> Path | None:
    preferred = [root / "AGENTS.md", root / "agents.md"]
    for path in preferred:
        if path.is_file():
            return path

    matches = sorted(
        (
            path
            for path in root.iterdir()
            if path.is_file() and path.name.lower() == "agents.md"
        ),
        key=lambda path: path.name,
    )
    return matches[0] if matches else None


def markdown_files_under(directory: Path) -> Iterable[Path]:
    if not directory.exists():
        return []

    return sorted(
        (
            path
            for path in directory.rglob("*")
            if path.is_file() and path.suffix.lower() in MARKDOWN_SUFFIXES
        ),
        key=lambda path: path.as_posix().lower(),
    )


def file_size(path: Path) -> int:
    return path.stat().st_size


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Check AGENTS.md and docs markdown against a size limit."
    )
    parser.add_argument(
        "--root",
        type=Path,
        default=Path.cwd(),
        help="Repository root. Defaults to the current working directory.",
    )
    parser.add_argument(
        "--limit-kb",
        type=int,
        default=DEFAULT_LIMIT_KB,
        help=f"Maximum combined size in KiB. Defaults to {DEFAULT_LIMIT_KB}.",
    )
    args = parser.parse_args()

    root = args.root.resolve()
    limit_bytes = args.limit_kb * 1024
    agents_file = find_agents_file(root)
    docs_dir = root / "docs"

    missing = []
    if agents_file is None:
        missing.append(str(root / "AGENTS.md"))

    files = [agents_file] if agents_file is not None else []
    files.extend(markdown_files_under(docs_dir))

    file_results = [
        {
            "path": str(path.relative_to(root)),
            "bytes": file_size(path),
        }
        for path in files
    ]
    total_bytes = sum(item["bytes"] for item in file_results)
    inbound = not missing and total_bytes <= limit_bytes

    result = {
        "inbound": inbound,
        "limit_bytes": limit_bytes,
        "total_bytes": total_bytes,
        "remaining_bytes": limit_bytes - total_bytes,
        "files": file_results,
        "missing": missing,
    }

    print(json.dumps(result, indent=2))

    if missing:
        return 2
    return 0 if inbound else 1


if __name__ == "__main__":
    raise SystemExit(main())
