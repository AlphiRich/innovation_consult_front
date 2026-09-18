/**
 * Election Campaign OS — Settings index
 * IC-ECOS-BUILD-2026-V2 §3.2. Landing page for the sub-views, all real.
 * Candidates joined them in session 29 — see CandidatesPage.tsx for why a
 * party-list screen lives here rather than in the nine-item primary nav.
 */
import { Link } from 'react-router-dom';

const SUB_VIEWS = [
  { to: '/settings/municipality', label: 'Municipality Config', description: 'Seat totals and election parameters.' },
  { to: '/settings/permissions', label: 'Permissions', description: 'Roles, staff, and per-user capability overrides.' },
  {
    to: '/settings/ppfa-thresholds',
    label: 'PPFA Threshold Config',
    description: 'Statutory funding thresholds — not electoral vote thresholds.',
  },
  {
    to: '/settings/data-requests',
    label: 'Data Subject Requests',
    description: 'POPIA Condition 8 — access, correction, and deletion requests.',
  },
  {
    to: '/settings/candidates',
    label: 'Candidates & party list',
    description: 'Capture candidates and check a PR list before it is submitted. Files nothing.',
  },
  {
    to: '/settings/subscription',
    label: 'Subscription',
    description: 'Which modules this campaign has bought, and until when. No prices — see the header there.',
  },
  {
    to: '/settings/audit',
    label: 'Audit log',
    description: 'Acts the platform recorded — unmasking, exports, threshold changes. Read-only, and says what it is not.',
  },
] as const;

export function SettingsPage() {
  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <p className="text-label-caps font-display uppercase text-slate">/settings</p>
        <h1 className="text-headline-md font-display text-ink mt-1">Settings</h1>
      </div>

      <div className="grid gap-3">
        {SUB_VIEWS.map((view) => (
          <Link
            key={view.to}
            to={view.to}
            className="bg-white border border-ink/10 rounded-lg p-4 hover:border-gold transition-colors"
          >
            <p className="text-headline-md font-display text-ink">{view.label}</p>
            <p className="text-body-md font-body text-slate mt-1">{view.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
