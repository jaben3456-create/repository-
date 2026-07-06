# Portfolio Tracker

A local, private dashboard for tracking your Robinhood and M1 Finance holdings side by side: daily returns, a dividend tracker, and a 20-year compounding projection.

## Why there's no "connect your account" button

Robinhood and M1 Finance don't offer official public APIs for personal account access. Tools that claim to "auto-sync" typically log in with your real username and password using unofficial, reverse-engineered libraries — that violates both brokerages' Terms of Service and can get your account flagged or locked, and it means handing your brokerage credentials to a third-party script. This app doesn't do that.

Instead, you feed it your share counts and cost basis yourself, in whichever way is least annoying:

- **Manual entry** — a quick form for a handful of positions or dividends.
- **CSV import** — this app defines its own simple CSV format (a template you can download from the app). Fill it in from whatever you see in the Robinhood/M1 apps, or export from a spreadsheet, and bulk-import.

Current *prices*, on the other hand, can be pulled in automatically — see **Live price sync** below.

## Live price sync

The Holdings & Sync tab (and a compact bar at the top of the Dashboard) has a **"Refresh prices now"** button that fetches the latest quote for every symbol you hold from [Finnhub](https://finnhub.io), a free market-data API — not a brokerage login, so none of the ToS/security concerns above apply to it.

To use it:
1. Sign up for a free API key at finnhub.io (no credit card required, free tier is 60 requests/minute).
2. Paste the key into the "Finnhub API key" field in Holdings & Sync and click **Save key**.
3. Click **Refresh prices now**. It fetches one symbol at a time (to stay under the free rate limit), updates each position's current price, and records a new snapshot for the day.

The key is stored only in this browser's `localStorage`, in a separate slot from your portfolio data — it's never included in the JSON backup export. Some tickers (mutual funds, certain international listings) aren't covered by Finnhub's free tier; those will show up as "failed" in the status message and you can still edit their price manually.

You can skip all of this and just type in prices by hand — the app works the same either way.

## Running it

No build step, no dependencies, no server required.

```
cd portfolio-tracker
python3 -m http.server 8080
# then open http://localhost:8080 in your browser
```

(Or just double-click `index.html` — it works opened directly as a file too.)

All data is stored in your browser's `localStorage`. Nothing is sent to any server. Use the **Export full backup (JSON)** button in the Holdings & Sync tab before clearing browser data, or to move your data to another browser/device.

## How daily returns work

"Daily return" is computed from **snapshots**: every time your prices change — by editing a position, importing a CSV, or clicking "Refresh prices now" — the app records today's total portfolio value. The dashboard compares today's snapshot to the most recent prior day's snapshot to get your day-over-day $ and % change.

**To track daily returns accurately, refresh or update prices at least once a day.** With live price sync set up, that's just clicking one button.

## Tabs

- **Dashboard** — total value, today's change, total gain/loss, dividends YTD, an account breakdown, a value-over-time chart (toggle to split by account), and your full holdings table.
- **Holdings & Sync** — add/edit/delete positions, bulk CSV import with a downloadable template, and JSON backup/restore.
- **Dividends** — log dividend payments (manually or via CSV), see all-time/YTD/trailing-12-month totals and a monthly bar chart.
- **20-Year Projection** — defaults to your current portfolio value compounding at 8%/year (the long-run historical average for a diversified US stock portfolio) for 20 years. Every field (starting balance, rate, years, annual contribution) is editable and recalculates live.

## CSV formats

**Positions** (`Account,Symbol,Shares,AvgCost,CurrentPrice`):
```
Account,Symbol,Shares,AvgCost,CurrentPrice
Robinhood,AAPL,10,150.00,175.00
M1 Finance,VTI,5,210.00,225.00
```

**Dividends** (`Account,Date,Symbol,Amount`):
```
Account,Date,Symbol,Amount
Robinhood,2026-01-15,AAPL,4.32
M1 Finance,2026-02-01,VTI,12.10
```

Column headers are matched flexibly (e.g. "Ticker", "Qty", "Cost Basis" all work), so you don't need to match these exactly — but the four fields above must be present in some form.
