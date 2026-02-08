import { auth } from "@/lib/auth";
import { db } from "@prism/db";
import { aiUsageRecords, aiBudgets, aiAlerts } from "@prism/db/schema";
import { NextResponse } from "next/server";
import { eq, gte, lte, and, desc } from "drizzle-orm";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

  const currentMonthData = await db
    .select({
      provider: aiUsageRecords.provider,
      model: aiUsageRecords.model,
      costUsd: aiUsageRecords.costUsd,
      inputTokens: aiUsageRecords.inputTokens,
      outputTokens: aiUsageRecords.outputTokens,
      recordedDate: aiUsageRecords.recordedDate,
    })
    .from(aiUsageRecords)
    .where(
      and(eq(aiUsageRecords.userId, session.user.id), gte(aiUsageRecords.recordedDate, startOfMonth))
    );

  const lastMonthData = await db
    .select({ costUsd: aiUsageRecords.costUsd })
    .from(aiUsageRecords)
    .where(
      and(
        eq(aiUsageRecords.userId, session.user.id),
        gte(aiUsageRecords.recordedDate, startOfLastMonth),
        lte(aiUsageRecords.recordedDate, endOfLastMonth)
      )
    );

  const budgets = await db.select().from(aiBudgets).where(eq(aiBudgets.userId, session.user.id));

  const alerts = await db
    .select()
    .from(aiAlerts)
    .where(eq(aiAlerts.userId, session.user.id))
    .orderBy(desc(aiAlerts.createdAt))
    .limit(5);

  const currentMonthTotal = currentMonthData.reduce((sum, r) => sum + Number(r.costUsd), 0);
  const lastMonthTotal = lastMonthData.reduce((sum, r) => sum + Number(r.costUsd), 0);

  // Aggregate by provider
  const byProvider: Record<string, number> = {};
  for (const record of currentMonthData) {
    byProvider[record.provider] = (byProvider[record.provider] || 0) + Number(record.costUsd);
  }

  // Aggregate by model
  const byModel: Record<string, number> = {};
  for (const record of currentMonthData) {
    byModel[record.model] = (byModel[record.model] || 0) + Number(record.costUsd);
  }

  // Daily trend
  const dailySpend: Record<string, number> = {};
  for (const record of currentMonthData) {
    const dateKey = record.recordedDate.toISOString().split("T")[0];
    dailySpend[dateKey] = (dailySpend[dateKey] || 0) + Number(record.costUsd);
  }

  // Projected spend
  const dayOfMonth = now.getDate();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const projectedSpend = dayOfMonth > 0 ? (currentMonthTotal / dayOfMonth) * daysInMonth : 0;

  // Token stats
  const totalInputTokens = currentMonthData.reduce((sum, r) => sum + r.inputTokens, 0);
  const totalOutputTokens = currentMonthData.reduce((sum, r) => sum + r.outputTokens, 0);

  return NextResponse.json({
    currentMonth: {
      total: currentMonthTotal,
      byProvider,
      byModel,
      dailyTrend: Object.entries(dailySpend)
        .map(([date, amount]) => ({ date, amount }))
        .sort((a, b) => a.date.localeCompare(b.date)),
      inputTokens: totalInputTokens,
      outputTokens: totalOutputTokens,
    },
    lastMonth: {
      total: lastMonthTotal,
    },
    projectedSpend,
    budgets,
    alerts,
  });
}
