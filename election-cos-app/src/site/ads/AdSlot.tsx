/**
 * Election Campaign OS — an advertising slot, which usually renders nothing
 *
 * The component is deliberately boring: it asks `adDecision`, and when
 * the answer is no it returns `null` without having touched the network.
 * All of the policy lives in `adPolicy.ts` where it can be tested
 * without a browser.
 *
 * NO SCRIPT IS LOADED UNTIL THE ANSWER IS YES
 *
 * The ad network's script tag is injected by this effect, not written
 * into `site.html`. That ordering is the consent gate: a tag in the HTML
 * head would contact the network on page load, before the visitor has
 * seen the banner, and a consent banner that appears after the tracking
 * request has already gone out is theatre.
 *
 * WHAT A READER SEES
 *
 * An advert is labelled as one. The slot carries a visible "Advertisement"
 * label and `aria-label`, because a paid placement inside an explainer
 * about election law must not be mistakable for part of the explainer.
 * That is a straightforward reader-honesty point and it costs nothing.
 */
import { useEffect, useRef } from 'react';
import { AD_CLIENT_ID, adDecision } from './adPolicy';

const AD_SCRIPT_SRC = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js';
const SCRIPT_ID = 'ecos-ad-script';

/** Injected once per page view, only after a positive decision. */
function ensureAdScript(clientId: string): void {
  if (document.getElementById(SCRIPT_ID)) return;

  const script = document.createElement('script');
  script.id = SCRIPT_ID;
  script.async = true;
  script.crossOrigin = 'anonymous';
  script.src = `${AD_SCRIPT_SRC}?client=${encodeURIComponent(clientId)}`;
  document.head.appendChild(script);
}

export function AdSlot({
  pathname,
  hasConsent,
  slotId,
}: {
  pathname: string;
  hasConsent: boolean;
  slotId: string;
}) {
  const { allowed } = adDecision({ pathname, hasConsent });
  const pushed = useRef(false);

  useEffect(() => {
    if (!allowed) return;

    // `adDecision` already refused a null client id, so reaching here
    // means one is configured. Re-checked rather than asserted: this is
    // the line that decides whether a third party is contacted.
    if (!AD_CLIENT_ID) return;

    ensureAdScript(AD_CLIENT_ID);

    if (pushed.current) return;
    pushed.current = true;

    try {
      const w = window as unknown as {
        adsbygoogle?: unknown[] & { requestNonPersonalizedAds?: number };
      };
      w.adsbygoogle = w.adsbygoogle || [];
      /*
       * Non-personalised, always. See `adPolicy.ts`: contextual
       * advertising against an article is ordinary; profiling somebody
       * who reads about election law, on an elections vendor's site, is
       * not something to do to a reader whatever the banner said.
       */
      w.adsbygoogle.requestNonPersonalizedAds = 1;
      w.adsbygoogle.push({});
    } catch {
      /*
       * A blocked or failed ad script must never take the page with it.
       * The explainer is the thing the reader came for.
       */
    }
  }, [allowed]);

  if (!allowed) return null;

  return (
    <aside
      aria-label="Advertisement"
      className="my-10 flex flex-col gap-2 border-t border-line pt-4"
    >
      <span className="font-mono text-site-micro uppercase tracking-[0.08em] text-slate">
        Advertisement
      </span>
      <ins
        className="adsbygoogle block"
        style={{ display: 'block' }}
        data-ad-slot={slotId}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </aside>
  );
}
