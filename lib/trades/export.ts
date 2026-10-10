// Builds the .xlsx the Payments team receives (replaces the TA's Excel macro).
import ExcelJS from "exceljs";
import type { AuditEvent, CallbackResult, Trade } from "@/lib/types";

export const XLSX_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

export interface ExportInput {
  trade: Trade;
  callback: CallbackResult;
  audit: AuditEvent[];
  fundName: string | null; // from the register
}

export function exportFileName(trade: Trade): string {
  return `teldeal-${trade.created_at.slice(0, 10)}-${trade.id.slice(0, 8)}.xlsx`;
}

export async function buildPaymentsWorkbook({ trade, callback, audit, fundName }: ExportInput): Promise<Uint8Array<ArrayBuffer>> {
  const t = trade.extracted;
  const approved = audit.findLast((e) => e.type === "approved");
  const wb = new ExcelJS.Workbook();
  wb.creator = "TelDeal";
  wb.created = new Date(trade.created_at);

  const sheet = wb.addWorksheet("Trade");
  sheet.columns = [
    { header: "Field", key: "field", width: 28 },
    { header: "Value", key: "value", width: 48 },
  ];
  sheet.getRow(1).font = { bold: true };
  const rows: [string, string | number | null][] = [
    ["Trade ID", trade.id],
    ["Status", trade.status],
    ["Instruction received (UTC)", trade.created_at],
    ["Direction", t.direction],
    ["ISIN", t.isin],
    ["Fund", fundName ?? t.fund_name],
    ["Account number", t.account_no],
    ["Account name", t.account_name],
    ["Currency", t.currency],
    ["Quantity", t.quantity],
    ["Quantity type", t.quantity_type],
    ["Instructing caller", t.caller_name],
    ["Callback contact", trade.nominated_callback ? `${trade.nominated_callback.name} (${trade.nominated_callback.phone})` : null],
    ["Callback confirmed (UTC)", callback.all_match ? callback.created_at : "NOT CONFIRMED"],
    ["Approved (UTC)", approved?.at ?? null],
    ["Approved by", approved?.actor ?? null],
  ];
  for (const [field, value] of rows) sheet.addRow({ field, value: value ?? "" });
  sheet.getCell("B11").numFmt = "#,##0.####"; // quantity

  const checks = wb.addWorksheet("Checks");
  checks.columns = [
    { header: "Check", key: "id", width: 24 },
    { header: "Result", key: "status", width: 10 },
    { header: "Detail", key: "message", width: 80 },
  ];
  checks.getRow(1).font = { bold: true };
  for (const c of trade.checks) checks.addRow(c);

  const trail = wb.addWorksheet("Audit trail");
  trail.columns = [
    { header: "Time (UTC)", key: "at", width: 28 },
    { header: "Actor", key: "actor", width: 20 },
    { header: "Event", key: "type", width: 20 },
    { header: "Details", key: "payload", width: 70 },
  ];
  trail.getRow(1).font = { bold: true };
  for (const e of audit) trail.addRow({ ...e, payload: JSON.stringify(e.payload) });

  return new Uint8Array((await wb.xlsx.writeBuffer()) as ArrayBuffer);
}
