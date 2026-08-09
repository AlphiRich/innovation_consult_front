/**
 * Election-COS1.0 — resolve a VD code's ward, handling split VDs
 * IC-ECOS-BUILD-2026-V2 §6.1/§6.2/§6.4. Shared by any form that captures a
 * record scoped to `ctx.vdScope` but needs the record's `wardCode` too
 * (household creation, incident logging — anywhere geoScopeConstraints()
 * needs a real wardCode, not a guess). A vdCode is not unique to one ward
 * — the real NW405 gazette shows ~19% of voting districts split across
 * wards (see src/dal/ports/votingDistricts.ts) — so this surfaces every
 * ward-portion of the code and lets the caller require the user to pick
 * when there's more than one, rather than silently guessing.
 *
 * Originally written inline in VoterForm.tsx (session 6/8); extracted here
 * in session 9 so IncidentForm.tsx doesn't re-derive the same logic (and
 * risk re-deriving it wrong).
 */
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { dal } from '@/dal';
import type { SessionContext } from '@/dal/ports/session';
import type { VotingDistrict } from '@/dal/ports/votingDistricts';

export interface UseVdWardResult {
  /** Every ward-portion of this vdCode. Length 1 for the common, non-split case. */
  wardOptions: VotingDistrict[];
  /** The resolved VD record, once unambiguous (single match, or a matching selection/ctx.wardScope). Null if still ambiguous or not found. */
  resolved: VotingDistrict | null;
  isLoading: boolean;
  selectedWardCode: string | null;
  setSelectedWardCode: (wardCode: string) => void;
}

export function useVdWard(ctx: SessionContext, vdCode: string): UseVdWardResult {
  const query = useQuery({
    queryKey: ['votingDistrictsByVdCode', ctx.tenantId, vdCode],
    queryFn: () => dal.votingDistricts.findByVdCode(ctx, vdCode),
    enabled: vdCode.length > 0,
  });
  const wardOptions = query.data ?? [];
  const [selectedWardCode, setSelectedWardCode] = useState<string | null>(null);

  const resolved =
    wardOptions.length === 1
      ? wardOptions[0]
      : (wardOptions.find((o) => o.wardCode === (selectedWardCode ?? ctx.wardScope)) ?? null);

  return { wardOptions, resolved, isLoading: query.isLoading, selectedWardCode, setSelectedWardCode };
}
