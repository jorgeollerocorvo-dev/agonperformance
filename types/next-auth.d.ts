import "next-auth";

declare module "next-auth" {
  interface User {
    role?: "COACH" | "ATHLETE";
  }
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      role: "COACH" | "ATHLETE";
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    uid?: string;
    role?: "COACH" | "ATHLETE";
  }
}
