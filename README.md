# Molfi X402 Marketers

> The advertiser dashboard for [Molfi.fun](https://app.molfi.fun) — buy ads, fund campaigns with USDC, and verify every impression on-chain.

## Overview

Molfi X402 Marketers is the marketer-facing web app for Molfi's ad network, where advertisers place video and image creatives across Molfi's chat surfaces and pay per verified view. Advertisers sign in with their wallet, fund campaigns in USDC on Avalanche Fuji, and every impression is anchored on-chain so it can be independently audited. Budgets are locked in the `MolfiAdMarket` smart contract, top-ups use the [x402](https://www.x402.org/) HTTP payment flow (EIP-3009 gasless USDC authorizations), and impression batches are settled via Merkle roots that anyone can verify from a public link.

This repository is the Next.js frontend; it talks to a separate Molfi backend API (default `http://localhost:8787`) for authentication, campaign metadata, creative uploads, and settlement data.

## Features

- **Sign-In With Ethereum (SIWE)** — nonce-and-signature auth against the backend, issuing a session JWT held in a Zustand store.
- **x402 USDC top-ups** — the billing flow catches an HTTP `402 Payment Required` quote, prompts an EIP-3009 `TransferWithAuthorization` signature, and retries with an `X-PAYMENT` header for gasless USDC deposits.
- **On-chain campaign creation** — approves USDC and calls `createCampaign` on the `MolfiAdMarket` contract, then parses the `CampaignCreated` event and syncs metadata to the backend.
- **Creative uploads** — multipart upload of video/image creatives, returning content CIDs and thumbnails for on-chain content addressing.
- **Campaign management** — list, inspect, pause/activate campaigns, view per-campaign impressions, bids, budgets, and frequency caps; targeting across `chat-web` and `extension` surfaces with optional model hints.
- **Public impression verification** — a `/verify/[impressionId]` page fetches the Merkle proof and calls `verifyLeaf` on the registry contract, with Snowtrace links to the anchoring and settlement transactions.
- **Withdrawals & billing ledger** — withdraw remaining USDC balance and review a full ledger of deposits and spend.
- **Admin console** — wallet-gated review queue to approve/reject campaigns, suspend marketers, and view network-wide stats.
- **Wallet UX** — RainbowKit connect flow and a global transaction modal wired to Avalanche Fuji.

## Tech Stack

- **Framework:** Next.js 15 (App Router), React 19, TypeScript
- **Wallet / chain:** wagmi, viem, RainbowKit — Avalanche Fuji testnet (chain ID 43113)
- **State & data:** Zustand, TanStack React Query
- **UI:** Tailwind CSS, lucide-react, Recharts
- **Payments:** x402 flow with EIP-3009 gasless USDC authorizations
- **Testing:** Vitest + Testing Library (unit), Playwright (end-to-end)
- **Tooling:** pnpm

## Getting Started

```bash
# clone
git clone https://github.com/nickthelegend/molfi-x402-marketers.git
cd molfi-x402-marketers

# install dependencies
pnpm install

# run the dev server (http://localhost:3002)
pnpm run dev

# run unit tests
pnpm run test

# production build
pnpm run build
pnpm run start
```

The app expects a running Molfi backend and a few public env vars (all have sensible testnet defaults):

```bash
NEXT_PUBLIC_BACKEND_URL=http://localhost:8787
NEXT_PUBLIC_WC_PROJECT_ID=<walletconnect-project-id>
NEXT_PUBLIC_AD_MARKET_ADDRESS=0x4b8de9f9f081ab9251daa0679b251f665ca11ffb
NEXT_PUBLIC_USDC_FUJI_ADDRESS=0x5425890298aed601595a70AB815c96711a31Bc65
NEXT_PUBLIC_RPC_URL=https://api.avax-test.network/ext/bc/C/rpc
NEXT_PUBLIC_FUJI_EXPLORER_BASE=https://testnet.snowtrace.io
```

## Project Structure

```
app/
  page.tsx               # Marketing landing page
  login/                 # SIWE wallet sign-in
  dashboard/             # Authenticated marketer area
    campaigns/           # List, create (on-chain), and inspect campaigns
    billing/             # x402 USDC top-ups, withdrawals, ledger
    settings/            # Profile & ToS
  admin/                 # Wallet-gated review & moderation console
  verify/[impressionId]/ # Public on-chain impression verification
components/
  CampaignForm.tsx       # Campaign creation form
  tx/                    # Global tx modal + Snowtrace helpers
lib/
  api.ts                 # Backend API client (marketers, billing, admin, verify)
  wagmi.ts               # wagmi/RainbowKit config (Avalanche Fuji)
  abi/MolfiAdMarket.json # Ad market contract ABI
store/
  marketerStore.ts       # Zustand session/balance store
playwright/              # E2E specs (SIWE, campaign create, top-up, verify)
test/                    # Vitest unit tests
```

---

Built by [nickthelegend](https://github.com/nickthelegend) · [nickthelegend.tech](https://nickthelegend.tech)
