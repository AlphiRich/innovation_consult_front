/**
 * Election Campaign OS — Analytics index
 * IC-ECOS-BUILD-2026-V2 §8. Landing page for the three sub-views, all
 * real as of session 9: Vote Calculator, Threshold Analyzer, Sentiment
 * Summary Report.
 */
import { Link } from 'react-router-dom';

const SUB_VIEWS = [
  { to: '/analytics/seat-calculator', label: 'Vote Calculator', description: 'MMP seat allocation (Schedule 1).' },
  {
    to: '/analytics/thresholds',
    label: 'Threshold Analyzer',
    description: 'Electoral 1% qualification threshold — not PPFA funding thresholds.',
  },
  {
    to: '/analytics/scheduled-reports',
    label: 'Sentiment Summary Report',
    description: 'Tenant-wide sentiment breakdown, on demand, CSV export.',
  },
] as const;

export function AnalyticsPage() {
  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <p className="text-label-caps font-display uppercase text-slate">/analytics</p>
        <h1 className="text-headline-md font-display text-ink mt-1">Analytics</h1>
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
