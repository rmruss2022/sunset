import { useState } from "react";
import { Link, useNavigate } from "react-router";

import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { useCurrentUser } from "../lib/userContext";
import { useToast } from "../lib/toast";
import { trpc } from "../lib/trpc";

const CATEGORIES = [
  "Electronics",
  "Cameras",
  "Watches",
  "Collectibles",
  "Sports",
  "Fashion",
  "Vehicles",
  "Home & Garden",
  "Toys & Hobbies",
  "Other",
];

const CONDITIONS = [
  { value: "NEW", label: "New" },
  { value: "LIKE_NEW", label: "Like New" },
  { value: "VERY_GOOD", label: "Very Good" },
  { value: "GOOD", label: "Good" },
  { value: "ACCEPTABLE", label: "Acceptable" },
  { value: "FOR_PARTS", label: "For Parts / Not Working" },
];

const DURATIONS = [
  { value: "1", label: "1 hour" },
  { value: "3", label: "3 hours" },
  { value: "24", label: "1 day" },
  { value: "72", label: "3 days" },
  { value: "120", label: "5 days" },
  { value: "168", label: "7 days" },
];

function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-[11px] tracking-[0.1em] uppercase text-ah-text-3">
        {label}
        {required && <span className="ml-1 text-ah-red/70">*</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-ah-text-3 mt-1">{hint}</p>}
    </div>
  );
}

export function CreateListingRoute() {
  const navigate = useNavigate();
  const { user } = useCurrentUser();
  const addToast = useToast();
  const createMutation = trpc.auction.create.useMutation({
    onSuccess: (data) => {
      addToast(`"${data.title}" listed successfully!`, "success");
      navigate(`/auction/${data.id}`);
    },
    onError: (err) => {
      addToast(err.message || "Failed to create listing", "error");
    },
  });

  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "",
    condition: "",
    brand: "",
    model: "",
    year: "",
    imageUrl: "",
    listingFormat: "AUCTION" as "AUCTION" | "BUY_IT_NOW" | "AUCTION_WITH_BUY_NOW",
    startingPrice: "",
    buyNowPrice: "",
    durationHours: "72",
    shippingCostPayer: "BUYER" as "BUYER" | "SELLER",
    shippingCostMin: "0",
    returnsAccepted: true,
  });

  const set = (key: keyof typeof form, value: string | boolean) =>
    setForm((f) => ({ ...f, [key]: value }));

  if (!user) {
    return (
      <div className="mx-auto max-w-2xl px-4 sm:px-6 py-24 text-center">
        <p className="font-display text-2xl text-ah-text mb-3">Sign in to list an item</p>
        <Link
          to="/login"
          className="text-xs tracking-widest uppercase text-ah-gold hover:text-ah-gold-bright transition-colors"
        >
          Log In &rarr;
        </Link>
      </div>
    );
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const imageUrls = form.imageUrl.trim()
      ? form.imageUrl
          .split(",")
          .map((u) => u.trim())
          .filter(Boolean)
      : [];

    createMutation.mutate({
      title: form.title,
      description: form.description,
      category: form.category,
      condition: form.condition,
      brand: form.brand || undefined,
      model: form.model || undefined,
      year: form.year ? parseInt(form.year) : undefined,
      imageUrls,
      listingFormat: form.listingFormat,
      startingPrice: parseFloat(form.startingPrice),
      buyNowPrice: form.buyNowPrice ? parseFloat(form.buyNowPrice) : undefined,
      durationHours: parseInt(form.durationHours),
      shippingCostPayer: form.shippingCostPayer,
      shippingCostMin: parseFloat(form.shippingCostMin) || 0,
      returnsAccepted: form.returnsAccepted,
    });
  };

  const isAuction =
    form.listingFormat === "AUCTION" ||
    form.listingFormat === "AUCTION_WITH_BUY_NOW";

  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 py-8">
      <div className="h-px bg-gradient-to-r from-ah-border-gold via-ah-border to-transparent mb-8" />

      <div className="mb-8">
        <button
          onClick={() => navigate(-1)}
          className="text-xs tracking-widest uppercase text-ah-text-3 hover:text-ah-text-2 transition-colors mb-4 flex items-center gap-1"
        >
          ← Back
        </button>
        <p className="text-[10px] tracking-[0.2em] uppercase text-ah-text-3 mb-1">New Lot</p>
        <h1 className="font-display text-3xl font-medium text-ah-text">Create Listing</h1>
        <p className="text-sm text-ah-text-2 mt-1">List an item for auction</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Item details */}
        <section className="border border-ah-border bg-ah-surface p-6 space-y-4">
          <h2 className="text-[10px] tracking-[0.16em] uppercase text-ah-text-3">Item Details</h2>

          <Field label="Title" required>
            <Input
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              placeholder="e.g. Vintage Canon AE-1 35mm Film Camera"
              required
              minLength={3}
              maxLength={200}
            />
          </Field>

          <Field label="Description" required>
            <Textarea
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="Describe the item's condition, history, included accessories…"
              required
              minLength={10}
              rows={4}
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Category" required>
              <Select
                value={form.category}
                onValueChange={(v) => set("category", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select…" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field label="Condition" required>
              <Select
                value={form.condition}
                onValueChange={(v) => set("condition", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select…" />
                </SelectTrigger>
                <SelectContent>
                  {CONDITIONS.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Field label="Brand">
              <Input
                value={form.brand}
                onChange={(e) => set("brand", e.target.value)}
                placeholder="e.g. Canon"
              />
            </Field>
            <Field label="Model">
              <Input
                value={form.model}
                onChange={(e) => set("model", e.target.value)}
                placeholder="e.g. AE-1"
              />
            </Field>
            <Field label="Year">
              <Input
                type="number"
                value={form.year}
                onChange={(e) => set("year", e.target.value)}
                placeholder="e.g. 1985"
                min={1800}
                max={2100}
              />
            </Field>
          </div>

          <Field
            label="Image URLs"
            hint="Comma-separated URLs. Leave blank to use a placeholder."
          >
            <Input
              value={form.imageUrl}
              onChange={(e) => set("imageUrl", e.target.value)}
              placeholder="https://example.com/image.jpg, https://…"
            />
          </Field>
        </section>

        {/* Pricing */}
        <section className="border border-ah-border bg-ah-surface p-6 space-y-4">
          <h2 className="text-[10px] tracking-[0.16em] uppercase text-ah-text-3">Pricing &amp; Format</h2>

          <Field label="Listing format" required>
            <Select
              value={form.listingFormat}
              onValueChange={(v) =>
                set(
                  "listingFormat",
                  v as "AUCTION" | "BUY_IT_NOW" | "AUCTION_WITH_BUY_NOW",
                )
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="AUCTION">Auction</SelectItem>
                <SelectItem value="BUY_IT_NOW">Buy It Now</SelectItem>
                <SelectItem value="AUCTION_WITH_BUY_NOW">
                  Auction + Buy It Now
                </SelectItem>
              </SelectContent>
            </Select>
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field
              label={isAuction ? "Starting price ($)" : "Price ($)"}
              required
            >
              <Input
                type="number"
                value={form.startingPrice}
                onChange={(e) => set("startingPrice", e.target.value)}
                placeholder="0.99"
                min={0.01}
                step={0.01}
                required
              />
            </Field>

            {(form.listingFormat === "BUY_IT_NOW" ||
              form.listingFormat === "AUCTION_WITH_BUY_NOW") && (
              <Field label="Buy It Now price ($)">
                <Input
                  type="number"
                  value={form.buyNowPrice}
                  onChange={(e) => set("buyNowPrice", e.target.value)}
                  placeholder="Optional"
                  min={0.01}
                  step={0.01}
                />
              </Field>
            )}

            {isAuction && (
              <Field label="Duration">
                <Select
                  value={form.durationHours}
                  onValueChange={(v) => set("durationHours", v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DURATIONS.map((d) => (
                      <SelectItem key={d.value} value={d.value}>
                        {d.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            )}
          </div>
        </section>

        {/* Shipping */}
        <section className="border border-ah-border bg-ah-surface p-6 space-y-4">
          <h2 className="text-[10px] tracking-[0.16em] uppercase text-ah-text-3">Shipping &amp; Returns</h2>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Shipping paid by">
              <Select
                value={form.shippingCostPayer}
                onValueChange={(v) =>
                  set("shippingCostPayer", v as "BUYER" | "SELLER")
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BUYER">Buyer pays shipping</SelectItem>
                  <SelectItem value="SELLER">Free shipping (seller pays)</SelectItem>
                </SelectContent>
              </Select>
            </Field>

            {form.shippingCostPayer === "BUYER" && (
              <Field label="Shipping cost ($)">
                <Input
                  type="number"
                  value={form.shippingCostMin}
                  onChange={(e) => set("shippingCostMin", e.target.value)}
                  placeholder="0.00"
                  min={0}
                  step={0.01}
                />
              </Field>
            )}
          </div>

          <Field label="Returns">
            <div className="flex items-center gap-3 mt-1">
              <button
                type="button"
                onClick={() => set("returnsAccepted", true)}
                className={`px-4 py-2 text-xs tracking-[0.1em] uppercase font-medium border transition-colors ${
                  form.returnsAccepted
                    ? "border-ah-gold text-ah-gold bg-ah-gold/10"
                    : "border-ah-border text-ah-text-2 hover:border-ah-border-gold hover:text-ah-text"
                }`}
              >
                Accepted (30 days)
              </button>
              <button
                type="button"
                onClick={() => set("returnsAccepted", false)}
                className={`px-4 py-2 text-xs tracking-[0.1em] uppercase font-medium border transition-colors ${
                  !form.returnsAccepted
                    ? "border-ah-red/50 text-ah-red bg-ah-red/10"
                    : "border-ah-border text-ah-text-2 hover:border-ah-border-gold hover:text-ah-text"
                }`}
              >
                No returns
              </button>
            </div>
          </Field>
        </section>

        {/* Submit */}
        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="text-xs tracking-widest uppercase text-ah-text-3 hover:text-ah-text-2 transition-colors"
          >
            Cancel
          </button>
          <Button
            type="submit"
            disabled={
              createMutation.isPending ||
              !form.title ||
              !form.description ||
              !form.category ||
              !form.condition ||
              !form.startingPrice
            }
            className="px-8"
          >
            {createMutation.isPending ? "Listing…" : "List Item"}
          </Button>
        </div>
      </form>
    </div>
  );
}
