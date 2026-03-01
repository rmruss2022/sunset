import { PrismaClient } from "@prisma/client";

import { resetAuctionStore } from "../src/db/seed.js";

const prisma = new PrismaClient();

async function main() {
  const auction = await resetAuctionStore(prisma);
  console.log(`\nSeed auction #1: ${auction.id}`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error("Seed failed", error);
    await prisma.$disconnect();
    process.exit(1);
  });
