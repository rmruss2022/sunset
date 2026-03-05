import type { PrismaClient, Prisma } from "@prisma/client";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "sk_test_placeholder", {
  apiVersion: "2025-02-24.acacia" as any,
});

/** Platform fee taken from each sale (10%) */
const PLATFORM_FEE_RATE = 0.1;

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
          console.error("[Outbox] Error processing event:", event.id, e);
        }
      }
    } catch (e) {
      console.error("[Outbox] Poll error:", e);
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

    case "AUCTION_CLOSED": {
      const {
        auctionId,
        winnerId,
        finalPrice,
        winnerCustomerId,
        winnerPaymentMethodId,
        sellerConnectAccountId,
      } = payload;

      if (!winnerId || finalPrice === null || finalPrice === undefined) {
        console.log(`[Outbox] Lot ${auctionId} closed with no winning bid — no charge.`);
        break;
      }

      if (!winnerPaymentMethodId || !winnerCustomerId) {
        console.warn(
          `[Outbox] Winner ${winnerId} has no payment method on file — charge skipped for lot ${auctionId}.`,
        );
        break;
      }

      const amountCents = Math.round(Number(finalPrice) * 100);
      const feeCents = Math.round(amountCents * PLATFORM_FEE_RATE);

      const intentParams: Stripe.PaymentIntentCreateParams = {
        amount: amountCents,
        currency: "usd",
        customer: winnerCustomerId as string,
        payment_method: winnerPaymentMethodId as string,
        confirm: true,
        off_session: true,
        description: `The Estate Room — Lot ${auctionId}`,
        metadata: {
          auctionId: String(auctionId),
          winnerId: String(winnerId),
        },
      };

      // Route proceeds to seller's Connect account, keeping platform fee
      if (sellerConnectAccountId) {
        intentParams.transfer_data = {
          destination: sellerConnectAccountId as string,
        };
        intentParams.application_fee_amount = feeCents;
      }

      try {
        const pi = await stripe.paymentIntents.create(intentParams, {
          idempotencyKey: `auction-close-${auctionId}`,
        });
        console.log(
          `[Outbox] Charged winner ${winnerId} $${(amountCents / 100).toFixed(2)} ` +
          `for lot ${auctionId} — PaymentIntent ${pi.id} (${pi.status})`,
        );
      } catch (err: any) {
        // Log the failure but don't re-throw — charge failures (e.g. declined card)
        // should not block other outbox events. In production you'd alert the winner.
        console.error(
          `[Outbox] Stripe charge FAILED for lot ${auctionId} / winner ${winnerId}: ${err.message}`,
        );
      }
      break;
    }

    case "WINNER_NOTIFICATION": {
      const { userId, auctionId } = payload;
      if (typeof userId === "string") {
        console.log(`[Outbox] Winner notification queued: user=${userId} lot=${auctionId}`);
        // Email/SMS integration point
      }
      break;
    }

    case "SELLER_NOTIFICATION": {
      const { userId, auctionId } = payload;
      if (typeof userId === "string") {
        console.log(`[Outbox] Seller notification queued: user=${userId} lot=${auctionId}`);
        // Email/SMS integration point
      }
      break;
    }

    default:
      console.log(`[Outbox] Unknown event type: ${event.eventType}`);
  }
}
