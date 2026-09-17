/**
 * Election Campaign OS — Permissions
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
 * ADDING A PERSON (session 27). This page now creates staff records as
 * well as editing them. What it does NOT do is create anyone's sign-in
 * account: that needs the Auth Admin SDK, so no Cloud Function in this
 * build can do it, and inventing one would mean this product holding
 * someone else's password.
 *
 * The order is therefore: the person signs in themselves, lands on
 * "Awaiting access" (Shell.tsx), and sends the sign-in ID it shows them to
 * an administrator, who fills in the form below. That also happens to be
 * the arrangement §4.3 wants — the name, phone, role and scope are
 * written here to Firestore in South Africa and never to Auth.
 *
 * Validation lives in `staffProvisioning.ts`, tested, because two of its
 * rules prevent an account that signs in perfectly and then shows an empty
 * application with no error to explain it. See that file's header.
 */
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { dal } from '@/dal';
import { useSession } from '@/auth/useSession';
import { SEED_ROLES } from '@/auth/seedRoles';
import { ALL_CAPABILITIES } from '@/auth/allCapabilities';
import { resolveEffectiveCapabilities } from '@/auth/capabilities';
import type { StaffProfile, Capability } from '@/auth/types';
import {
  EMPTY_DRAFT,
  provisioningProblems,
  scopeRequirement,
  SIGN_IN_ID_BASIS,
  toStaffProfile,
  type ProvisioningField,
  type StaffDraft,
} from './staffProvisioning';
import { CONCENTRATION_BASIS, dutyConcentrations, withholdingBreaches } from './dutyConcentration';

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

  const [adding, setAdding] = useState(false);
  const [newStaff, setNewStaff] = useState<StaffDraft>(EMPTY_DRAFT);
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

  /*
   * What the person being edited would actually end up holding — the
   * role's defaults, plus grants, minus revocations, resolved by the same
   * function the Cloud Function uses. Separations of duty are a property
   * of that set, not of the checkboxes, so they are checked against it.
   */
  const editedCaps = resolveEffectiveCapabilities(
    { defaultCaps: SEED_ROLES.find((r) => r.id === roleId)?.defaultCaps ?? [] },
    { granted, revoked },
  );
  const concentrations = dutyConcentrations(editedCaps);
  const withheld = withholdingBreaches(roleId, editedCaps);

  function startEdit(profile: StaffProfile) {
    setEditingUid(profile.uid);
    setRoleId(profile.roleId);
    setWardScope(profile.wardScope ?? '');
    setVdScope(profile.vdScope ?? '');
    setGranted(profile.capOverrides.granted);
    setRevoked(profile.capOverrides.revoked);
  }

  const existingUids = (staffQuery.data ?? []).map((s) => s.uid);
  const newStaffProblems = adding ? provisioningProblems(newStaff, existingUids) : [];
  const problemFor = (field: ProvisioningField) => newStaffProblems.find((p) => p.field === field)?.message;
  const newStaffScope = scopeRequirement(newStaff.roleId);

  function handleAdd() {
    if (newStaffProblems.length > 0) return;
    saveMutation.mutate(toStaffProfile(newStaff, session!.tenantId), {
      onSuccess: () => {
        setNewStaff(EMPTY_DRAFT);
        setAdding(false);
      },
    });
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

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-label-caps font-display uppercase text-slate">Staff</h2>
          <button
            type="button"
            onClick={() => setAdding((open) => !open)}
            className="px-3 py-1.5 border border-ink/20 rounded text-label-caps font-display uppercase text-ink"
          >
            {adding ? 'Cancel' : 'Add a person'}
          </button>
        </div>

        {adding && (
          <div className="bg-white border border-gold/60 rounded-lg p-4 space-y-3">
            <p className="text-body-md font-body text-slate">{SIGN_IN_ID_BASIS}</p>

            <label className="space-y-1 block">
              <span className="text-label-caps font-display uppercase text-slate">Sign-in ID</span>
              <input
                className="w-full border border-ink/20 rounded px-2 py-1.5 text-data-mono font-mono"
                value={newStaff.signInId}
                onChange={(e) => setNewStaff((d) => ({ ...d, signInId: e.target.value }))}
              />
              {problemFor('signInId') && <span className="block text-body-md text-maroon">{problemFor('signInId')}</span>}
            </label>

            <div className="grid grid-cols-3 gap-3">
              <label className="space-y-1 block">
                <span className="text-label-caps font-display uppercase text-slate">First name</span>
                <input
                  className="w-full border border-ink/20 rounded px-2 py-1.5 text-body-md font-body"
                  value={newStaff.firstName}
                  onChange={(e) => setNewStaff((d) => ({ ...d, firstName: e.target.value }))}
                />
              </label>
              <label className="space-y-1 block">
                <span className="text-label-caps font-display uppercase text-slate">Last name</span>
                <input
                  className="w-full border border-ink/20 rounded px-2 py-1.5 text-body-md font-body"
                  value={newStaff.lastName}
                  onChange={(e) => setNewStaff((d) => ({ ...d, lastName: e.target.value }))}
                />
              </label>
              <label className="space-y-1 block">
                <span className="text-label-caps font-display uppercase text-slate">Contact number</span>
                <input
                  className="w-full border border-ink/20 rounded px-2 py-1.5 text-body-md font-body"
                  value={newStaff.phone}
                  onChange={(e) => setNewStaff((d) => ({ ...d, phone: e.target.value }))}
                />
              </label>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <label className="space-y-1 block">
                <span className="text-label-caps font-display uppercase text-slate">Role</span>
                <select
                  className="w-full border border-ink/20 rounded px-2 py-1.5 text-body-md font-body bg-white"
                  value={newStaff.roleId}
                  onChange={(e) => setNewStaff((d) => ({ ...d, roleId: e.target.value }))}
                >
                  <option value="">Choose a role…</option>
                  {SEED_ROLES.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </label>
              {/*
               * Only the scope the chosen role actually uses is offered.
               * The role decides this, not the person filling in the form —
               * a ward code on a tenant-wide role is recorded and never
               * applied, and a ward role with no code is denied every
               * record by inScope(). Both are refused in staffProvisioning.
               */}
              {newStaffScope === 'WARD' && (
                <label className="space-y-1 block">
                  <span className="text-label-caps font-display uppercase text-slate">Ward code</span>
                  <input
                    className="w-full border border-ink/20 rounded px-2 py-1.5 text-data-mono font-mono"
                    value={newStaff.wardScope}
                    onChange={(e) => setNewStaff((d) => ({ ...d, wardScope: e.target.value }))}
                  />
                </label>
              )}
              {newStaffScope === 'VD' && (
                <label className="space-y-1 block">
                  <span className="text-label-caps font-display uppercase text-slate">VD code</span>
                  <input
                    className="w-full border border-ink/20 rounded px-2 py-1.5 text-data-mono font-mono"
                    value={newStaff.vdScope}
                    onChange={(e) => setNewStaff((d) => ({ ...d, vdScope: e.target.value }))}
                  />
                </label>
              )}
            </div>

            {newStaff.roleId !== '' && newStaffProblems.length > 0 && (
              <ul className="space-y-1">
                {newStaffProblems.map((problem) => (
                  <li key={problem.field + problem.message} className="text-body-md font-body text-maroon">
                    {problem.message}
                  </li>
                ))}
              </ul>
            )}

            <button
              type="button"
              onClick={handleAdd}
              disabled={newStaffProblems.length > 0 || saveMutation.isPending}
              className="px-4 py-2 bg-ink text-paper rounded text-label-caps font-display uppercase disabled:opacity-40"
            >
              Add to the team
            </button>
          </div>
        )}
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

                {concentrations.length > 0 && (
                  <div className="border-l-4 border-maroon bg-white p-3 space-y-2">
                    <p className="text-label-caps font-display uppercase text-maroon">
                      This combination concentrates a duty that is meant to be split
                    </p>
                    <ul className="space-y-1">
                      {concentrations.map((c) => (
                        <li key={c.rule.label} className="text-body-md font-body text-ink">
                          <span className="font-semibold">{c.rule.label}</span> — {c.rule.reason}{' '}
                          <span className="text-data-mono font-mono text-slate">({c.held.join(' + ')})</span>
                        </li>
                      ))}
                    </ul>
                    <p className="text-body-md font-body text-slate">{CONCENTRATION_BASIS}</p>
                  </div>
                )}

                {withheld.length > 0 && (
                  <div className="border-l-4 border-gold bg-white p-3 space-y-1">
                    <p className="text-label-caps font-display uppercase text-ink">
                      A departure from what this role is deliberately denied
                    </p>
                    {withheld.map((breach) => (
                      <p key={breach.withholding.roleId} className="text-body-md font-body text-ink">
                        {breach.withholding.reason}{' '}
                        <span className="text-data-mono font-mono text-slate">({breach.held.join(', ')})</span>
                      </p>
                    ))}
                  </div>
                )}

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
