/**
 * Election Campaign OS — public site, Compliance (`/compliance`)
 *
 * From the canvas artboard `Compliance.dc.html`, 1280×3000, fluid.
 *
 * THE PAGE THE REST OF THE SITE ANSWERS TO
 *
 * Every other page makes a claim; this one bounds them. The canvas's
 * own note says the rows are drafted from the white paper and must be
 * matched word-for-word to IC-ECOS-LEG-03 with each test reference
 * filled in, so they are published exactly as drafted — references
 * still bracketed — and the caption names the date they were drawn
 * from. A bracketed reference on a live page is a visible debt; an
 * invented one would be a false citation on a compliance statement.
 *
 * R200,000 and R30,000,000 are the current gazetted figures and match
 * `ppfaDefaults.ts`. `siteContent.test.ts` holds this page to them,
 * because the superseded R100,000 regime has now reached this project
 * twice in prose while the seed values were right — the ecos-v2 fork
 * (§4d) and the App Code Build Stack (§37.3).
 */
import { Link } from 'react-router-dom';
import {
  CLAIMS_CAPTION,
  CLAIM_ROWS,
  EXAMPLE_DONOR,
  FUNDING_POINTS,
  FUNDING_SOURCE,
  INFORMATION_OFFICER,
  POPIA_POINTS,
} from '../siteContent';
import { Eyebrow, SiteCard, SiteSection } from '../SiteChrome';

/** The "will not claim" marker: a crossed circle, not a colour. */
function NotClaimIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
      className="mt-1 flex-none stroke-ink"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M6 18 18 6" />
    </svg>
  );
}

export function SiteCompliance() {
  return (
    <>
      <SiteSection className="flex flex-col gap-5 pb-14 pt-[88px]">
        <Eyebrow>Capability and Limitations Statement · IC-ECOS-LEG-03</Eyebrow>
        <h1 className="m-0 max-w-[14em] font-site-display text-site-h3 md:text-site-display">
          What we do, and what we will not claim.
        </h1>
        <p className="m-0 max-w-[36em] text-site-lead">
          For treasurers and compliance officers. Every row below points to the test that proves it.
        </p>
      </SiteSection>

      {/* ------------------------------------------------ claims table */}
      <SiteSection labelledBy="claims-h" className="pb-20">
        <h2 id="claims-h" className="mb-5 mt-0 font-site-display text-site-h4">
          Does, and will not claim
        </h2>
        <div className="overflow-x-auto rounded-[10px] border border-line bg-white">
          <table className="w-full min-w-[760px] border-collapse text-site-base">
            <caption className="border-b border-line px-5 py-4 text-left text-site-caption text-slate">
              {CLAIMS_CAPTION}
            </caption>
            <thead>
              <tr className="bg-paper text-left">
                <th scope="col" className="w-[44%] px-5 py-3.5">
                  What it does
                </th>
                <th scope="col" className="w-[36%] px-5 py-3.5">
                  What we will not claim
                </th>
                <th scope="col" className="px-5 py-3.5">
                  Test reference
                </th>
              </tr>
            </thead>
            <tbody>
              {CLAIM_ROWS.map((r) => (
                <tr key={r.ref} className="border-t border-line align-top">
                  <td className="px-5 py-4">{r.does}</td>
                  <td className="px-5 py-4">
                    <span className="inline-flex gap-2">
                      <NotClaimIcon />
                      <span>{r.not}</span>
                    </span>
                  </td>
                  <td className="px-5 py-4 font-mono text-site-caption text-teal">{r.ref}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SiteSection>

      {/* ------------------------------------------------ party funding */}
      <section aria-labelledby="ppfa-h" className="border-y border-line bg-white">
        <div className="mx-auto grid max-w-[1200px] grid-cols-[repeat(auto-fit,minmax(320px,1fr))] gap-12 px-6 py-20">
          <div className="flex flex-col gap-4">
            <h2 id="ppfa-h" className="m-0 font-site-display text-site-h3">
              Party funding, tracked nightly
            </h2>
            <ul className="m-0 flex list-disc flex-col gap-2 pl-5">
              {FUNDING_POINTS.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
            <p className="m-0 text-site-caption text-slate">{FUNDING_SOURCE}</p>
          </div>

          <figure className="m-0 flex flex-col gap-[18px] rounded-[10px] border border-line bg-paper p-7">
            <div className="flex flex-wrap justify-between gap-2">
              <span className="font-semibold">{EXAMPLE_DONOR.reference}</span>
              <span className="text-site-micro text-slate">{EXAMPLE_DONOR.disclaimer}</span>
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex justify-between font-mono text-site-caption">
                <span>{EXAMPLE_DONOR.amount}</span>
                <span>{EXAMPLE_DONOR.line}</span>
              </div>
              <div
                role="img"
                aria-label={`${EXAMPLE_DONOR.amount} of the ${EXAMPLE_DONOR.line}, ${EXAMPLE_DONOR.percent} percent`}
                className="h-3.5 overflow-hidden rounded-full bg-line"
              >
                <div className="h-full bg-ink" style={{ width: `${EXAMPLE_DONOR.percent}%` }} />
              </div>
            </div>
            <p className="m-0 flex items-start gap-2.5 rounded-md border border-gold bg-white px-3.5 py-3 text-site-sm">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
                className="mt-0.5 flex-none stroke-ink"
              >
                <path d="M12 3 2 20h20z" className="fill-gold" />
                <path d="M12 10v4" />
                <path d="M12 17h.01" />
              </svg>
              <span>
                <strong>Alert:</strong> {EXAMPLE_DONOR.alert}
              </span>
            </p>
            <figcaption className="text-site-micro text-slate">{EXAMPLE_DONOR.caption}</figcaption>
          </figure>
        </div>
      </section>

      {/* ------------------------------------------------ add-on, POPIA */}
      <SiteSection className="grid grid-cols-[repeat(auto-fit,minmax(320px,1fr))] gap-5 py-20">
        <article
          aria-labelledby="addon-h"
          className="flex flex-col gap-3.5 rounded-[10px] bg-ink p-8 text-paper"
        >
          <Eyebrow tone="gold">Add-on</Eyebrow>
          <h2 id="addon-h" className="m-0 font-site-display text-site-h4">
            PPFA Governance and Disclosure Add-on
          </h2>
          <p className="m-0 text-line">
            Priced after a scoping consultation with our engineering team.
          </p>
          <Link to="/contact" className="site-btn-primary mt-auto self-start">
            Book a consultation
          </Link>
        </article>

        <SiteCard className="flex flex-col gap-3.5 p-8">
          <h2 id="popia-h" className="m-0 font-site-display text-site-h4">
            POPIA
          </h2>
          <ul className="m-0 flex list-disc flex-col gap-1.5 pl-5">
            {POPIA_POINTS.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
          <p className="m-0 text-site-sm">
            Information Officer: {INFORMATION_OFFICER} ·{' '}
            <a href="mailto:legal@innovationconsult.co.za">legal@innovationconsult.co.za</a>
          </p>
        </SiteCard>
      </SiteSection>

      {/* ------------------------------------------------------ request */}
      <SiteSection labelledBy="dl-h" className="pb-[88px]">
        <div className="flex flex-wrap items-center justify-between gap-6 rounded-xl border-[1.5px] border-ink bg-white px-10 py-9">
          <div className="flex items-center gap-[18px]">
            <svg
              width="40"
              height="40"
              viewBox="0 0 24 24"
              fill="none"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              className="flex-none stroke-ink"
            >
              <path d="M14 3H6v18h12V7z" />
              <path d="M14 3v4h4" />
              <path d="M12 11v6" />
              <path d="m9 14 3 3 3-3" />
            </svg>
            <div>
              <h2 id="dl-h" className="m-0 font-site-display text-site-h5">
                Capability and Limitations Statement
              </h2>
              <p className="mb-0 mt-0.5 text-site-sm text-slate">
                PDF · the link we send you works for 24 hours
              </p>
            </div>
          </div>
          <Link to="/contact" className="site-btn-primary">
            Request the statement
          </Link>
        </div>
      </SiteSection>
    </>
  );
}
