import { NextResponse } from "next/server";
import { db } from "@prism/db";
import { aiIntegrations } from "@prism/db/schema";
import { eq } from "drizzle-orm";
import { processAlerts } from "@/lib/services/alerts";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Get all users with active integrations
    const integrations = await db
      .select({ userId: aiIntegrations.userId })
      .from(aiIntegrations)
      .where(eq(aiIntegrations.status, "active"));

    const uniqueUsers = [...new Set(integrations.map((i) => i.userId))];

    for (const userId of uniqueUsers) {
      try {
        await processAlerts(userId);
      } catch (e) {
        console.error(`Failed to process alerts for user ${userId}:`, e);
      }
    }

    return NextResponse.json({ success: true, processed: uniqueUsers.length });
  } catch (error) {
    console.error("Alerts cron failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
