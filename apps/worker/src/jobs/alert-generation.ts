import { Resend } from "resend";
import { eq } from "drizzle-orm";
import { db, users, alerts } from "@prism/db";

interface AlertJobData {
  type: "spend_increase" | "renewal_reminder" | "parse_failed";
  userId: string;
  invoiceId?: string;
  vendorId?: string;
  message?: string;
}

const resend = new Resend(process.env.RESEND_API_KEY);

export async function handleAlertGeneration(data: AlertJobData) {
  const { type, userId, invoiceId, message } = data;

  // Get user
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  if (!user || !user.email) {
    throw new Error("User not found");
  }

  const alertPreferences = (user.alertPreferences as Record<string, boolean>) || {};

  // Check if user wants this type of alert
  const alertTypeEnabled = alertPreferences[type] !== false;
  const emailEnabled = alertPreferences.email_notifications !== false;

  // Create in-app alert
  const [alert] = await db
    .insert(alerts)
    .values({
      userId,
      type,
      invoiceId: invoiceId || null,
      message: message || getDefaultMessage(type),
      isRead: false,
    })
    .returning();

  if (!alert) {
    throw new Error("Failed to create alert");
  }

  // Send email if enabled
  if (alertTypeEnabled && emailEnabled && process.env.RESEND_API_KEY) {
    await resend.emails.send({
      from: "Prism <alerts@prism.app>",
      to: user.email,
      subject: getEmailSubject(type),
      html: getEmailHtml(type, message || getDefaultMessage(type)),
    });
  }

  console.log(`Created ${type} alert for user ${userId}`);
}

function getDefaultMessage(type: AlertJobData["type"]): string {
  switch (type) {
    case "spend_increase":
      return "Your spending has increased significantly this month.";
    case "renewal_reminder":
      return "You have an annual subscription renewing soon.";
    case "parse_failed":
      return "We couldn't parse an invoice automatically. Please review it manually.";
    default:
      return "You have a new notification in Prism.";
  }
}

function getEmailSubject(type: AlertJobData["type"]): string {
  switch (type) {
    case "spend_increase":
      return "Spending Alert - Prism";
    case "renewal_reminder":
      return "Upcoming Renewal Reminder - Prism";
    case "parse_failed":
      return "Invoice Needs Review - Prism";
    default:
      return "Notification - Prism";
  }
}

function getEmailHtml(type: AlertJobData["type"], message: string): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
      </head>
      <body style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #6366f1; font-size: 24px;">Prism</h1>
        <p style="color: #374151; font-size: 16px; line-height: 1.5;">
          ${message}
        </p>
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard" 
           style="display: inline-block; background: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 16px;">
          View Dashboard
        </a>
        <p style="color: #9ca3af; font-size: 12px; margin-top: 32px;">
          You received this email because you have ${type.replace("_", " ")} alerts enabled.
        </p>
      </body>
    </html>
  `;
}
