"use client";

import { Header } from "@/components";

export default function AuthLayout({ children }) {
  return (
    <div className="pt-20 pb-2 bg-background text-foreground">
      <Header />
      {children}
    </div>
  );
}