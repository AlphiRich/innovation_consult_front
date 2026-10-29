/**
 * Election Campaign OS — the advertising consent banner
 *
 * Shown only when the visitor has not yet answered, and only on a page
 * where an advert could actually appear. A consent request on a page
 * that will never show an advert is a dark pattern in the other
 * direction: it collects a permission the site has no present use for.
 *
 * BOTH BUTTONS ARE REAL BUTTONS, AND THEY LOOK ALIKE
 *
 * "No" is not a greyed-out link beside a gold "Yes". A refusal is a
 * complete, first-class answer that is recorded and honoured, and
 * styling it as the lesser option is how consent stops being freely
 * given. Both are `<button>` elements at the same weight, which is also
 * what rule 13 requires of anything that acts rather than navigates.
 *
 * The first draft gave the refusal `site-btn-outline`, which is not a
 * class this stylesheet defines — so it rendered as bare text beside a
 * filled gold button, which is precisely the dark pattern the paragraph
 * above says it is not. A comment asserting a property the code did not
 * have. Found by looking at the rendered page; the class on a dark
 * banner is `site-btn-outline-paper`, and `siteCss.test.ts` now fails on
 * any `site-btn-*` class the stylesheet does not define.
 *
 * It says what it is for in one sentence, before asking.
 */
import { adDecision } from './adPolicy';

export function ConsentBanner({
  pathname,
  onChoice,
}: {
  pathname: string;
  onChoice: (choice: 'granted' | 'refused') => void;
}) {
  /*
   * Ask only where a yes would mean something. `adDecision` with
   * `hasConsent: true` answers exactly that question — "if this visitor
   * said yes, would an advert be allowed here?" — so the banner cannot
   * drift out of step with the policy it is collecting consent for.
   */
  const wouldAllow = adDecision({ pathname, hasConsent: true, clientId: 'probe' }).allowed;
  if (!wouldAllow) return null;

  return (
    <div
      role="region"
      aria-label="Advertising consent"
      className="sticky bottom-0 z-40 border-t border-line bg-ink text-paper"
    >
      <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-4 px-6 py-4">
        <p className="m-0 max-w-[60ch] text-site-sm">
          We show adverts on our explainer pages to help pay for them. Political and election
          advertising is blocked. We do not use them to build a profile of you, and nothing you do
          elsewhere on this site is shared.
        </p>
        <div className="flex flex-none gap-3">
          <button type="button" onClick={() => onChoice('refused')} className="site-btn-outline-paper">
            No adverts
          </button>
          <button type="button" onClick={() => onChoice('granted')} className="site-btn-primary">
            Allow adverts
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * The always-available way back.
 *
 * Consent that cannot be withdrawn as easily as it was given is not
 * consent — POPIA s 11(2)(b) puts the withdrawal right in the statute,
 * and the same principle applies to a cookie choice. This renders in
 * the footer on every page, including the ones where no advert ever
 * appears, so somebody who said yes once can find it again without
 * hunting for the explainer where they said it.
 */
export function AdConsentWithdrawLink({ onWithdraw }: { onWithdraw: () => void }) {
  return (
    <button
      type="button"
      onClick={onWithdraw}
      className="self-start bg-transparent p-0 text-left text-site-sm text-line underline"
    >
      Advert preferences
    </button>
  );
}
