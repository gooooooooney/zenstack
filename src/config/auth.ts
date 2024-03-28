import { PrismaAdapter } from "@auth/prisma-adapter";
import {
  type NextAuthConfig,
  type DefaultSession,
} from "next-auth";
import { compare } from "bcryptjs";
import Credentials from "next-auth/providers/credentials";

import { env } from "@/env";
import { db } from "@/server/db";
import { PrismaClient } from "@prisma/client";

/**
 * Module augmentation for `next-auth` types. Allows us to add custom properties to the `session`
 * object and keep type safety.
 *
 * @see https://next-auth.js.org/getting-started/typescript#module-augmentation
 */
declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id: string;
      // ...other properties
      // role: UserRole;
    } & DefaultSession["user"];
  }

  // interface User {
  //   // ...other properties
  //   // role: UserRole;
  // }
}

export const authConfig = {
  session: {
    strategy: "jwt",
  },
  callbacks: {
    session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub!;
      }
      return session;
    },
    redirect: () => "/"

  },
  events: {
    async linkAccount({ user }) {
      await db.user.update({
        where: { id: user.id },
        data: { emailVerified: new Date() }
      })
    }
  },
  adapter: PrismaAdapter(db),
  providers: [
    Credentials({
      credentials: {
        email: { type: "email" },
        password: { type: "password" },
      },
      authorize: async (credentials) => {
        if (!credentials) throw new Error("Missing credentials");
        if (!credentials.email)
          throw new Error('"email" is required in credentials');
        if (!credentials.password)
          throw new Error('"password" is required in credentials');
        const maybeUser = await db.user.findFirst({
          where: { email: credentials.email },
          select: { id: true, email: true, password: true },
        });
        if (!maybeUser?.password) return null;
        const password = credentials.password as string

        // verify the input password with stored hash
        const isValid = await compare(password, maybeUser.password);
        if (!isValid) return null;
        return { id: maybeUser.id, email: maybeUser.email };
      },
    }),
  ],
} satisfies NextAuthConfig


