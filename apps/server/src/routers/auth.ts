import { z } from "zod";
import bcrypt from "bcryptjs";
import { TRPCError } from "@trpc/server";
import { router, procedure } from "../trpc.js";
import {
  signToken,
  COOKIE_NAME,
  COOKIE_MAX_AGE,
} from "../services/auth.js";

export const authRouter = router({
  login: procedure
    .input(z.object({ email: z.string().email(), password: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.prisma.user.findUnique({
        where: { email: input.email },
      });
      if (!user || !user.passwordHash)
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid credentials",
        });
      const valid = await bcrypt.compare(input.password, user.passwordHash);
      if (!valid)
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid credentials",
        });
      const token = signToken({ userId: user.id, isAdmin: user.isAdmin });
      ctx.res.cookie(COOKIE_NAME, token, {
        httpOnly: true,
        maxAge: COOKIE_MAX_AGE,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
      });
      return {
        userId: user.id,
        displayName: user.displayName,
        isAdmin: user.isAdmin,
      };
    }),

  logout: procedure.mutation(({ ctx }) => {
    ctx.res.clearCookie(COOKIE_NAME);
    return { ok: true };
  }),

  me: procedure.query(async ({ ctx }) => {
    if (!ctx.currentUser) return null;
    const user = await ctx.prisma.user.findUnique({
      where: { id: ctx.currentUser.userId },
    });
    if (!user) return null;
    return {
      userId: user.id,
      displayName: user.displayName,
      isAdmin: user.isAdmin,
      paymentVerified: user.paymentVerified,
    };
  }),
});
