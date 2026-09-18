#!/usr/bin/env python3
"""
Election Campaign OS — extracting IEC Circular 1 of 2025, Annexure A.

WHAT THE DOCUMENT IS
--------------------
"Annexure-A-Number of Voters-Councillors-Wards", a seven-page table
attached to IEC Circular 1 of 2025. Produced from Excel on 27 February
2025, last modified 10 March 2025, 273,729 bytes,
SHA-256 fe3361c7...5a78. It lists, for every municipality in South
Africa: registered voters as at 2024, the number of councillors
determined by the MEC, the number of wards, and four derived columns —
Norm, Min_Norm, Max_Norm and 15%_Deviation.

WHY IT IS EXTRACTED BY A SCRIPT RATHER THAN TYPED
-------------------------------------------------
Two hundred and fifty-eight rows of eleven columns is exactly the volume
at which hand-transcription produces a number that is quietly wrong. It
is also the volume at which a transcription cannot be re-checked cheaply.
So the extraction is mechanical and re-runnable, and — more importantly —
every row is checked against the document's own arithmetic before
anything is written.

WHAT IT VERIFIES, AND WHY THAT MATTERS
--------------------------------------
Four relations are asserted for every row that has wards:

    Norm           == RegVoters // Wards          (integer division)
    15%_Deviation  == floor(Norm * 0.15)
    Min_Norm       == Norm - 15%_Deviation
    Max_Norm       == Norm + 15%_Deviation
    Wards          == ceil(Councillors / 2)

If any row fails, nothing is written and the run exits non-zero. That is
not defensive padding: the four derived columns are the reason this
build cares about the document at all. `wardSizeDeviation.ts` had been
applying a 15%-of-the-municipal-average band taken from a planning note
nobody could source. If all 214 warded rows satisfy those relations
exactly, the band is the IEC's own published arithmetic rather than a
borrowed guess — and if they do not, the reading of the table is wrong
and the band must stay unsourced.

The relation on councillors and wards is checked for the same reason:
`MunicipalityProfile` carries `totalCouncilSeats`, `wardSeats` and
`prSeats`, and a tenant that enters 67 council seats and 34 wards is
making a claim this table can confirm or contradict.

WHAT IT DOES NOT DO
-------------------
It does not download the document — the build environment denies
elections.org.za at CONNECT, and this file arrived by direct supply. It
does not fill in the district (category C) rows' empty ward columns:
district councils have no wards, the cells are blank in the source, and
a zero there would read as "a district with no wards yet".

REQUIREMENTS
------------
Python 3.9+, standard library only, plus `pdftotext` (poppler-utils) on
PATH for the `--pdf` path. `--text` skips it and reads a layout dump
that was produced earlier.

USAGE
-----
    extract-annexure-a.py --pdf Annexure-A.pdf --out src/data/iec/...json
    extract-annexure-a.py --text dump.txt --out ... --allow-any-hash
    extract-annexure-a.py --self-test
"""
from __future__ import annotations

import argparse
import hashlib
import json
import math
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path
from typing import Any

HERE = Path(__file__).resolve().parent
REPO_ROOT = HERE.parent.parent

# The supplied file, recorded so a re-run against a different document is
# caught rather than silently producing a different dataset.
EXPECTED_SHA256 = "fe3361c7006d47210084a6b80005ec40b77cf9529e226dd6e3cf7cc061395a78"
EXPECTED_BYTES = 273729

SOURCE = {
    "title": "Annexure A — Number of Voters, Councillors, Wards",
    "circular": "IEC Circular 1 of 2025",
    "documentCreated": "2025-02-27",
    "documentModified": "2025-03-10",
    "pages": 7,
    "sha256": EXPECTED_SHA256,
    "bytes": EXPECTED_BYTES,
    "acquiredBy": "Supplied directly to the build by the client, 18 September 2026.",
    "notReachable": (
        "Not downloaded here. The build environment denies elections.org.za at CONNECT, so this document "
        "could not be and was not fetched from the IEC's site — it was handed over. Anybody re-verifying "
        "it should obtain their own copy from the IEC and compare the SHA-256 recorded above."
    ),
}

# Rows are laid out in fixed columns; a layout dump separates every field
# by at least two spaces, and thousands inside a field by exactly one.
FIELD_SPLIT = re.compile(r"\s{2,}")
CATEGORIES = ("A", "B", "C")
# Page furniture: running head, column headers, the "Min_Nor / m" split
# the header wraps onto two lines, and the page footer.
FURNITURE = re.compile(r"Annexure-A|Province|Min_Nor|Page \d+ of \d+")


class ExtractError(RuntimeError):
    """Raised when the document does not read the way this script expects."""


def sha256_of(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as fh:
        for chunk in iter(lambda: fh.read(1 << 16), b""):
            digest.update(chunk)
    return digest.hexdigest()


def pdf_to_text(pdf: Path) -> str:
    if shutil.which("pdftotext") is None:
        raise ExtractError(
            "pdftotext is not on PATH. Install poppler-utils, or run pdftotext -layout yourself and "
            "pass the result with --text."
        )
    with tempfile.TemporaryDirectory() as tmp:
        out = Path(tmp) / "annexure.txt"
        subprocess.run(
            ["pdftotext", "-layout", str(pdf), str(out)],
            check=True,
            capture_output=True,
        )
        return out.read_text(encoding="utf-8")


def parse_published_number(raw: str) -> int:
    """
    Read an integer as the table prints it.

    Thousands are separated by a space — ordinary or non-breaking — and
    nothing else is accepted. `int('1 666 980')` raises; `int('')` also
    raises, which is what should happen to a blank cell rather than it
    becoming a zero.
    """
    cleaned = raw.replace(" ", "").replace(" ", "")
    if not re.fullmatch(r"\d+", cleaned):
        raise ExtractError(f"not a published integer: {raw!r}")
    return int(cleaned)


def parse_rows(text: str) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for lineno, raw in enumerate(text.splitlines(), 1):
        line = raw.strip()
        if not line or FURNITURE.search(line):
            continue
        parts = FIELD_SPLIT.split(line)
        # The header wraps "Min_Norm" across two lines, leaving a stray
        # "m" of its own. Anything else short is a reading failure.
        if len(parts) == 1:
            if parts[0] == "m":
                continue
            raise ExtractError(f"line {lineno}: unreadable row {line!r}")
        if len(parts) < 6 or parts[1] not in CATEGORIES:
            raise ExtractError(f"line {lineno}: unreadable row {line!r}")

        province, category, label, code = parts[0], parts[1], parts[2], parts[3]
        row: dict[str, Any] = {
            "province": province,
            "category": category,
            "code": code,
            "name": label.split(" - ", 1)[1].strip() if " - " in label else label,
            "registeredVoters": parse_published_number(parts[4]),
            "councillors": parse_published_number(parts[5]),
        }
        if len(parts) == 6:
            # A district council. Its ward columns are blank in the
            # source and stay absent here.
            rows.append(row)
            continue
        if len(parts) != 11:
            raise ExtractError(f"line {lineno}: expected 6 or 11 fields, read {len(parts)}: {line!r}")
        row.update(
            wards=parse_published_number(parts[6]),
            norm=parse_published_number(parts[7]),
            minNorm=parse_published_number(parts[8]),
            maxNorm=parse_published_number(parts[9]),
            deviation=parse_published_number(parts[10]),
        )
        rows.append(row)
    return rows


def verify(rows: list[dict[str, Any]]) -> list[str]:
    """Every failure, not the first — a partial list invites a partial fix."""
    problems: list[str] = []
    seen: set[str] = set()

    for row in rows:
        code = row["code"]
        if code in seen:
            problems.append(f"{code}: appears more than once")
        seen.add(code)

        if "wards" not in row:
            if row["category"] != "C":
                problems.append(f"{code}: no ward columns, but category {row['category']} is not a district")
            continue
        if row["category"] == "C":
            problems.append(f"{code}: a district council with ward columns filled in")

        wards, voters, norm, dev = row["wards"], row["registeredVoters"], row["norm"], row["deviation"]
        if wards <= 0:
            problems.append(f"{code}: {wards} wards")
            continue
        if norm != voters // wards:
            problems.append(f"{code}: Norm {norm} but {voters} // {wards} is {voters // wards}")
        if dev != math.floor(norm * 0.15):
            problems.append(f"{code}: 15% deviation {dev} but floor({norm} * 0.15) is {math.floor(norm * 0.15)}")
        if row["minNorm"] != norm - dev:
            problems.append(f"{code}: Min_Norm {row['minNorm']} but {norm} - {dev} is {norm - dev}")
        if row["maxNorm"] != norm + dev:
            problems.append(f"{code}: Max_Norm {row['maxNorm']} but {norm} + {dev} is {norm + dev}")
        if wards != math.ceil(row["councillors"] / 2):
            problems.append(
                f"{code}: {wards} wards for {row['councillors']} councillors; "
                f"ceil({row['councillors']} / 2) is {math.ceil(row['councillors'] / 2)}"
            )

    # Every local sits inside exactly one district, and no metro sits in
    # one — so the district column and the local column must total the
    # same roll. They do, to the voter. This is the check that catches a
    # dropped or duplicated page: lose one local's row and the two sides
    # part by exactly that municipality's voters.
    locals_total = sum(r["registeredVoters"] for r in rows if r["category"] == "B")
    districts_total = sum(r["registeredVoters"] for r in rows if r["category"] == "C")
    if rows and locals_total != districts_total:
        problems.append(
            f"local municipalities total {locals_total:,} registered voters and districts total "
            f"{districts_total:,}; they describe the same voters and must agree"
        )
    return problems


def build_dataset(rows: list[dict[str, Any]]) -> dict[str, Any]:
    warded = [r for r in rows if "wards" in r]
    return {
        "source": SOURCE,
        "derivation": {
            "norm": "floor(registeredVoters / wards)",
            "deviation": "floor(norm * 0.15)",
            "minNorm": "norm - deviation",
            "maxNorm": "norm + deviation",
            "wards": "ceil(councillors / 2)",
            "verified": (
                "Every relation above holds exactly for all "
                f"{len(warded)} warded rows in the document, checked by tools/annexure/extract-annexure-a.py "
                "before this file was written."
            ),
        },
        "counts": {
            "municipalities": len(rows),
            "warded": len(warded),
            "districts": len(rows) - len(warded),
            "wards": sum(r["wards"] for r in warded),
            # Metros and locals only. A district's row repeats the voters
            # of the locals inside it — DC40 (352,259) is exactly NW403 +
            # NW404 + NW405, and the district column totals the local
            # column to the voter across the whole table. Adding all 258
            # rows counts every voter outside a metro twice, which is how
            # a 44.3-million "national roll" gets quoted in a meeting.
            "registeredVoters": sum(r["registeredVoters"] for r in rows if r["category"] in ("A", "B")),
            "districtRegisteredVoters": sum(r["registeredVoters"] for r in rows if r["category"] == "C"),
            "councillors": sum(r["councillors"] for r in rows if r["category"] in ("A", "B")),
            "districtCouncillors": sum(r["councillors"] for r in rows if r["category"] == "C"),
            "registeredVotersBasis": (
                "registeredVoters counts metros and locals only. Every voter appears twice in the table — "
                "once on their local municipality and again on the district that contains it — so the "
                "district figure is reported separately and the two are never added together."
            ),
        },
        "municipalities": sorted(rows, key=lambda r: r["code"]),
    }


def self_test() -> int:
    """
    Prove the parser and the verifier on text this file carries, so the
    checks can be trusted without the document in hand.
    """
    good = (
        "                         Annexure-A-Number of Voters-Councillors-Wards\n"
        "  Province   Category   Municipality   CODE   RegVoters_2024   Councillors_2024 by\n"
        "m\n"
        "North West    B    NW405 - JB Marks    NW405    122 059    67    34    3 589    3 051    4 127    538\n"
        # The district's roll is the sum of its locals'. With one local in
        # the fixture, the two sides agree only if the district repeats it.
        "North West    C    DC40 - Dr Kenneth Kaunda    DC40    122 059    40\n"
        "                                                                          Page 1 of 7\n"
    )
    rows = parse_rows(good)
    assert len(rows) == 2, rows
    assert rows[0] == {
        "province": "North West",
        "category": "B",
        "code": "NW405",
        "name": "JB Marks",
        "registeredVoters": 122059,
        "councillors": 67,
        "wards": 34,
        "norm": 3589,
        "minNorm": 3051,
        "maxNorm": 4127,
        "deviation": 538,
    }, rows[0]
    assert "wards" not in rows[1], rows[1]
    assert verify(rows) == [], verify(rows)

    # Each relation has to be the thing that catches its own breakage.
    cases = {
        "norm": ("norm", 3590, "Norm 3590"),
        "deviation": ("deviation", 539, "15% deviation 539"),
        "minNorm": ("minNorm", 3052, "Min_Norm 3052"),
        "maxNorm": ("maxNorm", 4128, "Max_Norm 4128"),
        # 68 would still hold — ceil(68 / 2) is 34 — which is the point:
        # the check tolerates the odd-councillor case and nothing else.
        "councillors": ("councillors", 70, "34 wards for 70 councillors"),
    }
    for label, (field, value, expected) in cases.items():
        broken = [dict(rows[0], **{field: value}), rows[1]]
        problems = verify(broken)
        assert any(expected in p for p in problems), f"{label}: {problems}"

    # A district with wards filled in, and a local with them missing.
    assert any("district council with ward columns" in p for p in verify([dict(rows[0], category="C")]))
    assert any("not a district" in p for p in verify([dict(rows[1], category="B")]))
    # A repeated code.
    assert any("appears more than once" in p for p in verify([rows[0], dict(rows[0])]))
    # A dropped local municipality parts the two sides by its own roll.
    dropped = verify([rows[0], dict(rows[1], registeredVoters=244118)])
    assert any("describe the same voters and must agree" in p for p in dropped), dropped

    # A blank cell must not become a zero.
    try:
        parse_published_number("")
    except ExtractError:
        pass
    else:  # pragma: no cover — the assertion below is the failure path
        raise AssertionError("an empty cell parsed as a number")

    # A row that does not read must stop the run rather than be skipped.
    try:
        parse_rows("North West   B   NW405 - JB Marks   NW405   122 059\n")
    except ExtractError:
        pass
    else:  # pragma: no cover
        raise AssertionError("a short row was accepted")

    print("self-test: parser and all six checks pass, and each one fails when broken.")
    return 0


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description=__doc__,
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--pdf", type=Path, help="the Annexure A PDF")
    mode.add_argument("--text", type=Path, help="a pdftotext -layout dump of it")
    mode.add_argument("--self-test", action="store_true", help="prove the checks locally; reads nothing")
    parser.add_argument(
        "--out",
        type=Path,
        default=REPO_ROOT / "src" / "data" / "iec" / "circular-1-2025-annexure-a.json",
        help="where to write the dataset",
    )
    parser.add_argument(
        "--allow-any-hash",
        action="store_true",
        help="skip the SHA-256 check (use when the IEC republishes the annexure)",
    )
    args = parser.parse_args(argv)

    if args.self_test:
        return self_test()

    try:
        if args.pdf:
            if not args.pdf.is_file():
                raise ExtractError(f"no such file: {args.pdf}")
            digest = sha256_of(args.pdf)
            if digest != EXPECTED_SHA256 and not args.allow_any_hash:
                raise ExtractError(
                    f"this is not the recorded document.\n  expected {EXPECTED_SHA256}\n  read     {digest}\n"
                    "If the IEC has republished the annexure, re-run with --allow-any-hash and update "
                    "EXPECTED_SHA256 in this file — do not overwrite the dataset from an unrecorded source."
                )
            text = pdf_to_text(args.pdf)
        else:
            text = args.text.read_text(encoding="utf-8")

        rows = parse_rows(text)
        problems = verify(rows)
    except (ExtractError, subprocess.CalledProcessError) as exc:
        print(f"extraction failed: {exc}", file=sys.stderr)
        return 2

    if problems:
        print(f"{len(problems)} row(s) do not hold; nothing written:", file=sys.stderr)
        for problem in problems:
            print(f"  - {problem}", file=sys.stderr)
        return 1

    dataset = build_dataset(rows)
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(dataset, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")

    counts = dataset["counts"]
    print(
        f"{counts['municipalities']} municipalities written to {args.out} "
        f"({counts['warded']} warded, {counts['districts']} districts, "
        f"{counts['wards']} wards, {counts['councillors']} councillors, "
        f"{counts['registeredVoters']:,} registered voters)."
    )
    print("Every derived column checked against the document's own arithmetic.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
