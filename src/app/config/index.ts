import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.join(process.cwd(), ".env") });

export default {
  node_env: process.env.NODE_ENV || "development",
  port: process.env.PORT || 5000,
  app_name: process.env.APP_NAME,
  database_url: process.env.DATABASE_URL!,
  client_url: process.env.CLIENT_URL || "http://localhost:3000",

  email_from:
    process.env.EMAIL_FROM ||
    process.env.EMAIL_SENDER ||
    "Trust Pass <onboarding@resend.dev>",
  resend_api_key: process.env.RESEND_API_KEY!,

  cloudinary_cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
  cloudinary_api_key: process.env.CLOUDINARY_API_KEY!,
  cloudinary_api_secret: process.env.CLOUDINARY_API_SECRET!,
};
