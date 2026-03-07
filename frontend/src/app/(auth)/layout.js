"use client";

import { Header } from "@/components";

export default function AuthLayout({ children }) {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Header />
      {/* Spacer for fixed header */}
      <div className="h-16 md:h-20 flex-shrink-0" />
      <main className="flex-1 flex flex-col">
        {children}
      </main>
    </div>
  );
}