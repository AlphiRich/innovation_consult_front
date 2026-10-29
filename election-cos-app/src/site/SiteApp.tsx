/**
 * Election Campaign OS — public site router
 *
 * Five routes, the paths the canvas names in its artboard titles:
 * `/`, `/casework-tracker`, `/compliance`, `/packages`, `/contact`.
 *
 * Separate from `src/app/routes.tsx` on purpose. That router sits behind
 * the auth gate and its nav is fixed at nine items (§3.2); this one is
 * public and has six. They share tokens and conventions, not chrome.
 */
import { Route, Routes, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { SiteShell } from './SiteChrome';
import { SiteHome } from './pages/SiteHome';
import { SiteCasework } from './pages/SiteCasework';
import { SiteCompliance } from './pages/SiteCompliance';
import { SitePackages } from './pages/SitePackages';
import { SiteContact } from './pages/SiteContact';

/** Per-page enquiry subject, so a WhatsApp message arrives with context. */
const SUBJECTS: Record<string, string> = {
  '/': 'Election Campaign OS enquiry',
  '/casework-tracker': 'Casework Tracker enquiry',
  '/compliance': 'Compliance enquiry',
  '/packages': 'Packages enquiry',
  '/contact': 'Election Campaign OS enquiry',
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
  return (
    <SiteShell enquirySubject={SUBJECTS[pathname] ?? SUBJECTS['/']}>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<SiteHome />} />
        <Route path="/casework-tracker" element={<SiteCasework />} />
        <Route path="/compliance" element={<SiteCompliance />} />
        <Route path="/packages" element={<SitePackages />} />
        <Route path="/contact" element={<SiteContact />} />
        <Route path="*" element={<SiteHome />} />
      </Routes>
    </SiteShell>
  );
}
