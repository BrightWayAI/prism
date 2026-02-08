import { NextResponse } from "next/server";
import { syncAllIntegrations } from "@/lib/services/sync";

export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await syncAllIntegrations();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Sync cron failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
