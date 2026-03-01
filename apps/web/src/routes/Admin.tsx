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
    <div className="mx-auto max-w-4xl p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-semibold text-gray-900">
          Admin Control Panel
        </h1>
        <p className="mt-2 text-gray-600">
          Manage the interview exercise environment
        </p>
      </header>

      <div className="space-y-6">
        <section className="rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            Auction Store Management
          </h2>

          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-600 mb-3">
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

            <div className="pt-4 border-t border-gray-200">
              <p className="text-sm text-gray-600 mb-3">
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
                    <p className="text-sm text-gray-500">Loading...</p>
                  )}
                  {snapshotQuery.isError && (
                    <Alert variant="destructive">
                      {snapshotQuery.error.message || "Failed to load snapshot"}
                    </Alert>
                  )}
                  {snapshotQuery.isSuccess && (
                    <pre className="rounded-lg bg-gray-900 text-gray-100 p-4 text-xs overflow-auto max-h-96">
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
