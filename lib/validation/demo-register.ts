// Demo register used by tests, mocks and the database seed (single source of truth).
// Fund ISINs and names are real, public UCITS ETFs. Share-class currencies, cut-offs, accounts,
// people and phone numbers are synthetic.
import type { Register } from "@/lib/validation/register";

export const demoRegister: Register = {
  funds: [
    { isin: "IE00B4L5Y983", name: "iShares Core MSCI World UCITS ETF (Acc)", share_class_currencies: ["USD", "EUR"], cutoff_time: "17:30" },
    { isin: "IE00B5BMR087", name: "iShares Core S&P 500 UCITS ETF (Acc)", share_class_currencies: ["USD"], cutoff_time: "17:30" },
    { isin: "IE00BK5BQT80", name: "Vanguard FTSE All-World UCITS ETF (Acc)", share_class_currencies: ["USD"], cutoff_time: "17:30" },
    { isin: "IE00B3XXRP09", name: "Vanguard S&P 500 UCITS ETF (Dist)", share_class_currencies: ["USD", "GBP"], cutoff_time: "17:30" },
  ],
  accounts: [
    { account_no: "40012", account_name: "Harbourview Pension Trustees" },
    { account_no: "40027", account_name: "Northwall Charitable Fund" },
    { account_no: "40031", account_name: "Oakpark Family Office" },
    { account_no: "40058", account_name: "University of Limerick Investment Group" },
  ],
  callers: [
    { account_no: "40012", name: "Mark Doyle", phone: "+353 1 555 0142", is_nominated_callback: true },
    { account_no: "40012", name: "Niamh Fallon", phone: "+353 1 555 0143", is_nominated_callback: false },
    { account_no: "40027", name: "Sinead Walsh", phone: "+353 1 555 0177", is_nominated_callback: true },
    { account_no: "40031", name: "Peter Quinn", phone: "+353 1 555 0190", is_nominated_callback: true },
    // Demo team: Shay places instructions, Hersh is the nominated callback contact. Phones are fictional;
    // automated callbacks go to DEMO_CALLBACK_NUMBER.
    { account_no: "40058", name: "Shay Power", phone: "+353 1 555 0158", is_nominated_callback: false },
    { account_no: "40058", name: "Hersh Singh", phone: "+353 1 555 0159", is_nominated_callback: true },
  ],
};
