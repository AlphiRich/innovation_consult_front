/**
 * Election Campaign OS — SOP-10, Recording donations and disclosure thresholds
 *
 * The only procedure in the manual where getting it wrong is a criminal
 * exposure for the party rather than an operational one, and the only one
 * written against a statute whose application to this product has three
 * open questions nobody here can answer.
 *
 * So this SOP is written the way the module is built: it says exactly what
 * the platform records, exactly what it computes, and — at more length
 * than any other SOP — what it does not decide. A finance officer who
 * finishes it should know that the register on their screen is a working
 * view and not a return, and why.
 *
 * Writing it found two things.
 *
 * **The strategy interface did not exist.** `ppfaAggregation.ts` states
 * that the classification logic sits behind `PPFAConfig.aggregationRule`
 * "so answering Q1 is a configuration choice, not a rewrite". The rule was
 * settable, stored as evidential configuration, printed back on two
 * screens — and read by nothing. The one place that computed a level
 * summed the year unconditionally. A tenant configured PER_DONATION saw a
 * cumulative answer with its own configuration printed above it saying
 * otherwise. `donorExposure.ts` is the interface that was promised.
 *
 * **There was no register.** `DonationRepository` could list by donor and
 * nothing else, and the alert list that would have given a tenant-wide
 * picture is fed by the aggregation function that is deliberately held.
 * So the question this module exists to answer — which donations must be
 * disclosed, and which have not been — could only be assembled by opening
 * every donor in turn and keeping the total somewhere outside the product.
 * `listByFinancialYear` plus `disclosureRegister.ts` is that answer.
 */
import {
  Q1_UNRESOLVED,
  RESTRICTED_DONOR_BASIS,
  RULE_BASIS,
} from '@/modules/finance/donorExposure';
import { PPFA_GAZETTE_CITATION } from '@/modules/finance/ppfaDefaults';
import type { Sop } from '../manualModel';

export const DONATIONS_SOP: Sop = {
  number: 'SOP-10',
  title: 'Recording donations and disclosure thresholds',
  area: 'FUNDING',
  roles: ['finance-officer'],
  requiresModule: 'ppfa-disclosure',
  requiresAnyCapability: ['ppfa.view'],
  purpose:
    'How to capture a donor, record a donation, and read the disclosure register: which figures the platform ' +
    'computes and which it refuses to, why a donation is never blocked, what the thresholds on your screen ' +
    'are and are not, and which questions about the Political Party Funding Act this product does not answer.',
  sections: [
    {
      heading: 'What this module is for, and what it is not',
      body: [
        'It is a record of money received: who gave, how much, when, whether it was cash or in kind, and whether your campaign has disclosed it. That record is the thing an auditor, the Electoral Commission or a court would ask to see, and it is the reason every figure in it is held as whole cents and nothing is ever deleted.',
        'It is not a filing system. Nothing here submits anything to anybody. It does not know your filing deadline, it does not produce a return, and marking a donation disclosed records what your campaign did — it does not do it.',
      ],
      warnings: [
        'Donations cannot be deleted from this platform, only corrected. That is deliberate: a statutory record that can be made to disappear is not a record. If something was captured wrongly, correct it and make sure the correction is explicable.',
      ],
    },
    {
      heading: 'The governing figures come from your configuration, not from this manual',
      body: [
        'Every threshold on your screens is read from your tenant\'s PPFA configuration, which carries an effective date and a source citation and is never edited in place — a new figure is a new entry, so the old one stays as evidence of what governed at the time.',
        `The defaults this build seeds are taken from ${PPFA_GAZETTE_CITATION}. If the figures on your screen differ, your campaign changed them, and the citation beside them says on what basis.`,
        'This is why no number is quoted in this procedure. A manual that repeated a threshold would be a second copy of it, and the two would disagree the moment the gazette moved.',
      ],
      warnings: [
        'If your funding page says no configuration exists, stop. Donations recorded before a configuration exists are still recorded and still valid — but nothing can be evaluated against a threshold, and the register cannot tell you anything.',
      ],
    },
    {
      heading: 'Capturing a donor',
      body: [
        'A donation is always attached to a donor record, even an anonymous one — an anonymous collection at a rally is captured as an anonymous donor with a reference label, so the money has somewhere to sit rather than being left out of the register.',
      ],
      steps: [
        'Record the donor type honestly: natural person, juristic person, foreign, or anonymous.',
        'Give a name, or for an anonymous donor a label that identifies the occasion — "collection box, Ward 4 rally", not "anonymous".',
        'Tick the foreign flag if it applies and the type does not already say so.',
      ],
      warnings: [
        'Identity and registration numbers are not captured by this build. The encryption they require is not provisioned, and a field labelled encrypted that is not encrypted would be worse than no field. Hold those particulars wherever your campaign holds its other originals.',
        RESTRICTED_DONOR_BASIS,
      ],
    },
    {
      heading: 'Recording a donation',
      body: [
        'Amounts are typed in Rand and stored as whole cents. That is not a detail: a rounding error on a statutory threshold is a compliance failure, and floating-point money is how one happens.',
        'The financial year and quarter are worked out from the date received and your configured financial-year start month, and stored on the record. They are what the register groups by.',
      ],
      steps: [
        'Open the donor and choose Record donation.',
        'Enter the amount and the date it was received — the date received, not the date you are capturing it.',
        'Tick in-kind if it was goods or services rather than cash.',
        'Describe it if the description tells a reader something the amount does not.',
      ],
      warnings: [
        'The platform will never refuse a donation for being too large, for breaching the cap, or for coming from a flagged donor. That is deliberate and it is the correct behaviour: refusing the write would mean the money was received and not recorded. It flags; it does not block. The judgement is yours.',
        'Recording a donation is not accepting it. What your campaign does about money it should not have taken is a decision for your officers and your attorney, and this platform has no view on it.',
      ],
    },
    {
      heading: 'Reading the disclosure register',
      body: [
        'The register is one view of one financial year, across every donor: what came in, who from, what has reached the threshold, and what has not been marked disclosed.',
        'Donors are listed largest first, with their cumulative total and their largest single donation side by side. Both are shown on purpose — see the next section.',
      ],
      steps: [
        'Read the total at the top. It is every cent recorded in the year, including money whose donor record you cannot read.',
        'Read the donors at or above the disclosure threshold. Reaching it is not the same as having filed.',
        'Read the count of donations not marked disclosed, and work down it.',
        'Open a donor from the register to see their history and to mark a donation disclosed against your IEC reference.',
      ],
      warnings: [
        'If the register shows donations with no donor record, find out whose they are before you file anything. That money is in the year\'s total and belongs to nobody in the table, and a return built off the table alone would be short by exactly that amount.',
        'An empty register is an empty register. It is not a nil return, and nothing on this screen files one.',
      ],
    },
    {
      heading: 'The question this product does not answer',
      body: [
        'Whether the disclosure threshold applies to each donation on its own or to everything a donor gave in the year is not settled here, and it changes who appears on the register.',
        RULE_BASIS.CUMULATIVE_PER_DONOR_PER_YEAR,
        RULE_BASIS.PER_DONATION,
        'Your configuration picks one so the screen computes something definite. Where the two readings would give different answers for a donor, the register says so and shows what the other reading gives.',
      ],
      warnings: [
        Q1_UNRESOLVED,
        'Two further questions are open on the same footing: what the financial year actually is, and whether the annual cap applies per party or across all parties a donor gives to. Your configuration assumes an answer to the first. Nothing in this product assumes one to the second.',
        'Because those questions are open, the automatic aggregation that would raise a formal alert is deliberately not built. Every threshold state you see is computed on your own screen for visibility, is labelled provisional, and writes nothing. Do not treat it as a system that will warn you — treat it as a calculator you must keep looking at.',
      ],
    },
    {
      heading: 'Marking a donation disclosed',
      body: [
        'Marking disclosed records that your campaign disclosed this donation, and stores the reference the Electoral Commission gave you. It is a record of an act performed elsewhere.',
      ],
      steps: [
        'Disclose the donation through whatever channel the Electoral Commission requires.',
        'Come back and mark it disclosed against the reference you were given.',
        'Keep your own copy of what you filed. This platform stores the reference, not the return.',
      ],
      warnings: [
        'Never mark a donation disclosed in advance of disclosing it. The register is read as a record of what has been filed, and a tick placed early is indistinguishable from a filing that happened.',
        'Which donations a return must carry, once a donor has crossed the threshold cumulatively, is part of the same unresolved question. Do not infer it from what this screen highlights.',
      ],
    },
    {
      heading: 'Who else can see this',
      body: [
        'Funding is gated on its own permissions and on your subscription carrying the disclosure module. A ward lead, a canvasser and a VD captain hold none of them and see none of this.',
        'Two other roles reach part of it, and the split is deliberate. The Compliance Officer can edit the donor ledger, because a POPIA correction over a donor record cannot be actioned otherwise — but cannot set thresholds and cannot export. The Party HQ Administrator can set thresholds but cannot edit the ledger. You are the only role that does both.',
        'The mirror holds too: your role cannot see or action data subject requests. Funding compliance and data compliance are separate jobs here, and the platform is built so they stay separate people.',
      ],
      warnings: [
        'You can both record donations and set the governing thresholds. That is a real concentration and your campaign should know it: the same person can move a line and record figures against it. The configuration history is append-only precisely so that anybody who looks can see when a line moved and who moved it — that history is the control, not the permission.',
      ],
    },
  ],
};
