/**
 * Election Campaign OS — public site, Explainers
 *
 * The index (`/explainers`) and one article (`/explainers/:slug`).
 *
 * These are the only pages on this site where an advert may appear, so
 * the layout puts the slot in one place and one place only: after the
 * article body, above the sources. Not between sections, not in the
 * middle of a paragraph run, and never above the standfirst — a reader
 * who arrived from a search should reach the answer before they reach
 * anything paid for.
 *
 * The sources block sits below the advert deliberately. It is the last
 * thing on the page because it is what somebody checking the article
 * goes looking for, and it should not be the thing an advert separates
 * them from the article by.
 */
import { Link, useParams } from 'react-router-dom';
import {
  EXPLAINERS,
  EXPLAINERS_INTRO,
  EXPLAINER_DISCLAIMER,
  explainerBySlug,
} from '../explainers';
import { Eyebrow, SiteCard, SiteSection } from '../SiteChrome';
import { AdSlot } from '../ads/AdSlot';

export function SiteExplainers() {
  return (
    <>
      <SiteSection className="flex flex-col gap-4 pb-10 pt-[88px]">
        <Eyebrow>Explainers</Eyebrow>
        <h1 className="m-0 font-site-display text-site-h3 md:text-site-h1">
          How the rules actually work
        </h1>
        <p className="m-0 max-w-[36em] text-site-lead">{EXPLAINERS_INTRO}</p>
      </SiteSection>

      <SiteSection labelledBy="ex-h" className="pb-[88px]">
        <h2 id="ex-h" className="sr-only">
          Explainer articles
        </h2>
        <ul className="m-0 grid list-none grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-5 p-0">
          {EXPLAINERS.map((e) => (
            <li key={e.slug} className="flex">
              <SiteCard className="flex w-full flex-col gap-3 p-8">
                <Eyebrow>{e.question}</Eyebrow>
                <h3 className="m-0 font-site-display text-site-h4">
                  <Link to={e.path}>{e.title}</Link>
                </h3>
                <p className="m-0 text-site-base">{e.standfirst}</p>
                <p className="mb-0 mt-auto pt-3 text-site-caption text-slate">
                  Updated {e.updated}
                </p>
              </SiteCard>
            </li>
          ))}
        </ul>
      </SiteSection>
    </>
  );
}

export function SiteExplainer({ hasConsent }: { hasConsent: boolean }) {
  const { slug } = useParams();
  const explainer = slug ? explainerBySlug(slug) : undefined;

  if (!explainer) {
    return (
      <SiteSection className="flex flex-col gap-4 py-[88px]">
        <h1 className="m-0 font-site-display text-site-h3">We don&rsquo;t have that explainer</h1>
        <p className="m-0 text-site-lead">
          <Link to="/explainers">See the ones we do have.</Link>
        </p>
      </SiteSection>
    );
  }

  return (
    <SiteSection className="flex max-w-[760px] flex-col gap-6 py-[88px]">
      <Eyebrow>Explainer</Eyebrow>
      <h1 className="m-0 font-site-display text-site-h3 md:text-site-h2">{explainer.title}</h1>
      <p className="m-0 text-site-lead">{explainer.standfirst}</p>

      <article className="flex flex-col gap-8">
        {explainer.sections.map((section) => (
          <section key={section.heading} className="flex flex-col gap-3">
            <h2 className="m-0 font-site-display text-site-h4">{section.heading}</h2>
            {section.paragraphs.map((p) => (
              <p key={p.slice(0, 40)} className="m-0 text-site-base">
                {p}
              </p>
            ))}
          </section>
        ))}
      </article>

      {/* The one slot. See this file's header for why it is here. */}
      <AdSlot pathname={explainer.path} hasConsent={hasConsent} slotId={explainer.slug} />

      <SiteCard className="flex flex-col gap-2 p-6">
        <h2 className="m-0 font-site-display text-site-h6">Sources</h2>
        <ul className="m-0 flex list-none flex-col gap-1 p-0 text-site-sm">
          {explainer.sources.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
        <p className="m-0 pt-2 text-site-caption text-slate">{EXPLAINER_DISCLAIMER}</p>
        <p className="m-0 text-site-caption text-slate">Updated {explainer.updated}</p>
      </SiteCard>

      <p className="m-0">
        <Link to="/explainers">← All explainers</Link>
      </p>
    </SiteSection>
  );
}
