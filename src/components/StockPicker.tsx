'use client';

import React, { useMemo, useRef, useState } from 'react';
import { ChevronDown, Search } from 'lucide-react';
import { ALL_INDIAN_STOCKS, StockMasterItem } from '@/src/lib/nse-universe';

interface StockPickerProps {
  id?: string;
  ariaLabel?: string;
  value: string;
  onChange: (symbol: string) => void;
  includeIndices?: boolean;
  allowEmpty?: boolean;
  emptyLabel?: string;
  className?: string;
}

const INDEX_OPTIONS: Array<{ symbol: string; companyName: string; sector: string; series: string }> = [
  { symbol: '^NSEI', companyName: 'NIFTY 50 Benchmark Index', sector: 'Index', series: 'IDX' },
  { symbol: '^NSEBANK', companyName: 'BANK NIFTY Sectoral Index', sector: 'Index', series: 'IDX' },
  { symbol: '^BSESN', companyName: 'BSE SENSEX Benchmark Index', sector: 'Index', series: 'IDX' },
];

export function StockPicker({
  id,
  ariaLabel = 'Select Indian stock',
  value,
  onChange,
  includeIndices = false,
  allowEmpty = false,
  emptyLabel = 'None',
  className = '',
}: StockPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement | null>(null);

  const selectedLabel = useMemo(() => {
    if (!value && allowEmpty) return emptyLabel;
    const idx = INDEX_OPTIONS.find((x) => x.symbol === value);
    if (idx) return `${idx.symbol} — ${idx.companyName}`;
    const found = ALL_INDIAN_STOCKS.find((s) => s.symbol === value);
    return found ? `${found.symbol} — ${found.companyName}` : value;
  }, [value, allowEmpty, emptyLabel]);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    const pool: Array<Pick<StockMasterItem, 'symbol' | 'companyName' | 'sector'> & { series?: string }> = [
      ...(includeIndices ? INDEX_OPTIONS : []),
      ...ALL_INDIAN_STOCKS,
    ];

    if (!q) {
      return pool.slice(0, 40);
    }

    const filtered = pool.filter(
      (s) =>
        s.symbol.toLowerCase().includes(q) ||
        s.companyName.toLowerCase().includes(q) ||
        s.sector.toLowerCase().includes(q)
    );

    filtered.sort((a, b) => {
      const as = a.symbol.toLowerCase();
      const bs = b.symbol.toLowerCase();
      const aRank = as === q ? 0 : as.startsWith(q) ? 1 : 2;
      const bRank = bs === q ? 0 : bs.startsWith(q) ? 1 : 2;
      return aRank - bRank;
    });

    return filtered.slice(0, 45);
  }, [query, includeIndices]);

  return (
    <div className={`relative ${className}`}>
      <button
        id={id}
        type="button"
        aria-label={ariaLabel}
        aria-expanded={open}
        onClick={() => {
          setOpen((o) => !o);
          setQuery('');
          setTimeout(() => inputRef.current?.focus(), 30);
        }}
        className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#080D1A] text-slate-900 dark:text-slate-100 text-xs font-medium flex items-center justify-between gap-2 hover:border-blue-500/60 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <span className="truncate font-mono">{selectedLabel}</span>
        <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            aria-hidden="true"
            onClick={() => setOpen(false)}
          />
          <div className="absolute left-0 right-0 min-w-[270px] mt-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0F172A] shadow-2xl z-50 overflow-hidden">
            <div className="p-2 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2">
              <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={`Search ${ALL_INDIAN_STOCKS.length.toLocaleString('en-IN')}+ NSE stocks...`}
                className="w-full bg-transparent text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none"
              />
            </div>

            <div className="max-h-64 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60">
              {allowEmpty && (
                <button
                  type="button"
                  onClick={() => {
                    onChange('');
                    setOpen(false);
                  }}
                  className="w-full px-3 py-2 text-left text-xs text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  {emptyLabel}
                </button>
              )}

              {matches.length === 0 ? (
                <div className="px-3 py-4 text-center text-xs text-slate-500">
                  No NSE equity matched &ldquo;{query}&rdquo;
                </div>
              ) : (
                matches.map((item) => (
                  <button
                    key={item.symbol}
                    type="button"
                    onClick={() => {
                      onChange(item.symbol);
                      setOpen(false);
                    }}
                    className={`w-full px-3 py-2 text-left flex items-center justify-between gap-2 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors ${
                      value === item.symbol ? 'bg-blue-600/10' : ''
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-xs font-semibold text-slate-900 dark:text-white">
                          {item.symbol}
                        </span>
                        {item.series && (
                          <span className="text-[10px] font-mono px-1 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
                            {item.series}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                        {item.companyName}
                      </div>
                    </div>
                    <span className="text-[10px] text-slate-400 shrink-0">{item.sector}</span>
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
