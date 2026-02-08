import { auth } from "@/lib/auth";
import { db } from "@prism/db";
import { aiAlerts } from "@prism/db/schema";
import { NextResponse } from "next/server";
import { eq, and, desc } from "drizzle-orm";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const alerts = await db
    .select()
    .from(aiAlerts)
    .where(eq(aiAlerts.userId, session.user.id))
    .orderBy(desc(aiAlerts.createdAt))
    .limit(50);

  return NextResponse.json({ alerts });
}

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, acknowledged } = await request.json();

  const [alert] = await db
    .update(aiAlerts)
    .set({ acknowledged })
    .where(and(eq(aiAlerts.id, id), eq(aiAlerts.userId, session.user.id)))
    .returning();

  return NextResponse.json({ success: true, alert });
}
