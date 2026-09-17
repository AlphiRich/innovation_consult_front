/**
 * Election Campaign OS — what this campaign's subscription includes
 * IC-ECOS-BUILD-2026-V2 §4.4-adjacent. Readable by every tenant member;
 * `firestore.rules` allows the read to anyone in the tenant and the write
 * to nobody.
 *
 * WHY THIS EXISTS
 *
 * A subscriber had no way to see what they had bought. The entitlement
 * records existed, the port existed, the adapter existed, the security
 * rules let every tenant member read them — and no screen did. "What does
 * our subscription include?" was answerable only by asking whoever signed
 * the agreement.
 *
 * NO PRICES, AND NOT BECAUSE THEY ARE MISSING
 *
 * `TenantEntitlement` carries none by design. The platform is sold to
 * competing parties in the same municipality on published, flat,
 * identical terms, and a price stored against a tenant is the appearance
 * of differential terms whatever the number says. This page shows what was
 * bought and until when, which is what a subscriber needs from their own
 * records; what it cost belongs on their invoice.
 *
 * WHAT IS OFF IS LISTED, NOT HIDDEN
 *
 * A page that showed only active modules would leave a campaign unable to
 * tell "we did not buy that" from "that does not exist". Both halves are
 * shown, and a module that is built but unsold reads differently from one
 * that is sold but unbuilt — because the remedies differ and so do the
 * conversations.
 */
import { useSession } from '@/auth/useSession';
import { useEntitlements } from '@/auth/useEntitlements';
import { isModuleActive, subscribedWards } from '@/auth/entitlements';
import { MODULES, type ModuleDefinition } from '@/auth/modules';
import type { TenantEntitlement } from '@/dal/ports/entitlements';
import { SUBSCRIPTION_PRICE_BASIS, UNBUILT_MODULE_BASIS } from './subscriptionView';

/** Modules with no surfaces in this build. See `modules.ts`. */
function isBuilt(module: ModuleDefinition): boolean {
  return module.gatedCapabilities.length > 0 || module.key === 'core';
}

function windowText(entitlement: TenantEntitlement): string {
  const from = new Date(entitlement.activeFrom).toLocaleDateString('en-ZA');
  if (!entitlement.activeUntil) return `From ${from}, open-ended`;
  return `${from} to ${new Date(entitlement.activeUntil).toLocaleDateString('en-ZA')}`;
}

export function SubscriptionPage() {
  const session = useSession();
  const { entitlements, isLoading, isError } = useEntitlements();

  if (!session) {
    return (
      <div className="rounded-lg border border-slate/30 bg-white p-6 max-w-lg">
        <p className="text-label-caps font-display uppercase text-slate">/settings/subscription</p>
        <h1 className="text-headline-md font-display text-ink mt-1">Subscription</h1>
        <p className="mt-3 text-body-md font-body text-slate">
          No active session — see BUILD-STATUS.md (no live Firebase project provisioned yet).
        </p>
      </div>
    );
  }

  const now = new Date();
  const records = entitlements ?? [];

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <p className="text-label-caps font-display uppercase text-slate">/settings/subscription</p>
        <h1 className="text-headline-md font-display text-ink mt-1">What your subscription includes</h1>
        <p className="text-body-md font-body text-slate mt-2">{SUBSCRIPTION_PRICE_BASIS}</p>
      </div>

      {isLoading && <p className="text-body-md font-body text-slate">Loading…</p>}

      {isError && (
        <p className="text-body-md font-body text-maroon border-l-4 border-maroon bg-white p-3">
          The subscription record could not be read. Nothing has been switched off — where this cannot be
          checked the platform falls back to your permissions alone, so what you can reach right now may be
          wider than what was bought. Try again before relying on this page.
        </p>
      )}

      {entitlements && records.length === 0 && (
        <p className="text-body-md font-body text-maroon border-l-4 border-maroon bg-white p-3">
          No subscription is on record for this campaign, so the paid modules are off. The core platform — the
          voter roll, wards, canvassing, incidents, logistics and the war room — is unaffected and always
          included.
        </p>
      )}

      <div className="space-y-3">
        {MODULES.map((module) => {
          const active = isModuleActive(records, module.key, { now });
          const wards = module.scope === 'WARD' ? subscribedWards(records, module.key, now) : [];
          const relevant = records.filter((e) => e.module === module.key);
          const wardActive = module.scope === 'WARD' && wards.length > 0;
          const on = module.bundled || active || wardActive;

          return (
            <div key={module.key} className="bg-white border border-ink/10 rounded-lg p-4 space-y-1">
              <div className="flex items-start justify-between gap-3">
                <p className="text-body-md font-body text-ink font-semibold">{module.label}</p>
                <span
                  className={`px-2 py-1 rounded text-label-caps font-display uppercase whitespace-nowrap ${
                    on ? 'bg-green/10 text-green' : 'bg-slate/10 text-slate'
                  }`}
                >
                  {module.bundled ? 'Included' : on ? 'Subscribed' : 'Not subscribed'}
                </span>
              </div>

              <p className="text-body-md font-body text-slate">{module.description}</p>

              {module.scope === 'WARD' && (
                <p className="text-data-mono font-mono text-slate">
                  Bought ward by ward · {wards.length > 0 ? wards.join(', ') : 'no wards subscribed'}
                </p>
              )}

              {relevant.map((entitlement) => (
                <p key={entitlement.id} className="text-data-mono font-mono text-slate">
                  {entitlement.wardCode ? `${entitlement.wardCode} · ` : ''}
                  {windowText(entitlement)}
                  {entitlement.sourceReference ? ` · ${entitlement.sourceReference}` : ''}
                </p>
              ))}

              {!isBuilt(module) && (
                <p className="text-body-md font-body text-maroon">
                  No screens for this module exist in this build yet. The entitlement is real; the feature is
                  not here.
                </p>
              )}
            </div>
          );
        })}
      </div>

      <p className="text-body-md font-body text-slate border-t border-ink/10 pt-4">{UNBUILT_MODULE_BASIS}</p>
      <p className="text-body-md font-body text-slate">
        A subscription cannot be changed from inside the platform. Entitlements are written by Innovation
        Consult against an agreement — no administrator, including you, can grant a campaign a module it has
        not bought.
      </p>
    </div>
  );
}
