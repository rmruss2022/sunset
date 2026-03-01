# Auction House Challenge

A minimal React + tRPC starter for building an auction house app during a technical interview.

## Quick start

From the repository root:

```bash
yarn install
```

Create `apps/server/.env` (see `apps/server/.env.example`) with `DATABASE_URL`, then:

```bash
yarn workspace @interview/server prisma migrate dev
yarn workspace @interview/server prisma db seed
yarn dev
```

This will start:
- **Server** on http://localhost:4000 (Express + tRPC API)
- **Web app** on http://localhost:5173 (React + Vite)

## The Exercise

Build an auction house where users can browse and bid on multiple live auctions.

**View the full assignment:** Click the "📋 View Assignment" button in the app header, or visit http://localhost:5173/assignment

### What's provided

- ✅ tRPC v11 client configured in `src/lib/trpc.ts`
- ✅ TanStack Query v5 for data fetching
- ✅ React Router for navigation
- ✅ Tailwind CSS + shadcn/ui components in `src/components/ui/`
- ✅ Prisma + Postgres wiring in `apps/server` with a minimal schema + seed
- ✅ Working example procedure: `trpc.health.check`

### What you build

- Design/extend the data model (bids, audit log, idempotency, etc.)
- Implement tRPC procedures in `apps/server/src/routers/auction.ts`
- Build UI in `src/routes/Auction.tsx`
- Add tests for concurrency + close-time behavior

## For interviewers

Visit http://localhost:5173/admin to access the control panel where you can:
- Reset the auction house between candidates
- Inspect the current state snapshot

## Available routes

- `/` or `/auction` - Auction house (candidate builds here)
- `/assignment` - View full interview instructions
- `/admin` - Control panel for interview management

## Available shadcn components

All shadcn components are already installed in `src/components/ui/`:
- `Button`, `Input`, `Textarea`
- `Table`, `Badge`, `Alert`
- `Dialog`, `Sheet`, `Select`
- `Tabs`

Import them directly:
```tsx
import { Button } from "../components/ui/button";
```
