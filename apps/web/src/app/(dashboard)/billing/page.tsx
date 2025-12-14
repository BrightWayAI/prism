"use client";

import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CreditCard, Check, Loader2 } from "lucide-react";

interface BillingInfo {
  status: "trialing" | "active" | "canceled" | "past_due" | "unpaid" | null;
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
}

export default function BillingPage() {
  const [billing, setBilling] = useState<BillingInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchBilling();
  }, []);

  const fetchBilling = async () => {
    try {
      const res = await fetch("/api/billing");
      if (res.ok) {
        const data = await res.json();
        setBilling(data);
      }
    } catch (err) {
      console.error("Failed to fetch billing:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async () => {
    setActionLoading(true);
    try {
      const res = await fetch("/api/stripe/checkout", { method: "POST" });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error("Error creating checkout session:", error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleManageBilling = async () => {
    setActionLoading(true);
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error("Error creating portal session:", error);
    } finally {
      setActionLoading(false);
    }
  };

  const formatDate = (date: string | null) => {
    if (!date) return "—";
    return new Date(date).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  const getStatusBadge = () => {
    switch (billing?.status) {
      case "trialing":
        return <span className="rounded-full bg-blue-500/20 px-3 py-1 text-sm font-medium text-blue-500">Trial</span>;
      case "active":
        return <span className="rounded-full bg-green-500/20 px-3 py-1 text-sm font-medium text-green-500">Active</span>;
      case "canceled":
        return <span className="rounded-full bg-gray-500/20 px-3 py-1 text-sm font-medium text-gray-500">Canceled</span>;
      case "past_due":
        return <span className="rounded-full bg-red-500/20 px-3 py-1 text-sm font-medium text-red-500">Past Due</span>;
      default:
        return <span className="rounded-full bg-gray-500/20 px-3 py-1 text-sm font-medium text-gray-500">Free</span>;
    }
  };

  const hasSubscription = billing?.status && billing.status !== "canceled";

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Billing</h1>
          <p className="text-muted-foreground">
            Manage your subscription and payment details
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Current Plan */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Current Plan</CardTitle>
                  {getStatusBadge()}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {hasSubscription ? (
                  <>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Plan</span>
                        <span className="font-medium">Pro — $40/month</span>
                      </div>
                      {billing?.status === "trialing" && billing.trialEndsAt && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Trial ends</span>
                          <span className="font-medium">{formatDate(billing.trialEndsAt)}</span>
                        </div>
                      )}
                      {billing?.currentPeriodEnd && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">
                            {billing.status === "trialing" ? "First billing date" : "Next billing date"}
                          </span>
                          <span className="font-medium">{formatDate(billing.currentPeriodEnd)}</span>
                        </div>
                      )}
                    </div>
                    <Button 
                      variant="outline" 
                      className="w-full" 
                      onClick={handleManageBilling}
                      disabled={actionLoading}
                    >
                      {actionLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CreditCard className="mr-2 h-4 w-4" />}
                      Manage Subscription
                    </Button>
                  </>
                ) : (
                  <>
                    <p className="text-muted-foreground">
                      You&apos;re currently on the free plan. Upgrade to Pro to unlock all features.
                    </p>
                    <Button 
                      className="w-full" 
                      onClick={handleSubscribe}
                      disabled={actionLoading}
                    >
                      {actionLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      Start Free Trial — $40/month
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Pro Features */}
            <Card>
              <CardHeader>
                <CardTitle>Pro Features</CardTitle>
                <CardDescription>Everything you need to track your SaaS spend</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {[
                    "Unlimited services tracked",
                    "80+ vendor auto-detection",
                    "Spend alerts & notifications",
                    "Renewal reminders",
                    "CSV export for taxes",
                    "6-month invoice history",
                    "Priority support",
                  ].map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-green-500" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        )}

        {/* FAQ */}
        <Card>
          <CardHeader>
            <CardTitle>Frequently Asked Questions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="font-medium">Can I cancel anytime?</p>
              <p className="text-sm text-muted-foreground">
                Yes, you can cancel your subscription at any time. You&apos;ll continue to have access until the end of your billing period.
              </p>
            </div>
            <div>
              <p className="font-medium">What happens after my trial?</p>
              <p className="text-sm text-muted-foreground">
                After your 7-day trial, you&apos;ll be charged $40/month. Cancel before the trial ends to avoid charges.
              </p>
            </div>
            <div>
              <p className="font-medium">Is my payment secure?</p>
              <p className="text-sm text-muted-foreground">
                All payments are processed securely through Stripe. We never store your card details.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
