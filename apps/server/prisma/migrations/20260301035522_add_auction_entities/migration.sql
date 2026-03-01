/*
  Warnings:

  - Added the required column `category` to the `Auction` table without a default value. This is not possible if the table is not empty.
  - Added the required column `condition` to the `Auction` table without a default value. This is not possible if the table is not empty.
  - Added the required column `currentPrice` to the `Auction` table without a default value. This is not possible if the table is not empty.
  - Added the required column `description` to the `Auction` table without a default value. This is not possible if the table is not empty.
  - Added the required column `sellerId` to the `Auction` table without a default value. This is not possible if the table is not empty.
  - Added the required column `startingPrice` to the `Auction` table without a default value. This is not possible if the table is not empty.
  - Added the required column `title` to the `Auction` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Auction" ADD COLUMN     "bidCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "brand" TEXT,
ADD COLUMN     "buyNowPrice" DECIMAL(10,2),
ADD COLUMN     "category" TEXT NOT NULL,
ADD COLUMN     "condition" TEXT NOT NULL,
ADD COLUMN     "currentPrice" DECIMAL(10,2) NOT NULL,
ADD COLUMN     "description" TEXT NOT NULL,
ADD COLUMN     "estimatedDeliveryMaxDays" INTEGER NOT NULL DEFAULT 7,
ADD COLUMN     "estimatedDeliveryMinDays" INTEGER NOT NULL DEFAULT 3,
ADD COLUMN     "handlingDays" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "imageUrls" TEXT[],
ADD COLUMN     "internationalShipping" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "itemLocationZip" TEXT NOT NULL DEFAULT '10001',
ADD COLUMN     "itemSpecifics" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "listingFormat" TEXT NOT NULL DEFAULT 'AUCTION',
ADD COLUMN     "model" TEXT,
ADD COLUMN     "paymentMethodLabel" TEXT NOT NULL DEFAULT 'PayPal, Credit Card',
ADD COLUMN     "reservePrice" DECIMAL(10,2),
ADD COLUMN     "returnsAccepted" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "returnsPolicyLabel" TEXT NOT NULL DEFAULT '30 days returns',
ADD COLUMN     "sellerId" UUID NOT NULL,
ADD COLUMN     "shippingCostMax" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "shippingCostMin" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "shippingCostPayer" TEXT NOT NULL DEFAULT 'BUYER',
ADD COLUMN     "shippingMode" TEXT NOT NULL DEFAULT 'SHIPPING_ONLY',
ADD COLUMN     "shippingService" TEXT NOT NULL DEFAULT 'Standard Shipping',
ADD COLUMN     "startingPrice" DECIMAL(10,2) NOT NULL,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN     "title" TEXT NOT NULL,
ADD COLUMN     "videoUrl" TEXT,
ADD COLUMN     "watchCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "year" INTEGER;

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "sellerRatingPercent" DOUBLE PRECISION NOT NULL DEFAULT 100.0,
    "sellerFeedbackCount" INTEGER NOT NULL DEFAULT 0,
    "sellerLocation" TEXT NOT NULL DEFAULT 'United States',
    "stripeCustomerId" TEXT,
    "stripePaymentMethodId" TEXT,
    "paymentVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Bid" (
    "id" UUID NOT NULL,
    "auctionId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "maxAmount" DECIMAL(10,2) NOT NULL,
    "visiblePriceSnapshot" DECIMAL(10,2),
    "isLeading" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Bid_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Watch" (
    "id" UUID NOT NULL,
    "auctionId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Watch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OutboxEvent" (
    "id" UUID NOT NULL,
    "eventType" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OutboxEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Bid_auctionId_idx" ON "Bid"("auctionId");

-- CreateIndex
CREATE INDEX "Bid_userId_idx" ON "Bid"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Watch_auctionId_userId_key" ON "Watch"("auctionId", "userId");

-- CreateIndex
CREATE INDEX "Notification_userId_idx" ON "Notification"("userId");

-- CreateIndex
CREATE INDEX "OutboxEvent_processedAt_idx" ON "OutboxEvent"("processedAt");

-- AddForeignKey
ALTER TABLE "Auction" ADD CONSTRAINT "Auction_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bid" ADD CONSTRAINT "Bid_auctionId_fkey" FOREIGN KEY ("auctionId") REFERENCES "Auction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bid" ADD CONSTRAINT "Bid_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Watch" ADD CONSTRAINT "Watch_auctionId_fkey" FOREIGN KEY ("auctionId") REFERENCES "Auction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Watch" ADD CONSTRAINT "Watch_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
