"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { TrendingUp, TrendingDown, DollarSign, Target, Zap, AlertTriangle } from "lucide-react";

interface SummaryCardsProps {
  currentMonthTotal: number;
  lastMonthTotal: number;
  projectedSpend: number;
  budgets: Array<{
    provider: string | null;
    monthlyLimitUsd: string;
  }>;
  inputTokens: number;
  outputTokens: number;
}

export function SummaryCards({
  currentMonthTotal,
  lastMonthTotal,
  projectedSpend,
  budgets,
  inputTokens,
  outputTokens,
}: SummaryCardsProps) {
  const percentChange =
    lastMonthTotal > 0 ? ((currentMonthTotal - lastMonthTotal) / lastMonthTotal) * 100 : 0;

  const totalBudget = budgets.find((b) => !b.provider);
  const budgetUsed = totalBudget
    ? (currentMonthTotal / Number(totalBudget.monthlyLimitUsd)) * 100
    : null;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Current Month Spend</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(currentMonthTotal)}</div>
          <div className="flex items-center text-xs text-muted-foreground">
            {percentChange >= 0 ? (
              <TrendingUp className="mr-1 h-3 w-3 text-red-500" />
            ) : (
              <TrendingDown className="mr-1 h-3 w-3 text-green-500" />
            )}
            <span className={percentChange >= 0 ? "text-red-500" : "text-green-500"}>
              {Math.abs(percentChange).toFixed(1)}%
            </span>
            <span className="ml-1">vs last month</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Projected Spend</CardTitle>
          <Target className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(projectedSpend)}</div>
          <p className="text-xs text-muted-foreground">End of month estimate</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Budget Status</CardTitle>
          {budgetUsed && budgetUsed >= 80 ? (
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
          ) : (
            <Target className="h-4 w-4 text-muted-foreground" />
          )}
        </CardHeader>
        <CardContent>
          {budgetUsed !== null ? (
            <>
              <div className="text-2xl font-bold">{budgetUsed.toFixed(0)}%</div>
              <div className="mt-2 h-2 w-full rounded-full bg-secondary">
                <div
                  className={`h-2 rounded-full ${
                    budgetUsed >= 100
                      ? "bg-red-500"
                      : budgetUsed >= 80
                        ? "bg-yellow-500"
                        : "bg-green-500"
                  }`}
                  style={{ width: `${Math.min(budgetUsed, 100)}%` }}
                />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {formatCurrency(currentMonthTotal)} of {formatCurrency(Number(totalBudget?.monthlyLimitUsd))}
              </p>
            </>
          ) : (
            <>
              <div className="text-2xl font-bold">--</div>
              <p className="text-xs text-muted-foreground">No budget set</p>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Token Usage</CardTitle>
          <Zap className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {((inputTokens + outputTokens) / 1_000_000).toFixed(2)}M
          </div>
          <p className="text-xs text-muted-foreground">
            {(inputTokens / 1_000_000).toFixed(2)}M in / {(outputTokens / 1_000_000).toFixed(2)}M out
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
