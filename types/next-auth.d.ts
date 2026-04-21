import "next-auth";

type AppRole = "CLIENT" | "COACH" | "ADMIN";

declare module "next-auth" {
  interface User {
    roles?: AppRole[];
  }
  interface Session {
    user: {
      id: string;
      email?: string | null;
      name?: string | null;
      roles: AppRole[];
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    uid?: string;
    roles?: AppRole[];
  }
}
