import type { AuthContext } from "./auth.ts";
declare global { namespace Express { interface Request { auth?: AuthContext; requestId: string } } }
export {};
