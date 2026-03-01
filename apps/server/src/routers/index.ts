import { router } from '../trpc.js';
import { adminRouter } from './admin.js';
import { auctionRouter } from './auction.js';
import { healthRouter } from './health.js';

export const appRouter = router({
  health: healthRouter,
  auction: auctionRouter,
  admin: adminRouter,
});

export type AppRouter = typeof appRouter;
