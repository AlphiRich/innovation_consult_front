/**
 * Election Campaign OS — public site entry (electioncos.co.za)
 *
 * Deliberately separate from `src/main.tsx`. `scripts/build-sw.mjs`
 * walks everything under `dist/` and precaches it, so a second entry in
 * the same output would put the whole marketing site into the field
 * application's offline bundle — on a canvasser's metered data. This
 * builds to `dist-site/` instead, and the two deploy to different
 * targets, which is what §28 settled: the apex is served from Cloudflare
 * and is deliberately a different thing from `app.electioncos.co.za`.
 *
 * No Firebase, no auth, no Dexie. A visitor arriving from a search
 * result downloads a marketing page, not an application.
 */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { SiteApp } from './SiteApp';
import './site.css';

const root = document.getElementById('root');
if (!root) throw new Error('site.html is missing its #root element.');

createRoot(root).render(
  <StrictMode>
    <BrowserRouter>
      <SiteApp />
    </BrowserRouter>
  </StrictMode>,
);
