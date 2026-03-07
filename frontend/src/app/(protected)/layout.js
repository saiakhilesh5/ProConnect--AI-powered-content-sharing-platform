"use client";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { Sidebar, FooterCompact, BottomNavBar, MobileHeader } from "@/components";
import { ChatAssistantProvider } from "@/context/ChatAssistantContext";
import { ThemeProvider } from "@/context/ThemeContext";

function AuthLayout({ children }) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const pathname = usePathname();

  // Mobile-only full-screen pages (hide mobile header, keep desktop sidebar)
  const isMobileFullScreen = pathname === '/search' || pathname === '/explore';
  
  // Reels page - show sidebar but hide footer and bottom nav
  const isReelsPage = pathname === '/reels' || pathname.startsWith('/reels/');
  
  // Messages page - hide footer for full height chat
  const isMessagesPage = pathname === '/messages' || pathname.startsWith('/messages/');
  
  // Pages that should hide footer
  const hideFooter = isReelsPage || isMessagesPage;

  return (
    <ThemeProvider>
      <ChatAssistantProvider>
        <div className="flex min-h-screen bg-background text-foreground transition-colors duration-300">
          <Sidebar mobileSidebarOpen={mobileSidebarOpen} setMobileSidebarOpen={setMobileSidebarOpen} />
          <div className={`flex-1 ${
            isReelsPage || isMessagesPage
              ? 'lg:ml-20 xl:ml-64' 
              : isMobileFullScreen 
                ? 'pb-14 md:pb-0 md:pt-0 lg:ml-20 xl:ml-64' 
                : 'pt-14 pb-14 md:pt-0 md:pb-0 lg:ml-20 xl:ml-64'
          }`}>
            {/* Mobile Header - hidden on search/explore/reels/messages pages */}
            {!isMobileFullScreen && !isReelsPage && !isMessagesPage && (
              <MobileHeader mobileSidebarOpen={mobileSidebarOpen} setMobileSidebarOpen={setMobileSidebarOpen} />
            )}
            {children}
          </div>
          {/* Bottom Navigation for Mobile - hidden on reels and messages */}
          {!isReelsPage && !isMessagesPage && <BottomNavBar />}
        </div>
      </ChatAssistantProvider>
    </ThemeProvider>
  );
}

export default AuthLayout;