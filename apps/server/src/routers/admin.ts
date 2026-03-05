import { TRPCError } from "@trpc/server";
import { z } from "zod";
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

  deleteAuction: procedure
    .input(
      z.object({
        id: z.string().uuid(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.currentUser?.isAdmin)
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin only" });

      await ctx.prisma.$transaction([
        ctx.prisma.bid.deleteMany({ where: { auctionId: input.id } }),
        ctx.prisma.watch.deleteMany({ where: { auctionId: input.id } }),
        ctx.prisma.auction.delete({ where: { id: input.id } }),
      ]);

      return { success: true };
    }),

  updateAuction: procedure
    .input(
      z.object({
        id: z.string().uuid(),
        title: z.string().min(3).max(200).optional(),
        description: z.string().min(10).optional(),
        category: z.string().min(1).optional(),
        brand: z.string().min(1).optional(),
        model: z.string().min(1).optional(),
        year: z.number().int().optional(),
        imageUrls: z.array(z.string().min(1)).optional(),
        currentPrice: z.number().positive().optional(),
        status: z.enum(["ACTIVE", "CLOSED"]).optional(),
        // ISO string from client; converted to Date server-side
        endsAt: z.string().datetime().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.currentUser?.isAdmin)
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin only" });

      const { id, endsAt, ...rest } = input;
      const data: Record<string, unknown> = { ...rest };
      if (endsAt) data.endsAt = new Date(endsAt);

      const updated = await ctx.prisma.auction.update({
        where: { id },
        data,
      });

      return updated;
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
