/**
 * Election Campaign OS — SOP-08, Reading the war room
 *
 * The screen a campaign looks at every morning, and therefore the screen
 * where a misread number does the most damage: it gets quoted upward, and
 * then outward, and by the time anybody checks it has been in a press
 * statement.
 *
 * So this SOP is mostly about provenance. The war room's tiles come from
 * three different places — pre-aggregated counters, the ward reference
 * table, and canvassers' own diary entries — and the differences between
 * them are not rounding. A reader who does not know which is which will
 * eventually report the wrong one.
 *
 * Writing it found three things on that screen. "Open incidents" carried
 * its own private copy of what "open" means. "Wards seeded" showed a bare
 * count with no sign of what was expected, which is the silent-short-seed
 * defect SOP-03 exists to catch, repeated on the one screen everybody
 * reads. And "Households canvassed" reported a self-reported diary total
 * as though it were a measurement — the door records now exist, so the
 * dashboard reports what happened as well as what was claimed.
 */
import { CONTACT_STATUS_LABEL } from '@/modules/voters/canvassQueue';
import { RECONCILIATION_BASIS } from '@/modules/wards/seedReconciliation';
import type { Sop } from '../manualModel';

export const WAR_ROOM_SOP: Sop = {
  number: 'SOP-08',
  title: 'Reading the war room',
  area: 'WAR_ROOM',
  roles: ['municipal-team-lead', 'party-hq-admin'],
  requiresAnyCapability: ['warroom.view'],
  purpose:
    'How to read the campaign dashboard without misreading it: where each number comes from, which two of ' +
    'them measure different things despite sounding alike, what a figure that has stopped moving actually ' +
    'means, and what the war room cannot tell you at all.',
  sections: [
    {
      heading: 'Where these numbers come from',
      body: [
        'The war room reads a single pre-aggregated counter document, maintained by triggers as voters, households, incidents and diary entries are written. It never scans the underlying records — on a tenant with a municipal roll that would be slow and expensive enough to make the screen unusable.',
        'One consequence is worth holding onto: every tile is a running total that was updated when something was written. It is not a query, and it is not recomputed when you open the page. If a figure looks wrong, the question is what was written, not what the dashboard calculated.',
      ],
      warnings: [
        'A fresh tenant, or one whose counters have never been maintained, shows zeros and says so. Zeros with a note are an honest empty; zeros without one would be a bug.',
      ],
    },
    {
      heading: 'The two numbers that sound the same and are not',
      body: [
        'Under Voters captured you will see a percentage of the registered roll. That is the share of the electorate this campaign holds a record for. It is a data-capture figure.',
        'On a round, you will see a coverage percentage. That is doors worked out of doors workable, and it excludes households who asked not to be contacted. It is a fieldwork figure.',
        'They answer different questions, they move for different reasons, and neither is a substitute for the other. A campaign can hold records for half the roll and have canvassed almost nobody, or the reverse.',
      ],
      warnings: [
        'If you take one number from this page into a meeting, take the sentence that goes with it. "40% coverage" means nothing on its own and will be heard as whichever of the two the listener already had in mind.',
      ],
    },
    {
      heading: 'Doors worked, and doors somebody said they worked',
      body: [
        'Two figures sit beside each other on purpose. The larger reading is counted from the door records: every household whose canvasser recorded an outcome. The smaller line beside it is self-reported — the sum of household counts canvassers entered in their own diary entries.',
        'They will differ. That is not an error in either. A diary entry is a person\'s account of their shift, written at the end of it; a door record is what was recorded at the door. Both are worth having and neither corrects the other.',
      ],
      steps: [
        'Read the door-record figure when you want to know what the platform can evidence.',
        'Read the self-reported figure when you want to know what the team believes it did.',
        'When they diverge sharply and persistently in one ward, ask about it — not because somebody is lying, but because it usually means doors are being worked and not recorded, which is a training problem with a simple fix.',
      ],
      warnings: [
        'Never present the self-reported figure as a measurement. It is a sum of what people typed about their own work, and describing it as anything else is the first step towards a number nobody can defend.',
      ],
    },
    {
      heading: 'Doors by state',
      body: [
        'The full breakdown, from the door records. Six states, and each says something different about what to do next.',
      ],
      steps: Object.values(CONTACT_STATUS_LABEL),
      warnings: [
        'Watch the refusal count as a proportion rather than a total. It is the one number here that says something about how the campaign is being received rather than how much work has been done.',
        'A large "could not reach the door" figure concentrated in one place is an access problem — a boom, an estate, a gate — and is solved by arranging access, not by sending the round again. SOP-05 covers reading it at ward level.',
      ],
    },
    {
      heading: 'Wards seeded, and why it shows two numbers',
      body: [
        'The tile shows the wards loaded against the number Municipality Config says there should be. If they disagree, the seed check flag appears, and the Wards page explains which ward is missing or duplicated.',
        RECONCILIATION_BASIS,
      ],
      warnings: [
        'A short seed has no other symptom. Coverage, projections and every per-ward figure on this page are computed over the wards that are present, so they will all look plausible and all be wrong. This tile is the only place on the dashboard that would tell you.',
      ],
    },
    {
      heading: 'Open incidents',
      body: [
        'The count of incidents still awaiting campaign action: logged, triaged, escalated or referred. Resolved and closed drop out of it, which is the point of being able to reach those states at all.',
        'A number that only ever rises means nobody is closing the loop, not that the municipality is failing — SOP-06 covers resolving and closing, and both are deliberate acts somebody has to perform.',
      ],
      warnings: [
        'An incident marked referred has had a document produced for it. It has not necessarily been delivered — the platform sends nothing. Do not read the referred count as a count of things the municipality has received.',
      ],
    },
    {
      heading: 'What the war room cannot tell you',
      body: [
        'It is a picture of what has been recorded, and nothing more. Read against that, it is useful; read as a picture of the campaign, it will mislead you in predictable directions.',
      ],
      steps: [
        'It does not know who is out working right now. There is no volunteer presence tracking in this platform, and a quiet dashboard on a Saturday morning means nothing has synced yet.',
        'It does not know whether anybody will vote. Sentiment is what canvassers recorded people saying at doors, from a self-selecting set of doors, and it is not a poll.',
        'It does not know what the other parties are doing.',
        'It does not know what happened in a ward with no signal until the phones come back into coverage.',
      ],
      warnings: [
        'Sentiment on this page is the sum of doorstep conversations, not a survey of the ward. It has no sampling frame, no weighting and no margin of error, and presenting it as a projection is the single easiest way to lose an argument about this platform.',
      ],
    },
  ],
};
