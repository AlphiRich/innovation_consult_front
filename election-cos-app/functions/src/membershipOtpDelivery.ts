/**
 * Election Campaign OS — outbound OTP delivery over WhatsApp
 * IC-ECOS-BUILD-2026-V2 §10.
 *
 * @deployable fails-closed
 *
 * The credential does not exist. There is no Meta Business account, no
 * approved template and no token on this project, so this module cannot
 * do its job — and what it does instead is refuse, loudly and before
 * anything is written. There is no path through it that reports a send
 * that did not happen, which is the only property that matters while the
 * account is pending.
 *
 * Secrets are read **inside** the handler, through `defineSecret`. The
 * reviewed boilerplate called `get_secret()` at import time (§35.6), so a
 * Secret Manager blip was a crash loop rather than an unhealthy
 * container — and its `/health` endpoint could never report it, because
 * the process never got far enough to serve one.
 *
 * `WHATSAPP_TEMPLATE_NAME` is a parameter rather than a secret: a template
 * name is not sensitive and has to be approved in Meta Manager before it
 * can be used, so it belongs in configuration where it can be seen.
 */
import { defineSecret, defineString } from 'firebase-functions/params';
import { logger } from 'firebase-functions/v2';

export const WHATSAPP_API_TOKEN = defineSecret('WHATSAPP_API_TOKEN');
export const WHATSAPP_PHONE_NUMBER_ID = defineSecret('WHATSAPP_PHONE_NUMBER_ID');
export const WHATSAPP_TEMPLATE_NAME = defineString('WHATSAPP_TEMPLATE_NAME', {
  default: 'membership_otp_verify',
});
export const WHATSAPP_GRAPH_VERSION = defineString('WHATSAPP_GRAPH_VERSION', { default: 'v21.0' });

/** No credential configured. Distinct from "the send was attempted and failed". */
export class MissingDeliveryCredential extends Error {
  constructor() {
    super('No WhatsApp delivery credential is configured on this project.');
    this.name = 'MissingDeliveryCredential';
  }
}

/**
 * How long we will wait on Meta.
 *
 * The boilerplate called `requests.post` with no timeout at all, on a
 * service running `--workers 1 --threads 8` — eight slow calls and it is
 * an outage. A callable has its own ceiling, but a hung upstream still
 * holds an instance and the caller's screen.
 */
export const DELIVERY_TIMEOUT_MS = 10_000;

export interface DeliveryResult {
  delivered: boolean;
  /** Meta's message id, for correlating with a delivery receipt later. */
  providerMessageId?: string;
}

export async function deliverOtp(params: {
  toE164: string;
  code: string;
  memberName: string;
}): Promise<DeliveryResult> {
  const token = WHATSAPP_API_TOKEN.value();
  const phoneNumberId = WHATSAPP_PHONE_NUMBER_ID.value();
  if (!token || !phoneNumberId) throw new MissingDeliveryCredential();

  const url = `https://graph.facebook.com/${WHATSAPP_GRAPH_VERSION.value()}/${phoneNumberId}/messages`;
  const body = {
    messaging_product: 'whatsapp',
    to: params.toE164,
    type: 'template',
    template: {
      name: WHATSAPP_TEMPLATE_NAME.value(),
      language: { code: 'en_ZA' },
      components: [
        {
          type: 'body',
          parameters: [
            { type: 'text', text: params.memberName },
            { type: 'text', text: params.code },
          ],
        },
      ],
    },
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(DELIVERY_TIMEOUT_MS),
  });

  if (!response.ok) {
    // Status and request id only. The response body can echo the
    // recipient's number, and a log line is a copy of a phone number
    // that outlives the send — see §6.2.1.
    logger.error('WhatsApp delivery failed', {
      status: response.status,
      requestId: response.headers.get('x-fb-request-id') ?? null,
    });
    return { delivered: false };
  }

  const payload = (await response.json()) as { messages?: Array<{ id?: string }> };
  return { delivered: true, providerMessageId: payload.messages?.[0]?.id };
}
