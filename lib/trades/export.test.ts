import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { mockAuditEvents, mockCallbackMatch, mockTradeClean } from "@/lib/mocks";
import { buildPaymentsWorkbook, exportFileName } from "@/lib/trades/export";

describe("Payments workbook", () => {
  it("contains the trade, its checks and the audit trail", async () => {
    const bytes = await buildPaymentsWorkbook({
      trade: { ...mockTradeClean, status: "approved" },
      callback: mockCallbackMatch,
      audit: mockAuditEvents,
      fundName: "iShares Core MSCI World UCITS ETF (Acc)",
    });
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(bytes.buffer as ArrayBuffer);

    const trade = wb.getWorksheet("Trade")!;
    const values = Object.fromEntries(
      trade.getRows(2, trade.rowCount - 1)!.map((r) => [r.getCell(1).text, r.getCell(2).value]),
    );
    expect(values["ISIN"]).toBe("IE00B4L5Y983");
    expect(values["Fund"]).toBe("iShares Core MSCI World UCITS ETF (Acc)");
    expect(values["Quantity"]).toBe(5000);
    expect(values["Callback contact"]).toBe("Mark Doyle (+353 1 555 0142)");
    expect(values["Approved by"]).toBe("Aoife (TA desk)");

    expect(wb.getWorksheet("Checks")!.rowCount).toBe(mockTradeClean.checks.length + 1);
    expect(wb.getWorksheet("Audit trail")!.rowCount).toBe(mockAuditEvents.length + 1);
  });

  it("names the file by date and trade id", () => {
    expect(exportFileName(mockTradeClean)).toBe("teldeal-2026-10-10-trd_0001.xlsx");
  });
});
