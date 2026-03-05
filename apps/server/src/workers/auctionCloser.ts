import type { PrismaClient } from "@prisma/client";
import { finalizeAuctionIfNeeded } from "../services/bidding.js";

/**
 * Polls every 30 seconds for ACTIVE auctions whose end time has passed
 * and finalizes them — marking CLOSED, determining the winner, and
 * enqueuing the Stripe charge + notification outbox events.
 */
export function startAuctionCloser(
  prisma: PrismaClient,
  emitUpdate: (auctionId: string) => void,
) {
  async function sweep() {
    try {
      const expired = await prisma.auction.findMany({
        where: { status: "ACTIVE", endsAt: { lte: new Date() } },
        select: { id: true },
      });

      for (const { id } of expired) {
        await finalizeAuctionIfNeeded(prisma, id);
        emitUpdate(id); // push real-time update to any connected browsers
        console.log(`[AuctionCloser] Finalized lot ${id}`);
      }
    } catch (e) {
      console.error("[AuctionCloser] Sweep error:", e);
    }
  }

  // Run once immediately on startup to catch any lots that closed while server was down
  sweep();
  setInterval(sweep, 30_000);
}
