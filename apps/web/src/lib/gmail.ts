import { google } from "googleapis";
import { db, accounts, vendors } from "@prism/db";
import { eq, and } from "drizzle-orm";

export async function getGmailClient(userId: string) {
  const account = await db.query.accounts.findFirst({
    where: and(eq(accounts.userId, userId), eq(accounts.provider, "google")),
  });

  if (!account?.access_token) {
    throw new Error("No Google account found");
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );

  oauth2Client.setCredentials({
    access_token: account.access_token,
    refresh_token: account.refresh_token,
  });

  return google.gmail({ version: "v1", auth: oauth2Client });
}

function buildInvoiceSearchQuery(daysBack: number = 90): string {
  const date = new Date();
  date.setDate(date.getDate() - daysBack);
  const afterDate = date.toISOString().split("T")[0].replace(/-/g, "/");
  
  // Focus on actual invoices/receipts with dollar amounts
  // Exclude newsletters, marketing, and account notifications
  return `
    (receipt OR invoice OR "billing statement" OR "payment confirmation" OR "payment received" OR "payment processed" OR "your payment" OR "successfully charged")
    AND ("$" OR "USD" OR "EUR" OR "GBP" OR "total" OR "amount" OR "charged")
    -unsubscribe 
    -"free trial" 
    -"trial expired"
    -"verify your email"
    -"update your payment"
    -"add a payment"
    -newsletter
    -promotion
    -"getting started"
    -"welcome to"
    -"confirm your"
    after:${afterDate}
  `.replace(/\s+/g, " ").trim();
}

export async function searchInvoiceEmails(
  userId: string,
  options: { startDate?: Date; endDate?: Date; maxResults?: number; daysBack?: number } = {}
) {
  const gmail = await getGmailClient(userId);
  const { maxResults = 100, daysBack = 90 } = options;

  const searchQuery = buildInvoiceSearchQuery(daysBack);
  console.log("Gmail search query:", searchQuery);

  const response = await gmail.users.messages.list({
    userId: "me",
    q: searchQuery,
    maxResults,
  });

  console.log(`Found ${response.data.messages?.length || 0} potential invoice emails`);
  return response.data.messages || [];
}

export async function getEmailContent(userId: string, messageId: string) {
  const gmail = await getGmailClient(userId);

  const message = await gmail.users.messages.get({
    userId: "me",
    id: messageId,
    format: "full",
  });

  let textContent = "";
  let subject = "";
  let from = "";
  let date = "";

  // Get headers
  const headers = message.data.payload?.headers || [];
  for (const header of headers) {
    if (header.name?.toLowerCase() === "subject") subject = header.value || "";
    if (header.name?.toLowerCase() === "from") from = header.value || "";
    if (header.name?.toLowerCase() === "date") date = header.value || "";
  }

  // Get body content
  const parts = message.data.payload?.parts || [];
  
  // Try to get plain text first
  for (const part of parts) {
    if (part.mimeType === "text/plain" && part.body?.data) {
      textContent = Buffer.from(part.body.data, "base64").toString("utf-8");
      break;
    }
  }

  // Fall back to HTML if no plain text
  if (!textContent) {
    for (const part of parts) {
      if (part.mimeType === "text/html" && part.body?.data) {
        const html = Buffer.from(part.body.data, "base64").toString("utf-8");
        textContent = html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
        break;
      }
    }
  }

  // Check payload body directly if no parts
  if (!textContent && message.data.payload?.body?.data) {
    textContent = Buffer.from(message.data.payload.body.data, "base64").toString("utf-8");
  }

  return {
    id: messageId,
    subject,
    from,
    date,
    content: textContent,
    snippet: message.data.snippet || "",
  };
}

export async function detectServicesInInbox(userId: string) {
  const gmail = await getGmailClient(userId);
  const allVendors = await db.query.vendors.findMany();

  const detectedServices: { vendor: typeof allVendors[0]; emailCount: number }[] = [];

  for (const vendor of allVendors) {
    if (!vendor.emailPatterns || vendor.emailPatterns.length === 0) continue;

    // Build query using domain patterns
    const fromQuery = vendor.emailPatterns.map((p) => `from:${p}`).join(" OR ");
    // Look for actual billing emails with dollar amounts
    const searchQuery = `(${fromQuery}) (invoice OR receipt OR "payment" OR "charged" OR "billing") ("$" OR "total" OR "amount")`;

    try {
      const response = await gmail.users.messages.list({
        userId: "me",
        q: searchQuery,
        maxResults: 10,
      });

      const count = response.data.resultSizeEstimate || 0;
      if (count > 0) {
        detectedServices.push({
          vendor,
          emailCount: count,
        });
      }
    } catch (error) {
      console.error(`Error searching for ${vendor.name}:`, error);
    }
  }

  return detectedServices.sort((a, b) => b.emailCount - a.emailCount);
}
