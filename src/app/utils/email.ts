import { Resend } from "resend";
import config from "../config";

const apiKey = config.resend_api_key;
if (!apiKey && process.env.NODE_ENV === "production") {
  throw new Error(
    "CRITICAL: RESEND_API_KEY environment variable is missing in production.",
  );
}

const resend = new Resend(apiKey);

interface SendEmailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

export const sendEmail = async ({
  to,
  subject,
  text,
  html,
}: SendEmailOptions): Promise<void> => {
  try {
    let sender =
      process.env.EMAIL_FROM ||
      config.email_sender ||
      "Trust Pass <onboarding@resend.dev>";

    // Resend prohibits public domain senders like @gmail.com unless using onboarding@resend.dev or verified domain
    if (
      sender.includes("@gmail.com") ||
      sender.includes("@yahoo.com") ||
      sender.includes("@hotmail.com") ||
      sender.includes("@outlook.com")
    ) {
      sender = "Trust Pass <onboarding@resend.dev>";
    }

    const { data, error } = await resend.emails.send({
      from: sender,
      to: [to],
      subject,
      text: text || "",
      html: html || `<p>${text}</p>`,
    });

    if (error) {
      console.error(
        `[Email Service Error] Failed to send email to ${to}:`,
        error,
      );
      throw new Error(`Email dispatch failed: ${error.message}`);
    }

    console.info(
      `[Email Service Success] Email dispatched to ${to} (ID: ${data?.id})`,
    );
  } catch (err) {
    // Log error securely without leaking raw credentials
    console.error(
      `[Email Service Exception] Critical failure while emailing ${to}:`,
      err,
    );

    // In production, you might want to hook this into an error monitoring tool like Sentry
    throw err;
  }
};
