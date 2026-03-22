import { Auth0Client } from "@auth0/nextjs-auth0/server";

export const auth0 = new Auth0Client({
  authorizationParameters: {
    scope: "openid profile email offline_access",
  },
  appBaseUrl: process.env.APP_BASE_URL,
  routes: {
    login: "/auth/login",
    callback: "/auth/callback",
    logout: "/auth/logout",
  },
  session: {
    absoluteDuration: 86400, // 24 hours
  },
});
