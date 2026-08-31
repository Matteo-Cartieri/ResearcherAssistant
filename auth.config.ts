import type { NextAuthConfig } from "next-auth";

export default {
  session: { strategy: "jwt" },
  providers: [], // Credentials provider lives only in auth.ts, not here
  callbacks: {
    jwt({ token, user }) {
      if (user) token.id = user.id;
      return token;
    },
    session({ session, token }) {
      if (session.user) session.user.id = token.id as string;
      return session;
    },
  },
} satisfies NextAuthConfig;