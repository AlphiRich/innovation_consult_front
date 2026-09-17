/**
 * Election Campaign OS — what the subscription page says about itself
 *
 * Two sentences shared by the screen and SOP-12, held here so they are
 * written once. Same reason `candidateCapture.ts` and
 * `dataSubjectErasure.ts` own theirs: a claim about the commercial model,
 * repeated in two places, becomes two claims.
 */

/**
 * Why there is no price anywhere on that page.
 *
 * `TenantEntitlement` carries none by design — see `modules.ts`. The
 * platform is sold to competing parties in the same municipality on
 * published, flat, identical terms, and a price held against one
 * campaign's record is the appearance of differential terms whatever the
 * number says.
 */
export const SUBSCRIPTION_PRICE_BASIS =
  'This page shows what your campaign has bought and until when. It carries no prices: the platform is sold ' +
  'to competing parties on published, flat, identical terms, and a price held against one campaign’s record ' +
  'would look like differential terms whatever the number said. What it cost is on your invoice.';

/**
 * Modules can be sold before their surfaces exist — `modules.ts` is
 * explicit that declaring the entitlement first is the right order. What
 * is not acceptable is letting a subscriber find that out by clicking.
 */
export const UNBUILT_MODULE_BASIS =
  'Some modules can be subscribed to before their screens exist here. Where that is the case it is said ' +
  'plainly below rather than left for you to discover — an entitlement you are paying for and cannot yet use ' +
  'is something you are entitled to be told about.';
