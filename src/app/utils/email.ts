import nodemailer from "nodemailer";
import config from "../config";

export interface SendEmailParams {
  to: string;
  subject: string;
  otp: string;
  appName?: string;
  expirationMinutes?: string;
}

export const sendEmail = async ({
  to,
  subject,
  otp,
  appName = "Trust Pass",
  expirationMinutes = "10",
}: SendEmailParams): Promise<void> => {
  const transporter = nodemailer.createTransport({
    host: config.smtp_host,
    port: Number(config.smtp_port) || 587,
    secure: Number(config.smtp_port) === 465,
    auth: {
      user: config.smtp_user,
      pass: config.smtp_pass,
    },
  });

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;border:1px solid #e5e7eb;border-radius:8px;">
      <h2 style="color:#111827;margin-bottom:8px;">${subject}</h2>
      <p style="color:#6b7280;">Use the one-time code below to continue with ${appName}.</p>
      <div style="text-align:center;margin:32px 0;padding:16px;background:#f3f4f6;border-radius:8px;">
        <span style="font-size:40px;font-weight:700;letter-spacing:12px;color:#4f46e5;">${otp}</span>
      </div>
      <p style="color:#6b7280;font-size:14px;">This code expires in <strong>${expirationMinutes} minutes</strong>. Do not share it with anyone.</p>
      <p style="color:#9ca3af;font-size:12px;margin-top:24px;">If you didn't request this, you can safely ignore this email.</p>
    </div>
  `;

  await transporter.sendMail({
    from: `"${appName}" <${config.smtp_user}>`,
    to,
    subject,
    html,
  });

  // console.log(`[Email] "${subject}" sent to ${to}`);
};
