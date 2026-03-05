import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { ChevronLeft, Star, Package, Eye, Gavel, MapPin } from "lucide-react";
import { trpc } from "../lib/trpc";
import { useCurrentUser } from "../lib/userContext";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { CountdownTimer } from "../components/auction/CountdownTimer";
import { PaymentTab } from "../components/payment/PaymentTab";

function fmt(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

type Tab = "overview" | "bidding" | "selling" | "watching" | "profile" | "payment";

export function AccountRoute() {
  const { user } = useCurrentUser();
  const [searchParams] = useSearchParams();
  const [tab, setTab] = useState<Tab>(
    (searchParams.get("tab") as Tab) ?? "overview"
  );
  const navigate = useNavigate();

  const profileQ = trpc.user.getProfile.useQuery();
  const bidsQ = trpc.user.getMyBids.useQuery();
  const listingsQ = trpc.user.getMyListings.useQuery();
  const watchlistQ = trpc.user.getWatchlist.useQuery();

  if (!user) return null;

  const profile = profileQ.data;

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 pb-20">
      {/* Back */}
      <div className="py-5">
        <button onClick={() => navigate("/")} className="flex items-center gap-1 text-xs tracking-widest uppercase text-ah-text-3 hover:text-ah-text-2 transition-colors">
          <ChevronLeft className="h-3.5 w-3.5" /> All Lots
        </button>
      </div>

      {/* Gold rule */}
      <div className="h-px bg-gradient-to-r from-ah-border-gold via-ah-border to-transparent mb-8" />

      {/* Header */}
      <div className="mb-8">
        <p className="text-[10px] tracking-[0.2em] uppercase text-ah-text-3 mb-1">The Estate Room</p>
        <h1 className="font-display text-4xl font-medium text-ah-text">{user.displayName}</h1>
        <div className="flex items-center gap-4 mt-2 text-sm text-ah-text-3">
          {profile && (
            <>
              <span>Member since {new Date(profile.createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" })}</span>
              <span className="text-ah-text-3">|</span>
              <span className={profile.sellerRatingPercent >= 99 ? "text-ah-green" : "text-ah-amber"}>
                {profile.sellerRatingPercent.toFixed(1)}% positive feedback
              </span>
            </>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-6 border-b border-ah-border mb-8">
        {(["overview", "bidding", "selling", "watching", "profile", "payment"] as Tab[]).map((t) => {
        const label: Record<Tab, string> = { overview: "Overview", bidding: "My Bids", selling: "Consignments", watching: "Saved Lots", profile: "Profile", payment: "Payment" };
        return (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`pb-3 text-[11px] tracking-[0.12em] uppercase font-medium transition-colors border-b-2 -mb-px ${
              tab === t
                ? "border-ah-gold text-ah-text"
                : "border-transparent text-ah-text-3 hover:text-ah-text-2"
            }`}
          >
            {label[t]}
          </button>
        )})}
      </div>

      {/* Tab content */}
      {tab === "overview" && <OverviewTab profile={profile} bids={bidsQ.data ?? []} listings={listingsQ.data ?? []} watching={watchlistQ.data ?? []} />}
      {tab === "bidding" && <BiddingTab bids={bidsQ.data ?? []} isLoading={bidsQ.isLoading} />}
      {tab === "selling" && <SellingTab listings={listingsQ.data ?? []} isLoading={listingsQ.isLoading} />}
      {tab === "watching" && <WatchingTab items={watchlistQ.data ?? []} isLoading={watchlistQ.isLoading} refetch={watchlistQ.refetch} />}
      {tab === "profile" && <ProfileTab profile={profile} />}
      {tab === "payment" && <PaymentTab />}
    </div>
  );
}

function OverviewTab({ profile, bids, listings, watching }: { profile: any; bids: any[]; listings: any[]; watching: any[] }) {
  const stats = [
    { label: "Bids Placed", value: profile?._count?.bids ?? 0, icon: <Gavel className="h-4 w-4" /> },
    { label: "Active Lots", value: profile?.activeListings ?? 0, icon: <Package className="h-4 w-4" /> },
    { label: "Saved Lots", value: profile?._count?.watches ?? 0, icon: <Eye className="h-4 w-4" /> },
    { label: "Seller Rating", value: profile ? `${profile.sellerRatingPercent.toFixed(1)}%` : "\u2014", icon: <Star className="h-4 w-4" /> },
  ];

  return (
    <div className="space-y-8">
      {/* Stat grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="border border-ah-border bg-ah-surface p-5">
            <div className="text-ah-text-3 mb-3">{s.icon}</div>
            <p className="font-display text-3xl text-ah-gold">{s.value}</p>
            <p className="text-[10px] tracking-[0.14em] uppercase text-ah-text-3 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Recent bid activity */}
      <div>
        <p className="text-[10px] tracking-[0.16em] uppercase text-ah-text-3 mb-4">Recent Bidding</p>
        {bids.length === 0 ? (
          <p className="text-sm text-ah-text-3">No bids placed yet. <Link to="/" className="text-ah-gold hover:text-ah-gold-bright">Browse Lots &rarr;</Link></p>
        ) : (
          <div className="border border-ah-border divide-y divide-ah-border">
            {bids.slice(0, 3).map((bid: any) => (
              <div key={bid.auctionId} className="flex items-center gap-4 px-4 py-3 bg-ah-surface hover:bg-ah-raised transition-colors">
                <Link to={`/auction/${bid.auctionId}`} className="text-sm text-ah-text hover:text-ah-gold transition-colors flex-1 truncate">{bid.title}</Link>
                <span className="text-sm tabular-nums text-ah-text-2">{fmt(Number(bid.currentPrice))}</span>
                <span className={`text-[9px] tracking-[0.12em] uppercase px-2 py-0.5 border font-medium ${
                  bid.isLeading ? "text-ah-green border-ah-green/25 bg-ah-green/10"
                  : bid.auctionStatus === "CLOSED" ? "text-ah-text-3 border-ah-border"
                  : "text-ah-red border-ah-red/25 bg-ah-red/10"
                }`}>
                  {bid.isLeading ? "Leading" : bid.auctionStatus === "CLOSED" ? "Ended" : "Outbid"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function BiddingTab({ bids, isLoading }: { bids: any[]; isLoading: boolean }) {
  if (isLoading) return <div className="h-32 flex items-center justify-center text-ah-text-3 text-sm">Loading&hellip;</div>;
  if (bids.length === 0) return (
    <div className="text-center py-16 border border-ah-border bg-ah-surface">
      <Gavel className="h-8 w-8 text-ah-text-3 mx-auto mb-3" />
      <p className="text-ah-text-2 mb-4">No bids have been placed yet</p>
      <Link to="/" className="text-xs tracking-widest uppercase text-ah-gold hover:text-ah-gold-bright transition-colors">Browse Lots &rarr;</Link>
    </div>
  );

  return (
    <div className="border border-ah-border">
      {/* Header */}
      <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 px-4 py-2.5 bg-ah-raised border-b border-ah-border">
        {["Lot", "Current Price", "Your Max Bid", "Status", "Ends"].map(h => (
          <span key={h} className="text-[9px] tracking-[0.14em] uppercase text-ah-text-3 font-medium">{h}</span>
        ))}
      </div>
      <div className="divide-y divide-ah-border">
        {bids.map((bid: any) => {
          const isClosed = bid.auctionStatus === "CLOSED";
          const status = isClosed && bid.isLeading ? "WON"
            : isClosed ? "ENDED"
            : bid.isLeading ? "LEADING"
            : "OUTBID";
          return (
            <div key={bid.auctionId} className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 items-center px-4 py-3 bg-ah-surface hover:bg-ah-raised transition-colors">
              <Link to={`/auction/${bid.auctionId}`} className="flex items-center gap-3 min-w-0">
                {bid.imageUrls[0] ? (
                  <img src={bid.imageUrls[0]} alt="" className="w-10 h-10 object-cover shrink-0 border border-ah-border" />
                ) : (
                  <div className="w-10 h-10 bg-ah-raised border border-ah-border shrink-0" />
                )}
                <span className="text-sm text-ah-text hover:text-ah-gold truncate transition-colors">{bid.title}</span>
              </Link>
              <span className="text-sm tabular-nums text-ah-text">{fmt(Number(bid.currentPrice))}</span>
              <span className="text-sm tabular-nums text-ah-text-2">
                {isClosed ? fmt(Number(bid.myMaxAmount)) : "\u2022\u2022\u2022\u2022"}
              </span>
              <span className={`text-[9px] tracking-[0.12em] uppercase px-2 py-0.5 border font-medium whitespace-nowrap ${
                status === "LEADING" || status === "WON" ? "text-ah-green border-ah-green/25 bg-ah-green/10"
                : status === "OUTBID" ? "text-ah-red border-ah-red/25 bg-ah-red/10"
                : "text-ah-text-3 border-ah-border"
              }`}>{status}</span>
              <span className="text-xs text-ah-text-3 whitespace-nowrap">
                {isClosed ? "Ended" : <CountdownTimer endsAt={bid.endsAt instanceof Date ? bid.endsAt.toISOString() : bid.endsAt} compact />}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SellingTab({ listings, isLoading }: { listings: any[]; isLoading: boolean }) {
  if (isLoading) return <div className="h-32 flex items-center justify-center text-ah-text-3 text-sm">Loading&hellip;</div>;
  return (
    <div>
      <div className="flex justify-end mb-4">
        <Link to="/auction/new">
          <Button variant="outline" size="sm" className="text-xs tracking-widest uppercase">+ Consign Lot</Button>
        </Link>
      </div>
      {listings.length === 0 ? (
        <div className="text-center py-16 border border-ah-border bg-ah-surface">
          <Package className="h-8 w-8 text-ah-text-3 mx-auto mb-3" />
          <p className="text-ah-text-2 mb-4">No consignments yet</p>
          <Link to="/auction/new" className="text-xs tracking-widest uppercase text-ah-gold hover:text-ah-gold-bright transition-colors">Consign a Lot &rarr;</Link>
        </div>
      ) : (
        <div className="border border-ah-border">
          <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 px-4 py-2.5 bg-ah-raised border-b border-ah-border">
            {["Lot", "Status", "Current Price", "Bids", "Ends"].map(h => (
              <span key={h} className="text-[9px] tracking-[0.14em] uppercase text-ah-text-3 font-medium">{h}</span>
            ))}
          </div>
          <div className="divide-y divide-ah-border">
            {listings.map((l: any) => (
              <div key={l.id} className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 items-center px-4 py-3 bg-ah-surface hover:bg-ah-raised transition-colors">
                <Link to={`/auction/${l.id}`} className="flex items-center gap-3 min-w-0">
                  {l.imageUrls[0] ? (
                    <img src={l.imageUrls[0]} alt="" className="w-10 h-10 object-cover shrink-0 border border-ah-border" />
                  ) : (
                    <div className="w-10 h-10 bg-ah-raised border border-ah-border shrink-0" />
                  )}
                  <span className="text-sm text-ah-text hover:text-ah-gold truncate transition-colors">{l.title}</span>
                </Link>
                <span className={`text-[9px] tracking-[0.12em] uppercase px-2 py-0.5 border font-medium ${
                  l.status === "ACTIVE" ? "text-ah-green border-ah-green/25 bg-ah-green/10" : "text-ah-text-3 border-ah-border"
                }`}>{l.status === "ACTIVE" ? "Live" : "Ended"}</span>
                <span className="text-sm tabular-nums text-ah-text">{fmt(Number(l.currentPrice))}</span>
                <span className="text-sm tabular-nums text-ah-text-2">{l.bidCount}</span>
                <span className="text-xs text-ah-text-3 whitespace-nowrap">
                  {l.status === "ACTIVE" ? <CountdownTimer endsAt={l.endsAt instanceof Date ? l.endsAt.toISOString() : l.endsAt} compact /> : "Ended"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function WatchingTab({ items, isLoading, refetch }: { items: any[]; isLoading: boolean; refetch: () => void }) {
  const unwatchMutation = trpc.auction.unwatch.useMutation({ onSuccess: refetch });

  if (isLoading) return <div className="h-32 flex items-center justify-center text-ah-text-3 text-sm">Loading&hellip;</div>;
  if (items.length === 0) return (
    <div className="text-center py-16 border border-ah-border bg-ah-surface">
      <Eye className="h-8 w-8 text-ah-text-3 mx-auto mb-3" />
      <p className="text-ah-text-2 mb-4">No lots saved yet</p>
      <Link to="/" className="text-xs tracking-widest uppercase text-ah-gold hover:text-ah-gold-bright transition-colors">Browse Lots &rarr;</Link>
    </div>
  );

  return (
    <div className="border border-ah-border divide-y divide-ah-border">
      {items.map((item: any) => (
        <div key={item.watchId} className="flex items-center gap-4 px-4 py-3 bg-ah-surface hover:bg-ah-raised transition-colors">
          <Link to={`/auction/${item.id}`} className="flex items-center gap-3 flex-1 min-w-0">
            {item.imageUrls[0] ? (
              <img src={item.imageUrls[0]} alt="" className="w-10 h-10 object-cover shrink-0 border border-ah-border" />
            ) : (
              <div className="w-10 h-10 bg-ah-raised border border-ah-border shrink-0" />
            )}
            <div className="min-w-0">
              <p className="text-sm text-ah-text hover:text-ah-gold truncate transition-colors">{item.title}</p>
              <p className="text-xs text-ah-text-3">{item.seller?.displayName}</p>
            </div>
          </Link>
          <span className="text-sm tabular-nums text-ah-text shrink-0">{fmt(Number(item.currentPrice))}</span>
          <span className="text-xs text-ah-text-3 shrink-0 w-24 text-right">
            {item.status === "ACTIVE" ? <CountdownTimer endsAt={item.endsAt instanceof Date ? item.endsAt.toISOString() : item.endsAt} compact /> : "Ended"}
          </span>
          <button
            onClick={() => unwatchMutation.mutate({ auctionId: item.id })}
            disabled={unwatchMutation.isPending}
            className="text-[10px] tracking-[0.1em] uppercase text-ah-text-3 hover:text-ah-red border border-ah-border hover:border-ah-red/30 px-3 py-1.5 transition-colors disabled:opacity-40 shrink-0"
          >
            Remove
          </button>
        </div>
      ))}
    </div>
  );
}

function ProfileTab({ profile }: { profile: any }) {
  const utils = trpc.useUtils();
  const updateMutation = trpc.user.updateProfile.useMutation({
    onSuccess: () => utils.user.getProfile.invalidate(),
  });

  const [details, setDetails] = useState({
    displayName: profile?.displayName ?? "",
    sellerLocation: profile?.sellerLocation ?? "",
  });
  const [address, setAddress] = useState({
    addressLine1: profile?.addressLine1 ?? "",
    addressLine2: profile?.addressLine2 ?? "",
    city: profile?.city ?? "",
    state: profile?.state ?? "",
    zipCode: profile?.zipCode ?? "",
    country: profile?.country ?? "",
  });
  const [detailsSaved, setDetailsSaved] = useState(false);
  const [addressSaved, setAddressSaved] = useState(false);

  useEffect(() => {
    if (profile) {
      setDetails({
        displayName: profile.displayName ?? "",
        sellerLocation: profile.sellerLocation ?? "",
      });
      setAddress({
        addressLine1: profile.addressLine1 ?? "",
        addressLine2: profile.addressLine2 ?? "",
        city: profile.city ?? "",
        state: profile.state ?? "",
        zipCode: profile.zipCode ?? "",
        country: profile.country ?? "",
      });
    }
  }, [profile]);

  const saveDetails = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(details, {
      onSuccess: () => { setDetailsSaved(true); setTimeout(() => setDetailsSaved(false), 2000); },
    });
  };

  const saveAddress = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(address, {
      onSuccess: () => { setAddressSaved(true); setTimeout(() => setAddressSaved(false), 2000); },
    });
  };

  return (
    <div className="space-y-8 max-w-lg">
      {/* Personal details */}
      <section className="border border-ah-border bg-ah-surface p-6">
        <p className="text-[10px] tracking-[0.16em] uppercase text-ah-text-3 mb-5">Member Details</p>
        <form onSubmit={saveDetails} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-[11px] tracking-[0.1em] uppercase text-ah-text-3">Display Name</label>
            <Input value={details.displayName} onChange={e => setDetails(d => ({ ...d, displayName: e.target.value }))} placeholder="Your display name" />
          </div>
          <div className="space-y-1.5">
            <label className="block text-[11px] tracking-[0.1em] uppercase text-ah-text-3">Location</label>
            <Input value={details.sellerLocation} onChange={e => setDetails(d => ({ ...d, sellerLocation: e.target.value }))} placeholder="City, State" />
          </div>
          <div className="flex items-center gap-3">
            <Button type="submit" disabled={updateMutation.isPending} className="text-xs tracking-widest uppercase">Save</Button>
            {detailsSaved && <span className="text-xs text-ah-green">Saved</span>}
          </div>
        </form>
      </section>

      {/* Shipping address */}
      <section className="border border-ah-border bg-ah-surface p-6">
        <p className="text-[10px] tracking-[0.16em] uppercase text-ah-text-3 mb-1 flex items-center gap-2">
          <MapPin className="h-3 w-3" /> Shipping Address
        </p>
        <p className="text-xs text-ah-text-3 mb-5">Default delivery address for lots won at auction</p>
        <form onSubmit={saveAddress} className="space-y-4">
          {[
            { key: "addressLine1", label: "Address Line 1", placeholder: "123 Main St" },
            { key: "addressLine2", label: "Address Line 2", placeholder: "Apt, Suite, Unit (optional)" },
            { key: "city", label: "City", placeholder: "New York" },
            { key: "state", label: "State / Province", placeholder: "NY" },
            { key: "zipCode", label: "ZIP / Postal Code", placeholder: "10001" },
            { key: "country", label: "Country", placeholder: "United States" },
          ].map(({ key, label, placeholder }) => (
            <div key={key} className="space-y-1.5">
              <label className="block text-[11px] tracking-[0.1em] uppercase text-ah-text-3">{label}</label>
              <Input
                value={(address as any)[key]}
                onChange={e => setAddress(a => ({ ...a, [key]: e.target.value }))}
                placeholder={placeholder}
              />
            </div>
          ))}
          <div className="flex items-center gap-3">
            <Button type="submit" disabled={updateMutation.isPending} className="text-xs tracking-widest uppercase">Save Address</Button>
            {addressSaved && <span className="text-xs text-ah-green">Saved</span>}
          </div>
        </form>
      </section>
    </div>
  );
}
