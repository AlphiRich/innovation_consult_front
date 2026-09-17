/**
 * Election Campaign OS — the PR list as a document somebody can submit
 * IC-ECOS-BUILD-2026-V2 §6.6. Section 14, Municipal Electoral Act.
 *
 * WHY THIS EXISTS
 *
 * `prList.ts` has carried the whole compliance check since the session it
 * was written — list length, positions, duplicates, verification, the
 * Schedule 1 gender position — and there was no screen, no route and no
 * export. A party could not add a candidate, could not run the check, and
 * could not produce anything to hand to the Commission. The module was a
 * procedure with nothing to perform it on.
 *
 * WHAT THIS DOCUMENT IS
 *
 * A checked list for a person to read and submit by hand. It is not a
 * submission and it is not a certified list — `PR_LIST_EXPORT_BASIS` says
 * so as the first thing on the page, because a PDF with a party name and
 * a list of candidates on it will be read as an official document by
 * somebody, and the sentence that stops that has to be on the paper
 * rather than on the button that produced it.
 *
 * WARNINGS ARE PRINTED ON IT
 *
 * A list that exports with outstanding warnings carries them. The
 * alternative is a clean-looking document whose problems live only in the
 * browser tab of whoever exported it — and the gender position in
 * particular is one a party may lawfully submit while falling short of,
 * which means it will be exported, which means it must be visible to the
 * person signing it.
 *
 * ID NUMBERS ARE MASKED HERE TOO
 *
 * The export shows what the screen shows. An identity number in full on a
 * printed list is the same disclosure whether the paper was produced by
 * this platform or by a spreadsheet, and this platform will not be the
 * one that does it.
 */
import type { Block, PrintDocument } from '@/lib/document/model';
import type { Candidate } from '@/dal/ports/candidates';
import {
  GENDER_BASIS,
  LIST_LENGTH_BASIS,
  PR_LIST_CITATIONS,
  PR_LIST_EXPORT_BASIS,
  type PrListCheckResult,
} from './prList';

export interface PrListDocumentMeta {
  organisation: string;
  /** The party whose list this is, as it should read on the page. */
  partyName: string;
  municipalityName: string;
  version: string;
  preparedByName: string;
  preparedAt: string;
}

const GENDER_LABEL: Record<NonNullable<Candidate['gender']>, string> = {
  FEMALE: 'Female',
  MALE: 'Male',
  OTHER: 'Other',
  UNDISCLOSED: 'Not declared',
};

function candidateRows(result: PrListCheckResult): Block[] {
  const blocks: Block[] = [];
  for (const candidate of result.ordered) {
    blocks.push({
      kind: 'field',
      label: candidate.listRank === undefined ? '—' : String(candidate.listRank),
      value:
        `${candidate.fullName} · ${candidate.idNumberMasked} · ` +
        `${GENDER_LABEL[candidate.gender ?? 'UNDISCLOSED']} · ` +
        `${candidate.verificationStatus.toLowerCase()}`,
    });
  }
  return blocks;
}

export function prListDocument(result: PrListCheckResult, meta: PrListDocumentMeta): PrintDocument {
  const blocks: Block[] = [
    { kind: 'callout', text: PR_LIST_EXPORT_BASIS },

    { kind: 'heading', level: 1, text: 'This list' },
    { kind: 'field', label: 'Party', value: meta.partyName },
    { kind: 'field', label: 'Municipality', value: meta.municipalityName },
    { kind: 'field', label: 'Candidates on the list', value: String(result.ordered.length) },
    { kind: 'field', label: 'Cap applied', value: String(result.maxListLength) },
    { kind: 'field', label: 'Prepared by', value: meta.preparedByName },
    { kind: 'field', label: 'Prepared on', value: meta.preparedAt },

    { kind: 'heading', level: 1, text: 'Candidates, in order of preference' },
    {
      kind: 'para',
      muted: true,
      text:
        'The number on the left is the list position. It decides who takes a seat as seats are allocated ' +
        'down the list — it is not a ranking of anybody\'s merit and it is not an internal campaign score.',
    },
  ];

  blocks.push(...candidateRows(result));

  if (result.warnings.length > 0) {
    blocks.push(
      { kind: 'heading', level: 1, text: 'Outstanding warnings' },
      {
        kind: 'para',
        muted: true,
        text:
          'These do not stop a list being submitted. They are printed because whoever signs this should ' +
          'know about them before they do.',
      },
      { kind: 'bullets', items: result.warnings.map((w) => w.message) },
    );
  }

  blocks.push(
    { kind: 'heading', level: 1, text: 'What was checked, and against what' },
    { kind: 'field', label: 'Submission', value: PR_LIST_CITATIONS.submission },
    { kind: 'field', label: 'Certification', value: PR_LIST_CITATIONS.certification },
    { kind: 'field', label: 'Removal of a candidate', value: PR_LIST_CITATIONS.removal },
    { kind: 'field', label: 'List composition', value: PR_LIST_CITATIONS.composition },
    { kind: 'para', text: LIST_LENGTH_BASIS },
    { kind: 'para', text: GENDER_BASIS },
    {
      kind: 'callout',
      text:
        'Identity numbers are masked on this document, as they are on every screen in this platform. If a ' +
        'submission requires them in full, take them from your own records — a printed list carrying ' +
        'thirteen digits per candidate is a disclosure in its own right, and this platform will not be ' +
        'what produced it.',
    },
  );

  return {
    title: 'Party list — candidates in order of preference',
    subtitle: `${meta.partyName} · ${meta.municipalityName}`,
    meta: {
      organisation: meta.organisation,
      version: meta.version,
      audience: meta.partyName,
      status: 'ISSUED',
      reference: 'IC-ECOS-PRL-2026',
    },
    blocks,
  };
}
