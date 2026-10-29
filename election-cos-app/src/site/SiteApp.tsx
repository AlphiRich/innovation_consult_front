/**
 * Election Campaign OS — public site router
 *
 * Seven routes now: the five the canvas names (`/`, `/casework-tracker`,
 * `/compliance`, `/packages`, `/contact`) plus the explainer index and
 * its articles.
 *
 * Separate from `src/app/routes.tsx` on purpose. That router sits behind
 * the auth gate and its nav is fixed at nine items (§3.2); this one is
 * public. They share tokens and conventions, not chrome.
 *
 * ADVERTISING CONSENT LIVES HERE
 *
 * One piece of state for the whole site, read once on mount. It is held
 * at the router rather than inside the slot because three things need
 * it and they are on different pages: the slot on an explainer, the
 * banner that asks, and the withdrawal control in the footer that must
 * be reachable from everywhere including the pages that never show an
 * advert.
 *
 * The banner decides for itself whether to appear; see
 * `ads/ConsentBanner.tsx`. It is rendered unconditionally here and
 * returns null off the eligible pages, so the router does not carry a
 * second copy of the policy that could drift from the first.
 */
import { Route, Routes, useLocation } from 'react-router-dom';
import { useCallback, useEffect, useState } from 'react';
import { SiteShell } from './SiteChrome';
import { SiteHome } from './pages/SiteHome';
import { SiteCasework } from './pages/SiteCasework';
import { SiteCompliance } from './pages/SiteCompliance';
import { SitePackages } from './pages/SitePackages';
import { SiteContact } from './pages/SiteContact';
import { SiteExplainer, SiteExplainers } from './pages/SiteExplainers';
import { ConsentBanner } from './ads/ConsentBanner';
import {
  clearAdConsent,
  hasAdConsent,
  readAdConsent,
  writeAdConsent,
  type AdConsentState,
} from './ads/adConsent';

/** Per-page enquiry subject, so a WhatsApp message arrives with context. */
const SUBJECTS: Record<string, string> = {
  '/': 'Election Campaign OS enquiry',
  '/casework-tracker': 'Casework Tracker enquiry',
  '/compliance': 'Compliance enquiry',
  '/packages': 'Packages enquiry',
  '/contact': 'Election Campaign OS enquiry',
  '/explainers': 'Election Campaign OS enquiry',
};

/**
 * A client-side route change does not move focus or the scroll
 * position, so without this a visitor who follows a link from the
 * footer lands at the bottom of the next page. An in-page `#hash` is
 * left alone: that link means "go to this part of the page".
 */
function ScrollToTop() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (hash) {
      document.getElementById(hash.slice(1))?.scrollIntoView();
      return;
    }
    window.scrollTo(0, 0);
  }, [pathname, hash]);
  return null;
}

export function SiteApp() {
  const { pathname } = useLocation();

  /*
   * Read once, lazily. `readAdConsent` touches localStorage, which can
   * throw rather than return empty in a private window — it handles
   * that itself and returns `unasked`, which is the safe side.
   */
  const [consent, setConsent] = useState<AdConsentState>(() => readAdConsent());

  const choose = useCallback((choice: 'granted' | 'refused') => {
    writeAdConsent(choice);
    setConsent(choice);
  }, []);

  const withdraw = useCallback(() => {
    clearAdConsent();
    setConsent('unasked');
  }, []);

  const consented = hasAdConsent(consent);

  return (
    <SiteShell enquirySubject={SUBJECTS[pathname] ?? SUBJECTS['/']} onWithdrawAdConsent={withdraw}>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<SiteHome />} />
        <Route path="/casework-tracker" element={<SiteCasework />} />
        <Route path="/compliance" element={<SiteCompliance />} />
        <Route path="/packages" element={<SitePackages />} />
        <Route path="/contact" element={<SiteContact />} />
        <Route path="/explainers" element={<SiteExplainers />} />
        <Route
          path="/explainers/:slug"
          element={<SiteExplainer hasConsent={consented} />}
        />
        <Route path="*" element={<SiteHome />} />
      </Routes>

      {consent === 'unasked' && <ConsentBanner pathname={pathname} onChoice={choose} />}
    </SiteShell>
  );
}
