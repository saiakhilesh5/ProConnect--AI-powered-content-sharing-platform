import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import axios from "axios";

const BACKEND_API = process.env.NEXT_PUBLIC_BACKEND_API || "http://localhost:8000";

export const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }),
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        identifier: { label: "Email or Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        try {
          console.log("🔐 Attempting login to:", `${BACKEND_API}/api/users/login`);
          
          const response = await axios.post(
            `${BACKEND_API}/api/users/login`,
            {
              identifier: credentials?.identifier,
              password: credentials?.password,
            },
            { withCredentials: true }
          );

          console.log("✅ Login response received");
          
          const data = response?.data?.data;
          if (!data) {
            console.log("❌ No data in response");
            return null;
          }

          console.log("✅ Token received:", data.token ? "Yes" : "No");

          // Backend returns: { _id, fullName, username, email, profilePicture, token }
          return {
            id: data._id,
            email: data.email,
            name: data.fullName,
            image: data.profilePicture || null,
            backendToken: data.token, // Store token directly
            backendData: data,
          };
        } catch (error) {
          console.error("❌ Login error:", error.response?.data || error.message);
          return null;
        }
      },
    }),
  ],
  session: { strategy: "jwt" },
  trustHost: true,
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        try {
          const username = user.email.split('@')[0];
          const response = await axios.post(`${BACKEND_API}/api/users/google-login`, {
            email: user.email,
            fullName: user.name,
            profilePicture: user.image,
            username,
          }, { 
            withCredentials: true 
          });

          user.backendToken = response.data.data.token;
          user.backendData = response.data.data;
        } catch (error) {
          console.error("Error saving Google user:", error);
          return false;
        }
      }
      return true;
    },
    async jwt({ token, user }) {
      // When user signs in, save their backend token
      if (user) {
        token.id = user.id;
        token.backendToken = user.backendToken || user.backendData?.token;
        console.log("🔑 JWT callback - token saved:", token.backendToken ? "Yes" : "No");
      }
      return token;
    },
    async session({ session, token }) {
      if (!session.user) session.user = {};
      session.user.id = token.id;
      session.backendToken = token.backendToken;
      console.log("📦 Session callback - backendToken:", session.backendToken ? "Present" : "Missing");
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: false, // Disable debug to improve performance
  pages: {
    signIn: '/login',
    signOut: '/login',
    error: '/login',
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
