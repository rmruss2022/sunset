export interface User {
  id: string;
  displayName: string;
  sellerRatingPercent: number;
  sellerFeedbackCount: number;
  sellerLocation: string;
  paymentVerified: boolean;
}

export interface AuctionSummary {
  id: string;
  title: string;
  category: string;
  condition: string;
  brand?: string;
  imageUrls: string[];
  listingFormat: string;
  startingPrice: number;
  currentPrice: number;
  buyNowPrice?: number;
  endsAt: string;
  status: string;
  bidCount: number;
  watchCount: number;
  sellerId: string;
  sellerDisplayName: string;
  sellerRatingPercent: number;
  sellerFeedbackCount: number;
  sellerLocation: string;
  shippingMode: string;
  shippingCostPayer: string;
  shippingCostMin: number;
  shippingCostMax: number;
  returnsAccepted: boolean;
  returnsPolicyLabel: string;
}

export interface AuctionDetail extends AuctionSummary {
  description: string;
  model?: string;
  year?: number;
  itemSpecifics: Record<string, string>;
  videoUrl?: string;
  shippingService: string;
  handlingDays: number;
  estimatedDeliveryMinDays: number;
  estimatedDeliveryMaxDays: number;
  itemLocationZip: string;
  internationalShipping: boolean;
  paymentMethodLabel: string;
  bids: BidRecord[];
  isWatched?: boolean;
}

export interface BidRecord {
  id: string;
  userId: string;
  userDisplayName: string;
  visiblePriceSnapshot: number;
  createdAt: string;
  isLeading: boolean;
}
