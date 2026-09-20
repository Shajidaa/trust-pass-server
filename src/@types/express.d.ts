import { User, Session } from "../../generated/prisma/client";

declare global {
  namespace Express {
    interface Request {
      user?: User | null;
      session?: Session | null;
    }
  }
}
