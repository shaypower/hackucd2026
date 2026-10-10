import { describe, expect, it } from "vitest";
import { cleanExtraction, locateQuote } from "@/lib/ai/postprocess";
import type { ExtractedTrade } from "@/lib/types";

const transcript = "Caller: Hi, Mark Doyle here.\nCaller: Subscribe 5,000   units of ie00b4l5y983 please.";

const base: ExtractedTrade = {
  direction: "subscribe", isin: " ie00 b4l5y983 ", fund_name: "", account_no: null, account_name: null,
  caller_name: "Mark Doyle", currency: "usd", quantity: 5000, quantity_type: "units",
  evidence: [
    { field: "caller_name", quote: "Mark Doyle" },
    { field: "quantity", quote: "5,000 units" }, // whitespace differs from the transcript
    { field: "isin", quote: "IE00B4L5Y983" }, // case differs
    { field: "direction", quote: "Please buy" }, // not in the transcript: invented
    { field: "account_no", quote: "Mark Doyle" }, // field is null
    { field: "caller_name", quote: "Mark Doyle" }, // duplicate
  ],
};

describe("locateQuote", () => {
  it("returns the transcript's own text for case/whitespace variants", () => {
    expect(locateQuote(transcript, "5,000 units")).toBe("5,000   units");
    expect(locateQuote(transcript, "IE00B4L5Y983")).toBe("ie00b4l5y983");
  });

  it("returns null for quotes that aren't there", () => {
    expect(locateQuote(transcript, "Please buy")).toBeNull();
    expect(locateQuote(transcript, "   ")).toBeNull();
  });
});

describe("cleanExtraction", () => {
  const { extraction, droppedEvidence } = cleanExtraction({ trades: [base], unreadable_reason: "" }, transcript);
  const trade = extraction.trades[0];

  it("normalises values", () => {
    expect(trade.isin).toBe("IE00B4L5Y983");
    expect(trade.currency).toBe("USD");
    expect(trade.fund_name).toBeNull();
    expect(extraction.unreadable_reason).toBeNull();
  });

  it("keeps only real, non-duplicate evidence for non-null fields", () => {
    expect(trade.evidence.map((e) => e.field)).toEqual(["caller_name", "quantity", "isin"]);
    expect(droppedEvidence).toBe(3);
    for (const e of trade.evidence) expect(transcript).toContain(e.quote);
  });

  it("drops all-null phantom trades", () => {
    const empty: ExtractedTrade = {
      direction: null, isin: null, fund_name: null, account_no: null, account_name: null,
      caller_name: null, currency: null, quantity: null, quantity_type: null, evidence: [],
    };
    expect(cleanExtraction({ trades: [base, empty], unreadable_reason: null }, transcript).extraction.trades).toHaveLength(1);
  });
});
