import { db } from "@prism/db";
import { aiUsageRecords, aiBudgets, aiAlerts, users } from "@prism/db/schema";
import { eq, gte, and, lt } from "drizzle-orm";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

interface BudgetCheckResult {
  shouldAlert: boolean;
  type: "budget_warning" | "budget_exceeded";
  currentSpend: number;
  budgetLimit: number;
  percentUsed: number;
  provider: "openai" | "anthropic" | null;
}

export async function checkBudgets(userId: string): Promise<BudgetCheckResult[]> {
  const results: BudgetCheckResult[] = [];

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const budgets = await db
    .select()
    .from(aiBudgets)
    .where(eq(aiBudgets.userId, userId));

  for (const budget of budgets) {
    const whereConditions = [
      eq(aiUsageRecords.userId, userId),
      gte(aiUsageRecords.recordedDate, startOfMonth),
    ];

    if (budget.provider) {
      whereConditions.push(eq(aiUsageRecords.provider, budget.provider));
    }

    const records = await db
      .select({ costUsd: aiUsageRecords.costUsd })
      .from(aiUsageRecords)
      .where(and(...whereConditions));

    const currentSpend = records.reduce((sum, r) => sum + Number(r.costUsd), 0);
    const percentUsed = (currentSpend / Number(budget.monthlyLimitUsd)) * 100;

    if (percentUsed >= 100) {
      results.push({
        shouldAlert: true,
        type: "budget_exceeded",
        currentSpend,
        budgetLimit: Number(budget.monthlyLimitUsd),
        percentUsed,
        provider: budget.provider,
      });
    } else if (percentUsed >= budget.alertThresholdPercent) {
      results.push({
        shouldAlert: true,
        type: "budget_warning",
        currentSpend,
        budgetLimit: Number(budget.monthlyLimitUsd),
        percentUsed,
        provider: budget.provider,
      });
    }
  }

  return results;
}

export async function checkSpendingAnomaly(userId: string): Promise<{
  shouldAlert: boolean;
  currentRate: number;
  averageRate: number;
  multiplier: number;
} | null> {
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const recentRecords = await db
    .select({ costUsd: aiUsageRecords.costUsd })
    .from(aiUsageRecords)
    .where(and(eq(aiUsageRecords.userId, userId), gte(aiUsageRecords.recordedDate, oneDayAgo)));

  const weekRecords = await db
    .select({ costUsd: aiUsageRecords.costUsd })
    .from(aiUsageRecords)
    .where(
      and(
        eq(aiUsageRecords.userId, userId),
        gte(aiUsageRecords.recordedDate, sevenDaysAgo),
        lt(aiUsageRecords.recordedDate, oneDayAgo)
      )
    );

  const currentRate = recentRecords.reduce((sum, r) => sum + Number(r.costUsd), 0);
  const weekTotal = weekRecords.reduce((sum, r) => sum + Number(r.costUsd), 0);
  const averageRate = weekTotal / 6;

  if (averageRate === 0) return null;

  const multiplier = currentRate / averageRate;

  return {
    shouldAlert: multiplier >= 3,
    currentRate,
    averageRate,
    multiplier,
  };
}

export async function sendAlertEmail(
  userId: string,
  alertType: string,
  message: string
): Promise<void> {
  const [user] = await db.select({ email: users.email }).from(users).where(eq(users.id, userId));

  if (!user?.email) return;

  const subjectEmoji = alertType === "budget_exceeded" ? "🚨" : "⚠️";
  const subjectText = alertType === "budget_exceeded" ? "Budget Exceeded" : "Budget Warning";

  await resend.emails.send({
    from: process.env.FROM_EMAIL || "alerts@prism.app",
    to: user.email,
    subject: `[Prism Alert] ${subjectEmoji} ${subjectText}`,
    html: `
      <h2>Prism AI Cost Alert</h2>
      <p>${message}</p>
      <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/ai-costs">View Dashboard</a></p>
    `,
  });
}

export async function processAlerts(userId: string): Promise<void> {
  const budgetResults = await checkBudgets(userId);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (const result of budgetResults) {
    if (result.shouldAlert) {
      // Check if we already sent an alert today for this type/provider
      const existingAlerts = await db
        .select()
        .from(aiAlerts)
        .where(
          and(
            eq(aiAlerts.userId, userId),
            eq(aiAlerts.type, result.type),
            gte(aiAlerts.createdAt, today)
          )
        );

      const existingAlert = existingAlerts.find((a) =>
        result.provider ? a.provider === result.provider : a.provider === null
      );

      if (!existingAlert) {
        const message =
          result.type === "budget_exceeded"
            ? `Your ${result.provider || "total"} spend has exceeded the $${result.budgetLimit} budget. Current spend: $${result.currentSpend.toFixed(2)}`
            : `Your ${result.provider || "total"} spend has reached ${result.percentUsed.toFixed(0)}% of your $${result.budgetLimit} budget. Current spend: $${result.currentSpend.toFixed(2)}`;

        await db.insert(aiAlerts).values({
          userId,
          type: result.type,
          provider: result.provider,
          message,
          details: result,
        });

        await sendAlertEmail(userId, result.type, message);
      }
    }
  }

  // Check for spending anomaly
  const anomalyResult = await checkSpendingAnomaly(userId);

  if (anomalyResult?.shouldAlert) {
    const existingAlerts = await db
      .select()
      .from(aiAlerts)
      .where(
        and(eq(aiAlerts.userId, userId), eq(aiAlerts.type, "anomaly"), gte(aiAlerts.createdAt, today))
      );

    if (existingAlerts.length === 0) {
      const message = `Unusual spending detected: $${anomalyResult.currentRate.toFixed(2)} in the last 24 hours (${anomalyResult.multiplier.toFixed(1)}x your 7-day average of $${anomalyResult.averageRate.toFixed(2)}/day)`;

      await db.insert(aiAlerts).values({
        userId,
        type: "anomaly",
        message,
        details: anomalyResult,
      });

      await sendAlertEmail(userId, "anomaly", message);
    }
  }
}
