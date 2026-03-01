import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, procedure } from "../trpc.js";

export const userRouter = router({

  // Returns full profile + stats
  getProfile: procedure.query(async ({ ctx }) => {
    if (!ctx.currentUser) throw new TRPCError({ code: "UNAUTHORIZED" });
    const user = await ctx.prisma.user.findUniqueOrThrow({
      where: { id: ctx.currentUser.userId },
      select: {
        id: true, email: true, displayName: true,
        sellerLocation: true, sellerRatingPercent: true, sellerFeedbackCount: true,
        addressLine1: true, addressLine2: true, city: true, state: true, zipCode: true, country: true,
        createdAt: true,
        _count: { select: { bids: true, listings: true, watches: true } },
      },
    });
    const activeListings = await ctx.prisma.auction.count({
      where: { sellerId: ctx.currentUser.userId, status: "ACTIVE" },
    });
    return { ...user, activeListings };
  }),

  // Auctions the user has bid on (deduped by auction, most recent bid wins)
  getMyBids: procedure.query(async ({ ctx }) => {
    if (!ctx.currentUser) throw new TRPCError({ code: "UNAUTHORIZED" });
    const bids = await ctx.prisma.bid.findMany({
      where: { userId: ctx.currentUser.userId },
      include: {
        auction: {
          select: {
            id: true, title: true, category: true, imageUrls: true,
            status: true, endsAt: true, currentPrice: true, bidCount: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    // Deduplicate: keep one entry per auction (the most recent bid), but track isLeading
    const seen = new Map<string, typeof bids[0]>();
    for (const bid of bids) {
      if (!seen.has(bid.auctionId)) seen.set(bid.auctionId, bid);
    }
    // For each unique auction, check if user has any leading bid
    const leadingAuctionIds = new Set(
      bids.filter(b => b.isLeading).map(b => b.auctionId)
    );
    return Array.from(seen.values()).map(bid => ({
      auctionId: bid.auctionId,
      title: bid.auction.title,
      category: bid.auction.category,
      imageUrls: bid.auction.imageUrls,
      auctionStatus: bid.auction.status,
      endsAt: bid.auction.endsAt,
      currentPrice: bid.auction.currentPrice,
      bidCount: bid.auction.bidCount,
      myMaxAmount: bid.maxAmount,
      isLeading: leadingAuctionIds.has(bid.auctionId),
    }));
  }),

  // User's own listings
  getMyListings: procedure.query(async ({ ctx }) => {
    if (!ctx.currentUser) throw new TRPCError({ code: "UNAUTHORIZED" });
    return ctx.prisma.auction.findMany({
      where: { sellerId: ctx.currentUser.userId },
      select: {
        id: true, title: true, category: true, status: true,
        currentPrice: true, startingPrice: true, listingFormat: true,
        bidCount: true, watchCount: true, endsAt: true, imageUrls: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }),

  // Watchlist
  getWatchlist: procedure.query(async ({ ctx }) => {
    if (!ctx.currentUser) throw new TRPCError({ code: "UNAUTHORIZED" });
    const watches = await ctx.prisma.watch.findMany({
      where: { userId: ctx.currentUser.userId },
      include: {
        auction: {
          select: {
            id: true, title: true, category: true, imageUrls: true,
            currentPrice: true, bidCount: true, watchCount: true,
            endsAt: true, status: true, sellerId: true,
            seller: { select: { displayName: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    return watches.map(w => ({ watchId: w.id, ...w.auction }));
  }),

  // Update profile / address
  updateProfile: procedure
    .input(z.object({
      displayName: z.string().min(1).max(100).optional(),
      sellerLocation: z.string().max(100).optional(),
      addressLine1: z.string().max(200).optional().nullable(),
      addressLine2: z.string().max(200).optional().nullable(),
      city: z.string().max(100).optional().nullable(),
      state: z.string().max(100).optional().nullable(),
      zipCode: z.string().max(20).optional().nullable(),
      country: z.string().max(100).optional().nullable(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.currentUser) throw new TRPCError({ code: "UNAUTHORIZED" });
      return ctx.prisma.user.update({
        where: { id: ctx.currentUser.userId },
        data: input,
        select: {
          id: true, displayName: true, sellerLocation: true,
          addressLine1: true, addressLine2: true, city: true,
          state: true, zipCode: true, country: true,
        },
      });
    }),
});
