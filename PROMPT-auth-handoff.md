# Handoff: Add Real Login and Remove User Picker

## Context

This is an **auction house** monorepo: `apps/server` (Express + tRPC + Prisma + Postgres) and `apps/web` (React + Vite + React Router + TanStack Query). Right now there is **no real authentication**. The app uses a **UserPicker** dropdown in the header (and a duplicate "Bid as" dropdown on the bid form) that simply sets `userId` in React state via `userContext.tsx`. Anyone can "be" any user by selecting from the list. The `/admin` route is unprotected—anyone can open it.

**Goal:** Make this feel like a real app. Users should **log in** (and optionally sign up). Remove all "select user" / "select bidder" UI. Add session-based auth so the logged-in user persists across refreshes. Protect the admin panel so only admin users can access it. At the end, **give me a single list of all test user logins and admin logins** (email + password or whatever credentials) so I can use them.

---

## Current Auth-Related Code (what to change)

- **`apps/web/src/lib/userContext.tsx`** — Holds `userId` and `setUserId` in React state only. Replace with session/auth state (e.g. from your auth solution).
- **`apps/web/src/components/UserPicker.tsx`** — Dropdown to "select" current user. **Remove this component** from the header and anywhere it’s used. Replace with a logged-in user indicator (e.g. display name + “Log out”).
- **`apps/web/src/components/RootLayout.tsx`** — Renders `UserPicker` in the header. Swap for: when logged in, show user info + log out; when not, show “Log in” (and optionally “Sign up”).
- **`apps/web/src/components/auction/BidForm.tsx`** — Contains a “Bid as” / “Select bidder…” dropdown (lines ~85–104). **Remove that entire block.** Bids should always be placed as the currently logged-in user; if not logged in, show “Log in to bid” (or similar) and disable bidding.
- **Create a login page** (e.g. `/login`) and optionally a sign-up page. Redirect unauthenticated users to login when they need to be logged in (e.g. to bid, create listing, or view profile).
- **Protect `/admin`** — Only users with an admin role (or a separate admin user table) should access it. Redirect or show “Forbidden” for non-admins.
- **Server:** Add auth to the backend (e.g. login/signup procedures, session or JWT verification). The tRPC context currently only has `prisma`; add the current user (and optionally `isAdmin`) from the session/token so procedures can use it. All existing procedures that take `userId` from the client should instead use the authenticated user from context where possible.

---

## Technical Requirements

1. **Real login** — Email + password (or another simple scheme). Passwords must be hashed (e.g. bcrypt) and never stored in plain text.
2. **Session persistence** — Use HTTP-only cookies or a secure token so that refreshing the page keeps the user logged in. No “select user” dropdown anywhere.
3. **Remove all “select user” / “select bidder” UI** — No UserPicker, no “Bid as” dropdown. The current user is always the logged-in user.
4. **Admin protection** — Only admin users can access `/admin`. Define an admin role (e.g. `User.role` or `User.isAdmin` in Prisma) and enforce it in the server and in the route.
5. **Seed test users** — In Prisma seed (or a migration/script), create several test **users** (bidders/sellers) and at least one **admin** user with known credentials.
6. **Deliverable** — After implementation, output a clear list in your response, for example:
   - **Regular users:**  
     - `alice@example.com` / `password123`  
     - `bob@example.com` / `password123`  
     - …
   - **Admin:**  
     - `admin@example.com` / `adminpassword`  
   So I can log in as any of these without guessing.

---

## What to Preserve

- All existing features: browsing auctions, bidding, creating listings, watchlist, etc. They should work the same, but the acting user is always the logged-in user.
- Existing Prisma models (User, Auction, Bid, Watch, etc.). Extend `User` (or add a small table) only as needed for auth (e.g. password hash, role).
- tRPC + React Query usage; just add auth to the tRPC context and protect procedures as needed.
- Styling and UX patterns (e.g. existing Tailwind/shadcn); match the current look for login/signup and header.

---

## Summary

- Add real email/password login (and optionally sign-up), with hashed passwords and session/token persistence.
- Remove the UserPicker and every “select bidder” / “select user” control; the app should feel like a normal app where you log in once.
- Protect `/admin` for admin users only.
- Seed test users and at least one admin; then **give me a single list of all logins (user and admin)** so I can use them.
