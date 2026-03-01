import type { PrismaClient } from "@prisma/client";
import type { Request, Response } from "express";
import { initTRPC } from "@trpc/server";
import { verifyToken, COOKIE_NAME } from "./services/auth.js";
import { prisma } from "./db/prisma.js";

export interface Context {
  prisma: PrismaClient;
  req: Request;
  res: Response;
  currentUser: { userId: string; isAdmin: boolean } | null;
  emitAuctionUpdate?: (auctionId: string) => void;
}

export function createContext(
  { req, res }: { req: Request; res: Response },
  emitAuctionUpdate?: (auctionId: string) => void,
): Context {
  const token = (req as any).cookies?.[COOKIE_NAME] ?? null;
  const currentUser = token ? verifyToken(token) : null;
  return { prisma, req, res, currentUser, emitAuctionUpdate };
}

const t = initTRPC.context<Context>().create();

export const router = t.router;
export const procedure = t.procedure;
export const middleware = t.middleware;
