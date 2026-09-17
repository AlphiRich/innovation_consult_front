/**
 * Election Campaign OS — field diary entry card
 * IC-ECOS-BUILD-2026-V2 §6.3.
 */
import type { DiaryEntry } from '@/dal/ports/diary';
import { TONE_PILL_CLASSES } from '@/design/toneClasses';
import { ACTIVITY_META } from './diaryMeta';

interface DiaryEntryCardProps {
  entry: DiaryEntry;
}

export function DiaryEntryCard({ entry }: DiaryEntryCardProps) {
  const meta = ACTIVITY_META[entry.activityType];
  const when = new Date(entry.occurredAt);

  return (
    <div className="bg-white border border-ink/10 rounded-lg p-4 space-y-2">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-data-mono font-mono text-slate">
            {when.toLocaleDateString('en-ZA')} {when.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })}
          </p>
          <p className="text-headline-md font-display text-ink mt-0.5">{entry.title || entry.streetName}</p>
          {entry.title && <p className="text-data-mono font-mono text-slate">{entry.streetName}</p>}
        </div>
        <span
          className={`px-2 py-1 rounded border text-label-caps font-display uppercase whitespace-nowrap ${TONE_PILL_CLASSES[meta.tone]}`}
        >
          {meta.label}
        </span>
      </div>

      {entry.activityType === 'CANVASS' && (
        <p className="text-body-md font-body text-ink">
          {entry.householdsVisited.toLocaleString('en-ZA')} household{entry.householdsVisited === 1 ? '' : 's'} visited
        </p>
      )}

      {entry.notes && <p className="text-body-md font-body text-slate">{entry.notes}</p>}
    </div>
  );
}
