/**
 * Election-COS1.0 — Permissions
 * IC-ECOS-BUILD-2026-V2 §4.4. "Role → capability toggles → per-user
 * override." Capability: `team.manage` (staff writes) / `settings.permissions`
 * (this page's own nav slot — see nav.ts).
 *
 * Roles themselves are the static `SEED_ROLES` (src/auth/seedRoles.ts) —
 * there is no Firestore-backed roles collection in this build (no
 * tenant-customisable roles yet, despite `Role.systemRole` implying
 * custom ones could exist and be deletable), so this page shows them
 * read-only. What IS real and live: each staff member's role assignment
 * and per-user capability overrides (`StaffProfile.capOverrides`), via
 * `dal.staff`.
 *
 * NOT built: provisioning a brand-new staff member. That needs a real
 * Firebase Auth account created through the minimal-footprint invite path
 * `firebaseAuth.ts` names as a future server-side flow — no such Cloud
 * Function exists yet. This page only manages already-provisioned staff.
 */
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { dal } from '@/dal';
import { useSession } from '@/auth/useSession';
import { SEED_ROLES } from '@/auth/seedRoles';
import { ALL_CAPABILITIES } from '@/auth/allCapabilities';
import type { StaffProfile, Capability } from '@/auth/types';

function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

export function PermissionsPage() {
  const session = useSession();
  const queryClient = useQueryClient();

  const staffQuery = useQuery({
    queryKey: ['staff', session?.tenantId],
    queryFn: () => dal.staff.listActive(session!),
    enabled: Boolean(session),
  });

  const [editingUid, setEditingUid] = useState<string | null>(null);
  const [roleId, setRoleId] = useState('');
  const [wardScope, setWardScope] = useState('');
  const [vdScope, setVdScope] = useState('');
  const [granted, setGranted] = useState<Capability[]>([]);
  const [revoked, setRevoked] = useState<Capability[]>([]);

  const saveMutation = useMutation({
    mutationFn: (profile: StaffProfile) => dal.staff.upsert(session!, profile),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff', session?.tenantId] });
      setEditingUid(null);
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: (uid: string) => dal.staff.deactivate(session!, uid),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['staff', session?.tenantId] }),
  });

  if (!session) {
    return (
      <div className="rounded-lg border border-slate/30 bg-white p-6 max-w-lg">
        <p className="text-label-caps font-display uppercase text-slate">/settings/permissions</p>
        <h1 className="text-headline-md font-display text-ink mt-1">Permissions</h1>
        <p className="mt-3 text-body-md font-body text-slate">
          No active session — see BUILD-STATUS.md (no live Firebase project provisioned yet).
        </p>
      </div>
    );
  }

  const staff = staffQuery.data ?? [];
  const roleLabel = (id: string) => SEED_ROLES.find((r) => r.id === id)?.label ?? id;

  function startEdit(profile: StaffProfile) {
    setEditingUid(profile.uid);
    setRoleId(profile.roleId);
    setWardScope(profile.wardScope ?? '');
    setVdScope(profile.vdScope ?? '');
    setGranted(profile.capOverrides.granted);
    setRevoked(profile.capOverrides.revoked);
  }

  function handleSave(profile: StaffProfile) {
    saveMutation.mutate({
      ...profile,
      roleId,
      wardScope: wardScope.trim() || undefined,
      vdScope: vdScope.trim() || undefined,
      capOverrides: { granted, revoked },
    });
  }

  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <p className="text-label-caps font-display uppercase text-slate">/settings/permissions</p>
        <h1 className="text-headline-md font-display text-ink mt-1">Permissions</h1>
      </div>

      <div className="space-y-2">
        <h2 className="text-label-caps font-display uppercase text-slate">Roles (system-defined)</h2>
        {SEED_ROLES.map((role) => (
          <div key={role.id} className="bg-white border border-ink/10 rounded p-3">
            <p className="text-body-md font-body text-ink font-semibold">
              {role.label} <span className="text-data-mono font-mono text-slate">· {role.geoScope}</span>
            </p>
            <p className="text-data-mono font-mono text-slate mt-1">{role.defaultCaps.join(', ') || '(none)'}</p>
          </div>
        ))}
      </div>

      <div className="space-y-2">
        <h2 className="text-label-caps font-display uppercase text-slate">Staff</h2>
        {staffQuery.isLoading && <p className="text-body-md font-body text-slate">Loading…</p>}
        {staffQuery.isError && (
          <p className="text-body-md font-body text-maroon">
            Couldn't load staff — check you hold the team.manage capability.
          </p>
        )}
        {staff.length === 0 && !staffQuery.isLoading && (
          <p className="text-body-md font-body text-slate">No active staff records visible.</p>
        )}

        {staff.map((profile) => (
          <div key={profile.uid} className="bg-white border border-ink/10 rounded-lg p-4 space-y-2">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-body-md font-body text-ink font-semibold">
                  {profile.firstName} {profile.lastName}
                </p>
                <p className="text-data-mono font-mono text-slate">
                  {roleLabel(profile.roleId)}
                  {profile.wardScope && ` · ${profile.wardScope}`}
                  {profile.vdScope && ` · VD ${profile.vdScope}`}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => startEdit(profile)}
                  className="px-3 py-1.5 border border-ink/20 rounded text-label-caps font-display uppercase text-ink"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => deactivateMutation.mutate(profile.uid)}
                  disabled={deactivateMutation.isPending}
                  className="px-3 py-1.5 border border-maroon/40 rounded text-label-caps font-display uppercase text-maroon disabled:opacity-40"
                >
                  Deactivate
                </button>
              </div>
            </div>

            {editingUid === profile.uid && (
              <div className="border-t border-ink/10 pt-3 space-y-3">
                <div className="grid grid-cols-3 gap-3">
                  <label className="space-y-1 block">
                    <span className="text-label-caps font-display uppercase text-slate">Role</span>
                    <select
                      className="w-full border border-ink/20 rounded px-2 py-1.5 text-body-md font-body bg-white"
                      value={roleId}
                      onChange={(e) => setRoleId(e.target.value)}
                    >
                      {SEED_ROLES.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="space-y-1 block">
                    <span className="text-label-caps font-display uppercase text-slate">Ward scope</span>
                    <input
                      className="w-full border border-ink/20 rounded px-2 py-1.5 text-body-md font-body"
                      value={wardScope}
                      onChange={(e) => setWardScope(e.target.value)}
                    />
                  </label>
                  <label className="space-y-1 block">
                    <span className="text-label-caps font-display uppercase text-slate">VD scope</span>
                    <input
                      className="w-full border border-ink/20 rounded px-2 py-1.5 text-body-md font-body"
                      value={vdScope}
                      onChange={(e) => setVdScope(e.target.value)}
                    />
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-label-caps font-display uppercase text-slate mb-1">
                      Additional capabilities granted
                    </p>
                    <div className="max-h-40 overflow-y-auto space-y-1 border border-ink/10 rounded p-2">
                      {ALL_CAPABILITIES.map((cap) => (
                        <label key={cap} className="flex items-center gap-2 text-body-md font-body">
                          <input type="checkbox" checked={granted.includes(cap)} onChange={() => setGranted((g) => toggle(g, cap))} />
                          {cap}
                        </label>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-label-caps font-display uppercase text-slate mb-1">Capabilities revoked</p>
                    <div className="max-h-40 overflow-y-auto space-y-1 border border-ink/10 rounded p-2">
                      {ALL_CAPABILITIES.map((cap) => (
                        <label key={cap} className="flex items-center gap-2 text-body-md font-body">
                          <input type="checkbox" checked={revoked.includes(cap)} onChange={() => setRevoked((r) => toggle(r, cap))} />
                          {cap}
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                {saveMutation.isError && (
                  <p className="text-body-md text-maroon">Save failed — check you hold team.manage.</p>
                )}

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => handleSave(profile)}
                    disabled={saveMutation.isPending}
                    className="px-4 py-2 bg-ink text-paper rounded text-label-caps font-display uppercase disabled:opacity-40"
                  >
                    {saveMutation.isPending ? 'Saving…' : 'Save'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingUid(null)}
                    className="px-4 py-2 border border-ink/20 rounded text-label-caps font-display uppercase text-ink"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
