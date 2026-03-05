import { useMemo, useState } from "react";
import { useNavigate } from "react-router";

import { Alert } from "../components/ui/alert";
import { Button } from "../components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { trpc } from "../lib/trpc";

/**
 * Admin Control Panel
 * 
 * This route is for interviewers / admins to:
 * - Reset the auction store between candidates
 * - Inspect and manage users and listings
 */
export function AdminRoute() {
  const navigate = useNavigate();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<{
    title: string;
    description: string;
    imageUrls: string;
    category: string;
    brand: string;
    model: string;
    year: string;
    status: string;
    currentPrice: string;
    endsAt: string;
  } | null>(null);

  const resetMutation = trpc.admin.resetAuction.useMutation({
    onSuccess: () => {
      snapshotQuery.refetch();
    },
  });

  const snapshotQuery = trpc.admin.snapshotAuction.useQuery();

  const deleteAuction = trpc.admin.deleteAuction.useMutation({
    onSuccess: () => snapshotQuery.refetch(),
  });

  const updateAuction = trpc.admin.updateAuction.useMutation({
    onSuccess: () => snapshotQuery.refetch(),
  });

  const users = snapshotQuery.data?.users ?? [];
  const auctions = snapshotQuery.data?.auctions ?? [];

  const activeAuctions = useMemo(
    () => auctions.filter((a) => a.status === "ACTIVE"),
    [auctions],
  );

  const currentEditing = editingId
    ? auctions.find((a) => a.id === editingId) ?? null
    : null;

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-10">
      <div className="h-px bg-gradient-to-r from-ah-border-gold via-ah-border to-transparent mb-8" />

      <header className="mb-8">
        <p className="text-[10px] tracking-[0.2em] uppercase text-ah-text-3 mb-2">System</p>
        <h1 className="font-display text-3xl font-medium text-ah-text">
          Admin Control Panel
        </h1>
        <p className="mt-2 text-sm text-ah-text-2">
          Manage the interview exercise environment
        </p>
      </header>

      <div className="space-y-6">
        <section className="border border-ah-border bg-ah-surface p-6">
          <h2 className="text-[10px] tracking-[0.16em] uppercase text-ah-text-3 mb-5">
            Auction Store Management
          </h2>

          <div className="space-y-5">
            <div>
              <p className="text-sm text-ah-text-2 mb-4">
                Reset the auction store to clear all data between interview sessions.
              </p>
              <Button
                onClick={() => resetMutation.mutate()}
                disabled={resetMutation.isPending}
                variant="destructive"
              >
                {resetMutation.isPending ? "Resetting..." : "Reset Auction Store"}
              </Button>
              {resetMutation.isSuccess && (
                <Alert className="mt-4">
                  Auction store reset successfully!
                </Alert>
              )}
              {resetMutation.isError && (
                <Alert variant="destructive" className="mt-4">
                  {resetMutation.error.message || "Failed to reset store"}
                </Alert>
              )}
            </div>

          </div>
        </section>

        <section className="border border-ah-border bg-ah-surface p-6">
          <h2 className="text-[10px] tracking-[0.16em] uppercase text-ah-text-3 mb-3">
            Users
          </h2>
          {snapshotQuery.isLoading ? (
            <p className="text-sm text-ah-text-3">Loading users…</p>
          ) : snapshotQuery.isError ? (
            <Alert variant="destructive">
              {snapshotQuery.error.message || "Failed to load users"}
            </Alert>
          ) : users.length === 0 ? (
            <p className="text-sm text-ah-text-2">No users found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs text-left">
                <thead className="border-b border-ah-border text-ah-text-3 uppercase tracking-[0.12em]">
                  <tr>
                    <th className="py-2 pr-4">Name</th>
                    <th className="py-2 pr-4">Email</th>
                    <th className="py-2 pr-4">Role</th>
                    <th className="py-2 pr-4">Seller Rating</th>
                    <th className="py-2 pr-4">Payment</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="border-b border-ah-border/60">
                      <td className="py-2 pr-4 text-ah-text">{u.displayName}</td>
                      <td className="py-2 pr-4 text-ah-text-2">{u.email}</td>
                      <td className="py-2 pr-4 text-ah-text-2">
                        {u.isAdmin ? "Admin" : "User"}
                      </td>
                      <td className="py-2 pr-4 text-ah-text-2">
                        {u.sellerRatingPercent?.toFixed(1) ?? "—"}% ({u.sellerFeedbackCount ?? 0})
                      </td>
                      <td className="py-2 pr-4 text-ah-text-2">
                        {u.paymentVerified ? "Verified" : "Unverified"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="border border-ah-border bg-ah-surface p-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[10px] tracking-[0.16em] uppercase text-ah-text-3">
              Listings
            </h2>
            <p className="text-[11px] text-ah-text-3 tabular">
              {activeAuctions.length} active / {auctions.length} total
            </p>
          </div>

          {snapshotQuery.isLoading ? (
            <p className="text-sm text-ah-text-3">Loading listings…</p>
          ) : snapshotQuery.isError ? (
            <Alert variant="destructive">
              {snapshotQuery.error.message || "Failed to load listings"}
            </Alert>
          ) : auctions.length === 0 ? (
            <p className="text-sm text-ah-text-2">No listings found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs text-left">
                <thead className="border-b border-ah-border text-ah-text-3 uppercase tracking-[0.12em]">
                  <tr>
                    <th className="py-2 pr-3">Title</th>
                    <th className="py-2 pr-3">Seller</th>
                    <th className="py-2 pr-3">Status</th>
                    <th className="py-2 pr-3">Ends</th>
                    <th className="py-2 pr-3">Bids</th>
                    <th className="py-2 pr-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {auctions.map((a) => (
                    <tr key={a.id} className="border-b border-ah-border/60">
                      <td className="py-2 pr-3 text-ah-text max-w-xs truncate">
                        {a.title}
                      </td>
                      <td className="py-2 pr-3 text-ah-text-2">
                        {a.seller?.displayName ?? "—"}
                      </td>
                      <td className="py-2 pr-3 text-ah-text-2">
                        {a.status}
                      </td>
                      <td className="py-2 pr-3 text-ah-text-2 tabular">
                        {new Date(a.endsAt).toLocaleString()}
                      </td>
                      <td className="py-2 pr-3 text-ah-text-2">
                        {a.bidCount ?? a.bids.length}
                      </td>
                      <td className="py-2 pl-3 text-right space-x-2">
                        <Button
                          size="xs"
                          variant="outline"
                          onClick={() => {
                            setEditingId(a.id);
                            setForm({
                              title: a.title ?? "",
                              description: a.description ?? "",
                              imageUrls: Array.isArray(a.imageUrls)
                                ? a.imageUrls.join(", ")
                                : "",
                              category: a.category ?? "",
                              brand: a.brand ?? "",
                              model: a.model ?? "",
                              year: a.year ? String(a.year) : "",
                              status: a.status ?? "",
                              currentPrice: a.currentPrice
                                ? String(a.currentPrice)
                                : "",
                              endsAt: new Date(a.endsAt).toISOString(),
                            });
                          }}
                        >
                          Edit
                        </Button>
                        <Button
                          size="xs"
                          variant="destructive"
                          onClick={() => {
                            if (!window.confirm(`Delete listing "${a.title}"? This cannot be undone.`)) {
                              return;
                            }
                            deleteAuction.mutate({ id: a.id });
                          }}
                        >
                          Delete
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <div className="flex justify-between">
          <Button onClick={() => navigate("/auction")} variant="ghost">
            ← Back to Auction
          </Button>
        </div>
      </div>
      <Dialog open={!!currentEditing && !!form} onOpenChange={(open) => {
        if (!open) {
          setEditingId(null);
          setForm(null);
        }
      }}>
        <DialogContent className="bg-ah-surface border-ah-border text-ah-text">
          <DialogHeader>
            <DialogTitle className="font-display text-xl tracking-[0.18em] uppercase">
              Edit Listing
            </DialogTitle>
          </DialogHeader>
          {currentEditing && form && (
            <div className="space-y-3 text-sm">
              <div>
                <label className="block text-[11px] tracking-[0.16em] uppercase text-ah-text-3 mb-1">
                  Title
                </label>
                <Input
                  value={form.title}
                  onChange={(e) =>
                    setForm((f) => (f ? { ...f, title: e.target.value } : f))
                  }
                />
              </div>
              <div>
                <label className="block text-[11px] tracking-[0.16em] uppercase text-ah-text-3 mb-1">
                  Description
                </label>
                <Textarea
                  rows={4}
                  value={form.description}
                  onChange={(e) =>
                    setForm((f) => (f ? { ...f, description: e.target.value } : f))
                  }
                />
              </div>
              <div>
                <label className="block text-[11px] tracking-[0.16em] uppercase text-ah-text-3 mb-1">
                  Image URLs (comma-separated)
                </label>
                <Input
                  value={form.imageUrls}
                  onChange={(e) =>
                    setForm((f) => (f ? { ...f, imageUrls: e.target.value } : f))
                  }
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] tracking-[0.16em] uppercase text-ah-text-3 mb-1">
                    Category
                  </label>
                  <Input
                    value={form.category}
                    onChange={(e) =>
                      setForm((f) => (f ? { ...f, category: e.target.value } : f))
                    }
                  />
                </div>
                <div>
                  <label className="block text-[11px] tracking-[0.16em] uppercase text-ah-text-3 mb-1">
                    Status (ACTIVE/CLOSED)
                  </label>
                  <Input
                    value={form.status}
                    onChange={(e) =>
                      setForm((f) => (f ? { ...f, status: e.target.value } : f))
                    }
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] tracking-[0.16em] uppercase text-ah-text-3 mb-1">
                    Brand
                  </label>
                  <Input
                    value={form.brand}
                    onChange={(e) =>
                      setForm((f) => (f ? { ...f, brand: e.target.value } : f))
                    }
                  />
                </div>
                <div>
                  <label className="block text-[11px] tracking-[0.16em] uppercase text-ah-text-3 mb-1">
                    Model
                  </label>
                  <Input
                    value={form.model}
                    onChange={(e) =>
                      setForm((f) => (f ? { ...f, model: e.target.value } : f))
                    }
                  />
                </div>
                <div>
                  <label className="block text-[11px] tracking-[0.16em] uppercase text-ah-text-3 mb-1">
                    Year
                  </label>
                  <Input
                    value={form.year}
                    onChange={(e) =>
                      setForm((f) => (f ? { ...f, year: e.target.value } : f))
                    }
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] tracking-[0.16em] uppercase text-ah-text-3 mb-1">
                    Current Price
                  </label>
                  <Input
                    value={form.currentPrice}
                    onChange={(e) =>
                      setForm((f) =>
                        f ? { ...f, currentPrice: e.target.value } : f,
                      )
                    }
                  />
                </div>
                <div>
                  <label className="block text-[11px] tracking-[0.16em] uppercase text-ah-text-3 mb-1">
                    Ends At (ISO)
                  </label>
                  <Input
                    value={form.endsAt}
                    onChange={(e) =>
                      setForm((f) => (f ? { ...f, endsAt: e.target.value } : f))
                    }
                  />
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="mt-4">
            <Button
              variant="ghost"
              onClick={() => {
                setEditingId(null);
                setForm(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!currentEditing || !form) return;
                const payload: any = { id: currentEditing.id };
                if (form.title && form.title !== currentEditing.title) {
                  payload.title = form.title;
                }
                if (form.description && form.description !== currentEditing.description) {
                  payload.description = form.description;
                }
                const urls = form.imageUrls
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean);
                if (urls.length > 0) {
                  payload.imageUrls = urls;
                }
                if (form.category && form.category !== currentEditing.category) {
                  payload.category = form.category;
                }
                if (form.brand && form.brand !== currentEditing.brand) {
                  payload.brand = form.brand;
                }
                if (form.model && form.model !== currentEditing.model) {
                  payload.model = form.model;
                }
                if (form.year && !Number.isNaN(Number(form.year))) {
                  const y = Number(form.year);
                  if (y !== currentEditing.year) {
                    payload.year = y;
                  }
                }
                if (form.status && form.status.toUpperCase() !== currentEditing.status) {
                  payload.status = form.status.toUpperCase();
                }
                if (
                  form.currentPrice &&
                  !Number.isNaN(Number(form.currentPrice))
                ) {
                  const num = Number(form.currentPrice);
                  if (num > 0 && num !== currentEditing.currentPrice) {
                    payload.currentPrice = num;
                  }
                }
                if (
                  form.endsAt &&
                  form.endsAt !== new Date(currentEditing.endsAt).toISOString()
                ) {
                  payload.endsAt = form.endsAt;
                }
                if (Object.keys(payload).length > 1) {
                  updateAuction.mutate(payload);
                }
                setEditingId(null);
                setForm(null);
              }}
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
