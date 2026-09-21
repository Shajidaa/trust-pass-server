import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.join(process.cwd(), ".env") });

export default {
  node_env: process.env.NODE_ENV || "development",
  port: process.env.PORT || 5000,
  app_name: process.env.APP_NAME,
  database_url: process.env.DATABASE_URL!,
  client_url: process.env.CLIENT_URL || "http://localhost:3000",
  redis_user: process.env.REDIS_USER!,
  redis_password: process.env.REDIS_PASSWORD!,
  redis_host: process.env.REDIS_HOST!,
  redis_port: process.env.REDIS_PORT!,
  // Backwards compatibility
  smtp_user: process.env.SMTP_USER!,
  smtp_password: process.env.SMTP_PASSWORD!,
  email_sender: process.env.EMAIL_SENDER,

  smtp: {
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT)!,
    secure:
      process.env.SMTP_SECURE === "true" ||
      Number(process.env.SMTP_PORT) === 465,
    user: process.env.SMTP_USER!,
    password: process.env.SMTP_PASSWORD!,
    sender: process.env.EMAIL_SENDER!,
  },
  otp: {
    expirationSeconds: 300, // 5 minutes
    cooldownSeconds: 60, // 1 minute resend cooldown
    maxAttempts: 5, // Max invalid attempts before OTP invalidation
  },
};
