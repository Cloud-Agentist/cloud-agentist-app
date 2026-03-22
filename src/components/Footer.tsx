import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-slate-900 border-t border-slate-800 py-6 pb-20 sm:pb-6">
      <div className="max-w-4xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-center gap-2 text-sm text-slate-500">
        <span>&copy; 2026 Cloud Agentist</span>
        <span className="hidden sm:inline">&middot;</span>
        <Link href="/privacy" className="hover:text-slate-300 transition-colors">
          Privacy Policy
        </Link>
        <span className="hidden sm:inline">&middot;</span>
        <Link href="/terms" className="hover:text-slate-300 transition-colors">
          Terms of Service
        </Link>
      </div>
    </footer>
  );
}
