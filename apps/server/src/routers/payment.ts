import { z } from "zod";
import Stripe from "stripe";
import { TRPCError } from "@trpc/server";
import { router, procedure } from "../trpc.js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "sk_test_placeholder", {
  apiVersion: "2025-02-24.acacia" as any,
});

/** Middleware: require authenticated user */
const protectedProcedure = procedure.use(({ ctx, next }) => {
  if (!ctx.currentUser) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({ ctx: { ...ctx, currentUser: ctx.currentUser } });
});

export const paymentRouter = router({
  /** Returns the Stripe publishable key — safe to expose to the browser */
  getPublishableKey: procedure.query(() => {
    return { publishableKey: process.env.STRIPE_PUBLISHABLE_KEY ?? "" };
  }),

  /**
   * Creates a Stripe SetupIntent so the browser can securely collect a card.
   * Also ensures a Stripe Customer exists for this user.
   */
  createSetupIntent: protectedProcedure.mutation(async ({ ctx }) => {
    const { userId } = ctx.currentUser;
    const user = await ctx.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new TRPCError({ code: "NOT_FOUND" });

    let customerId = user.stripeCustomerId;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.displayName,
        metadata: { userId },
      });
      customerId = customer.id;
      await ctx.prisma.user.update({
        where: { id: userId },
        data: { stripeCustomerId: customerId },
      });
    }

    const setupIntent = await stripe.setupIntents.create({
      customer: customerId,
      usage: "off_session",
      payment_method_types: ["card"],
    });

    return { clientSecret: setupIntent.client_secret! };
  }),

  /** List all saved cards for the current user */
  listPaymentMethods: protectedProcedure.query(async ({ ctx }) => {
    const { userId } = ctx.currentUser;
    const user = await ctx.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.stripeCustomerId) return { methods: [] };

    const methods = await stripe.paymentMethods.list({
      customer: user.stripeCustomerId,
      type: "card",
    });

    return {
      methods: methods.data.map((m) => ({
        id: m.id,
        brand: m.card?.brand ?? "unknown",
        last4: m.card?.last4 ?? "****",
        expMonth: m.card?.exp_month ?? 0,
        expYear: m.card?.exp_year ?? 0,
        isDefault: m.id === user.stripePaymentMethodId,
      })),
    };
  }),

  /**
   * Called after the browser confirms a SetupIntent.
   * Saves the paymentMethodId as the user's default card.
   */
  setDefaultPaymentMethod: protectedProcedure
    .input(z.object({ paymentMethodId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { userId } = ctx.currentUser;
      await ctx.prisma.user.update({
        where: { id: userId },
        data: {
          stripePaymentMethodId: input.paymentMethodId,
          paymentVerified: true,
        },
      });
      return { ok: true };
    }),

  /** Detach (remove) a saved card */
  removePaymentMethod: protectedProcedure
    .input(z.object({ paymentMethodId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { userId } = ctx.currentUser;
      const user = await ctx.prisma.user.findUnique({ where: { id: userId } });

      await stripe.paymentMethods.detach(input.paymentMethodId);

      if (user?.stripePaymentMethodId === input.paymentMethodId) {
        await ctx.prisma.user.update({
          where: { id: userId },
          data: { stripePaymentMethodId: null, paymentVerified: false },
        });
      }
      return { ok: true };
    }),

  /**
   * Creates a Stripe Connect Express account for the seller (if they don't have one).
   * Returns the account ID.
   */
  createConnectAccount: protectedProcedure.mutation(async ({ ctx }) => {
    const { userId } = ctx.currentUser;
    const user = await ctx.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new TRPCError({ code: "NOT_FOUND" });

    if (user.stripeConnectAccountId) {
      return { accountId: user.stripeConnectAccountId };
    }

    const account = await stripe.accounts.create({
      type: "express",
      email: user.email,
      metadata: { userId },
      capabilities: {
        transfers: { requested: true },
      },
    });

    await ctx.prisma.user.update({
      where: { id: userId },
      data: { stripeConnectAccountId: account.id },
    });

    return { accountId: account.id };
  }),

  /**
   * Returns a Stripe Account Link URL for Connect onboarding.
   * The browser redirects to this URL.
   */
  getConnectOnboardingLink: protectedProcedure.mutation(async ({ ctx }) => {
    const { userId } = ctx.currentUser;
    const user = await ctx.prisma.user.findUnique({ where: { id: userId } });

    if (!user?.stripeConnectAccountId) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "No Connect account yet. Create one first." });
    }

    const accountLink = await stripe.accountLinks.create({
      account: user.stripeConnectAccountId,
      refresh_url: "http://localhost:5173/account",
      return_url: "http://localhost:5173/account?connect=success",
      type: "account_onboarding",
    });

    return { url: accountLink.url };
  }),

  /** Check if the seller's Connect account has completed onboarding */
  getConnectAccountStatus: protectedProcedure.query(async ({ ctx }) => {
    const { userId } = ctx.currentUser;
    const user = await ctx.prisma.user.findUnique({ where: { id: userId } });

    if (!user?.stripeConnectAccountId) {
      return { hasAccount: false, isVerified: false, detailsSubmitted: false };
    }

    const account = await stripe.accounts.retrieve(user.stripeConnectAccountId);

    return {
      hasAccount: true,
      isVerified: account.charges_enabled && account.payouts_enabled,
      detailsSubmitted: account.details_submitted,
      accountId: user.stripeConnectAccountId,
    };
  }),
});
