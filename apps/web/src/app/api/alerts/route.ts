import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@prism/db";
import { alerts } from "@prism/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userAlerts = await db
    .select()
    .from(alerts)
    .where(eq(alerts.userId, session.user.id))
    .orderBy(desc(alerts.createdAt))
    .limit(50);

  return NextResponse.json({ alerts: userAlerts });
}
