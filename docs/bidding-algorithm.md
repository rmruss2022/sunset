# Bidding Algorithm

**Source:** `apps/server/src/services/bidding.ts`

---

## Overview

We implement **eBay-style proxy bidding**. A bidder submits a private *maximum* they're willing to pay, not a specific bid amount. The system automatically keeps them as the leader at the lowest price necessary to beat any competitor — up to their maximum. The current price shown publicly is always the minimum needed to hold the lead, never the leader's true maximum.

---

## Key Concepts

**Max amount** — the private ceiling a bidder sets. Stored in `Bid.maxAmount`. Never shown to other users while the auction is live.

**Visible price** — the public current price shown on the listing. Stored in `Auction.currentPrice` and `Bid.visiblePriceSnapshot`. This is what the winner actually pays.

**Leading bid** — exactly one `Bid` row has `isLeading = true` at any time. This is the current winner.

**Bid increment** — the minimum step size between the visible price and a competing bid, based on the current price tier (see table below).

---

## Bid Increment Table

`getBidIncrement(price)` — `apps/server/src/services/bidding.ts:19`

| Current price | Increment |
|--------------|-----------|
| < $1.00 | $0.05 |
| $1.00 – $4.99 | $0.25 |
| $5.00 – $24.99 | $0.50 |
| $25.00 – $99.99 | $1.00 |
| $100.00 – $249.99 | $2.50 |
| $250.00 – $499.99 | $5.00 |
| $500.00 – $999.99 | $10.00 |
| $1,000 – $2,499.99 | $25.00 |
| $2,500 – $4,999.99 | $50.00 |
| $5,000+ | $100.00 |

---

## Visible Price Formula

`computeVisiblePrice(leadingMax, secondMax, startingPrice)` — `apps/server/src/services/bidding.ts:47`

```
if no second bidder:
    visiblePrice = startingPrice

else:
    visiblePrice = min(leadingMax, secondMax + increment(secondMax))
```

The leader never pays more than one increment above the second-highest bidder, and never more than their own max.

---

## Concurrency Safety

`placeProxyBid` runs inside a Prisma transaction and opens the auction row with `SELECT ... FOR UPDATE` before any reads or writes. This means concurrent bid submissions queue up and execute serially — there's no race condition between two users bidding simultaneously.

```sql
SELECT * FROM "Auction" WHERE id = $1::uuid FOR UPDATE
```

---

## placeProxyBid — Decision Tree

`placeProxyBid(prisma, auctionId, userId, maxAmountInput)` — `apps/server/src/services/bidding.ts:79`

```
START
  │
  ├─ Auction not found → fail
  ├─ Auction closed/expired → fail
  │
  ├─ No leading bid yet (first bidder)
  │    ├─ maxAmount < startingPrice → fail
  │    └─ Create bid (isLeading=true), visible price = startingPrice ✓
  │
  ├─ Same user is already the leader (raising their max)
  │    ├─ New max ≤ current max → fail
  │    └─ Update maxAmount, recompute visible price ✓
  │
  ├─ New user, max ≤ leader's max (proxy auto-outbids them)
  │    ├─ Record new bid (isLeading=false)
  │    ├─ Recompute visible price (leader wins at secondMax + increment)
  │    ├─ Notify new bidder: "You have been outbid by a proxy bid"
  │    └─ Return isLeading=false ✓
  │
  └─ New user, max > leader's max (new user takes the lead)
       ├─ Previous leader: isLeading → false
       ├─ New bid: isLeading=true
       ├─ Visible price = min(newMax, oldLeaderMax + increment(oldLeaderMax))
       ├─ Notify old leader: OUTBID
       └─ Return isLeading=true ✓
```

---

## Worked Examples

### Example 1 — First bid

Starting price: **$100**. Alice bids max **$200**.

- No existing leader → first bid path
- Visible price = $100 (starting price, her max is hidden)
- Alice is leading at $100

### Example 2 — Bob bids less than Alice's max

Alice leads (max $200, visible $100). Bob bids max **$150**.

- Bob's max ($150) ≤ Alice's max ($200) → proxy auto-outbids Bob
- `computeVisiblePrice(200, 150, 100)` = min(200, 150 + 2.50) = **$152.50**
- Alice still leads at $152.50. Bob is outbid immediately.
- Bob receives an OUTBID notification.

### Example 3 — Carol beats Alice

Alice leads (max $200, visible $152.50). Carol bids max **$300**.

- Carol's max ($300) > Alice's max ($200) → Carol takes the lead
- `computeVisiblePrice(300, 200, 100)` = min(300, 200 + 5.00) = **$205.00**
- Carol leads at $205.00. Alice receives an OUTBID notification.

### Example 4 — Alice raises her max

Alice is outbid (max $200). She raises to **$350**.

- Same user re-entering → proxy raise path
- No second bidder above Alice, so `secondBid` = Carol ($300)
- `computeVisiblePrice(350, 300, 100)` = min(350, 300 + 7.50) = **$307.50**
- Alice leads at $307.50

---

## DB State After Each Bid

| Event | `Bid.isLeading` | `Bid.maxAmount` | `Auction.currentPrice` |
|-------|----------------|----------------|----------------------|
| Alice bids $200 (first) | Alice=true | Alice=$200 | $100.00 |
| Bob bids $150 | Alice=true, Bob=false | Alice=$200, Bob=$150 | $152.50 |
| Carol bids $300 | Carol=true, Alice=false, Bob=false | Carol=$300, Alice=$200 | $205.00 |
| Alice raises to $350 | Alice=true, Carol=false | Alice=$350, Carol=$300 | $307.50 |

---

## Auction Close

When the auction ends, `finalizeAuctionIfNeeded` (`apps/server/src/services/bidding.ts:282`):

1. Sets `Auction.status = CLOSED`
2. Finds the `Bid` where `isLeading = true` — this is the winner
3. The **winning price is `Bid.visiblePriceSnapshot`** — not the winner's `maxAmount`
4. Enqueues `AUCTION_CLOSED` outbox event with the winner's payment details

The winner pays the visible price, never their private maximum.
