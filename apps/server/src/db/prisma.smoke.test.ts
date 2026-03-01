import { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { resetAuctionStore } from "./seed.js";

describe("prisma smoke", () => {
  if (!process.env.DATABASE_URL) {
    it.skip("DATABASE_URL not set", () => {});
    return;
  }

  const prisma = new PrismaClient();

  beforeAll(async () => {
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("can upsert and read the seed auction", async () => {
    const seeded = await resetAuctionStore(prisma);
    const fetched = await prisma.auction.findUnique({
      where: { id: seeded.id },
    });

    expect(fetched?.id).toBe(seeded.id);
  });
});

