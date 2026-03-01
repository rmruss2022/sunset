import type { PrismaClient } from "@prisma/client";
import { initTRPC } from "@trpc/server";

export interface Context {
  prisma: PrismaClient;
  emitAuctionUpdate?: (auctionId: string) => void;
}

const t = initTRPC.context<Context>().create();

export const router = t.router;
export const procedure = t.procedure;
export const middleware = t.middleware;
