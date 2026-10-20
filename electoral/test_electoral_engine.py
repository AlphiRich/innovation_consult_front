#!/usr/bin/env python3
"""
test_electoral_engine.py

Regression suite for electoral_generator.py. The one test that must never
be weakened is test_baseline_2021_matches_verified_result: it is the only
check in this project tied to an actual IEC-published result rather than a
projection, and the engine's authority rests entirely on reproducing it
exactly.

Finding surfaced while writing these tests: Scenario B's party-seat table,
as carried over from prior research notes, misassigns the two
largest-remainder bonus seats. Correctly ranking the remainder fractions
(DA 0.7696, PA 0.6786, EFF 0.3564, ...) gives the two bonus seats to DA and
PA, producing EFF=5 / PA=3 -- not the EFF=6 / PA=2 the source notes state.
test_scenario_b_bonus_seats_go_to_da_and_pa pins down the correct
(engine-computed, hand-verified) allocation rather than the source notes'
figure, in keeping with this project's own standard of correcting rather
than silently repeating an upstream error.
"""

import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from electoral_generator import (  # noqa: E402
    MAJORITY_THRESHOLD,
    TOTAL_SEATS,
    WARD_SEATS,
    PartyResult,
    Schedule1MMPR,
    Schedule1MMPRError,
    ScenarioEngine,
    SCENARIOS,
    baseline_2021,
    main,
)


class TestSchedule1MMPRQuota(unittest.TestCase):
    def test_2021_quota_matches_iec(self):
        mmpr = Schedule1MMPR(total_seats=67)
        self.assertEqual(mmpr.quota(101439), 1515)

    def test_quota_rejects_nonpositive_votes(self):
        mmpr = Schedule1MMPR(total_seats=67)
        with self.assertRaises(Schedule1MMPRError):
            mmpr.quota(0)
        with self.assertRaises(Schedule1MMPRError):
            mmpr.quota(-10)

    def test_constructor_rejects_nonpositive_total_seats(self):
        with self.assertRaises(Schedule1MMPRError):
            Schedule1MMPR(total_seats=0)
        with self.assertRaises(Schedule1MMPRError):
            Schedule1MMPR(total_seats=-5)

    def test_constructor_rejects_invalid_divisor(self):
        # independent_ward_winners + uncontested_wards >= total_seats
        with self.assertRaises(Schedule1MMPRError):
            Schedule1MMPR(total_seats=10, independent_ward_winners=6, uncontested_wards=4)


class TestSchedule1MMPRAllocate(unittest.TestCase):
    def test_baseline_2021_matches_verified_result(self):
        """The IEC's own published 2021 LGE result for NW405."""
        result = baseline_2021()
        self.assertEqual(result["quota"], 1515)
        self.assertEqual(result["actual_total_seats"], 67)

        expected = {
            "ANC": {"ward": 24, "total": 33, "pr": 9},
            "DA": {"ward": 9, "total": 17, "pr": 8},
            "FF+": {"ward": 1, "total": 9, "pr": 8},
            "EFF": {"ward": 0, "total": 6, "pr": 6},
            "PA": {"ward": 0, "total": 2, "pr": 2},
            "BLF": {"ward": 0, "total": 0, "pr": 0},
            "ABC": {"ward": 0, "total": 0, "pr": 0},
            "ATM": {"ward": 0, "total": 0, "pr": 0},
            "F4SD": {"ward": 0, "total": 0, "pr": 0},
        }
        by_name = {p["name"]: p for p in result["parties"]}
        self.assertEqual(set(by_name), set(expected))
        for name, exp in expected.items():
            with self.subTest(party=name):
                self.assertEqual(by_name[name]["ward_seats_won"], exp["ward"])
                self.assertEqual(by_name[name]["total_entitlement"], exp["total"])
                self.assertEqual(by_name[name]["pr_list_seats"], exp["pr"])

    def test_allocate_rejects_zero_votes(self):
        mmpr = Schedule1MMPR(total_seats=67)
        parties = [PartyResult("A", 0), PartyResult("B", 0)]
        with self.assertRaises(Schedule1MMPRError):
            mmpr.allocate(parties)

    def test_allocate_rejects_ward_seats_exceeding_available(self):
        mmpr = Schedule1MMPR(total_seats=67)
        parties = [
            PartyResult("A", 60000, ward_seats_won=WARD_SEATS),
            PartyResult("B", 40000, ward_seats_won=1),  # pushes sum past WARD_SEATS
        ]
        with self.assertRaises(Schedule1MMPRError):
            mmpr.allocate(parties)

    def test_allocate_is_idempotent(self):
        mmpr = Schedule1MMPR(total_seats=67)
        parties = [
            PartyResult("ANC", 48911, 24),
            PartyResult("DA", 25837, 9),
            PartyResult("FF+", 13800, 1),
            PartyResult("EFF", 9200, 0),
            PartyResult("PA", 2389, 0),
            PartyResult("BLF", 428, 0),
            PartyResult("ABC", 340, 0),
            PartyResult("ATM", 330, 0),
            PartyResult("F4SD", 204, 0),
        ]
        mmpr.allocate(parties)
        first_pass = {p.name: p.total_entitlement for p in parties}
        mmpr.allocate(parties)
        second_pass = {p.name: p.total_entitlement for p in parties}
        self.assertEqual(first_pass, second_pass)

    def test_pr_seats_clamped_at_zero_when_ward_wins_exceed_entitlement(self):
        # Pathological input, not a real election: a party with more ward
        # wins recorded than its vote-derived entitlement. PR seats must
        # never go negative.
        party = PartyResult("X", votes=100, ward_seats_won=5)
        party.round1_seats = 2
        party.bonus_seats = 0
        self.assertEqual(party.total_entitlement, 2)
        self.assertEqual(party.pr_seats, 0)


class TestScenarioEngine(unittest.TestCase):
    def test_constructor_rejects_nonpositive_pool(self):
        with self.assertRaises(Schedule1MMPRError):
            ScenarioEngine(base_voter_pool=0)

    def test_unknown_scenario_raises_keyerror(self):
        engine = ScenarioEngine()
        with self.assertRaises(KeyError):
            engine.run_scenario("Z")

    def test_run_all_returns_every_scenario(self):
        engine = ScenarioEngine()
        results = engine.run_all()
        self.assertEqual(set(results), set(SCENARIOS))

    def test_all_scenarios_allocate_exactly_total_seats(self):
        engine = ScenarioEngine()
        for key in SCENARIOS:
            with self.subTest(scenario=key):
                result = engine.run_scenario(key)
                self.assertEqual(result["actual_total_seats"], TOTAL_SEATS)

    def test_scenario_a_matches_hand_verified_allocation(self):
        engine = ScenarioEngine()
        result = engine.run_scenario("A")
        expected = {"ANC": 30, "DA": 21, "FF+": 8, "EFF": 6, "PA": 2}
        actual = {p["name"]: p["total_entitlement"] for p in result["parties"]}
        self.assertEqual(actual, expected)

    def test_scenario_b_bonus_seats_go_to_da_and_pa(self):
        """
        Pins the correct largest-remainder outcome, which differs from the
        EFF=6/PA=2 figure in the source research notes -- see module
        docstring.
        """
        engine = ScenarioEngine()
        result = engine.run_scenario("B")
        expected = {"ANC": 27, "DA": 24, "FF+": 8, "EFF": 5, "PA": 3}
        actual = {p["name"]: p["total_entitlement"] for p in result["parties"]}
        self.assertEqual(actual, expected)

    def test_scenario_c_matches_hand_verified_allocation(self):
        engine = ScenarioEngine()
        result = engine.run_scenario("C")
        expected = {"ANC": 26, "DA": 18, "FF+": 8, "EFF": 7, "MK": 4, "PA": 4}
        actual = {p["name"]: p["total_entitlement"] for p in result["parties"]}
        self.assertEqual(actual, expected)

    def test_scenario_d_matches_hand_verified_allocation_and_outright_majority(self):
        engine = ScenarioEngine()
        result = engine.run_scenario("D")
        expected = {"ANC": 34, "DA": 13, "FF+": 9, "EFF": 7, "PA": 4}
        actual = {p["name"]: p["total_entitlement"] for p in result["parties"]}
        self.assertEqual(actual, expected)
        self.assertTrue(result["has_outright_majority"])
        self.assertEqual(result["leading_party"], "ANC")

    def test_scenarios_a_b_c_have_no_outright_majority(self):
        engine = ScenarioEngine()
        for key in ("A", "B", "C"):
            with self.subTest(scenario=key):
                result = engine.run_scenario(key)
                self.assertFalse(result["has_outright_majority"])
                self.assertLess(result["leading_party_seats"], MAJORITY_THRESHOLD)


class TestScenarioDefinitions(unittest.TestCase):
    def test_every_scenario_vote_shares_sum_to_one(self):
        for key, spec in SCENARIOS.items():
            with self.subTest(scenario=key):
                self.assertAlmostEqual(sum(spec["shares"].values()), 1.0, places=9)

    def test_every_scenario_ward_seats_within_available(self):
        for key, spec in SCENARIOS.items():
            with self.subTest(scenario=key):
                self.assertLessEqual(sum(spec["ward_seats"].values()), WARD_SEATS)


class TestCLI(unittest.TestCase):
    def test_baseline_mode_writes_expected_file(self):
        with tempfile.TemporaryDirectory() as tmp:
            out_dir = Path(tmp)
            rc = main(["--mode", "baseline", "--out-dir", str(out_dir)])
            self.assertEqual(rc, 0)
            self.assertTrue((out_dir / "baseline_2021.json").exists())

    def test_sim_mode_all_scenarios_writes_expected_file(self):
        with tempfile.TemporaryDirectory() as tmp:
            out_dir = Path(tmp)
            rc = main(
                ["--mode", "sim", "--scenario", "ALL", "--out-dir", str(out_dir)]
            )
            self.assertEqual(rc, 0)
            self.assertTrue((out_dir / "electoral_scenarios_summary.json").exists())

    def test_sim_mode_single_scenario(self):
        with tempfile.TemporaryDirectory() as tmp:
            out_dir = Path(tmp)
            rc = main(
                ["--mode", "sim", "--scenario", "D", "--out-dir", str(out_dir)]
            )
            self.assertEqual(rc, 0)


if __name__ == "__main__":
    unittest.main()
