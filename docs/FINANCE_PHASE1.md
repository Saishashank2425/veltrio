# Finance Phase 1 — Implementation Notes

## Included
- `/finance` personal finance dashboard.
- Manual create, edit, search, and delete for transactions, subscriptions, credit cards, EMIs/loans, and bills/autopays.
- CSV transaction import with preview, basic header detection, row validation, likely duplicate skipping, and explicit confirmation.
- CSV export of all records as a local backup.
- INR-first currency formatting and recurring monthly/annual estimates.
- Upcoming dates, recorded income/expenses, subscription estimates, card balance summary, and EMI commitments.
- Navigation link from the existing marketing site.

## Current storage model
Phase 1 stores data in browser `localStorage` under `veltrio-finance-v1`. This makes the prototype usable without provisioning infrastructure, but records do not sync across browsers/devices and are not protected by application-level authentication. Users should export backups. This is not a production financial data store.

## Security boundaries
- No full card number, CVV, PIN, or banking credentials are requested or stored.
- Manually entered balances are not verified against a financial institution.
- No bank connection, payment initiation, subscription cancellation, or live trading is implemented.
- Creating or editing a financial record does not invoke MandateGate or initiate a payment.

## CSV expectations
Accepted header aliases include date/transaction date, description/details/merchant/payee, amount, or debit/credit columns, plus optional category and currency. Files are limited to 2 MB in the UI and 5,000 data rows in the parser. The importer previews and validates records before saving. Duplicate detection is heuristic, not guaranteed.

## Before production
1. Add authentication and per-user authorization.
2. Replace browser-only storage with a persistent database and migrations.
3. Add server-side validation and audit trails for record changes.
4. Test CSV date/number formats against actual sample statements without retaining sensitive data.
5. Add automated unit and end-to-end tests.
6. Evaluate eligible consent-based financial-data integrations individually.
