/**
 * Election Campaign OS — the access note on a household card
 * IC-ECOS-BUILD-2026-V2 §6.2, §7. Procedure: SOP-01, "Read the access
 * note before you open the gate".
 *
 * Read at a gate, on a cheap phone, usually in a hurry and sometimes in
 * poor light. So: hazards first and largest, ordered by what injures
 * people; the pairing warning as a block a person cannot skim past; the
 * note next; the access code last and only where it is needed.
 *
 * The code is rendered here and nowhere else. `redactForExport()` strips
 * it from anything that leaves the device, and `householdSafety.test.ts`
 * fails if it can reach an export or a printed page.
 */
import type { Household } from '@/dal/ports/households';
import { TONE_PILL_CLASSES } from '@/design/toneClasses';
import { HAZARD_LABEL, hazardsInOrder, PAIR_UP_HAZARDS, requiresPairing } from './householdSafety';

interface HouseholdAccessNoteCardProps {
  household: Household;
  /** Codes are shown in the field and hidden in any shared or projected view. */
  showAccessCode?: boolean;
}

export function HouseholdAccessNoteCard({ household, showAccessCode = true }: HouseholdAccessNoteCardProps) {
  const note = household.accessNote;
  const hazards = hazardsInOrder(note);

  if (!note || (hazards.length === 0 && !note.note)) {
    return (
      <p className="text-body-md font-body text-slate">
        No access note for this household. If you learn something the next canvasser needs — a dog, a
        gate, poor lighting — add it before you leave.
      </p>
    );
  }

  return (
    <section
      aria-label="Access and safety note"
      className="border-l-4 border-gold bg-gold/5 rounded-r p-3 space-y-2"
    >
      <p className="text-label-caps font-display uppercase text-ink">Before you open the gate</p>

      {hazards.length > 0 && (
        <ul className="flex flex-wrap gap-1.5 list-none p-0 m-0">
          {hazards.map((hazard) => (
            <li
              key={hazard}
              className={`px-2 py-1 rounded border text-label-caps font-display uppercase ${
                PAIR_UP_HAZARDS.includes(hazard) ? TONE_PILL_CLASSES.maroon : TONE_PILL_CLASSES.gold
              }`}
            >
              {HAZARD_LABEL[hazard]}
            </li>
          ))}
        </ul>
      )}

      {requiresPairing(note) && (
        <p className="text-body-md font-body text-maroon font-semibold">
          Do not work this door alone. Take a partner, or leave it for a paired round.
        </p>
      )}

      {note.note && <p className="text-body-md font-body text-ink">{note.note}</p>}

      {note.accessCode &&
        (showAccessCode ? (
          <p className="text-data-mono font-mono text-ink">
            Access code <span className="font-semibold">{note.accessCode}</span>
          </p>
        ) : (
          <p className="text-body-md font-body text-slate">
            An access code is on file. It is shown in the field app only.
          </p>
        ))}
    </section>
  );
}
