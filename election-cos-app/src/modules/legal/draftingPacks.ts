/**
 * Election Campaign OS — drafting packs for the risk-allocating instruments
 *
 * WHAT A DRAFTING PACK IS, AND WHY IT IS NOT THE INSTRUMENT
 *
 * The terms of use, the licence, the subscriber tenancy agreement, the
 * pricing and accounts terms, and the disclaimer / indemnity / limitation
 * statement all do the same thing: they allocate risk between two parties
 * under South African law, in a context that touches personal information
 * and political party funding. Drafting them is attorney work, and this
 * repository's standing rule — never assert legal content that has not
 * been verified — applies with the most force exactly here, because these
 * documents *are* the assertion.
 *
 * What this build can do, and what an attorney genuinely needs, is the
 * other half of the job: a complete and truthful account of what the
 * system does, what it must never be said to do, what the company still
 * has to decide, and what nobody has answered yet. That is a drafting
 * pack. It contains no operative clauses, and `legal.test.ts` fails if one
 * appears.
 *
 * Each pack carries three schedules, identical across the set and
 * generated from `facts.ts`, plus a front section specific to the
 * instrument. The schedules are repeated rather than cross-referenced
 * because these documents get sent one at a time.
 */
import type { Block, PrintDocument } from '@/lib/document/model';
import { COMPANY_LEGAL_NAME } from '@/lib/legalText';
import { MUST_NOT_CLAIM, OPEN_QUESTIONS, PRODUCT_FACTS } from './facts';
import type { LegalDocumentMeta } from './notices';

export interface InstrumentSpec {
  reference: string;
  title: string;
  subtitle: string;
  /** What the instrument is for, in this product's specific context. */
  purpose: string[];
  /** What the instrument has to cover. Scope, not clauses. */
  scope: string[];
  /**
   * Commercial and operational decisions only the company can make. An
   * attorney cannot draft around a blank here, and neither can this build.
   */
  decisionsRequired: string[];
  /** Questions specific to this instrument, beyond the standing schedule. */
  questions: string[];
}

/**
 * The bright line, restated on every pack. Guarded — a pack that loses
 * this sentence has stopped announcing what it is.
 */
export const NO_OPERATIVE_CLAUSES =
  'This pack contains no operative clauses, no warranties, no limitations and no indemnities, and none should ' +
  'be inferred from it. Where it says the product does something, that is a statement of fact about software, ' +
  'traceable to a named source file and a named test. Where it says something must be decided, it has not been ' +
  'decided. The instrument itself is to be drafted by a qualified South African attorney.';

export const INSTRUMENTS: InstrumentSpec[] = [
  {
    reference: 'IC-ECOS-LEG-04',
    title: 'Terms of Use',
    subtitle: 'Drafting pack — the agreement between the platform and the person using it',
    purpose: [
      'The terms govern the individual user: the canvasser on a doorstep, the ward lead in a war room, the ' +
        'compliance officer answering a data subject request. They are distinct from the subscriber agreement, ' +
        'which governs the organisation that bought the subscription, because in this product those are almost ' +
        'never the same person and the individual user frequently never signs anything.',
      'The operative question the terms must answer is how a user who was invited by a party administrator, ' +
        'and who accepted an invitation on a phone in a township street, comes to be bound.',
    ],
    scope: [
      'Acceptance — how a user invited by a subscriber becomes bound, and what they are shown at that moment.',
      'Acceptable use, including the prohibition on using voter contact data for anything other than the ' +
        'subscriber’s campaign purposes.',
      'Account security on a shared or personal device, given that the application holds campaign data on that device.',
      'The user’s obligations on ceasing to act for the subscriber.',
      'Suspension and termination of an individual user’s access, and who may do it.',
      'That the operations manual is guidance and does not vary these terms.',
    ],
    decisionsRequired: [
      'Whether individual users accept the terms directly, or whether the subscriber warrants that it has bound them.',
      'Whether a canvasser’s personal device is permitted at all, or only a subscriber-issued device.',
      'What happens to a user account when a subscriber’s subscription lapses mid-campaign.',
    ],
    questions: [
      'Does presenting the terms at first sign-in, on a phone, constitute adequate notice for a consumer-facing ' +
        'agreement under the Consumer Protection Act, and does that Act apply to this relationship at all?',
      'A field user records safety information about third parties — hazards at a household. What duty, if any, ' +
        'do the terms need to place on that user about how they record it?',
    ],
  },
  {
    reference: 'IC-ECOS-LEG-05',
    title: 'Subscriber Tenancy Agreement',
    subtitle: 'Drafting pack — the agreement between the platform and the subscribing organisation',
    purpose: [
      'This is the principal commercial agreement: a political party, a municipal caucus or a campaign structure ' +
        'subscribes to a tenant, and that tenant is the boundary within which its data lives.',
      'It carries the POPIA operator relationship. The subscriber decides why and how personal information is ' +
        'used; Innovation Consult processes it on that instruction. Sections 20 and 21 of POPIA require that ' +
        'relationship to be in writing, and this is the writing.',
    ],
    scope: [
      'Provision of a tenant, and what tenancy means technically — the three-layer separation described in Schedule A.',
      'The operator relationship under POPIA §20–21, including the security obligations of each party.',
      'Subscriber warranties on the lawfulness of data it imports, which is the largest single risk in this product.',
      'Module entitlements: what was subscribed to, for which wards, and until when.',
      'Data on exit — export format, retention, and the fact that suppression is not destruction.',
      'Notification of a personal information compromise under POPIA §22, and who notifies the Regulator.',
      'Term, renewal, suspension for non-payment, and what happens to data during a suspension.',
    ],
    decisionsRequired: [
      'The exit position: what the subscriber receives on termination, in what format, and within what period.',
      'Whether data is retained after termination and for how long, given that the platform cannot destroy it. ' +
        'This is the decision most likely to be made by default and regretted.',
      'Who bears the cost and the notification duty when a compromise originates on a subscriber’s device.',
      'Whether a subscriber may subscribe ward-by-ward, and whether a ward-scoped subscription implies anything ' +
        'about data the tenant already holds for other wards.',
    ],
    questions: [
      'Which party is the responsible party and which the operator, on these facts, and does that allocation ' +
        'survive the subscriber being a political party rather than an ordinary commercial entity?',
      'Does the Political Party Funding Act place any duty on a service provider that holds donation records on ' +
        'a party’s behalf, or only on the party?',
      'The platform cannot destroy data. What must the agreement say about deletion on exit so that it is both ' +
        'true and adequate?',
    ],
  },
  {
    reference: 'IC-ECOS-LEG-06',
    title: 'Licence Agreement',
    subtitle: 'Drafting pack — rights in the software, the content, and what a subscriber creates in it',
    purpose: [
      'The licence separates three things that are routinely confused in this market: rights in the software ' +
        'itself, rights in the material Innovation Consult supplies inside it, and rights in the data a ' +
        'subscriber puts into it.',
      'The third is the one that matters commercially. A party’s canvassing history is the party’s asset, and a ' +
        'licence that appears to claim it will end a sale.',
    ],
    scope: [
      'The software licence: scope, duration, and that it is a right to use a hosted service rather than a copy delivered.',
      'Ownership of subscriber data, stated unambiguously in the subscriber’s favour.',
      'Rights in material Innovation Consult supplies — the operations manual, standard operating procedures, ' +
        'templates, the referral document format.',
      'Rights in aggregated or derived material, and whether any is permitted at all.',
      'Restrictions: reverse engineering, resale, and use of the platform by a party other than the subscriber.',
      'Third-party components, and the fact that the platform runs on Google Cloud Platform.',
    ],
    decisionsRequired: [
      'Whether Innovation Consult takes any right to use subscriber data in aggregate or de-identified form. ' +
        'The honest position today is that no de-identification routine exists in the product, so a licence ' +
        'permitting de-identified use would permit something the platform cannot currently do.',
      'Whether the operations manual may be reproduced by a subscriber for its own training, and whether it may ' +
        'be altered.',
      'Whether a subscriber may permit an affiliated structure — a provincial or regional body — to use its tenant.',
    ],
    questions: [
      'Does an election-period licence need any specific treatment of what happens to the licence between elections?',
      'Is there any restriction on licensing campaign software to political parties, or to a party and its ' +
        'opponent simultaneously, that this licence needs to address?',
    ],
  },
  {
    reference: 'IC-ECOS-LEG-07',
    title: 'Disclaimers, Indemnities & Limitation of Liability',
    subtitle: 'Drafting pack — the risk allocation, and the specific risks this product actually carries',
    purpose: [
      'The single most important document in this set, and the one where a generic precedent does the most ' +
        'damage. This product carries four specific risks that a standard software limitation clause does not ' +
        'contemplate.',
    ],
    scope: [
      'The compliance disclaimer: the platform is an operational tool, not a compliance guarantee, and no export ' +
        'from it is a filing.',
      'The field safety disclaimer: the platform records safety information reported by canvassers and prompts ' +
        'them to pair up. It does not assess risk, and a household with no hazard recorded is not a household ' +
        'known to be safe.',
      'The data accuracy disclaimer: voter and household data is supplied and maintained by the subscriber.',
      'Availability: the application is built to work offline, and what that does and does not promise.',
      'Indemnities — in which direction, and for what.',
      'The limitation of liability itself, and its interaction with statutory liability under POPIA §99 and the ' +
        'Consumer Protection Act.',
    ],
    decisionsRequired: [
      'Whether Innovation Consult offers any service level at all, given that there is no live production ' +
        'environment yet and therefore no measured availability to stand behind.',
      'The liability cap: its amount, and its basis.',
      'Whether indemnities run in both directions, and whether the subscriber indemnifies against claims ' +
        'arising from voter data it imported.',
    ],
    questions: [
      'Canvasser safety. The platform records hazards at a household and warns a canvasser to attend in a pair. ' +
        'Does recording that information, and prompting on it, create any duty of care towards the canvasser — ' +
        'and if so, on which party does it fall, given that the canvasser is a volunteer of the subscriber and ' +
        'not of Innovation Consult? This is the question in this pack with the least precedent and the most exposure.',
      'Section 99 of POPIA creates civil liability for a responsible party irrespective of intent or negligence. ' +
        'What can an operator agreement do, and what can it not do, to allocate that?',
      'Does the Consumer Protection Act apply to a subscription sold to a political party, and if so what does ' +
        'it do to a limitation clause?',
      'A referral document produced by this platform is addressed to a municipality and carries a party’s name. ' +
        'Where does liability sit for its content?',
    ],
  },
  {
    reference: 'IC-ECOS-LEG-08',
    title: 'Pricing & Accounts Terms',
    subtitle: 'Drafting pack — how a subscription is sold, billed and ended',
    purpose: [
      'Pricing terms for a product whose demand is concentrated in the months before an election, sold to ' +
        'organisations whose funding is itself statutorily regulated.',
      'The product deliberately holds no price. Entitlement records state what a tenant subscribed to and until ' +
        'when, and never what it cost, so that billing can change without a data migration and so that no price ' +
        'is exposed through the application to a user who should not see it.',
    ],
    scope: [
      'The unit of sale: tenant, module, and — for two modules — ward.',
      'Term and renewal, against an election calendar rather than a rolling subscription year.',
      'What happens at the end of an election cycle, when a campaign structure demobilises but its data remains.',
      'Non-payment: suspension of access, and the express position that suspension does not delete data.',
      'Invoicing to an organisation whose own funding is regulated under the Political Party Funding Act.',
    ],
    decisionsRequired: [
      'The price list itself, and whether it is published or negotiated. Nothing in this build states a price, ' +
        'and no price should be inferred from anything in it.',
      'Whether a subscription is annual, per-election-cycle, or monthly, and what the minimum term is.',
      'Whether a reduced dormant-period rate exists between elections, which is the commercial question this ' +
        'product’s demand curve makes unavoidable.',
      'Whether payment by a third party on a party’s behalf is accepted, and what disclosure that attracts.',
    ],
    questions: [
      'Is a subscription paid for by a political party, or by a donor on its behalf, a donation to that party ' +
        'for the purposes of the Political Party Funding Act? If it can be, the pricing terms have to say so.',
      'What notice is required to suspend a subscriber mid-campaign for non-payment, and is there any period ' +
        'immediately before an election in which suspension should not be available at all?',
    ],
  },
];

function scheduleBlocks(): Block[] {
  const blocks: Block[] = [
    { kind: 'pageBreak' },
    { kind: 'heading', level: 1, text: 'Schedule A · What the product does' },
    {
      kind: 'para',
      muted: true,
      text:
        'Each row is a statement of fact about the software, established in the named source and held there by ' +
        'the named test. These are safe to draft against. This schedule is generated from the product itself.',
    },
  ];
  for (const fact of PRODUCT_FACTS) {
    blocks.push({ kind: 'para', text: fact.claim });
    blocks.push({ kind: 'field', label: 'Established in', value: fact.establishedIn });
    blocks.push({ kind: 'field', label: 'Guarded by', value: fact.guardedBy });
    blocks.push({ kind: 'rule' });
  }

  blocks.push(
    { kind: 'pageBreak' },
    { kind: 'heading', level: 1, text: 'Schedule B · Claims this instrument must not make' },
    {
      kind: 'para',
      muted: true,
      text:
        'Each of these has been found in real material, some of it this project’s own. They are the phrases a ' +
        'draftsperson reaches for, and each would be false here.',
    },
  );
  for (const prohibition of MUST_NOT_CLAIM) {
    blocks.push({ kind: 'heading', level: 3, text: prohibition.claim });
    blocks.push({ kind: 'para', text: prohibition.because });
  }

  blocks.push(
    { kind: 'pageBreak' },
    { kind: 'heading', level: 1, text: 'Schedule C · Open questions across the whole set' },
    {
      kind: 'para',
      muted: true,
      text:
        'Matters this build could not settle from a primary source. Each records what the product does in the ' +
        'absence of an answer, so that an answer can be applied to something concrete rather than to a gap.',
    },
  );
  for (const open of OPEN_QUESTIONS) {
    blocks.push({ kind: 'para', text: open.question });
    blocks.push({ kind: 'field', label: 'Interim position', value: open.interimPosition });
    blocks.push({ kind: 'rule' });
  }

  return blocks;
}

export function draftingPack(spec: InstrumentSpec, meta: LegalDocumentMeta): PrintDocument {
  const blocks: Block[] = [
    { kind: 'callout', text: NO_OPERATIVE_CLAUSES },

    { kind: 'heading', level: 1, text: 'What this instrument is for' },
    ...spec.purpose.map((text): Block => ({ kind: 'para', text })),

    { kind: 'heading', level: 1, text: 'What it has to cover' },
    { kind: 'bullets', items: spec.scope },

    { kind: 'heading', level: 1, text: 'Decisions required from the company' },
    {
      kind: 'para',
      muted: true,
      text:
        `These are commercial and operational choices that only ${COMPANY_LEGAL_NAME} can make. They are listed ` +
        'as blanks rather than filled with a plausible default, because a plausible default in a signed ' +
        'agreement is indistinguishable from a decision nobody took.',
    },
    { kind: 'bullets', items: spec.decisionsRequired },

    { kind: 'heading', level: 1, text: 'Questions for counsel, specific to this instrument' },
    { kind: 'bullets', items: spec.questions },

    ...scheduleBlocks(),
  ];

  return {
    title: spec.title,
    subtitle: spec.subtitle,
    meta: {
      organisation: meta.organisation,
      version: meta.version,
      status: 'DRAFTING_PACK',
      reference: spec.reference,
    },
    blocks,
  };
}
