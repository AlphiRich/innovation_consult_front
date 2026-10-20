#!/usr/bin/env python3
"""
electoral_generator.py

Schedule 1 (Local Government: Municipal Structures Act, 1998, Act 117 of 1998)
MMPR seat-allocation engine for JB Marks Local Municipality (NW405), plus a
scenario runner for the four 2026 forecast scenarios (A-D).

The quota, round-1, round-2 (largest remainder), and PR-subtraction steps are
implemented exactly as described in the Innovation Consult "Electoral
Dynamics of JB Marks Local Municipality (NW405)" R&D Report (August 2026),
and validated against it: baseline_2021() reproduces the IEC's own verified
2021 result (ANC 33, DA 17, FF+ 9, EFF 6, PA 2) exactly.

The four scenarios (vote-share and ward-win assumptions) are projections
carried over from prior research notes, not verified IEC data -- they are
inputs to the engine, not facts the engine asserts. Treat scenario output
accordingly.

Known limitation: Schedule 1 does not specify a tie-break rule for the
largest-remainder step when two parties have an identical remainder at the
cutoff for the last seat. This implementation breaks such ties by input
order, which is arbitrary. No tie has occurred in any verified JB Marks
result to date, so this has not been exercised against a real case.
"""

from __future__ import annotations

import argparse
import json
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List

TOTAL_SEATS = 67
WARD_SEATS = 34
MAJORITY_THRESHOLD = 34  # seats needed to govern without a coalition partner

# 2021 LGE verified baseline (IEC Seat Calculation Detail report, NW405).
BASELINE_2021_VOTES = {
    "ANC": 48911,
    "DA": 25837,
    "FF+": 13800,
    "EFF": 9200,
    "PA": 2389,
    "BLF": 428,
    "ABC": 340,
    "ATM": 330,
    "F4SD": 204,
}
BASELINE_2021_WARD_SEATS = {"ANC": 24, "DA": 9, "FF+": 1}

# 2026 scenario projections (vote share, ward seats won), as carried over
# from prior research notes -- see module docstring.
SCENARIOS: Dict[str, dict] = {
    "A": {
        "name": "Fractured Status Quo",
        "shares": {"ANC": 0.445, "DA": 0.310, "FF+": 0.120, "EFF": 0.085, "PA": 0.040},
        "ward_seats": {"ANC": 24, "DA": 9, "FF+": 1},
    },
    "B": {
        "name": "Liberal-Conservative Consolidation",
        "shares": {"ANC": 0.405, "DA": 0.355, "FF+": 0.120, "EFF": 0.080, "PA": 0.040},
        "ward_seats": {"ANC": 23, "DA": 11},
    },
    "C": {
        "name": "Left-Wing / MK Surge",
        "shares": {
            "ANC": 0.385,
            "DA": 0.265,
            "FF+": 0.120,
            "EFF": 0.105,
            "MK": 0.060,
            "PA": 0.065,
        },
        "ward_seats": {"ANC": 22, "DA": 11, "FF+": 1},
    },
    "D": {
        "name": "Turnout Recovery",
        "shares": {"ANC": 0.505, "DA": 0.195, "FF+": 0.130, "EFF": 0.100, "PA": 0.070},
        "ward_seats": {"ANC": 25, "DA": 8, "FF+": 1},
    },
}

for _key, _spec in SCENARIOS.items():
    _total_share = sum(_spec["shares"].values())
    if abs(_total_share - 1.0) > 1e-9:
        raise AssertionError(
            f"Scenario {_key} vote shares sum to {_total_share}, not 1.0"
        )
    _total_ward = sum(_spec["ward_seats"].values())
    if _total_ward > WARD_SEATS:
        raise AssertionError(
            f"Scenario {_key} ward_seats sum to {_total_ward}, exceeding "
            f"the {WARD_SEATS} ward seats available"
        )


class Schedule1MMPRError(ValueError):
    """Raised when inputs or intermediate results violate Schedule 1 invariants."""


@dataclass
class PartyResult:
    name: str
    votes: int
    ward_seats_won: int = 0
    round1_seats: int = 0
    remainder: float = 0.0
    bonus_seats: int = 0

    @property
    def total_entitlement(self) -> int:
        return self.round1_seats + self.bonus_seats

    @property
    def pr_seats(self) -> int:
        # Ward wins substitute for, rather than add to, PR list seats.
        return max(0, self.total_entitlement - self.ward_seats_won)


class Schedule1MMPR:
    """
    Implements the four-step Schedule 1 seat-allocation formula:
      1. Quota:   Q = floor(valid_votes / (seats - indep - uncontested)) + 1
      2. Round 1: whole seats = floor(party_votes / Q)
      3. Round 2: largest-remainder method fills any seats left over
      4. Step 4:  PR list seats = total entitlement - ward seats won
    """

    def __init__(
        self,
        total_seats: int = TOTAL_SEATS,
        independent_ward_winners: int = 0,
        uncontested_wards: int = 0,
    ):
        if total_seats <= 0:
            raise Schedule1MMPRError("total_seats must be positive")
        divisor = total_seats - independent_ward_winners - uncontested_wards
        if divisor <= 0:
            raise Schedule1MMPRError(
                "total_seats - independent_ward_winners - uncontested_wards "
                "must be positive"
            )
        self.total_seats = total_seats
        self.divisor = divisor

    def quota(self, total_valid_votes: int) -> int:
        if total_valid_votes <= 0:
            raise Schedule1MMPRError("total_valid_votes must be positive")
        return total_valid_votes // self.divisor + 1

    def allocate(self, parties: List[PartyResult]) -> List[PartyResult]:
        """Runs all four steps in place; returns the same list with seats filled in."""
        total_votes = sum(p.votes for p in parties)
        if total_votes <= 0:
            raise Schedule1MMPRError("sum of party votes must be positive")

        q = self.quota(total_votes)

        for p in parties:
            whole, remainder_votes = divmod(p.votes, q)
            p.round1_seats = whole
            p.remainder = remainder_votes / q
            p.bonus_seats = 0

        allocated = sum(p.round1_seats for p in parties)
        remaining = self.total_seats - allocated
        if remaining < 0:
            raise Schedule1MMPRError(
                f"Round 1 over-allocated seats ({allocated} > {self.total_seats}); "
                "check input vote totals."
            )

        ranked = sorted(parties, key=lambda p: p.remainder, reverse=True)
        for p in ranked[:remaining]:
            p.bonus_seats += 1

        total_ward_seats = sum(p.ward_seats_won for p in parties)
        if total_ward_seats > WARD_SEATS:
            raise Schedule1MMPRError(
                f"Sum of ward_seats_won ({total_ward_seats}) exceeds the "
                f"{WARD_SEATS} ward seats available."
            )

        final_total = sum(p.total_entitlement for p in parties)
        if final_total != self.total_seats:
            raise Schedule1MMPRError(
                f"Final seat total {final_total} != {self.total_seats}; "
                "allocation did not converge."
            )

        return parties


def _parties_to_dicts(parties: List[PartyResult]) -> List[dict]:
    return [
        {
            "name": p.name,
            "votes": p.votes,
            "ward_seats_won": p.ward_seats_won,
            "total_entitlement": p.total_entitlement,
            "pr_list_seats": p.pr_seats,
        }
        for p in parties
    ]


def baseline_2021() -> dict:
    """
    The verified 2021 LGE result. Used as a regression fixture: must
    reproduce ANC 33, DA 17, FF+ 9, EFF 6, PA 2 exactly (IEC Seat
    Calculation Detail report, NW405).
    """
    parties = [
        PartyResult(name, votes, BASELINE_2021_WARD_SEATS.get(name, 0))
        for name, votes in BASELINE_2021_VOTES.items()
    ]
    mmpr = Schedule1MMPR(total_seats=TOTAL_SEATS)
    mmpr.allocate(parties)
    return {
        "election": "2021 LGE (verified baseline)",
        "quota": mmpr.quota(sum(p.votes for p in parties)),
        "parties": _parties_to_dicts(parties),
        "actual_total_seats": sum(p.total_entitlement for p in parties),
    }


class ScenarioEngine:
    """Runs the named 2026 forecast scenarios against a given total-vote pool."""

    def __init__(self, base_voter_pool: int = 101439):
        if base_voter_pool <= 0:
            raise Schedule1MMPRError("base_voter_pool must be positive")
        self.base_voter_pool = base_voter_pool

    def run_scenario(self, scenario_key: str) -> dict:
        if scenario_key not in SCENARIOS:
            raise KeyError(
                f"Unknown scenario '{scenario_key}'; choices: {sorted(SCENARIOS)}"
            )
        spec = SCENARIOS[scenario_key]
        parties = [
            PartyResult(
                name=party,
                votes=round(share * self.base_voter_pool),
                ward_seats_won=spec["ward_seats"].get(party, 0),
            )
            for party, share in spec["shares"].items()
        ]

        mmpr = Schedule1MMPR(total_seats=TOTAL_SEATS)
        mmpr.allocate(parties)

        leader = max(parties, key=lambda p: p.total_entitlement)

        return {
            "scenario": scenario_key,
            "scenario_name": spec["name"],
            "base_voter_pool": self.base_voter_pool,
            "quota": mmpr.quota(sum(p.votes for p in parties)),
            "parties": [
                {
                    **party_dict,
                    "vote_share_input": spec["shares"][party_dict["name"]],
                }
                for party_dict in _parties_to_dicts(parties)
            ],
            "actual_total_seats": sum(p.total_entitlement for p in parties),
            "leading_party": leader.name,
            "leading_party_seats": leader.total_entitlement,
            "has_outright_majority": leader.total_entitlement >= MAJORITY_THRESHOLD,
        }

    def run_all(self) -> Dict[str, dict]:
        return {key: self.run_scenario(key) for key in SCENARIOS}


def main(argv: List[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="JB Marks (NW405) Schedule 1 MMPR seat-allocation engine"
    )
    parser.add_argument("--mode", choices=["sim", "baseline"], default="sim")
    parser.add_argument("--scenario", choices=[*SCENARIOS, "ALL"], default="ALL")
    parser.add_argument(
        "--base-votes",
        type=int,
        default=101439,
        help=(
            "Total valid-vote pool used to convert scenario vote shares into "
            "vote counts (default: verified 2021 total)"
        ),
    )
    parser.add_argument("--out-dir", type=Path, default=Path("./output"))
    args = parser.parse_args(argv)

    args.out_dir.mkdir(parents=True, exist_ok=True)

    if args.mode == "baseline":
        result = baseline_2021()
        out_path = args.out_dir / "baseline_2021.json"
        out_path.write_text(json.dumps(result, indent=2))
        print(f"Wrote {out_path}")
        print(
            f"Quota={result['quota']}, total seats allocated="
            f"{result['actual_total_seats']}"
        )
        return 0

    engine = ScenarioEngine(base_voter_pool=args.base_votes)
    results = (
        engine.run_all()
        if args.scenario == "ALL"
        else {args.scenario: engine.run_scenario(args.scenario)}
    )

    summary_path = args.out_dir / "electoral_scenarios_summary.json"
    summary_path.write_text(json.dumps(results, indent=2))
    print(f"Wrote {summary_path}")

    for key, res in results.items():
        print(
            f"Scenario {key} ({res['scenario_name']}): quota={res['quota']}, "
            f"leader={res['leading_party']} ({res['leading_party_seats']} seats), "
            f"outright majority={res['has_outright_majority']}"
        )
    return 0


if __name__ == "__main__":
    sys.exit(main())
