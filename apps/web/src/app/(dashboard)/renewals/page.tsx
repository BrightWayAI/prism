"use client";

import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, AlertCircle, Loader2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface Renewal {
  vendorId: string;
  vendorName: string;
  vendorLogo: string | null;
  amount: number;
  currency: string;
  renewalDate: string;
  billingFrequency: "monthly" | "annual";
  daysUntilRenewal: number;
}

export default function RenewalsPage() {
  const [renewals, setRenewals] = useState<Renewal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRenewals();
  }, []);

  const fetchRenewals = async () => {
    try {
      const res = await fetch("/api/renewals");
      if (res.ok) {
        const data = await res.json();
        setRenewals(data.renewals || []);
      }
    } catch (err) {
      console.error("Failed to fetch renewals:", err);
    } finally {
      setLoading(false);
    }
  };

  const getUrgencyColor = (days: number) => {
    if (days <= 7) return "text-red-500 bg-red-500/10";
    if (days <= 30) return "text-amber-500 bg-amber-500/10";
    return "text-blue-500 bg-blue-500/10";
  };

  const upcomingRenewals = renewals.filter(r => r.daysUntilRenewal <= 30);
  const laterRenewals = renewals.filter(r => r.daysUntilRenewal > 30);

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Upcoming Renewals</h1>
          <p className="text-muted-foreground">
            Track when your subscriptions renew so you&apos;re never surprised
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : renewals.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Calendar className="h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-medium">No renewals tracked yet</h3>
              <p className="mt-2 text-sm text-muted-foreground text-center max-w-md">
                Once Prism detects annual or monthly subscriptions, you&apos;ll see 
                upcoming renewal dates here with reminders.
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {upcomingRenewals.length > 0 && (
              <div>
                <h2 className="mb-4 flex items-center gap-2 text-lg font-medium">
                  <AlertCircle className="h-5 w-5 text-amber-500" />
                  Coming up in the next 30 days
                </h2>
                <div className="space-y-3">
                  {upcomingRenewals.map((renewal) => (
                    <Card key={renewal.vendorId}>
                      <CardContent className="flex items-center gap-4 p-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-secondary">
                          {renewal.vendorLogo ? (
                            <img 
                              src={renewal.vendorLogo} 
                              alt={renewal.vendorName}
                              className="h-8 w-8 object-contain"
                            />
                          ) : (
                            <span className="text-lg font-bold">
                              {renewal.vendorName[0]}
                            </span>
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">{renewal.vendorName}</p>
                          <p className="text-sm text-muted-foreground">
                            {renewal.billingFrequency === "annual" ? "Annual" : "Monthly"} renewal
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">
                            {formatCurrency(renewal.amount, renewal.currency)}
                          </p>
                          <p className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${getUrgencyColor(renewal.daysUntilRenewal)}`}>
                            <Clock className="h-3 w-3" />
                            {renewal.daysUntilRenewal === 0 
                              ? "Today" 
                              : renewal.daysUntilRenewal === 1 
                                ? "Tomorrow"
                                : `${renewal.daysUntilRenewal} days`}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {laterRenewals.length > 0 && (
              <div>
                <h2 className="mb-4 text-lg font-medium">Later</h2>
                <div className="space-y-3">
                  {laterRenewals.map((renewal) => (
                    <Card key={renewal.vendorId}>
                      <CardContent className="flex items-center gap-4 p-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-secondary">
                          {renewal.vendorLogo ? (
                            <img 
                              src={renewal.vendorLogo} 
                              alt={renewal.vendorName}
                              className="h-8 w-8 object-contain"
                            />
                          ) : (
                            <span className="text-lg font-bold">
                              {renewal.vendorName[0]}
                            </span>
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">{renewal.vendorName}</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(renewal.renewalDate).toLocaleDateString("en-US", {
                              month: "long",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">
                            {formatCurrency(renewal.amount, renewal.currency)}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
}
