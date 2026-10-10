// The one plan. Sandbox only: no real payments.
export const PLAN = {
  name: "TelDeal Desk",
  amount: 4900, // minor units
  currency: "eur",
  interval: "month" as const,
  priceLabel: "€49 / month per dealing desk",
  features: [
    "Unlimited phone and pasted instructions read by AI",
    "Register checks: ISIN, account, authorised caller, share class, cut-off",
    "Automated AI callback to the nominated contact",
    "Approval and Payments .xlsx export with full audit trail",
  ],
  // Why monthly per desk: TA dealing desks are small teams with steady daily volume, and ops budgets
  // buy tooling per seat/desk per month. A per-trade price would make every phone instruction a cost decision.
  rationale: "Priced per dealing desk per month, like the other seat-based tools an operations team buys: predictable cost, no per-trade friction.",
};

export const DESK_ID = "desk_demo"; // no login yet: one demo desk
