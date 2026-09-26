import { withAuth } from "next-auth/middleware";

// Page-level guard only: API routes call getAuthContext() themselves so they
// stay protected even if this matcher changes.
export default withAuth({ pages: { signIn: "/auth" } });

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|logo.svg|auth).*)"],
};
