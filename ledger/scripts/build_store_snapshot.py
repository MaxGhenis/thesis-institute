#!/usr/bin/env python3
"""Build the ledger app's vendored store snapshot from a built bundle.

Reads a `ledger build-bundle` output directory plus the ledger repo checkout
it was built from, and writes the app's data/store/ tree:

  packages/<package_id>.json.gz   full consumer-fact rows per package
  index.json.gz                   slim per-fact index for lists and search
  registry.json                   per-package provenance (spec + manifest + report)
  coverage.json                   bundle coverage report (verbatim)
  report.json                     condensed build report (skips, warnings, errors)

Run inside the ledger repo env (needs pyyaml):
  uv run python build_snapshot.py <bundle_dir> <ledger_repo> <app_data_dir>
"""

from __future__ import annotations

import gzip
import hashlib
import json
import shutil
import sys
from collections import defaultdict
from pathlib import Path

import yaml


def main() -> None:
    bundle_dir = Path(sys.argv[1])
    ledger_repo = Path(sys.argv[2])
    out = Path(sys.argv[3]) / "store"
    if out.exists():
        shutil.rmtree(out)
    (out / "packages").mkdir(parents=True)

    report = json.loads((bundle_dir / "reports" / "build_bundle.json").read_text())
    coverage = json.loads((bundle_dir / "coverage.json").read_text())

    # --- per-package full rows + slim index -------------------------------
    by_package: dict[str, list[dict]] = defaultdict(list)
    index: list[dict] = []
    n = 0
    for pkg_facts in sorted((bundle_dir / "sources").glob("*/consumer_facts.jsonl")):
        pkg = pkg_facts.parent.name
        with pkg_facts.open() as f:
            for line in f:
                r = json.loads(line)
                n += 1
                by_package[pkg].append(r)
                om = r.get("observed_measure", {})
                per = r.get("period", {})
                geo = r.get("geography", {})
                index.append(
                    {
                        "k": r["aggregate_fact_key"].split(":", 1)[1],
                        "label": r.get("label", ""),
                        "v": r.get("value"),
                        "u": om.get("unit"),
                        "s": om.get("value_scale"),
                        "pt": per.get("type"),
                        "pv": per.get("value"),
                        "g": geo.get("id"),
                        "gl": geo.get("level"),
                        "gn": geo.get("name"),
                        "pkg": pkg,
                        "src": om.get("source_name"),
                        "c": om.get("source_concept"),
                        "a": r.get("assertion"),
                    }
                )

    key_prefixes = {r["aggregate_fact_key"].split(":", 1)[0] for rows in by_package.values() for r in rows}
    assert key_prefixes == {"ledger.aggregate_fact.v2"}, key_prefixes

    pkg_files = {}
    for pkg, rows in sorted(by_package.items()):
        raw = json.dumps(rows, sort_keys=True, separators=(",", ":")).encode()
        path = out / "packages" / f"{pkg}.json.gz"
        with gzip.GzipFile(path, "wb", mtime=0) as g:
            g.write(raw)
        pkg_files[pkg] = {
            "facts": len(rows),
            "bytes": path.stat().st_size,
            "sha256": hashlib.sha256(raw).hexdigest(),
        }

    raw_index = json.dumps(index, separators=(",", ":")).encode()
    with gzip.GzipFile(out / "index.json.gz", "wb", mtime=0) as g:
        g.write(raw_index)

    # --- registry: spec + manifest provenance per package -----------------
    spec_by_id = {}
    for spec_path in (ledger_repo / "packages").glob("*/*/source_package.yaml"):
        try:
            spec = yaml.safe_load(spec_path.read_text())
        except Exception:
            continue
        spec_by_id[spec.get("package_id")] = (spec, spec_path)

    registry = []
    built_ids = set()
    for sp in report.get("source_packages", []):
        built_ids.add(sp["source"])
        entry = {
            "package_id": sp["source"],
            "built": True,
            "valid": sp.get("valid"),
            "counts": sp.get("counts", {}),
            "facts": pkg_files.get(sp["source"], {}).get("facts", 0),
        }
        spec_info = spec_by_id.get(sp["source"])
        if spec_info:
            spec, spec_path = spec_info
            art = spec.get("artifact", {}) or {}
            entry.update(
                {
                    "label": spec.get("label"),
                    "authority": art.get("source_name"),
                    "source_table": art.get("source_table"),
                    "extraction_method": art.get("extraction_method"),
                    "extracted_at": str(art.get("extracted_at") or ""),
                    "spec_path": str(spec_path.relative_to(ledger_repo)),
                }
            )
            mf_path = spec_path.parent
            resource_dir = art.get("resource_directory")
            manifest_name = art.get("manifest", "manifest.yaml")
            if resource_dir:
                mf_file = ledger_repo / "db" / resource_dir / manifest_name
                if mf_file.exists():
                    try:
                        mf = yaml.safe_load(mf_file.read_text())
                        files = []
                        for year, info in (mf.get("files") or {}).items():
                            if not isinstance(info, dict):
                                continue
                            files.append(
                                {
                                    "year": year,
                                    "filename": info.get("filename"),
                                    "source_url": info.get("source_url"),
                                    "sha256": info.get("sha256"),
                                    "size_bytes": info.get("size_bytes"),
                                    "fetched_at": str(info.get("fetched_at") or ""),
                                }
                            )
                        entry["manifest"] = {
                            "source_page": mf.get("source_page"),
                            "table": mf.get("table"),
                            "dataset": mf.get("dataset"),
                            "files": sorted(files, key=lambda x: str(x["year"])),
                        }
                    except Exception:
                        pass
        registry.append(entry)

    for sk in report.get("skipped_sources", []):
        entry = {
            "package_id": sk["source"],
            "built": False,
            "skip_reason": sk.get("reason"),
        }
        spec_info = spec_by_id.get(sk["source"])
        if spec_info:
            spec, spec_path = spec_info
            art = spec.get("artifact", {}) or {}
            entry.update(
                {
                    "label": spec.get("label"),
                    "authority": art.get("source_name"),
                    "source_table": art.get("source_table"),
                }
            )
        registry.append(entry)

    (out / "registry.json").write_text(
        json.dumps(
            {
                "schemaVersion": "thesis_ledger_app_registry_v1",
                "year": report.get("year"),
                "packages": sorted(registry, key=lambda e: e["package_id"]),
                "packageFiles": pkg_files,
            },
            indent=1,
            sort_keys=True,
        )
    )
    (out / "coverage.json").write_text(json.dumps(coverage, indent=1, sort_keys=True))
    (out / "report.json").write_text(
        json.dumps(
            {
                "schema_version": report.get("schema_version"),
                "year": report.get("year"),
                "errors": report.get("errors", []),
                "warnings": report.get("warnings", []),
                "skipped_sources": [
                    {"source": s["source"], "reason": s.get("reason")}
                    for s in report.get("skipped_sources", [])
                ],
                "source_package_count": len(report.get("source_packages", [])),
            },
            indent=1,
            sort_keys=True,
        )
    )

    total_gz = sum(v["bytes"] for v in pkg_files.values())
    print(
        f"facts={n} packages={len(by_package)} built={len(built_ids)} "
        f"skipped={len(report.get('skipped_sources', []))} "
        f"pkg_gz={total_gz/1e6:.1f}MB index_gz={(out/'index.json.gz').stat().st_size/1e6:.1f}MB"
    )
    biggest = sorted(pkg_files.items(), key=lambda x: -x[1]["bytes"])[:5]
    for name, meta in biggest:
        print(f"  {name}: {meta['facts']} facts, {meta['bytes']/1e6:.1f}MB gz")


if __name__ == "__main__":
    main()
