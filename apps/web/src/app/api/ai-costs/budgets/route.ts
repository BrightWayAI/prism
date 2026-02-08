import { auth } from "@/lib/auth";
import { db } from "@prism/db";
import { aiBudgets } from "@prism/db/schema";
import { NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { provider, monthlyLimitUsd, alertThresholdPercent } = await request.json();

  if (provider && !["openai", "anthropic"].includes(provider)) {
    return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
  }

  if (!monthlyLimitUsd || monthlyLimitUsd <= 0) {
    return NextResponse.json({ error: "Invalid monthly limit" }, { status: 400 });
  }

  // Check if budget exists
  const existing = await db
    .select()
    .from(aiBudgets)
    .where(
      and(
        eq(aiBudgets.userId, session.user.id),
        provider ? eq(aiBudgets.provider, provider) : eq(aiBudgets.provider, null as unknown as "openai")
      )
    );

  let budget;

  if (existing.length > 0) {
    [budget] = await db
      .update(aiBudgets)
      .set({
        monthlyLimitUsd: monthlyLimitUsd.toString(),
        alertThresholdPercent: alertThresholdPercent || 80,
      })
      .where(eq(aiBudgets.id, existing[0].id))
      .returning();
  } else {
    [budget] = await db
      .insert(aiBudgets)
      .values({
        userId: session.user.id,
        provider: provider || null,
        monthlyLimitUsd: monthlyLimitUsd.toString(),
        alertThresholdPercent: alertThresholdPercent || 80,
      })
      .returning();
  }

  return NextResponse.json({ success: true, budget });
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const budgets = await db.select().from(aiBudgets).where(eq(aiBudgets.userId, session.user.id));

  return NextResponse.json({ budgets });
}

export async function DELETE(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await request.json();

  await db
    .delete(aiBudgets)
    .where(and(eq(aiBudgets.id, id), eq(aiBudgets.userId, session.user.id)));

  return NextResponse.json({ success: true });
}
