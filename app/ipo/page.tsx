'use client';

export const dynamic = 'force-dynamic';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { TerminalShell } from '@/src/components/TerminalShell';
import { useApp } from '@/src/components/AppProviders';

interface IpoRow {
  company: string;
  category: string;
  status: string;
  priceBand: string;
  issueSize: string;
  subscription: string;
  openDate: string;
  listingDate: string;
  exchange: string;
}

interface CorpActionRow {
  symbol: string;
  actionType: string;
  details: string;
  exDate: string;
  exchange: string;
}

export default function IpoAndCorporateActionsPage() {
  const { t, language } = useApp();
  const [ipos, setIpos] = useState<IpoRow[]>([]);
  const [actions, setActions] = useState<CorpActionRow[]>([]);
  const [note, setNote] = useState('');

  useEffect(() => {
    fetch('/api/market/news')
      .then((r) => r.json())
      .then((d) => {
        setIpos(d.ipos ?? []);
        setActions(d.corporateActions ?? []);
        setNote(d.exchangeFeedNote ?? '');
      });
  }, []);

  return (
    <TerminalShell breadcrumb={t.nav.ipo}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            {language === 'hi'
              ? 'IPO ट्रैकर व कॉर्पोरेट एक्शन कैलेंडर'
              : 'IPO Tracker & Corporate Actions Calendar'}
          </h1>
          <p className="text-xs text-slate-500 mt-1">{note}</p>
        </div>

        <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A] overflow-x-auto">
          <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800">
            <h2 className="text-base font-semibold">Mainboard & SME IPOs</h2>
          </div>
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500">
                <th className="py-2.5 px-4">Company</th>
                <th className="py-2.5 px-4">Board</th>
                <th className="py-2.5 px-4">Status</th>
                <th className="py-2.5 px-4 text-right">Price Band</th>
                <th className="py-2.5 px-4 text-right">Issue Size</th>
                <th className="py-2.5 px-4 text-right">Subscription</th>
                <th className="py-2.5 px-4 text-right">Window / Listing</th>
              </tr>
            </thead>
            <tbody>
              {ipos.map((ipo) => (
                <tr key={ipo.company} className="border-b last:border-0 border-slate-100 dark:border-slate-800/60">
                  <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">{ipo.company}</td>
                  <td className="py-3 px-4">{ipo.category} ({ipo.exchange})</td>
                  <td className="py-3 px-4 font-medium text-blue-500">{ipo.status}</td>
                  <td className="py-3 px-4 text-right font-mono">{ipo.priceBand}</td>
                  <td className="py-3 px-4 text-right font-mono">{ipo.issueSize}</td>
                  <td className="py-3 px-4 text-right font-mono">{ipo.subscription}</td>
                  <td className="py-3 px-4 text-right font-mono text-slate-500">
                    {ipo.openDate} · {ipo.listingDate}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A] overflow-x-auto">
          <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800">
            <h2 className="text-base font-semibold">Dividends, Stock Splits, Bonus & Buybacks</h2>
          </div>
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500">
                <th className="py-2.5 px-4">Symbol</th>
                <th className="py-2.5 px-4">Action</th>
                <th className="py-2.5 px-4">Details</th>
                <th className="py-2.5 px-4 text-right">Cycle / Ex-Date</th>
              </tr>
            </thead>
            <tbody>
              {actions.map((a, idx) => (
                <tr key={idx} className="border-b last:border-0 border-slate-100 dark:border-slate-800/60">
                  <td className="py-2.5 px-4">
                    <Link href={`/stocks/${a.symbol}`} className="font-mono font-semibold text-blue-500 hover:underline">
                      {a.symbol}
                    </Link>
                  </td>
                  <td className="py-2.5 px-4 font-medium">{a.actionType}</td>
                  <td className="py-2.5 px-4 text-slate-600 dark:text-slate-300">{a.details}</td>
                  <td className="py-2.5 px-4 text-right font-mono text-slate-500">{a.exDate}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </TerminalShell>
  );
}
