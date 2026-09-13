/**
 * Election Campaign OS — SOP-03, Seeding wards and voting districts
 *
 * The step SOP-02 leaves you at, and the one everything else stands on:
 * every scope, every coverage percentage and every seat projection in this
 * product is computed over the wards loaded here.
 *
 * Its failure mode is the reason it needed a code change before it could
 * be written honestly. A seed that stops one ward short raises no error
 * anywhere — the list renders, the map draws, the percentages compute, and
 * the projection is confidently wrong. `seedReconciliation.ts` is the
 * check that catches it; this is the procedure that tells someone to look.
 *
 * Claims are asserted in `manual.test.ts` against the code and against the
 * real NW405 seed data on disk, so the split-voting-district figures here
 * are counted from the gazette output rather than quoted from memory.
 */
import { RECONCILIATION_BASIS } from '@/modules/wards/seedReconciliation';
import type { Sop } from '../manualModel';

export const WARD_SEEDING_SOP: Sop = {
  number: 'SOP-03',
  title: 'Seeding wards and voting districts',
  area: 'ONBOARDING',
  roles: ['party-hq-admin', 'municipal-team-lead'],
  requiresAnyCapability: ['wards.view'],
  purpose:
    'How to get your municipality’s wards and voting districts into the platform from the demarcation ' +
    'notice, how to check that what arrived is what the notice says, and what to do about the voting ' +
    'districts that belong to two wards at once.',
  sections: [
    {
      heading: 'Where this data comes from, and where it does not',
      body: [
        'The authority for your municipality’s wards is the Municipal Demarcation Board’s delimitation notice for that municipality, published in the provincial gazette. It states how many wards there are, what each is called, which voting stations fall in each, and how many registered voters each holds.',
        'This platform holds no national register of wards and does not fetch one. It holds what you load. That is deliberate — a ward list quietly refreshed from somewhere else would change coverage figures and seat projections under a campaign that had not asked for it.',
        'So the first thing to get is the notice. Everything below assumes it is open in front of you.',
      ],
      warnings: [
        'The Board re-delimits before each election. A ward list carried over from the last one is the single most likely reason a projection is wrong in a way nobody can see. Check the date on the notice you are working from.',
      ],
    },
    {
      heading: 'Who can do which part',
      body: [
        'Loading and editing wards needs the ward-editing permission, which the Party HQ Admin role holds. A Municipal Team Lead can see everything in this procedure and change none of it.',
        'That is not an oversight — the ward list is the tenant’s foundation, and a municipal lead who could re-draw it could change every coverage figure their own work is measured by. If the ward data is wrong, the team lead is usually the one who notices; the fix goes through the HQ admin.',
      ],
    },
    {
      heading: 'Record the municipality before you load anything',
      body: [
        'Settings → Municipality Config, as in SOP-02. In particular the ward seats, PR seats and total council seats, taken from the notice.',
        'Do it first because it is the only place the expected ward count is stated, and it is what the seed check below measures the loaded wards against. Without it there is nothing to check against, and the check says so rather than passing silently.',
      ],
    },
    {
      heading: 'The bulk path: parsing the gazette',
      body: [
        'Where the notice is a machine-readable PDF, there is a parser: `tools/seed-data/parse-nw405-demarcation.mjs`. It reads the ward schedule into a seed file, and a loader writes that file into your tenant. This is how the JB Marks (NW405) data in this repository was produced.',
        'The parser was written against one municipality’s gazette layout and verified against it. Another municipality’s notice may be laid out differently, so the output is checked rather than trusted.',
      ],
      steps: [
        'Run the parser over the notice. It prints the sum of ward registered voters and the sum of voting-district registered voters, and refuses to write a file if the two disagree.',
        'Compare the parsed ward count against the number the notice states in its own preamble. They must be equal.',
        'Read a handful of voting-station names against the PDF by eye. A layout or OCR artefact can corrupt a name without breaking any numeric check, and a station nobody can find is a canvassing team standing in the wrong street.',
        'Load the file into the tenant, then run the seed check below before anyone is assigned to work it.',
      ],
      warnings: [
        'If the two totals disagree, the parse is wrong — do not adjust a number to make them match. The disagreement is information about which rows were misread, and it is the only signal you will get.',
      ],
    },
    {
      heading: 'The manual path: capturing wards by hand',
      body: [
        'Where there is no machine-readable notice, wards go in through the Wards page one at a time. It is slower and it is not worse: the same three numbers get checked either way.',
      ],
      steps: [
        'Wards → New ward. Enter the ward code exactly as the notice writes it, the ward name, the municipality code, and the registered voters for that ward.',
        'Use the notice’s own ward code format and do not invent a shorter one. Ward codes are matched exactly when the platform decides who may see what, so a code that differs by a space or a dash is a ward that a ward lead cannot open.',
        'Open each ward and add its voting districts — code, station name, and that station’s registered voters for this ward.',
        'Check the ward’s registered-voter figure against the sum of its voting districts. The notice gives both.',
      ],
    },
    {
      heading: 'The voting district that belongs to two wards',
      body: [
        'A voting station’s roll can be split across a ward boundary: the same station code appears in two wards’ schedules, each with only its own portion of the registered voters. This is ordinary, not an error, and it is common — in the one municipality this build holds real gazette data for, 26 of 108 station codes are split, which is a quarter of them.',
        'The platform is built for it. A voting district is identified by the ward and the code together, not by the code alone, so the second ward’s entry does not overwrite the first. When you enter a code that already exists elsewhere, the form tells you which other wards have it, and lets you continue.',
      ],
      warnings: [
        'The same code in two different wards is expected. The same code twice in one ward is a double entry, and the seed check blocks on it.',
        'Enter only that ward’s portion of the registered voters, never the station’s whole roll. Entering the full figure in both wards inflates the municipality’s total and every percentage taken from it.',
      ],
    },
    {
      heading: 'Check the seed before anyone works it',
      body: [
        'The Wards page shows a seed check whenever anything needs attention. It compares the loaded wards against the figures recorded in Municipality Config and against each other.',
        RECONCILIATION_BASIS,
      ],
      steps: [
        'Look at the ward count against the expected count, shown together at the top of the page.',
        'Clear everything marked in red before the tenant is used. Those are contradictions — two numbers in your own tenant disagree and one of them is wrong.',
        'Read the rest. A ward with no voting districts, or none with registered voters, is usually a seed that was interrupted; occasionally it is simply the next thing on your list.',
        'Re-run the check after every correction. It is computed from what is loaded, so it is current the moment you reload the page.',
      ],
      warnings: [
        'A seed that is short by one ward looks exactly like a seed that is complete, everywhere except here. Nothing else in this platform will tell you.',
        'A check that finds nothing is not a statement that your ward list is correct. It means the tenant does not contradict itself. Only the notice can tell you the codes and the numbers are the right ones.',
      ],
    },
    {
      heading: 'When the demarcation changes',
      body: [
        'Wards are re-drawn between elections, and a re-drawn ward is not the same ward with a new boundary — the households in it change, and so does everything recorded against them.',
        'Nothing in this platform deletes a ward. A ward that no longer exists is suppressed and stops appearing; its history remains. Treat a new delimitation as a fresh load checked against the new notice, not as an edit of the old one.',
      ],
      warnings: [
        'Re-seeding changes who can see what. A ward lead is scoped to a ward code, so a ward that is renumbered leaves that person seeing nothing until their scope is updated in Settings → Permissions. Do the two together, or the field team loses access on the same morning the new wards arrive.',
      ],
    },
  ],
};
