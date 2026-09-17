/**
 * Election Campaign OS — answering a POPIA access request
 * POPIA §23 (right of access), Condition 8.
 *
 * WHY THIS EXISTS
 *
 * The request log could record that an access request arrived, that
 * somebody was working on it, and that it was fulfilled. It could not
 * help anybody actually answer one. A compliance officer handed "Thandi
 * Mokoena wants to know what you hold about her" had no search, no way to
 * assemble what was found, and nothing to hand back — so "fulfilled" was
 * a status somebody set after doing the work in a spreadsheet, if they did
 * it at all.
 *
 * THE PART THAT MATTERS MOST IS WHAT IT ADMITS IT DID NOT SEARCH
 *
 * A subject access response that quietly omits a collection is worse than
 * no response: the data subject reads a complete-looking answer and stops
 * asking. Some of this tenant's collections cannot be searched by name at
 * all — donor and candidate identity numbers are encrypted, and staff
 * records are keyed by sign-in id. Those are listed, by name, on the
 * response itself, with what the person should do about it.
 *
 * That is not a limitation to apologise for in a comment. It is the most
 * important sentence on the document, and `subjectAccess.test.ts` fails if
 * it stops being emitted.
 *
 * THIS PRODUCES A DRAFT FOR A PERSON TO CHECK
 *
 * Nothing here decides what to disclose. POPIA §23 has grounds on which
 * access may be refused, a responsible party may hold information about
 * more than one person in a single record, and a canvasser's safety note
 * about a household is information about the people in it. A human reads
 * this before it goes anywhere.
 */
import type { Block, PrintDocument } from '@/lib/document/model';
import type { Voter } from '@/dal/ports/voters';
import type { Household } from '@/dal/ports/households';
import type { DataSubjectRequest } from '@/dal/ports/dataSubjectRequests';
import { CONTACT_STATUS_LABEL } from '@/modules/voters/canvassQueue';
import { SENTIMENT_META } from '@/modules/voters/sentiment';

/** A collection this assembly could not search, and why. */
export interface UnsearchedSource {
  label: string;
  reason: string;
}

/**
 * Named on every response. These are not gaps to be tidied away later —
 * each is a real property of how this product stores the data, and a
 * response that did not disclose them would be misleading.
 */
export const UNSEARCHED_SOURCES: UnsearchedSource[] = [
  {
    label: 'Donation and donor records',
    reason:
      'Donor identity numbers are held encrypted and cannot be searched by name. If the person has donated, ' +
      'the finance officer must look them up by donor record and add what is found.',
  },
  {
    label: 'Candidate records',
    reason:
      'Candidate identity numbers are held encrypted. If the person has stood as a candidate, that record ' +
      'must be retrieved separately.',
  },
  {
    label: 'Staff and volunteer records',
    reason:
      'Staff records are keyed by sign-in identifier, not by name. If the person has worked for the campaign, ' +
      'an administrator must retrieve their record.',
  },
  {
    label: 'Incidents and casework',
    reason:
      'These record faults at places rather than information about named people, and are not searchable by ' +
      'name. If the person reported something, say so in the covering note.',
  },
];

export const ASSEMBLY_BASIS =
  'This response was assembled by searching the voter roll for the name given. It is a draft: the sources ' +
  'listed as not searched have to be checked by a person before it is sent, and what may lawfully be ' +
  'disclosed is a decision for the responsible party, not for this platform.';

/**
 * Printed on the response itself, for the data subject.
 *
 * It names the sources that were not searched, in the document the person
 * receives — so an incomplete answer is visibly incomplete to the one
 * reader who cannot check it for themselves.
 */
export const COMPLETENESS_NOTICE =
  'This response covers the campaign records found by searching for the name given. Some records this ' +
  'campaign holds cannot be searched by name and are listed below — if any of them may concern you, say so ' +
  'and they will be retrieved. Telling you which records were not searched is part of answering you ' +
  'honestly.';

/**
 * Split a name the way the request log recorded it: last token is the
 * surname, everything before it is given names.
 *
 * Wrong for plenty of real names — a two-word surname, a name written
 * surname-first, a person with one name. It is a starting point for a
 * form field a human then corrects, never a silent normalisation, and
 * the search screen keeps both fields editable for exactly that reason.
 */
export function splitRequesterName(name: string): { firstName: string; lastName: string } {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: '', lastName: '' };
  if (parts.length === 1) return { firstName: parts[0], lastName: '' };
  return { firstName: parts.slice(0, -1).join(' '), lastName: parts[parts.length - 1] };
}

export interface SubjectAccessFindings {
  request: DataSubjectRequest;
  voters: Voter[];
  /** Households the found voters belong to, where they could be read. */
  households: Household[];
  assembledAt: string;
  assembledByName: string;
}

export interface SubjectAccessMeta {
  organisation: string;
  version: string;
}

function voterBlocks(voter: Voter, households: Household[]): Block[] {
  const household = households.find((h) => h.id === voter.householdId);
  const blocks: Block[] = [
    { kind: 'heading', level: 3, text: `${voter.firstName} ${voter.lastName}` },
    { kind: 'field', label: 'Contact number', value: voter.phoneMasked },
    { kind: 'field', label: 'Voting district', value: voter.vdCode },
    { kind: 'field', label: 'Ward', value: voter.wardCode },
    { kind: 'field', label: 'Recorded view', value: SENTIMENT_META[voter.sentiment].label },
    { kind: 'field', label: 'Consent recorded', value: voter.popiaConsentMethod },
  ];
  if (voter.popiaConsentAt) blocks.push({ kind: 'field', label: 'Consent date', value: voter.popiaConsentAt });
  if (voter.popiaConsentReference) {
    blocks.push({ kind: 'field', label: 'Consent reference', value: voter.popiaConsentReference });
  }
  blocks.push({ kind: 'field', label: 'Record created', value: voter.createdAt });

  if (household) {
    blocks.push({ kind: 'field', label: 'Address held', value: household.addressLine });
    if (household.contactStatus) {
      blocks.push({
        kind: 'field',
        label: 'Canvassing status',
        value: CONTACT_STATUS_LABEL[household.contactStatus],
      });
    }
    // An access note is information about the people at an address. It is
    // surfaced for the officer to consider, never silently withheld and
    // never silently included.
    if (household.accessNote) {
      blocks.push({
        kind: 'callout',
        text:
          'This household carries a canvasser access note. It is information recorded about this address and ' +
          'the people at it, so it is within the scope of an access request — read it and decide what to ' +
          'disclose before sending. It is not reproduced here automatically.',
      });
    }
  }
  return blocks;
}

/**
 * The response document, as a draft. Status is DRAFT_PENDING_REVIEW
 * because a person has to check it — see the header.
 */
export function subjectAccessDocument(
  findings: SubjectAccessFindings,
  meta: SubjectAccessMeta,
): PrintDocument {
  const { request, voters, households } = findings;
  const blocks: Block[] = [
    { kind: 'callout', text: COMPLETENESS_NOTICE },

    { kind: 'heading', level: 1, text: 'Your request' },
    { kind: 'field', label: 'Received', value: request.receivedAt },
    { kind: 'field', label: 'Request type', value: request.requestType },
    { kind: 'field', label: 'Name given', value: request.requesterName },
    { kind: 'field', label: 'Reference', value: request.id },

    { kind: 'heading', level: 1, text: 'What was found on the voter roll' },
  ];

  if (voters.length === 0) {
    blocks.push({
      kind: 'para',
      text:
        'No record was found on the voter roll for the name given. That does not mean this campaign holds ' +
        'nothing about you — it means nothing was found under that name, in the records that can be searched ' +
        'by name. The sources below were not searched.',
    });
  } else {
    blocks.push({
      kind: 'para',
      muted: true,
      text: `${voters.length} record(s) found. Every field held on each is listed.`,
    });
    for (const voter of voters) blocks.push(...voterBlocks(voter, households));
  }

  blocks.push(
    { kind: 'pageBreak' },
    { kind: 'heading', level: 1, text: 'What was not searched' },
    {
      kind: 'para',
      muted: true,
      text:
        'These records cannot be searched by the name given. They are listed so that an incomplete answer is ' +
        'visibly incomplete rather than quietly so.',
    },
  );
  for (const source of UNSEARCHED_SOURCES) {
    blocks.push({ kind: 'heading', level: 3, text: source.label });
    blocks.push({ kind: 'para', text: source.reason });
  }

  blocks.push(
    { kind: 'heading', level: 1, text: 'What you can ask for next' },
    {
      kind: 'bullets',
      items: [
        'Correction of anything above that is wrong. Say what it should be.',
        'That the campaign stop contacting you. This is honoured permanently and your address is never returned to a canvassing round.',
        'Deletion. Read the note below first — what this campaign can actually do about a deletion request is limited, and you are entitled to know that before you ask.',
      ],
    },
    {
      kind: 'callout',
      text:
        'This platform suppresses records; it does not destroy or de-identify them. A request to delete will ' +
        'result in the record being hidden from the application, or refused where the law requires the record ' +
        'to be kept — and you will be told which of those happened.',
    },

    { kind: 'heading', level: 1, text: 'Who prepared this' },
    { kind: 'field', label: 'Prepared by', value: findings.assembledByName },
    { kind: 'field', label: 'Prepared on', value: findings.assembledAt },
  );

  return {
    title: 'Response to your request for access',
    subtitle: 'Personal information held by this campaign, and what was not searched',
    meta: {
      organisation: meta.organisation,
      version: meta.version,
      audience: request.requesterName,
      status: 'DRAFT_PENDING_REVIEW',
      reference: `DSR-${request.id.slice(0, 8)}`,
    },
    blocks,
  };
}
