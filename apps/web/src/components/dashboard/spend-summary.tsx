"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { TrendingUp, TrendingDown, DollarSign, Calendar } from "lucide-react";

interface SpendSummaryProps {
  totalSpend: number;
  previousSpend: number;
  currency?: string;
  serviceCount: number;
  upcomingRenewals: number;
}

export function SpendSummary({
  totalSpend,
  previousSpend,
  currency = "USD",
  serviceCount,
  upcomingRenewals,
}: SpendSummaryProps) {
  const percentChange = previousSpend > 0
    ? ((totalSpend - previousSpend) / previousSpend) * 100
    : 0;
  const isIncrease = percentChange > 0;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Monthly Spend
          </CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold tabular-nums">
            {formatCurrency(totalSpend, currency)}
          </div>
          <p className="mt-1 flex items-center text-xs text-muted-foreground">
            {isIncrease ? (
              <TrendingUp className="mr-1 h-3 w-3 text-destructive-foreground" />
            ) : (
              <TrendingDown className="mr-1 h-3 w-3 text-success" />
            )}
            <span className={isIncrease ? "text-destructive-foreground" : "text-success"}>
              {isIncrease ? "+" : ""}
              {percentChange.toFixed(1)}%
            </span>
            <span className="ml-1">from last month</span>
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Annual Projection
          </CardTitle>
          <Calendar className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold tabular-nums">
            {formatCurrency(totalSpend * 12, currency)}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Based on current monthly spend
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Active Services
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold tabular-nums">{serviceCount}</div>
          <p className="mt-1 text-xs text-muted-foreground">
            Tracked subscriptions
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Upcoming Renewals
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold tabular-nums">{upcomingRenewals}</div>
          <p className="mt-1 text-xs text-muted-foreground">
            Within next 30 days
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
