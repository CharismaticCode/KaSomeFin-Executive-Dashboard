# KaSome.Fin · Operations dashboard

Internal dashboard for the KaSome.Fin pilot: savers, balances, the round-up ledger, sweeps, withdrawals and interest.

```bash
npm install
npm run dev      # local dashboard
npm test         # metric tests (tests/metrics.test.js)
npm run lint
npm run build    # production build in dist/ (Vercel runs this)
```

## How the numbers work

All figures come from `src/lib/metrics.js`, which follows the same ledger rules as the app and the `balances` view:

- A round-up counts as **saved** only when its accrual is `pending` or `swept`. `skipped_buffer` (wallet under the safety buffer) and `reversed` are shown separately and never added to savings.
- **Balance** = saved round-ups + interest credited − withdrawals with status `paid`.
- **Waiting for sweep** = round-ups with status `pending`.
- Days and weeks are in Lusaka time (UTC+2); weeks start on Monday.
- Comparisons ("▲ 12%") only appear when the previous period is fully covered by data.
- **Ledger health** compares each saver's row in the `balances` view with the raw ledger and flags any difference.

## Pages

| Page | What it shows |
|---|---|
| Overview | Held for savers, saved in the period, active savers, waiting for sweep, daily round-ups, items that need attention, weekly active savers, categories, plans, signup-week retention, ledger health |
| Savers | Searchable, sortable list with status (active, slipping, dormant, not started). Click a saver for their balance breakdown, goal, last 30 days and recent payments |
| Ledger | Every pasted payment with its round-up status, filterable by saver, status, type and range, with CSV export |
| Money | Withdrawals, sweeps, interest runs and the current savers' rate |

## Access

The dashboard signs in with a shared password and reads the database with the project's service key (`src/config.js`).
That key bypasses row-level security, so keep this deployment and repository private.
