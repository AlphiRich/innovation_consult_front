/**
 * Election Campaign OS — public site, Councillor Casework Tracker
 * (`/casework-tracker`)
 *
 * From the canvas artboard `Casework.dc.html`, 1280×3300, fluid.
 *
 * The referral facsimile reproduces the one line that matters most on
 * it: *"This is a party document. It carries no state authority."* That
 * is not decoration. `docs/manual-and-legal-instruments.md` and the
 * referral document module carry the same sentence, and a sales page
 * that softened it would be making a claim the product refuses to make.
 */
import { Link } from 'react-router-dom';
import { CASEWORK_FAQ, CASEWORK_FEATURES, CASE_STEPS, EXAMPLE_CASE } from '../siteContent';
import { CtaBand, Eyebrow, SiteCard, SiteSection } from '../SiteChrome';

function FeatureIcon({ kind }: { kind: 'offline' | 'shield' | 'lock' }) {
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
  if (kind === 'offline') {
    return (
      <svg {...common}>
        <path d="M2 8.5a15 15 0 0 1 20 0" />
        <path d="M5.5 12a10 10 0 0 1 13 0" />
        <path d="M9 15.5a5 5 0 0 1 6 0" />
        <path d="M3 3l18 18" />
      </svg>
    );
  }
  if (kind === 'shield') {
    return (
      <svg {...common}>
        <path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <rect x="4" y="10" width="16" height="11" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

export function SiteCasework() {
  return (
    <>
      {/* ------------------------------------------------------- hero */}
      <SiteSection className="grid grid-cols-[repeat(auto-fit,minmax(320px,1fr))] items-end gap-12 pb-[72px] pt-[88px]">
        <div className="flex flex-col gap-5">
          <Eyebrow>Councillor Casework Tracker</Eyebrow>
          <h1 className="m-0 font-site-display text-site-h3 md:text-site-hero">
            Every case, followed through.
          </h1>
          <p className="m-0 max-w-[32em] text-site-lead">
            A resident raises a problem at the door. Your office triages it, you authorise it, and a
            signed referral goes to the municipality, tracked until it is resolved.
          </p>
        </div>

        <SiteCard className="flex flex-col gap-4 p-8">
          <p className="m-0 text-site-caption text-slate">Price on record</p>
          <p className="m-0 font-site-display text-site-h2">
            R2,500{' '}
            <span className="font-body text-site-lead font-normal">per ward a month</span>
          </p>
          <p className="m-0 text-site-caption text-slate">
            Excluding VAT at the prevailing statutory rate.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link to="/contact" className="site-btn-primary">
              Request a tracker call
            </Link>
            <Link to="/contact" className="site-btn-outline-ink">
              Download the brochure
            </Link>
          </div>
        </SiteCard>
      </SiteSection>

      {/* --------------------------------------------------- case flow */}
      <section aria-labelledby="flow-h" className="bg-ink text-paper">
        <div className="mx-auto max-w-[1200px] px-6 py-20">
          <h2 id="flow-h" className="mb-10 mt-0 font-site-display text-site-h3">
            How a case moves
          </h2>
          <ol className="m-0 grid list-none grid-cols-[repeat(auto-fit,minmax(190px,1fr))] gap-4 p-0">
            {CASE_STEPS.map((s) => (
              <li
                key={s.n}
                className="flex flex-col gap-2.5 rounded-[10px] border border-teal bg-teal/20 p-6"
              >
                <span className="font-mono text-site-caption text-gold">{s.n}</span>
                <span className="font-site-display text-site-h6">{s.title}</span>
                <span className="text-site-sm text-line">{s.body}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ---------------------------------------------- signed referral */}
      <SiteSection
        labelledBy="ref-h"
        className="grid grid-cols-[repeat(auto-fit,minmax(320px,1fr))] items-center gap-14 py-[88px]"
      >
        <div className="flex flex-col gap-4">
          <h2 id="ref-h" className="m-0 font-site-display text-site-h3">
            The signed referral
          </h2>
          <p className="m-0">
            Each referral is a PDF the municipality can file and act on. It carries an integrity
            hash, so anyone can check it has not been altered since your office signed it.
          </p>
          <p className="m-0">
            It states on its face that it is a party document with no state authority. It asks; it
            does not instruct.
          </p>
        </div>

        <figure className="m-0 flex flex-col gap-4 rounded border border-line bg-white p-10 text-site-sm shadow-[0_16px_40px_rgba(26,34,70,0.12)]">
          <div className="flex flex-wrap justify-between gap-3 border-b-2 border-ink pb-3">
            <span className="font-site-display text-site-h6">{EXAMPLE_CASE.office}</span>
            <span className="font-mono text-site-micro">{EXAMPLE_CASE.referralReference}</span>
          </div>
          <p className="m-0 border border-line bg-paper px-3 py-2 text-site-micro font-semibold">
            This is a party document. It carries no state authority.
          </p>
          <p className="m-0">To: Electricity Services, Example Local Municipality</p>
          <p className="m-0">
            Re: Streetlights out on four blocks, reported by residents on 6 November 2026. Requested
            action: inspect and restore.
          </p>
          <div className="flex flex-wrap justify-between gap-3 border-t border-line pt-3 font-mono text-site-nano text-slate">
            <span>Signed 07 Nov 2026 08:30</span>
            <span>{EXAMPLE_CASE.hash}</span>
          </div>
          <figcaption className="text-site-micro text-slate">
            Example only. Invented ward, office and municipality.
          </figcaption>
        </figure>
      </SiteSection>

      {/* ---------------------------------------------------- features */}
      <SiteSection
        label="Built for the ward"
        className="grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-5 pb-[88px]"
      >
        {CASEWORK_FEATURES.map((f) => (
          <article
            key={f.title}
            className="flex flex-col gap-2.5 rounded-[10px] border border-line bg-white p-7"
          >
            <FeatureIcon kind={f.icon} />
            <h3 className="m-0 font-site-display text-site-h6">{f.title}</h3>
            <p className="m-0 text-site-base">
              {f.title === 'POPIA by design' ? (
                <>
                  Consent recorded before storage. Numbers masked, as in{' '}
                  <span className="font-mono text-site-sm">07• ••• ••14</span>. Suppression on
                  request.
                </>
              ) : (
                f.body
              )}
            </p>
          </article>
        ))}
      </SiteSection>

      {/* --------------------------------------------------- questions */}
      <section aria-labelledby="faq-h" className="border-t border-line bg-white">
        <div className="mx-auto max-w-[820px] px-6 py-20">
          <h2 id="faq-h" className="mb-6 mt-0 font-site-display text-site-h3">
            Questions
          </h2>
          {CASEWORK_FAQ.map((item, i) => (
            <details
              key={item.q}
              open={i === 0}
              className={`border-t border-line py-[18px] ${
                i === CASEWORK_FAQ.length - 1 ? 'border-b' : ''
              }`}
            >
              <summary className="min-h-[28px] cursor-pointer text-site-h6 font-semibold">
                {item.q}
              </summary>
              <p className="mb-0 mt-2.5">{item.a}</p>
            </details>
          ))}
        </div>
      </section>

      <CtaBand headingId="cta-h" heading="Start with one ward.">
        <Link to="/contact" className="site-btn-primary">
          Request a tracker call
        </Link>
        <Link to="/contact" className="site-btn-outline-paper">
          Download the brochure
        </Link>
      </CtaBand>
    </>
  );
}
