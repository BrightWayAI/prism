import { google } from "googleapis";
import Anthropic from "@anthropic-ai/sdk";
import pdf from "pdf-parse";
import { eq, and, ilike } from "drizzle-orm";
import { db, accounts, invoices, vendors } from "@prism/db";

interface ParseJobData {
  userId: string;
  messageId: string;
}

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const EXTRACTION_PROMPT = `Extract invoice information from the following email/document content.

Return a JSON object with these fields:
- vendor_name: string (the company sending the invoice)
- amount: number (total amount charged, positive number)
- currency: string (3-letter currency code like USD, EUR)
- invoice_date: string (ISO date format YYYY-MM-DD)
- billing_period_start: string | null (ISO date, if mentioned)
- billing_period_end: string | null (ISO date, if mentioned)
- billing_frequency: "monthly" | "annual" | "usage" | "one_time" | null
- invoice_number: string | null
- confidence_score: number (0-1, how confident you are in the extraction)

If you cannot extract a field with confidence, use null.
Only return valid JSON, no other text.

Content to parse:
`;

export async function handleInvoiceParse(data: ParseJobData) {
  const { userId, messageId } = data;

  // Check if already parsed
  const existing = await db.query.invoices.findFirst({
    where: and(
      eq(invoices.userId, userId),
      eq(invoices.gmailMessageId, messageId)
    ),
  });

  if (existing) {
    console.log(`Message ${messageId} already parsed, skipping`);
    return;
  }

  // Get user's Google account
  const account = await db.query.accounts.findFirst({
    where: and(
      eq(accounts.userId, userId),
      eq(accounts.provider, "google")
    ),
  });

  if (!account?.refresh_token) {
    throw new Error("User tokens not found");
  }

  // Setup Gmail API
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );
  oauth2Client.setCredentials({ refresh_token: account.refresh_token });
  const gmail = google.gmail({ version: "v1", auth: oauth2Client });

  // Fetch full message
  const message = await gmail.users.messages.get({
    userId: "me",
    id: messageId,
    format: "full",
  });

  // Extract content
  let textContent = "";
  const parts = message.data.payload?.parts || [];

  // Get plain text or HTML body
  for (const part of parts) {
    if (part.mimeType === "text/plain" && part.body?.data) {
      textContent = Buffer.from(part.body.data, "base64").toString("utf-8");
      break;
    }
    if (part.mimeType === "text/html" && part.body?.data) {
      const html = Buffer.from(part.body.data, "base64").toString("utf-8");
      textContent = html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
    }
  }

  // Check for PDF attachments
  for (const part of parts) {
    if (part.mimeType === "application/pdf" && part.body?.attachmentId) {
      try {
        const attachment = await gmail.users.messages.attachments.get({
          userId: "me",
          messageId,
          id: part.body.attachmentId,
        });
        if (attachment.data.data) {
          const pdfBuffer = Buffer.from(attachment.data.data, "base64");
          const pdfData = await pdf(pdfBuffer);
          textContent += "\n\nPDF Content:\n" + pdfData.text;
        }
      } catch (e) {
        console.warn("Failed to parse PDF attachment:", e);
      }
    }
  }

  if (!textContent) {
    console.log(`No parseable content in message ${messageId}`);
    return;
  }

  // Use Claude to extract invoice data
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: EXTRACTION_PROMPT + textContent.slice(0, 10000),
      },
    ],
  });

  const responseText = response.content[0].type === "text" ? response.content[0].text : "";
  let parsed: {
    vendor_name: string;
    amount: number;
    currency: string;
    invoice_date: string;
    billing_period_start: string | null;
    billing_period_end: string | null;
    billing_frequency: string | null;
    invoice_number: string | null;
    confidence_score: number;
  };

  try {
    parsed = JSON.parse(responseText);
  } catch {
    console.error("Failed to parse LLM response:", responseText);
    return;
  }

  // Match vendor
  const matchedVendor = await db.query.vendors.findFirst({
    where: ilike(vendors.name, `%${parsed.vendor_name}%`),
  });

  // Store invoice
  await db.insert(invoices).values({
    userId,
    vendorId: matchedVendor?.id || null,
    gmailMessageId: messageId,
    amount: parsed.amount.toString(),
    currency: parsed.currency || "USD",
    invoiceDate: new Date(parsed.invoice_date),
    billingPeriodStart: parsed.billing_period_start ? new Date(parsed.billing_period_start) : null,
    billingPeriodEnd: parsed.billing_period_end ? new Date(parsed.billing_period_end) : null,
    billingFrequency: parsed.billing_frequency as "monthly" | "annual" | "usage" | "one_time" | null,
    invoiceNumber: parsed.invoice_number,
    rawEmailSnippet: textContent.slice(0, 500),
    confidenceScore: parsed.confidence_score.toString(),
    isManuallyReviewed: false,
  });

  console.log(`Parsed invoice from ${parsed.vendor_name}: ${parsed.currency} ${parsed.amount}`);
}
