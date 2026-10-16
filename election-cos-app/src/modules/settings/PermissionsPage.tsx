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
import { BasisNote, Button, Card, DataLine, Field, PageHeader, SectionLabel } from '@/components/ui';
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
import { SPLIT_VD_BASIS } from './staffProvisioning';

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
      <Card className="max-w-lg">
        <PageHeader slug="/settings/permissions" title="Permissions" />
        <p className="mt-3 text-body-md font-body text-slate">
          No active session — see BUILD-STATUS.md (no live Firebase project provisioned yet).
        </p>
      </Card>
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
      <PageHeader slug="/settings/permissions" title="Permissions" />

      <div className="space-y-2">
        <SectionLabel as="h2">Roles (system-defined)</SectionLabel>
        {SEED_ROLES.map((role) => (
          <Card key={role.id}>
            <p className="text-body-md font-body text-ink font-semibold">
              {role.label} <span className="text-data-mono font-mono text-slate">· {role.geoScope}</span>
            </p>
            <DataLine className="mt-1">{role.defaultCaps.join(', ') || '(none)'}</DataLine>
          </Card>
        ))}
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <SectionLabel as="h2">Staff</SectionLabel>
          <Button variant="ghost" onClick={() => setAdding((open) => !open)} aria-expanded={adding}>
            {adding ? 'Cancel' : 'Add a person'}
          </Button>
        </div>

        {adding && (
          <Card tone="accent" className="space-y-3">
            <BasisNote>{SIGN_IN_ID_BASIS}</BasisNote>
            {newStaffScope === 'VD' && <BasisNote>{SPLIT_VD_BASIS}</BasisNote>}

            {/*
             * The sign-in ID's validation message used to sit INSIDE its
             * <label>, which made it part of the control's accessible
             * name: a screen reader read the label and the error as one
             * run of text, and the name changed as you typed. Field's
             * `error` goes through aria-describedby instead. Same defect
             * class as Voters and Field Diary — see this session's
             * correction in src/components/ui/index.tsx.
             */}
            <Field label="Sign-in ID" mono error={problemFor('signInId')}>
              {(props) => (
                <input
                  {...props}
                  value={newStaff.signInId}
                  onChange={(e) => setNewStaff((d) => ({ ...d, signInId: e.target.value }))}
                />
              )}
            </Field>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Field label="First name">
                {(props) => (
                  <input
                    {...props}
                    value={newStaff.firstName}
                    onChange={(e) => setNewStaff((d) => ({ ...d, firstName: e.target.value }))}
                  />
                )}
              </Field>
              <Field label="Last name">
                {(props) => (
                  <input
                    {...props}
                    value={newStaff.lastName}
                    onChange={(e) => setNewStaff((d) => ({ ...d, lastName: e.target.value }))}
                  />
                )}
              </Field>
              <Field label="Contact number">
                {(props) => (
                  <input
                    {...props}
                    type="tel"
                    value={newStaff.phone}
                    onChange={(e) => setNewStaff((d) => ({ ...d, phone: e.target.value }))}
                  />
                )}
              </Field>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Field label="Role">
                {(props) => (
                  <select
                    {...props}
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
                )}
              </Field>
              {/*
               * Only the scope the chosen role actually uses is offered.
               * The role decides this, not the person filling in the form —
               * a ward code on a tenant-wide role is recorded and never
               * applied, and a ward role with no code is denied every
               * record by inScope(). Both are refused in staffProvisioning.
               */}
              {(newStaffScope === 'WARD' || newStaffScope === 'VD') && (
                <Field label="Ward code" mono>
                  {(props) => (
                    <input
                      {...props}
                      value={newStaff.wardScope}
                      onChange={(e) => setNewStaff((d) => ({ ...d, wardScope: e.target.value }))}
                    />
                  )}
                </Field>
              )}
              {newStaffScope === 'VD' && (
                <Field label="VD code" mono>
                  {(props) => (
                    <input
                      {...props}
                      value={newStaff.vdScope}
                      onChange={(e) => setNewStaff((d) => ({ ...d, vdScope: e.target.value }))}
                    />
                  )}
                </Field>
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

            <Button
              variant="secondary"
              onClick={handleAdd}
              disabled={newStaffProblems.length > 0 || saveMutation.isPending}
            >
              {saveMutation.isPending ? 'Adding…' : 'Add to the team'}
            </Button>
          </Card>
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
          <Card key={profile.uid} className="space-y-2">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-body-md font-body text-ink font-semibold">
                  {profile.firstName} {profile.lastName}
                </p>
                <DataLine>
                  {roleLabel(profile.roleId)}
                  {profile.wardScope && ` · ${profile.wardScope}`}
                  {profile.vdScope && ` · VD ${profile.vdScope}`}
                </DataLine>
              </div>
              {/*
               * Both controls name the person. "Deactivate" repeated down
               * a staff list, with nothing to say whose account it ends,
               * is the most consequential ambiguity on this page — and
               * the only irreversible action on it.
               */}
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  onClick={() => startEdit(profile)}
                  aria-label={`Edit ${profile.firstName} ${profile.lastName}`}
                >
                  Edit
                </Button>
                <button
                  type="button"
                  onClick={() => deactivateMutation.mutate(profile.uid)}
                  disabled={deactivateMutation.isPending}
                  aria-label={`Deactivate ${profile.firstName} ${profile.lastName}`}
                  className="inline-flex min-h-11 items-center rounded border border-maroon/40 px-3 py-1.5 text-label-caps font-display uppercase text-maroon disabled:opacity-40"
                >
                  Deactivate
                </button>
              </div>
            </div>

            {editingUid === profile.uid && (
              <div className="border-t border-ink/10 pt-3 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <Field label="Role">
                    {(props) => (
                      <select {...props} value={roleId} onChange={(e) => setRoleId(e.target.value)}>
                        {SEED_ROLES.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.label}
                          </option>
                        ))}
                      </select>
                    )}
                  </Field>
                  <Field label="Ward scope" mono>
                    {(props) => (
                      <input {...props} value={wardScope} onChange={(e) => setWardScope(e.target.value)} />
                    )}
                  </Field>
                  <Field label="VD scope" mono>
                    {(props) => (
                      <input {...props} value={vdScope} onChange={(e) => setVdScope(e.target.value)} />
                    )}
                  </Field>
                </div>

                {/*
                 * Two <fieldset>s, because the two columns are 52
                 * checkboxes with the same 26 names in both — "voters.edit"
                 * appears once under granted and once under revoked, and
                 * without the grouping a screen reader gives no way to
                 * tell which column a given checkbox is in. On the screen
                 * that decides who can do what, that is the difference
                 * between granting a capability and taking it away.
                 */}
                <div className="grid grid-cols-2 gap-4">
                  <fieldset>
                    <legend className="text-label-caps font-display uppercase text-slate mb-1">
                      Additional capabilities granted
                    </legend>
                    <div className="max-h-40 overflow-y-auto space-y-1 border border-ink/10 rounded p-2">
                      {ALL_CAPABILITIES.map((cap) => (
                        <label key={cap} className="flex min-h-11 items-center gap-2 text-body-md font-body">
                          <input
                            type="checkbox"
                            className="h-5 w-5"
                            checked={granted.includes(cap)}
                            onChange={() => setGranted((g) => toggle(g, cap))}
                          />
                          {cap}
                        </label>
                      ))}
                    </div>
                  </fieldset>
                  <fieldset>
                    <legend className="text-label-caps font-display uppercase text-slate mb-1">
                      Capabilities revoked
                    </legend>
                    <div className="max-h-40 overflow-y-auto space-y-1 border border-ink/10 rounded p-2">
                      {ALL_CAPABILITIES.map((cap) => (
                        <label key={cap} className="flex min-h-11 items-center gap-2 text-body-md font-body">
                          <input
                            type="checkbox"
                            className="h-5 w-5"
                            checked={revoked.includes(cap)}
                            onChange={() => setRevoked((r) => toggle(r, cap))}
                          />
                          {cap}
                        </label>
                      ))}
                    </div>
                  </fieldset>
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
                    <BasisNote>{CONCENTRATION_BASIS}</BasisNote>
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
                  <p className="text-body-md font-body text-maroon">Save failed — check you hold team.manage.</p>
                )}

                <div className="flex gap-3">
                  <Button
                    variant="secondary"
                    onClick={() => handleSave(profile)}
                    disabled={saveMutation.isPending}
                    aria-label={`Save changes to ${profile.firstName} ${profile.lastName}`}
                  >
                    {saveMutation.isPending ? 'Saving…' : 'Save'}
                  </Button>
                  <Button variant="ghost" onClick={() => setEditingUid(null)}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
