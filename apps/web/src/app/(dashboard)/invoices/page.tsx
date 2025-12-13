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
  // Email metadata for verification
  emailSubject: string | null;
  emailFrom: string | null;
  emailDate: string | null;
  extractedAmounts: string[] | null;
  rawEmailSnippet: string | null;
}

export default function InvoicesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const vendorId = searchParams.get("vendorId");
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [vendorName, setVendorName] = useState<string | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

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
              <Card 
                key={invoice.id} 
                className="hover:bg-card/80 transition-colors cursor-pointer"
                onClick={() => setSelectedInvoice(invoice)}
              >
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

        {/* Invoice Detail Modal */}
        {selectedInvoice && (
          <div 
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedInvoice(null)}
          >
            <Card 
              className="w-full max-w-2xl max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Invoice Details</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setSelectedInvoice(null)}>
                  ✕
                </Button>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Amount Section */}
                <div className="text-center py-4 border-b">
                  <p className="text-3xl font-bold tabular-nums">
                    {formatCurrency(parseFloat(selectedInvoice.amount || "0"), selectedInvoice.currency)}
                  </p>
                  <p className="text-muted-foreground">
                    {selectedInvoice.vendorName || "Unknown Vendor"} · {formatDate(selectedInvoice.invoiceDate)}
                  </p>
                </div>

                {/* Email Metadata */}
                <div className="space-y-3">
                  <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                    Email Source
                  </h4>
                  {selectedInvoice.emailSubject && (
                    <div>
                      <p className="text-xs text-muted-foreground">Subject</p>
                      <p className="text-sm font-medium">{selectedInvoice.emailSubject}</p>
                    </div>
                  )}
                  {selectedInvoice.emailFrom && (
                    <div>
                      <p className="text-xs text-muted-foreground">From</p>
                      <p className="text-sm">{selectedInvoice.emailFrom}</p>
                    </div>
                  )}
                  {selectedInvoice.emailDate && (
                    <div>
                      <p className="text-xs text-muted-foreground">Email Date</p>
                      <p className="text-sm">{selectedInvoice.emailDate}</p>
                    </div>
                  )}
                </div>

                {/* Extracted Amounts */}
                {selectedInvoice.extractedAmounts && selectedInvoice.extractedAmounts.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                      All Amounts Found in Email
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedInvoice.extractedAmounts.map((amt, i) => (
                        <Badge 
                          key={i} 
                          variant={amt === `$${parseFloat(selectedInvoice.amount).toFixed(2)}` ? "default" : "outline"}
                        >
                          {amt}
                          {amt === `$${parseFloat(selectedInvoice.amount).toFixed(2)}` && " ✓"}
                        </Badge>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      The highlighted amount was selected as the invoice total
                    </p>
                  </div>
                )}

                {/* Email Snippet */}
                {selectedInvoice.rawEmailSnippet && (
                  <div className="space-y-2">
                    <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                      Email Preview
                    </h4>
                    <p className="text-sm text-muted-foreground bg-secondary/50 p-3 rounded-lg">
                      {selectedInvoice.rawEmailSnippet}
                    </p>
                  </div>
                )}

                {/* Confidence Score */}
                {selectedInvoice.confidenceScore && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">Confidence:</span>
                    <Badge variant={parseFloat(selectedInvoice.confidenceScore) >= 0.8 ? "default" : "outline"}>
                      {(parseFloat(selectedInvoice.confidenceScore) * 100).toFixed(0)}%
                    </Badge>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
