import { procedure, router } from "../trpc.js";

/**
 * Health check router - a minimal working example to verify tRPC is wired correctly.
 * You can call this from the frontend to test the connection.
 */
export const healthRouter = router({
  check: procedure.query(async ({ ctx }) => {
    const auctionCount = await ctx.prisma.auction.count();
    return {
      status: "ok",
      timestamp: Date.now(),
      auctionCount,
      message: "tRPC is working! Ready for the auction house challenge.",
    };
  }),
});

