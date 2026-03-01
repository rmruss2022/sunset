import { useState } from "react";
import { useNavigate } from "react-router";

import { Alert } from "../components/ui/alert";
import { Button } from "../components/ui/button";
import { trpc } from "../lib/trpc";

/**
 * Admin Control Panel
 * 
 * This route is for interviewers to:
 * - Reset the auction store between candidates
 * - Inspect the current state of what the candidate has built
 */
export function AdminRoute() {
  const navigate = useNavigate();
  const [showSnapshot, setShowSnapshot] = useState(false);

  const resetMutation = trpc.admin.resetAuction.useMutation({
    onSuccess: () => {
      setShowSnapshot(false);
    },
  });

  const snapshotQuery = trpc.admin.snapshotAuction.useQuery(undefined, {
    enabled: showSnapshot,
  });

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

            <div className="pt-5 border-t border-ah-border">
              <p className="text-sm text-ah-text-2 mb-4">
                Inspect the current auction store to see what the candidate has built.
              </p>
              <div className="flex gap-2">
                <Button
                  onClick={() => setShowSnapshot(!showSnapshot)}
                  variant="outline"
                >
                  {showSnapshot ? "Hide" : "Show"} Current Store
                </Button>
              </div>

              {showSnapshot && (
                <div className="mt-4">
                  {snapshotQuery.isLoading && (
                    <p className="text-sm text-ah-text-3">Loading...</p>
                  )}
                  {snapshotQuery.isError && (
                    <Alert variant="destructive">
                      {snapshotQuery.error.message || "Failed to load snapshot"}
                    </Alert>
                  )}
                  {snapshotQuery.isSuccess && (
                    <pre className="border border-ah-border bg-ah-bg text-ah-text-2 p-4 text-xs overflow-auto max-h-96">
                      {JSON.stringify(snapshotQuery.data, null, 2)}
                    </pre>
                  )}
                </div>
              )}
            </div>
          </div>
        </section>

        <div className="flex justify-between">
          <Button onClick={() => navigate("/auction")} variant="ghost">
            ← Back to Auction
          </Button>
        </div>
      </div>
    </div>
  );
}
