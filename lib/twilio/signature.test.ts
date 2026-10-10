import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { isValidTwilioSignature, twilioSignature } from "@/lib/twilio/signature";

const token = "12345";
const url = "https://example.com/api/twilio/recording?from=%2B15551234567";
const params = { RecordingSid: "RE123", CallSid: "CA123", RecordingUrl: "https://api.twilio.com/x", RecordingStatus: "completed" };

describe("Twilio signature", () => {
  it("matches an independent HMAC-SHA1 over url + sorted params", () => {
    const data = url + "CallSidCA123RecordingSidRE123RecordingStatuscompletedRecordingUrlhttps://api.twilio.com/x";
    expect(twilioSignature(token, url, params)).toBe(createHmac("sha1", token).update(data).digest("base64"));
  });

  it("accepts a valid signature", () => {
    expect(isValidTwilioSignature(token, url, params, twilioSignature(token, url, params))).toBe(true);
  });

  it("rejects tampered params, a different URL, a wrong token or no signature", () => {
    const sig = twilioSignature(token, url, params);
    expect(isValidTwilioSignature(token, url, { ...params, RecordingUrl: "https://evil.example/x" }, sig)).toBe(false);
    expect(isValidTwilioSignature(token, "https://evil.example/api/twilio/recording", params, sig)).toBe(false);
    expect(isValidTwilioSignature("other", url, params, sig)).toBe(false);
    expect(isValidTwilioSignature(token, url, params, null)).toBe(false);
  });
});
