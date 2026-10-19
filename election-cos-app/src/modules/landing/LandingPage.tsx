/**
 * Election Campaign OS — landing page
 * IC-ECOS-BUILD-2026-V2 §3.2-adjacent (shown before a session exists, so
 * none of nav.ts's capability gating applies here).
 *
 * `Shell.tsx` previously went straight to `SignInPage` for every
 * signed-out visitor — real sign-in, but no page explaining what they
 * were signing in to. This is that page; `SignInPage` is reached from it
 * via the "Sign in" button, not replaced by it.
 *
 * Reference: an uploaded `LandingPage.tsx` from outside this repo (not
 * part of this codebase's own history — wrong product name
 * "Election-COS1.0", superseded PPFA figures, a `signInWithDemoAccount`/
 * `DEMO_ACCOUNTS` persona-launcher that doesn't exist here, and several
 * invented "live" numbers presented as telemetry: 142,890 voters, 412
 * canvassers online, a token wallet balance). Used for layout shape only
 * — hero / role grid / platform tiers / compliance strip / footer — same
 * discipline `WarRoomPage.tsx` already applies to its own Stitch
 * reference: real facts from this codebase, or the section doesn't ship.
 * No demo-login bypass is built here; the only way into the app from this
 * page is the real `SignInPage` Google sign-in flow.
 */
import { useState } from 'react';
import { SignInPage } from '@/auth/SignInPage';
import { SEED_ROLES } from '@/auth/seedRoles';
import { TONE_PILL_CLASSES, type Tone } from '@/design/toneClasses';
import { COMPANY_REG_LINE, COMPANY_TAGLINE, PRODUCT_NAME, PRODUCT_NAME_SHORT } from '@/lib/legalText';
import { defaultPPFAConfig, PPFA_GAZETTE_CITATION } from '@/modules/finance/ppfaDefaults';
import { centsToRand } from '@/lib/money';
import type { GeoScope } from '@/dal/ports/session';

// Read from the real seed config rather than re-typed here, so this page
// can't quietly drift from ppfaDefaults.ts the way an earlier, unrelated
// draft of this product's marketing copy did (R100,000/R15,000,000 —
// superseded; see that file's own header).
const PPFA_SEED = defaultPPFAConfig('landing-page-reference', 'landing-page-reference');
const PPFA_DISCLOSURE_THRESHOLD_LABEL = `R${centsToRand(PPFA_SEED.disclosureThresholdZAR).toLocaleString('en-ZA')}`;

const SCOPE_TONE: Record<GeoScope, Tone> = {
  TENANT: 'slate',
  MUNICIPALITY: 'teal',
  WARD: 'gold',
  VD: 'maroon',
};

/**
 * One honest line per seed role, derived from `defaultCaps` — not a new
 * claim. Kept here rather than on `Role` itself because it's marketing
 * prose, not something `roleModel.test.ts` should have to hold constant.
 */
const ROLE_BLURB: Record<string, string> = {
  'party-hq-admin': 'Full tenant visibility: wards, incidents, logistics approval, PPFA thresholds, staff and permissions.',
  'municipal-team-lead': 'Coordinates one municipality — voters, field diary, incident escalation, logistics, analytics.',
  'ward-lead': 'Runs one ward — voter roll, field diary, incident triage, logistics requests.',
  'vd-captain': 'Runs one voting district — voter capture, field diary, incident logging, logistics requests.',
  canvasser: 'Doorstep capture in one VD — voter and household records, field diary, incident reports.',
  'compliance-officer': 'POPIA data-subject requests and PPFA donor-record corrections, tenant-wide. No disclosure thresholds, no exports.',
  'finance-officer': 'The full PPFA donation ledger and statutory thresholds, tenant-wide. No voter or household access.',
};

const PLATFORM_TIERS = [
  {
    scope: 'War Room',
    title: 'Pre-aggregated command dashboard',
    body: 'Voters captured, doors worked by contact state, incidents by status, and a five-tier sentiment breakdown — read from one counters document that Cloud Function triggers maintain, never a live scan across the voter roll.',
  },
  {
    scope: 'Field operations',
    title: 'Offline-first doorstep capture',
    body: 'Voters, households, incidents, and field diary entries queue in a Dexie IndexedDB outbox when a canvasser has no signal, with a POPIA consent gate enforced before any sentiment or phone number is captured, and sync back with conflicts kept visible, never silently dropped.',
  },
  {
    scope: 'Seat & quota calculator',
    title: 'IEC Schedule 1 MMP allocation',
    body: 'Droop quota, largest-remainder PR seat allocation, and overhang protection — a council expands rather than capping a party’s ward wins — verified with property-based tests, not just example cases.',
  },
  {
    scope: 'Funding & disclosure',
    title: 'PPFA compliance, correctly thresholded',
    body: `A ${PPFA_DISCLOSURE_THRESHOLD_LABEL} disclosure threshold and a four-level escalation ladder, tracked in integer cents against the current gazetted figures — not the figures an earlier draft of this product once shipped.`,
  },
] as const;

export function LandingPage() {
  const [showSignIn, setShowSignIn] = useState(false);

  if (showSignIn) {
    return (
      <div className="min-h-screen bg-paper">
        <div className="max-w-sm mx-auto pt-8 px-4">
          <button
            type="button"
            onClick={() => setShowSignIn(false)}
            className="mb-4 text-label-caps font-display uppercase text-slate hover:text-ink"
          >
            &larr; Back to overview
          </button>
        </div>
        <SignInPage />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-paper text-ink font-body">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white border-b border-ink/10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <div className="flex items-baseline gap-2">
            <span className="font-display text-headline-md text-ink">{PRODUCT_NAME_SHORT}</span>
            <span className="hidden sm:inline text-body-md font-body text-slate">{PRODUCT_NAME}</span>
          </div>
          <nav className="hidden md:flex items-center gap-5 text-label-caps font-display uppercase text-slate">
            <a href="#roles" className="hover:text-ink">
              Roles
            </a>
            <a href="#platform" className="hover:text-ink">
              Platform
            </a>
            <a href="#compliance" className="hover:text-ink">
              Compliance
            </a>
          </nav>
          <button
            type="button"
            onClick={() => setShowSignIn(true)}
            className="bg-ink text-paper px-4 py-2 rounded text-label-caps font-display uppercase"
          >
            Sign in
          </button>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-4 pt-14 pb-10 space-y-6">
        <p className="text-label-caps font-display uppercase text-gold">
          South African local government elections
        </p>
        <h1 className="font-display text-display-lg-mobile sm:text-display-lg text-ink leading-tight max-w-3xl">
          {COMPANY_TAGLINE[0].toUpperCase() + COMPANY_TAGLINE.slice(1)}.
        </h1>
        <p className="text-body-lg font-body text-slate max-w-2xl">
          {PRODUCT_NAME} is multi-tenant, offline-first campaign infrastructure for South African municipal
          elections — built for the people doing the work at a door, in a ward office, and in a war room, with
          the statutory rules that govern all three enforced in the code, not just the copy.
        </p>
        <div className="flex flex-wrap gap-3 pt-1">
          <button
            type="button"
            onClick={() => setShowSignIn(true)}
            className="bg-ink text-paper px-6 py-3 rounded text-label-caps font-display uppercase"
          >
            Sign in
          </button>
          <a
            href="#platform"
            className="border border-ink/20 text-ink px-6 py-3 rounded text-label-caps font-display uppercase"
          >
            See what&rsquo;s built
          </a>
        </div>

        {/* Architecture facts — static, not telemetry. Nothing below this
            line is a live number; a dashboard with real live counters is
            WarRoomPage.tsx, behind sign-in. */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4">
          <div className="bg-white border border-ink/10 rounded p-3">
            <p className="text-label-caps font-display uppercase text-slate">Data residency</p>
            <p className="font-display text-headline-md text-ink mt-0.5">africa-south1</p>
            <p className="text-data-mono font-mono text-slate mt-1">Johannesburg region, by rule</p>
          </div>
          <div className="bg-white border border-ink/10 rounded p-3">
            <p className="text-label-caps font-display uppercase text-slate">PPFA disclosure</p>
            <p className="font-display text-headline-md text-ink mt-0.5">{PPFA_DISCLOSURE_THRESHOLD_LABEL}</p>
            <p className="text-data-mono font-mono text-slate mt-1">{PPFA_GAZETTE_CITATION}</p>
          </div>
          <div className="bg-white border border-ink/10 rounded p-3">
            <p className="text-label-caps font-display uppercase text-slate">Offline engine</p>
            <p className="font-display text-headline-md text-ink mt-0.5">Dexie outbox</p>
            <p className="text-data-mono font-mono text-slate mt-1">IndexedDB, conflict-visible sync</p>
          </div>
          <div className="bg-white border border-ink/10 rounded p-3">
            <p className="text-label-caps font-display uppercase text-slate">Roles</p>
            <p className="font-display text-headline-md text-ink mt-0.5">{SEED_ROLES.length} scoped roles</p>
            <p className="text-data-mono font-mono text-slate mt-1">Tenant down to voting district</p>
          </div>
        </div>
      </section>

      {/* Roles */}
      <section id="roles" className="max-w-5xl mx-auto px-4 py-14 border-t border-ink/10 space-y-6">
        <div>
          <p className="text-label-caps font-display uppercase text-gold">Capability grants</p>
          <h2 className="font-display text-headline-md text-ink mt-1">
            {SEED_ROLES.length} roles, each scoped to what they need to see
          </h2>
          <p className="text-body-md font-body text-slate mt-1 max-w-2xl">
            Every role is geographically scoped — tenant, municipality, ward, or voting district — and granted
            only the capabilities its job needs. An administrator assigns this after sign-in; nothing here is
            self-service.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {SEED_ROLES.map((role) => (
            <div key={role.id} className="bg-white border border-ink/10 rounded-lg p-4 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-display text-headline-md text-ink">{role.label}</h3>
                <span
                  className={`px-2.5 py-1 rounded border text-label-caps font-display uppercase whitespace-nowrap ${TONE_PILL_CLASSES[SCOPE_TONE[role.geoScope]]}`}
                >
                  {role.geoScope}
                </span>
              </div>
              <p className="text-body-md font-body text-slate">{ROLE_BLURB[role.id]}</p>
              <p className="text-data-mono font-mono text-slate/70">{role.defaultCaps.length} capability grants</p>
            </div>
          ))}
        </div>
      </section>

      {/* Platform */}
      <section id="platform" className="max-w-5xl mx-auto px-4 py-14 border-t border-ink/10 space-y-6">
        <div>
          <p className="text-label-caps font-display uppercase text-gold">What&rsquo;s built</p>
          <h2 className="font-display text-headline-md text-ink mt-1">From the doorstep to the seat count</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {PLATFORM_TIERS.map((tier) => (
            <div key={tier.scope} className="bg-white border border-ink/10 rounded-lg p-5 space-y-2">
              <p className="text-label-caps font-display uppercase text-teal">{tier.scope}</p>
              <h3 className="font-display text-headline-md text-ink">{tier.title}</h3>
              <p className="text-body-md font-body text-slate">{tier.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Compliance */}
      <section id="compliance" className="max-w-5xl mx-auto px-4 py-14 border-t border-ink/10 space-y-4">
        <p className="text-label-caps font-display uppercase text-gold">Statutory &amp; POPIA</p>
        <h2 className="font-display text-headline-md text-ink">
          Built against the statute, with the gaps named rather than papered over
        </h2>
        <div className="bg-ink text-paper rounded-lg p-5 space-y-3">
          <p className="text-body-md font-body text-paper/90">
            Firebase Authentication records hold a user ID and email only (§4.3) — every voter and staff detail
            lives in Firestore in africa-south1, behind custom-claim capability checks, security rules, and the
            data layer, three separate gates on the same decision.
          </p>
          <p className="text-body-md font-body text-paper/90">
            A data-subject request under POPIA can be actioned by a Compliance Officer, but an erasure request
            cannot currently be fulfilled in the POPIA sense for any subject type — donor records are retained
            under the PPFA, and everything else is suppressed, not destroyed. The product says so on the request
            itself rather than claiming a deletion that didn&rsquo;t happen.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="max-w-5xl mx-auto px-4 py-10 border-t border-ink/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <p className="text-data-mono font-mono text-slate">{COMPANY_REG_LINE}</p>
        <button
          type="button"
          onClick={() => setShowSignIn(true)}
          className="text-label-caps font-display uppercase text-ink underline"
        >
          Sign in to {PRODUCT_NAME_SHORT}
        </button>
      </footer>
    </div>
  );
}
