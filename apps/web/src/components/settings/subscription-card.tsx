"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type SubscriptionStatus = "trialing" | "active" | "canceled" | "past_due" | "unpaid" | null;

interface SubscriptionCardProps {
  status: SubscriptionStatus;
  trialEndsAt: Date | null;
  currentPeriodEnd: Date | null;
}

export function SubscriptionCard({ status, trialEndsAt, currentPeriodEnd }: SubscriptionCardProps) {
  const [loading, setLoading] = useState(false);

  const handleSubscribe = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/checkout", { method: "POST" });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error("Error creating checkout session:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleManageBilling = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error("Error creating portal session:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: Date | null) => {
    if (!date) return "—";
    return new Date(date).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  const getStatusBadge = () => {
    switch (status) {
      case "trialing":
        return <span className="rounded-full bg-blue-500/20 px-2 py-1 text-xs font-medium text-blue-500">Trial</span>;
      case "active":
        return <span className="rounded-full bg-green-500/20 px-2 py-1 text-xs font-medium text-green-500">Active</span>;
      case "canceled":
        return <span className="rounded-full bg-gray-500/20 px-2 py-1 text-xs font-medium text-gray-500">Canceled</span>;
      case "past_due":
        return <span className="rounded-full bg-red-500/20 px-2 py-1 text-xs font-medium text-red-500">Past Due</span>;
      case "unpaid":
        return <span className="rounded-full bg-red-500/20 px-2 py-1 text-xs font-medium text-red-500">Unpaid</span>;
      default:
        return <span className="rounded-full bg-gray-500/20 px-2 py-1 text-xs font-medium text-gray-500">Free</span>;
    }
  };

  const hasSubscription = status && status !== "canceled";

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Subscription</CardTitle>
            <CardDescription>Manage your Prism subscription</CardDescription>
          </div>
          {getStatusBadge()}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {hasSubscription ? (
          <>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Plan</span>
                <span className="font-medium">Pro — $40/month</span>
              </div>
              {status === "trialing" && trialEndsAt && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Trial ends</span>
                  <span className="font-medium">{formatDate(trialEndsAt)}</span>
                </div>
              )}
              {currentPeriodEnd && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {status === "trialing" ? "First billing date" : "Next billing date"}
                  </span>
                  <span className="font-medium">{formatDate(currentPeriodEnd)}</span>
                </div>
              )}
            </div>
            <Button variant="outline" onClick={handleManageBilling} disabled={loading} className="w-full">
              {loading ? "Loading..." : "Manage Billing"}
            </Button>
          </>
        ) : (
          <>
            <div className="rounded-lg bg-secondary/50 p-4">
              <p className="font-medium">Upgrade to Pro</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Get unlimited invoice tracking, spend alerts, and CSV exports for taxes.
              </p>
              <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
                <li>✓ 7-day free trial</li>
                <li>✓ 80+ vendor detection</li>
                <li>✓ Spend alerts & notifications</li>
                <li>✓ CSV export for taxes</li>
              </ul>
            </div>
            <Button onClick={handleSubscribe} disabled={loading} className="w-full">
              {loading ? "Loading..." : "Start Free Trial — $40/month"}
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              No credit card required to start. Cancel anytime.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
