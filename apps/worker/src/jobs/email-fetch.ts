import { google } from "googleapis";
import { Queue } from "bullmq";
import IORedis from "ioredis";
import { eq, and } from "drizzle-orm";
import { db, users, userVendors, vendors, accounts } from "@prism/db";

interface EmailFetchJobData {
  userId: string;
  lookbackMonths?: number;
}

const connection = new IORedis(process.env.REDIS_URL || "redis://localhost:6379", {
  maxRetriesPerRequest: null,
});

const parseQueue = new Queue("invoice-parse", { connection });

export async function handleEmailFetch(data: EmailFetchJobData) {
  const { userId, lookbackMonths = 6 } = data;

  // Get user's Google account with refresh token
  const account = await db.query.accounts.findFirst({
    where: and(
      eq(accounts.userId, userId),
      eq(accounts.provider, "google")
    ),
  });

  if (!account?.refresh_token) {
    throw new Error("No Google refresh token found for user");
  }

  // Get tracked vendors for this user
  const trackedVendors = await db
    .select({ emailPatterns: vendors.emailPatterns })
    .from(userVendors)
    .innerJoin(vendors, eq(userVendors.vendorId, vendors.id))
    .where(and(eq(userVendors.userId, userId), eq(userVendors.isActive, true)));

  const emailPatterns = trackedVendors
    .flatMap((v) => v.emailPatterns || [])
    .filter(Boolean);

  if (emailPatterns.length === 0) {
    console.log("No email patterns to search for");
    return;
  }

  // Setup Gmail API client
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );

  oauth2Client.setCredentials({
    refresh_token: account.refresh_token,
  });

  const gmail = google.gmail({ version: "v1", auth: oauth2Client });

  // Build search query
  const fromQuery = emailPatterns.map((p) => `from:${p}`).join(" OR ");
  const afterDate = new Date();
  afterDate.setMonth(afterDate.getMonth() - lookbackMonths);
  const afterQuery = `after:${afterDate.toISOString().split("T")[0].replace(/-/g, "/")}`;
  const searchQuery = `(${fromQuery}) ${afterQuery} (invoice OR receipt OR payment OR billing)`;

  // Fetch messages
  const response = await gmail.users.messages.list({
    userId: "me",
    q: searchQuery,
    maxResults: 100,
  });

  const messages = response.data.messages || [];
  console.log(`Found ${messages.length} potential invoice emails`);

  // Queue each message for parsing
  for (const message of messages) {
    await parseQueue.add(
      "parse",
      {
        userId,
        messageId: message.id,
      },
      {
        jobId: `parse-${userId}-${message.id}`,
        attempts: 3,
        backoff: { type: "exponential", delay: 5000 },
      }
    );
  }

  // Update last sync time
  await db
    .update(users)
    .set({ lastSyncAt: new Date() })
    .where(eq(users.id, userId));
}
