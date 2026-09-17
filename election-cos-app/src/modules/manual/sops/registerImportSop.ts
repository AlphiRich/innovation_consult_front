/**
 * Election Campaign OS — SOP-04, Importing an existing membership register
 *
 * A campaign does not start empty. It starts with a spreadsheet, and this
 * is the procedure for bringing it in without importing a consent problem
 * along with it.
 *
 * Two things had to change before this could be written truthfully. The
 * import had no screen at all, and its planner placed every row in the
 * file at a single address in a single voting district — which is fine
 * for one street and wrong for a membership register, the case its own
 * header names. Both are fixed; the SOP describes the fixed behaviour.
 *
 * Claims are asserted in `manual.test.ts` against `bulkImport.ts` and
 * against the real NW405 seed data, so the split-district refusal this
 * SOP describes is checked against a voting district that is actually
 * split rather than one assumed to be.
 */
import { MIN_REFERENCE_LENGTH } from '@/modules/voters/bulkImport';
import type { Sop } from '../manualModel';

export const REGISTER_IMPORT_SOP: Sop = {
  number: 'SOP-04',
  title: 'Importing an existing membership register',
  area: 'ONBOARDING',
  roles: ['municipal-team-lead'],
  requiresAnyCapability: ['voters.edit'],
  purpose:
    'How to bring a membership list, a signup sheet or an old canvassing spreadsheet into the platform: ' +
    'what the file needs to contain, what the consent declaration is for, why some rows will be refused, ' +
    'and how to read the plan before anything is written.',
  sections: [
    {
      heading: 'Before the file, the consent',
      body: [
        'This platform will not create a voter record without consent recorded against it. That is enforced by the database itself, not by the form, and it holds for an import exactly as it holds at a door.',
        'At a door the canvasser is the evidence: they were there, they asked, and the record carries their name and the time. A spreadsheet has neither. So a bulk import asks you to declare, once, for the whole file: how these people consented, when, and where that consent can be found.',
        'That declaration is written onto every record the import creates. It travels with the person rather than sitting in an import log nobody will find in two years.',
      ],
      steps: [
        'Choose how they consented — written forms, or a digital sign-up. There is no option for a doorstep conversation, because nobody verbally consented four hundred people in a batch.',
        'Enter the date they consented.',
        'Enter where that consent is recorded: the membership-form batch, the event, the signup campaign. At least ' +
          MIN_REFERENCE_LENGTH +
          ' characters, because it has to identify something — "Membership forms 001–112, Ikageng drive, 2 March 2026", not "yes".',
      ],
      warnings: [
        'If you cannot say where the consent is recorded, you do not have a consent declaration — you have an assertion. The import will refuse the file rather than write four hundred records nobody can defend.',
        'A list bought, scraped, or handed over by someone else is not a list this platform will take. The question is not whether you can obtain the names; it is whether you can produce what those people agreed to.',
      ],
    },
    {
      heading: 'What the file needs',
      body: [
        'A CSV, with a header row. Column order does not matter and the spelling is forgiving — first name, surname and contact number are read from the usual English and Afrikaans headings.',
        'Three columns are worth adding before you import rather than after: the voting district, the ward, and the street address. What they are for is below.',
      ],
      steps: [
        'A first name and a surname. Both, in separate columns or in columns the import recognises.',
        'A contact number. A row without a usable one is refused — an unreachable record on a campaign roll is a row nobody can act on.',
        'A voting district code per row, if the register has them. If it does not, you can name one district for the whole file — but then the whole file goes there, so import one district at a time.',
        'A street address per row, if the register has them. See below for what happens when it does not.',
      ],
    },
    {
      heading: 'Why a row can be refused for its voting district',
      body: [
        'Every voter belongs to a voting district and a ward, and the ward is what decides who may see the record. The import will not guess either.',
        'A row is placed only into a voting district already loaded for this tenant. If the register covers ground you have not seeded — a neighbouring municipality, an old boundary — those rows are refused by code, with the code named, rather than quietly placed somewhere plausible.',
      ],
      warnings: [
        'A voting station whose roll is split across two wards is common: about a quarter of them in the one municipality this platform has gazette data for. A row carrying only that station code does not say which ward the person is in, so it is refused. Add a ward column, or split the file by ward — the import will not pick one for you, because a person in the wrong ward is worked by the wrong team and counted in the wrong coverage figure, and nothing anywhere reports it.',
        'If the tenant has no voting districts loaded at all, the import refuses the whole file and says so. Seed the wards first — SOP-03.',
      ],
    },
    {
      heading: 'The people with no address',
      body: [
        'A membership register often has names and phone numbers and nothing else. Those people are still real and their consent is still good, so they import — into a holding record whose address line says, in words, that no address was supplied and which import created it.',
        'No street is invented for them. A fabricated address is a canvasser sent to a door that is not there.',
      ],
      warnings: [
        'People in a holding record have no door, so they will not appear in a canvassing round. They can be phoned. Move them to a real address as one is found, or the round will keep reporting them as untouched ground when they are simply not on a street yet.',
      ],
    },
    {
      heading: 'Read the plan before you write anything',
      body: [
        'Choosing a file does not import it. The platform reads it, works out what it would do, and shows you: rows read, rows ready, rows refused with a reason each, and how many new doors would be created.',
        'This is the moment to act on the refusals. Afterwards, "412 of 437 imported" is a sentence nobody can do anything with.',
      ],
      steps: [
        'Check the rows-read count against the rows in your spreadsheet. A large gap usually means the file has more than one header row, or was exported with a different separator.',
        'Read the refusals. Each names its line number in the spreadsheet, so they can be fixed at source.',
        'Fix the file and choose it again, rather than importing the good rows now and the rest later. Two partial imports are much harder to reconcile than one corrected file.',
        'When the plan is what you expect, import it. Doors are created first, then the people in them.',
      ],
      warnings: [
        'Someone already on the roll is refused as a likely duplicate. The match is on the name and the digits of their number that are visible — the rest is masked and cannot be compared — so the check errs towards holding a name back. Check the existing record before adding anyone by hand.',
        'If the import stops partway, run it again. People already written come back as already on the roll, so a second run finishes the job rather than duplicating it.',
      ],
    },
    {
      heading: 'Who can do this, and why it is one role',
      body: [
        'An import needs two permissions at once: the permission to write voter records, and the permission to read the ward and voting-district table it places them into. Exactly one role holds both — Municipal Team Lead.',
        'Neither half is an accident. A Party HQ Admin can configure the tenant, add people and set permissions, and is deliberately kept off the voter roll, so the person who controls access is not also the person who can quietly put four hundred records on it. A Ward Lead, VD Captain or Canvasser can edit voters within their own ground but does not hold the municipality-wide reference table an import reads to place rows.',
        'So an import is a municipal-level act. If your register covers one ward, it is still the municipal lead who runs it.',
      ],
      warnings: [
        'Nobody else can run this, including the administrator who set the tenant up. If an import is needed and there is no Municipal Team Lead, that is a staffing decision for the HQ admin in Settings → Permissions — not a permission to grant as an exception without thinking about what else it opens.',
      ],
    },
  ],
};
