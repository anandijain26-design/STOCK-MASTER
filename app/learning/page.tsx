'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { TerminalShell } from '@/src/components/TerminalShell';
import { useApp } from '@/src/components/AppProviders';
import { formatINR } from '@/src/lib/i18n';

const MODULES = [
  {
    id: 'basics',
    titleEn: '01. Indian Stock Market Basics (NSE, BSE & SEBI)',
    titleHi: '01. भारतीय शेयर बाज़ार की मूल बातें (NSE, BSE और SEBI)',
    summaryEn:
      'Understand how NSE and BSE operate, equity vs F&O segments, T+1 settlement cycles, market capitalization tiers (Large/Mid/Small Cap), and SEBI investor protections.',
    summaryHi:
      'NSE और BSE कैसे काम करते हैं, इक्विटी बनाम F&O सेगमेंट, T+1 सेटलमेंट चक्र, मार्केट कैप श्रेणियां और SEBI के नियम समझें।',
  },
  {
    id: 'technicals',
    titleEn: '02. Technical Analysis & Indicator Frameworks',
    titleHi: '02. तकनीकी विश्लेषण और संकेतक (RSI, MACD, EMA)',
    summaryEn:
      'Learn trend identification with EMA 20/50/200 and Supertrend, momentum oscillators like RSI (14) and MACD crossovers, Bollinger volatility squeezes, and VWAP.',
    summaryHi:
      'EMA 20/50/200 और सुपरट्रेंड से ट्रेंड पहचानना, RSI (14) व MACD क्रॉसओवर, बोलिंजर बैंड और VWAP का उपयोग सीखें।',
  },
  {
    id: 'fundamentals',
    titleEn: '03. Fundamental Analysis (Screener Ratios)',
    titleHi: '03. फंडामेंटल विश्लेषण (P/E, ROE, ROCE, कर्ज)',
    summaryEn:
      'Evaluate business quality using P/E, P/B, ROE, ROCE, Debt-to-Equity, Free Cash Flow, Promoter pledging, and institutional FII/DII accumulation.',
    summaryHi:
      'P/E, P/B, ROE, ROCE, कर्ज-से-इक्विटी, कैश फ्लो और प्रमोटर/FII/DII शेयरहोल्डिंग का मूल्यांकन करना सीखें।',
  },
  {
    id: 'candlesticks',
    titleEn: '04. Candlestick & Chart Pattern Recognition',
    titleHi: '04. कैंडलस्टिक और चार्ट पैटर्न पहचान',
    summaryEn:
      'Spot high-probability price action setups: Hammer, Shooting Star, Bullish/Bearish Engulfing, Doji indecision, Cup & Handle, and Breakout retests.',
    summaryHi:
      'हैमर, शूटिंग स्टार, बुलिश/बेयरिश एंगल्फिंग, डोजी और ब्रेकआउट रीटेस्ट जैसे प्राइस एक्शन पैटर्न पहचानें।',
  },
  {
    id: 'risk',
    titleEn: '05. Position Sizing & Risk Management',
    titleHi: '05. पोजीशन साइज़िंग और जोखिम प्रबंधन',
    summaryEn:
      'Protect trading capital using the 1–2% max risk per trade rule, ATR-based stop losses, and minimum 1:2 risk-to-reward discipline.',
    summaryHi:
      'प्रति ट्रेड 1–2% अधिकतम जोखिम नियम, ATR-आधारित स्टॉप-लॉस और 1:2 रिस्क-रिवार्ड अनुपात से पूंजी सुरक्षित रखें।',
  },
  {
    id: 'intraday_swing',
    titleEn: '06. Intraday, Swing & Long-Term Investing',
    titleHi: '06. इंट्राडे, स्विंग और दीर्घकालिक निवेश रणनीतियां',
    summaryEn:
      'Compare 5m/15m intraday VWAP setups, 1D/1W swing momentum breakouts, and multi-year compounding portfolios.',
    summaryHi:
      '5m/15m इंट्राडे VWAP सेटअप, 1D/1W स्विंग ब्रेकआउट और दीर्घकालिक कंपाउंडिंग निवेश की तुलना समझें।',
  },
  {
    id: 'options',
    titleEn: '07. Options Trading & Greeks Education',
    titleHi: '07. ऑप्शंस ट्रेडिंग, ओपन इंटरेस्ट व ग्रीक्स शिक्षा',
    summaryEn:
      'Master Call/Put payoffs, Open Interest support/resistance, Put-Call Ratio (PCR), Max Pain, Implied Volatility crush, and Delta/Theta decay.',
    summaryHi:
      'कॉल/पुट पेऑफ, ओपन इंटरेस्ट सपोर्ट/रेज़िस्टेंस, PCR, मैक्स पेन, IV और डेल्टा/थीटा ग्रीक्स सीखें।',
  },
  {
    id: 'portfolio_mgmt',
    titleEn: '08. Portfolio Diversification & Asset Allocation',
    titleHi: '08. पोर्टफोलियो विविधीकरण और एसेट एलोकेशन',
    summaryEn:
      'Balance sector exposure across Banking, IT, Pharma, and Defence, avoid over-concentration, and rebalance quarterly.',
    summaryHi:
      'बैंकिंग, IT, फार्मा और डिफेंस सेक्टर में संतुलित आवंटन रखें और नियमित रूप से रीबैलेंस करें।',
  },
];

export default function LearningAcademyPage() {
  const { t, language } = useApp();
  const [capital, setCapital] = useState(100000);
  const [riskPct, setRiskPct] = useState(1);
  const [entry, setEntry] = useState(1340);
  const [stopLoss, setStopLoss] = useState(1300);

  const riskPerShare = Math.max(0.01, Math.abs(entry - stopLoss));
  const maxRiskAmount = (capital * riskPct) / 100;
  const recommendedQty = Math.floor(maxRiskAmount / riskPerShare);

  return (
    <TerminalShell breadcrumb={t.nav.learning}>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              {language === 'hi'
                ? 'स्टॉक मास्टरी लर्निंग अकादमी व अभ्यास केंद्र'
                : 'Stock Mastery Learning Academy & Risk Lab'}
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              {language === 'hi'
                ? 'शुरुआती और सक्रिय ट्रेडर्स के लिए तकनीकी, फंडामेंटल और जोखिम प्रबंधन पाठ्यक्रम।'
                : 'Structured market education paired with an interactive Position Size Calculator and Virtual Paper Trading.'}
            </p>
          </div>
          <Link
            href="/paper-trading"
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold whitespace-nowrap"
          >
            {language === 'hi'
              ? '₹1,00,000 वर्चुअल पेपर ट्रेडिंग शुरू करें →'
              : 'Practice with ₹1,00,000 Virtual Paper Trading →'}
          </Link>
        </div>

        {/* Interactive Risk & Position Sizing Lab */}
        <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A] p-5 space-y-4">
          <h2 className="text-base font-semibold">
            {language === 'hi'
              ? 'इंटरैक्टिव पोजीशन साइज़ व स्टॉप-लॉस कैलकुलेटर'
              : 'Interactive Position Sizing & Risk Management Calculator'}
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <label htmlFor="calc-cap" className="block text-xs text-slate-500 mb-1">
                Capital (₹)
              </label>
              <input
                id="calc-cap"
                type="number"
                value={capital}
                onChange={(e) => setCapital(Number(e.target.value))}
                className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#080D1A] text-slate-900 dark:text-slate-100 font-mono text-sm"
              />
            </div>
            <div>
              <label htmlFor="calc-risk" className="block text-xs text-slate-500 mb-1">
                Risk per Trade (%)
              </label>
              <input
                id="calc-risk"
                type="number"
                step="0.25"
                value={riskPct}
                onChange={(e) => setRiskPct(Number(e.target.value))}
                className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#080D1A] text-slate-900 dark:text-slate-100 font-mono text-sm"
              />
            </div>
            <div>
              <label htmlFor="calc-entry" className="block text-xs text-slate-500 mb-1">
                Entry Price (₹)
              </label>
              <input
                id="calc-entry"
                type="number"
                value={entry}
                onChange={(e) => setEntry(Number(e.target.value))}
                className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#080D1A] text-slate-900 dark:text-slate-100 font-mono text-sm"
              />
            </div>
            <div>
              <label htmlFor="calc-sl" className="block text-xs text-slate-500 mb-1">
                Stop-Loss (₹)
              </label>
              <input
                id="calc-sl"
                type="number"
                value={stopLoss}
                onChange={(e) => setStopLoss(Number(e.target.value))}
                className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#080D1A] text-slate-900 dark:text-slate-100 font-mono text-sm"
              />
            </div>
            <div className="p-3 rounded-lg border border-blue-500/30 bg-blue-500/5">
              <div className="text-xs text-slate-500">Recommended Qty</div>
              <div className="font-mono text-lg font-bold text-blue-500">
                {recommendedQty} shares
              </div>
              <div className="text-[11px] font-mono text-slate-500">
                Max Risk: {formatINR(maxRiskAmount)}
              </div>
            </div>
          </div>
        </section>

        {/* Curriculum Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {MODULES.map((m) => (
            <div
              key={m.id}
              className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A] p-5 space-y-2"
            >
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                {language === 'hi' ? m.titleHi : m.titleEn}
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                {language === 'hi' ? m.summaryHi : m.summaryEn}
              </p>
            </div>
          ))}
        </div>
      </div>
    </TerminalShell>
  );
}
