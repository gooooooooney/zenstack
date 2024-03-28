import { authConfig } from "@/config/auth";
import NextAuth from "next-auth";

export const {
  handlers,
  auth,
  signIn,
  signOut,
} = NextAuth({
  ...authConfig,
  pages: {
    signIn: "/login",
    newUser: "/signup",
  }
})