"use client";
// Container for /desk (Dev A): owns state and API calls; components only render props.
import { useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { TradeInput } from "@/components/trade/TradeInput";
import { TradeReview } from "@/components/trade/TradeReview";
import type { SampleTranscript } from "@/components/trade/types";
import { ApiClientError, extractCall, recheckTrade } from "@/lib/api-client";
import { applyEdit, EditError } from "@/lib/trades/edit";
import type { ExtractResponse, Trade, TradeField, UiError } from "@/lib/types";
import { canProceed } from "@/lib/validation/checks";

function toUiError(error: unknown): UiError {
  if (error instanceof ApiClientError) return error.error;
  if (error instanceof EditError) return { code: "bad_request", message: error.message };
  return { code: "internal", message: "Something went wrong. Try again." };
}

export function DeskClient({ samples }: { samples: SampleTranscript[] }) {
  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState<UiError | null>(null);
  const [result, setResult] = useState<Omit<ExtractResponse, "trades"> | null>(null);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [tradeErrors, setTradeErrors] = useState<Record<string, UiError | null>>({});
  const [notice, setNotice] = useState<string | null>(null);

  async function handleExtract(transcript: string) {
    setExtracting(true);
    setExtractError(null);
    setNotice(null);
    setTrades([]);
    setResult(null);
    try {
      const { trades, ...meta } = await extractCall(transcript);
      setTrades(trades);
      setResult(meta);
    } catch (error) {
      setExtractError(toUiError(error));
    } finally {
      setExtracting(false);
    }
  }

  async function handleEdit(trade: Trade, field: TradeField, value: string) {
    setSavingId(trade.id);
    setTradeErrors((e) => ({ ...e, [trade.id]: null }));
    try {
      const extracted = applyEdit(trade.extracted, field, value);
      const checked = await recheckTrade(extracted);
      setTrades((ts) =>
        ts.map((t) =>
          t.id === trade.id
            ? { ...t, extracted, checks: checked.checks, status: checked.status, nominated_callback: checked.nominated_callback }
            : t,
        ),
      );
    } catch (error) {
      setTradeErrors((e) => ({ ...e, [trade.id]: toUiError(error) }));
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <TradeInput samples={samples} pending={extracting} error={extractError} onSubmit={handleExtract} />

      {result && (
        <p className="text-xs text-muted-foreground">
          Read by <code>{result.model}</code> · checked against the {result.register_source === "database" ? "fund register database" : "built-in demo register"} ·{" "}
          {trades.length} trade{trades.length === 1 ? "" : "s"} found
        </p>
      )}

      {notice && (
        <Alert>
          <AlertTitle>Coming next</AlertTitle>
          <AlertDescription>{notice}</AlertDescription>
        </Alert>
      )}

      {trades.map((trade) => (
        <TradeReview
          key={trade.id}
          trade={trade}
          pending={savingId === trade.id}
          error={tradeErrors[trade.id] ?? null}
          onEditField={(field, value) => handleEdit(trade, field, value)}
          canProceed={canProceed(trade.checks)}
          onProceedToCallback={() =>
            setNotice(
              `Callback to ${trade.nominated_callback?.name ?? "the nominated contact"}: recording the callback and comparing it field by field is the next release.`,
            )
          }
        />
      ))}
    </div>
  );
}
