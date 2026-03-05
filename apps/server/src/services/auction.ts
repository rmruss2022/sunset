import type { PrismaClient } from "@prisma/client";

interface ListFilters {
  category?: string;
  status?: string;
  sort?: string;
}

export async function getAuctionList(prisma: PrismaClient, filters?: ListFilters) {
  const where: Record<string, unknown> = {};
  if (filters?.category) where.category = filters.category;
  if (filters?.status) where.status = filters.status;

  let orderBy: Record<string, string>;
  switch (filters?.sort) {
    case "price_asc":
      orderBy = { currentPrice: "asc" };
      break;
    case "price_desc":
      orderBy = { currentPrice: "desc" };
      break;
    case "newest":
      orderBy = { createdAt: "desc" };
      break;
    default:
      orderBy = { endsAt: "asc" };
  }

  return prisma.auction.findMany({
    where,
    orderBy,
    include: {
      seller: {
        select: {
          id: true,
          displayName: true,
          sellerRatingPercent: true,
          sellerFeedbackCount: true,
          sellerLocation: true,
          paymentVerified: true,
        },
      },
    },
  });
}

export async function getAuctionById(
  prisma: PrismaClient,
  id: string,
  userId?: string,
) {
  const auction = await prisma.auction.findUnique({
    where: { id },
    include: {
      seller: {
        select: {
          id: true,
          displayName: true,
          sellerRatingPercent: true,
          sellerFeedbackCount: true,
          sellerLocation: true,
          paymentVerified: true,
        },
      },
      bids: {
        orderBy: { createdAt: "asc" },
        include: {
          user: { select: { id: true, displayName: true } },
        },
      },
    },
  });

  if (!auction) return null;

  // Anonymize bidders: assign "Bidder 1", "Bidder 2" etc. by order of first bid.
  // Show real name only for the current user.
  const bidderOrder = new Map<string, number>();
  let nextBidderNum = 1;

  const anonymizedBids = auction.bids.map((bid) => {
    if (!bidderOrder.has(bid.userId)) {
      bidderOrder.set(bid.userId, nextBidderNum++);
    }
    const bidderNum = bidderOrder.get(bid.userId)!;
    const isCurrentUser = userId === bid.userId;

    return {
      id: bid.id,
      auctionId: bid.auctionId,
      userId: bid.userId,
      displayName: isCurrentUser ? bid.user.displayName : `Bidder ${bidderNum}`,
      isCurrentUser,
      visiblePriceSnapshot: bid.visiblePriceSnapshot,
      isLeading: bid.isLeading,
      createdAt: bid.createdAt,
    };
  });

  // Check if user is watching
  let isWatched = false;
  if (userId) {
    const watch = await prisma.watch.findUnique({
      where: { auctionId_userId: { auctionId: id, userId } },
    });
    isWatched = !!watch;
  }

  return {
    ...auction,
    bids: anonymizedBids,
    isWatched,
  };
}

export async function watchAuction(
  prisma: PrismaClient,
  auctionId: string,
  userId: string,
) {
  const { count } = await prisma.watch.createMany({
    data: [{ auctionId, userId }],
    skipDuplicates: true,
  });

  if (count > 0) {
    await prisma.auction.update({
      where: { id: auctionId },
      data: { watchCount: { increment: 1 } },
    });
  }

  return { success: true };
}

export async function unwatchAuction(
  prisma: PrismaClient,
  auctionId: string,
  userId: string,
) {
  const existing = await prisma.watch.findUnique({
    where: { auctionId_userId: { auctionId, userId } },
  });

  if (existing) {
    await prisma.watch.delete({
      where: { id: existing.id },
    });

    // Decrement but don't go below 0
    await prisma.$executeRawUnsafe(
      `UPDATE "Auction" SET "watchCount" = GREATEST("watchCount" - 1, 0) WHERE id = $1::uuid`,
      auctionId,
    );
  }

  return { success: true };
}
