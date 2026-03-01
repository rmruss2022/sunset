import { router } from '../trpc.js';
import { adminRouter } from './admin.js';
import { auctionRouter } from './auction.js';
import { authRouter } from './auth.js';
import { healthRouter } from './health.js';
import { userRouter } from './user.js';

export const appRouter = router({
  health: healthRouter,
  auction: auctionRouter,
  admin: adminRouter,
  auth: authRouter,
  user: userRouter,
});

export type AppRouter = typeof appRouter;
