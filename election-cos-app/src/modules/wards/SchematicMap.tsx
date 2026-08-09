/**
 * Election-COS1.0 — schematic ward/VD map
 * IC-ECOS-BUILD-2026-V2 §6.1: "Mapping: the screens show schematic ward
 * maps, not full GIS. Build schematic first — an SVG or simple tile map
 * with VD markers. Do not pull in a GIS stack in v1." The reference
 * screens use a real embedded map tile (Google-Maps-style, with pins) —
 * that's explicitly NOT what to build here; this is a deliberately honest
 * placeholder, not a disguised iframe to a maps provider.
 *
 * Renders a simple proportional grid of VD tiles sized by registered
 * voter count — real information (relative VD size), no fake geography.
 */
import type { VotingDistrict } from '@/dal/ports/votingDistricts';
import { tokens } from '@/design/tokens';

interface SchematicMapProps {
  votingDistricts: VotingDistrict[];
}

export function SchematicMap({ votingDistricts }: SchematicMapProps) {
  if (votingDistricts.length === 0) {
    return (
      <div className="border border-dashed border-slate/40 rounded p-8 text-center">
        <p className="text-body-md font-body text-slate">No voting districts captured for this ward yet.</p>
      </div>
    );
  }

  const maxVoters = Math.max(...votingDistricts.map((vd) => vd.registeredVoters), 1);

  return (
    <div>
      <p className="text-label-caps font-display uppercase text-slate mb-2">
        Schematic VD layout (tile size ∝ registered voters — not a real map; see §6.1)
      </p>
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
        {votingDistricts.map((vd) => {
          const weight = vd.registeredVoters / maxVoters;
          const opacity = 0.25 + weight * 0.6;
          // Tile shading is derived from the ink design token (never a raw
          // hex/rgb literal) — an 8-digit hex appends the alpha channel.
          const alphaHex = Math.round(opacity * 255)
            .toString(16)
            .padStart(2, '0');
          return (
            <div
              key={vd.id}
              className="border border-ink/20 rounded p-3 flex flex-col justify-between"
              style={{ backgroundColor: `${tokens.color.ink}${alphaHex}` }}
            >
              <span
                className={`text-data-mono font-mono ${weight > 0.5 ? 'text-paper' : 'text-ink'}`}
              >
                {vd.vdCode}
              </span>
              <span className={`text-body-md font-body ${weight > 0.5 ? 'text-paper' : 'text-ink'}`}>
                {vd.name || 'Unnamed VD'}
              </span>
              <span className={`text-label-caps font-display ${weight > 0.5 ? 'text-paper/80' : 'text-slate'}`}>
                {vd.registeredVoters.toLocaleString('en-ZA')} registered
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
