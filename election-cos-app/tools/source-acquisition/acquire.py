#!/usr/bin/env python3
"""
Election Campaign OS — source acquisition for MDB and IEC datasets.

WHAT THIS REPLACES
------------------
A supplied ETL script (session 33) looped over six provinces and five
election years, printed a ">  Fetching ..." line for each of the thirty
pairs, and then `pass`. Every network call in it was commented out. Run as
given it printed thirty progress lines and "ETL Pipeline complete. The
local folder is ready for Drive synchronization." — and downloaded
nothing.

That is the defect this file exists to correct, and it is a defect of
reporting more than of code. A pipeline that announces per-item progress
and then declares completion is one somebody runs, sees green, and
believes. So the rules here are:

  1. Nothing is reported as fetched unless bytes were written and
     verified.
  2. The run exits non-zero if any selected source failed. There is no
     completion message on a failed run.
  3. Every run writes a manifest naming each source, its outcome, its
     byte count and its SHA-256 — so "what did we actually get" is
     answerable afterwards, not a matter of remembering.

WHAT IT DELIBERATELY DOES NOT DO
--------------------------------
It does not invent endpoints. `sources.json` carries a `status` per
source: CONFIRMED means a person has fetched it and recorded what came
back; UNCONFIRMED means it came from a planning note and has never been
tested. Both are downloadable, both are labelled in the output and in the
manifest, and the summary always says how many unconfirmed sources were
involved. Unconfirmed is not a warning to click past — it is the
difference between a dataset you can cite and one you cannot.

It does not parse or reshape anything. Extract only. Transforming a
gazette PDF or an IEC results file into this product's seed format is a
separate job with its own verification, and `docs/nw405-seed-data.md`
describes how that was done by hand for the one municipality this build
holds.

REQUIREMENTS
------------
Python 3.9+. Standard library only — no requests, pandas or
beautifulsoup4. The original needed all three and used pandas for
nothing; a dependency install is one more thing between an operator and a
working download.

USAGE
-----
  python acquire.py --probe                  # reachability only, writes nothing
  python acquire.py --fetch                  # download everything
  python acquire.py --fetch --province NW    # one province
  python acquire.py --fetch --only mdb-nw-2026-gazette
  python acquire.py --self-test              # prove the verifier, no network

  --out DIR      where to write (default ./07_Geospatial_and_Electoral_Data)
  --timeout N    per-request seconds (default 60)
  --retries N    attempts per source (default 3, exponential backoff)

Credentials, where a source needs them, come from the environment named
in `sources.json` (`auth_env`). None are stored in this repository and
none are printed.

EXIT CODES
----------
  0  every selected source succeeded
  1  at least one selected source failed
  2  configuration or environment problem — nothing was attempted
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import shutil
import ssl
import sys
import tempfile
import threading
import time
import urllib.error
import urllib.request
from dataclasses import dataclass, field
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path
from typing import Any

HERE = Path(__file__).resolve().parent
DEFAULT_OUT = Path.cwd() / "07_Geospatial_and_Electoral_Data"
USER_AGENT = "ElectionCampaignOS-source-acquisition/1.0 (+operator-run; contact your administrator)"

# Leading bytes that prove a payload is the kind of file it claims to be.
# A portal that answers an unknown path with an HTML error page returns
# 200 and looks like a success; this is what catches that.
MAGIC = {
    "pdf": b"%PDF-",
    "zip": b"PK\x03\x04",  # also .shp bundles, .xlsx, .docx
}


# --------------------------------------------------------------------------
# outcomes
# --------------------------------------------------------------------------

OK = "OK"
FAILED_HTTP = "FAILED_HTTP"
FAILED_NETWORK = "FAILED_NETWORK"
FAILED_VERIFY = "FAILED_VERIFY"
SKIPPED_PRESENT = "SKIPPED_PRESENT"
MISSING_CREDENTIAL = "MISSING_CREDENTIAL"

SUCCESSES = {OK, SKIPPED_PRESENT}


@dataclass
class Result:
    source_id: str
    outcome: str
    detail: str = ""
    url: str = ""
    path: str | None = None
    bytes_written: int = 0
    sha256: str | None = None
    content_type: str | None = None
    http_status: int | None = None
    source_status: str = "UNCONFIRMED"
    attempts: int = 0

    def as_dict(self) -> dict[str, Any]:
        return {k: v for k, v in self.__dict__.items()}


@dataclass
class Source:
    id: str
    url: str
    province: str
    category: str
    filename: str
    status: str = "UNCONFIRMED"
    note: str = ""
    auth_env: str | None = None
    expect: dict[str, Any] = field(default_factory=dict)

    @property
    def relative_path(self) -> Path:
        return Path(f"{self.province}_Electoral_Data") / self.category / self.filename


# --------------------------------------------------------------------------
# registry
# --------------------------------------------------------------------------


def load_sources(path: Path) -> list[Source]:
    if not path.exists():
        raise FileNotFoundError(f"No source registry at {path}")
    raw = json.loads(path.read_text(encoding="utf-8"))
    sources: list[Source] = []
    seen: set[str] = set()
    for entry in raw.get("sources", []):
        for required in ("id", "url", "province", "category", "filename"):
            if not entry.get(required):
                raise ValueError(f"Source entry missing '{required}': {entry!r}")
        if entry["id"] in seen:
            raise ValueError(f"Duplicate source id: {entry['id']}")
        seen.add(entry["id"])
        if entry.get("status", "UNCONFIRMED") not in ("CONFIRMED", "UNCONFIRMED"):
            raise ValueError(f"{entry['id']}: status must be CONFIRMED or UNCONFIRMED")
        sources.append(
            Source(
                id=entry["id"],
                url=entry["url"],
                province=entry["province"],
                category=entry["category"],
                filename=entry["filename"],
                status=entry.get("status", "UNCONFIRMED"),
                note=entry.get("note", ""),
                auth_env=entry.get("auth_env"),
                expect=entry.get("expect", {}),
            )
        )
    if not sources:
        raise ValueError("Source registry contains no sources.")
    return sources


# --------------------------------------------------------------------------
# verification
# --------------------------------------------------------------------------


def verify_payload(head: bytes, total_bytes: int, content_type: str | None, expect: dict[str, Any]) -> str | None:
    """Return a failure reason, or None when the payload passes.

    Deliberately blunt and cheap. It is not trying to validate a gazette;
    it is trying to notice that a portal answered with an HTML error page,
    an empty file, or a login redirect — the three things that otherwise
    land on disk wearing the right filename.
    """
    min_bytes = int(expect.get("min_bytes", 1))
    if total_bytes < min_bytes:
        return f"{total_bytes} bytes, expected at least {min_bytes}"

    wanted_type = expect.get("content_type")
    if wanted_type and content_type and not content_type.lower().startswith(wanted_type.lower()):
        return f"content-type {content_type!r}, expected {wanted_type!r}"

    magic = expect.get("magic")
    if magic:
        prefix = MAGIC.get(magic)
        if prefix is None:
            return f"unknown magic kind {magic!r} in registry"
        if not head.startswith(prefix):
            got = head[:8]
            return f"does not begin with {magic.upper()} signature (starts {got!r})"

    # Only parseable when the whole body fitted in the sniffed head. A
    # large JSON file is not re-read here: the point of this function is a
    # cheap check on the leading bytes, and streaming the file twice to
    # parse it would cost more than it catches.
    if expect.get("json") and total_bytes <= len(head):
        try:
            json.loads(head.decode("utf-8"))
        except (UnicodeDecodeError, json.JSONDecodeError) as exc:
            return f"not parseable as JSON: {exc}"

    # An HTML document where a dataset was expected is the classic silent
    # failure: HTTP 200, plausible size, wrong thing entirely.
    if expect.get("reject_html", True):
        sniff = head[:512].lstrip().lower()
        if sniff.startswith(b"<!doctype html") or sniff.startswith(b"<html"):
            return "server returned an HTML page where a dataset was expected"

    return None


# --------------------------------------------------------------------------
# fetching
# --------------------------------------------------------------------------


def build_request(source: Source, method: str = "GET") -> urllib.request.Request | Result:
    headers = {"User-Agent": USER_AGENT, "Accept": "*/*"}
    if source.auth_env:
        token = os.environ.get(source.auth_env, "").strip()
        if not token:
            return Result(
                source_id=source.id,
                outcome=MISSING_CREDENTIAL,
                detail=f"set {source.auth_env} in the environment; it is not stored in this repository",
                url=source.url,
                source_status=source.status,
            )
        headers["Authorization"] = f"Bearer {token}"
    return urllib.request.Request(source.url, headers=headers, method=method)


def probe(source: Source, timeout: int) -> Result:
    """Reachability only. Writes nothing, downloads no body."""
    request = build_request(source, method="GET")
    if isinstance(request, Result):
        return request
    try:
        with urllib.request.urlopen(request, timeout=timeout, context=ssl.create_default_context()) as response:
            head = response.read(512)
            return Result(
                source_id=source.id,
                outcome=OK,
                detail="reachable",
                url=source.url,
                content_type=response.headers.get("Content-Type"),
                http_status=response.status,
                source_status=source.status,
                attempts=1,
            )
    except urllib.error.HTTPError as exc:
        return Result(
            source_id=source.id,
            outcome=FAILED_HTTP,
            detail=f"HTTP {exc.code} {exc.reason}",
            url=source.url,
            http_status=exc.code,
            source_status=source.status,
            attempts=1,
        )
    except Exception as exc:  # noqa: BLE001 — every failure is reportable, none is fatal
        return Result(
            source_id=source.id,
            outcome=FAILED_NETWORK,
            detail=f"{type(exc).__name__}: {exc}",
            url=source.url,
            source_status=source.status,
            attempts=1,
        )


def fetch(source: Source, out_dir: Path, timeout: int, retries: int, force: bool) -> Result:
    destination = out_dir / source.relative_path
    if destination.exists() and not force:
        digest = sha256_of(destination)
        return Result(
            source_id=source.id,
            outcome=SKIPPED_PRESENT,
            detail="already present; pass --force to replace",
            url=source.url,
            path=str(destination),
            bytes_written=destination.stat().st_size,
            sha256=digest,
            source_status=source.status,
        )

    destination.parent.mkdir(parents=True, exist_ok=True)
    last: Result | None = None

    for attempt in range(1, retries + 1):
        request = build_request(source)
        if isinstance(request, Result):
            return request  # a missing credential will not improve on retry

        temporary = destination.with_suffix(destination.suffix + ".part")
        try:
            with urllib.request.urlopen(request, timeout=timeout, context=ssl.create_default_context()) as response:
                content_type = response.headers.get("Content-Type")
                digest = hashlib.sha256()
                written = 0
                head = b""
                with temporary.open("wb") as handle:
                    while True:
                        chunk = response.read(64 * 1024)
                        if not chunk:
                            break
                        if len(head) < 512:
                            head += chunk[: 512 - len(head)]
                        handle.write(chunk)
                        digest.update(chunk)
                        written += len(chunk)

            problem = verify_payload(head, written, content_type, source.expect)
            if problem:
                temporary.unlink(missing_ok=True)
                last = Result(
                    source_id=source.id,
                    outcome=FAILED_VERIFY,
                    detail=problem,
                    url=source.url,
                    bytes_written=written,
                    content_type=content_type,
                    http_status=response.status,
                    source_status=source.status,
                    attempts=attempt,
                )
                # A wrong payload is usually wrong every time. One retry is
                # enough to rule out a truncated transfer.
                if attempt >= min(2, retries):
                    return last
            else:
                # Rename only after verification, so a half-written or
                # wrong file never occupies the real filename.
                temporary.replace(destination)
                return Result(
                    source_id=source.id,
                    outcome=OK,
                    detail="downloaded and verified",
                    url=source.url,
                    path=str(destination),
                    bytes_written=written,
                    sha256=digest.hexdigest(),
                    content_type=content_type,
                    http_status=response.status,
                    source_status=source.status,
                    attempts=attempt,
                )

        except urllib.error.HTTPError as exc:
            temporary.unlink(missing_ok=True)
            last = Result(
                source_id=source.id,
                outcome=FAILED_HTTP,
                detail=f"HTTP {exc.code} {exc.reason}",
                url=source.url,
                http_status=exc.code,
                source_status=source.status,
                attempts=attempt,
            )
            if exc.code in (400, 401, 403, 404, 410):
                return last  # retrying a refusal just refuses again
        except Exception as exc:  # noqa: BLE001
            temporary.unlink(missing_ok=True)
            last = Result(
                source_id=source.id,
                outcome=FAILED_NETWORK,
                detail=f"{type(exc).__name__}: {exc}",
                url=source.url,
                source_status=source.status,
                attempts=attempt,
            )

        if attempt < retries:
            time.sleep(2 ** (attempt - 1))

    assert last is not None
    return last


def sha256_of(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(64 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


# --------------------------------------------------------------------------
# reporting
# --------------------------------------------------------------------------


def write_manifest(out_dir: Path, mode: str, results: list[Result]) -> Path:
    runs = out_dir / "_runs"
    runs.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    path = runs / f"{mode}-{stamp}.json"
    payload = {
        "mode": mode,
        "ranAt": datetime.now(timezone.utc).isoformat(),
        "tool": "acquire.py 1.0",
        "succeeded": sum(1 for r in results if r.outcome in SUCCESSES),
        "failed": sum(1 for r in results if r.outcome not in SUCCESSES),
        "fromUnconfirmedSources": sum(
            1 for r in results if r.outcome in SUCCESSES and r.source_status == "UNCONFIRMED"
        ),
        "results": [r.as_dict() for r in results],
    }
    path.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    return path


def report(mode: str, results: list[Result], manifest: Path | None) -> int:
    """Print the outcome. Never claims a completion that did not happen."""
    width = max((len(r.source_id) for r in results), default=10)
    print()
    for result in results:
        mark = "ok  " if result.outcome in SUCCESSES else "FAIL"
        flag = " [unconfirmed source]" if result.source_status == "UNCONFIRMED" else ""
        size = f"  {result.bytes_written:,} bytes" if result.bytes_written else ""
        print(f"  {mark}  {result.source_id:<{width}}  {result.outcome}{size}  {result.detail}{flag}")

    succeeded = [r for r in results if r.outcome in SUCCESSES]
    failed = [r for r in results if r.outcome not in SUCCESSES]
    unconfirmed = [r for r in succeeded if r.source_status == "UNCONFIRMED"]

    print()
    print(f"  {len(succeeded)} of {len(results)} sources succeeded.")
    if unconfirmed:
        print(
            f"  {len(unconfirmed)} came from sources marked UNCONFIRMED — nobody has verified that URL "
            f"returns what the registry says it does. Check the files before citing them, then set "
            f'"status": "CONFIRMED" in sources.json.'
        )
    if manifest:
        print(f"  Manifest: {manifest}")

    if failed:
        print()
        print(f"  {len(failed)} FAILED. This run did not complete.")
        for result in failed:
            print(f"    - {result.source_id}: {result.outcome} — {result.detail}")
        return 1

    if mode == "probe":
        print("  Every source responded. Nothing was downloaded — this was a probe.")
    else:
        print("  Every selected source was downloaded and verified.")
    return 0


# --------------------------------------------------------------------------
# self-test — proves the verifier without touching the network
# --------------------------------------------------------------------------


class _SelfTestHandler(BaseHTTPRequestHandler):
    ROUTES: dict[str, tuple[int, str, bytes]] = {}

    def do_GET(self) -> None:  # noqa: N802 — BaseHTTPRequestHandler's interface
        status, content_type, body = self.ROUTES.get(self.path, (404, "text/plain", b"no"))
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, *_args: Any) -> None:
        return


def self_test() -> int:
    """Serve known-good and known-bad payloads on localhost and check the
    verifier calls each one correctly.

    This is the part of the original script that could not have been
    demonstrated at all, because there was nothing to demonstrate. It runs
    with no external network and no credentials, so it is the same result
    on any machine.
    """
    good_pdf = b"%PDF-1.7\n" + b"x" * 4096
    html_error = b"<!DOCTYPE html><html><body>Page not found</body></html>" + b" " * 4096
    _SelfTestHandler.ROUTES = {
        "/good.pdf": (200, "application/pdf", good_pdf),
        "/html-error.pdf": (200, "text/html", html_error),
        "/empty.pdf": (200, "application/pdf", b""),
        "/truncated.pdf": (200, "application/pdf", b"%PDF-1.7\n"),
        "/notpdf.pdf": (200, "application/pdf", b"NOTAPDF" + b"x" * 4096),
        "/server-error.pdf": (500, "text/plain", b"boom"),
    }
    server = HTTPServer(("127.0.0.1", 0), _SelfTestHandler)
    port = server.server_port
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()

    expect = {"content_type": "application/pdf", "min_bytes": 1024, "magic": "pdf"}
    cases = [
        ("good.pdf", OK, "a real PDF of a plausible size"),
        ("html-error.pdf", FAILED_VERIFY, "an HTML error page wearing a .pdf filename"),
        ("empty.pdf", FAILED_VERIFY, "a zero-byte response"),
        ("truncated.pdf", FAILED_VERIFY, "a PDF header and nothing else"),
        ("notpdf.pdf", FAILED_VERIFY, "right size, right content-type, wrong bytes"),
        ("server-error.pdf", FAILED_HTTP, "an upstream 500"),
    ]

    failures = 0
    with tempfile.TemporaryDirectory() as temp:
        out = Path(temp)
        print("\n  Self-test — the verifier, against a local server:\n")
        for name, expected, description in cases:
            source = Source(
                id=name,
                url=f"http://127.0.0.1:{port}/{name}",
                province="ZZ",
                category="SelfTest",
                filename=name,
                status="CONFIRMED",
                expect=expect,
            )
            result = fetch(source, out, timeout=10, retries=2, force=True)
            passed = result.outcome == expected
            failures += 0 if passed else 1
            mark = "ok  " if passed else "FAIL"
            print(f"  {mark}  {description:<48} -> {result.outcome} ({result.detail})")

            landed = (out / source.relative_path).exists()
            if expected != OK and landed:
                failures += 1
                print(f"  FAIL  a rejected payload was left on disk as {source.filename}")

    server.shutdown()
    print()
    if failures:
        print(f"  {failures} self-test check(s) FAILED. Do not trust this script until they pass.")
        return 1
    print("  Every self-test check passed: bad payloads are rejected and never land on disk.")
    return 0


# --------------------------------------------------------------------------
# entry point
# --------------------------------------------------------------------------


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Download MDB and IEC source datasets, verify them, and record what arrived.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--probe", action="store_true", help="check reachability; write nothing")
    mode.add_argument("--fetch", action="store_true", help="download and verify")
    mode.add_argument("--self-test", action="store_true", help="prove the verifier locally; no network")
    parser.add_argument("--out", type=Path, default=DEFAULT_OUT, help="destination directory")
    parser.add_argument("--registry", type=Path, default=HERE / "sources.json")
    parser.add_argument("--province", action="append", help="limit to a province code; repeatable")
    parser.add_argument("--only", action="append", help="limit to a source id; repeatable")
    parser.add_argument("--timeout", type=int, default=60)
    parser.add_argument("--retries", type=int, default=3)
    parser.add_argument("--force", action="store_true", help="re-download files already present")
    args = parser.parse_args(argv)

    if args.self_test:
        return self_test()

    try:
        sources = load_sources(args.registry)
    except (OSError, ValueError, json.JSONDecodeError) as exc:
        print(f"Cannot read the source registry: {exc}", file=sys.stderr)
        return 2

    if args.province:
        wanted = {p.upper() for p in args.province}
        sources = [s for s in sources if s.province.upper() in wanted]
    if args.only:
        wanted_ids = set(args.only)
        sources = [s for s in sources if s.id in wanted_ids]

    if not sources:
        print("No sources matched those filters. Nothing was attempted.", file=sys.stderr)
        return 2

    if args.fetch:
        try:
            args.out.mkdir(parents=True, exist_ok=True)
            if shutil.disk_usage(args.out).free < 100 * 1024 * 1024:
                print(f"Less than 100 MB free at {args.out}. Nothing was attempted.", file=sys.stderr)
                return 2
        except OSError as exc:
            print(f"Cannot write to {args.out}: {exc}", file=sys.stderr)
            return 2

    what = "Probing" if args.probe else "Downloading"
    print(f"{what} {len(sources)} source(s).")
    if args.fetch:
        print(f"Destination: {args.out}")

    results: list[Result] = []
    for index, source in enumerate(sources, start=1):
        print(f"  [{index}/{len(sources)}] {source.id} …", flush=True)
        if args.probe:
            results.append(probe(source, args.timeout))
        else:
            results.append(fetch(source, args.out, args.timeout, args.retries, args.force))

    manifest = write_manifest(args.out, "probe" if args.probe else "fetch", results) if args.fetch else None
    return report("probe" if args.probe else "fetch", results, manifest)


if __name__ == "__main__":
    sys.exit(main())
