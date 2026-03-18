"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const POLL_INTERVAL_MS = 30_000;

interface NavProps {
  userName?: string;
  userPicture?: string;
}

export default function Nav({ userName, userPicture }: NavProps) {
  const pathname = usePathname();
  const [badgeCount, setBadgeCount] = useState(0);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close mobile menu on navigation
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Poll for pending approval count — only when authenticated
  useEffect(() => {
    if (!userName) return;
    let cancelled = false;
    async function poll() {
      try {
        const res = await fetch("/api/approvals", { cache: "no-store" });
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as { count?: number };
        if (!cancelled) setBadgeCount(data.count ?? 0);
      } catch { /* ignore */ }
    }
    void poll();
    const id = setInterval(() => void poll(), POLL_INTERVAL_MS);
    return () => { cancelled = true; clearInterval(id); };
  }, [userName]);

  // Update browser tab title
  useEffect(() => {
    document.title = badgeCount > 0 ? `(${badgeCount}) LifeLift` : "LifeLift";
  }, [badgeCount]);

  const navItems = (
    <>
      <NavLink href="/dashboard" active={pathname === "/dashboard"} onClick={() => setMobileOpen(false)}>
        Dashboard
      </NavLink>
      <NavLink href="/chat" active={pathname === "/chat"} onClick={() => setMobileOpen(false)}>
        Chat
      </NavLink>
      <NavLink href="/inbox" active={pathname === "/inbox" || pathname === "/approvals"} onClick={() => setMobileOpen(false)}>
        Inbox
        {badgeCount > 0 && (
          <span className="inline-flex items-center justify-center h-4 min-w-[1rem] px-1 ml-1.5 rounded-full bg-indigo-500 text-white text-[10px] font-bold leading-none">
            {badgeCount > 99 ? "99+" : badgeCount}
          </span>
        )}
      </NavLink>
      <NavLink href="/settings" active={pathname === "/settings"} onClick={() => setMobileOpen(false)}>
        Settings
      </NavLink>
    </>
  );

  return (
    <nav className="border-b border-slate-800 px-4 sm:px-6 py-3">
      <div className="flex items-center justify-between">
        {/* Left: Logo + desktop nav */}
        <div className="flex items-center gap-1">
          <Link
            href="/dashboard"
            className="text-lg font-bold text-indigo-400 hover:text-indigo-300 mr-2 sm:mr-4 transition-colors"
          >
            LifeLift
          </Link>
          {/* Desktop nav items */}
          <div className="hidden sm:flex items-center gap-1">
            {navItems}
          </div>
        </div>

        {/* Right: User + hamburger */}
        <div className="flex items-center gap-3">
          <Link href="/settings" className="hidden sm:flex items-center gap-2 hover:opacity-80 transition-opacity">
            {userPicture ? (
              <img src={userPicture} alt="" className="w-7 h-7 rounded-full border border-slate-700" />
            ) : userName ? (
              <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-bold">
                {userName.charAt(0).toUpperCase()}
              </div>
            ) : null}
            {userName && <span className="hidden md:inline text-sm text-slate-400">{userName}</span>}
          </Link>
          <Link
            href="/auth/logout"
            className="hidden sm:inline text-sm text-slate-400 hover:text-slate-200 transition-colors"
          >
            Sign out
          </Link>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="sm:hidden relative p-2 text-slate-400 hover:text-white transition-colors"
            aria-label="Toggle menu"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {mobileOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
            {/* Badge dot on hamburger when menu is closed */}
            {!mobileOpen && badgeCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-indigo-500" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="sm:hidden mt-3 pt-3 border-t border-slate-800 flex flex-col gap-1">
          {navItems}
          <div className="mt-2 pt-2 border-t border-slate-800 flex items-center justify-between">
            {userName && <span className="text-sm text-slate-400">{userName}</span>}
            <Link
              href="/auth/logout"
              className="text-sm text-slate-400 hover:text-slate-200 transition-colors"
            >
              Sign out
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}

function NavLink({
  href,
  active,
  children,
  onClick,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={`flex items-center px-3 py-2 sm:py-1.5 rounded-md text-sm font-medium transition-colors ${
        active
          ? "bg-slate-800 text-white"
          : "text-slate-400 hover:text-white hover:bg-slate-800/50"
      }`}
    >
      {children}
    </Link>
  );
}
