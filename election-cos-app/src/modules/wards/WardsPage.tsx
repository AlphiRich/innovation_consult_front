/**
 * Election Campaign OS — Wards module
 * IC-ECOS-BUILD-2026-V2 §6.1 — foundational; everything else scopes to it.
 * Layout informed by the Stitch suite's lge_war_room_local_head screen
 * (municipality-level summary + Ward/VD table), reskinned to our tokens
 * and trimmed to fields the governing data model actually has (no
 * volunteer/performance columns — that's a different module's data).
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { dal } from '@/dal';
import { useSession } from '@/auth/useSession';
import type { Ward } from '@/dal/ports/wards';
import { WardForm } from './WardForm';
import { byWardCode, defaultMunicipalityCode, totalsFor } from './wardStats';
import { RECONCILIATION_BASIS, reconcileSeed } from './seedReconciliation';
import {
  analyseWardSizes,
  DEVIATION_BASIS,
  formatDeviation,
  WORKLOAD_BASIS,
} from './wardSizeDeviation';
import { MunicipalRegisterPanel } from '@/modules/reference/MunicipalRegisterPanel';
import { BarMeter, Button, Card, PageHeader, SectionLabel, StatTile, Table, Td, Th } from '@/components/ui';

export function WardsPage() {
  const session = useSession();
  const [showForm, setShowForm] = useState<{ mode: 'closed' } | { mode: 'create' } | { mode: 'edit'; ward: Ward }>({
    mode: 'closed',
  });

  const wardsQuery = useQuery({
    queryKey: ['wards', session?.tenantId],
    queryFn: () => dal.wards.listAll(session!),
    enabled: Boolean(session),
  });

  // Read rather than written here: the expected ward count lives in
  // Municipality Config, and a seed that stopped one ward short has no
  // other symptom anywhere in the application. See seedReconciliation.ts.
  const profileQuery = useQuery({
    queryKey: ['municipalityProfile', session?.tenantId],
    queryFn: () => dal.municipalityProfile.get(session!),
    enabled: Boolean(session),
  });

  if (!session) {
    return (
      <div className="rounded-lg border border-slate/30 bg-white p-6 max-w-lg">
        <p className="text-label-caps font-display uppercase text-slate">/wards</p>
        <h1 className="text-headline-md font-display text-ink mt-1">Wards</h1>
        <p className="mt-3 text-body-md font-body text-slate">
          No active session — see BUILD-STATUS.md (no live Firebase project provisioned yet).
        </p>
      </div>
    );
  }

  // Firestore returns lexicographic id order, which reads as 1, 10, 11,
  // 2, 20 on a 34-ward municipality. See compareWardCodes.
  const wards = byWardCode(wardsQuery.data ?? []);
  const totals = totalsFor(wards);
  const reconciliation = profileQuery.isLoading ? null : reconcileSeed(wards, profileQuery.data ?? null);
  const sizes = analyseWardSizes(wards);
  // The bar is read against the biggest ward, not the municipal total:
  // 34 bars at 3% each would all look identical.
  const largestWard = wards.reduce((max, w) => Math.max(max, w.registeredVoters), 0);

  return (
    <div className="space-y-6 max-w-3xl">
      {/*
       * Session 44: this header and these tiles were still hand-rolled.
       * The page counted as "migrated" in that session's first pass
       * because it imports Table — a weaker test than actually using the
       * primitives, and the route drive caught it: the "+ New ward"
       * button was 32px tall, under the 44px Button carries.
       */}
      <PageHeader
        slug="/wards"
        title="Wards"
        action={<Button onClick={() => setShowForm({ mode: 'create' })}>+ New ward</Button>}
      />

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <StatTile
          label="Wards"
          value={
            <>
              {totals.wardCount}
              {reconciliation?.expectedWardCount ? (
                <span className="text-body-md font-body text-slate"> / {reconciliation.expectedWardCount}</span>
              ) : null}
            </>
          }
        />
        <StatTile label="Voting districts" value={totals.vdCount} />
        <StatTile emphasis label="Registered voters" value={totals.registeredVoters.toLocaleString('en-ZA')} />
      </div>

      {reconciliation && reconciliation.issues.length > 0 && (
        <Card className="space-y-2">
          <SectionLabel as="h2">
            Seed check {reconciliation.reconciled ? '· consistent' : '· needs attention'}
          </SectionLabel>
          <ul className="space-y-2">
            {reconciliation.issues.map((seedIssue) => (
              <li
                key={seedIssue.code}
                className={`text-body-md font-body ${seedIssue.severity === 'BLOCKING' ? 'text-maroon' : 'text-slate'}`}
              >
                {seedIssue.message}
                {seedIssue.wardCodes.length > 0 && (
                  <span className="block text-data-mono font-mono text-slate">
                    {seedIssue.wardCodes.slice(0, 12).join(', ')}
                    {seedIssue.wardCodes.length > 12 ? ` … and ${seedIssue.wardCodes.length - 12} more` : ''}
                  </span>
                )}
              </li>
            ))}
          </ul>
          <p className="text-body-md font-body text-slate">{RECONCILIATION_BASIS}</p>
        </Card>
      )}

      {/*
        * The only check on this page whose other side is outside this
        * tenant, and the only one that can say the loaded wards are the
        * wards the election will be run on. Placed above the average-based
        * panel deliberately: the published band is exact where the
        * ±15%-of-a-computed-mean below is an approximation of it.
        */}
      {wards.length > 0 && (
        <MunicipalRegisterPanel
          municipalityCode={profileQuery.data?.municipalityCode ?? defaultMunicipalityCode(wards)}
          wardCount={totals.wardCount}
          registeredVoters={totals.registeredVoters}
          totalCouncilSeats={profileQuery.data?.totalCouncilSeats}
          prSeats={profileQuery.data?.prSeats}
          wards={wards.map((w) => ({ wardCode: w.wardCode, registeredVoters: w.registeredVoters }))}
        />
      )}

      {/*
        * Ward size against the municipal average. Not a seed check in the
        * reconciliation sense — nothing here contradicts anything — but a
        * ward well above the average is both a possible transcription
        * error and a real canvassing-workload fact. The 15% is the IEC's
        * own published allowance — see `wardSizeDeviation.ts`.
        */}
      {sizes.wardCount > 0 && sizes.mean > 0 && (
        <div className="bg-white border border-ink/10 rounded-lg p-4 space-y-2">
          <div className="flex items-baseline justify-between gap-3 flex-wrap">
            <h2 className="text-label-caps font-display uppercase text-slate">Ward size against the average</h2>
            <p className="text-data-mono font-mono text-slate">
              {Math.round(sizes.mean).toLocaleString('en-ZA')} registered voters per ward ·{' '}
              {sizes.wards[0].registeredVoters.toLocaleString('en-ZA')} to{' '}
              {sizes.wards[sizes.wards.length - 1].registeredVoters.toLocaleString('en-ZA')}
            </p>
          </div>

          {sizes.outliers.length === 0 ? (
            <p className="text-body-md font-body text-ink">
              Every ward is within {Math.round(sizes.allowance * 100)}% of the average.
            </p>
          ) : (
            <div className="border-l-4 border-gold pl-3 space-y-1">
              <p className="text-label-caps font-display uppercase text-ink">
                {sizes.outliers.length} ward(s) more than {Math.round(sizes.allowance * 100)}% from the average
              </p>
              {sizes.outliers.slice(0, 8).map((outlier) => (
                <p key={outlier.wardCode} className="text-data-mono font-mono text-slate">
                  {outlier.wardCode} · {outlier.registeredVoters.toLocaleString('en-ZA')} ·{' '}
                  {formatDeviation(outlier.deviation, sizes.mean)}
                </p>
              ))}
            </div>
          )}

          {sizes.emptyWards.length > 0 && (
            <p className="text-body-md font-body text-maroon">
              {sizes.emptyWards.length} ward(s) carry no registered voters at all:{' '}
              <span className="text-data-mono font-mono">{sizes.emptyWards.join(', ')}</span>. That drags the
              average down for every other ward on this panel.
            </p>
          )}

          {sizes.repeatedTotals.length > 0 && (
            <p className="text-body-md font-body text-slate">
              Same total on more than one ward:{' '}
              {sizes.repeatedTotals
                .map((r) => `${r.registeredVoters.toLocaleString('en-ZA')} (${r.wardCodes.join(', ')})`)
                .join('; ')}
              . Two wards can genuinely hold the same number — worth a second look against the notice all the
              same.
            </p>
          )}

          <p className="text-body-md font-body text-slate">{WORKLOAD_BASIS}</p>
          <p className="text-body-md font-body text-slate">{DEVIATION_BASIS}</p>
        </div>
      )}

      {wardsQuery.isLoading && <p className="text-body-md font-body text-slate">Loading…</p>}
      {wardsQuery.isError && (
        <p className="text-body-md font-body text-maroon">
          {wardsQuery.error instanceof Error ? wardsQuery.error.message : 'Failed to load wards.'}
        </p>
      )}
      {wards.length === 0 && !wardsQuery.isLoading && (
        <p className="text-body-md font-body text-slate">
          No wards captured yet. Real JB Marks (NW405) demarcation data exists and can be loaded via
          tools/seed-data/ once a live Firebase project is provisioned (see docs/nw405-seed-data.md) — until then,
          add wards manually below.
        </p>
      )}

      {/*
        * A table rather than 34 stacked cards. Comparing two wards' voter
        * counts meant most of a metre of scrolling, and the figures did
        * not line up as a column. Pattern adopted from the screen-rebuild
        * reference (session 39), which used this build's own tokens.
        */}
      {wards.length > 0 && (
        <Table caption="Wards in this municipality, with voting districts and registered voters">
          <thead>
            <tr>
              <Th>Ward</Th>
              <Th>Code</Th>
              <Th numeric>VDs</Th>
              <Th numeric>Registered</Th>
              <Th>Share of municipality</Th>
              <Th className="sr-only">Actions</Th>
            </tr>
          </thead>
          <tbody>
            {wards.map((ward) => (
              <tr key={ward.id} className="hover:bg-paper">
                <Td>
                  <Link to={`/wards/${ward.wardCode}`} className="text-ink hover:text-teal font-medium">
                    {ward.name}
                  </Link>
                </Td>
                <Td mono>{ward.wardCode}</Td>
                <Td numeric>{ward.vdCodes.length}</Td>
                <Td numeric>{ward.registeredVoters.toLocaleString('en-ZA')}</Td>
                <Td className="w-40">
                  <BarMeter
                    value={ward.registeredVoters}
                    max={largestWard}
                    label={`${ward.name}: ${ward.registeredVoters.toLocaleString('en-ZA')} registered voters`}
                  />
                </Td>
                <Td className="whitespace-nowrap text-right">
                  <button
                    type="button"
                    onClick={() => setShowForm({ mode: 'edit', ward })}
                    className="min-h-11 px-3 text-label-caps font-display uppercase text-teal"
                  >
                    Edit
                  </button>
                  <Link
                    to={`/wards/${ward.wardCode}`}
                    className="inline-flex min-h-11 items-center px-3 text-label-caps font-display uppercase text-teal"
                  >
                    VDs
                  </Link>
                </Td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-paper font-medium">
              <Td>{totals.wardCount} wards</Td>
              <Td mono>{defaultMunicipalityCode(wards)}</Td>
              <Td numeric>{totals.vdCount}</Td>
              <Td numeric>{totals.registeredVoters.toLocaleString('en-ZA')}</Td>
              <Td />
              <Td />
            </tr>
          </tfoot>
        </Table>
      )}

      {showForm.mode !== 'closed' && (
        <WardForm
          ctx={session}
          ward={showForm.mode === 'edit' ? showForm.ward : undefined}
          defaultMunicipalityCode={defaultMunicipalityCode(wards)}
          onDone={() => setShowForm({ mode: 'closed' })}
          onCancel={() => setShowForm({ mode: 'closed' })}
        />
      )}
    </div>
  );
}
