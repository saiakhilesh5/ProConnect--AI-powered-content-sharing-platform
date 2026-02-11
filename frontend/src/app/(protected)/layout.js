"use client";
import { useState } from "react";
import { Sidebar, FooterCompact, LoggedInHeader, AIChatAssistant } from "@/components";
import { ChatAssistantProvider } from "@/context/ChatAssistantContext";
import { ThemeProvider } from "@/context/ThemeContext";

function AuthLayout({ children }) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  return (
    <ThemeProvider>
      <ChatAssistantProvider>
        <div className="flex min-h-screen bg-background text-foreground transition-colors duration-300">
          <Sidebar mobileSidebarOpen={mobileSidebarOpen} setMobileSidebarOpen={setMobileSidebarOpen} />
          <div className="flex-1 pt-16 lg:ml-20 xl:ml-64">
            <LoggedInHeader mobileSidebarOpen={mobileSidebarOpen} setMobileSidebarOpen={setMobileSidebarOpen} />
            {children}
            <FooterCompact />
          </div>
          {/* AI Chat Assistant - Available on all protected pages */}
          <AIChatAssistant />
        </div>
      </ChatAssistantProvider>
    </ThemeProvider>
  );
}

export default AuthLayout;