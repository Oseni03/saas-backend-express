import type { User, Organization, Membership } from "@/generated/prisma";

declare global {
  namespace Express {
    interface Request {
      /** Set by authenticate middleware */
      user?: User;
      /** Set by requireOrg middleware */
      org?: Organization;
      /** Set by requireOrg middleware */
      membership?: Membership;
    }
  }
}

export {};
