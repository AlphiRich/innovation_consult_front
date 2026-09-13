/**
 * Election Campaign OS — SOP-07, Issuing a service delivery referral
 *
 * SOP-06 ends where this begins. It is the only procedure in the manual
 * whose output leaves the organisation with the party's name on it, and
 * the only one where a mistake is read by somebody the campaign does not
 * control.
 *
 * The referral module itself was already complete and guarded — the
 * document, the disclaimer, the deterministic PDF, the content hash, the
 * ordered writes. What writing this SOP found was a promise the document
 * makes about itself and could not keep: every referral prints an
 * integrity hash and a sentence saying it verifies the particulars against
 * the record held here, and nothing could perform that check, because the
 * particulars were inside the PDF and nowhere else. The registry now
 * stores the serialization the hash was taken over, and
 * `verifyReferral.ts` recomputes it.
 *
 * Claims are asserted in `manual.test.ts` against the referral module's
 * own constants, so the disclaimer and the hash basis this SOP quotes are
 * the ones actually printed.
 */
import {
  EVIDENCE_BASIS,
  INTEGRITY_HASH_BASIS,
  STANDING_DISCLAIMER,
} from '@/modules/incidents/referral/referralDocument';
import { CHECK_MESSAGE } from '@/modules/incidents/referral/verifyReferral';
import type { Sop } from '../manualModel';

export const REFERRAL_SOP: Sop = {
  number: 'SOP-07',
  title: 'Issuing a service delivery referral',
  area: 'WAR_ROOM',
  roles: ['municipal-team-lead'],
  requiresAnyCapability: ['incidents.escalate'],
  purpose:
    'How an escalated incident becomes a document addressed to a municipality: what the referral says and ' +
    'what it deliberately does not, how to prepare and check a draft, what authorising it commits you to, ' +
    'and how to prove afterwards what was sent.',
  sections: [
    {
      heading: 'What you are signing',
      body: [
        'A referral is your campaign formally handing a logged service-delivery fault to the department responsible for it, with a reference number both sides can quote. Your organisation is named at the top. Your name is on the bottom.',
        'It is not a municipal document and it must never be able to be mistaken for one. The addressee appears as an addressee, not as an authority issuing anything, and the disclaimer below is printed on every copy — draft or authorised — and cannot be removed.',
      ],
      warnings: [STANDING_DISCLAIMER],
    },
    {
      heading: 'Before you prepare one',
      body: [
        'A referral can only be prepared for an incident that has been escalated. If the action is not offered, the incident has not reached that point — triage it and escalate it first, which is SOP-06.',
      ],
      steps: [
        'Read the incident as a stranger would. The description goes onto the document unchanged, and a municipal official reading "council is useless" learns nothing about a burst pipe.',
        'Check the ward and the voting district are right. They are on the document, and a referral for the wrong ward wastes somebody\'s week.',
        'Decide which department it goes to. The platform does not know the municipality\'s internal structure and will not guess it for you.',
        'Write the covering note if there is something a reader needs that the incident record does not say — a pattern, a previous reference, a date something was promised. Leave it empty rather than filling it with nothing.',
      ],
      warnings: [
        'The issuing organisation is typed by you and is not filled in from anywhere. This platform holds no display name for your campaign, and putting a party name on a document addressed to a municipality is not something software should guess at.',
      ],
    },
    {
      heading: 'The draft, and reading it properly',
      body: [
        'Preparing produces a draft: the complete document, watermarked as a draft, which you can read before anything is issued. Nothing has been written to the record at this point and nothing has left the campaign.',
        'Read the whole thing, not the form you typed into. The draft is what a municipal official will see.',
      ],
      steps: [
        'Check the addressee: municipality, code, and department.',
        'Check the particulars: category, severity, ward, voting district, when it was logged, when it was escalated.',
        'Check the description and the covering note read as something a stranger can act on.',
        'Check the photographs listed are the ones you mean. ' + EVIDENCE_BASIS,
      ],
      warnings: [
        'Severity on the document is your campaign\'s judgement of urgency. It corresponds to no municipal classification and no service standard, and a reader who treats it as one has been misled by you, not by the platform.',
      ],
    },
    {
      heading: 'Authorising it',
      body: [
        'Authorising is the act that makes the document real. It removes the draft watermark, stamps it with your name, your role and the moment, stores it, and moves the incident to referred.',
        'It is signed in your name because you are the one signing it. The name and role come from your own staff record, not from a setting — a referral signed by nobody, or by a constant, is what this build found in the material it was handed and refused to reproduce.',
      ],
      steps: [
        'Confirm the name and role shown are yours and are right. If your staff record has no name on it, fix that first — the platform will not issue a referral without one.',
        'Authorise. The document is stored and the incident moves to referred.',
        'Deliver it. The platform sends nothing and notifies nobody, by design: you send it by whatever channel the municipality actually uses and record having done so.',
        'Keep the reference. It is what you quote when you follow up, and what they quote back.',
      ],
      warnings: [
        'A referral is authorised by the person signed in, and the platform refuses to let one person sign in another\'s name. If somebody else should sign it, they authorise it themselves.',
        'An incident marked referred that nobody actually sent has been referred to a filing cabinet. The status records what the platform did, not what the campaign did.',
      ],
    },
    {
      heading: 'Proving later what you sent',
      body: [
        'Every issued referral carries an integrity hash. ' + INTEGRITY_HASH_BASIS,
        'From the incident, "Check against the record" recomputes it. That is worth doing before any conversation where the contents of a referral are in dispute, and worth doing at least once so you know what a pass looks like.',
      ],
      steps: [
        'Open the referred incident and run the check.',
        'If it matches, compare the hash against the one printed on whatever copy you have been shown. If those agree too, the paper and the record are the same referral.',
        'If they disagree, the copy is not the document you issued. Say so plainly and produce the record\'s own copy.',
      ],
      warnings: [
        CHECK_MESSAGE.DIFFERS,
        'A passing check is narrow and worth understanding: it says the record has not been altered since issue. It says nothing about the photographs, it is not a signature, and it cannot show the referral was ever delivered.',
      ],
    },
    {
      heading: 'Re-issuing, and why you usually should not',
      body: [
        'Issuing the same referral twice is safe — the document is addressed by its own content, so an identical referral lands in the same place and does not fork into two authorised copies. That is there so a failed upload can be retried, not so a document can be revised.',
        'A referral whose particulars have changed is a different document and hashes differently. Issuing it creates a second authorised referral for the same incident, and the municipality now holds two.',
      ],
      warnings: [
        'If a referral went out wrong, do not quietly re-issue a corrected one. Tell the department, in writing, quoting the original reference. A campaign that silently replaces documents it has sent to a municipality will be found out by the one official who kept both.',
      ],
    },
  ],
};
