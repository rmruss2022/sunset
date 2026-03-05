# Seller Payout Setup Flow

## Purpose

Sellers must have a verified Stripe Connect Express account before they can list items for auction. This requirement exists for two reasons:

1. **Guaranteed payout routing.** When an auction closes the outbox worker charges the winner and splits proceeds via `transfer_data.destination`. If the seller has no Connect account at close time, the platform keeps all proceeds and the seller receives nothing — an unacceptable outcome for both parties.
2. **Regulatory compliance.** Stripe requires identity verification and bank account details before enabling payouts. Collecting this upfront (rather than post-sale) avoids a scenario where a seller wins a sale but cannot receive funds due to incomplete KYC.

By gating listing creation on a fully verified Connect account, we ensure every auction has a valid payout destination from inception.

---

## State Machine

A seller's payout account progresses through four states, derived from a combination of a local DB field and live Stripe API data:

```
  ┌──────────────┐    createConnectAccount    ┌──────────────────┐
  │  NOT_CREATED  │ ─────────────────────────► │     CREATED      │
  │               │                            │  (account exists │
  │ stripeConnect │                            │   but incomplete)│
  │ AccountId=null│                            └────────┬─────────┘
  └──────────────┘                                      │
                                              Stripe onboarding
                                              completed by user
                                                        │
                                                        ▼
                                            ┌───────────────────────┐
                                            │  DETAILS_SUBMITTED    │
                                            │                       │
                                            │ details_submitted=true│
                                            │ charges_enabled=false │
                                            │ payouts_enabled=false │
                                            └───────────┬───────────┘
                                                        │
                                              Stripe internal review
                                              completes (automatic)
                                                        │
                                                        ▼
                                            ┌───────────────────────┐
                                            │      VERIFIED         │
                                            │                       │
                                            │ charges_enabled=true  │
                                            │ payouts_enabled=true  │
                                            └───────────────────────┘
```

### State derivation logic

| State | `User.stripeConnectAccountId` | Stripe API: `details_submitted` | Stripe API: `charges_enabled && payouts_enabled` |
|---|---|---|---|
| NOT_CREATED | `null` | n/a | n/a |
| CREATED | set (`acct_...`) | `false` | `false` |
| DETAILS_SUBMITTED | set | `true` | `false` |
| VERIFIED | set | `true` | `true` |

**Source of truth:** The `stripeConnectAccountId` field on the `User` model (`apps/server/prisma/schema.prisma:21`) stores only the Stripe account ID. All status flags (`details_submitted`, `charges_enabled`, `payouts_enabled`) are retrieved live from the Stripe API via the `getConnectAccountStatus` query (`apps/server/src/routers/payment.ts:169–185`).

---

## User Flows

### Happy Path: Set Up Connect, Then List

1. User navigates to **Account > Payment** tab (`/account?tab=payment`).
2. The `SellerSection` component (`apps/web/src/components/payment/PaymentTab.tsx:200–293`) renders the "Set Up Payouts" button.
3. User clicks **Set Up Payouts**.
4. Frontend calls `trpc.payment.createConnectAccount` → server creates a Stripe Connect Express account (`type: "express"`, capabilities: `{ transfers: { requested: true } }`), persists `stripeConnectAccountId` on the User row (`payment.ts:120–144`).
5. Frontend immediately calls `trpc.payment.getConnectOnboardingLink` → server generates a Stripe `AccountLink` (`type: "account_onboarding"`) with:
   - `return_url`: `http://localhost:5173/account?connect=success`
   - `refresh_url`: `http://localhost:5173/account`
6. Frontend redirects the browser to the Stripe-hosted onboarding URL (`window.location.href = url`).
7. User completes Stripe onboarding (identity verification, bank account details) on Stripe's domain.
8. Stripe redirects back to `http://localhost:5173/account?connect=success`.
9. `SellerSection` re-queries `getConnectAccountStatus`; if `isVerified` is `true`, the UI shows a green "Payout account verified and active" badge.
10. User navigates to **Consign a Lot** (`/sell`), sees the listing form, submits an auction.

### Blocked Path: Attempt to List Without Setup

1. User navigates directly to **Consign a Lot** (`/sell`) without a verified Connect account.
2. `CreateListing.tsx` calls `trpc.payment.getConnectAccountStatus` on mount.
3. Response returns `{ hasAccount: false, isVerified: false }` (or `hasAccount: true, isVerified: false`).
4. Instead of the listing form, the page renders a full-page gate:
   > "You need a verified payout account to list items. **[Set Up Payouts →]**"
5. The CTA links to `/account?tab=payment`, where the user completes the Connect onboarding flow (steps 2–9 above).
6. After returning, user navigates back to `/sell` and the form is now accessible.

If the user somehow bypasses the frontend gate (e.g., direct API call), server-side enforcement in `auction.create` rejects the request with a `FORBIDDEN` error (see [Server Enforcement](#server-enforcement) below).

---

## Stripe Connect Express Lifecycle

### Account Creation

```
POST /v1/accounts
{
  type: "express",
  email: user.email,
  metadata: { userId },
  capabilities: { transfers: { requested: true } }
}
```

The Express account type delegates onboarding entirely to Stripe's hosted UI. The platform never collects or stores bank details, SSNs, or identity documents.

### AccountLink Generation

```
POST /v1/account_links
{
  account: "acct_...",
  refresh_url: "http://localhost:5173/account",
  return_url: "http://localhost:5173/account?connect=success",
  type: "account_onboarding"
}
```

- **`return_url`**: Where Stripe redirects after the user finishes (or exits) onboarding. The `?connect=success` param is informational; the actual status is always verified via API.
- **`refresh_url`**: Where Stripe redirects if the AccountLink expires (they are single-use and expire after a few minutes). The frontend should detect this and generate a new link.

### Onboarding Redirect

The browser is fully handed off to Stripe. The user enters:
- Legal name and date of birth
- Last 4 of SSN (US) or equivalent
- Bank account (routing + account number)
- Address

### Status Polling vs. Webhooks

The current implementation uses **polling** — each call to `getConnectAccountStatus` makes a live `stripe.accounts.retrieve(acct_...)` call. This is acceptable for an interview-scope project.

In production, you would:
1. Register a webhook endpoint for `account.updated` events.
2. Cache `charges_enabled` / `payouts_enabled` / `details_submitted` on the User model.
3. Update cached fields when the webhook fires.
4. Fall back to live API retrieval only when cache is stale or missing.

Polling latency is ~100–300ms per call to the Stripe API. Acceptable for page loads and listing creation gating, but not suitable for high-frequency checks.

---

## Server Enforcement

### Where: `apps/server/src/routers/auction.ts` — `create` mutation

Currently (`auction.ts:119–137`), the `create` procedure checks only `ctx.currentUser` for authentication. It does **not** verify the seller's Connect account status.

### Required change

Insert the following check after the `UNAUTHORIZED` guard and before the `prisma.auction.create` call:

```typescript
// auction.ts — inside create mutation, after line 121
const seller = await ctx.prisma.user.findUnique({
  where: { id: ctx.currentUser.userId },
  select: { stripeConnectAccountId: true },
});

if (!seller?.stripeConnectAccountId) {
  throw new TRPCError({
    code: "FORBIDDEN",
    message: "Set up a payout account before listing. Visit Account > Payment to connect your bank.",
  });
}

// Verify the account is actually charges_enabled (not just created)
const stripeAccount = await stripe.accounts.retrieve(seller.stripeConnectAccountId);
if (!stripeAccount.charges_enabled || !stripeAccount.payouts_enabled) {
  throw new TRPCError({
    code: "FORBIDDEN",
    message: "Your payout account is not yet verified. Please complete Stripe onboarding or wait for review.",
  });
}
```

### Latency impact

The `stripe.accounts.retrieve` call adds ~200ms to the listing creation path. This is acceptable because:
- Listing creation is an infrequent, high-value action (not a hot path).
- The alternative (trusting a cached flag) risks allowing a listing from a deauthorized account.

---

## Frontend Enforcement

### Where: `apps/web/src/routes/CreateListing.tsx`

The `CreateListingRoute` component (`CreateListing.tsx:72–444`) currently gates only on `!user` (authentication). It should additionally gate on Connect account verification.

### Required change

Add a `getConnectAccountStatus` query at the top of the component and render a gate before the form:

```tsx
// Inside CreateListingRoute, after the user auth check (line 107–119)
const connectStatus = trpc.payment.getConnectAccountStatus.useQuery(
  undefined,
  { enabled: !!user },
);

if (user && connectStatus.data && !connectStatus.data.isVerified) {
  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 py-24 text-center">
      <p className="font-display text-2xl text-ah-text mb-3">
        Payout Account Required
      </p>
      <p className="text-sm text-ah-text-2 mb-6">
        {connectStatus.data.detailsSubmitted
          ? "Your payout account is under review by Stripe. You'll be able to list items once verification completes."
          : "You need a verified payout account to list items for sale."}
      </p>
      {!connectStatus.data.detailsSubmitted && (
        <Link
          to="/account?tab=payment"
          className="text-xs tracking-widest uppercase text-ah-gold hover:text-ah-gold-bright transition-colors"
        >
          Set Up Payouts &rarr;
        </Link>
      )}
    </div>
  );
}
```

This provides two distinct messages:
- **No account / incomplete onboarding**: CTA to set up payouts.
- **Details submitted, under review**: Informational message, no action required from user.

---

## Payout Flow: How the Seller Receives Money

When an auction closes, the following chain executes:

1. **Auction Closer** (`apps/server/src/workers/auctionCloser.ts:13–28`) polls every 30 seconds for ACTIVE auctions past their `endsAt` time.
2. For each expired auction, it calls `finalizeAuctionIfNeeded` (`apps/server/src/services/bidding.ts:282`).
3. `finalizeAuctionIfNeeded`:
   - Marks the auction as `CLOSED`.
   - Determines the winning bid.
   - Fetches the seller's `stripeConnectAccountId` via the auction's `seller` relation (`bidding.ts:317`).
   - Enqueues an `AUCTION_CLOSED` outbox event with payload including `sellerConnectAccountId`.
4. **Outbox Worker** (`apps/server/src/workers/outbox.ts:11–35`) polls every 5 seconds for unprocessed events.
5. For `AUCTION_CLOSED` events (`outbox.ts:58–118`):
   - Computes `amountCents` from `finalPrice` and `feeCents` at 10%.
   - Builds a `PaymentIntent` with `confirm: true, off_session: true`.
   - If `sellerConnectAccountId` is present:
     ```typescript
     intentParams.transfer_data = {
       destination: sellerConnectAccountId,
     };
     intentParams.application_fee_amount = feeCents;
     ```
   - Stripe atomically charges the buyer, transfers `(amountCents - feeCents)` to the seller's Connect account, and retains `feeCents` on the platform account.
6. Funds appear in the seller's Stripe Express dashboard and are paid out to their bank on the standard Stripe payout schedule (typically T+2 for US accounts).

---

## Platform Fee

- **Rate**: 10%, defined as `PLATFORM_FEE_RATE = 0.1` (`outbox.ts:9`).
- **Mechanism**: `application_fee_amount` on the PaymentIntent. Stripe deducts this from the transfer to the seller's Connect account and credits it to the platform account.
- **Calculation**: `feeCents = Math.round(amountCents * 0.1)` (`outbox.ts:81`).
- **Example**: Auction closes at $150.00 → buyer is charged $150.00 → seller receives $135.00 → platform retains $15.00.
- Stripe's own processing fees (typically ~2.9% + 30c) are deducted separately by Stripe from the platform's portion per Connect pricing rules.

---

## Edge Cases

### Account created but not yet verified

**Scenario**: User completed Stripe onboarding (`details_submitted = true`), but Stripe hasn't yet enabled charges (`charges_enabled = false`). This is the DETAILS_SUBMITTED state.

**Behavior**:
- Frontend gate in `CreateListing.tsx` shows: "Your payout account is under review by Stripe."
- Server enforcement in `auction.create` throws `FORBIDDEN` with message about verification pending.
- The user cannot list items until Stripe completes its review.

### Seller's Connect account deauthorized after listing is live

**Scenario**: A seller had a verified account when they created the listing, but Stripe subsequently deactivated/deauthorized the account (e.g., compliance issue, user requested disconnect).

**Behavior**:
- `finalizeAuctionIfNeeded` still reads `seller.stripeConnectAccountId` from the DB — it will be non-null.
- The outbox worker sets `transfer_data.destination` on the PaymentIntent.
- Stripe rejects the transfer at charge time, causing a PaymentIntent failure.
- The `catch` block in the outbox worker (`outbox.ts:111–117`) logs the error but does not re-throw — other outbox events continue processing.
- **Current gap**: There is no automatic retry or fallback. In production, this should trigger an alert and manual resolution (refund buyer, or re-collect with platform as recipient).

### Multiple listings from the same seller

**Behavior**: Only one Connect account per seller. The `createConnectAccount` procedure is idempotent — if `stripeConnectAccountId` is already set, it returns the existing account ID (`payment.ts:125–127`). All of a seller's auctions route payouts to the same Connect account.

### Incomplete onboarding (user abandons Stripe flow)

**Scenario**: User clicks "Set Up Payouts", is redirected to Stripe, but closes the browser tab without completing.

**Behavior**:
- `stripeConnectAccountId` is set (account was created before redirect).
- `details_submitted = false`, so state is CREATED.
- Both frontend and server gates block listing creation.
- The `SellerSection` in PaymentTab shows a "Set Up Payouts" button, which generates a new `AccountLink` and redirects to Stripe again. AccountLinks are single-use; a fresh one is always generated.

### AccountLink expiration

**Scenario**: User is redirected to Stripe but the AccountLink expires before they complete.

**Behavior**: Stripe redirects to `refresh_url` (`http://localhost:5173/account`). The user sees the PaymentTab with the "Set Up Payouts" button. Clicking it generates a fresh AccountLink.

---

## Security Notes

1. **Bank details never touch our server.** All sensitive financial information (bank account numbers, routing numbers, SSN, identity documents) is collected exclusively by Stripe's hosted onboarding UI. Our server only stores the opaque `acct_...` account ID.

2. **No PII in AccountLinks.** The `AccountLink` URL is a short-lived, opaque Stripe URL. It contains no sensitive data and expires after a single use.

3. **Express account scope.** With `type: "express"`, the connected account is fully managed by Stripe. The platform has limited access — we can create transfers to the account but cannot view the seller's bank details, retrieve their SSN, or modify their identity information.

4. **Server-side enforcement is authoritative.** The frontend gate in `CreateListing.tsx` is a UX convenience. The `auction.create` server check is the security boundary — even if the frontend is bypassed, the server rejects unauthorized listing creation.

5. **Live Stripe API verification at listing time.** Rather than trusting a cached flag, the server retrieves the account status directly from Stripe during `auction.create`. This prevents stale cache exploits (e.g., a deauthorized account with a stale `isVerified = true` flag).

6. **Metadata linking.** Both the Stripe Customer (buyer-side) and Connect account (seller-side) include `metadata: { userId }` for audit trail and reconciliation.
