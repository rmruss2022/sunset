# Auction House

A full-featured eBay-like auction marketplace. Multiple simultaneous auctions, proxy/max bidding, real-time updates via WebSocket, and concurrency-safe bid placement.

## Quick Start

### Prerequisites
- Node.js v20+
- PostgreSQL running locally

### Setup

```bash
# Install dependencies
yarn install

# Configure environment
cp apps/server/.env.example apps/server/.env
# Edit apps/server/.env and set DATABASE_URL

# Run migrations
yarn workspace @interview/server prisma migrate deploy

# Seed database
yarn workspace @interview/server prisma db seed

# Start dev servers
yarn dev
```

Open http://localhost:5173

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| DATABASE_URL | Yes | — | PostgreSQL connection string |

### Run Tests

```bash
yarn test
```

## Architecture

### Tech Stack
- **Backend**: Express + tRPC + Prisma + PostgreSQL
- **Frontend**: React + Vite + React Router + TanStack Query + Tailwind
- **Real-time**: WebSocket (ws library), in-process event emitter

### Key Design Decisions

#### Proxy / Max Bidding
Users submit a maximum bid. The system stores the max bid privately and computes the visible price using eBay-style increment rules. The leader's maximum is never revealed; only the minimum amount needed to outbid them is shown.

**First-bid rule**: When only one bidder exists, the visible price stays at the starting price — the bidder's max is fully hidden until competition arrives.

**Increment table**: 0.05 / 0.25 / 0.50 / 1.00 / 2.50 / 5.00 / 10.00 / 25.00 / 50.00 / 100.00 based on current price tier.

#### Concurrency Safety
Bid placement uses `prisma.$transaction()` with a raw `SELECT ... FOR UPDATE` on the Auction row, preventing race conditions under concurrent bid submissions.

#### Real-time Updates
After a successful bid commit, the server emits an `auction.updated` WebSocket message to all subscribers of that auction room. Clients invalidate their TanStack Query cache to trigger a refetch.

#### Outbox / Side Effects
An in-process outbox worker polls the `OutboxEvent` table every 5 seconds and creates `Notification` records for OUTBID, WON, and SOLD events. No real email — notifications are stored in the DB and visible in the admin panel.

### Data Model
- **User** — bidder/seller profile, Stripe payment fields (stubbed)
- **Auction** — full listing with shipping, returns, payment metadata
- **Bid** — proxy bid record with maxAmount (private) and visiblePriceSnapshot
- **Watch** — user watchlist entries
- **Notification** — in-app notifications from outbox events
- **OutboxEvent** — async side-effect queue

## Known Limitations & What's Next

### Limitations
- No real authentication — users are selected from a dropdown for demo purposes
- Stripe payment verification is stubbed (fields exist on User, no real Stripe API calls)
- WebSocket has no auto-reconnect on disconnect
- No server-side search (text filtering is client-side only)
- Auction finalization (closing auctions past endsAt) runs only when a close event is triggered; a cron job would handle this in production

### What to Improve Next
1. Add real authentication (JWT or session)
2. Implement Stripe SetupIntent for payment method verification
3. Add server-side search with PostgreSQL full-text search
4. Add pagination to auction list
5. WebSocket auto-reconnect with exponential backoff
6. Scheduled auction finalization (pg_cron or external job)
7. Redis pubsub for horizontal scaling of WebSocket broadcasts
8. Auction image upload (S3/CloudStorage)
9. Email notifications via outbox events
10. Bid increment history / audit trail UI
