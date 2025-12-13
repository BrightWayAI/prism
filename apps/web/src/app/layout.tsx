import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Prism - SaaS Spend Tracker",
  description: "Track your SaaS and developer tool spending in one unified dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen font-sans">{children}</body>
    </html>
  );
}
