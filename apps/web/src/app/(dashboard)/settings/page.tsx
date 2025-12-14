import { auth, signOut } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { db } from "@prism/db";
import { users } from "@prism/db/schema";
import { eq } from "drizzle-orm";
import { SubscriptionCard } from "@/components/settings/subscription-card";

export default async function SettingsPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, session.user.id!))
    .limit(1);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <h1 className="text-xl font-bold">
            <span className="text-primary">Prism</span>
          </h1>
          <nav className="flex items-center gap-4">
            <a href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">
              Dashboard
            </a>
            <span className="text-sm font-medium">Settings</span>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-2xl space-y-6 p-6">
        <div>
          <h2 className="text-2xl font-semibold">Settings</h2>
          <p className="text-muted-foreground">Manage your account and preferences</p>
        </div>

        <SubscriptionCard 
          status={user?.subscriptionStatus || null}
          trialEndsAt={user?.trialEndsAt || null}
          currentPeriodEnd={user?.currentPeriodEnd || null}
        />

        <Card>
          <CardHeader>
            <CardTitle>Alert Preferences</CardTitle>
            <CardDescription>Configure when and how you receive notifications</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Spend increase alerts</p>
                <p className="text-sm text-muted-foreground">
                  Get notified when spending increases by more than 20%
                </p>
              </div>
              <input type="checkbox" defaultChecked className="h-4 w-4" />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Renewal reminders</p>
                <p className="text-sm text-muted-foreground">
                  Get reminded 30 days before annual renewals
                </p>
              </div>
              <input type="checkbox" defaultChecked className="h-4 w-4" />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Email notifications</p>
                <p className="text-sm text-muted-foreground">
                  Receive alerts via email in addition to in-app
                </p>
              </div>
              <input type="checkbox" defaultChecked className="h-4 w-4" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tracked Services</CardTitle>
            <CardDescription>Manage which services Prism monitors</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline">Manage Services</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Account</CardTitle>
            <CardDescription>Manage your account settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/" });
              }}
            >
              <Button variant="outline" type="submit">
                Sign out
              </Button>
            </form>
            <div className="pt-4 border-t border-border">
              <Button variant="destructive" size="sm">
                Delete Account
              </Button>
              <p className="mt-2 text-xs text-muted-foreground">
                This will permanently delete all your data
              </p>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
