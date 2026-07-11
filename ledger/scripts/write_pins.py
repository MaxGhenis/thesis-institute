#!/usr/bin/env python3
"""Write data/pins.json from environment provided by refresh-data.sh."""

import datetime
import gzip
import hashlib
import json
import os
import pathlib

app = pathlib.Path(os.environ["APP_DIR"])
journal_bytes = (app / "data/journal/official_observations.jsonl").read_bytes()
availability = json.loads((app / "data/journal/availability.json").read_text())
with gzip.open(app / "data/store/index.json.gz") as f:
    index = json.load(f)
registry = json.loads((app / "data/store/registry.json").read_text())
report = json.loads((app / "data/store/report.json").read_text())

line_count = journal_bytes.count(b"\n")
assert len(availability["rows"]) == line_count, "availability misaligned"
assert (
    availability["jsonlSha256"] == hashlib.sha256(journal_bytes).hexdigest()
), "availability is for a different journal state"

pins = {
    "schemaVersion": "thesis_ledger_app_pins_v1",
    "retrievedAtUtc": datetime.datetime.now(datetime.timezone.utc).strftime(
        "%Y-%m-%dT%H:%M:%SZ"
    ),
    "journal": {
        "repo": "PolicyEngine/ledger",
        "branch": "codex/thesis-ledger-facts",
        "commit": os.environ["JSHA"],
        "jsonlSha256": hashlib.sha256(journal_bytes).hexdigest(),
        "lineCount": line_count,
    },
    "availability": {
        "repo": "MaxGhenis/brier",
        "commit": os.environ["BSHA"],
        "path": "records/ledger/availability.json",
        "sha256": hashlib.sha256(
            (app / "data/journal/availability.json").read_bytes()
        ).hexdigest(),
    },
    "bundle": {
        "repo": "PolicyEngine/ledger",
        "branch": "main",
        "commit": os.environ["MSHA"],
        "command": f"ledger build-bundle --year {os.environ['BUNDLE_YEAR']}",
        "year": int(os.environ["BUNDLE_YEAR"]),
        "factCount": len(index),
        "packageCount": len(registry["packageFiles"]),
        "skippedPackageCount": len(report["skipped_sources"]),
        "builtAtUtc": datetime.datetime.now(datetime.timezone.utc).strftime(
            "%Y-%m-%dT%H:%M:%SZ"
        ),
    },
}
(app / "data/pins.json").write_text(json.dumps(pins, indent=2, sort_keys=True))
print(json.dumps(pins, indent=1))
