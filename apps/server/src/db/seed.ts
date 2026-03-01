import type { PrismaClient } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";

export const SEED_AUCTION_ID = "00000000-0000-0000-0000-000000000001";

// Deterministic UUIDs for idempotent upserts
const USER_IDS = {
  alice: "10000000-0000-0000-0000-000000000001",
  bob: "10000000-0000-0000-0000-000000000002",
  carol: "10000000-0000-0000-0000-000000000003",
  dave: "10000000-0000-0000-0000-000000000004",
  eve: "10000000-0000-0000-0000-000000000005",
} as const;

const AUCTION_IDS = {
  canonCamera: SEED_AUCTION_ID,
  macbookPro: "20000000-0000-0000-0000-000000000002",
  rolexSub: "20000000-0000-0000-0000-000000000003",
  mantleCard: "20000000-0000-0000-0000-000000000004",
  jordans: "20000000-0000-0000-0000-000000000005",
  trekBike: "20000000-0000-0000-0000-000000000006",
  sonyCamera: "20000000-0000-0000-0000-000000000007",
  levisJeans: "20000000-0000-0000-0000-000000000008",
} as const;

const BID_IDS = {
  canon1: "30000000-0000-0000-0000-000000000001",
  canon2: "30000000-0000-0000-0000-000000000002",
  canon3: "30000000-0000-0000-0000-000000000003",
  macbook1: "30000000-0000-0000-0000-000000000004",
  macbook2: "30000000-0000-0000-0000-000000000005",
  rolex1: "30000000-0000-0000-0000-000000000006",
  rolex2: "30000000-0000-0000-0000-000000000007",
  rolex3: "30000000-0000-0000-0000-000000000008",
  rolex4: "30000000-0000-0000-0000-000000000009",
  rolex5: "30000000-0000-0000-0000-000000000010",
  mantle1: "30000000-0000-0000-0000-000000000011",
  mantle2: "30000000-0000-0000-0000-000000000012",
  mantle3: "30000000-0000-0000-0000-000000000013",
  mantle4: "30000000-0000-0000-0000-000000000014",
  jordan1: "30000000-0000-0000-0000-000000000015",
  jordan2: "30000000-0000-0000-0000-000000000016",
  sony1: "30000000-0000-0000-0000-000000000017",
  levis1: "30000000-0000-0000-0000-000000000018",
  levis2: "30000000-0000-0000-0000-000000000019",
  levis3: "30000000-0000-0000-0000-000000000020",
} as const;

const WATCH_IDS = {
  carol_canon: "40000000-0000-0000-0000-000000000001",
  carol_macbook: "40000000-0000-0000-0000-000000000002",
  carol_rolex: "40000000-0000-0000-0000-000000000003",
  dave_macbook: "40000000-0000-0000-0000-000000000004",
  dave_mantle: "40000000-0000-0000-0000-000000000005",
  dave_jordans: "40000000-0000-0000-0000-000000000006",
} as const;

function hoursFromNow(hours: number): Date {
  return new Date(Date.now() + hours * 60 * 60 * 1000);
}

function minutesFromNow(minutes: number): Date {
  return new Date(Date.now() + minutes * 60 * 1000);
}

export async function resetAuctionStore(prisma: PrismaClient) {
  // Clean in dependency order
  await prisma.notification.deleteMany();
  await prisma.outboxEvent.deleteMany();
  await prisma.watch.deleteMany();
  await prisma.bid.deleteMany();
  await prisma.auction.deleteMany();
  await prisma.user.deleteMany();

  // --- Users ---
  const users = [
    {
      id: USER_IDS.alice,
      email: "alice@example.com",
      displayName: "Alice Chen",
      sellerRatingPercent: 99.2,
      sellerFeedbackCount: 847,
      sellerLocation: "San Francisco, CA",
      paymentVerified: true,
    },
    {
      id: USER_IDS.bob,
      email: "bob@example.com",
      displayName: "Bob Martinez",
      sellerRatingPercent: 98.7,
      sellerFeedbackCount: 1203,
      sellerLocation: "Austin, TX",
      paymentVerified: true,
    },
    {
      id: USER_IDS.carol,
      email: "carol@example.com",
      displayName: "Carol Williams",
      sellerRatingPercent: 100.0,
      sellerFeedbackCount: 12,
      sellerLocation: "New York, NY",
      paymentVerified: true,
    },
    {
      id: USER_IDS.dave,
      email: "dave@example.com",
      displayName: "Dave Johnson",
      sellerRatingPercent: 97.5,
      sellerFeedbackCount: 34,
      sellerLocation: "Chicago, IL",
      paymentVerified: false,
    },
    {
      id: USER_IDS.eve,
      email: "eve@example.com",
      displayName: "Eve Davis",
      sellerRatingPercent: 99.8,
      sellerFeedbackCount: 2341,
      sellerLocation: "Seattle, WA",
      paymentVerified: true,
    },
  ];

  for (const u of users) {
    await prisma.user.upsert({
      where: { id: u.id },
      create: u,
      update: u,
    });
  }

  // --- Auctions ---
  const auctions = [
    {
      id: AUCTION_IDS.canonCamera,
      title: "Vintage Canon AE-1 Program 35mm SLR Camera with 50mm f/1.8 Lens",
      description:
        "Classic Canon AE-1 Program in excellent working condition. Shutter fires accurately at all speeds. Light meter is responsive and accurate. Comes with the original Canon FD 50mm f/1.8 lens (no haze, fungus, or separation). Minor cosmetic wear consistent with age. Film door seal replaced. Includes original leather case and strap. A true collector's piece that still shoots beautiful photos.",
      category: "Cameras & Photo",
      condition: "Good",
      brand: "Canon",
      model: "AE-1 Program",
      year: 1984,
      itemSpecifics: { filmFormat: "35mm", lensMount: "Canon FD", shutterType: "Electronically-controlled cloth focal-plane" },
      imageUrls: [
        "https://images.unsplash.com/photo-1495707902641-75cac588d2e9?w=800",
        "https://images.unsplash.com/photo-1606986628253-3a8f1d0b8b0c?w=800",
      ],
      listingFormat: "AUCTION",
      startingPrice: new Decimal("45.00"),
      currentPrice: new Decimal("120.00"),
      reservePrice: new Decimal("100.00"),
      endsAt: hoursFromNow(48),
      status: "ACTIVE",
      sellerId: USER_IDS.alice,
      shippingCostMin: new Decimal("12.99"),
      shippingCostMax: new Decimal("12.99"),
      itemLocationZip: "94102",
      bidCount: 3,
      watchCount: 1,
    },
    {
      id: AUCTION_IDS.macbookPro,
      title: 'Apple MacBook Pro 14" M3 Pro 18GB 512GB Space Black - Like New',
      description:
        "Selling my MacBook Pro 14-inch with M3 Pro chip. Purchased in January 2024, used lightly for about 3 months before upgrading to M3 Max. Battery cycle count is only 47. AppleCare+ active until January 2027. Screen is flawless — no scratches or dead pixels. Includes original box, charger (MagSafe 3), and USB-C cable. Factory reset and ready for new owner.",
      category: "Electronics",
      condition: "Like New",
      brand: "Apple",
      model: "MacBook Pro 14-inch M3 Pro",
      year: 2024,
      itemSpecifics: { processor: "M3 Pro", ram: "18GB", storage: "512GB SSD", screenSize: "14.2 inches", color: "Space Black" },
      imageUrls: [
        "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800",
      ],
      listingFormat: "AUCTION",
      startingPrice: new Decimal("800.00"),
      currentPrice: new Decimal("950.00"),
      buyNowPrice: new Decimal("1400.00"),
      endsAt: hoursFromNow(72),
      status: "ACTIVE",
      sellerId: USER_IDS.bob,
      shippingCostMin: new Decimal("0.00"),
      shippingCostMax: new Decimal("0.00"),
      shippingCostPayer: "SELLER",
      shippingService: "FedEx Ground",
      itemLocationZip: "73301",
      handlingDays: 1,
      estimatedDeliveryMinDays: 3,
      estimatedDeliveryMaxDays: 5,
      bidCount: 2,
      watchCount: 2,
    },
    {
      id: AUCTION_IDS.rolexSub,
      title: "Rolex Submariner 16800 Vintage 1985 — Full Kit, Serviced",
      description:
        "Rolex Submariner Date ref. 16800 from 1985. Transitional model with the sapphire crystal and quickset date. Recently serviced by an authorized Rolex service center (2023) with all gaskets replaced — waterproof tested. Dial is original glossy black with matching tritium plots and hands that have developed a warm cream patina. Bezel insert shows honest wear. Running within COSC spec at +2s/day. Comes with inner/outer boxes, warranty papers (serial matching), and service receipt.",
      category: "Watches",
      condition: "Good",
      brand: "Rolex",
      model: "Submariner 16800",
      year: 1985,
      itemSpecifics: { movement: "Caliber 3035", caseMaterial: "Stainless Steel", caseSize: "40mm", dialColor: "Black", waterResistance: "300m" },
      imageUrls: [
        "https://images.unsplash.com/photo-1587836374828-4dbafa94cf0e?w=800",
      ],
      listingFormat: "AUCTION",
      startingPrice: new Decimal("2000.00"),
      currentPrice: new Decimal("3200.00"),
      reservePrice: new Decimal("5000.00"),
      endsAt: hoursFromNow(2),
      status: "ACTIVE",
      sellerId: USER_IDS.eve,
      shippingCostMin: new Decimal("24.99"),
      shippingCostMax: new Decimal("24.99"),
      shippingService: "FedEx Priority Overnight",
      itemLocationZip: "98101",
      handlingDays: 1,
      estimatedDeliveryMinDays: 1,
      estimatedDeliveryMaxDays: 2,
      bidCount: 5,
      watchCount: 1,
    },
    {
      id: AUCTION_IDS.mantleCard,
      title: "1965 Topps #350 Mickey Mantle PSA 4 VG-EX — Centered, Great Eye Appeal",
      description:
        "1965 Topps Mickey Mantle #350 graded PSA 4 VG-EX. For a 4, this card presents beautifully with strong centering (55/45 LR, 52/48 TB), bright colors, and clean surfaces. Corners show light rounding. One very minor surface crease visible only under side lighting. A solid mid-grade example of this iconic Mantle card from the mid-1960s Topps run. Case is in excellent condition with no scratches.",
      category: "Collectibles & Art",
      condition: "Good",
      brand: "Topps",
      model: "Mickey Mantle #350",
      year: 1965,
      itemSpecifics: { sport: "Baseball", grade: "PSA 4 VG-EX", cardNumber: "#350", set: "1965 Topps" },
      imageUrls: [
        "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=800",
      ],
      listingFormat: "AUCTION",
      startingPrice: new Decimal("500.00"),
      currentPrice: new Decimal("850.00"),
      reservePrice: new Decimal("750.00"),
      endsAt: hoursFromNow(24),
      status: "ACTIVE",
      sellerId: USER_IDS.alice,
      shippingCostMin: new Decimal("8.99"),
      shippingCostMax: new Decimal("8.99"),
      shippingService: "USPS Priority Mail",
      itemLocationZip: "94102",
      bidCount: 4,
      watchCount: 1,
    },
    {
      id: AUCTION_IDS.jordans,
      title: "Nike Air Jordan 1 High OG 'Chicago' 1985 — Vintage Original, Size 10",
      description:
        "Original 1985 Nike Air Jordan 1 'Chicago' colorway in size 10 US. These are NOT retros — these are the real deal from 1985. Uppers are intact with age-appropriate creasing. Soles show wear but still have tread. Wings logo is clean and clear. Tongue tag intact. No restoration attempted. An increasingly rare piece of sneaker history. Comes with replacement box (original long gone).",
      category: "Fashion",
      condition: "Good",
      brand: "Nike",
      model: "Air Jordan 1 High OG Chicago",
      year: 1985,
      itemSpecifics: { size: "10 US", color: "White/Black-Varsity Red", style: "4281" },
      imageUrls: [
        "https://images.unsplash.com/photo-1556906781-9a412961c28c?w=800",
      ],
      listingFormat: "AUCTION",
      startingPrice: new Decimal("300.00"),
      currentPrice: new Decimal("450.00"),
      endsAt: hoursFromNow(36),
      status: "ACTIVE",
      sellerId: USER_IDS.bob,
      shippingCostMin: new Decimal("15.99"),
      shippingCostMax: new Decimal("15.99"),
      itemLocationZip: "73301",
      bidCount: 2,
      watchCount: 1,
    },
    {
      id: AUCTION_IDS.trekBike,
      title: "Trek Madone SLR 7 Road Bike 2022 — 56cm, Shimano Ultegra Di2, Carbon",
      description:
        "Trek Madone SLR 7 in Radioactive Red/Trek Black. Size 56cm. Full Shimano Ultegra Di2 12-speed electronic shifting. Bontrager Aeolus RSL 51 carbon wheels. IsoSpeed decoupler front and rear for incredible compliance on rough roads. Only 2,100 miles — been a garage queen since I got a gravel bike. No crashes, no scratches beyond a couple tiny chain slap marks on the chainstay (shown in photos). Freshly tuned by LBS with new cables, brake pads, and chain.",
      category: "Sporting Goods",
      condition: "Like New",
      brand: "Trek",
      model: "Madone SLR 7",
      year: 2022,
      itemSpecifics: { frameSize: "56cm", frameMaterial: "800 Series OCLV Carbon", groupset: "Shimano Ultegra Di2 R8170", wheels: "Bontrager Aeolus RSL 51" },
      imageUrls: [
        "https://images.unsplash.com/photo-1485965120184-e220f721d03e?w=800",
      ],
      listingFormat: "AUCTION",
      startingPrice: new Decimal("3000.00"),
      currentPrice: new Decimal("3000.00"),
      endsAt: hoursFromNow(96),
      status: "ACTIVE",
      sellerId: USER_IDS.eve,
      shippingMode: "LOCAL_PICKUP",
      shippingCostMin: new Decimal("0.00"),
      shippingCostMax: new Decimal("0.00"),
      itemLocationZip: "98101",
      bidCount: 0,
      watchCount: 0,
    },
    {
      id: AUCTION_IDS.sonyCamera,
      title: "Sony A7R V Mirrorless Camera Body — 61MP, AI AF, Low Shutter Count",
      description:
        "Sony Alpha A7R V full-frame mirrorless (ILCE-7RM5). Only 4,200 shutter actuations. AI-based autofocus with real-time recognition for people, animals, birds, insects, cars, and trains. 8K oversampled 4K video. 8-stop IBIS. Purchased new from B&H in September 2023. Always used with a screen protector (included). Comes with original box, body cap, charger, two batteries (one original, one Wasabi), and shoulder strap.",
      category: "Cameras & Photo",
      condition: "Like New",
      brand: "Sony",
      model: "A7R V (ILCE-7RM5)",
      year: 2023,
      itemSpecifics: { sensorType: "Full Frame CMOS", megapixels: "61MP", mount: "Sony E", videoCapability: "8K 24p / 4K 60p" },
      imageUrls: [
        "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800",
      ],
      listingFormat: "AUCTION",
      startingPrice: new Decimal("2500.00"),
      currentPrice: new Decimal("2650.00"),
      buyNowPrice: new Decimal("3200.00"),
      endsAt: minutesFromNow(30),
      status: "ACTIVE",
      sellerId: USER_IDS.dave,
      shippingCostMin: new Decimal("0.00"),
      shippingCostMax: new Decimal("0.00"),
      shippingCostPayer: "SELLER",
      shippingService: "UPS Ground",
      itemLocationZip: "60601",
      handlingDays: 1,
      estimatedDeliveryMinDays: 2,
      estimatedDeliveryMaxDays: 5,
      bidCount: 1,
      watchCount: 0,
    },
    {
      id: AUCTION_IDS.levisJeans,
      title: "Vintage Levi's 501 Jeans 1980s — 32x34, Made in USA, Dark Wash",
      description:
        "Vintage Levi's 501 button-fly jeans from the mid-1980s. Made in USA with the classic red tab and leather patch (slightly worn). Selvedge denim with a beautiful dark indigo fade pattern. No holes, rips, or stains. Button fly works perfectly. These have that perfectly broken-in feel that only decades of real wear can create. Tagged 34x36 but measure closer to 32x34 after shrinkage (measurements in photos).",
      category: "Fashion",
      condition: "Good",
      brand: "Levi's",
      model: "501",
      year: 1985,
      itemSpecifics: { waist: "32", inseam: "34", rise: "High Rise", closure: "Button Fly", madeIn: "USA" },
      imageUrls: [
        "https://images.unsplash.com/photo-1542272604-787c3835535d?w=800",
      ],
      listingFormat: "AUCTION",
      startingPrice: new Decimal("80.00"),
      currentPrice: new Decimal("95.00"),
      endsAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // ended 2 hours ago
      status: "CLOSED",
      sellerId: USER_IDS.carol,
      shippingCostMin: new Decimal("9.99"),
      shippingCostMax: new Decimal("9.99"),
      shippingService: "USPS Priority Mail",
      itemLocationZip: "10001",
      bidCount: 3,
      watchCount: 0,
    },
  ];

  for (const a of auctions) {
    await prisma.auction.upsert({
      where: { id: a.id },
      create: a,
      update: a,
    });
  }

  // --- Bids ---
  // Each auction's bid history, chronologically ordered

  const bids = [
    // Canon AE-1: 3 bids → currentPrice $120
    { id: BID_IDS.canon1, auctionId: AUCTION_IDS.canonCamera, userId: USER_IDS.carol, maxAmount: new Decimal("65.00"), visiblePriceSnapshot: new Decimal("65.00"), isLeading: false, createdAt: new Date(Date.now() - 36 * 60 * 60 * 1000) },
    { id: BID_IDS.canon2, auctionId: AUCTION_IDS.canonCamera, userId: USER_IDS.dave, maxAmount: new Decimal("90.00"), visiblePriceSnapshot: new Decimal("70.00"), isLeading: false, createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    { id: BID_IDS.canon3, auctionId: AUCTION_IDS.canonCamera, userId: USER_IDS.carol, maxAmount: new Decimal("140.00"), visiblePriceSnapshot: new Decimal("120.00"), isLeading: true, createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000) },

    // MacBook Pro: 2 bids → currentPrice $950
    { id: BID_IDS.macbook1, auctionId: AUCTION_IDS.macbookPro, userId: USER_IDS.carol, maxAmount: new Decimal("900.00"), visiblePriceSnapshot: new Decimal("900.00"), isLeading: false, createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000) },
    { id: BID_IDS.macbook2, auctionId: AUCTION_IDS.macbookPro, userId: USER_IDS.dave, maxAmount: new Decimal("1050.00"), visiblePriceSnapshot: new Decimal("950.00"), isLeading: true, createdAt: new Date(Date.now() - 30 * 60 * 60 * 1000) },

    // Rolex Submariner: 5 bids → currentPrice $3200
    { id: BID_IDS.rolex1, auctionId: AUCTION_IDS.rolexSub, userId: USER_IDS.carol, maxAmount: new Decimal("2200.00"), visiblePriceSnapshot: new Decimal("2200.00"), isLeading: false, createdAt: new Date(Date.now() - 60 * 60 * 60 * 1000) },
    { id: BID_IDS.rolex2, auctionId: AUCTION_IDS.rolexSub, userId: USER_IDS.dave, maxAmount: new Decimal("2500.00"), visiblePriceSnapshot: new Decimal("2300.00"), isLeading: false, createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000) },
    { id: BID_IDS.rolex3, auctionId: AUCTION_IDS.rolexSub, userId: USER_IDS.alice, maxAmount: new Decimal("2800.00"), visiblePriceSnapshot: new Decimal("2600.00"), isLeading: false, createdAt: new Date(Date.now() - 36 * 60 * 60 * 1000) },
    { id: BID_IDS.rolex4, auctionId: AUCTION_IDS.rolexSub, userId: USER_IDS.bob, maxAmount: new Decimal("3000.00"), visiblePriceSnapshot: new Decimal("2900.00"), isLeading: false, createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    { id: BID_IDS.rolex5, auctionId: AUCTION_IDS.rolexSub, userId: USER_IDS.dave, maxAmount: new Decimal("3500.00"), visiblePriceSnapshot: new Decimal("3200.00"), isLeading: true, createdAt: new Date(Date.now() - 8 * 60 * 60 * 1000) },

    // Mantle Card: 4 bids → currentPrice $850
    { id: BID_IDS.mantle1, auctionId: AUCTION_IDS.mantleCard, userId: USER_IDS.dave, maxAmount: new Decimal("600.00"), visiblePriceSnapshot: new Decimal("600.00"), isLeading: false, createdAt: new Date(Date.now() - 72 * 60 * 60 * 1000) },
    { id: BID_IDS.mantle2, auctionId: AUCTION_IDS.mantleCard, userId: USER_IDS.bob, maxAmount: new Decimal("700.00"), visiblePriceSnapshot: new Decimal("650.00"), isLeading: false, createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000) },
    { id: BID_IDS.mantle3, auctionId: AUCTION_IDS.mantleCard, userId: USER_IDS.carol, maxAmount: new Decimal("800.00"), visiblePriceSnapshot: new Decimal("750.00"), isLeading: false, createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    { id: BID_IDS.mantle4, auctionId: AUCTION_IDS.mantleCard, userId: USER_IDS.dave, maxAmount: new Decimal("950.00"), visiblePriceSnapshot: new Decimal("850.00"), isLeading: true, createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000) },

    // Air Jordans: 2 bids → currentPrice $450
    { id: BID_IDS.jordan1, auctionId: AUCTION_IDS.jordans, userId: USER_IDS.alice, maxAmount: new Decimal("400.00"), visiblePriceSnapshot: new Decimal("400.00"), isLeading: false, createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000) },
    { id: BID_IDS.jordan2, auctionId: AUCTION_IDS.jordans, userId: USER_IDS.carol, maxAmount: new Decimal("500.00"), visiblePriceSnapshot: new Decimal("450.00"), isLeading: true, createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000) },

    // Sony A7R V: 1 bid → currentPrice $2650 (closing soon!)
    { id: BID_IDS.sony1, auctionId: AUCTION_IDS.sonyCamera, userId: USER_IDS.bob, maxAmount: new Decimal("2800.00"), visiblePriceSnapshot: new Decimal("2650.00"), isLeading: true, createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000) },

    // Levi's 501: 3 bids → currentPrice $95 (closed)
    { id: BID_IDS.levis1, auctionId: AUCTION_IDS.levisJeans, userId: USER_IDS.alice, maxAmount: new Decimal("85.00"), visiblePriceSnapshot: new Decimal("85.00"), isLeading: false, createdAt: new Date(Date.now() - 72 * 60 * 60 * 1000) },
    { id: BID_IDS.levis2, auctionId: AUCTION_IDS.levisJeans, userId: USER_IDS.dave, maxAmount: new Decimal("92.00"), visiblePriceSnapshot: new Decimal("90.00"), isLeading: false, createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000) },
    { id: BID_IDS.levis3, auctionId: AUCTION_IDS.levisJeans, userId: USER_IDS.alice, maxAmount: new Decimal("105.00"), visiblePriceSnapshot: new Decimal("95.00"), isLeading: true, createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000) },
  ];

  for (const b of bids) {
    await prisma.bid.upsert({
      where: { id: b.id },
      create: b,
      update: b,
    });
  }

  // --- Watches ---
  const watches = [
    { id: WATCH_IDS.carol_canon, auctionId: AUCTION_IDS.canonCamera, userId: USER_IDS.carol },
    { id: WATCH_IDS.carol_macbook, auctionId: AUCTION_IDS.macbookPro, userId: USER_IDS.carol },
    { id: WATCH_IDS.carol_rolex, auctionId: AUCTION_IDS.rolexSub, userId: USER_IDS.carol },
    { id: WATCH_IDS.dave_macbook, auctionId: AUCTION_IDS.macbookPro, userId: USER_IDS.dave },
    { id: WATCH_IDS.dave_mantle, auctionId: AUCTION_IDS.mantleCard, userId: USER_IDS.dave },
    { id: WATCH_IDS.dave_jordans, auctionId: AUCTION_IDS.jordans, userId: USER_IDS.dave },
  ];

  for (const w of watches) {
    await prisma.watch.upsert({
      where: { id: w.id },
      create: w,
      update: w,
    });
  }

  console.log("Seed complete:");
  console.log(`  ${users.length} users`);
  console.log(`  ${auctions.length} auctions`);
  console.log(`  ${bids.length} bids`);
  console.log(`  ${watches.length} watches`);

  return prisma.auction.findUniqueOrThrow({ where: { id: SEED_AUCTION_ID } });
}
