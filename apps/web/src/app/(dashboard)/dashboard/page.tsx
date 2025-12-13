import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { SpendSummary } from "@/components/dashboard/spend-summary";
import { ServiceCard } from "@/components/dashboard/service-card";

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  // TODO: Fetch real data from database
  const mockServices = [
    {
      id: "1",
      name: "Vercel",
      logoUrl: "https://assets.vercel.com/image/upload/v1588805858/repositories/vercel/logo.png",
      category: "Cloud",
      currentSpend: 20,
      previousSpend: 20,
      spendHistory: [20, 20, 20, 20, 20, 20],
    },
    {
      id: "2",
      name: "GitHub",
      logoUrl: "https://github.githubassets.com/favicons/favicon.svg",
      category: "CI/CD",
      currentSpend: 44,
      previousSpend: 44,
      spendHistory: [44, 44, 44, 44, 44, 44],
    },
    {
      id: "3",
      name: "OpenAI",
      logoUrl: "",
      category: "AI/ML",
      currentSpend: 127.50,
      previousSpend: 89.20,
      spendHistory: [45, 67, 78, 89, 102, 127.5],
    },
    {
      id: "4",
      name: "Supabase",
      logoUrl: "",
      category: "Databases",
      currentSpend: 25,
      previousSpend: 25,
      spendHistory: [25, 25, 25, 25, 25, 25],
    },
  ];

  const totalSpend = mockServices.reduce((sum, s) => sum + s.currentSpend, 0);
  const previousSpend = mockServices.reduce((sum, s) => sum + s.previousSpend, 0);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <h1 className="text-xl font-bold">
            <span className="text-primary">Prism</span>
          </h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">{session.user.email}</span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-8 p-6">
        <div>
          <h2 className="text-2xl font-semibold">Dashboard</h2>
          <p className="text-muted-foreground">
            Your SaaS and developer tool spending overview
          </p>
        </div>

        <SpendSummary
          totalSpend={totalSpend}
          previousSpend={previousSpend}
          serviceCount={mockServices.length}
          upcomingRenewals={1}
        />

        <div>
          <h3 className="mb-4 text-lg font-medium">Services</h3>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {mockServices.map((service) => (
              <ServiceCard
                key={service.id}
                name={service.name}
                logoUrl={service.logoUrl}
                category={service.category}
                currentSpend={service.currentSpend}
                previousSpend={service.previousSpend}
                spendHistory={service.spendHistory}
              />
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
