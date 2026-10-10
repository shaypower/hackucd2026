import { describe, expect, it } from "vitest";
import { mockCallbackMatch, mockCallbackMismatch, mockTradeClean, mockTradeFailures } from "@/lib/mocks";
import { approvalBlocker, callbackBlocker } from "@/lib/trades/approval";

describe("workflow rules", () => {
  it("allows a callback once checks pass", () => {
    expect(callbackBlocker(mockTradeClean)).toBeNull();
  });

  it("blocks a callback while checks fail", () => {
    expect(callbackBlocker(mockTradeFailures)).toMatch(/failed checks/);
  });

  it("blocks a callback with no nominated contact", () => {
    expect(callbackBlocker({ ...mockTradeClean, nominated_callback: null })).toMatch(/No nominated/);
  });

  it("needs a recorded callback before approval", () => {
    expect(approvalBlocker(mockTradeClean, null)).toMatch(/Record the callback/);
  });

  it("blocks approval on a mismatched callback and names the fields", () => {
    expect(approvalBlocker({ ...mockTradeClean, status: "callback_mismatch" }, mockCallbackMismatch)).toMatch(/quantity/);
  });

  it("allows approval when the callback matches", () => {
    expect(approvalBlocker({ ...mockTradeClean, status: "ready_to_approve" }, mockCallbackMatch)).toBeNull();
  });

  it("needs a new callback after an edit (status back to awaiting_callback)", () => {
    expect(approvalBlocker({ ...mockTradeClean, status: "awaiting_callback" }, mockCallbackMatch)).toMatch(/Record the callback/);
  });

  it("doesn't approve twice", () => {
    expect(approvalBlocker({ ...mockTradeClean, status: "approved" }, mockCallbackMatch)).toMatch(/already approved/);
  });
});
