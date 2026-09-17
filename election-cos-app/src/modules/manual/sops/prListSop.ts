/**
 * Election Campaign OS — SOP-11, Preparing a PR candidate list
 *
 * A party list is submitted once, against a cut-off, and a mistake on it
 * is not correctable afterwards in the way an operational mistake is: a
 * candidate the Commission cannot confirm is removed, and the seat that
 * would have been theirs moves down the list. So this procedure is about
 * the checks that are worth doing while there is still time to act on
 * them.
 *
 * Writing it found that none of them could be done. `prList.ts` carried
 * the entire compliance check — list length, positions, duplicates,
 * verification, the Schedule 1 gender position — and nothing could reach
 * it. There was no route, no page and no form. The candidates port, the
 * Firestore adapter and the security rules all existed; a party could not
 * add a candidate, run the check, or produce anything to submit. The
 * module was a procedure with nothing to perform it on.
 *
 * The page, the form and the export ship with this SOP.
 *
 * ON THE PROVINCIAL CANDIDATE LIST THAT ARRIVED WITH THIS REQUEST
 *
 * A workbook of the published North West LGE 2026 candidate list was
 * supplied alongside it. It is not a source this product can seed from,
 * and the reasons are recorded in
 * `docs/nw-candidate-list-2026-review.md`. One of them matters to this
 * SOP directly: the column it calls a ward number is a per-party ordinal,
 * so the list carries no ward association at all, and the "32 contested
 * wards" figure it reports for JB Marks is an artifact of that — not a
 * correction to the gazette-sourced 34 this build seeds. That proposed
 * correction was rejected rather than applied.
 */
import {
  GENDER_BASIS,
  LIST_LENGTH_BASIS,
  PR_LIST_CITATIONS,
  PR_LIST_EXPORT_BASIS,
} from '@/modules/candidates/prList';
import { ID_CAPTURE_BASIS } from '@/modules/candidates/candidateCapture';
import type { Sop } from '../manualModel';

export const PR_LIST_SOP: Sop = {
  number: 'SOP-11',
  title: 'Preparing a PR candidate list',
  area: 'ADMINISTRATION',
  roles: ['party-hq-admin'],
  requiresAnyCapability: ['team.manage'],
  purpose:
    'How to capture candidates, check a proportional representation list before it is submitted, and produce ' +
    'the document somebody takes to the Commission: what the platform checks, what it refuses to decide for ' +
    'you, which rule governs a party list rather than a ward nomination, and why nothing here is a filing.',
  sections: [
    {
      heading: 'Two different things, governed differently',
      body: [
        'A party list is a list of candidates in order of preference, submitted by the party. Seats won proportionally are filled from the top of it down. That is what this procedure is about.',
        'A ward candidate is an individual nominated to stand in one ward. It is a separate process with separate paperwork, and none of the list checks apply to it.',
        'Getting these two confused is not a small error, and it has been made in published material about this product — a build was found citing the ward-nomination section as the authority for party lists. The citations this platform uses are printed on the export.',
      ],
      steps: [
        `Party-list submission — ${PR_LIST_CITATIONS.submission}`,
        `The Commission's compilation and certification — ${PR_LIST_CITATIONS.certification}`,
        `Removal of a candidate the Commission cannot confirm — ${PR_LIST_CITATIONS.removal}`,
        `How a list must be composed — ${PR_LIST_CITATIONS.composition}`,
      ],
      warnings: [
        'Ward candidates captured in this platform appear in their own section and are never on the exported party list. If you expected somebody to be on it and they are not, check whether they were captured as a ward candidate.',
      ],
    },
    {
      heading: 'Capturing a candidate',
      body: [
        'Settings → Candidates & party list. Each candidate needs a name as it must appear, a list position if they are on the party list, a declared gender, and an identity number.',
      ],
      steps: [
        'Type the name as it must appear on the submission, not as people say it.',
        'Choose whether they are standing on the party list or in a ward. A ward candidate needs the ward code.',
        'Give a list position. It is the order of preference, and it decides who takes a seat — not a judgement of anybody.',
        'Ask the candidate how they wish their gender recorded, and record what they say.',
        'Enter the identity number in full. It is checked as you type and stored masked.',
      ],
      warnings: [
        ID_CAPTURE_BASIS,
        'The identity number is checked against its own check digit, which catches a number mistyped or transcribed wrongly off a form. That check is worth taking seriously here more than anywhere else in this platform: a candidate the Commission cannot match to a registered voter is removed from the list, and a digit is the usual reason.',
        'Nothing about a candidate is inferred. Gender is not read off the identity number — the sex marker inside one is a different thing, is frequently wrong for the person concerned, and the platform is built so the two cannot be assigned to each other. It is not guessed from a name either.',
      ],
    },
    {
      heading: 'What the check tells you, and what stops an export',
      body: [
        'The list is checked continuously as you work. Some findings stop the export; others are shown and do not.',
      ],
      steps: [
        'A list longer than the cap stops it. Nothing is truncated for you — silently dropping a name the party meant to include would be worse than refusing.',
        'A candidate with no list position stops it. Order of preference cannot be left to whatever order records happen to come back in.',
        'A position used twice stops it.',
        'The same person appearing twice on the list stops it.',
        'A candidate marked rejected stops it. Candidates merely awaiting verification are a warning, not a block.',
        'Gaps in the numbering, a gender shortfall, clustered candidates and undeclared genders are warnings. They are printed on the export so whoever signs it knows about them.',
      ],
      warnings: [
        LIST_LENGTH_BASIS,
        'Verification status is your party\'s own record of whether it has checked a candidate. This platform does not verify anybody against the voters roll and has no connection to the Commission — marking somebody verified records that a person checked, not that a system did.',
      ],
    },
    {
      heading: 'The gender position, and why it never blocks',
      body: [
        'The Act asks a party to seek to ensure that half its candidates are women and that candidates of each sex are evenly distributed through the list. That wording matters: it is a standard to aim at, not a threshold to pass.',
        GENDER_BASIS,
      ],
      steps: [
        'Read the count of women against the number of candidates whose gender is declared — not against the whole list, because an undeclared gender is not a man.',
        'Read the clustering warning. Three or more candidates of the same sex in a row is what "all the women at the bottom of the list" looks like in practice.',
        'Fix it by ordering the list, if the party wants to. Or submit as it stands and be ready to answer for it.',
      ],
      warnings: [
        'The evenness test is a plain heuristic, not a statutory formula — the Act gives none. It flags a run of three, which is explainable to anybody who asks. Do not present it as a legal test that has been passed.',
        'A candidate who declines to declare is recorded as not declared, and the platform reports that the position cannot be fully assessed rather than filling the gap. That is the honest answer and it will appear on the export.',
      ],
    },
    {
      heading: 'Producing the document',
      body: [
        'The export is a PDF of the checked list: candidates in order with masked identity numbers, the outstanding warnings, and the provisions the list was checked against.',
        PR_LIST_EXPORT_BASIS,
      ],
      steps: [
        'Resolve everything blocking. The button stays disabled until you do.',
        'Type the party name. The platform does not hold one and will not guess at a party name on a document going to the Commission.',
        'Download it and read the whole thing, including the warnings section.',
        'Submit it yourself, by whatever route the Commission requires, with whatever else that submission needs — the deposit, the declarations, the acceptances.',
      ],
      warnings: [
        'Identity numbers are masked on the export as they are on every screen. If the submission requires them in full, take them from your party\'s own records. A printed list carrying thirteen digits per candidate is a disclosure in its own right, and this platform will not be what produced it.',
        'Downloading the list has not submitted anything, and the platform does not know your cut-off date. Nothing here will tell you that you are late.',
      ],
    },
    {
      heading: 'Lists published by the Commission are not a source for this',
      body: [
        'Once nominations close, the Commission publishes the candidate lists for every party. Those documents are useful for knowing who you are standing against. They are not a way to populate this screen, and one supplied to this build was examined and rejected as a seed source.',
        'The reasons were specific and are worth knowing before anybody tries it again: the column that looked like a ward number was a position within each party\'s own list, so no candidate in it could be placed in a ward; the party-list order had been replaced by a row counter, so the order of preference — the thing that decides who takes a seat — was gone; and around a fifth of the rows were duplicates.',
      ],
      warnings: [
        'A published list also masks identity numbers differently from this platform, in a way that leaves each candidate\'s full date of birth readable. Importing it would move that disclosure into your tenant. If you hold a copy for opposition research, hold it as what it is — a public document about other people — and not as candidate records.',
        'Counting distinct values in a column is not counting wards. A figure derived that way told this build that JB Marks has 32 wards; the gazette says 34, and the gazette is right. A number that arrives without the question it answers is not evidence.',
      ],
    },
  ],
};
