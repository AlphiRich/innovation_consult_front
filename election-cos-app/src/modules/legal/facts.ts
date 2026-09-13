/**
 * Election Campaign OS — the factual schedule the instruments are drafted against
 *
 * This is `docs/manual-and-legal-instruments.md` made machine-readable, so
 * that the schedule an attorney receives is generated from the same list
 * the repository maintains rather than retyped into a document that then
 * drifts from it.
 *
 * Three lists, and the distinction between them is the whole point:
 *
 *  - `PRODUCT_FACTS` — claims this build has established *and guarded*.
 *    Each names the file that establishes it and the test that fails if it
 *    stops being true. These are safe to draft against.
 *  - `MUST_NOT_CLAIM` — overclaims already found and corrected, in this
 *    build's own material or in material handed to it. Each would be false
 *    if written into a contract.
 *  - `OPEN_QUESTIONS` — matters this build could not settle and did not
 *    guess at. They go to the attorney as questions, not as positions.
 *
 * Nothing here is a legal opinion and nothing here is an operative clause.
 */

export interface ProductFact {
  /** The claim, phrased as it could appear in a schedule. */
  claim: string;
  /** Where in this repository it is true. */
  establishedIn: string;
  /** The test that fails if it stops being true. */
  guardedBy: string;
}

/**
 * Ordered roughly as an attorney would read them: isolation and
 * permissions first, then personal information, then the statutory
 * modules, then commercial shape.
 */
export const PRODUCT_FACTS: ProductFact[] = [
  {
    claim:
      'Tenant isolation is enforced in three independent places: the signed-in user’s custom claims, the ' +
      'database security rules, and the data access layer. A request that clears one still has to clear the other two.',
    establishedIn: 'firestore.rules, src/dal/adapters/firestore/base.ts',
    guardedBy: 'geoScope.test.ts, roleModel.test.ts',
  },
  {
    claim:
      'Permissions are capability-based. No security rule anywhere tests a role name, so a role can be ' +
      'redefined without rewriting the rules that protect the data.',
    establishedIn: 'firestore.rules, src/auth/types.ts',
    guardedBy: 'roleModel.test.ts',
  },
  {
    claim:
      'A ward-scoped user sees their ward. A voting-district-scoped user sees their voting district and no ' +
      'other, including where a voting district falls across two wards.',
    establishedIn: 'firestore.rules inScope(), src/dal/adapters/firestore/base.ts geoScopeConstraints()',
    guardedBy: 'geoScope.test.ts',
  },
  {
    claim: 'A voter record cannot be created without a recorded consent method, consent date and consent reference.',
    establishedIn: 'firestore.rules (voters), src/modules/voters/bulkImport.ts',
    guardedBy: 'bulkImport.test.ts',
  },
  {
    claim:
      'Bulk import of an existing register requires the importer to declare a demonstrable consent basis before ' +
      'a single row is written, and the planning step writes nothing.',
    establishedIn: 'src/modules/voters/bulkImport.ts',
    guardedBy: 'bulkImport.test.ts',
  },
  {
    claim: 'Contact numbers are masked for display and are never written to an export in the clear by the client.',
    establishedIn: 'src/lib/phone.ts, src/modules/voters/bulkImport.ts',
    guardedBy: 'phone.test.ts, bulkImport.test.ts',
  },
  {
    claim:
      'Nothing in the product hard-deletes. Voter and household records are suppressed and stop appearing in ' +
      'the application; the underlying record remains.',
    establishedIn: 'firestore.rules — delete: if false on all fourteen tenant collections',
    guardedBy: 'dataSubjectErasure.test.ts',
  },
  {
    claim:
      'Donation and donor-ledger records cannot be deleted at all, on the working position that they are ' +
      'statutory records under the Political Party Funding Act.',
    establishedIn: 'firestore.rules (donations, donorLedger)',
    guardedBy: 'dataSubjectErasure.test.ts',
  },
  {
    claim:
      'The funding module aggregates donations against disclosure thresholds and raises alerts. It never blocks ' +
      'a donation and it never files anything with the Electoral Commission.',
    establishedIn: 'src/modules/finance/ppfaDefaults.ts, src/auth/modules.ts',
    guardedBy: 'ppfaDefaults.test.ts, entitlements.test.ts',
  },
  {
    claim:
      'The candidate list export is a compliance aid prepared for a human to check and submit. It is not an ' +
      'automated lodgement and the product does not submit it.',
    establishedIn: 'src/modules/candidates/prList.ts',
    guardedBy: 'prList.test.ts',
  },
  {
    claim: 'The gatherings module is a static advisory page. It tracks no permit and no permit deadline.',
    establishedIn: 'src/modules/knowledge/GatheringsAdvisoryPage.tsx',
    guardedBy: 'entitlements.test.ts',
  },
  {
    claim:
      'A service delivery referral is a party document addressed to a municipality. It carries no municipal or ' +
      'state authority, and the document says so on its own face.',
    establishedIn: 'src/modules/incidents/referral/referralDocument.ts',
    guardedBy: 'referralDocument.test.ts',
  },
  {
    claim:
      'A household that asks not to be contacted again is never returned to a canvassing queue, and is excluded ' +
      'from the coverage denominator rather than counted as an outstanding door.',
    establishedIn: 'src/modules/voters/canvassQueue.ts',
    guardedBy: 'canvassQueue.test.ts',
  },
  {
    claim:
      'Household access codes are stripped from every export, referral and printed page, and appear only on a ' +
      'device screen to a user whose role includes them.',
    establishedIn: 'src/modules/voters/householdSafety.ts',
    guardedBy: 'householdSafety.test.ts',
  },
  {
    claim:
      'A candidate identity number is checked only for structure — length, date, citizenship digit and check ' +
      'digit. The product performs no identity verification against Home Affairs and presents no structural ' +
      'check as one, and identity numbers are masked to their last four digits for display.',
    establishedIn: 'src/lib/saIdNumber.ts',
    guardedBy: 'saIdNumber.test.ts',
  },
  {
    claim: 'Entitlement records state what a tenant subscribed to and until when. They never carry a price.',
    establishedIn: 'src/dal/ports/entitlements.ts',
    guardedBy: 'entitlements.test.ts',
  },
  {
    claim:
      'Every tenant is offered the same published modules on the same terms. There is no per-tenant feature ' +
      'flag and no hidden module.',
    establishedIn: 'src/auth/modules.ts',
    guardedBy: 'entitlements.test.ts',
  },
  {
    claim:
      'Cloud Functions and the primary datastore are pinned to the africa-south1 (Johannesburg) region. ' +
      'Firebase Authentication is not, and processes an account identifier and email address outside the Republic.',
    establishedIn: 'functions/src/region.ts, src/dal/adapters/firestore/client.ts',
    guardedBy: 'legal.test.ts — region pin scan over functions/src',
  },
  {
    claim:
      'The application holds working data on the field device so it can operate without a network, and that ' +
      'device copy is personal information in the subscriber’s hands.',
    establishedIn: 'src/offline/db.ts, src/offline/outbox.ts',
    guardedBy: 'db.test.ts, outbox.test.ts',
  },
];

export interface Prohibition {
  /** The claim that must never be made. */
  claim: string;
  /** Why it would be false. */
  because: string;
}

/**
 * Each of these has already been found in real material — some of it this
 * project's own. They are listed as prohibitions rather than corrections
 * because the failure mode is a draftsperson reaching for a familiar
 * phrase, not anyone deciding to mislead.
 */
export const MUST_NOT_CLAIM: Prohibition[] = [
  {
    claim: 'That personal information is deleted, erased, purged or destroyed on request, or after the election.',
    because:
      'It is suppressed. There is no de-identification routine anywhere in the product and nothing hard-deletes. ' +
      'This is the single most likely sentence to appear in a draft privacy policy and the single most likely to be wrong.',
  },
  {
    claim:
      'That the platform files, submits, lodges or certifies anything with the Electoral Commission, or that ' +
      'any export constitutes a submission.',
    because: 'Every export is a document a human checks and submits. The product transmits nothing to the Commission.',
  },
  {
    claim: 'That the platform ensures, guarantees or certifies compliance with the Political Party Funding Act.',
    because: 'It aggregates, tracks thresholds and alerts. A donation is never blocked and no filing is made.',
  },
  {
    claim: 'That the platform tracks, manages or ensures compliance with gatherings permits.',
    because: 'The module is a static advisory page holding no permit record and no deadline.',
  },
  {
    claim: 'That a response deadline for a data subject request is statutory.',
    because:
      'POPIA prescribes no fixed window for these. The 30-day figure in the product is an internal working ' +
      'target and is labelled as one.',
  },
  {
    claim: 'That data never leaves South Africa.',
    because:
      'Firebase Authentication processes an email address and an opaque account identifier outside the Republic. ' +
      'That is a POPIA §72 matter and must be disclosed as one rather than covered by a broader claim.',
  },
  {
    claim: 'That the candidate list gender requirement is a hard statutory threshold the product enforces.',
    because:
      'Schedule 1 of the Municipal Structures Act asks a party to seek to ensure. A shortfall is lawful, and the ' +
      'product raises it as a warning rather than an error.',
  },
];

export interface OpenQuestion {
  question: string;
  /** What this build did in the absence of an answer. */
  interimPosition: string;
}

export const OPEN_QUESTIONS: OpenQuestion[] = [
  {
    question:
      'The maximum length of a proportional-representation candidate list. Reported as twice the number of PR ' +
      'seats; the primary source could not be read in the build environment.',
    interimPosition:
      'Configured as a multiplier with a default of two, hedged in the user interface, and never enforced as a hard limit.',
  },
  {
    question:
      'The retention period for donation records under the Political Party Funding Act, which determines how a ' +
      'donor erasure request is refused and for how long.',
    interimPosition:
      'Donation records are treated as undeletable and the refusal cites PPFA record-keeping as the basis, marked ' +
      'as a working position pending review.',
  },
  {
    question: 'Whether thirty days is defensible as a published response commitment for a data subject request.',
    interimPosition: 'Used as an internal target, described as internal, and never described as statutory.',
  },
  {
    question:
      'Whether a recorded hostile-reception flag on a household, and the free-text safety note beside it, need ' +
      'specific treatment in the privacy notice. It is personal information about an identifiable household, ' +
      'retained for canvasser safety, and reachable by a data subject request.',
    interimPosition: 'Treated as ordinary personal information under the same conditions as the rest.',
  },
  {
    question:
      'Whether the operations manual should be issued as a contractual schedule to the subscriber agreement, or ' +
      'remain expressly non-contractual.',
    interimPosition: 'Expressly non-contractual — the manual’s own cover says the agreement governs where they differ.',
  },
  {
    question:
      'Which party is the responsible party and which the operator under POPIA, as between the subscribing ' +
      'political party and Innovation Consult, and what the operator agreement under §20–21 must contain.',
    interimPosition:
      'The subscriber is described as determining the purpose and means, and Innovation Consult as processing on ' +
      'its behalf. Stated as the working position and flagged here.',
  },
];
