import { google } from "googleapis";
import { db, accounts, vendors } from "@prism/db";
import { CURATED_VENDOR_SLUGS } from "@prism/db/curated-vendors";
import { eq, and, inArray } from "drizzle-orm";

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

function buildVendorInvoiceQuery(emailPatterns: string[], daysBack: number): string {
  const date = new Date();
  date.setDate(date.getDate() - daysBack);
  const afterDate = date.toISOString().split("T")[0].replace(/-/g, "/");
  
  // Build from: query for this vendor's email patterns
  const fromQuery = emailPatterns.map(p => `from:${p}`).join(" OR ");
  
  // Search for billing-related emails from this vendor.
  // Keep this broader than the "broad" keyword scan because some vendors don't include obvious invoice keywords.
  return `(${fromQuery}) (receipt OR invoice OR billing OR payment OR charged OR statement OR renewal OR renewed OR subscription OR "plan") -"budget alert" -"usage alert" -reminder -in:spam -in:trash after:${afterDate}`;
}

async function listMessages(
  gmail: ReturnType<typeof google.gmail>,
  query: string,
  maxResults: number
) {
  const messages: { id?: string | null; threadId?: string | null }[] = [];
  let pageToken: string | undefined;

  while (messages.length < maxResults) {
    const remaining = maxResults - messages.length;
    const response = await gmail.users.messages.list({
      userId: "me",
      q: query,
      maxResults: Math.min(500, remaining),
      pageToken,
    });

    if (response.data.messages) {
      messages.push(...response.data.messages);
    }

    pageToken = response.data.nextPageToken || undefined;
    if (!pageToken) break;
  }

  return messages;
}

export async function searchInvoiceEmails(
  userId: string,
  options: { daysBack?: number; maxResults?: number; vendorIds?: string[] } = {}
) {
  const gmail = await getGmailClient(userId);
  const { maxResults = 200, daysBack = 90, vendorIds } = options;

  // Build date query
  const date = new Date();
  date.setDate(date.getDate() - daysBack);
  const afterDate = date.toISOString().split("T")[0].replace(/-/g, "/");
  
  // BROAD search: Find ANY email that looks like an invoice or receipt.
  // IMPORTANT: don't exclude "unsubscribe" — many legit receipts include it in the footer.
  const keywordQuery = [
    "invoice",
    "receipt",
    '"payment received"',
    '"payment confirmation"',
    '"payment amount"',
    '"your payment"',
    '"successfully charged"',
    '"billing statement"',
    '"tax invoice"',
    '"order confirmation"',
  ].join(" OR ");

  const broadQuery = `(${keywordQuery}) -"budget alert" -"budget reached" -"usage alert" -reminder -"payment due" -"payment failed" -in:spam -in:trash after:${afterDate}`;

  console.log("Gmail search query (broad):", broadQuery);

  // Reserve capacity for vendor-pattern searches so noisy inboxes don't crowd out vendor receipts.
  const broadLimit = Math.min(maxResults, 400);
  const broadMessages = await listMessages(gmail, broadQuery, broadLimit);

  // Vendor-pattern search fills gaps when the broad query misses receipts (some vendors don't include obvious keywords).
  // We do this even when vendorIds is not provided, but we only fetch additional messages up to the maxResults cap.
  let vendorMessages: { id?: string | null; threadId?: string | null }[] = [];
  const remainingForVendors = Math.max(0, maxResults - broadMessages.length);

  if (remainingForVendors > 0) {
    const vendorsToSearch = vendorIds && vendorIds.length > 0
      ? await db.query.vendors.findMany({
          where: (v, { inArray }) => inArray(v.id, vendorIds),
        })
      : await db.query.vendors.findMany({
          where: (v, { inArray }) => inArray(v.slug, CURATED_VENDOR_SLUGS),
        });

    const basePatterns = vendorsToSearch.flatMap((v) => v.emailPatterns || []);

    // Always include payment processors that send receipts on behalf of tools.
    const paymentProcessors = [
      "@stripe.com",
      "@paddle.com",
      "@chargebee.com",
      "@recurly.com",
      "@braintreegateway.com",
      "payments-noreply@google.com",
    ];

    for (const processor of paymentProcessors) {
      if (!basePatterns.includes(processor)) basePatterns.push(processor);
    }

    // Chunk patterns to avoid Gmail query length limits.
    const chunkSize = 20;
    for (let i = 0; i < basePatterns.length && vendorMessages.length < remainingForVendors; i += chunkSize) {
      const chunk = basePatterns.slice(i, i + chunkSize);
      const vendorQuery = buildVendorInvoiceQuery(chunk, daysBack);
      console.log("Gmail search query (vendors chunk):", vendorQuery);
      const batch = await listMessages(gmail, vendorQuery, remainingForVendors - vendorMessages.length);
      vendorMessages.push(...batch);
    }
  }

  const merged = new Map<string, { id?: string | null; threadId?: string | null }>();
  for (const m of [...broadMessages, ...vendorMessages]) {
    if (typeof m.id === "string" && m.id.length > 0) merged.set(m.id, m);
  }

  console.log(
    `Found ${merged.size} potential invoice emails (broad=${broadMessages.length}, vendors=${vendorMessages.length})`
  );

  return Array.from(merged.values());
}

// Recursively extract text content from email parts
function extractTextFromParts(parts: any[], preferPlainText: boolean = true): string {
  let plainText = "";
  let htmlText = "";
  
  for (const part of parts) {
    // If this part has nested parts, recurse
    if (part.parts && part.parts.length > 0) {
      const nested = extractTextFromParts(part.parts, preferPlainText);
      if (nested) {
        if (part.mimeType?.includes("plain")) {
          plainText += nested;
        } else {
          htmlText += nested;
        }
      }
    }
    
    // Extract content from this part
    if (part.body?.data) {
      const decoded = Buffer.from(part.body.data, "base64").toString("utf-8");
      if (part.mimeType === "text/plain") {
        plainText += decoded + "\n";
      } else if (part.mimeType === "text/html") {
        // Strip HTML tags
        const stripped = decoded.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
        htmlText += stripped + "\n";
      }
    }
  }
  
  return preferPlainText && plainText ? plainText : htmlText || plainText;
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

  // Get body content - recursively extract from nested parts
  const parts = message.data.payload?.parts || [];
  if (parts.length > 0) {
    textContent = extractTextFromParts(parts);
  }

  // Check payload body directly if no parts found content
  if (!textContent && message.data.payload?.body?.data) {
    const decoded = Buffer.from(message.data.payload.body.data, "base64").toString("utf-8");
    if (message.data.payload.mimeType === "text/html") {
      textContent = decoded.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
    } else {
      textContent = decoded;
    }
  }

  // Last resort: use the snippet from Gmail
  if (!textContent && message.data.snippet) {
    textContent = message.data.snippet;
    console.log(`Using snippet for "${subject}" - no body content extracted`);
  }

  // Log content length for debugging
  console.log(`Email "${subject.slice(0, 50)}..." content length: ${textContent.length} chars`);

  return {
    id: messageId,
    subject,
    from,
    date,
    content: textContent,
    snippet: message.data.snippet || "",
  };
}

export async function detectServicesInInbox(userId: string, daysBack: number = 90) {
  const gmail = await getGmailClient(userId);
  const allVendors = await db.query.vendors.findMany({
    where: inArray(vendors.slug, CURATED_VENDOR_SLUGS),
  });

  // Build date query
  const date = new Date();
  date.setDate(date.getDate() - daysBack);
  const afterDate = date.toISOString().split("T")[0].replace(/-/g, "/");

  const detectedServices: { vendor: typeof allVendors[0]; emailCount: number }[] = [];

  console.log(`Scanning for vendors in last ${daysBack} days...`);

  for (const vendor of allVendors) {
    if (!vendor.emailPatterns || vendor.emailPatterns.length === 0) continue;

    // Build query using domain patterns
    const fromQuery = vendor.emailPatterns.map((p) => `from:${p}`).join(" OR ");
    // Look for billing emails from this vendor within date range
    const searchQuery = `(${fromQuery}) (invoice OR receipt OR "payment" OR "charged" OR "billing") after:${afterDate}`;

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

  // Also check for Stripe receipts and extract vendor names from subjects
  // This catches vendors that only use Stripe (no direct email patterns)
  const stripeQuery = `from:@stripe.com subject:"receipt from" after:${afterDate}`;
  try {
    const stripeResponse = await gmail.users.messages.list({
      userId: "me",
      q: stripeQuery,
      maxResults: 50,
    });
    
    if (stripeResponse.data.messages && stripeResponse.data.messages.length > 0) {
      console.log(`Found ${stripeResponse.data.messages.length} Stripe receipts to check for vendors`);
    }
  } catch (error) {
    console.error("Error searching Stripe receipts:", error);
  }

  return detectedServices.sort((a, b) => b.emailCount - a.emailCount);
}
