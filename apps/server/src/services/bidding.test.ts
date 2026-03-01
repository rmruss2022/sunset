import { describe, it, expect } from "vitest";
import {
  getBidIncrement,
  isAuctionOpen,
  computeVisiblePrice,
} from "./bidding.js";

describe("getBidIncrement", () => {
  it("returns 0.05 for price < 1", () => {
    expect(getBidIncrement(0.5)).toBe(0.05);
    expect(getBidIncrement(0.99)).toBe(0.05);
  });

  it("returns 0.25 for price 1-5", () => {
    expect(getBidIncrement(1.0)).toBe(0.25);
    expect(getBidIncrement(2.0)).toBe(0.25);
    expect(getBidIncrement(4.99)).toBe(0.25);
  });

  it("returns 0.50 for price 5-25", () => {
    expect(getBidIncrement(5.0)).toBe(0.5);
    expect(getBidIncrement(24.99)).toBe(0.5);
  });

  it("returns 1.00 for price 25-100", () => {
    expect(getBidIncrement(25)).toBe(1.0);
    expect(getBidIncrement(50)).toBe(1.0);
    expect(getBidIncrement(99.99)).toBe(1.0);
  });

  it("returns 2.50 for price 100-250", () => {
    expect(getBidIncrement(100)).toBe(2.5);
    expect(getBidIncrement(150)).toBe(2.5);
    expect(getBidIncrement(249.99)).toBe(2.5);
  });

  it("returns 5.00 for price 250-500", () => {
    expect(getBidIncrement(250)).toBe(5.0);
    expect(getBidIncrement(499.99)).toBe(5.0);
  });

  it("returns 10.00 for price 500-1000", () => {
    expect(getBidIncrement(500)).toBe(10.0);
    expect(getBidIncrement(999.99)).toBe(10.0);
  });

  it("returns 25.00 for price 1000-2500", () => {
    expect(getBidIncrement(1000)).toBe(25.0);
    expect(getBidIncrement(2499.99)).toBe(25.0);
  });

  it("returns 50.00 for price 2500-5000", () => {
    expect(getBidIncrement(2500)).toBe(50.0);
    expect(getBidIncrement(4999.99)).toBe(50.0);
  });

  it("returns 100.00 for price >= 5000", () => {
    expect(getBidIncrement(5000)).toBe(100.0);
    expect(getBidIncrement(10000)).toBe(100.0);
  });
});

describe("isAuctionOpen", () => {
  it("returns true for active auction ending in the future", () => {
    const auction = {
      endsAt: new Date(Date.now() + 60000),
      status: "ACTIVE",
    };
    expect(isAuctionOpen(auction)).toBe(true);
  });

  it("returns false for closed status", () => {
    const auction = {
      endsAt: new Date(Date.now() + 60000),
      status: "CLOSED",
    };
    expect(isAuctionOpen(auction)).toBe(false);
  });

  it("returns false for past endsAt", () => {
    const auction = {
      endsAt: new Date(Date.now() - 60000),
      status: "ACTIVE",
    };
    expect(isAuctionOpen(auction)).toBe(false);
  });

  it("returns false for draft status", () => {
    const auction = {
      endsAt: new Date(Date.now() + 60000),
      status: "DRAFT",
    };
    expect(isAuctionOpen(auction)).toBe(false);
  });

  it("uses custom now parameter", () => {
    const endsAt = new Date("2025-01-01T12:00:00Z");
    const auction = { endsAt, status: "ACTIVE" };
    expect(isAuctionOpen(auction, new Date("2025-01-01T11:00:00Z"))).toBe(true);
    expect(isAuctionOpen(auction, new Date("2025-01-01T13:00:00Z"))).toBe(false);
  });
});

describe("computeVisiblePrice", () => {
  it("returns startingPrice when no second bidder", () => {
    expect(computeVisiblePrice(100, null, 10)).toBe(10);
  });

  it("returns second + increment when leader max is higher", () => {
    // second=50, increment at 50 = 1.00, so 51.00
    expect(computeVisiblePrice(100, 50, 10)).toBe(51.0);
  });

  it("is capped at leader max when second is close", () => {
    // second=99, increment at 99 = 1.00, 99+1=100, min(100, 100)=100
    expect(computeVisiblePrice(100, 99, 10)).toBe(100.0);
  });

  it("returns leader max when second + increment exceeds leader", () => {
    // second=98, increment at 98 = 1.00, 98+1=99, min(100, 99)=99
    expect(computeVisiblePrice(100, 98, 10)).toBe(99.0);
  });

  it("handles small values correctly", () => {
    // second=0.50, increment = 0.05, so 0.55
    expect(computeVisiblePrice(10, 0.5, 0.25)).toBe(0.55);
  });

  it("rounds to 2 decimal places", () => {
    // second=3.00, increment = 0.25, so 3.25
    expect(computeVisiblePrice(50, 3.0, 1.0)).toBe(3.25);
  });

  it("handles equal leader and second max", () => {
    // second=100, increment at 100 = 2.50, 100+2.50=102.50, min(100, 102.50)=100
    expect(computeVisiblePrice(100, 100, 10)).toBe(100.0);
  });
});
