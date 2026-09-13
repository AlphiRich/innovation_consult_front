/**
 * Election Campaign OS — SOP-05, Running a ward round and reading coverage
 *
 * The supervisor's counterpart to SOP-01. SOP-01 tells a canvasser what to
 * do at a door; this tells whoever sent them how to plan the round, read
 * what came back, and know which of the numbers can be trusted.
 *
 * Writing it found that the entire canvassing queue had no screen.
 * `canvassQueue.ts` was complete and tested — six door states, two
 * cool-offs, a terminal refusal — and nothing in the application read or
 * wrote any of it. `Household.contactStatus` was set by no code path, so
 * every door read as never contacted, coverage was permanently zero, and
 * the refusal the module goes to some length to make terminal could not be
 * recorded at all. SOP-01 has told canvassers since it was written that a
 * door ends in one of six states; until `RoundPage.tsx` it ended in one.
 *
 * Claims here are asserted in `manual.test.ts` by running the queue rather
 * than by reading the prose — the coverage definition in particular, which
 * is the number a campaign will quote at itself all season.
 */
import {
  CONTACT_STATUS_LABEL,
  INACCESSIBLE_COOLOFF_HOURS,
  NO_ANSWER_COOLOFF_HOURS,
} from '@/modules/voters/canvassQueue';
import type { Sop } from '../manualModel';

export const WARD_ROUND_SOP: Sop = {
  number: 'SOP-05',
  title: 'Running a ward round and reading coverage',
  area: 'FIELD',
  roles: ['ward-lead', 'vd-captain'],
  requiresAnyCapability: ['voters.view'],
  purpose:
    'How to send a round out and read what comes back: which doors the platform will offer next and why, ' +
    'what the coverage figure counts and what it deliberately leaves out, and which numbers mean the work ' +
    'is done rather than merely that nobody has recorded it.',
  sections: [
    {
      heading: 'What a round is, here',
      body: [
        'A round is not a list you hand out. Every door carries its own state, and the platform offers the ones that are due — so two canvassers working the same street do not knock on the same gate a minute apart, and a door that was refused is never offered to anybody again.',
        'Open Voters → Work a round and enter your ward code. You will see your own ground: a ward lead gets the ward, a VD captain gets their voting district. That narrowing is done by the database, not by the page, so there is nothing to configure and nothing to get wrong.',
      ],
      warnings: [
        'If a ward will not open, it is not your ward. That refusal is the permission model working — ask your municipal lead rather than trying another code.',
      ],
    },
    {
      heading: 'Which doors come up, and when they come back',
      body: [
        'The queue offers the doors that are due, oldest attempt first, so a round sweeps evenly instead of returning to the same few streets.',
      ],
      steps: [
        'A door never worked is always offered.',
        'A door someone is standing at now is not offered to anyone else.',
        'A door that answered and was captured is done for this round.',
        'A door that did not answer comes back after about ' +
          NO_ANSWER_COOLOFF_HOURS +
          ' hours — long enough that a morning round and an evening round are different attempts.',
        'A door nobody could reach — locked gate, dog loose, security estate — comes back after about ' +
          INACCESSIBLE_COOLOFF_HOURS +
          ' hours, because the obstacle is usually still there sooner than that.',
        'A door that asked not to be contacted again is never offered to anyone, at any interval.',
      ],
      warnings: [
        'Those waiting periods are campaign-operations settings, not legal ones. Nothing in law says six hours or forty-eight; they are what stops a round wasting a morning re-knocking on empty houses.',
        'If the queue is empty but the ward is not finished, the doors are waiting out a cool-off rather than done. The count of them is on the page — read that before concluding a team has nothing left to do.',
      ],
    },
    {
      heading: 'Closing a door out is the whole of the record',
      body: [
        'A canvasser records one of four outcomes at each door, and that is what moves the door out of the queue. A round where nobody records anything looks exactly like a round nobody worked.',
      ],
      steps: Object.entries(CONTACT_STATUS_LABEL)
        .filter(([code]) => code !== 'NOT_CONTACTED' && code !== 'IN_PROGRESS')
        .map(([, label]) => label),
      warnings: [
        '"Asked not to be contacted again" cannot be undone from the round. It is deliberate, it is permanent as far as the field is concerned, and reopening it is a supervisor decision made elsewhere. Brief your canvassers that it means what it says — not "they were rude to me".',
        'The platform will refuse a change that does not make sense from where the door is now, and will tell the canvasser why. That refusal is not a fault to work around.',
      ],
    },
    {
      heading: 'What the coverage figure counts',
      body: [
        'Coverage is the doors worked at least once, out of the doors that can be worked. "Worked" means somebody went and recorded an outcome — contacted, no answer, could not reach — not that somebody was persuaded.',
        'Households who asked not to be contacted again are taken out of the denominator, not counted as outstanding. A ward reported as 80% covered when the missing 20% asked not to be visited would misrepresent both the work and those households, and it would push a team to keep knocking to close a gap that is not a gap.',
      ],
      warnings: [
        'Coverage is a measure of ground walked, not of support won. A ward can be fully covered and going badly. Read it beside the sentiment breakdown, never on its own.',
        'Coverage counts doors, and a door with no address is not a door. People imported without an address sit in a holding record and never enter a round — they can be phoned, but they will not move this number. See SOP-04.',
      ],
    },
    {
      heading: 'Reading the round against the ward',
      body: [
        'The page shows every door by state, which is the honest version of the coverage percentage: the same information without the arithmetic, so you can see what it is made of.',
      ],
      steps: [
        'Compare doors left to work against what a team can actually do in a shift. A number nobody can reach by election day is a resourcing conversation now, not a surprise later.',
        'Watch "could not reach the door". A cluster of them in one street is usually one obstacle — a boom, an estate gate — and it is solved by arranging access, not by sending the round again.',
        'Watch refusals as a proportion. A handful is ordinary. A concentration in one voting district is a message about how the campaign is landing there, and it is worth knowing before the number is large.',
        'Check that doors worked in the field are appearing. If a canvasser reports a shift and the counts have not moved, their phone has not synced — SOP-01 covers what to do about it.',
      ],
      warnings: [
        'Every figure here is computed from what has been recorded, so it is only ever as current as the last phone to come back into signal. A round finished in a valley with no coverage is real work that this page cannot see yet.',
      ],
    },
    {
      heading: 'What this does not tell you',
      body: [
        'The queue knows which doors have been worked. It does not know whether the people behind them are registered to vote, whether they are on the roll for this voting district, or whether they will turn out. None of that is in this product, and coverage should never be reported as though it were.',
      ],
      warnings: [
        'Do not present a coverage percentage as a turnout projection, a support estimate, or a measure of a ward’s likely result. It is the proportion of doors somebody has been to. Saying more than that with this number is the quickest way to lose an argument about it.',
      ],
    },
  ],
};
