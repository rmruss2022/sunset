import type { PrismaClient, Prisma } from "@prisma/client";

type TransactionClient = Omit<
  PrismaClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

export type PlaceBidResult = {
  success: boolean;
  message: string;
  newCurrentPrice?: number;
  isLeading?: boolean;
  outbidUserId?: string;
};

/**
 * eBay-style bid increment table.
 */
export function getBidIncrement(price: number): number {
  if (price < 1) return 0.05;
  if (price < 5) return 0.25;
  if (price < 25) return 0.5;
  if (price < 100) return 1.0;
  if (price < 250) return 2.5;
  if (price < 500) return 5.0;
  if (price < 1000) return 10.0;
  if (price < 2500) return 25.0;
  if (price < 5000) return 50.0;
  return 100.0;
}

/**
 * Returns true only if the auction is ACTIVE and endsAt is in the future.
 */
export function isAuctionOpen(
  auction: { endsAt: Date; status: string },
  now: Date = new Date(),
): boolean {
  return auction.status === "ACTIVE" && now < auction.endsAt;
}

/**
 * eBay proxy bidding visible price rules.
 * - No second bidder → startingPrice (leader's max is hidden)
 * - Second bidder exists → min(leaderMax, secondMax + increment)
 */
export function computeVisiblePrice(
  leadingMaxAmount: number,
  secondMaxAmount: number | null,
  startingPrice: number,
): number {
  if (secondMaxAmount === null) {
    return Math.round(startingPrice * 100) / 100;
  }
  const price = Math.min(
    leadingMaxAmount,
    secondMaxAmount + getBidIncrement(secondMaxAmount),
  );
  return Math.round(price * 100) / 100;
}

/**
 * Enqueue an outbox event for async processing.
 */
export async function enqueueOutboxEvent(
  prisma: PrismaClient | TransactionClient,
  eventType: string,
  payload: object,
): Promise<void> {
  await prisma.outboxEvent.create({
    data: { eventType, payload: payload as Prisma.InputJsonValue },
  });
}

/**
 * Core concurrency-safe proxy bid placement.
 * Uses a Prisma transaction with row-level locking (SELECT FOR UPDATE).
 */
export async function placeProxyBid(
  prisma: PrismaClient,
  auctionId: string,
  userId: string,
  maxAmountInput: number,
): Promise<PlaceBidResult> {
  return prisma.$transaction(async (tx) => {
    // 1. Lock the auction row
    const rows = await tx.$queryRawUnsafe<
      Array<{
        id: string;
        endsAt: Date;
        status: string;
        startingPrice: string | number;
        currentPrice: string | number;
        bidCount: number;
      }>
    >(
      `SELECT * FROM "Auction" WHERE id = $1::uuid FOR UPDATE`,
      auctionId,
    );

    const auction = rows[0];
    if (!auction) {
      return { success: false, message: "Auction not found" };
    }

    // 2. Check auction is open
    if (!isAuctionOpen({ endsAt: auction.endsAt, status: auction.status }, new Date())) {
      return { success: false, message: "Auction has ended" };
    }

    const startingPrice = Number(auction.startingPrice);

    // 3. Get current leading bid
    const leadingBid = await tx.bid.findFirst({
      where: { auctionId, isLeading: true },
    });

    // 4. No existing leader (first bid)
    if (!leadingBid) {
      if (maxAmountInput < startingPrice) {
        return {
          success: false,
          message: `Your bid must be at least $${startingPrice.toFixed(2)}`,
        };
      }

      await tx.bid.create({
        data: {
          auctionId,
          userId,
          maxAmount: maxAmountInput,
          visiblePriceSnapshot: startingPrice,
          isLeading: true,
        },
      });

      await tx.auction.update({
        where: { id: auctionId },
        data: { currentPrice: startingPrice, bidCount: 1 },
      });

      return {
        success: true,
        message: "You are the first bidder!",
        newCurrentPrice: startingPrice,
        isLeading: true,
      };
    }

    const leadingMaxAmount = Number(leadingBid.maxAmount);

    // 5. Same user already leading — update max (proxy raise)
    if (leadingBid.userId === userId) {
      if (maxAmountInput <= leadingMaxAmount) {
        return {
          success: false,
          message: `Your new maximum must exceed your current maximum of $${leadingMaxAmount.toFixed(2)}`,
        };
      }

      // Get second highest bid
      const secondBid = await tx.bid.findFirst({
        where: { auctionId, isLeading: false },
        orderBy: { maxAmount: "desc" },
      });

      const secondMax = secondBid ? Number(secondBid.maxAmount) : null;
      const visiblePrice = computeVisiblePrice(maxAmountInput, secondMax, startingPrice);

      await tx.bid.update({
        where: { id: leadingBid.id },
        data: { maxAmount: maxAmountInput },
      });

      await tx.auction.update({
        where: { id: auctionId },
        data: { currentPrice: visiblePrice },
      });

      return {
        success: true,
        message: "Your maximum bid has been updated",
        newCurrentPrice: visiblePrice,
        isLeading: true,
      };
    }

    // 6. Different user — compete against the current leader
    if (maxAmountInput <= leadingMaxAmount) {
      // New bid doesn't beat the leader — but still record the bid and update visible price
      // The leader's proxy auto-outbids

      const visiblePrice = computeVisiblePrice(leadingMaxAmount, maxAmountInput, startingPrice);

      await tx.bid.create({
        data: {
          auctionId,
          userId,
          maxAmount: maxAmountInput,
          visiblePriceSnapshot: visiblePrice,
          isLeading: false,
        },
      });

      await tx.auction.update({
        where: { id: auctionId },
        data: {
          currentPrice: visiblePrice,
          bidCount: { increment: 1 },
        },
      });

      await enqueueOutboxEvent(tx as unknown as PrismaClient, "OUTBID", {
        userId,
        auctionId,
        newPrice: visiblePrice,
      });

      return {
        success: true,
        message: "You have been outbid by a proxy bid",
        newCurrentPrice: visiblePrice,
        isLeading: false,
      };
    }

    // 7. New user outbids the leader
    const visiblePrice = computeVisiblePrice(maxAmountInput, leadingMaxAmount, startingPrice);

    // Previous leader loses isLeading
    await tx.bid.update({
      where: { id: leadingBid.id },
      data: { isLeading: false },
    });

    // New bid becomes the leader
    await tx.bid.create({
      data: {
        auctionId,
        userId,
        maxAmount: maxAmountInput,
        visiblePriceSnapshot: visiblePrice,
        isLeading: true,
      },
    });

    await tx.auction.update({
      where: { id: auctionId },
      data: {
        currentPrice: visiblePrice,
        bidCount: { increment: 1 },
      },
    });

    // Notify previous leader they were outbid
    await enqueueOutboxEvent(tx as unknown as PrismaClient, "OUTBID", {
      userId: leadingBid.userId,
      auctionId,
      newPrice: visiblePrice,
    });

    return {
      success: true,
      message: "You are now the highest bidder!",
      newCurrentPrice: visiblePrice,
      isLeading: true,
      outbidUserId: leadingBid.userId,
    };
  });
}

/**
 * If an auction is past its end time and still ACTIVE, finalize it.
 */
export async function finalizeAuctionIfNeeded(
  prisma: PrismaClient,
  auctionId: string,
): Promise<void> {
  const auction = await prisma.auction.findUnique({ where: { id: auctionId } });
  if (!auction || auction.status !== "ACTIVE" || new Date() < auction.endsAt) {
    return;
  }

  await prisma.auction.update({
    where: { id: auctionId },
    data: { status: "CLOSED" },
  });

  const winningBid = await prisma.bid.findFirst({
    where: { auctionId, isLeading: true },
    include: { user: true },
  });

  await enqueueOutboxEvent(prisma, "AUCTION_CLOSED", {
    auctionId,
    winnerId: winningBid?.userId ?? null,
    finalPrice: winningBid ? Number(winningBid.visiblePriceSnapshot) : null,
  });

  if (winningBid) {
    await prisma.notification.create({
      data: {
        userId: winningBid.userId,
        type: "WON",
        payload: {
          auctionId,
          finalPrice: Number(winningBid.visiblePriceSnapshot),
        },
      },
    });

    await prisma.notification.create({
      data: {
        userId: auction.sellerId,
        type: "SOLD",
        payload: {
          auctionId,
          finalPrice: Number(winningBid.visiblePriceSnapshot),
          winnerId: winningBid.userId,
        },
      },
    });

    await enqueueOutboxEvent(prisma, "WINNER_NOTIFICATION", {
      auctionId,
      userId: winningBid.userId,
    });

    await enqueueOutboxEvent(prisma, "SELLER_NOTIFICATION", {
      auctionId,
      userId: auction.sellerId,
    });
  }
}
