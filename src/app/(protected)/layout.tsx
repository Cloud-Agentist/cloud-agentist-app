import Link from "next/link";
import { auth0 } from "@/lib/auth0";

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const session = await auth0.getSession();
  const user = session?.user;

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
      {/* Nav */}
      <nav className="border-b border-slate-800 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/chat" className="text-lg font-bold text-indigo-400 hover:text-indigo-300">
            LifeLift
          </Link>
          <NavLink href="/chat">Chat</NavLink>
          <NavLink href="/approvals">Approvals</NavLink>
          <NavLink href="/activity">Activity</NavLink>
        </div>
        <div className="flex items-center gap-4 text-sm text-slate-400">
          {user && <span>{user.name ?? user.email}</span>}
          <Link
            href="/auth/logout"
            className="text-slate-400 hover:text-slate-200 transition-colors"
          >
            Sign out
          </Link>
        </div>
      </nav>

      {/* Page content */}
      <main className="flex-1">{children}</main>
    </div>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="text-slate-300 hover:text-white text-sm font-medium transition-colors"
    >
      {children}
    </Link>
  );
}
