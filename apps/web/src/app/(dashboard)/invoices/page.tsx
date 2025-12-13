"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Loader2, ArrowLeft, ExternalLink } from "lucide-react";

interface Invoice {
  id: string;
  amount: string;
  currency: string;
  invoiceDate: string;
  billingPeriodStart: string | null;
  billingPeriodEnd: string | null;
  billingFrequency: string | null;
  invoiceNumber: string | null;
  confidenceScore: string | null;
  isManuallyReviewed: boolean;
  vendorId: string | null;
  vendorName: string | null;
  vendorSlug: string | null;
  vendorLogo: string | null;
  vendorCategory: string | null;
}

export default function InvoicesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const vendorId = searchParams.get("vendorId");
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [vendorName, setVendorName] = useState<string | null>(null);

  useEffect(() => {
    const fetchInvoices = async () => {
      try {
        const params = new URLSearchParams();
        if (vendorId) params.set("vendorId", vendorId);
        
        const res = await fetch(`/api/invoices?${params.toString()}`);
        if (!res.ok) throw new Error("Failed to fetch invoices");
        
        const data = await res.json();
        setInvoices(data.invoices);
        
        if (data.invoices.length > 0 && data.invoices[0].vendorName) {
          setVendorName(data.invoices[0].vendorName);
        }
      } catch (error) {
        console.error("Error fetching invoices:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchInvoices();
  }, [vendorId]);

  const totalSpend = invoices.reduce(
    (sum, inv) => sum + parseFloat(inv.amount || "0"),
    0
  );

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <h1 className="text-xl font-bold">
            <span className="text-primary">Prism</span>
          </h1>
          <div className="flex items-center gap-4">
            <a href="/settings" className="text-sm text-muted-foreground hover:text-foreground">
              Settings
            </a>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 p-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.push("/dashboard")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold">
              {vendorName ? `${vendorName} Invoices` : "All Invoices"}
            </h2>
            <p className="text-muted-foreground">
              {invoices.length} invoice{invoices.length !== 1 ? "s" : ""} · Total:{" "}
              {formatCurrency(totalSpend)}
            </p>
          </div>
        </div>

        {invoices.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <p className="text-muted-foreground">No invoices found</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {invoices.map((invoice) => (
              <Card key={invoice.id} className="hover:bg-card/80 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary">
                        {invoice.vendorLogo ? (
                          <img
                            src={invoice.vendorLogo}
                            alt={invoice.vendorName || ""}
                            className="h-6 w-6 rounded"
                          />
                        ) : (
                          <span className="text-sm font-medium">
                            {(invoice.vendorName || "?").charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium">
                            {invoice.vendorName || "Unknown Vendor"}
                          </h3>
                          {invoice.vendorCategory && (
                            <Badge variant="secondary">{invoice.vendorCategory}</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span>{formatDate(invoice.invoiceDate)}</span>
                          {invoice.invoiceNumber && (
                            <>
                              <span>·</span>
                              <span>#{invoice.invoiceNumber}</span>
                            </>
                          )}
                          {invoice.billingFrequency && (
                            <>
                              <span>·</span>
                              <Badge variant="outline" className="text-xs">
                                {invoice.billingFrequency}
                              </Badge>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-semibold tabular-nums">
                        {formatCurrency(parseFloat(invoice.amount || "0"), invoice.currency)}
                      </p>
                      {invoice.billingPeriodStart && invoice.billingPeriodEnd && (
                        <p className="text-xs text-muted-foreground">
                          {formatDate(invoice.billingPeriodStart)} - {formatDate(invoice.billingPeriodEnd)}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
