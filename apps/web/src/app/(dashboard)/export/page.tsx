"use client";

import { useState } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, FileSpreadsheet, Calendar, Loader2, Check } from "lucide-react";

const EXPORT_RANGES = [
  { value: "current-year", label: "Current Year", description: "All invoices from this year" },
  { value: "last-year", label: "Last Year", description: "All invoices from last year" },
  { value: "all", label: "All Time", description: "Complete invoice history" },
  { value: "custom", label: "Custom Range", description: "Select specific dates" },
];

export default function ExportPage() {
  const [selectedRange, setSelectedRange] = useState("current-year");
  const [exporting, setExporting] = useState(false);
  const [exported, setExported] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    setExported(false);
    
    try {
      const res = await fetch(`/api/export?range=${selectedRange}`);
      
      if (!res.ok) throw new Error("Export failed");
      
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `prism-invoices-${selectedRange}-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      setExported(true);
      setTimeout(() => setExported(false), 3000);
    } catch (err) {
      console.error("Export failed:", err);
    } finally {
      setExporting(false);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Export Data</h1>
          <p className="text-muted-foreground">
            Download your invoice data as CSV for taxes, expense reports, or analysis
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {EXPORT_RANGES.map((range) => (
            <Card 
              key={range.value}
              className={`cursor-pointer transition-colors ${
                selectedRange === range.value 
                  ? "border-primary bg-primary/5" 
                  : "hover:border-primary/50"
              }`}
              onClick={() => setSelectedRange(range.value)}
            >
              <CardContent className="flex items-start gap-4 p-4">
                <div className={`mt-1 flex h-5 w-5 items-center justify-center rounded-full border-2 ${
                  selectedRange === range.value 
                    ? "border-primary bg-primary" 
                    : "border-muted-foreground"
                }`}>
                  {selectedRange === range.value && (
                    <Check className="h-3 w-3 text-primary-foreground" />
                  )}
                </div>
                <div>
                  <p className="font-medium">{range.label}</p>
                  <p className="text-sm text-muted-foreground">{range.description}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              CSV Export
            </CardTitle>
            <CardDescription>
              Export includes: Date, Vendor, Amount, Category, Invoice Number
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={handleExport} 
              disabled={exporting}
              className="w-full sm:w-auto"
            >
              {exporting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : exported ? (
                <Check className="mr-2 h-4 w-4" />
              ) : (
                <Download className="mr-2 h-4 w-4" />
              )}
              {exporting ? "Exporting..." : exported ? "Downloaded!" : "Download CSV"}
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-secondary/30">
          <CardContent className="p-6">
            <h3 className="font-medium">Tax Time Tips</h3>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li>• Export &quot;Last Year&quot; for annual tax filing</li>
              <li>• The CSV can be imported directly into most accounting software</li>
              <li>• All amounts are in the original invoice currency</li>
              <li>• Categories help you organize deductions by type</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
