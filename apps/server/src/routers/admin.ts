import { TRPCError } from "@trpc/server";
import { procedure, router } from "../trpc.js";
import { resetAuctionStore } from "../db/seed.js";

export const adminRouter = router({
  resetAuction: procedure.mutation(async ({ ctx }) => {
    if (!ctx.currentUser?.isAdmin)
      throw new TRPCError({ code: "FORBIDDEN", message: "Admin only" });
    const auction = await resetAuctionStore(ctx.prisma);
    return {
      success: true,
      message: "Auction store reset successfully",
      auction,
    };
  }),

  snapshotAuction: procedure.query(async ({ ctx }) => {
    if (!ctx.currentUser?.isAdmin)
      throw new TRPCError({ code: "FORBIDDEN", message: "Admin only" });
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
    if (!ctx.currentUser?.isAdmin)
      throw new TRPCError({ code: "FORBIDDEN", message: "Admin only" });
    const auction = await resetAuctionStore(ctx.prisma);
    return { success: true, message: "Store reset successfully", auction };
  }),
  snapshotVendors: procedure.query(async ({ ctx }) => {
    if (!ctx.currentUser?.isAdmin)
      throw new TRPCError({ code: "FORBIDDEN", message: "Admin only" });
    return ctx.prisma.auction.findMany({
      include: { seller: true, bids: true },
    });
  }),
});
