import { auth0 } from "./lib/auth0";

export async function proxy(request: Request) {
  try {
    return await auth0.middleware(request);
  } catch (err) {
    // Invalid session cookie (e.g. AUTH0_SECRET changed) — clear it and retry
    const message = err instanceof Error ? err.message : "";
    if (message.includes("JWE") || message.includes("decrypt")) {
      const response = new Response(null, {
        status: 307,
        headers: { Location: request.url },
      });
      // Clear the auth session cookie
      response.headers.append(
        "Set-Cookie",
        "appSession=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Lax"
      );
      return response;
    }
    throw err;
  }
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
