"use client";

import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bell, TrendingUp, AlertTriangle, Calendar, Check, Loader2 } from "lucide-react";

interface Alert {
  id: string;
  type: "spend_increase" | "renewal_reminder" | "new_invoice" | "parse_failed";
  message: string;
  isRead: boolean;
  createdAt: string;
  invoiceId?: string;
}

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAlerts();
  }, []);

  const fetchAlerts = async () => {
    try {
      const res = await fetch("/api/alerts");
      if (res.ok) {
        const data = await res.json();
        setAlerts(data.alerts || []);
      }
    } catch (err) {
      console.error("Failed to fetch alerts:", err);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (alertId: string) => {
    try {
      await fetch(`/api/alerts/${alertId}/read`, { method: "POST" });
      setAlerts(alerts.map(a => a.id === alertId ? { ...a, isRead: true } : a));
    } catch (err) {
      console.error("Failed to mark alert as read:", err);
    }
  };

  const markAllAsRead = async () => {
    try {
      await fetch("/api/alerts/read-all", { method: "POST" });
      setAlerts(alerts.map(a => ({ ...a, isRead: true })));
    } catch (err) {
      console.error("Failed to mark all as read:", err);
    }
  };

  const getAlertIcon = (type: Alert["type"]) => {
    switch (type) {
      case "spend_increase":
        return <TrendingUp className="h-5 w-5 text-amber-500" />;
      case "renewal_reminder":
        return <Calendar className="h-5 w-5 text-blue-500" />;
      case "new_invoice":
        return <Bell className="h-5 w-5 text-green-500" />;
      case "parse_failed":
        return <AlertTriangle className="h-5 w-5 text-red-500" />;
      default:
        return <Bell className="h-5 w-5" />;
    }
  };

  const unreadCount = alerts.filter(a => !a.isRead).length;

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Alerts</h1>
            <p className="text-muted-foreground">
              Spend spikes, renewal reminders, and notifications
            </p>
          </div>
          {unreadCount > 0 && (
            <Button variant="outline" onClick={markAllAsRead}>
              <Check className="mr-2 h-4 w-4" />
              Mark all as read
            </Button>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : alerts.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Bell className="h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-medium">No alerts yet</h3>
              <p className="mt-2 text-sm text-muted-foreground text-center max-w-md">
                You&apos;ll see notifications here when your spend increases significantly, 
                renewals are coming up, or new invoices are detected.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {alerts.map((alert) => (
              <Card 
                key={alert.id} 
                className={`transition-colors ${!alert.isRead ? "border-primary/50 bg-primary/5" : ""}`}
              >
                <CardContent className="flex items-start gap-4 p-4">
                  <div className="mt-0.5">
                    {getAlertIcon(alert.type)}
                  </div>
                  <div className="flex-1">
                    <p className={`text-sm ${!alert.isRead ? "font-medium" : ""}`}>
                      {alert.message}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {new Date(alert.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  {!alert.isRead && (
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => markAsRead(alert.id)}
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
