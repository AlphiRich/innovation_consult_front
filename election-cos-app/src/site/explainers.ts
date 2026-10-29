/**
 * Election Campaign OS — the explainer pages
 *
 * These exist for two reasons, and the second one is the reason they
 * are held to this standard.
 *
 * They are the inbound-search surface the sales strategy asks for:
 * somebody searching "PPFA disclosure threshold" or "how are municipal
 * PR seats allocated" is exactly the buyer this product wants, and an
 * explainer that answers the question is a better first contact than an
 * advert. They are also **the only pages on this site where an advert
 * may appear** (`src/site/ads/adPolicy.ts`), which means a commercial
 * incentive now points at this content. That is precisely when a page
 * about the law starts drifting.
 *
 * So: every statutory fact here is one this repository already holds and
 * has already checked somewhere else, and `explainers.test.ts` compares
 * the figures against the same source the application uses rather than
 * against a copy. Nothing is written from memory, nothing is
 * paraphrased as though it were the text of a statute, and no explainer
 * tells anybody what to do — each carries the line that it is not legal
 * advice, because this build does not draft or give it (rule 3).
 *
 * WHAT IS DELIBERATELY NOT EXPLAINED HERE
 *
 * The Item 12 quota formula. Its denominator is an open reading — our
 * seat calculator uses `B − C − D`, the `mmp.ts` upload uses `B − C`,
 * and §41.4 sends that to an attorney rather than settling it. A public
 * page is the last place to publish a formula two parts of this project
 * disagree about, so the council explainer covers the structure of a
 * council, which is not in dispute, and stops there.
 */

export interface ExplainerSection {
  heading: string;
  paragraphs: string[];
}

export interface Explainer {
  slug: string;
  path: string;
  title: string;
  standfirst: string;
  /** What a reader searching for this would type. */
  question: string;
  sections: ExplainerSection[];
  sources: string[];
  updated: string;
}

/** On every explainer, without exception. See the header and rule 3. */
export const EXPLAINER_DISCLAIMER =
  'This is general information about how the law works, not legal advice. ' +
  'For advice on your own position, speak to an attorney.';

export const EXPLAINERS: Explainer[] = [
  {
    slug: 'party-funding-thresholds',
    path: '/explainers/party-funding-thresholds',
    title: 'The party-funding disclosure line, and the annual cap',
    question: 'What is the PPFA disclosure threshold in South Africa?',
    standfirst:
      'Two figures govern political donations: the amount above which a donation must be disclosed, and the most one donor may give a party in a year.',
    sections: [
      {
        heading: 'The two figures',
        paragraphs: [
          'A donation above R200,000 must be disclosed. A single donor may give a party no more than R30 million in a financial year.',
          'Both were proclaimed on 6 August 2025 in Government Gazette 53182. They replaced an earlier regime in which the disclosure line was R100,000 and the annual cap R15 million, and a still earlier R80,000 figure. Material published before August 2025 — including some that is still online — quotes the superseded numbers.',
        ],
      },
      {
        heading: 'They are under challenge',
        paragraphs: [
          'The thresholds are the subject of litigation. They are the law as it stands, and they are what this software applies, but they are not settled in the sense that a long-standing provision is settled. Anybody planning around them should know that.',
        ],
      },
      {
        heading: 'What the arithmetic is actually for',
        paragraphs: [
          'The disclosure line applies per donor, aggregated. The question is rarely whether one payment crossed R200,000; it is whether a donor has crossed it across several payments over a period, which is a running total somebody has to keep.',
          'That is the part worth automating, and it is what this product does: donor totals aggregated nightly, an alert at the disclosure line, warnings as a donor approaches the cap, and a quarterly export prepared for a person to check and sign.',
          'It prepares the export. It does not file with the Electoral Commission, and it does not ensure compliance — see the Capability and Limitations Statement for the full list of what this product does and does not claim.',
        ],
      },
    ],
    sources: [
      'Political Party Funding Act 6 of 2018',
      'Government Gazette 53182, 6 August 2025 — the proclaimed thresholds',
    ],
    updated: '29 October 2026',
  },

  {
    slug: 'how-a-council-is-made-up',
    path: '/explainers/how-a-council-is-made-up',
    title: 'How a municipal council is made up',
    question: 'How are seats allocated in a South African municipal council?',
    standfirst:
      'A local council is filled two ways at once: one councillor elected in each ward, and a second group allocated so the whole council reflects the proportional vote.',
    sections: [
      {
        heading: 'Two ballots, one council',
        paragraphs: [
          'In a local municipality a voter gets two ballots. One elects the councillor for their ward, first past the post. The other is for a party, and it decides the proportional half of the council.',
          'Seats are then allocated so that each party’s total share of the council — ward seats and proportional seats together — reflects its proportional vote. A party that wins many wards therefore receives fewer proportional seats, because its ward wins have already filled part of its entitlement.',
          'This is why reading ward results alone tells you very little about who will control a council.',
        ],
      },
      {
        heading: 'A worked example',
        paragraphs: [
          'JB Marks Local Municipality, the reference build for this software, has 34 wards and 67 council seats: 34 ward seats and 33 proportional seats, across 108 voting stations and 122,059 registered voters.',
          'The split is not always even. The number of seats a council has, and how they divide between ward and proportional, is set in the provincial gazette for that municipality.',
        ],
      },
      {
        heading: 'When a party wins more wards than it is entitled to',
        paragraphs: [
          'A party can win more wards than its proportional share would give it. The Municipal Structures Act deals with this: the ward councillors keep their seats, and the council is enlarged rather than anybody being removed.',
          'It is uncommon, it is provided for, and it is worth knowing before election night — because a council that ends up larger than the gazetted figure is not an error in the count.',
        ],
      },
    ],
    sources: [
      'Local Government: Municipal Structures Act 117 of 1998, Schedule 1',
      'North West Provincial Gazette, Extraordinary, Vol 268 No. 8929, 18 November 2025 (Provincial Notice 1300 of 2025) — the JB Marks determination',
    ],
    updated: '29 October 2026',
  },

  {
    slug: 'popia-and-voter-contact',
    path: '/explainers/popia-and-voter-contact',
    title: 'POPIA and voter contact',
    question: 'What does POPIA require when a campaign contacts voters?',
    standfirst:
      'Canvassing collects personal information, and some of what it collects is in the category the Act protects most strongly.',
    sections: [
      {
        heading: 'Political opinion is special personal information',
        paragraphs: [
          'Section 26 of the Protection of Personal Information Act treats a person’s political persuasion as special personal information, alongside health, religion and biometrics. Processing it is prohibited unless a specific ground applies.',
          'This matters more than it first appears. A canvassing record that notes how somebody intends to vote, or how sympathetic they seemed at the door, is a record of political opinion — whatever the field is called in the software.',
        ],
      },
      {
        heading: 'Consent, and the right to take it back',
        paragraphs: [
          'Where processing rests on consent, section 11(2)(b) gives the person the right to withdraw it at any time. A consent that is awkward to withdraw is weaker than it looks.',
          'That is why this product records consent before storing a contact record rather than after, keeps the version of the wording a person agreed to, and supports suppressing a person’s records from use on request.',
        ],
      },
      {
        heading: 'Direct marketing is its own rule',
        paragraphs: [
          'Section 69 governs electronic direct marketing and is an opt-in rule, not an opt-out one. Having somebody’s number because they raised a service complaint is not permission to send them campaign messages.',
          'The practical consequence for a campaign is that the purpose a person gave their details for is the purpose those details may be used for, and widening it needs a fresh basis.',
        ],
      },
      {
        heading: 'Suppression is not deletion',
        paragraphs: [
          'Removing somebody from use and erasing every trace of them are different operations, and conflating them is how a campaign ends up re-contacting a person who asked not to be. A suppression record has to persist in order to keep working.',
          'This product suppresses records from use on request. It does not claim to delete data, and that distinction is in its Capability and Limitations Statement rather than buried in a settings screen.',
        ],
      },
    ],
    sources: [
      'Protection of Personal Information Act 4 of 2013 — sections 11, 26 and 69',
    ],
    updated: '29 October 2026',
  },
];

export const EXPLAINERS_INTRO =
  'Plain explanations of the rules this software works within. Written from the ' +
  'statutes and gazettes themselves, with the sources listed on every page.';

/** Lookup used by the router. */
export function explainerBySlug(slug: string): Explainer | undefined {
  return EXPLAINERS.find((e) => e.slug === slug);
}
