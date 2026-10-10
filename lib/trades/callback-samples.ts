// Example callback transcripts generated from a trade, so the callback step can be demoed for any trade.
import type { SampleTranscript } from "@/components/trade/types";
import type { Trade } from "@/lib/types";

function amount(quantity: number, type: string | null, currency: string | null): string {
  if (type === "cash" && currency) {
    return new Intl.NumberFormat("en-IE", { style: "currency", currency, maximumFractionDigits: 0 }).format(quantity);
  }
  return `${new Intl.NumberFormat("en-IE").format(quantity)} units`;
}

function script(trade: Trade, quantity: number): string {
  const t = trade.extracted;
  const contact = trade.nominated_callback?.name ?? "the account holder";
  const verb = t.direction === "redeem" ? "Redeem" : "Subscribe";
  const currency = t.quantity_type === "cash" ? "" : t.currency ? `, ${t.currency} share class` : "";
  const fund = t.fund_name ? `, the ${t.fund_name}` : "";
  return [
    `Agent: Hi, it's the dealing desk calling back to confirm an instruction on account ${t.account_no}.`,
    `Caller: Go ahead.`,
    `Agent: Can you confirm the trade for me?`,
    `Caller: Yes, ${contact} speaking. ${verb} ${amount(quantity, t.quantity_type, t.currency)} of ${t.isin}${fund}${currency}, for ${t.account_name ?? `account ${t.account_no}`}.`,
  ].join("\n");
}

/** A confirming callback and one with a "fat-finger" quantity (off by a factor of ten). */
export function makeCallbackSamples(trade: Trade): SampleTranscript[] {
  const q = trade.extracted.quantity;
  if (q === null || !trade.extracted.isin || !trade.extracted.account_no) return [];
  const wrong = q >= 10 ? q / 10 : q * 10;
  return [
    { id: "cb-confirm", label: "Callback confirms", transcript: script(trade, q) },
    { id: "cb-wrong-qty", label: `Callback says ${amount(wrong, trade.extracted.quantity_type, trade.extracted.currency)}`, transcript: script(trade, wrong) },
  ];
}
