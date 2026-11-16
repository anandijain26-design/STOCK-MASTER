import Link from 'next/link';
import { LayoutDashboard } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#080D1A] p-6 text-slate-900 dark:text-slate-100">
      <div className="max-w-md w-full bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 rounded-2xl p-8 text-center space-y-4 shadow-xl">
        <div className="w-16 h-16 rounded-full bg-blue-600/10 text-blue-500 flex items-center justify-center mx-auto text-2xl font-bold">
          404
        </div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">
          Page Not Found
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          The requested financial terminal page or route does not exist or has been moved.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition-colors"
        >
          <LayoutDashboard className="w-4 h-4" />
          <span>Return to Dashboard</span>
        </Link>
      </div>
    </div>
  );
}
