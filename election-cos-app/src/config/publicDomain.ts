/**
 * Election Campaign OS — the application's public origin
 * IC-ECOS-BUILD-2026-V2 §2.1.
 *
 * ONE PLACE. Everything that needs to name the application's address
 * reads it from here: the guard test, the deploy preflight, and the
 * corporate landing page's launch card (which is plain HTML at the
 * repository root, so the test checks the two agree rather than importing
 * across that boundary).
 *
 * WHY A CONSTANT RATHER THAN A STRING IN EACH PLACE
 *
 * A domain is the one value in this build that is simultaneously public,
 * printed on material, and expensive to change. It had already drifted
 * before it was registered: `docs/phase-0-infra-plan.md` planned
 * `app.electioncampaignos.co.za` with `www.` and `api.` siblings, and the
 * registered domain is not that. A superseded domain that still appears
 * in a config somewhere is how a campaign ends up with a dead link on a
 * nomination form.
 *
 * SUPERSEDED, DELIBERATELY RECORDED
 *
 * `electioncampaignos.co.za` and its `app.` / `www.` / `api.` subdomains
 * were the phase-0 plan and were never registered. `SUPERSEDED_DOMAINS`
 * exists so the guard test can fail if one of them comes back as a live
 * target — the same tripwire pattern the delimitation uses against
 * vintage wording.
 */

/**
 * The domain the application is served from.
 *
 * CHANGED 28 Oct 2026, by decision: `app.electioncos.co.za`, to isolate
 * the static landing page on the apex from the PWA dashboard on the
 * subdomain. `electioscos.co.za` — the previous value — joins
 * `SUPERSEDED_DOMAINS` below rather than being deleted, because a name
 * that has been in config is a name that can come back.
 *
 * Note what this does NOT settle. `HOSTING_ORIGIN` and `.firebaserc`
 * still name `election2026-campaignms7-0`, and a second project,
 * `electioncos1-0`, is under consideration. A custom domain attaches to
 * whichever project serves it, so this constant is independent of that
 * question and is changed now; the project is not, until its Firestore
 * location is known. See docs/asset-control-sheet.md §27.
 */
export const APP_DOMAIN = 'app.electioncos.co.za';

/** The application's canonical origin. No trailing slash. */
export const APP_ORIGIN = `https://${APP_DOMAIN}` as const;

/**
 * Firebase Hosting's own address for the project, which keeps working
 * after a custom domain is attached.
 *
 * It is the launch card's fallback, not a second home: the card prefers
 * `APP_ORIGIN` and only falls back here, so the link goes live the moment
 * *either* answers. Without that, a successful deploy would still show
 * "Launching soon" on the public page for however long DNS takes to
 * propagate — which is a worse outcome than the one the probe exists to
 * prevent.
 */
export const HOSTING_ORIGIN = 'https://election2026-campaignms7-0.web.app' as const;

/**
 * Names that must never be a live target again. If one turns up as one,
 * the guard test fails.
 *
 * The first four were the phase-0 plan and were never registered.
 * `electioscos.co.za` is different: it was `APP_DOMAIN` until 28 Oct 2026
 * and is listed here for exactly that reason — a superseded name that
 * once worked is more dangerous than one that never did, because it is
 * the one somebody remembers.
 */
export const SUPERSEDED_DOMAINS = [
  'electioncampaignos.co.za',
  'app.electioncampaignos.co.za',
  'www.electioncampaignos.co.za',
  'api.electioncampaignos.co.za',
  'electioscos.co.za',
] as const;

/**
 * The corporate domain, which is a different thing and stays where it is.
 * Innovation Consult publishes from `innovationconsult.co.za`; the
 * product is served from `APP_DOMAIN`. Same separation as the two colour
 * palettes — see docs/innovation-consult-brand.md.
 */
export const CORPORATE_DOMAIN = 'innovationconsult.co.za';
