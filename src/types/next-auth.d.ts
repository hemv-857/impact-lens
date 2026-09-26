import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      orgId: string;
    } & DefaultSession["user"];
  }

  interface User {
    /** Active organization picked at sign-in (first membership). */
    orgId?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    uid?: string;
    orgId?: string;
  }
}
