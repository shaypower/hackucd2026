"use client";
// v1 (Dev A): functional, lightly styled. Dev B owns the look from here; keep the props contract.
import { useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import type { CallbackPanelProps } from "@/components/callback/types";
import type { TradeField } from "@/lib/types";

const LABELS: Record<TradeField, string> = {
  direction: "Direction",
  isin: "ISIN",
  fund_name: "Fund",
  account_no: "Account no.",
  account_name: "Account name",
  caller_name: "Speaker",
  currency: "Currency",
  quantity: "Quantity",
  quantity_type: "Units / cash",
};

function show(v: string | number | null): string {
  if (v === null) return "—";
  return typeof v === "number" ? new Intl.NumberFormat("en-IE").format(v) : v;
}

export function CallbackPanel({
  trade,
  contact,
  callback,
  pending,
  error,
  onSubmitCallback,
  canApprove,
  approveBlockedReason,
  onApprove,
  samples = [],
  approved = false,
  exportUrl,
  onExport,
  onCallNow,
  calling = null,
}: CallbackPanelProps) {
  const [transcript, setTranscript] = useState("");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2">
          Callback
          {callback && (
            <Badge className={callback.all_match ? "bg-emerald-100 text-emerald-900" : "bg-red-100 text-red-900"}>
              {callback.all_match ? "Confirmed" : "Mismatch"}
            </Badge>
          )}
          {approved && <Badge className="bg-emerald-600 text-white">Approved</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {contact ? (
          <p className="text-sm">
            Call the nominated contact <strong>{contact.name}</strong> on <strong>{contact.phone}</strong> (from the register for account {contact.account_no}).
            Never use a number given during the original call.
          </p>
        ) : (
          <Alert variant="destructive">
            <AlertDescription>No nominated callback contact on the register for this account. Escalate before dealing.</AlertDescription>
          </Alert>
        )}

        {!approved && onCallNow && (
          <div className="flex flex-col gap-2 rounded-md border border-sky-300 bg-sky-50 p-3 dark:border-sky-800 dark:bg-sky-950/40">
            <div className="flex flex-wrap items-center gap-3">
              <Button type="button" disabled={pending || calling !== null} onClick={onCallNow}>
                📞 Call {contact?.name ?? "contact"} now
              </Button>
              <span className="text-sm text-muted-foreground">
                TelDeal&apos;s agent asks them to <strong>state</strong> the instruction (it never reads it out), then compares it field by field.
              </span>
            </div>
            {calling && (
              <p className="text-sm" role="status">
                <span className="mr-2 inline-block size-2 animate-pulse rounded-full bg-sky-600" />
                {calling.status} {calling.to}
                {calling.redirected && <span className="text-muted-foreground"> (demo: redirected from the register number)</span>}. The result appears here
                automatically.
              </p>
            )}
          </div>
        )}

        {!approved && (
          <form
            className="flex flex-col gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (transcript.trim() && !pending) onSubmitCallback(transcript);
            }}
          >
            {samples.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-muted-foreground">Sample callback:</span>
                {samples.map((s) => (
                  <Button key={s.id} type="button" size="sm" variant="outline" disabled={pending} onClick={() => setTranscript(s.transcript)}>
                    {s.label}
                  </Button>
                ))}
              </div>
            )}
            <label htmlFor={`cb-${trade.id}`} className="text-sm font-medium">
              {onCallNow ? "Or paste a callback transcript" : "Callback transcript"}
            </label>
            <Textarea id={`cb-${trade.id}`} rows={6} value={transcript} onChange={(e) => setTranscript(e.target.value)} disabled={pending} className="font-mono text-sm" />
            <div>
              <Button type="submit" disabled={!transcript.trim() || pending}>
                {pending ? "Comparing…" : "Compare with original"}
              </Button>
            </div>
          </form>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertTitle>Callback not checked</AlertTitle>
            <AlertDescription>{error.message}</AlertDescription>
          </Alert>
        )}

        {callback && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="py-2 pr-3 font-medium">Field</th>
                  <th className="py-2 pr-3 font-medium">Original call</th>
                  <th className="py-2 pr-3 font-medium">Callback</th>
                  <th className="py-2 font-medium" />
                </tr>
              </thead>
              <tbody>
                {callback.fields.map((f) => (
                  <tr key={f.field} className={`border-b ${f.match ? "" : "bg-red-50 dark:bg-red-950/40"}`}>
                    <th scope="row" className="py-2 pr-3 text-left font-medium text-muted-foreground">
                      {LABELS[f.field]}
                    </th>
                    <td className="py-2 pr-3 font-mono">{show(f.original)}</td>
                    <td className={`py-2 pr-3 font-mono ${f.match ? "" : "font-bold text-red-700 dark:text-red-300"}`}>{show(f.callback)}</td>
                    <td className="py-2">{f.match ? "✓" : "✕"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {approved && exportUrl && (
          <div className="flex flex-wrap items-center gap-3">
            <Button render={<a href={exportUrl} download onClick={onExport} />}>Download Payments file (.xlsx)</Button>
            <span className="text-sm text-muted-foreground">Replaces the manual Excel macro. Includes the checks and the audit trail.</span>
          </div>
        )}

        {!approved && (
          <div>
            <Button disabled={!canApprove || pending} onClick={onApprove}>
              Approve trade
            </Button>
            {approveBlockedReason && <p className="mt-2 text-sm text-muted-foreground">{approveBlockedReason}</p>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
