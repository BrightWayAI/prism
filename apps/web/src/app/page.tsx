import Link from "next/link";

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="max-w-2xl text-center">
        <h1 className="mb-4 text-5xl font-bold tracking-tight">
          <span className="text-primary">Prism</span>
        </h1>
        <p className="mb-8 text-xl text-muted-foreground">
          Track your SaaS and developer tool spending in one unified dashboard.
          No more scattered invoices.
        </p>
        <Link
          href="/login"
          className="inline-flex h-12 items-center justify-center rounded-md bg-primary px-8 text-lg font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Get Started
        </Link>
      </div>
    </div>
  );
}
