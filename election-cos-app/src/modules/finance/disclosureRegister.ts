/**
 * Election Campaign OS — the disclosure register for a financial year
 * IC-ECOS-BUILD-2026-V2 §6.8.2, §6.8.3.
 *
 * WHY THIS EXISTS
 *
 * The funding module could record a donor, record a donation against that
 * donor, and show that donor's history. It could not answer the question
 * the module exists for: *which donations must be disclosed, and which of
 * those have not been?*
 *
 * `DonationRepository` had `listByDonor` and nothing else. The only path
 * to a tenant-wide picture was the alert list — and the function that
 * raises alerts is deliberately held pending §6.8.1, so that list is
 * empty and will stay empty. A finance officer with forty donors had to
 * open each one, read a client-side banner, and keep the running picture
 * in their head or in a spreadsheet. At the point where that spreadsheet
 * exists, the compliance value of the product is in the spreadsheet.
 *
 * `listByFinancialYear` is one read; this assembles it.
 *
 * NOTHING HERE FILES ANYTHING
 *
 * This is a working view, not a return. It does not generate an IEC
 * submission, it does not know the filing deadline, and it does not
 * decide which donations a return must carry once a donor has crossed the
 * threshold — that is part of §6.8.1 Q1 and is unanswered. See
 * `Q1_UNRESOLVED`.
 *
 * ORPHANED MONEY IS SHOWN, NOT DROPPED
 *
 * A donation whose donor record cannot be read is the one thing a
 * register must never quietly omit: it is money in the year that would
 * disappear from the total while the total still looked like a total.
 * Those are listed separately and counted in the year's sum, and
 * `disclosureRegister.test.ts` fails if they stop being.
 */
import type { Donation } from '@/dal/ports/donations';
import type { Donor } from '@/dal/ports/donors';
import type { PPFAConfig } from '@/dal/ports/ppfaConfig';
import { exposureForDonor, type DonorExposure } from './donorExposure';

export interface RegisterRow {
  donor: Donor;
  exposure: DonorExposure;
  /** Foreign or anonymous — see RESTRICTED_DONOR_BASIS. */
  restricted: boolean;
}

export interface DisclosureRegister {
  financialYear: string;
  /** Every donor with at least one donation in the year, largest first. */
  rows: RegisterRow[];
  /** Donors the configured rule puts at or above the disclosure threshold. */
  needingDisclosure: RegisterRow[];
  /** Donors where answering Q1 the other way would change the answer. */
  ruleSensitive: RegisterRow[];
  /** Foreign or anonymous donors with money in the year. */
  restricted: RegisterRow[];
  /** Donations in the year whose donor record could not be read. */
  orphaned: Donation[];
  /** Every cent recorded in the year, orphans included. */
  totalZAR: number;
  undisclosedCount: number;
}

function isRestricted(donor: Donor): boolean {
  return donor.donorType === 'FOREIGN' || donor.donorType === 'ANONYMOUS' || donor.isForeign;
}

/** At or past the point where the threshold has been reached. */
function atOrAboveThreshold(exposure: DonorExposure): boolean {
  return (
    exposure.level === 'DISCLOSURE_REQUIRED' ||
    exposure.level === 'CAP_APPROACHING' ||
    exposure.level === 'CAP_EXCEEDED'
  );
}

export function buildDisclosureRegister(
  donors: Donor[],
  donations: Donation[],
  config: PPFAConfig,
  now: Date = new Date(),
): DisclosureRegister {
  // The year is derived here and the input is narrowed to it, so the
  // total at the top of the register is the sum of exactly what the
  // register shows. A caller that reads the wrong year cannot inflate a
  // figure the rows below do not account for.
  const financialYear = exposureForDonor([], config, now).financialYear;
  const donationsInYear = donations.filter((d) => d.financialYear === financialYear);

  const byDonor = new Map<string, Donation[]>();
  for (const donation of donationsInYear) {
    const existing = byDonor.get(donation.donorId);
    if (existing) existing.push(donation);
    else byDonor.set(donation.donorId, [donation]);
  }

  const known = new Map(donors.map((d) => [d.id, d]));
  const rows: RegisterRow[] = [];
  const orphaned: Donation[] = [];

  for (const [donorId, donations] of byDonor) {
    const donor = known.get(donorId);
    if (!donor) {
      orphaned.push(...donations);
      continue;
    }
    rows.push({
      donor,
      exposure: exposureForDonor(donations, config, now),
      restricted: isRestricted(donor),
    });
  }

  rows.sort((a, b) => b.exposure.cumulativeZAR - a.exposure.cumulativeZAR);

  return {
    financialYear,
    rows,
    needingDisclosure: rows.filter((r) => atOrAboveThreshold(r.exposure)),
    ruleSensitive: rows.filter((r) => r.exposure.rulesDisagree),
    restricted: rows.filter((r) => r.restricted),
    orphaned,
    totalZAR: donationsInYear.reduce((sum, d) => sum + d.amountZAR, 0),
    undisclosedCount: donationsInYear.filter((d) => !d.disclosedAt).length,
  };
}
