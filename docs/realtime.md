# Real-Time Updates — WebSocket Architecture

## Overview

The auction detail page receives live updates without polling. When any user places a bid or an auction closes, every browser currently viewing that lot's page is notified via WebSocket and automatically re-fetches the latest data.

---

## Architecture

```
  Browser A (viewing lot X)          Browser B (viewing lot X)
       │                                    │
       │  ws://localhost:4000/ws            │  ws://localhost:4000/ws
       │  { type:"subscribe", auctionId }   │  { type:"subscribe", auctionId }
       ▼                                    ▼
┌─────────────────────────────────────────────────────┐
│                   Express / WS Server                │
│                                                      │
│  rooms: Map<auctionId, Set<WebSocket>>               │
│                                                      │
│  ┌───────────────────┐   ┌────────────────────────┐  │
│  │  tRPC Procedures  │   │  Background Workers    │  │
│  │  ─────────────    │   │  ──────────────────    │  │
│  │  auction.placeBid │   │  auctionCloser         │  │
│  │     └─ on success │   │    └─ on finalize      │  │
│  │        emitUpdate─┼───┼──►  emitUpdate ────────┼──┤
│  └───────────────────┘   └────────────────────────┘  │
│                                    │                  │
│               emitAuctionUpdate(auctionId)            │
│               iterates rooms.get(auctionId)           │
│               sends to each OPEN socket               │
│                    { type: "auction.updated",         │
│                      auctionId: "..." }               │
└──────────────────────────┬──────────────────────────┘
                           │ push to all subscribers
              ┌────────────┴────────────┐
              ▼                         ▼
     Browser A receives           Browser B receives
     "auction.updated"            "auction.updated"
              │                         │
              ▼                         ▼
   queryClient.invalidateQueries   queryClient.invalidateQueries
   → TanStack refetches            → TanStack refetches
     auction.getById                 auction.getById
              │                         │
              ▼                         ▼
   UI re-renders with            UI re-renders with
   new price + bid count         new price + bid count
```

---

## Server Implementation

**File:** `apps/server/src/index.ts`

The server maintains a room registry in memory:

```ts
const rooms = new Map<string, Set<WebSocket>>();

function emitAuctionUpdate(auctionId: string) {
  const clients = rooms.get(auctionId);
  for (const ws of clients) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "auction.updated", auctionId }));
    }
  }
}
```

The WebSocket server listens for two message types from clients:

| Message | Effect |
|---------|--------|
| `{ type: "subscribe", auctionId }` | Adds the socket to `rooms.get(auctionId)` |
| `{ type: "unsubscribe", auctionId }` | Removes the socket from the room |

On socket close, the cleanup handler removes the socket from all rooms it was in.

**`emitAuctionUpdate` is called in two places:**

1. `auction.placeBid` (tRPC router) — after a successful `placeProxyBid()` call
2. `startAuctionCloser` worker — after `finalizeAuctionIfNeeded()` closes a lot

---

## Client Implementation

**File:** `apps/web/src/lib/useAuctionSocket.ts`

```ts
export function useAuctionSocket(auctionId: string | null) {
  const queryClient = useQueryClient();

  useEffect(() => {
    const ws = new WebSocket('ws://localhost:4000/ws');

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: 'subscribe', auctionId }));
    };

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.type === 'auction.updated' && msg.auctionId === auctionId) {
        queryClient.invalidateQueries({ queryKey: [['auction', 'getById']] });
      }
    };

    return () => {
      ws.send(JSON.stringify({ type: 'unsubscribe', auctionId }));
      ws.close();
    };
  }, [auctionId, queryClient]);
}
```

**Used in:** `apps/web/src/routes/AuctionDetail.tsx` — `useAuctionSocket(id)` is called unconditionally on mount.

The `queryClient.invalidateQueries` call marks the cached `auction.getById` result as stale and triggers an immediate background refetch. Because the component is bound to that query via `trpc.auction.getById.useQuery`, it re-renders automatically with the fresh data.

---

## End-to-End Flow: Last-Second Bid

```
t=0    User B opens lot page
       → WebSocket connects, subscribes to auctionId
       → TanStack Query caches auction data

t=1    User A places a bid (tRPC: auction.placeBid)
       → Server: placeProxyBid() succeeds
       → Server: emitAuctionUpdate(auctionId)
       → Server: iterates rooms, finds User B's socket
       → Server: sends { type: "auction.updated", auctionId }

t=1+ε  User B's browser receives WebSocket message
       → invalidateQueries fires
       → TanStack Query issues GET auction.getById
       → Server responds with updated price + bid count

t=1+2ε User B's UI re-renders:
       → currentPrice updated
       → bidCount updated
       → BidHistory shows the new bid
```

Total latency from bid placement to User B's screen update: **one WebSocket push + one HTTP round-trip** (~50–150ms on localhost, ~200–500ms in production depending on network).

---

## Auction Close Push

The same `emitAuctionUpdate` is called by the `auctionCloser` worker when a lot is finalized. Any browser on the detail page will:

1. Receive the `auction.updated` push
2. Refetch — now seeing `status: "CLOSED"`
3. The "Live" badge flips to "Ended", the BidForm is hidden, and the final hammer price is displayed

The `auctionCloser` polls every **30 seconds**, so close notification latency is up to 30s after `endsAt`. The `CountdownTimer` component runs entirely client-side off the `endsAt` timestamp and shows "Ended" immediately when the timer reaches zero, independently of the server push.

---

## Limitations & Known Issues

| Issue | Impact | Notes |
|-------|--------|-------|
| Room state is in-memory | Lost on server restart | All subscribers disconnected; reconnect on next message |
| No reconnect logic | If the WS drops mid-session, updates stop until page reload | `ws.onclose` does nothing |
| Single server only | Rooms map can't be shared across multiple instances | Would need Redis pub/sub for horizontal scaling |
| No auth on WS connection | Any client can subscribe to any auctionId | Low risk — messages contain no sensitive data, just a cache invalidation signal |
| `auctionCloser` 30s poll lag | Close notification can be up to 30s late | CountdownTimer masks this on the client |
