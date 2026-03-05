# Payment Requirement Enforcement — System Design

## 1. Overview

The Estate Room is an eBay-style auction platform. Before any real money changes hands, we need guarantees from both sides of a transaction:

- **Buyers** must have a valid payment method (card) on file before they can place a bid. This ensures that when an auction closes, we can charge the winner without chasing them down after the fact.
- **Sellers** must have a verified Stripe Connect payout account before they can list an item. This ensures proceeds can be disbursed automatically at close without manual intervention.

These gates serve three purposes: **trust** (both parties have skin in the game), **accountability** (verified identity via Stripe KYC), and **payment guarantee** (funds can flow programmatically at auction close with no human in the loop).

---

## 2. Architecture

```
┌──────────────────────────────────┐
│   Browser  (React/Vite)          │
│                                  │
│  TanStack Query cache            │
│  invalidateQueries ◄─────────────┼──────────────────┐
│         │                        │                   │
│         │ tRPC HTTP              │ WebSocket push    │
│         │ (bid, create,          │ { type:           │
│         │  payment setup…)       │  "auction.updated"│
└─────────┼──────────────────────--┘    auctionId }    │
          ▼                                            │
┌──────────────────────────────────────────────────────┤
│                    Express Server                     │
│                                                       │
│  ┌──────────────────────┐  ┌──────────────────────┐  │
│  │   tRPC Procedures    │  │   Payment Router     │  │
│  │  ─────────────────   │  │  ─────────────────   │  │
│  │  auction.placeBid ───┼──►  createSetupIntent   │  │
│  │    └─ emitUpdate()   │  │  setDefaultPM        │  │
│  │  auction.create   ───┼──►  createConnectAcct   │  │
│  │  auth.*              │  │  getOnboardingLink   │  │
│  └──────────┬───────────┘  │  getConnectStatus    │  │
│             │              └──────────┬───────────┘  │
│             ▼                         │               │
│  ┌──────────────────┐                │               │
│  │  Service Layer   │                │               │
│  │  placeProxyBid() │                │               │
│  │  SELECT FOR UPDATE│               │               │
│  └──────────┬───────┘                │               │
│             │                         │               │
│  ┌──────────────────────────────────────────────────┐ │
│  │  WebSocket Server  (ws://localhost:4000/ws)      │ │
│  │  rooms: Map<auctionId, Set<WebSocket>>           │ │
│  │  emitAuctionUpdate() ────────────────────────────┼─┘
│  └──────────────────────────────────────────────────┘ │
│             │                         │               │
│             ▼                         ▼               │
│  ┌────────────────────────────────────────────────┐   │
│  │             PostgreSQL (Prisma)                │   │
│  │  User, Auction, Bid, Watch,                    │   │
│  │  Notification, OutboxEvent                     │   │
│  └────────────────────────────────────────────────┘   │
└──────────────────────┬────────────────────────────────┘
                       │
          ┌────────────┼────────────┐
          ▼            ▼            ▼
   ┌────────────┐ ┌──────────┐ ┌──────────────┐
   │ Stripe API │ │  Outbox  │ │AuctionCloser │
   │ ────────── │ │  Worker  │ │   Worker     │
   │ SetupIntent│ │ ──────── │ │ ──────────── │
   │ PaymentMeth│ │ Charges  │ │ 30s poll     │
   │ Connect    │ │ + xfers  │ │ finalizes    │
   │ AccountLink│ │ Notifs   │ │ expired lots │
   │ PaymentInt │ │          │ │ emitUpdate() │
   └────────────┘ └──────────┘ └──────────────┘
```

**Request flow summary:**

1. Browser calls tRPC procedures via HTTP.
2. Server procedures enforce payment requirements (buyer card / seller Connect) before allowing bids or listings.
3. The service layer handles bid mechanics (proxy bidding with `SELECT FOR UPDATE` for concurrency safety).
4. At auction close, an `AUCTION_CLOSED` event is written to the `OutboxEvent` table.
5. The outbox worker picks up the event and executes the charge + payout via Stripe APIs.

---

## 3. Roles & Requirements

| Role   | Requirement             | Stripe Mechanism                       | DB Field                    | Enforcement Point   |
|--------|-------------------------|----------------------------------------|-----------------------------|---------------------|
| Buyer  | Card on file            | SetupIntent → off-session PaymentMethod | `User.paymentVerified`      | `auction.placeBid`  |
| Seller | Verified payout account | Connect Express → AccountLink onboarding | `User.stripeConnectAccountId` | `auction.create`  |

---

## 4. Data Model

The following fields on the `User` model track Stripe integration state:

```prisma
model User {
  stripeCustomerId       String?   // Stripe Customer object ID (cus_xxx).
                                   // Created lazily on first SetupIntent.

  stripePaymentMethodId  String?   // ID of the default PaymentMethod (pm_xxx).
                                   // Set after buyer confirms card via SetupIntent.

  stripeConnectAccountId String?   // Stripe Connect Express account ID (acct_xxx).
                                   // Created when seller initiates payout setup.

  paymentVerified        Boolean @default(false)
                                   // True once a valid card is saved and confirmed.
                                   // This is the single boolean gate for bid eligibility.
}
```

### Field Lifecycle

| Field | Created | Updated | Used |
|-------|---------|---------|------|
| `stripeCustomerId` | `payment.createSetupIntent` — created via `stripe.customers.create()` if null | Never updated after creation | Passed to `PaymentIntent.create` at charge time |
| `stripePaymentMethodId` | `payment.setDefaultPaymentMethod` — buyer confirms card | Replaced if buyer updates their card | Passed as `payment_method` to `PaymentIntent.create` |
| `paymentVerified` | `payment.setDefaultPaymentMethod` — set to `true` | Only changes if card is explicitly removed (future) | Checked in `auction.placeBid` gate |
| `stripeConnectAccountId` | `payment.createConnectAccount` — via `stripe.accounts.create()` | Never updated after creation | Checked in `auction.create` gate; used as `transfer_data.destination` at charge time |

---

## 5. Enforcement Points

### 5a. Bid Gate — `auction.placeBid`

**Location:** `apps/server/src/routers/auction.ts` → `placeBid` procedure

**Logic:**
```
1. Authenticate user (session/JWT)
2. Fetch user record from DB
3. if (!user.paymentVerified) → throw TRPCError(FORBIDDEN)
      message: "You must add a payment method before placing a bid"
      cause:  { redirect: "/account?tab=payment" }
4. Proceed to placeProxyBid() service call
```

**Why server-side:** The client-side gate (Section 6a) is a UX convenience. The server procedure is the authoritative check — a determined user could bypass the UI, but never the server.

### 5b. Listing Gate — `auction.create`

**Location:** `apps/server/src/routers/auction.ts` → `create` procedure

**Logic:**
```
1. Authenticate user (session/JWT)
2. Fetch user record from DB
3. if (!user.stripeConnectAccountId) → throw TRPCError(FORBIDDEN)
      message: "You must set up payouts before listing an item"
      cause:  { redirect: "/account?tab=payment" }
4. (Optional) Live-check Connect account status via Stripe API
      if account.charges_enabled !== true → throw FORBIDDEN
5. Proceed to create auction
```

**Note on live-checking (step 4):** We do an optional live check against `stripe.accounts.retrieve()` to catch edge cases where a Connect account was deauthorized after initial setup. This adds one API call but prevents listing items with a broken payout path.

---

## 6. Client-Side Gates

These are UX-only gates — they improve the user experience but provide **no security guarantee**. The server enforcement in Section 5 is always the source of truth.

### 6a. BidForm.tsx — Buyer Card Gate

**Location:** `apps/web/src/components/auction/BidForm.tsx`

**Behavior:**
- The component reads `user.paymentVerified` from the authenticated user context.
- If `paymentVerified === false`:
  - The bid input and submit button are **hidden or disabled**.
  - A prominent CTA is shown: **"Add a payment method to place bids"** linking to `/account?tab=payment`.
- If `paymentVerified === true`:
  - The bid form renders normally.

### 6b. CreateListing.tsx — Seller Connect Gate

**Location:** `apps/web/src/routes/CreateListing.tsx`

**Behavior:**
- The component reads `user.stripeConnectAccountId` and the Connect account verification status.
- If the seller is not verified:
  - The listing form is **hidden or disabled**.
  - A prominent CTA is shown: **"Set up payouts to list items"** linking to `/account?tab=payment`.
- If verified:
  - The listing form renders normally.

---

## 7. Money Flow

The full lifecycle of funds in an auction:

```
  Bid Placed         Auction Closes        Charge Created        Payout Sent
  ──────────         ──────────────        ──────────────        ───────────
  placeProxyBid()    auctionCloser         outbox worker         outbox worker
  (no money moves)   worker runs           processes event       (same event)
       │                  │                     │                     │
       ▼                  ▼                     ▼                     ▼
  Bid saved to DB    Auction.status →     PaymentIntent.create   Funds auto-route
                     CLOSED               off_session, with:     to seller via
                          │               • customer: cus_xxx    transfer_data
                          ▼               • payment_method: pm_  • 90% to seller
                     OutboxEvent          • transfer_data:       • 10% kept as
                     enqueued               destination: acct_     platform fee
                     (AUCTION_CLOSED)     • application_fee_amt
```

### Step-by-step:

1. **Bid placed** — `placeProxyBid()` validates the bid, acquires a row lock (`SELECT FOR UPDATE`), records the bid. No money moves yet.

2. **Auction closes** — The `auctionCloser` worker polls for auctions past their `endsAt` timestamp. It sets `status = CLOSED` and writes an `AUCTION_CLOSED` event to the `OutboxEvent` table.

3. **Outbox worker processes charge** — The outbox worker picks up unprocessed `AUCTION_CLOSED` events and:
   - Looks up the winning bid (highest `Bid` for the auction).
   - Looks up the winner's `stripeCustomerId` and `stripePaymentMethodId`.
   - Looks up the seller's `stripeConnectAccountId`.
   - Creates a `PaymentIntent` with:
     - `amount`: winning bid amount (in cents)
     - `customer`: winner's `stripeCustomerId`
     - `payment_method`: winner's `stripePaymentMethodId`
     - `off_session: true` (no buyer interaction needed)
     - `confirm: true` (charge immediately)
     - `transfer_data.destination`: seller's `stripeConnectAccountId`
     - `application_fee_amount`: `amount * PLATFORM_FEE_RATE` (10%)

4. **Funds settle** — Stripe automatically splits: 90% to the seller's Connect account, 10% retained by the platform.

### Fee Calculation

```
PLATFORM_FEE_RATE = 0.1

Example: Winning bid = $100.00 (10000 cents)
  application_fee_amount = 10000 * 0.1 = 1000 cents ($10.00)
  Seller receives:  $90.00
  Platform retains: $10.00
```

---

## 8. Error Handling

| Scenario | Detection | Response | User Impact |
|----------|-----------|----------|-------------|
| Buyer bids without card | `auction.placeBid` checks `paymentVerified` | `TRPCError(FORBIDDEN)` with redirect hint to `/account?tab=payment` | Toast error + link to add card |
| Seller lists without Connect | `auction.create` checks `stripeConnectAccountId` | `TRPCError(FORBIDDEN)` with redirect hint to `/account?tab=payment` | Toast error + link to set up payouts |
| Charge fails at auction close | `PaymentIntent.create` throws | Error logged to console/monitoring. OutboxEvent marked as failed. | Winner is not charged. (Future: alert + manual resolution) |
| Connect account deauthorized post-listing | `transfer_data.destination` invalid at charge time | Stripe returns error on the transfer portion. Platform keeps full proceeds. | Seller does not receive payout. (Future: notify seller, hold funds in escrow) |
| SetupIntent expires before confirmation | Client-side timeout | User re-initiates setup flow; new SetupIntent created | Minor inconvenience, no data loss |
| Duplicate outbox processing | Worker picks up already-processed event | Idempotency key on PaymentIntent prevents double-charge | No impact — Stripe deduplicates |

### Future Improvements

- **Retry queue** for failed charges with exponential backoff
- **Webhook listeners** for asynchronous Stripe events (payment failures, Connect deauthorization)
- **Alerting** for charge failures and Connect issues
- **Escrow** for disputed or failed payouts

---

## 9. Testing Approach

All Stripe integration uses **test mode** (`sk_test_` / `pk_test_` keys). No real money is involved during development or testing.

### Test Credentials

| Item | Value | Notes |
|------|-------|-------|
| Test card number | `4242 4242 4242 4242` | Always succeeds |
| Test card (decline) | `4000 0000 0000 0002` | Always declines — use for charge-failure testing |
| Expiry | Any future date | e.g., `12/34` |
| CVC | Any 3 digits | e.g., `123` |
| Test bank routing | `110000000` | For Connect bank account setup |
| Test bank account | `000123456789` | For Connect bank account setup |

### Manual Test Plan

1. **Buyer card flow:** Sign up → go to Account → Payment tab → add card with `4242...` → verify `paymentVerified` flips to `true` → place a bid successfully.
2. **Seller Connect flow:** Sign up → go to Account → Payment tab → start Connect onboarding → complete Stripe-hosted flow → verify `stripeConnectAccountId` populated → create a listing successfully.
3. **Bid gate enforcement:** New user (no card) → try to bid → expect FORBIDDEN error and CTA.
4. **Listing gate enforcement:** New user (no Connect) → try to list → expect FORBIDDEN error and CTA.
5. **End-to-end money flow:** Buyer bids → auction closes → verify PaymentIntent created in Stripe dashboard → verify transfer to Connect account.

---

## 10. Sub-Documents

Detailed step-by-step flow documentation for each payment path:

- **[Card-on-File Flow](flows/card-on-file-flow.md)** — Complete buyer payment setup flow from UI through Stripe SetupIntent to `paymentVerified = true`.
- **[Seller Payout Setup Flow](flows/seller-payout-setup-flow.md)** — Complete seller Connect onboarding flow from UI through Stripe AccountLink to verified payout capability.
- **[Real-Time Updates](realtime.md)** — WebSocket room architecture, bid push flow, auction close push, and known limitations.
- **[Bidding Algorithm](bidding-algorithm.md)** — eBay-style proxy bidding, increment table, visible price formula, and concurrency safety.
