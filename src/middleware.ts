// Next.js 15 compatibility shim — proxy.ts is the primary handler for Next.js 16.
// See src/proxy.ts for the actual implementation.
import type { NextRequest } from "next/server";
import { auth0 } from "./lib/auth0";

export async function middleware(request: NextRequest) {
  return auth0.middleware(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
