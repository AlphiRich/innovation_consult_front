/**
 * Election Campaign OS — public site, Home (`/`)
 *
 * From the canvas artboard `Main.dc.html`, 1280×3300, fluid.
 *
 * The three figures in the proof strip — 34 wards, 108 voting stations,
 * 122,059 registered voters — are this product's own reference build,
 * and `siteContent.test.ts` checks each against
 * `seed-data/jb-marks-nw405-wards-vds.json` rather than trusting the
 * page. The footnote names the gazette they reconcile to.
 */
import { Link } from 'react-router-dom';
import {
  AUDIENCES,
  EXAMPLE_CASE,
  HERO,
  PILLARS,
  PLEDGE,
  REFERENCE_FIGURES,
  REFERENCE_FOOTNOTE,
  SEASON,
  whatsAppHref,
} from '../siteContent';
import { CtaBand, Eyebrow, SiteCard, SiteSection, StatusBadge, WhatsAppIcon } from '../SiteChrome';

const ENQUIRY = 'Election Campaign OS enquiry';
const hero = HERO[SEASON === 'casework' ? 'casework' : 'pre-election'];

function AudienceIcon({ kind }: { kind: 'office' | 'grid' | 'person' }) {
  const common = {
    width: 32,
    height: 32,
    viewBox: '0 0 24 24',
    fill: 'none',
    strokeWidth: 1.6,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
    className: 'stroke-teal',
  };
  if (kind === 'office') {
    return (
      <svg {...common}>
        <path d="M3 10.5 12 4l9 6.5" />
        <path d="M5 9.5V20h14V9.5" />
        <path d="M10 20v-5h4v5" />
      </svg>
    );
  }
  if (kind === 'grid') {
    return (
      <svg {...common}>
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" />
    </svg>
  );
}

export function SiteHome() {
  return (
    <>
      {/* ------------------------------------------------------- hero */}
      <section className="border-t border-teal bg-ink text-paper">
        <div className="mx-auto grid max-w-[1200px] grid-cols-[repeat(auto-fit,minmax(320px,1fr))] items-center gap-14 px-6 pb-[104px] pt-[88px]">
          <div className="flex flex-col gap-6">
            <Eyebrow tone="gold">{hero.eyebrow}</Eyebrow>
            <h1 className="m-0 font-site-display text-site-h3 md:text-site-hero">{hero.line}</h1>
            <p className="m-0 max-w-[34em] text-site-lead text-line">{hero.sub}</p>
            <div className="flex flex-wrap gap-3 pt-2">
              <a href={whatsAppHref(ENQUIRY)} className="site-btn-primary">
                <WhatsAppIcon />
                Talk to us on WhatsApp
              </a>
              <Link to={hero.ctaHref} className="site-btn-outline-paper">
                {hero.cta}
              </Link>
            </div>
          </div>

          {/* The example case, as a card lifted off the ink field. */}
          <figure className="m-0 flex flex-col gap-[18px] rounded-[10px] bg-paper p-7 text-ink shadow-[0_24px_48px_rgba(0,0,0,0.25)]">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <span className="font-mono text-site-caption font-medium">{EXAMPLE_CASE.reference}</span>
              <span className="text-site-micro text-slate">{EXAMPLE_CASE.disclaimer}</span>
            </div>
            <div>
              <p className="m-0 font-site-display text-site-h5">{EXAMPLE_CASE.title}</p>
              <p className="mb-0 mt-1 text-site-sm text-slate">{EXAMPLE_CASE.where}</p>
            </div>
            <ol className="m-0 flex list-none flex-col border-l-2 border-line p-0">
              {EXAMPLE_CASE.timeline.map((step) => (
                <li
                  key={step.label}
                  className={
                    step.current
                      ? '-ml-[3px] flex justify-between gap-3 border-l-4 border-gold bg-white py-2 pl-4 text-site-sm'
                      : 'flex justify-between gap-3 py-2 pl-[18px] text-site-sm'
                  }
                >
                  <span>
                    <strong>{step.label}</strong> {step.detail}
                  </span>
                  <span className="font-mono text-site-micro text-slate">{step.at}</span>
                </li>
              ))}
            </ol>
            <figcaption className="border-t border-line pt-3 font-mono text-site-nano text-slate">
              Referral integrity hash · {EXAMPLE_CASE.hash}
            </figcaption>
          </figure>
        </div>
      </section>

      {/* ------------------------------------------------- who it is for */}
      <SiteSection labelledBy="doors-h" className="pb-10 pt-[88px]">
        <h2 id="doors-h" className="mb-8 mt-0 font-site-display text-site-h3">
          Who it is for
        </h2>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-5">
          {AUDIENCES.map((a) => (
            <Link
              key={a.title}
              to={a.href}
              className="flex flex-col gap-3 rounded-[10px] border border-line bg-white p-7 text-ink no-underline"
            >
              <AudienceIcon kind={a.icon} />
              <span className="font-site-display text-site-h5">{a.title}</span>
              <span className="text-site-base text-slate">{a.blurb}</span>
              <span className="mt-auto pt-2 font-semibold text-teal">{a.linkLabel} →</span>
            </Link>
          ))}
        </div>
      </SiteSection>

      {/* ------------------------------------------------------- proof */}
      <SiteSection labelledBy="proof-h" className="py-10">
        <div className="flex flex-wrap gap-5">
          <SiteCard className="flex min-w-0 flex-[2_1_560px] flex-col gap-5 p-8">
            <h2 id="proof-h" className="m-0 font-site-display text-site-h4">
              Every ward and voter reconciles
            </h2>
            <dl className="m-0 grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-5">
              {REFERENCE_FIGURES.map((f) => (
                <div key={f.label}>
                  <dt className="text-site-caption text-slate">{f.label}</dt>
                  <dd className="m-0 font-mono text-site-h2 font-medium">{f.value}</dd>
                </div>
              ))}
            </dl>
            <p className="m-0 text-site-caption text-slate">{REFERENCE_FOOTNOTE}</p>
          </SiteCard>

          <Link
            to="/compliance"
            className="flex flex-[1_1_280px] flex-col gap-3 rounded-[10px] bg-ink p-8 text-paper no-underline"
          >
            <span className="font-mono text-site-micro uppercase tracking-[0.08em] text-gold">
              IC-ECOS-LEG-03
            </span>
            <span className="font-site-display text-site-h4">What we will not claim</span>
            <span className="text-site-base text-line">
              Read the Capability and Limitations Statement before you buy.
            </span>
            <span className="mt-auto font-semibold text-paper underline">Read the statement →</span>
          </Link>
        </div>
      </SiteSection>

      {/* ----------------------------------------------------- pillars */}
      <SiteSection id="pillars" labelledBy="pillars-h" className="pb-[88px] pt-14">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
          <h2 id="pillars-h" className="m-0 font-site-display text-site-h3">
            Five pillars, each with its proof
          </h2>
        </div>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(210px,1fr))] gap-4">
          {PILLARS.map((p) => (
            <article
              key={p.name}
              className="flex flex-col gap-2.5 rounded-[10px] border border-line bg-white p-6"
            >
              <StatusBadge status={p.status} />
              <h3 className="m-0 font-site-display text-site-h6">{p.name}</h3>
              <p className="m-0 text-site-sm">{p.does}</p>
              <p className="mb-0 mt-auto border-t border-line pt-2.5 text-site-caption text-slate">
                <span className="font-semibold text-ink">Proof:</span> {p.proof}
              </p>
            </article>
          ))}
        </div>
      </SiteSection>

      {/* ------------------------------------------------------ pledge */}
      <section id="pledge" aria-labelledby="pledge-h" className="border-y border-line bg-white">
        <div className="mx-auto grid max-w-[1200px] grid-cols-[repeat(auto-fit,minmax(320px,1fr))] items-start gap-10 px-6 py-[72px]">
          <div>
            <Eyebrow>Neutrality pledge</Eyebrow>
            <h2 id="pledge-h" className="mb-0 mt-3 font-site-display text-site-h2">
              Every party, the same modules, the same terms.
            </h2>
          </div>
          <ul className="m-0 grid list-none grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-x-6 gap-y-3 p-0 text-site-base">
            {PLEDGE.map((item) => (
              <li key={item} className="border-l-[3px] border-ink pl-5">
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <CtaBand
        headingId="cta-h"
        heading={hero.band}
        note="Excluding VAT at the prevailing statutory rate. Pilot price on record."
      >
        <a href={whatsAppHref('Casework Tracker enquiry')} className="site-btn-primary">
          Talk to us
        </a>
      </CtaBand>
    </>
  );
}
