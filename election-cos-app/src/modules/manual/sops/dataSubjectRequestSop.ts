/**
 * Election Campaign OS — SOP-09, Handling a data subject request
 *
 * The one procedure in this manual whose output goes to a member of the
 * public who cannot check it. A ward lead who is handed a wrong number
 * can go and look. A municipality that receives a referral has its own
 * records. A data subject has the sentence the campaign wrote them, and
 * no way to test it.
 *
 * Writing this found that an access request could not be answered at all.
 * The log recorded that one had arrived and offered a button marking it
 * fulfilled; between those two acts there was nothing. There was no way
 * to find a person — the only route into the roll was by voting district,
 * which is not something a data subject knows — and nothing that
 * assembled what was found or produced a document to send. "Fulfilled"
 * meant somebody had done the work in a spreadsheet, if they had done it
 * at all.
 *
 * `voters.findByName`, `subjectAccess.ts` and the prepare-response screen
 * are that gap closed. The part of it this SOP is most insistent about is
 * the disclosure of what was *not* searched: donor, candidate and staff
 * records cannot be searched by name, and a response that did not say so
 * would read as complete and be false.
 *
 * The deletion position was already correct in the code and stays quoted
 * verbatim here rather than paraphrased — `manual.test.ts` fails if this
 * SOP ever describes the 30-day target as statutory, or describes a
 * deletion as something this platform can fulfil.
 */
import {
  DONOR_ERASURE_REFUSAL_REASON,
  DOORSTEP_ERASURE_ANSWER,
  ERASURE_CAPABILITY_BASIS,
} from '@/modules/settings/dataSubjectErasure';
import { RESPONSE_TARGET_BASIS } from '@/modules/settings/dataSubjectRequestSla';
import { ASSEMBLY_BASIS, COMPLETENESS_NOTICE, UNSEARCHED_SOURCES } from '@/modules/settings/subjectAccess';
import type { Sop } from '../manualModel';

export const DATA_SUBJECT_REQUEST_SOP: Sop = {
  number: 'SOP-09',
  title: 'Handling a data subject request',
  area: 'COMPLIANCE',
  roles: ['compliance-officer', 'party-hq-admin'],
  requiresAnyCapability: ['dsr.view'],
  purpose:
    'What to do when somebody asks what this campaign holds about them, asks for it to be corrected, or ' +
    'asks for it to be deleted: how to log it, how to answer it honestly including the parts you could not ' +
    'search, what a deletion request can and cannot achieve here, and how to record an outcome that is true.',
  sections: [
    {
      heading: 'Who is answering, and what you are answering',
      body: [
        'POPIA gives a person the right to ask a responsible party what personal information it holds about them, to have it corrected, and to ask for it to be deleted or destroyed. Condition 8 is where those rights live.',
        'The responsible party here is the campaign — your party. Innovation Consult operates the platform on your behalf and is an operator, not the responsible party. That distinction is not a technicality on this page: it means the decision about what may lawfully be disclosed is yours, and no part of this software makes it for you.',
        'A request does not have to arrive in any particular form. A voter who stops a canvasser at a gate and says "take me off your list" has made one. So has an email, a phone call to the office, and a message on a party page. Log it.',
      ],
      warnings: [
        'Before you send anybody their personal information, satisfy yourself that they are who they say they are. This platform does not verify identity and will happily assemble a response about a third party for whoever asked. How you verify is your campaign\'s decision; that you verify is not optional.',
      ],
    },
    {
      heading: 'Logging it the moment it arrives',
      body: [
        'The log is the compliance record. If the Information Regulator ever asks how this campaign handles requests, the log is the answer — and a request handled well but never logged looks identical to one ignored.',
      ],
      steps: [
        'Open Settings → Data Subject Requests and log the request the day it arrives.',
        'Record who they are, how they reached you, what kind of request it is, and which kind of record it concerns — voter, staff, candidate or donor.',
        'Record it as received. Nothing logs as already fulfilled, deliberately.',
        'Start it when you begin work, so the log shows the request moving rather than sitting.',
      ],
      warnings: [
        'Log the request as it was made, not as you would prefer to answer it. Somebody who asked to be deleted has asked to be deleted, even where the answer will be that the record can only be suppressed.',
      ],
    },
    {
      heading: 'How long you have',
      body: [
        'The log flags a request as overdue against an internal target, and shows the basis for that figure on the page.',
        RESPONSE_TARGET_BASIS,
      ],
      warnings: [
        'Do not quote the target to a data subject, to a journalist or in a policy as a legal deadline. It is this campaign\'s working commitment. A number repeated often enough hardens into a claim, and this one has no statute behind it.',
      ],
    },
    {
      heading: 'Answering an access request',
      body: [
        '"Prepare response" on the request searches the voter roll for the name given, collects every field held on each record found, and builds a draft document you can read before anything goes anywhere.',
        ASSEMBLY_BASIS,
        'The search is an exact match on given names and surname as they were captured at a door. It is editable for that reason. Before you tell somebody they are not on the roll, try what a canvasser might have written down.',
      ],
      steps: [
        'Open the request and choose Prepare response.',
        'Check the name split is right, and correct it if the person\'s surname is not the last word of their name.',
        'Search. Read what came back, including the ward and voting district — more than one person shares a name.',
        'Download the draft and read the whole document, not the screen you searched from.',
        'Decide what may lawfully be disclosed, send it yourself by whatever channel the person used, and then record the outcome on the request.',
      ],
      warnings: [
        'A nil search result is a nil search result, not a finding that the campaign holds nothing. Say so in those words.',
        'The platform sends nothing. Downloading the draft has not answered anybody.',
      ],
    },
    {
      heading: 'The part of the response that matters most',
      body: [
        'Some of what this campaign holds cannot be searched by name at all, and the response says so on its own face rather than in a footnote you could drop.',
        COMPLETENESS_NOTICE,
        'Those sources are listed below. Each one is a real property of how the data is stored, not a gap waiting to be tidied away, and each has to be checked by a person before the response is sent.',
      ],
      steps: UNSEARCHED_SOURCES.map((source) => `${source.label} — ${source.reason}`),
      warnings: [
        'Never remove the not-searched section to make a response look tidier. A subject access response that quietly omits a collection is worse than no response at all: the person reads a complete-looking answer and stops asking.',
        'A canvasser access note on a household is information about the people at that address, so it is within scope. The draft tells you one exists and does not reproduce it — read it and decide. The gate or intercom code on such a note is never disclosed to anybody, including the data subject, because it is access control for somebody\'s home.',
      ],
    },
    {
      heading: 'Correction requests',
      body: [
        'A correction request is the straightforward one: this platform can genuinely correct a voter record, and doing so is an ordinary edit.',
        'Find the record the same way — the same search — then correct it and tell the person what you changed.',
      ],
      steps: [
        'Search for the record from the request, as for an access request.',
        'Correct what is wrong. If you cannot establish that the new detail is right, record what they asked for rather than asserting something nobody checked.',
        'Tell them what was changed, in writing.',
        'Record the request as fulfilled — for a correction, that word is true.',
      ],
      warnings: [
        'Donation records are corrected, never deleted, and a correction to a statutory record should be discussed with whoever handles PPFA disclosure before it is made.',
      ],
    },
    {
      heading: 'Deletion requests, and what this platform can actually do',
      body: [
        'This is the section to read twice, because the honest answer is narrower than the request.',
        ERASURE_CAPABILITY_BASIS,
        'So a deletion request has two possible true outcomes here. For a voter or household, the record is suppressed: it stops appearing in the app and no canvasser works from it again, while the information itself remains in the database. For a donor, the erasure is refused, because donation records are kept under the Political Party Funding Act and POPIA permits retention required or authorised by law.',
        'Neither of those is "fulfilled", and the app does not offer that button on a deletion request for any subject type. That is not a missing feature. It is the product refusing to write a false statement into a compliance record.',
      ],
      steps: [
        'Decide which of the two outcomes applies, from the note the app shows on the request.',
        'Do the thing: suppress the record, or refuse.',
        'Tell the data subject, in plain terms, what was actually done. They are entitled to know that suppression is not destruction.',
        'Record the outcome as a refusal with the reason, so the compliance record carries the basis rather than a bare "rejected".',
      ],
      warnings: [
        'Never tell a data subject their record has been wiped, destroyed, or is gone for good. It has not been, and a written promise of erasure that the database contradicts is the single worst document this campaign could produce.',
        DONOR_ERASURE_REFUSAL_REASON,
        'The position above is this build\'s working position and is pending attorney review. If your attorney takes a different view, the answer changes and this procedure changes with it.',
      ],
    },
    {
      heading: 'What your canvassers say at a gate',
      body: [
        'Most deletion requests will not arrive at your office. They will be said to a canvasser, at a door, by somebody who wants a straight answer on the spot.',
        'SOP-01 gives them one, and it is the same answer as this procedure — because a canvasser improvising a promise at a gate is how the false claim gets made in the first place.',
      ],
      warnings: [DOORSTEP_ERASURE_ANSWER],
    },
    {
      heading: 'Recording the outcome',
      body: [
        'The last act is the compliance record, and it is the one a regulator reads. Record what happened, not what was asked for.',
      ],
      steps: [
        'Fulfilled: use it for an access or correction request you actually answered.',
        'Refused: use it for a deletion, with the reason. The reason is the legal basis, not "cannot".',
        'Keep your own copy of what you sent. The platform stores the request and its outcome; it does not store the letter you wrote.',
      ],
      warnings: [
        'The log records what this campaign recorded. A request marked fulfilled that nobody answered is a false entry in a compliance record, made by a person, and the platform cannot tell the difference.',
      ],
    },
  ],
};
