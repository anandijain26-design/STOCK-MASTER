'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Activity,
  BarChart3,
  BookOpen,
  Bot,
  Briefcase,
  CandlestickChart,
  ChevronLeft,
  ChevronRight,
  FileText,
  Filter,
  Globe,
  Layers,
  LayoutDashboard,
  Mail,
  Menu,
  Moon,
  Newspaper,
  RefreshCw,
  Rocket,
  Search,
  Settings,
  ShieldCheck,
  Star,
  Sun,
  UserCircle,
  X,
} from 'lucide-react';
import { useApp } from './AppProviders';
import { ALL_INDIAN_STOCKS } from '@/src/lib/nse-universe';

export function TerminalShell({
  breadcrumb,
  children,
}: {
  breadcrumb?: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const {
    user,
    isAdmin,
    gmailConnected,
    openAuthModal,
    logout,
    language,
    setLanguage,
    t,
    theme,
    toggleTheme,
    autoRefresh,
    toggleAutoRefresh,
  } = useApp();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);

  const navGroups = useMemo(
    () => [
      {
        label: language === 'hi' ? 'बाज़ार और शोध' : 'Markets & Research',
        items: [
          { href: '/', label: t.nav.dashboard, icon: LayoutDashboard },
          { href: '/markets', label: t.nav.markets, icon: Activity },
          { href: '/stocks', label: t.nav.stocks, icon: Layers },
          { href: '/charts', label: t.nav.charts, icon: CandlestickChart },
          { href: '/scanners', label: t.nav.scanners, icon: Filter },
          { href: '/ai-analyst', label: t.nav.aiAnalyst, icon: Bot },
          { href: '/fno', label: t.nav.fno, icon: BarChart3 },
        ],
      },
      {
        label: language === 'hi' ? 'रिपोर्ट व समाचार' : 'Intelligence & Events',
        items: [
          { href: '/reports', label: t.nav.reports, icon: FileText },
          { href: '/news', label: t.nav.news, icon: Newspaper },
          { href: '/ipo', label: t.nav.ipo, icon: Rocket },
        ],
      },
      {
        label: language === 'hi' ? 'व्यक्तिगत डेस्क' : 'Personal Desk',
        items: [
          { href: '/portfolio', label: t.nav.portfolio, icon: Briefcase },
          { href: '/paper-trading', label: t.nav.paperTrading, icon: CandlestickChart },
          { href: '/watchlists', label: t.nav.watchlists, icon: Star },
          { href: '/learning', label: t.nav.learning, icon: BookOpen },
        ],
      },
      {
        label: language === 'hi' ? 'खाता' : 'System',
        items: [
          { href: '/profile', label: t.nav.profile, icon: Settings },
          ...(isAdmin ? [{ href: '/admin', label: t.nav.admin, icon: ShieldCheck }] : []),
        ],
      },
    ],
    [language, t, isAdmin]
  );

  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return ALL_INDIAN_STOCKS.slice(0, 8);
    const matched = ALL_INDIAN_STOCKS.filter(
      (s) =>
        s.symbol.toLowerCase().includes(q) ||
        s.companyName.toLowerCase().includes(q) ||
        s.sector.toLowerCase().includes(q)
    );
    matched.sort((a, b) => {
      const as = a.symbol.toLowerCase();
      const bs = b.symbol.toLowerCase();
      const ar = as === q ? 0 : as.startsWith(q) ? 1 : 2;
      const br = bs === q ? 0 : bs.startsWith(q) ? 1 : 2;
      return ar - br;
    });
    return matched.slice(0, 10);
  }, [searchQuery]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = searchQuery.trim().toUpperCase();
    if (!trimmed) return;
    const match = searchResults[0]?.symbol ?? trimmed;
    setSearchFocused(false);
    setMobileSearchOpen(false);
    setSearchQuery('');
    router.push(`/stocks/${encodeURIComponent(match)}`);
  };

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-[#080D1A] text-slate-900 dark:text-slate-100">
      {/* Desktop Left Sidebar */}
      <aside
        aria-label="Primary Navigation"
        className={`hidden lg:flex flex-col shrink-0 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B111E] transition-all duration-150 ${
          collapsed ? 'w-[72px]' : 'w-[240px]'
        }`}
      >
        <div className="h-14 flex items-center justify-between px-4 border-b border-slate-200 dark:border-slate-800">
          <Link
            href="/"
            className="font-display font-bold text-base tracking-tight text-slate-900 dark:text-white whitespace-nowrap shrink-0"
          >
            {collapsed ? 'SM' : t.brand}
          </Link>
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="p-1.5 rounded-md text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-5">
          {navGroups.map((group) => (
            <div key={group.label}>
              {!collapsed && (
                <div className="px-3 mb-1.5 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                  {group.label}
                </div>
              )}
              <ul className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const active =
                    item.href === '/'
                      ? pathname === '/'
                      : pathname === item.href || pathname.startsWith(`${item.href}/`);
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        title={item.label}
                        className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                          active
                            ? 'bg-blue-600/12 text-blue-600 dark:text-blue-400'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                        }`}
                      >
                        <Icon className="w-4 h-4 shrink-0" />
                        {!collapsed && <span className="truncate">{item.label}</span>}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        {!collapsed && (
          <div className="p-3 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-500">
            <div className="font-mono font-semibold text-slate-700 dark:text-slate-300">
              {ALL_INDIAN_STOCKS.length.toLocaleString('en-IN')} NSE Stocks
            </div>
            <div className="truncate mt-0.5">
              {user ? (gmailConnected ? `Gmail: ${user.email}` : user.email) : 'Guest Preview Mode'}
            </div>
          </div>
        )}
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/60"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
          <aside className="relative w-72 max-w-[85vw] bg-white dark:bg-[#0B111E] border-r border-slate-200 dark:border-slate-800 flex flex-col h-full z-10">
            <div className="h-14 flex items-center justify-between px-4 border-b border-slate-200 dark:border-slate-800">
              <span className="font-display font-bold text-base text-slate-900 dark:text-white">
                {t.brand}
              </span>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                aria-label="Close navigation menu"
                className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-4">
              {navGroups.map((group) => (
                <div key={group.label}>
                  <div className="px-2 mb-1 text-xs font-medium text-slate-500">{group.label}</div>
                  <ul className="space-y-0.5">
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      const active =
                        item.href === '/'
                          ? pathname === '/'
                          : pathname === item.href || pathname.startsWith(`${item.href}/`);
                      return (
                        <li key={item.href}>
                          <Link
                            href={item.href}
                            onClick={() => setMobileOpen(false)}
                            className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium ${
                              active
                                ? 'bg-blue-600/15 text-blue-600 dark:text-blue-400'
                                : 'text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            <Icon className="w-4 h-4 shrink-0" />
                            <span>{item.label}</span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </nav>
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Responsive 3-Zone Top Header Bar (Zero overflow at 390px) */}
        <header className="sticky top-0 z-30 border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-[#0B111E]/95 backdrop-blur-sm">
          <div className="h-14 px-3 sm:px-4 lg:px-6 flex items-center justify-between gap-2 sm:gap-4">
            {/* Zone 1: Mobile Menu + Breadcrumb */}
            <div className="flex items-center gap-2 min-w-0">
              <button
                type="button"
                onClick={() => setMobileOpen(true)}
                aria-label="Open navigation menu"
                className="lg:hidden p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0"
              >
                <Menu className="w-5 h-5" />
              </button>
              <span className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">
                {breadcrumb ?? t.nav.dashboard}
              </span>
            </div>

            {/* Zone 2: Desktop Global Stock Quick Search (All 2,647 NSE Stocks) */}
            <div className="relative flex-1 max-w-md hidden md:block">
              <form onSubmit={handleSearchSubmit} className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="search"
                  aria-label="Search all Indian stocks"
                  value={searchQuery}
                  onFocus={() => setSearchFocused(true)}
                  onBlur={() => setTimeout(() => setSearchFocused(false), 180)}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={`Search ${ALL_INDIAN_STOCKS.length.toLocaleString('en-IN')} NSE stocks (RELIANCE, IRFC, MRF...)`}
                  className="w-full h-9 pl-9 pr-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-[#080D1A] text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </form>

              {searchFocused && (
                <div className="absolute left-0 right-0 mt-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A] shadow-xl overflow-hidden z-40 max-h-80 overflow-y-auto">
                  {searchResults.map((item) => (
                    <button
                      key={item.symbol}
                      type="button"
                      onMouseDown={() => {
                        setSearchFocused(false);
                        setSearchQuery('');
                        router.push(`/stocks/${item.symbol}`);
                      }}
                      className="w-full flex items-center justify-between px-3 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-800/70 border-b last:border-0 border-slate-100 dark:border-slate-800/70"
                    >
                      <div className="min-w-0">
                        <span className="font-mono font-semibold text-slate-900 dark:text-white">
                          {item.symbol}
                        </span>
                        <span className="ml-2 text-xs text-slate-500 dark:text-slate-400 truncate">
                          {item.companyName}
                        </span>
                      </div>
                      <span className="text-xs text-slate-500 dark:text-slate-400 shrink-0 ml-2">
                        {item.series ?? 'EQ'} · {item.marketCapCategory}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Zone 3: Mobile Search + Auto 5s + Language + Theme + Gmail Account */}
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setMobileSearchOpen((v) => !v)}
                aria-label="Toggle stock search"
                className="md:hidden p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0"
              >
                <Search className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={toggleAutoRefresh}
                aria-pressed={autoRefresh}
                aria-label={autoRefresh ? t.common.autoRefreshOn : t.common.autoRefreshOff}
                title={autoRefresh ? t.common.autoRefreshOn : t.common.autoRefreshOff}
                className={`flex items-center gap-1 px-2 py-1.5 rounded-lg border text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
                  autoRefresh
                    ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/15'
                    : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span className="hidden xl:inline">{autoRefresh ? t.common.autoRefreshOn : t.common.autoRefreshOff}</span>
                <span className="xl:hidden font-mono text-[11px]">{autoRefresh ? '5s' : 'Off'}</span>
              </button>

              <button
                type="button"
                onClick={() => setLanguage(language === 'en' ? 'hi' : 'en')}
                aria-label="Switch platform language between English and Hindi"
                className="flex items-center gap-1 px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap shrink-0"
              >
                <Globe className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{language === 'en' ? 'EN / हिं' : 'हिन्दी / EN'}</span>
                <span className="sm:hidden text-[11px]">{language === 'en' ? 'EN' : 'हिं'}</span>
              </button>

              <button
                type="button"
                onClick={toggleTheme}
                aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                className="p-1.5 sm:p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0"
              >
                {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>

              {user ? (
                <div className="flex items-center gap-1.5">
                  <Link
                    href="/profile"
                    className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap"
                  >
                    <UserCircle className="w-4 h-4 text-blue-500" />
                    <span className="hidden md:inline max-w-[130px] truncate">
                      {user.displayName ?? user.email}
                    </span>
                    {isAdmin && (
                      <span className="hidden sm:inline text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-500">
                        OWNER
                      </span>
                    )}
                  </Link>
                  <button
                    type="button"
                    onClick={logout}
                    className="hidden sm:inline-flex px-2 py-1.5 rounded-lg text-xs font-medium text-slate-500 hover:text-slate-900 dark:hover:text-white whitespace-nowrap"
                  >
                    {t.common.signOut}
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={openAuthModal}
                  className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-colors whitespace-nowrap shrink-0"
                >
                  <Mail className="w-3.5 h-3.5 hidden sm:inline" />
                  <span className="hidden sm:inline">Connect Gmail</span>
                  <span className="sm:hidden">{t.common.signIn}</span>
                </button>
              )}
            </div>
          </div>

          {/* Slide-down Mobile Search Bar */}
          {mobileSearchOpen && (
            <div className="md:hidden px-3 pb-3 pt-1 border-t border-slate-200 dark:border-slate-800 relative">
              <form onSubmit={handleSearchSubmit} className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="search"
                  autoFocus
                  aria-label="Search NSE stocks on mobile"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={`Search ${ALL_INDIAN_STOCKS.length.toLocaleString('en-IN')} NSE stocks...`}
                  className="w-full h-9 pl-9 pr-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-[#080D1A] text-sm text-slate-900 dark:text-slate-100"
                />
              </form>
              {searchQuery.trim().length > 0 && (
                <div className="mt-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A] shadow-xl max-h-60 overflow-y-auto">
                  {searchResults.slice(0, 6).map((item) => (
                    <button
                      key={item.symbol}
                      type="button"
                      onClick={() => {
                        setMobileSearchOpen(false);
                        setSearchQuery('');
                        router.push(`/stocks/${item.symbol}`);
                      }}
                      className="w-full flex items-center justify-between px-3 py-2 text-left text-xs border-b last:border-0 border-slate-100 dark:border-slate-800"
                    >
                      <span className="font-mono font-semibold">{item.symbol}</span>
                      <span className="text-slate-500 truncate ml-2">{item.companyName}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </header>

        <main className="flex-1 p-4 lg:p-6 max-w-[1600px] w-full mx-auto">
          {children}
        </main>

        <footer className="border-t border-slate-200 dark:border-slate-800/80 px-4 lg:px-6 py-4 text-xs text-slate-500 dark:text-slate-400 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <span>{t.brand} · NSE / BSE / F&O Intelligence ({ALL_INDIAN_STOCKS.length.toLocaleString('en-IN')} Listed Equities)</span>
          <span>{t.common.disclaimer}</span>
        </footer>
      </div>
    </div>
  );
}
