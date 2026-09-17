/**
 * Election Campaign OS — the three factual notices
 *
 * WHY THESE THREE ARE DRAFTED HERE AND THE OTHERS ARE NOT
 *
 * A privacy notice, a processing-and-residency disclosure and a capability
 * statement are documents that *describe what a system does*. This
 * repository is the authority on that, and every sentence below is a fact
 * about code in it — traceable to `facts.ts`, which in turn names the file
 * and the test behind each claim.
 *
 * They are still marked DRAFT — PENDING ATTORNEY REVIEW, because
 * describing a system accurately is not the same as discharging a
 * statutory duty. POPIA §18 prescribes what a notification must contain,
 * §20–21 govern the operator relationship, and §72 governs transfer out of
 * the Republic. Whether these say enough, to the right person, at the
 * right time, is counsel's call.
 *
 * The instruments that *allocate risk* — terms, licence, tenancy,
 * indemnities, limitation — are not drafted here at all. See
 * `draftingPacks.ts` for what is produced instead and why.
 */
import type { Block, PrintDocument } from '@/lib/document/model';
import { COMPANY_LEGAL_NAME, COMPANY_REG_LINE, PRODUCT_NAME } from '@/lib/legalText';
import { RESPONSE_TARGET_DAYS } from '@/modules/settings/dataSubjectRequestSla';
import { MUST_NOT_CLAIM, PRODUCT_FACTS } from './facts';

export interface LegalDocumentMeta {
  organisation: string;
  version: string;
}

/**
 * The sentence that has to survive every review of the privacy notice.
 * Guarded by `legal.test.ts` — if the notice ever stops saying this while
 * still offering a deletion request, the notice has become untrue.
 */
export const SUPPRESSION_NOT_ERASURE =
  'This platform suppresses records; it does not destroy or de-identify them. A request to delete personal ' +
  'information will result in the record being hidden from the application, or refused where the law requires ' +
  'the record to be kept. It will not result in erasure, and you will be told which of those happened.';

/** The §72 disclosure, in the one form it may be made. */
export const CROSS_BORDER_DISCLOSURE =
  'Campaign data — voters, households, incidents, donations, documents — is held in the Johannesburg ' +
  '(africa-south1) region. Sign-in is handled by Firebase Authentication, which processes an email address and ' +
  'an opaque account identifier outside the Republic. That transfer is disclosed here rather than covered by a ' +
  'broader assurance, because a broader assurance would be false.';

function heading(text: string, level: 1 | 2 | 3 = 2): Block {
  return { kind: 'heading', level, text };
}

/* -------------------------------------------------------------------- */
/* LEG-01 — Privacy Notice                                              */
/* -------------------------------------------------------------------- */

export function privacyNotice(meta: LegalDocumentMeta): PrintDocument {
  const blocks: Block[] = [
    heading('Who holds your information', 1),
    {
      kind: 'para',
      text:
        `${meta.organisation} decides why and how personal information is used in this platform, and is the ` +
        'responsible party for it under the Protection of Personal Information Act 4 of 2013. ' +
        `${COMPANY_LEGAL_NAME} supplies and operates the platform on its instruction. Which party carries which ` +
        'obligation under §20 and §21 of that Act is being confirmed with counsel and is recorded as an open ' +
        'question in the schedule to this notice.',
    },

    heading('What the platform holds'),
    {
      kind: 'bullets',
      items: [
        'Voter and supporter records: name, contact details, address, voting district, and the canvassing history recorded against them.',
        'Household records: address, dwelling type, contact outcome, and — where a canvasser has recorded one — an access note describing hazards at that address.',
        'Incident and casework records logged by field teams, including any photographs attached to them.',
        'Donation and donor records, where the subscriber uses the funding module.',
        'User accounts: name, email address, assigned role, and the ward or voting district assigned to them.',
      ],
    },
    {
      kind: 'para',
      muted: true,
      text:
        'A safety note on a household is personal information about identifiable people and is treated as such. ' +
        'It is visible to the field team assigned to that area, it is subject to the same rights as any other ' +
        'record here, and it is redacted before it appears in any export.',
    },

    heading('Consent, and what the platform refuses to do without it'),
    {
      kind: 'para',
      text:
        'A voter record cannot be created in this platform without a recorded consent method, consent date and ' +
        'consent reference. This is enforced by the database security rules, not by a form validation that a ' +
        'determined user could route around. Importing an existing register requires the same declaration before ' +
        'any row is written.',
    },

    heading('Where it is processed'),
    { kind: 'para', text: CROSS_BORDER_DISCLOSURE },
    {
      kind: 'para',
      text:
        'The application also keeps a working copy of the data a user needs on their own device, so that ' +
        'canvassing works where there is no signal. That copy is personal information in the subscriber’s hands ' +
        'and in its user’s pocket, and the device controls that protect it — screen lock, device encryption, ' +
        'signing out of a shared phone — are part of how this platform protects information, not an afterthought.',
    },

    heading('Your rights, stated accurately'),
    {
      kind: 'para',
      text:
        'Condition 8 of POPIA gives a data subject the right to ask what information is held about them, to have ' +
        'it corrected, and to object to its use. Those requests are logged in this platform, assigned to a ' +
        'compliance officer, and tracked to an outcome.',
    },
    { kind: 'callout', text: SUPPRESSION_NOT_ERASURE },
    {
      kind: 'bullets',
      items: [
        'Access and correction requests can be actioned in full.',
        'A request to stop contact is honoured permanently: a household that asks not to be contacted again is never returned to a canvassing queue.',
        'A request to delete a donation or donor record will be refused. Those records are treated as statutory records under the Political Party Funding Act, and §14(1) of POPIA permits retention where the law requires or authorises it.',
        'A request to delete any other record results in suppression, described above.',
      ],
    },

    heading('How long it is kept'),
    {
      kind: 'para',
      text:
        'Campaign records are retained for as long as the subscriber holds them, and donation records for as ' +
        'long as the Political Party Funding Act requires. The exact retention period under that Act is one of ' +
        'the open questions in the schedule; it has not been assumed.',
    },

    heading('Making a request, and complaining'),
    {
      kind: 'para',
      text:
        `Requests go to ${meta.organisation}, which holds the records. They are logged in the platform and ` +
        `worked to an internal target of ${RESPONSE_TARGET_DAYS} days. That target is set by this platform, not ` +
        'by statute — POPIA prescribes no fixed period for these requests, and this notice does not pretend ' +
        'otherwise. A data subject who is not satisfied may complain to the Information Regulator.',
    },

    heading('The operator'),
    { kind: 'field', label: 'Platform', value: PRODUCT_NAME },
    { kind: 'field', label: 'Supplied by', value: COMPANY_REG_LINE },
  ];

  return {
    title: 'Privacy Notice',
    subtitle: 'How personal information is used in Election Campaign OS',
    meta: {
      organisation: meta.organisation,
      version: meta.version,
      status: 'DRAFT_PENDING_REVIEW',
      reference: 'IC-ECOS-LEG-01',
    },
    blocks,
  };
}

/* -------------------------------------------------------------------- */
/* LEG-02 — Data Processing & Residency Disclosure                      */
/* -------------------------------------------------------------------- */

export function residencyDisclosure(meta: LegalDocumentMeta): PrintDocument {
  const blocks: Block[] = [
    heading('Why this document exists separately', 1),
    {
      kind: 'para',
      text:
        'Campaign data about South African voters attracts a question that a general privacy notice answers ' +
        'badly: where, precisely, does it go. This states it component by component, including the one component ' +
        'that leaves the Republic.',
    },

    heading('In the Republic'),
    {
      kind: 'bullets',
      items: [
        'The campaign datastore — voters, households, incidents, casework, donations, documents, audit records — is held in the Johannesburg (africa-south1) region.',
        'Uploaded files, including referral documents and incident photographs, are held in the same region.',
        'Every server-side function this product runs is pinned to that region, without exception. It is a build rule, and a function declared anywhere else fails the build.',
      ],
    },

    heading('Outside the Republic'),
    { kind: 'callout', text: CROSS_BORDER_DISCLOSURE },
    {
      kind: 'para',
      text:
        'What that means concretely: the sign-in service knows that an account exists, with an email address and ' +
        'an identifier. It does not hold voter records, household records, incidents or donations. Section 72 of ' +
        'POPIA governs that transfer, and the basis relied on for it is an open question for counsel rather than ' +
        'a position asserted here.',
    },

    heading('On the field device'),
    {
      kind: 'para',
      text:
        'This is a field application, and it is built to work where there is no network. It therefore stores ' +
        'the records a user is entitled to see in the browser’s own database on their device, together with a ' +
        'queue of changes waiting to be sent. Both are cleared when the user signs out.',
    },
    {
      kind: 'para',
      muted: true,
      text:
        'The practical consequence is worth stating plainly, because it is the disclosure most often left out: a ' +
        'lost, unlocked phone is a personal information incident, and the controls that prevent it are the ' +
        'subscriber’s device controls.',
    },

    heading('Sub-processors'),
    {
      kind: 'para',
      text:
        'The platform runs on Google Cloud Platform (Firebase). No other processor receives campaign data. ' +
        'There is no analytics vendor, no advertising identifier, and no third-party data enrichment in this ' +
        'product.',
    },

    heading('What separates one subscriber from another'),
    {
      kind: 'para',
      text:
        'Subscribers share infrastructure and do not share data. Separation is enforced in three independent ' +
        'places — the signed-in user’s token, the database security rules, and the data access layer — so that a ' +
        'request which clears one still has to clear the other two. Each is covered by tests that fail if the ' +
        'separation is weakened.',
    },
  ];

  return {
    title: 'Data Processing & Residency Disclosure',
    subtitle: 'Where campaign data is held, what leaves the Republic, and what separates one subscriber from another',
    meta: {
      organisation: meta.organisation,
      version: meta.version,
      status: 'DRAFT_PENDING_REVIEW',
      reference: 'IC-ECOS-LEG-02',
    },
    blocks,
  };
}

/* -------------------------------------------------------------------- */
/* LEG-03 — Product Capability & Limitations Statement                  */
/* -------------------------------------------------------------------- */

export function capabilityStatement(meta: LegalDocumentMeta): PrintDocument {
  const blocks: Block[] = [
    heading('What this is', 1),
    {
      kind: 'para',
      text:
        'A statement of what this platform does, and — at equal length — what it does not do. It exists because ' +
        'the ordinary failure in this market is not a product that underperforms; it is a product described in ' +
        'terms that imply a statutory function it does not have. Everything in the first list is established in ' +
        'the product’s own source and held there by a test. Everything in the second is a claim this platform ' +
        'will not make.',
    },

    heading('What the platform does'),
    { kind: 'bullets', items: PRODUCT_FACTS.map((f) => f.claim) },

    { kind: 'pageBreak' },
    heading('What the platform does not do', 1),
    {
      kind: 'para',
      muted: true,
      text:
        'Each of these is a claim that would be false. They are listed rather than quietly avoided, because a ' +
        'subscriber choosing between products deserves to know which line this one will not cross.',
    },
  ];

  for (const prohibition of MUST_NOT_CLAIM) {
    blocks.push({ kind: 'heading', level: 3, text: prohibition.claim.replace(/^That /, 'It does not claim that ') });
    blocks.push({ kind: 'para', text: prohibition.because });
  }

  blocks.push(
    { kind: 'pageBreak' },
    heading('Where each statement comes from', 1),
    {
      kind: 'para',
      muted: true,
      text:
        'Each claim above names the source file that makes it true and the automated test that fails if it ' +
        'stops being true. This table is generated from the product, not written alongside it.',
    },
  );
  for (const fact of PRODUCT_FACTS) {
    blocks.push({ kind: 'para', text: fact.claim });
    blocks.push({ kind: 'field', label: 'Established in', value: fact.establishedIn });
    blocks.push({ kind: 'field', label: 'Guarded by', value: fact.guardedBy });
    blocks.push({ kind: 'rule' });
  }

  return {
    title: 'Product Capability & Limitations Statement',
    subtitle: 'What Election Campaign OS does, what it refuses to do, and where each statement is established',
    meta: {
      organisation: meta.organisation,
      version: meta.version,
      status: 'DRAFT_PENDING_REVIEW',
      reference: 'IC-ECOS-LEG-03',
    },
    blocks,
  };
}
