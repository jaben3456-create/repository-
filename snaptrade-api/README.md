# SnapTrade API (Robinhood connection backend)

A tiny serverless backend, meant to be deployed on [Vercel](https://vercel.com), that lets the portfolio tracker connect to your Robinhood account through [SnapTrade](https://snaptrade.com) — a read-only account-aggregation service. You log into Robinhood directly on Robinhood's own page (with Robinhood's own 2FA); this backend, and the portfolio tracker frontend, never see your Robinhood password.

M1 Finance is **not** supported by SnapTrade — M1 stays CSV/manual import in the portfolio tracker.

This has to be a separate backend (not part of the static GitHub Pages site) because it holds a secret key that must never be exposed in browser JavaScript.

This uses a **Personal** SnapTrade API key, which auto-provisions a single implicit user for you at signup — there's no separate user-registration step. (SnapTrade also has a "Commercial" key model for apps serving many end users, with a different `registerSnapTradeUser`/`userSecret` flow; that's not what this is.)

## One-time setup

### 1. Create a SnapTrade developer account (free)

Sign up at [snaptrade.com](https://snaptrade.com), choosing **Personal** when asked (that matches this single-user setup and stays on the free tier — up to 5 brokerage connections, no credit card). From the [SnapTrade dashboard](https://dashboard.snaptrade.com) → API Keys, grab:
- Your **Client ID** (starts with `PERS-`)
- Your **Consumer Key** (this is the secret — never commit it or paste it into the frontend)

### 2. Deploy this folder to Vercel

1. Go to [vercel.com](https://vercel.com) → sign up (free) → **Add New Project** → import this GitHub repo.
2. When configuring the project, set **Root Directory** to `snaptrade-api`.
3. Before the first deploy (or after, then redeploy), add these **Environment Variables** in the Vercel project settings:

   | Name | Value |
   |---|---|
   | `SNAPTRADE_CLIENT_ID` | from the SnapTrade dashboard |
   | `SNAPTRADE_CONSUMER_KEY` | from the SnapTrade dashboard |
   | `API_ACCESS_TOKEN` | a long random string you make up (e.g. from a password generator) — this is a shared secret between this backend and the frontend so a stranger who finds your Vercel URL can't pull your holdings |
   | `ALLOWED_ORIGIN` | your GitHub Pages URL, e.g. `https://jaben3456-create.github.io` (optional — defaults to `*`) |

4. Deploy. Note the resulting URL, e.g. `https://your-project.vercel.app`.

### 3. Connect the frontend

In the portfolio tracker's Holdings & Sync tab, under "Connect Robinhood (via SnapTrade)":
1. Enter your Vercel URL (e.g. `https://your-project.vercel.app`) and the `API_ACCESS_TOKEN` you set above, click **Save connection settings**.
2. Click **Step 1: Connect Robinhood** — you'll be sent to Robinhood's login (via SnapTrade's hosted portal), log in there, confirm read-only access, then return to the app.
3. Click **Step 2: Sync Robinhood holdings** — pulls your current Robinhood positions and replaces any existing Robinhood entries in the tracker with the fresh data.

## Endpoints

All require `Authorization: Bearer <API_ACCESS_TOKEN>`.

- `GET /api/connect` — returns `{ redirectURI }`, a one-time (5-minute) SnapTrade Connection Portal link for Robinhood.
- `GET /api/positions` — returns `{ positions: [{ account: 'Robinhood', symbol, shares, avgCost, price }] }` for every connected Robinhood account.

## Security notes

- `SNAPTRADE_CONSUMER_KEY` is the real secret here — it stays in Vercel's environment variables and is never sent to the browser.
- `API_ACCESS_TOKEN` is a second, separate secret so this backend isn't a fully open read of your holdings to anyone who guesses your Vercel URL.
- SnapTrade connection is created with `connectionType: 'read'` — explicitly read-only, no trading capability is ever granted.
