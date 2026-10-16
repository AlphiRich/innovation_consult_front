/**
 * Election Campaign OS — shared party-list row editor
 * IC-ECOS-BUILD-2026-V2 §8.2. Used by both SeatCalculatorPage.tsx and
 * ThresholdAnalyzerPage.tsx — same add/remove/edit-row mechanics, just a
 * different column set (`showWardSeats`), so it's one component instead
 * of two near-identical copies.
 *
 * SESSION 44: THIS WAS NOT IN THE MIGRATION, AND IT SHOWED
 *
 * The page migration covered `*Page.tsx` files. The editors underneath
 * them were never in scope, and driving the routes afterwards found three
 * defects here that no page carried:
 *
 *  1. **Unusable on a phone.** The rows were
 *     `grid-cols-[1fr_140px_120px_40px]` — 300px of fixed columns plus
 *     gaps plus an input's intrinsic minimum in the `1fr`. The Vote
 *     Calculator's own content was 567px wide in a 390px viewport, so the
 *     page scrolled sideways. §3.3 forbids that, and this is a field
 *     application.
 *  2. **No accessible names at all.** The column headings were plain
 *     `<span>`s. A span is not a label — it associates with nothing — so
 *     every input here was genuinely unnamed. This is the real version of
 *     the defect the migration wrongly attributed to the pages, whose
 *     inputs were nested inside their `<label>` and therefore fine. The
 *     labels are now real `<label htmlFor>`: visible on a phone, and
 *     `sm:sr-only` on wider screens where the column header carries the
 *     visual cue but a screen reader still needs the name.
 *  3. **Targets far under 44px.** The remove button was 16px tall. On a
 *     row of numbers, beside a text field, the control that deletes a
 *     party was the smallest thing on the screen.
 */
import { useId } from 'react';

export interface PartyRow {
  id: string;
  name: string;
  votes: number;
  wardSeatsWon: number;
}

interface PartyRowsEditorProps {
  rows: PartyRow[];
  onChange: (rows: PartyRow[]) => void;
  showWardSeats: boolean;
}

const CONTROL = 'w-full min-h-11 border border-ink/20 rounded px-2 py-2 text-body-md font-body bg-white text-ink';
const FIELD_LABEL = 'text-label-caps font-display uppercase text-slate sm:sr-only';

function PartyRowFields({
  row,
  showWardSeats,
  onPatch,
  onRemove,
}: {
  row: PartyRow;
  showWardSeats: boolean;
  onPatch: (patch: Partial<PartyRow>) => void;
  onRemove: () => void;
}) {
  // One generated id per row, suffixed per field, so every control has a
  // label tied to it by id rather than by nesting.
  const id = useId();
  const named = row.name.trim() || 'this party';

  return (
    <div
      className={`grid gap-2 sm:items-end ${
        showWardSeats ? 'sm:grid-cols-[1fr_140px_120px_auto]' : 'sm:grid-cols-[1fr_140px_auto]'
      }`}
    >
      <div className="space-y-1">
        <label htmlFor={`${id}-name`} className={FIELD_LABEL}>
          Party
        </label>
        <input
          id={`${id}-name`}
          className={CONTROL}
          value={row.name}
          onChange={(e) => onPatch({ name: e.target.value })}
          placeholder="Party name"
        />
      </div>

      <div className="space-y-1">
        <label htmlFor={`${id}-votes`} className={FIELD_LABEL}>
          Votes
        </label>
        <input
          id={`${id}-votes`}
          type="number"
          min="0"
          className={CONTROL}
          value={row.votes}
          onChange={(e) => onPatch({ votes: Number(e.target.value) || 0 })}
        />
      </div>

      {showWardSeats && (
        <div className="space-y-1">
          <label htmlFor={`${id}-ward`} className={FIELD_LABEL}>
            Ward seats won
          </label>
          <input
            id={`${id}-ward`}
            type="number"
            min="0"
            className={CONTROL}
            value={row.wardSeatsWon}
            onChange={(e) => onPatch({ wardSeatsWon: Number(e.target.value) || 0 })}
          />
        </div>
      )}

      {/*
       * Full width on a phone, where it sits under the fields it applies
       * to and a 44px square beside a stacked column would read as a
       * fourth field. Square from `sm:` up, where it is the last cell of
       * the row.
       */}
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${named}`}
        className="inline-flex min-h-11 w-full items-center justify-center rounded border border-maroon/40 px-3 text-label-caps font-display uppercase text-maroon sm:w-11 sm:border-transparent"
      >
        <span aria-hidden="true" className="sm:hidden">
          Remove
        </span>
        <span aria-hidden="true" className="hidden sm:inline">
          ✕
        </span>
      </button>
    </div>
  );
}

export function PartyRowsEditor({ rows, onChange, showWardSeats }: PartyRowsEditorProps) {
  function updateRow(id: string, patch: Partial<PartyRow>) {
    onChange(rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  function removeRow(id: string) {
    onChange(rows.filter((r) => r.id !== id));
  }

  function addRow() {
    onChange([...rows, { id: crypto.randomUUID(), name: '', votes: 0, wardSeatsWon: 0 }]);
  }

  return (
    <div className="space-y-3 sm:space-y-2">
      {/*
       * The column headings, from `sm:` up only. They are presentational
       * here — each control carries its own `<label>` — so on a phone,
       * where the rows stack, they would be a row of words above nothing.
       */}
      <div
        aria-hidden="true"
        className={`hidden gap-2 sm:grid ${
          showWardSeats ? 'sm:grid-cols-[1fr_140px_120px_auto]' : 'sm:grid-cols-[1fr_140px_auto]'
        }`}
      >
        <span className="text-label-caps font-display uppercase text-slate">Party</span>
        <span className="text-label-caps font-display uppercase text-slate">Votes</span>
        {showWardSeats && <span className="text-label-caps font-display uppercase text-slate">Ward seats won</span>}
        <span className="w-11" />
      </div>

      {rows.map((row) => (
        <PartyRowFields
          key={row.id}
          row={row}
          showWardSeats={showWardSeats}
          onPatch={(patch) => updateRow(row.id, patch)}
          onRemove={() => removeRow(row.id)}
        />
      ))}

      <button
        type="button"
        onClick={addRow}
        className="inline-flex min-h-11 items-center rounded border border-ink/20 px-3 text-label-caps font-display uppercase text-ink"
      >
        + Add party
      </button>
    </div>
  );
}
