/**
 * Election Campaign OS — reporting an incident, for people who cannot read them
 * IC-ECOS-BUILD-2026-V2 §6.4. Capability: `incidents.create`.
 *
 * A Canvasser holds `incidents.create` and does not hold `incidents.view`.
 * That is the capability model working as designed — a canvasser reports
 * what they see at a door and is not given a window onto every complaint
 * in the district — but it had a consequence nobody had followed through:
 * the Incidents nav item is gated on `incidents.view`, so the only route
 * to the incident form was one a canvasser could not reach. They held a
 * permission with nowhere to use it.
 *
 * This is that route. It is the form and nothing else: no list, no
 * triage, no status tabs, because the person opening it cannot read any
 * of those and showing them an empty list would be worse than not showing
 * one. It is linked from the round, which is where a canvasser is
 * standing when they see a burst pipe.
 *
 * The page says plainly what happens next, because a canvasser submitting
 * a report and then being unable to find it is otherwise indistinguishable
 * from a report that went nowhere.
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useSession } from '@/auth/useSession';
import { IncidentForm } from './IncidentForm';

export function ReportIncidentPage() {
  const session = useSession();
  const [submitted, setSubmitted] = useState(false);

  if (!session) {
    return (
      <div className="rounded-lg border border-slate/30 bg-white p-6 max-w-lg">
        <p className="text-label-caps font-display uppercase text-slate">/incidents/new</p>
        <h1 className="text-headline-md font-display text-ink mt-1">Report an incident</h1>
        <p className="mt-3 text-body-md font-body text-slate">
          No active session — see BUILD-STATUS.md (no live Firebase project provisioned yet).
        </p>
      </div>
    );
  }

  if (!session.caps.includes('incidents.create')) {
    return (
      <div className="rounded-lg border border-slate/30 bg-white p-6 max-w-lg">
        <p className="text-label-caps font-display uppercase text-slate">/incidents/new</p>
        <h1 className="text-headline-md font-display text-ink mt-1">Report an incident</h1>
        <p className="mt-3 text-body-md font-body text-slate">
          Your role does not include logging incidents.
        </p>
      </div>
    );
  }

  const canFollow = session.caps.includes('incidents.view');

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <p className="text-label-caps font-display uppercase text-slate">/incidents/new</p>
        <h1 className="text-headline-md font-display text-ink mt-1">Report an incident</h1>
        <p className="mt-2 text-body-md font-body text-slate">
          A service delivery problem you can see: water, electricity, roads, or something affecting public
          safety. Report the thing, not the household — an incident is about a street, not about the people on
          it.
        </p>
      </div>

      {submitted ? (
        <div className="bg-white border border-green/50 rounded-lg p-4 space-y-3">
          <p className="text-body-md font-body text-ink">Logged. Your VD captain or ward lead sees it next.</p>
          {!canFollow && (
            <p className="text-body-md font-body text-slate">
              You will not see it again from here — following an incident through triage and escalation is your
              supervisor&rsquo;s job, not yours. If it is urgent, tell them directly as well; logging it is not
              the same as raising the alarm.
            </p>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setSubmitted(false)}
              className="px-4 py-2 bg-ink text-paper rounded text-label-caps font-display uppercase"
            >
              Report another
            </button>
            <Link
              to="/round"
              className="px-4 py-2 border border-ink/20 rounded text-label-caps font-display uppercase text-ink"
            >
              Back to the round
            </Link>
          </div>
        </div>
      ) : (
        <IncidentForm ctx={session} onDone={() => setSubmitted(true)} onCancel={() => setSubmitted(false)} />
      )}
    </div>
  );
}
