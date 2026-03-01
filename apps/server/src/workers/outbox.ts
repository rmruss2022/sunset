import type { PrismaClient, Prisma } from "@prisma/client";

export function startOutboxWorker(prisma: PrismaClient) {
  setInterval(async () => {
    try {
      const events = await prisma.outboxEvent.findMany({
        where: { processedAt: null },
        take: 10,
        orderBy: { createdAt: "asc" },
      });

      for (const event of events) {
        try {
          await processOutboxEvent(prisma, event);
          await prisma.outboxEvent.update({
            where: { id: event.id },
            data: { processedAt: new Date() },
          });
        } catch (e) {
          console.error("Outbox worker error processing event:", event.id, e);
        }
      }
    } catch (e) {
      console.error("Outbox worker poll error:", e);
    }
  }, 5000);
}

async function processOutboxEvent(
  prisma: PrismaClient,
  event: { id: string; eventType: string; payload: Prisma.JsonValue },
) {
  const payload = event.payload as Record<string, unknown>;

  switch (event.eventType) {
    case "OUTBID": {
      const { userId, auctionId, newPrice } = payload;
      if (typeof userId === "string") {
        await prisma.notification.create({
          data: {
            userId,
            type: "OUTBID",
            payload: { auctionId, newPrice } as Prisma.InputJsonValue,
          },
        });
      }
      break;
    }
    case "WINNER_NOTIFICATION": {
      const { userId, auctionId } = payload;
      if (typeof userId === "string") {
        console.log(`[Outbox] Winner notification: user=${userId} auction=${auctionId}`);
      }
      break;
    }
    case "SELLER_NOTIFICATION": {
      const { userId, auctionId } = payload;
      if (typeof userId === "string") {
        console.log(`[Outbox] Seller notification: user=${userId} auction=${auctionId}`);
      }
      break;
    }
    case "AUCTION_CLOSED": {
      const { auctionId, winnerId, finalPrice } = payload;
      console.log(
        `[Outbox] Auction closed: auction=${auctionId} winner=${winnerId} price=${finalPrice}`,
      );
      break;
    }
    default:
      console.log(`[Outbox] Unknown event type: ${event.eventType}`);
  }
}
