import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { procedure, router } from "../trpc.js";
import { placeProxyBid } from "../services/bidding.js";
import {
  getAuctionList,
  getAuctionById,
  watchAuction,
  unwatchAuction,
} from "../services/auction.js";

export const auctionRouter = router({
  list: procedure
    .input(
      z
        .object({
          category: z.string().optional(),
          status: z.string().optional(),
          sort: z
            .enum(["ending", "price_asc", "price_desc", "newest"])
            .optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      return getAuctionList(ctx.prisma, input ?? undefined);
    }),

  getById: procedure
    .input(
      z.object({
        id: z.string().uuid(),
      }),
    )
    .query(async ({ ctx, input }) => {
      return getAuctionById(ctx.prisma, input.id, ctx.currentUser?.userId);
    }),

  placeBid: procedure
    .input(
      z.object({
        auctionId: z.string().uuid(),
        maxAmount: z.number().positive().max(10_000_000),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.currentUser)
        throw new TRPCError({ code: "UNAUTHORIZED" });
      const result = await placeProxyBid(
        ctx.prisma,
        input.auctionId,
        ctx.currentUser.userId,
        input.maxAmount,
      );
      if (result.success) {
        ctx.emitAuctionUpdate?.(input.auctionId);
      }
      return result;
    }),

  watch: procedure
    .input(
      z.object({
        auctionId: z.string().uuid(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.currentUser)
        throw new TRPCError({ code: "UNAUTHORIZED" });
      return watchAuction(ctx.prisma, input.auctionId, ctx.currentUser.userId);
    }),

  unwatch: procedure
    .input(
      z.object({
        auctionId: z.string().uuid(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.currentUser)
        throw new TRPCError({ code: "UNAUTHORIZED" });
      return unwatchAuction(ctx.prisma, input.auctionId, ctx.currentUser.userId);
    }),

  getUsers: procedure.query(async ({ ctx }) => {
    return ctx.prisma.user.findMany({
      select: {
        id: true,
        displayName: true,
        sellerRatingPercent: true,
        paymentVerified: true,
      },
      orderBy: { displayName: "asc" },
    });
  }),

  create: procedure
    .input(
      z.object({
        title: z.string().min(3).max(200),
        description: z.string().min(10),
        category: z.string(),
        condition: z.string(),
        brand: z.string().optional(),
        model: z.string().optional(),
        year: z.number().int().min(1800).max(2100).optional(),
        imageUrls: z.array(z.string().url()).default([]),
        listingFormat: z
          .enum(["AUCTION", "BUY_IT_NOW", "AUCTION_WITH_BUY_NOW"])
          .default("AUCTION"),
        startingPrice: z.number().positive(),
        buyNowPrice: z.number().positive().optional(),
        durationHours: z.number().int().min(1).max(168).default(72),
        shippingCostPayer: z.enum(["BUYER", "SELLER"]).default("BUYER"),
        shippingCostMin: z.number().min(0).default(0),
        returnsAccepted: z.boolean().default(true),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.currentUser)
        throw new TRPCError({ code: "UNAUTHORIZED" });
      const endsAt = new Date(
        Date.now() + input.durationHours * 60 * 60 * 1000,
      );
      return ctx.prisma.auction.create({
        data: {
          sellerId: ctx.currentUser.userId,
          title: input.title,
          description: input.description,
          category: input.category,
          condition: input.condition,
          brand: input.brand,
          model: input.model,
          year: input.year,
          imageUrls: input.imageUrls,
          listingFormat: input.listingFormat,
          startingPrice: input.startingPrice,
          currentPrice: input.startingPrice,
          buyNowPrice: input.buyNowPrice,
          endsAt,
          status: "ACTIVE",
          shippingCostPayer: input.shippingCostPayer,
          shippingCostMin: input.shippingCostMin,
          shippingCostMax: input.shippingCostMin,
          returnsAccepted: input.returnsAccepted,
          returnsPolicyLabel: input.returnsAccepted
            ? "30 days returns"
            : "No returns",
        },
        select: { id: true, title: true, endsAt: true },
      });
    }),
});
