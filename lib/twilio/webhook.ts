// Shared handling for Twilio webhooks: parse the form body, verify the signature, build TwiML.
import "server-only";
import { isValidTwilioSignature } from "@/lib/twilio/signature";

export function twilioConfig(): { accountSid: string; authToken: string } | null {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  return accountSid && authToken ? { accountSid, authToken } : null;
}

/** The public URL Twilio called (behind Vercel's proxy, request.url may not be it). */
export function publicUrl(request: Request): string {
  const url = new URL(request.url);
  const base = process.env.TWILIO_WEBHOOK_BASE_URL;
  if (base) return base.replace(/\/$/, "") + url.pathname + url.search;
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? url.host;
  const proto = request.headers.get("x-forwarded-proto") ?? url.protocol.replace(":", "");
  return `${proto}://${host}${url.pathname}${url.search}`;
}

/** Returns the form params if the request is genuinely from Twilio, otherwise null. */
export async function verifiedTwilioParams(request: Request): Promise<Record<string, string> | null> {
  const config = twilioConfig();
  if (!config) return null;
  const form = await request.formData();
  const params: Record<string, string> = {};
  form.forEach((v, k) => (params[k] = String(v)));
  const ok = isValidTwilioSignature(config.authToken, publicUrl(request), params, request.headers.get("x-twilio-signature"));
  if (!ok) console.warn("Rejected Twilio webhook: bad signature for", publicUrl(request));
  return ok ? params : null;
}

const escapeXml = (s: string) => s.replace(/[<>&'"]/g, (c) => `&#${c.charCodeAt(0)};`);

export function twiml(body: string): Response {
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><Response>${body}</Response>`, {
    headers: { "content-type": "text/xml; charset=utf-8" },
  });
}

export const say = (text: string) => `<Say voice="Polly.Amy" language="en-GB">${escapeXml(text)}</Say>`;
export const attr = escapeXml;
