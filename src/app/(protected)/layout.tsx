import { auth0 } from "@/lib/auth0";
import Nav from "./Nav";
import Footer from "@/components/Footer";

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const session = await auth0.getSession();
  const user = session?.user;

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:bg-indigo-600 focus:text-white focus:px-4 focus:py-2 focus:rounded"
      >
        Skip to content
      </a>
      <Nav
        userName={(user?.name ?? user?.nickname ?? user?.email) as string | undefined}
        userPicture={user?.picture as string | undefined}
      />
      <main id="main-content" className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
