import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@prism/db";
import { users } from "@prism/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [user] = await db
    .select({
      subscriptionStatus: users.subscriptionStatus,
      trialEndsAt: users.trialEndsAt,
      currentPeriodEnd: users.currentPeriodEnd,
    })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  return NextResponse.json({
    status: user?.subscriptionStatus || null,
    trialEndsAt: user?.trialEndsAt?.toISOString() || null,
    currentPeriodEnd: user?.currentPeriodEnd?.toISOString() || null,
  });
}
