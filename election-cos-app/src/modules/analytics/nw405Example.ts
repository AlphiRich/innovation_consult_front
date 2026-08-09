/**
 * Election-COS1.0 — a real worked example for the Analytics calculators
 * IC-ECOS-BUILD-2026-V2 §8.2. The actual 2021 LGE result for JB Marks
 * Local Municipality (NW405), transcribed from the real IEC "Seat
 * Calculation Detail" report the human supplied in session 8 — see
 * docs/nw405-seed-data.md. Used as SeatCalculatorPage.tsx's and
 * ThresholdAnalyzerPage.tsx's starter data instead of an empty form, so
 * both tools open on a real, independently-verifiable result rather than
 * a blank slate or an invented scenario.
 */
export interface ExampleParty {
  id: string;
  name: string;
  votes: number;
  wardSeatsWon: number;
}

export const NW405_2021_EXAMPLE = {
  totalSeats: 67,
  totalValidVotes: 101_439,
  independentWardSeats: 0,
  noPRListWardSeats: 0,
  parties: [
    { id: 'ABC', name: 'Abantu Batho Congress', votes: 340, wardSeatsWon: 0 },
    { id: 'ANC', name: 'African National Congress', votes: 48_911, wardSeatsWon: 24 },
    { id: 'ATM', name: 'African Transformation Movement', votes: 330, wardSeatsWon: 0 },
    { id: 'BLF', name: 'Black First Land First', votes: 428, wardSeatsWon: 0 },
    { id: 'DA', name: 'Democratic Alliance', votes: 25_837, wardSeatsWon: 9 },
    { id: 'EFF', name: 'Economic Freedom Fighters', votes: 9_200, wardSeatsWon: 0 },
    { id: 'F4SD', name: 'Forum 4 Service Delivery', votes: 204, wardSeatsWon: 0 },
    { id: 'PA', name: 'Patriotic Alliance', votes: 2_389, wardSeatsWon: 0 },
    { id: 'VFP', name: 'Vryheidsfront Plus', votes: 13_800, wardSeatsWon: 1 },
  ] satisfies ExampleParty[],
};
