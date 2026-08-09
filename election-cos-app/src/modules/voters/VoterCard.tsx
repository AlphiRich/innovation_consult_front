/**
 * Election-COS1.0 — voter list card
 * Structure informed by the Stitch suite's household_voter_logging screen
 * (name + sentiment pill + Log Response action), reskinned to our tokens.
 */
import type { Voter } from '@/dal/ports/voters';
import { SENTIMENT_META } from './sentiment';
import { TONE_PILL_CLASSES } from '@/design/toneClasses';

interface VoterCardProps {
  voter: Voter;
  onLogResponse: (voter: Voter) => void;
}

export function VoterCard({ voter, onLogResponse }: VoterCardProps) {
  const sentimentMeta = SENTIMENT_META[voter.sentiment];

  return (
    <div className="bg-white border border-ink/10 rounded-lg p-4 space-y-3">
      <div className="flex justify-between items-start gap-3">
        <div>
          <h4 className="text-headline-md font-display text-ink">
            {voter.firstName} {voter.lastName}
          </h4>
          <p className="text-data-mono font-mono text-slate mt-0.5">
            {voter.phoneMasked || 'No phone on file'}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          {!voter.popiaConsentGiven && (
            <span className="text-label-caps font-display uppercase px-2 py-0.5 rounded-full border border-maroon/30 bg-maroon/10 text-maroon">
              No consent
            </span>
          )}
          <span
            className={`text-label-caps font-display uppercase px-2 py-0.5 rounded-full border ${TONE_PILL_CLASSES[sentimentMeta.tone]}`}
          >
            {sentimentMeta.label}
          </span>
        </div>
      </div>
      <button
        type="button"
        onClick={() => onLogResponse(voter)}
        className="w-full bg-ink text-paper rounded py-2.5 text-label-caps font-display uppercase"
      >
        Log response
      </button>
    </div>
  );
}
