/**
 * Election Campaign OS — shared party-list row editor
 * IC-ECOS-BUILD-2026-V2 §8.2. Used by both SeatCalculatorPage.tsx and
 * ThresholdAnalyzerPage.tsx — same add/remove/edit-row mechanics, just a
 * different column set (`showWardSeats`), so it's one component instead
 * of two near-identical copies.
 */
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
    <div className="space-y-2">
      <div className={`grid ${showWardSeats ? 'grid-cols-[1fr_140px_120px_40px]' : 'grid-cols-[1fr_140px_40px]'} gap-2 items-center`}>
        <span className="text-label-caps font-display uppercase text-slate">Party</span>
        <span className="text-label-caps font-display uppercase text-slate">Votes</span>
        {showWardSeats && <span className="text-label-caps font-display uppercase text-slate">Ward seats won</span>}
        <span />
      </div>

      {rows.map((row) => (
        <div
          key={row.id}
          className={`grid ${showWardSeats ? 'grid-cols-[1fr_140px_120px_40px]' : 'grid-cols-[1fr_140px_40px]'} gap-2 items-center`}
        >
          <input
            className="border border-ink/20 rounded px-2 py-1.5 text-body-md font-body"
            value={row.name}
            onChange={(e) => updateRow(row.id, { name: e.target.value })}
            placeholder="Party name"
          />
          <input
            type="number"
            min="0"
            className="border border-ink/20 rounded px-2 py-1.5 text-body-md font-body"
            value={row.votes}
            onChange={(e) => updateRow(row.id, { votes: Number(e.target.value) || 0 })}
          />
          {showWardSeats && (
            <input
              type="number"
              min="0"
              className="border border-ink/20 rounded px-2 py-1.5 text-body-md font-body"
              value={row.wardSeatsWon}
              onChange={(e) => updateRow(row.id, { wardSeatsWon: Number(e.target.value) || 0 })}
            />
          )}
          <button
            type="button"
            onClick={() => removeRow(row.id)}
            className="text-maroon text-label-caps font-display uppercase"
            aria-label={`Remove ${row.name || 'party'}`}
          >
            ✕
          </button>
        </div>
      ))}

      <button
        type="button"
        onClick={addRow}
        className="px-3 py-1.5 border border-ink/20 rounded text-label-caps font-display uppercase text-ink"
      >
        + Add party
      </button>
    </div>
  );
}
