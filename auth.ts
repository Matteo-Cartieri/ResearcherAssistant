import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { db } from "./app/lib/db";
import authConfig from "./auth.config";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      authorize: async (credentials) => {
        const email = credentials?.email as string;
        const password = credentials?.password as string;
        if (!email || !password) return null;

        const user = db
          .prepare("SELECT * FROM users WHERE email = ?")
          .get(email) as
          | { id: string; email: string; password_hash: string; name: string | null }
          | undefined;

        if (!user) 
          return null;
        const valid = await bcrypt.compare(password, user.password_hash);
        if (!valid) 
          return null;

        return { id: user.id, email: user.email, name: user.name ?? undefined };
      },
    }),
  ],
});