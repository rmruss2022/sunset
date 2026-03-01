import { procedure, router } from "../trpc.js";
import { resetAuctionStore } from "../db/seed.js";

export const adminRouter = router({
  resetAuction: procedure.mutation(async ({ ctx }) => {
    const auction = await resetAuctionStore(ctx.prisma);
    return {
      success: true,
      message: "Auction store reset successfully",
      auction,
    };
  }),

  snapshotAuction: procedure.query(async ({ ctx }) => {
    return {
      auctions: await ctx.prisma.auction.findMany({
        include: {
          seller: true,
          bids: { include: { user: true } },
          watches: true,
        },
      }),
      users: await ctx.prisma.user.findMany(),
      outboxEvents: await ctx.prisma.outboxEvent.findMany({
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
      notifications: await ctx.prisma.notification.findMany({
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
    };
  }),

  // Backwards-compatible aliases
  resetVendors: procedure.mutation(async ({ ctx }) => {
    const auction = await resetAuctionStore(ctx.prisma);
    return { success: true, message: "Store reset successfully", auction };
  }),
  snapshotVendors: procedure.query(async ({ ctx }) => {
    return ctx.prisma.auction.findMany({
      include: { seller: true, bids: true },
    });
  }),
});
