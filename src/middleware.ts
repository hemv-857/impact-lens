import { withAuth } from "next-auth/middleware";

// Page-level guard only: API routes call getAuthContext() themselves so they
// stay protected even if this matcher changes.
export default withAuth({ pages: { signIn: "/auth" } });

export const config = {
  // `.+` leaves the public landing page at "/" and read-only /share/<token>
  // links unauthenticated; every other route still requires a session
  // (API routes guard themselves). /field-media is committed sample imagery in
  // public/ (the landing page and share links show it); org uploads live under
  // /uploads, which stays guarded here and in its own route.
  matcher: ["/((?!api|share|_next/static|_next/image|favicon.ico|logo.svg|auth|field-media/).+)"],
};
