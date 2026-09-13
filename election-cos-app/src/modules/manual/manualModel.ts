/**
 * Election Campaign OS — the operations manual
 * IC-ECOS-BUILD-2026-V2 §3, §4.4.
 *
 * WHAT THIS IS
 *
 * The manual a subscriber is handed: onboarding, then a standard
 * operating procedure per area, role and application function. It is the
 * operational source of truth for how this product is meant to be used —
 * and therefore the document the commercial and legal agreements have to
 * stay consistent with, rather than the other way around.
 *
 * WHAT IT IS NOT
 *
 * It is not a legal instrument, and nothing in this module drafts one.
 * The Terms of Use, Subscriber Tenancy Agreement, Privacy Policy, Licence
 * Agreement, and the disclaimers, indemnities and limitation statements
 * are attorney work. What this gives them is a stable set of *factual*
 * operational claims to be drafted against — see
 * `docs/manual-and-legal-instruments.md` for which SOP grounds which
 * instrument. An SOP that says the platform does something the code does
 * not do would propagate straight into a contract, so every claim here is
 * held to the same discipline as the rest of this build.
 *
 * ROLE AND ENTITLEMENT FILTERED, WHICH IS THE POINT
 *
 * A canvasser does not need the PPFA disclosure procedure and should not
 * be handed it. A tenant that never bought Incident Pro should not receive
 * a procedure for a feature it cannot use, and printing one is how a
 * support call starts. `assembleManual()` takes the reader's role and the
 * tenant's entitlements and returns only what applies — the same two
 * gates that govern the application itself (`src/auth/entitlements.ts`).
 */
import type { Capability } from '@/auth/types';
import type { ModuleKey } from '@/auth/modules';
import { isModuleActive } from '@/auth/entitlements';
import type { TenantEntitlement } from '@/dal/ports/entitlements';
import { SEED_ROLES } from '@/auth/seedRoles';

export type SopArea = 'ONBOARDING' | 'FIELD' | 'WAR_ROOM' | 'COMPLIANCE' | 'FUNDING' | 'ADMINISTRATION';

export const AREA_LABEL: Record<SopArea, string> = {
  ONBOARDING: 'Getting started',
  FIELD: 'Field operations',
  WAR_ROOM: 'War room',
  COMPLIANCE: 'Compliance & data protection',
  FUNDING: 'Funding & disclosure',
  ADMINISTRATION: 'Administration',
};

export interface SopSection {
  heading: string;
  /** Paragraphs. Plain prose — the renderer wraps them. */
  body?: string[];
  /** A numbered procedure. */
  steps?: string[];
  /** Called out in the margin. Safety, legal exposure, irreversible acts. */
  warnings?: string[];
}

export interface Sop {
  /** 'SOP-01'. Stable — people cite these in conversation. */
  number: string;
  title: string;
  area: SopArea;
  /** Role ids from seedRoles.ts. Empty means every role. */
  roles: string[];
  /** Only included when the tenant has this module. */
  requiresModule?: ModuleKey;
  /** Only included for a reader holding at least one of these. */
  requiresAnyCapability?: Capability[];
  purpose: string;
  sections: SopSection[];
}

export interface ManualAudience {
  roleId: string;
  caps: Capability[];
  entitlements: TenantEntitlement[];
  wardCode?: string;
  now?: Date;
}

export interface Manual {
  /** The role this copy was assembled for, in its own label. */
  roleLabel: string;
  sops: Sop[];
  /** SOPs withheld, and why — printed at the end so nothing is silently missing. */
  withheld: { number: string; title: string; reason: string }[];
}

function roleLabel(roleId: string): string {
  return SEED_ROLES.find((r) => r.id === roleId)?.label ?? roleId;
}

/**
 * Assemble one reader's copy.
 *
 * Withheld SOPs are listed rather than dropped. A manual that silently
 * omits SOP-07 leaves the reader thinking their copy is corrupt or that
 * they missed something; one that says "SOP-07 covers PPFA disclosure and
 * is not part of your subscription" is answering the question before it
 * is asked.
 */
export function assembleManual(sops: Sop[], audience: ManualAudience): Manual {
  const now = audience.now ?? new Date();
  const included: Sop[] = [];
  const withheld: Manual['withheld'] = [];

  for (const sop of sops) {
    if (sop.roles.length > 0 && !sop.roles.includes(audience.roleId)) {
      continue; // Not withheld — simply another role's procedure.
    }
    if (sop.requiresAnyCapability && !sop.requiresAnyCapability.some((c) => audience.caps.includes(c))) {
      withheld.push({
        number: sop.number,
        title: sop.title,
        reason: 'Your role does not include the permissions this procedure requires.',
      });
      continue;
    }
    if (
      sop.requiresModule &&
      !isModuleActive(audience.entitlements, sop.requiresModule, { wardCode: audience.wardCode, now })
    ) {
      withheld.push({
        number: sop.number,
        title: sop.title,
        reason: 'This procedure covers a module that is not part of your subscription.',
      });
      continue;
    }
    included.push(sop);
  }

  return {
    roleLabel: roleLabel(audience.roleId),
    sops: included.sort((a, b) => a.number.localeCompare(b.number)),
    withheld,
  };
}

/** Areas present in an assembled manual, in reading order. */
export const AREA_ORDER: SopArea[] = [
  'ONBOARDING',
  'FIELD',
  'WAR_ROOM',
  'COMPLIANCE',
  'FUNDING',
  'ADMINISTRATION',
];

export function groupByArea(manual: Manual): { area: SopArea; sops: Sop[] }[] {
  return AREA_ORDER.map((area) => ({ area, sops: manual.sops.filter((s) => s.area === area) })).filter(
    (g) => g.sops.length > 0,
  );
}
