import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { createAuthMiddleware } from "better-auth/api";
import { bearer, emailOTP } from "better-auth/plugins";
import { prisma } from "./prisma";
import config from "../config";
import { sendEmail } from "../utils/email";

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),

  baseURL: process.env.BETTER_AUTH_URL || `http://localhost:${config.port || 5000}`,
  secret: process.env.BETTER_AUTH_SECRET,

  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    autoSignIn: false,
  },

  plugins: [
    bearer(),

    emailOTP({
      otpLength: 6,
      expiresIn: 600, // 10 minutes
      // Overrides the default link-based verification — OTP is sent instead
      overrideDefaultEmailVerification: true,

      async sendVerificationOTP({ email, otp, type }) {
        const subjects: Record<string, string> = {
          "email-verification": "Verify your email",
          "sign-in": "Your sign-in code",
          "forget-password": "Reset your password",
        };

        await sendEmail({
          to: email,
          subject: subjects[type] ?? "Your verification code",
          otp,
          appName: config.app_name || "Trust Pass",
          expirationMinutes: "10",
        });
      },
    }),
  ],

  socialProviders: {
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? {
        google: {
          clientId: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          scope: ["email", "profile"],
        },
      }
      : {}),
  },

  user: {
    additionalFields: {
      gender: { type: "string", required: false },
      phone: { type: "string", required: false },
      role: { type: "string", defaultValue: "CUSTOMER", required: false },
      status: { type: "string", defaultValue: "ACTIVE", required: false },
      provider: { type: "string", required: false },
    },
  },

  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60,
    },
  },

  advanced: {
    crossSubDomainCookies: { enabled: false },
    useSecureCookies: process.env.NODE_ENV === "production",
    defaultCookieAttributes: {
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
    },
  },

  hooks: {
    after: createAuthMiddleware(async (ctx) => {
      const newSession = ctx.context.newSession;
      if (!newSession) return;

      await prisma.user
        .update({
          where: { id: newSession.user.id },
          data: { provider: (newSession.user as any).provider || "CREDENTIAL" },
        })
        .catch(() => { });
    }),
  },
});
