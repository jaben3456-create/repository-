# Portfolio Tracker

A local, private dashboard for tracking your Robinhood and M1 Finance holdings side by side: daily returns, a dividend tracker, and a 20-year compounding projection.

## Getting your holdings in

Robinhood and M1 Finance don't offer official public APIs for personal account access. Tools that claim to "auto-sync" by logging in with your real username and password using unofficial, reverse-engineered libraries violate both brokerages' Terms of Service and can get your account flagged or locked. This app doesn't do that.

There are three ways to get positions into the tracker:

- **Manual entry** — a quick form for a handful of positions or dividends.
- **CSV import** — this app defines its own simple CSV format (a template you can download from the app). Works for both Robinhood and M1.
- **Connect Robinhood automatically** — via [SnapTrade](https://snaptrade.com), a legitimate read-only account-aggregation service (the same kind of thing apps like Delta use). You log into Robinhood directly on Robinhood's own page with Robinhood's own 2FA; neither SnapTrade nor this app ever sees your password. **M1 Finance isn't supported by SnapTrade**, so M1 stays CSV/manual either way. Setting this up requires deploying a small companion backend — see [`snaptrade-api/README.md`](../snaptrade-api/README.md) for the full walkthrough.

Current *prices*, meanwhile, can be pulled in automatically for any position regardless of how it was entered — see **Live price sync** below.

## Live price sync

The Holdings & Sync tab (and a compact bar at the top of the Dashboard) has a **"Refresh prices now"** button that fetches the latest quote for every symbol you hold from [Finnhub](https://finnhub.io), a free market-data API — not a brokerage login, so none of the ToS/security concerns above apply to it.

To use it:
1. Sign up for a free API key at finnhub.io (no credit card required, free tier is 60 requests/minute).
2. Paste the key into the "Finnhub API key" field in Holdings & Sync and click **Save key**.
3. Click **Refresh prices now**. It fetches one symbol at a time (to stay under the free rate limit), updates each position's current price, and records a new snapshot for the day.

The key is stored only in this browser's `localStorage`, in a separate slot from your portfolio data — it's never included in the JSON backup export. Some tickers (mutual funds, certain international listings) aren't covered by Finnhub's free tier; those will show up as "failed" in the status message and you can still edit their price manually.

You can skip all of this and just type in prices by hand — the app works the same either way.

## Installing it on your iPhone Home Screen

This app is a installable PWA (manifest, icons, offline service worker), but iOS will only let you "Add to Home Screen" from a page served over HTTPS — not a local file. The repo includes a GitHub Actions workflow (`.github/workflows/deploy-pages.yml`) that publishes `portfolio-tracker/` to GitHub Pages automatically.

One-time setup (repo owner, ~30 seconds):
1. The repository needs to be **public** for free GitHub Pages (unless you have GitHub Pro/Team). Nothing sensitive lives in the repo — your portfolio data only ever lives in your phone's browser storage, never in this code.
2. In the repo on github.com: **Settings → Pages → Source → GitHub Actions**.
3. Merge this branch to `main` (or go to the **Actions** tab and manually run "Deploy portfolio-tracker to GitHub Pages" against this branch to test first).
4. After the workflow finishes, your Pages URL appears in the workflow run summary and in Settings → Pages — something like `https://<your-username>.github.io/<repo-name>/`.

On your iPhone:
1. Open that URL in **Safari** (must be Safari, not Chrome — only Safari exposes "Add to Home Screen" on iOS).
2. Tap the **Share** icon → **Add to Home Screen** → **Add**.
3. Open it from the new Home Screen icon — it launches full-screen with no browser address bar, and keeps working offline since the app shell is cached by a service worker.

Your data doesn't move or sync between devices automatically (it's still per-browser `localStorage`) — use the JSON backup/restore in Holdings & Sync if you also use the app on desktop and want the same data on your phone.

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
