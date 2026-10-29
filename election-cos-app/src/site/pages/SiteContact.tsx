/**
 * Election Campaign OS — public site, Contact (`/contact`)
 *
 * From the canvas artboard `Contact.dc.html`, 1280×1900, fluid.
 *
 * THE FORM DOES NOT SUBMIT ANYWHERE YET, AND SAYS SO
 *
 * There is no enquiry endpoint on this project. Rather than wire the
 * form to nothing and show a thank-you — which is the
 * `CanvassingIntake` mistake from §37.10, a person told their work was
 * saved when it was discarded — the submit handler shows the state the
 * canvas draws and labels it plainly as a preview. The WhatsApp link
 * beside it is live and is the route that actually reaches somebody.
 *
 * WHAT THE FORM REFUSES TO COLLECT
 *
 * The message field carries the canvas's own warning: no party, no
 * political views, no voter's details. Political opinion is special
 * personal information under POPIA section 26, and a marketing enquiry
 * form is the last place that should be gathered. The warning is tied
 * to the field with `aria-describedby`, so it is announced rather than
 * merely printed next to it.
 *
 * Consent is a real checkbox, required, with its wording version
 * recorded — the same discipline `Voter.popiaConsentMethod` applies in
 * the application, for the same reason: the burden of showing consent
 * was given sits with the responsible party.
 */
import { useState } from 'react';
import {
  CONSENT_VERSION,
  CONTACT_INTERESTS,
  CONTACT_ROLES,
  MESSAGE_WARNING,
  SITE,
  whatsAppHref,
} from '../siteContent';
import { Eyebrow, SiteCard, SiteSection, WhatsAppIcon } from '../SiteChrome';

function Field({
  id,
  label,
  required,
  children,
  hint,
}: {
  id: string;
  label: string;
  required?: boolean;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-site-sm font-semibold">
        {label}{' '}
        <span className="font-normal text-slate">({required ? 'required' : 'optional'})</span>
      </label>
      {children}
      {hint && <span className="text-site-micro text-slate">{hint}</span>}
    </div>
  );
}

export function SiteContact() {
  const [sent, setSent] = useState(false);

  return (
    <>
      <SiteSection className="flex flex-col gap-4 pb-10 pt-[88px]">
        <Eyebrow>Contact</Eyebrow>
        <h1 className="m-0 font-site-display text-site-h3 md:text-site-h1">Talk to us</h1>
        <p className="m-0 max-w-[36em] text-site-lead">
          Tell us your role and your wards. We reply within one working day.
        </p>
      </SiteSection>

      <SiteSection className="grid grid-cols-[repeat(auto-fit,minmax(320px,1fr))] items-start gap-10 pb-[88px]">
        {/* ------------------------------------------------- the form */}
        <SiteCard className="p-8">
          {sent ? (
            <div className="flex flex-col gap-4">
              <h2 className="m-0 font-site-display text-site-h4">
                Thank you. We have your enquiry.
              </h2>
              <p className="m-0">
                This is the confirmation the design specifies. Nothing has been sent: there is no
                enquiry endpoint on this deployment yet, and a form that said otherwise would be
                telling you something untrue.
              </p>
              <p className="m-0">
                To reach somebody now, use WhatsApp or email{' '}
                <a href={`mailto:${SITE.mailboxes[0]}`}>{SITE.mailboxes[0]}</a>.
              </p>
              <button
                type="button"
                onClick={() => setSent(false)}
                className="site-btn-outline-ink self-start"
              >
                Back to the form
              </button>
            </div>
          ) : (
            <form
              className="flex flex-col gap-5"
              onSubmit={(e) => {
                e.preventDefault();
                setSent(true);
              }}
            >
              <h2 className="m-0 font-site-display text-site-h4">Your enquiry</h2>

              <Field id="f-name" label="Name" required>
                <input id="f-name" name="name" type="text" required className="site-field" />
              </Field>

              <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-5">
                <Field id="f-mobile" label="Mobile">
                  <input id="f-mobile" name="mobile" type="tel" className="site-field" />
                </Field>
                <Field id="f-email" label="Email">
                  <input id="f-email" name="email" type="email" className="site-field" />
                </Field>
              </div>
              <p className="m-0 text-site-caption text-slate">
                Give us at least one way to reach you: mobile or email.
              </p>

              <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-5">
                <Field id="f-role" label="Your role" required>
                  <select id="f-role" name="role" required defaultValue="" className="site-field">
                    <option value="">Choose one</option>
                    {CONTACT_ROLES.map((r) => (
                      <option key={r}>{r}</option>
                    ))}
                  </select>
                </Field>
                <Field id="f-interest" label="Interested in" required>
                  <select
                    id="f-interest"
                    name="interest"
                    required
                    defaultValue={CONTACT_INTERESTS[0]}
                    className="site-field"
                  >
                    {CONTACT_INTERESTS.map((i) => (
                      <option key={i}>{i}</option>
                    ))}
                  </select>
                </Field>
              </div>

              <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-5">
                <Field id="f-muni" label="Municipality">
                  <input id="f-muni" name="municipality" type="text" className="site-field" />
                </Field>
                <Field id="f-ward" label="Ward number">
                  <input
                    id="f-ward"
                    name="ward"
                    type="text"
                    inputMode="numeric"
                    className="site-field"
                  />
                </Field>
              </div>
              <p className="m-0 text-site-caption text-slate">
                Needed for the Casework Tracker and ward packages.
              </p>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="f-msg" className="text-site-sm font-semibold">
                  Message <span className="font-normal text-slate">(optional)</span>
                </label>
                <p
                  id="f-msg-warn"
                  className="m-0 flex items-start gap-2 text-site-sm text-ink"
                >
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
                    <path d="M12 8v5" />
                    <path d="M12 16h.01" />
                  </svg>
                  <span>{MESSAGE_WARNING}</span>
                </p>
                <textarea
                  id="f-msg"
                  name="message"
                  rows={5}
                  maxLength={1000}
                  aria-describedby="f-msg-warn"
                  className="site-field"
                />
                <span className="text-site-micro text-slate">Up to 1,000 characters</span>
              </div>

              <fieldset className="m-0 rounded-md border border-line p-4">
                <legend className="px-1.5 text-site-sm font-semibold">Consent</legend>
                <div className="flex flex-col gap-3">
                  <label className="flex cursor-pointer items-start gap-3 text-site-sm">
                    <input type="checkbox" name="consent" required className="mt-1" />
                    <span>
                      Innovation Consult may contact me about this enquiry.{' '}
                      <span className="text-slate">
                        (Required. Wording version {CONSENT_VERSION}.)
                      </span>
                    </span>
                  </label>
                  <label className="flex cursor-pointer items-start gap-3 text-site-sm">
                    <input type="checkbox" name="marketing" className="mt-1" />
                    <span>
                      Send me occasional product updates.{' '}
                      <span className="text-slate">(Optional.)</span>
                    </span>
                  </label>
                </div>
              </fieldset>

              <div className="flex flex-wrap items-center justify-between gap-4">
                <span className="text-site-micro text-slate">
                  Protected by an invisible Cloudflare Turnstile check.
                </span>
                <button type="submit" className="site-btn-primary">
                  Send enquiry
                </button>
              </div>
            </form>
          )}
        </SiteCard>

        {/* ------------------------------------------------ other ways */}
        <div className="flex flex-col gap-5">
          <article className="flex flex-col gap-3 rounded-[10px] bg-ink p-8 text-paper">
            <h2 className="m-0 font-site-display text-site-h4">Faster: message us</h2>
            <p className="m-0 text-line">
              WhatsApp reaches a person directly during working hours.
            </p>
            <a href={whatsAppHref('Election Campaign OS enquiry')} className="site-btn-primary mt-auto self-start">
              <WhatsAppIcon />
              Talk to us on WhatsApp
            </a>
          </article>

          <SiteCard className="flex flex-col gap-2 p-8">
            <h2 className="m-0 font-site-display text-site-h5">By email</h2>
            {SITE.mailboxes.map((box) =>
              box.startsWith('[') ? (
                <span key={box} className="text-site-sm text-slate">
                  {box}
                </span>
              ) : (
                <a key={box} href={`mailto:${box}`} className="text-site-base">
                  {box}
                </a>
              ),
            )}
          </SiteCard>

          <SiteCard className="flex flex-col gap-2 p-8">
            <h2 className="m-0 font-site-display text-site-h5">Already a customer?</h2>
            <p className="m-0 text-site-base">
              Sign in to the application at{' '}
              <a href={SITE.appOrigin}>app.electioncos.co.za</a>.
            </p>
          </SiteCard>
        </div>
      </SiteSection>
    </>
  );
}
