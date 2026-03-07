import SessionWrapper from "@/components/hoc/SessionWrapper";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { FollowProvider } from "@/context/FollowContext";
import { UsersProvider } from "@/context/UsersContext";
import { LikesFavoritesProvider } from "@/context/LikesFavoritesContext";
import { MessagesProvider } from "@/context/MessagesContext";
import { ReelsProvider } from "@/context/ReelsContext";
import { SocketProvider } from "@/context/SocketContext";
import { CallProvider } from "@/context/CallContext";
import { Toaster } from "react-hot-toast";
import { Suspense } from "react";
import LoadingScreen from "@/components/screens/LoadingScreen";
import NextTopLoader from "nextjs-toploader";
import { DeveloperInfo } from "@/components";
import { CallUI } from "@/components/features/calls/CallUI";

export const metadata = {
  title: "ProConnect — Connect, Create, Collaborate",
  description: "Join ProConnect, the creative network for photographers and artists. Share stunning images, build your audience, discover inspiring creators, and grow your creative community.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>
        <Suspense fallback={<LoadingScreen />}>
          <SessionWrapper>
            <AuthProvider>
              <SocketProvider>
                <CallProvider>
                  <FollowProvider>
                    <UsersProvider>
                      <LikesFavoritesProvider>
                        <MessagesProvider>
                          <ReelsProvider>
                            <NextTopLoader
                              color="#8b5cf6"
                              showSpinner={false}
                            />
                            <Toaster position="top-center" />
                            {children}
                            <CallUI />
                            <DeveloperInfo />
                          </ReelsProvider>
                        </MessagesProvider>
                      </LikesFavoritesProvider>
                    </UsersProvider>
                  </FollowProvider>
                </CallProvider>
              </SocketProvider>
            </AuthProvider>
          </SessionWrapper>
        </Suspense>
      </body>
    </html>
  );
}
