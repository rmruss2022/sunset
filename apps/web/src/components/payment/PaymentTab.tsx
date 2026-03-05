import { useState, useCallback } from "react";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { CreditCard, Building2, CheckCircle, Trash2, ExternalLink } from "lucide-react";
import { trpc } from "../../lib/trpc";
import { Button } from "../ui/button";

/* ─── Stripe element styling ─── */
const CARD_STYLE = {
  style: {
    base: {
      color: "#f0ebe0",
      fontFamily: "'DM Sans', system-ui, sans-serif",
      fontSize: "14px",
      fontSmoothing: "antialiased",
      "::placeholder": { color: "#7a6a5e" },
      backgroundColor: "transparent",
    },
    invalid: { color: "#cc4e4e" },
  },
};

/* ─── Inner form (needs Stripe context) ─── */
function CardForm({ onSaved }: { onSaved: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const createSetupIntent = trpc.payment.createSetupIntent.useMutation();
  const setDefault = trpc.payment.setDefaultPaymentMethod.useMutation();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setErr("");
    setBusy(true);

    try {
      const { clientSecret } = await createSetupIntent.mutateAsync();
      const cardEl = elements.getElement(CardElement);
      if (!cardEl) throw new Error("Card element not mounted");

      const result = await stripe.confirmCardSetup(clientSecret, {
        payment_method: { card: cardEl },
      });

      if (result.error) {
        setErr(result.error.message ?? "Card verification failed");
        return;
      }

      const pmId = result.setupIntent?.payment_method as string;
      await setDefault.mutateAsync({ paymentMethodId: pmId });
      onSaved();
    } catch (e: any) {
      setErr(e.message ?? "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="border border-ah-border bg-ah-bg px-4 py-3">
        <CardElement options={CARD_STYLE} />
      </div>
      {err && (
        <p className="text-xs text-ah-red flex items-center gap-1.5">
          <span className="shrink-0">✕</span> {err}
        </p>
      )}
      <Button
        type="submit"
        disabled={busy || !stripe}
        className="text-xs tracking-widest uppercase"
      >
        {busy ? "Verifying…" : "Save Card"}
      </Button>
      <p className="text-[10px] text-ah-text-3 leading-relaxed">
        Test card: <span className="text-ah-text-2 tabular">4242 4242 4242 4242</span>
        {" · "} any future date · any 3-digit CVC
      </p>
    </form>
  );
}

/* ─── Buyer section: card on file ─── */
function BuyerSection() {
  const [adding, setAdding] = useState(false);
  const methodsQ = trpc.payment.listPaymentMethods.useQuery();
  const removeMut = trpc.payment.removePaymentMethod.useMutation({
    onSuccess: () => methodsQ.refetch(),
  });
  const pkQ = trpc.payment.getPublishableKey.useQuery();

  const stripePromise = useCallback(() => {
    const key = pkQ.data?.publishableKey;
    return key ? loadStripe(key) : null;
  }, [pkQ.data?.publishableKey]);

  const methods = methodsQ.data?.methods ?? [];
  const hasCard = methods.length > 0;

  return (
    <section className="border border-ah-border bg-ah-surface p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] tracking-[0.16em] uppercase text-ah-text-3 mb-1 flex items-center gap-1.5">
            <CreditCard className="h-3 w-3" /> Payment Card
          </p>
          <p className="text-xs text-ah-text-3">
            Card on file for settling won lots
          </p>
        </div>
        {hasCard && !adding && (
          <button
            onClick={() => setAdding(true)}
            className="text-[10px] tracking-[0.1em] uppercase text-ah-gold hover:text-ah-gold-bright transition-colors"
          >
            Replace
          </button>
        )}
      </div>

      {/* Saved cards */}
      {methodsQ.isLoading ? (
        <p className="text-sm text-ah-text-3">Loading…</p>
      ) : methods.length > 0 ? (
        <div className="space-y-2">
          {methods.map((m) => (
            <div
              key={m.id}
              className="flex items-center justify-between px-4 py-3 border border-ah-border bg-ah-raised"
            >
              <div className="flex items-center gap-3">
                <span className="text-[10px] tracking-[0.12em] uppercase text-ah-text-2 w-14">
                  {m.brand}
                </span>
                <span className="text-sm text-ah-text tabular">
                  •••• •••• •••• {m.last4}
                </span>
                <span className="text-xs text-ah-text-3">
                  {m.expMonth}/{String(m.expYear).slice(-2)}
                </span>
              </div>
              <div className="flex items-center gap-3">
                {m.isDefault && (
                  <span className="flex items-center gap-1 text-[9px] tracking-[0.12em] uppercase text-ah-green">
                    <CheckCircle className="h-3 w-3" /> Default
                  </span>
                )}
                <button
                  onClick={() => removeMut.mutate({ paymentMethodId: m.id })}
                  disabled={removeMut.isPending}
                  className="text-ah-text-3 hover:text-ah-red transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {/* Add card form */}
      {(!hasCard || adding) && pkQ.data?.publishableKey && (
        <div>
          {adding && (
            <p className="text-xs text-ah-text-3 mb-4">
              Add a new card. This will replace your current card on file.
            </p>
          )}
          <Elements stripe={stripePromise()}>
            <CardForm
              onSaved={() => {
                setAdding(false);
                methodsQ.refetch();
              }}
            />
          </Elements>
        </div>
      )}

      {!hasCard && !pkQ.data?.publishableKey && (
        <p className="text-xs text-ah-red">
          Stripe is not configured. Add <code>STRIPE_PUBLISHABLE_KEY</code> to the server .env.
        </p>
      )}
    </section>
  );
}

/* ─── Seller section: payout account ─── */
function SellerSection() {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const statusQ = trpc.payment.getConnectAccountStatus.useQuery();
  const createAccount = trpc.payment.createConnectAccount.useMutation();
  const getLink = trpc.payment.getConnectOnboardingLink.useMutation();

  async function handleSetupPayouts() {
    setLoading(true);
    setErr("");
    try {
      if (!statusQ.data?.hasAccount) {
        await createAccount.mutateAsync();
        await statusQ.refetch();
      }
      const { url } = await getLink.mutateAsync();
      window.location.href = url;
    } catch (e: any) {
      setErr(e?.message ?? "Something went wrong — check the server console.");
    } finally {
      setLoading(false);
    }
  }

  const status = statusQ.data;

  return (
    <section className="border border-ah-border bg-ah-surface p-6 space-y-5">
      <div>
        <p className="text-[10px] tracking-[0.16em] uppercase text-ah-text-3 mb-1 flex items-center gap-1.5">
          <Building2 className="h-3 w-3" /> Payout Account
        </p>
        <p className="text-xs text-ah-text-3">
          Bank account to receive proceeds from your consignments
        </p>
      </div>

      {statusQ.isLoading ? (
        <p className="text-sm text-ah-text-3">Loading…</p>
      ) : status?.isVerified ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-ah-green">
            <CheckCircle className="h-4 w-4 shrink-0" />
            <span>Payout account verified and active</span>
          </div>
          <button
            onClick={handleSetupPayouts}
            disabled={loading}
            className="flex items-center gap-1.5 text-[10px] tracking-[0.1em] uppercase text-ah-text-3 hover:text-ah-text-2 transition-colors"
          >
            <ExternalLink className="h-3 w-3" />
            Manage in Stripe Dashboard
          </button>
        </div>
      ) : status?.detailsSubmitted ? (
        <div className="space-y-3">
          <p className="text-sm text-ah-amber">Account under review by Stripe</p>
          <button
            onClick={handleSetupPayouts}
            disabled={loading}
            className="flex items-center gap-1.5 text-[10px] tracking-[0.1em] uppercase text-ah-gold hover:text-ah-gold-bright transition-colors"
          >
            <ExternalLink className="h-3 w-3" />
            {loading ? "Opening…" : "Continue Setup"}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-ah-text-2 leading-relaxed">
            Connect a bank account to receive payouts when your lots sell.
            You&rsquo;ll be redirected to Stripe&rsquo;s secure onboarding.
          </p>
          {err && (
            <p className="text-xs text-ah-red flex items-start gap-1.5">
              <span className="shrink-0">✕</span> {err}
            </p>
          )}
          <Button
            onClick={handleSetupPayouts}
            disabled={loading}
            variant="outline"
            className="text-xs tracking-widest uppercase flex items-center gap-2"
          >
            <Building2 className="h-3.5 w-3.5" />
            {loading ? "Opening Stripe…" : "Set Up Payouts"}
          </Button>
          <p className="text-[10px] text-ah-text-3 leading-relaxed">
            Test bank (US): routing <span className="text-ah-text-2">110000000</span>
            {" · "} account <span className="text-ah-text-2">000123456789</span>
          </p>
        </div>
      )}
    </section>
  );
}

/* ─── Exported tab ─── */
export function PaymentTab() {
  return (
    <div className="space-y-6 max-w-lg">
      <BuyerSection />
      <SellerSection />
    </div>
  );
}
