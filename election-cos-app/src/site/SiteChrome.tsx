/**
 * Election Campaign OS — public site chrome and primitives
 *
 * The header, footer and the handful of shapes every page on
 * electioncos.co.za repeats, implemented from the design canvas.
 *
 * WHY THESE ARE NOT `components/ui`
 *
 * The application's primitives are app chrome: `PageHeader` takes a
 * route slug and renders a breadcrumb, `StatTile` is sized for a war
 * room, `Pill` is a status word. They are right for a screen somebody
 * signs in to and wrong for a page somebody arrives at from a search
 * result. What is shared is what should be shared — the tokens, the
 * type scale, the accessibility rules and the no-hex discipline — and
 * `SiteCard` deliberately matches `Card`'s shape so the two systems
 * read as one family rather than two products.
 *
 * TWO TOKENS THIS NEEDED THAT THE APPLICATION DID NOT
 *
 *  - `line` (#DCD6C8), the warm border. The app uses `border-ink/10`,
 *    which is right on a dense screen and goes cold and grey at the
 *    scale a marketing page uses it.
 *  - `font-site-display` (Archivo, not Archivo Narrow). The app
 *    compresses headings because columns are scarce; a 56px narrow
 *    heading on a landing page reads as a poster.
 *
 * Both are in `src/design/tokens.ts` with their reasoning, and
 * `tokens.test.ts` holds them to `tailwind.config.js`.
 *
 * ACCESSIBILITY, AS DRAWN
 *
 * Every control here is the real element — `<a href>`, `<button>`,
 * `<input>` with a `<label>` — per rule 13. Icon-only buttons carry an
 * `aria-label`, decorative SVG is `aria-hidden`, and status is carried
 * by the word as well as the colour, which is the canvas's own rule.
 */
import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { SITE, SITE_NAV, whatsAppHref } from './siteContent';

/* ------------------------------------------------------------- mark */

/** The product mark: a ballot hexagon with a check. Decorative. */
export function SiteMark({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 36 36" aria-hidden="true" className="flex-none">
      <rect width="36" height="36" rx="8" className="fill-paper" />
      <polygon
        points="18,5 29,11.5 29,24.5 18,31 7,24.5 7,11.5"
        fill="none"
        className="stroke-ink"
        strokeWidth="2.2"
      />
      <path
        d="M12.5 18.5 L16.5 22.5 L24 14"
        fill="none"
        className="stroke-gold"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* ----------------------------------------------------------- header */

export function SiteHeader({ enquirySubject }: { enquirySubject: string }) {
  const { pathname, hash } = useLocation();
  const here = `${pathname}${hash}`;

  return (
    <header className="bg-ink text-paper">
      <div className="mx-auto flex max-w-[1200px] flex-wrap items-center gap-x-8 gap-y-4 px-6 py-4">
        <Link to="/" className="flex items-center gap-3 text-paper no-underline">
          <SiteMark />
          <span className="flex flex-col leading-tight">
            <span className="font-site-display text-site-h6">{SITE.productName}</span>
            <span className="text-site-nano text-line">{SITE.byline}</span>
          </span>
        </Link>

        <nav aria-label="Primary" className="flex-[1_1_520px]">
          <ul className="m-0 flex list-none flex-wrap gap-x-[22px] gap-y-1 p-0 text-site-sm font-semibold">
            {SITE_NAV.map((item) => {
              const current = item.href === here || (item.href !== '/' && pathname === item.href);
              return (
                <li key={item.label}>
                  <Link
                    to={item.href}
                    aria-current={current ? 'page' : undefined}
                    className={
                      current
                        ? 'text-gold underline underline-offset-[6px]'
                        : 'text-paper no-underline hover:underline hover:underline-offset-[6px]'
                    }
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="flex items-center gap-[18px]">
          <a href={SITE.appOrigin} className="text-site-sm font-semibold text-paper">
            Sign in
          </a>
          <a href={whatsAppHref(enquirySubject)} className="site-btn-primary text-site-sm">
            Talk to us
          </a>
        </div>
      </div>
    </header>
  );
}

/* ----------------------------------------------------------- footer */

export function SiteFooter() {
  return (
    <footer className="bg-ink text-line text-site-sm">
      <div className="mx-auto grid max-w-[1200px] grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-8 px-6 pb-8 pt-14">
        <div className="flex flex-col gap-2">
          <span className="font-site-display text-site-h6 text-paper">
            {SITE.productName} {SITE.byline}
          </span>
          <span>{SITE.entity}</span>
          <span>{SITE.registration}</span>
          <span>{SITE.address}</span>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="font-semibold text-paper">Contact</span>
          {SITE.mailboxes.map((box) =>
            box.startsWith('[') ? (
              <span key={box}>{box}</span>
            ) : (
              <a key={box} href={`mailto:${box}`} className="text-line">
                {box}
              </a>
            ),
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="font-semibold text-paper">Legal</span>
          <Link to="/#pledge" className="text-line">
            Privacy notice
          </Link>
          <Link to="/#pledge" className="text-line">
            Terms
          </Link>
          <Link to="/#pledge" className="text-line">
            Cookie notice
          </Link>
          <Link to="/#pledge" className="text-line">
            Neutrality pledge
          </Link>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="font-semibold text-paper">Company</span>
          <a href={SITE.corporateUrl} className="text-line">
            innovationconsult.co.za
          </a>
          <a href={SITE.appOrigin} className="text-line">
            Sign in
          </a>
        </div>
      </div>
      <div className="mx-auto max-w-[1200px] border-t border-teal px-6 pb-8 pt-4 text-site-micro">
        {SITE.bbbee}
      </div>
    </footer>
  );
}

/* --------------------------------------------------------- the page */

export function SiteShell({
  children,
  enquirySubject,
}: {
  children: ReactNode;
  enquirySubject: string;
}) {
  return (
    <div className="min-h-screen bg-paper font-body text-site-body text-ink">
      <SiteHeader enquirySubject={enquirySubject} />
      <main>{children}</main>
      <SiteFooter />
    </div>
  );
}

/** The 1200px measure every section sits inside. */
export function SiteSection({
  children,
  className = '',
  id,
  labelledBy,
  label,
}: {
  children: ReactNode;
  className?: string;
  id?: string;
  labelledBy?: string;
  label?: string;
}) {
  return (
    <section id={id} aria-labelledby={labelledBy} aria-label={label} className={className}>
      <div className="mx-auto max-w-[1200px] px-6">{children}</div>
    </section>
  );
}

/* ------------------------------------------------------- primitives */

/**
 * A white card on paper.
 *
 * Deliberately the same radius and border weight as the application's
 * `Card`, so somebody who sees both does not read them as two products.
 */
export function SiteCard({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-[10px] border border-line bg-white ${className}`}>{children}</div>
  );
}

/** A small uppercase mono label above a heading. */
export function Eyebrow({ children, tone = 'slate' }: { children: ReactNode; tone?: 'slate' | 'gold' }) {
  return (
    <p
      className={`m-0 font-mono text-site-micro uppercase tracking-[0.08em] ${
        tone === 'gold' ? 'text-gold' : 'text-slate'
      }`}
    >
      {children}
    </p>
  );
}

/**
 * Built / roadmap.
 *
 * The word carries the status and the marker only repeats it, which is
 * the canvas's rule and rule 13's: colour alone tells a screen-reader
 * user nothing, and the two markers also differ in shape (filled disc
 * against a ring on a dashed border) for anyone who cannot separate the
 * hues.
 */
export function StatusBadge({ status }: { status: 'built' | 'roadmap' }) {
  const built = status === 'built';
  return (
    <span
      className={`inline-flex items-center gap-1.5 self-start rounded-full px-2.5 py-0.5 text-site-micro font-semibold text-ink ${
        built ? 'border border-green' : 'border border-dashed border-maroon'
      }`}
    >
      <span
        aria-hidden="true"
        className={`h-2 w-2 rounded-full ${built ? 'bg-green' : 'border-2 border-maroon'}`}
      />
      {built ? 'Built' : 'Roadmap'}
    </span>
  );
}

/** The dark band that closes most pages. */
export function CtaBand({
  heading,
  note,
  children,
  headingId,
}: {
  heading: string;
  note?: string;
  children: ReactNode;
  headingId: string;
}) {
  return (
    <SiteSection labelledBy={headingId} className="py-[72px]">
      <div className="flex flex-wrap items-center justify-between gap-6 rounded-xl bg-ink p-10 text-paper">
        <div>
          <h2 id={headingId} className="m-0 font-site-display text-site-h3">
            {heading}
          </h2>
          {note && <p className="mb-0 mt-1.5 text-site-base text-line">{note}</p>}
        </div>
        <div className="flex flex-wrap gap-3">{children}</div>
      </div>
    </SiteSection>
  );
}

/** The WhatsApp glyph used on every primary call to action. */
export function WhatsAppIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="flex-none"
    >
      <path d="M21 12a8.5 8.5 0 0 1-12.6 7.4L3 21l1.6-5.2A8.5 8.5 0 1 1 21 12z" />
    </svg>
  );
}
