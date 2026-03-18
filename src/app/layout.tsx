import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Auth0Provider } from "@auth0/nextjs-auth0";
import { ToastProvider } from "@/lib/toast";
import { KeyboardShortcuts } from "@/lib/keyboard";
import CookieBanner from "@/components/CookieBanner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "LifeLift — Your AI that acts",
  description: "Manage your schedule, wishlists, and finances through conversation.",
  openGraph: {
    title: "LifeLift — Your AI that acts",
    description: "Manage your schedule, wishlists, and finances through conversation.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <Auth0Provider>
          <ToastProvider>
            <KeyboardShortcuts />
            {children}
            <CookieBanner />
          </ToastProvider>
        </Auth0Provider>
      </body>
    </html>
  );
}
