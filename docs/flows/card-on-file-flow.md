# Card-on-File Flow

> Design doc for the "save a card before bidding" requirement.
> Audience: senior engineers working on the auction house.

---

## 1. Purpose

Auctions are binding contracts. When the hammer falls, the winner owes the final price. If we allow bidding without a verified payment method, we risk:

- **Non-paying winners** — the seller loses time and must relist.
- **Failed off-session charges** — the outbox worker has no `PaymentMethod` to charge, so the `AUCTION_CLOSED` event silently skips payment (see `apps/server/src/workers/outbox.ts:73-78`).

Requiring a card on file *before* a user can bid ensures that every winning bid is backed by a chargeable payment method. This is the eBay model: you must have a payment method before you can bid.

---

## 2. State Machine

The card-on-file state lives on the `User` model (`apps/server/prisma/schema.prisma:10-36`):

| Field | Type | Purpose |
|---|---|---|
| `stripeCustomerId` | `String?` | Stripe Customer ID. Created lazily on first `createSetupIntent`. |
| `stripePaymentMethodId` | `String?` | ID of the user's default saved card (`pm_xxx`). |
| `paymentVerified` | `Boolean` (`false`) | Gate flag. `true` only after `setDefaultPaymentMethod` succeeds. |

### State transitions

```
                    ┌─────────────────────────────────────────┐
                    │                                         │
                    ▼                                         │
  ┌──────────────────────┐   createSetupIntent   ┌───────────┴──────────┐
  │  NO_CUSTOMER         │ ──────────────────────▶│  CUSTOMER_EXISTS     │
  │  stripeCustomerId=∅  │   (creates Stripe      │  stripeCustomerId=✓  │
  │  paymentVerified=F   │    Customer + returns   │  paymentVerified=F   │
  └──────────────────────┘    SetupIntent)         └───────────┬──────────┘
                                                               │
                                                  confirmCardSetup (client)
                                                  + setDefaultPaymentMethod
                                                               │
                                                               ▼
                                                  ┌────────────────────────┐
                                                  │  CARD_VERIFIED         │
                                                  │  stripePaymentMethodId │
                                                  │    = pm_xxx            │
                                                  │  paymentVerified=T     │
                                                  └───────────┬────────────┘
                                                              │
                                                 removePaymentMethod
                                                 (if removed card was default)
                                                              │
                                                              ▼
                                                  ┌────────────────────────┐
                                                  │  CARD_REMOVED          │
                                                  │  stripePaymentMethodId │
                                                  │    = null              │
                                                  │  paymentVerified=F     │
                                                  └────────────────────────┘
```

The `paymentVerified` flag is the **single source of truth** for bid gating. It is:
- Set to `true` in `setDefaultPaymentMethod` (`apps/server/src/routers/payment.ts:88-93`).
- Set to `false` in `removePaymentMethod` when the removed card was the default (`apps/server/src/routers/payment.ts:107-112`).

---

## 3. User Flow

### Happy path (card already on file)

1. User navigates to an auction detail page (`/auctions/:id`).
2. `BidForm` component renders. User is logged in and `paymentVerified === true`.
3. User enters a maximum bid amount and clicks "Place Bid".
4. `auction.placeBid` tRPC mutation fires. Server verifies `paymentVerified === true` on the user row, then delegates to `placeProxyBid`.
5. Proxy bid logic executes inside a `SELECT FOR UPDATE` transaction.
6. Result returned; UI shows success/outbid toast.

### Needs-to-add-card path

1. User navigates to an auction detail page.
2. `BidForm` detects `user.paymentVerified === false`.
3. Instead of the bid input, a banner is displayed: **"Add a payment card to place bids"** with a link to `/account?tab=payment`.
4. User clicks the link, lands on the Account page's Payment tab.
5. `BuyerSection` (`apps/web/src/components/payment/PaymentTab.tsx:94-197`) renders the `CardForm`.
6. User enters card details into the Stripe `CardElement` and clicks "Save Card".
7. Client calls `payment.createSetupIntent` → server creates Stripe Customer (if needed) + `SetupIntent(usage: off_session)` → returns `clientSecret`.
8. Client calls `stripe.confirmCardSetup(clientSecret, { payment_method: { card: cardEl } })`.
9. Stripe.js securely collects the PAN, sends it directly to Stripe, confirms the SetupIntent.
10. On success, client extracts `setupIntent.payment_method` (a `pm_xxx` ID) and calls `payment.setDefaultPaymentMethod({ paymentMethodId })`.
11. Server sets `stripePaymentMethodId = pm_xxx` and `paymentVerified = true` on the user row.
12. User navigates back to the auction. `BidForm` now sees `paymentVerified === true` and shows the bid input.

---

## 4. Stripe SetupIntent Lifecycle

The SetupIntent flow collects and vaults a card for future off-session use without charging immediately.

```
 Browser (Stripe.js)                    Our Server                         Stripe API
 ──────────────────                    ──────────                         ──────────
        │                                   │                                  │
        │  mutation: createSetupIntent      │                                  │
        │ ─────────────────────────────────▶│                                  │
        │                                   │  customers.create (if needed)    │
        │                                   │─────────────────────────────────▶│
        │                                   │◀─────────────────────────────────│
        │                                   │  setupIntents.create             │
        │                                   │  { customer, usage: off_session, │
        │                                   │    payment_method_types: [card] }│
        │                                   │─────────────────────────────────▶│
        │                                   │◀─── { client_secret: seti_xxx } ─│
        │◀── { clientSecret: seti_xxx } ────│                                  │
        │                                   │                                  │
        │  stripe.confirmCardSetup(secret,  │                                  │
        │    { payment_method: { card } })  │                                  │
        │──────────────────────────────────────────────────────────────────────▶│
        │  (PAN sent directly to Stripe,    │                                  │
        │   never touches our server)       │                                  │
        │◀─── { setupIntent: { status:      │                                  │
        │        succeeded,                 │                                  │
        │        payment_method: pm_xxx } } │                                  │
        │                                   │                                  │
        │  mutation: setDefaultPaymentMethod│                                  │
        │  { paymentMethodId: pm_xxx }      │                                  │
        │ ─────────────────────────────────▶│                                  │
        │   (DB: paymentMethodId=pm_xxx,    │                                  │
        │         paymentVerified=true)      │                                  │
        │◀── { ok: true } ─────────────────│                                  │
```

Key details:
- `usage: "off_session"` tells Stripe we intend to charge this card later without the cardholder present. Stripe may trigger 3D Secure during setup if the card's issuer requires it.
- The `client_secret` is short-lived and scoped to this single SetupIntent.
- The `pm_xxx` ID is safe to store — it cannot be used to retrieve the full card number.

---

## 5. Server Enforcement

### Current state (gap)

`auction.placeBid` (`apps/server/src/routers/auction.ts:39-58`) checks only that `ctx.currentUser` exists (is authenticated). It does **not** verify `paymentVerified`.

### Required change

Add a `paymentVerified` check in the `placeBid` mutation, **after** the auth check and **before** calling `placeProxyBid`:

**File:** `apps/server/src/routers/auction.ts`, inside the `placeBid` mutation handler (line 46-54).

```typescript
placeBid: procedure
  .input(
    z.object({
      auctionId: z.string().uuid(),
      maxAmount: z.number().positive().max(10_000_000),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    if (!ctx.currentUser)
      throw new TRPCError({ code: "UNAUTHORIZED" });

    // ── NEW: require a verified payment method ──
    const user = await ctx.prisma.user.findUnique({
      where: { id: ctx.currentUser.userId },
      select: { paymentVerified: true },
    });
    if (!user?.paymentVerified) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message:
          "A payment card is required before placing a bid. " +
          "Add one at /account?tab=payment",
      });
    }
    // ── END NEW ──

    const result = await placeProxyBid(
      ctx.prisma,
      input.auctionId,
      ctx.currentUser.userId,
      input.maxAmount,
    );
    if (result.success) {
      ctx.emitAuctionUpdate?.(input.auctionId);
    }
    return result;
  }),
```

This is a single `SELECT` by primary key — negligible cost. The check runs outside the `placeProxyBid` transaction, which is fine because the gate is "can this user bid at all?", not a concurrency concern.

---

## 6. Frontend Enforcement

### Current state (gap)

`BidForm` (`apps/web/src/components/auction/BidForm.tsx`) has two states:
1. `isEnded` → "Lot Closed" (line 66-78).
2. `!user` → "Sign in to place a bid" (line 80-94).
3. Otherwise → renders the bid form.

There is no check for `paymentVerified`.

### Required change

Add a third gate between the `!user` check and the bid form. The `BidForm` component needs access to `user.paymentVerified`. The component should render three gated states in order:

1. **Auction ended** → "Lot Closed" (unchanged).
2. **Not logged in** → "Sign in to place a bid" with login link (unchanged).
3. **Logged in, no card** (`!user.paymentVerified`) → New banner:
   ```
   ┌──────────────────────────────────────────┐
   │  ⚠  Add a payment card to place bids     │
   │                                          │
   │  A card on file is required before you   │
   │  can participate in bidding.             │
   │                                          │
   │         [Add Payment Card →]             │
   │         (links to /account?tab=payment)  │
   └──────────────────────────────────────────┘
   ```
4. **Logged in, card verified** → render bid form (unchanged).

The `paymentVerified` field should be available from the current user context (sourced from the session/auth endpoint). If the user context does not include this field, the `me` or auth endpoint must be extended to return it.

---

## 7. Off-Session Charge at Auction Close

When an auction ends, the charge flow is:

1. **Auction finalization** (`apps/server/src/services/bidding.ts:282-347`, `finalizeAuctionIfNeeded`):
   - Sets `auction.status = "CLOSED"`.
   - Finds the leading bid (with `isLeading: true`).
   - Reads `user.stripeCustomerId` and `user.stripePaymentMethodId` from the winning bidder's current DB row.
   - Enqueues an `AUCTION_CLOSED` outbox event with `winnerCustomerId`, `winnerPaymentMethodId`, `sellerConnectAccountId`, and `finalPrice`.

2. **Outbox worker** (`apps/server/src/workers/outbox.ts:58-118`, `AUCTION_CLOSED` handler):
   - If `winnerPaymentMethodId` or `winnerCustomerId` is null → logs a warning and **skips the charge** (line 73-78).
   - Otherwise, creates a `PaymentIntent` with:
     - `customer`: winner's Stripe Customer ID.
     - `payment_method`: winner's saved card (`pm_xxx`).
     - `confirm: true` — charges immediately.
     - `off_session: true` — no cardholder present.
     - `transfer_data.destination`: seller's Connect account (if present).
     - `application_fee_amount`: 10% platform fee (`Math.round(amountCents * 0.1)`).
   - On Stripe error (e.g. declined), logs the failure but does **not** re-throw — other outbox events continue processing.

The important detail: `finalizeAuctionIfNeeded` reads the user's payment fields **at close time**, not at bid time. This means the fields reflect the user's *current* state, not the state when they bid.

---

## 8. Edge Cases & Failure Modes

### 8.1 User removes their card after placing a bid

**Scenario:** User saves a card, places a winning bid, then navigates to `/account?tab=payment` and removes the card before the auction ends.

**What happens:**
- `removePaymentMethod` sets `stripePaymentMethodId = null` and `paymentVerified = false` on the user row (`payment.ts:107-112`).
- When the auction closes, `finalizeAuctionIfNeeded` reads the user row and finds `stripePaymentMethodId = null`.
- The `AUCTION_CLOSED` event payload contains `winnerPaymentMethodId: null`.
- The outbox worker hits the null check (line 73-78) and logs: `"Winner {id} has no payment method on file — charge skipped for lot {id}."`.
- **No charge is created. Manual recovery is needed** (contact winner, relist item, etc.).

**Mitigation (future):** Consider preventing card removal if the user has active leading bids, or require them to replace (not just remove) their card.

### 8.2 Card declined at auction close

**Scenario:** The card was valid at setup time but is declined when the off-session charge fires (insufficient funds, card expired, fraud hold).

**What happens:**
- `stripe.paymentIntents.create` throws an error.
- The outbox worker catches it and logs: `"Stripe charge FAILED for lot {id} / winner {id}: {message}"` (line 111-116).
- The event is still marked as processed (line 23-24) — it will **not** retry automatically.
- **The winner is not charged.** No automated notification is sent to the winner about the failure.

**Mitigation (future):** Create a `CHARGE_FAILED` notification, email the winner with a link to update their card, implement a retry window (e.g. 48 hours), then offer the item to the second-highest bidder.

### 8.3 Concurrent bid placement + card removal

**Scenario:** User A submits a bid at the same moment they remove their card in another browser tab.

**What happens at bid time:**
- The `placeBid` check reads `paymentVerified` from the DB. Due to timing, this may succeed (card not yet removed) or fail (card already removed). This is acceptable — it's a standard read-then-act race, and the consequence of the "wrong" outcome is minor:
  - If bid succeeds but card is gone → same as 8.1 above (charge skipped at close time).
  - If bid is rejected → user sees a FORBIDDEN error and can re-add a card.

**What happens at close time:**
- `finalizeAuctionIfNeeded` re-reads `user.stripeCustomerId` and `user.stripePaymentMethodId` from the DB at the moment of close (line 299-306). It does **not** use cached or stale values from bid time.
- This ensures the charge uses the user's *current* payment method, not the one they had when bidding.

### 8.4 SetupIntent expires or is abandoned

**Scenario:** User calls `createSetupIntent` but never completes `confirmCardSetup` (closes browser, navigates away).

**What happens:**
- The SetupIntent remains in `requires_payment_method` or `requires_confirmation` state on Stripe's side.
- No DB change occurs (`paymentVerified` stays `false`).
- The user can simply retry — a new SetupIntent is created each time.
- Stripe automatically expires incomplete SetupIntents after ~24 hours.

### 8.5 Multiple cards

**Scenario:** User saves card A, then saves card B.

**What happens:**
- Each `setDefaultPaymentMethod` call overwrites `stripePaymentMethodId` with the new `pm_xxx`. Only the most recently saved card is the "default."
- The previous card remains attached to the Stripe Customer but is not used for charges.
- `listPaymentMethods` returns all attached cards; `isDefault` flag identifies the active one.

---

## 9. Security Notes

### Card number never touches our server

The Stripe `CardElement` (from `@stripe/react-stripe-js`) renders an iframe hosted on Stripe's domain. When the user enters card details:
- The PAN, expiry, and CVC are captured **inside the Stripe iframe**.
- `stripe.confirmCardSetup()` sends this data directly from the browser to Stripe's API.
- Our server only receives the `SetupIntent.client_secret` (outbound) and the `pm_xxx` payment method ID (inbound). It never sees the raw card number.

This means our server is **out of PCI scope** for card data storage. We handle only opaque Stripe tokens.

### SetupIntent prevents storing raw PAN

The SetupIntent pattern is specifically designed to vault cards without a charge. Unlike the legacy Tokens API, SetupIntents:
- Support Strong Customer Authentication (SCA / 3D Secure) when required by the card issuer.
- Are explicitly scoped (`usage: "off_session"`) so Stripe knows the card will be charged later without the cardholder present, enabling appropriate risk checks at setup time.

### Token security

- The `client_secret` returned by `createSetupIntent` is transmitted over HTTPS and is scoped to a single SetupIntent. It cannot be used to create charges or access other resources.
- The `pm_xxx` payment method ID stored in our DB (`stripePaymentMethodId`) is a reference pointer, not a credential. It can only be used in conjunction with the Stripe secret key (server-side).

### Auth checks

- All payment mutations use `protectedProcedure` which requires `ctx.currentUser` (`payment.ts:11-16`).
- `setDefaultPaymentMethod` writes only to the authenticated user's own row (scoped by `userId`).
- `removePaymentMethod` detaches the card from Stripe and clears the user's own fields.
- There is no endpoint that allows one user to modify another user's payment methods.
