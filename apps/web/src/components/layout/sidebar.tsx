"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PrismLogo } from "@/components/ui/prism-logo";
import { 
  LayoutDashboard, 
  Receipt, 
  Bell, 
  Download,
  Settings,
  LogOut,
  CreditCard,
  ChevronLeft,
  ChevronRight
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/invoices", label: "Invoices", icon: Receipt },
  { href: "/alerts", label: "Alerts", icon: Bell },
  { href: "/export", label: "Export", icon: Download },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className={`fixed left-0 top-0 z-40 h-screen border-r border-border bg-card transition-all duration-300 ${collapsed ? "w-16" : "w-64"}`}>
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className={`flex h-16 items-center border-b border-border ${collapsed ? "justify-center px-2" : "px-6"}`}>
          <Link href="/dashboard">
            {collapsed ? (
              <span className="text-xl font-bold text-foreground">P<span className="bg-gradient-to-r from-violet-500 to-fuchsia-500 bg-clip-text text-transparent">m</span></span>
            ) : (
              <PrismLogo size="lg" />
            )}
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 p-2">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href || 
              (item.href !== "/dashboard" && pathname.startsWith(item.href));
            
            return (
              <Link
                key={item.href}
                href={item.href}
                title={collapsed ? item.label : undefined}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                } ${collapsed ? "justify-center" : ""}`}
              >
                <item.icon className="h-5 w-5 shrink-0" />
                {!collapsed && item.label}
              </Link>
            );
          })}
        </nav>

        {/* Bottom section */}
        <div className="border-t border-border p-2 space-y-1">
          <Link
            href="/billing"
            title={collapsed ? "Billing" : undefined}
            className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              pathname === "/billing"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            } ${collapsed ? "justify-center" : ""}`}
          >
            <CreditCard className="h-5 w-5 shrink-0" />
            {!collapsed && "Billing"}
          </Link>
          <Link
            href="/settings"
            title={collapsed ? "Settings" : undefined}
            className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              pathname === "/settings"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            } ${collapsed ? "justify-center" : ""}`}
          >
            <Settings className="h-5 w-5 shrink-0" />
            {!collapsed && "Settings"}
          </Link>
          <form action="/api/auth/signout" method="POST">
            <button
              type="submit"
              title={collapsed ? "Sign out" : undefined}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground ${collapsed ? "justify-center" : ""}`}
            >
              <LogOut className="h-5 w-5 shrink-0" />
              {!collapsed && "Sign out"}
            </button>
          </form>
          
          {/* Collapse toggle */}
          <button
            onClick={onToggle}
            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground ${collapsed ? "justify-center" : ""}`}
          >
            {collapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
            {!collapsed && "Collapse"}
          </button>
        </div>
      </div>
    </aside>
  );
}
