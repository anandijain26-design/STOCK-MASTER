import { ALL_INDIAN_STOCKS } from './nse-universe';

const NEWS_STOPWORDS = new Set([
  'THE', 'AND', 'FOR', 'WITH', 'FROM', 'THAT', 'THIS', 'WILL', 'HAVE', 'ARE',
  'INDIA', 'INDIAN', 'STOCK', 'STOCKS', 'SHARE', 'SHARES', 'MARKET', 'MARKETS',
  'NIFTY', 'SENSEX', 'BANK', 'NSE', 'BSE', 'SEBI', 'RBI', 'IPO', 'FPO', 'SME',
  'LTD', 'LIMITED', 'Q1', 'Q2', 'Q3', 'Q4', 'FY25', 'FY26', 'FY27', 'YOY', 'QOQ',
  'BUY', 'SELL', 'HOLD', 'HIGH', 'LOW', 'TOP', 'NEW', 'ALL', 'ONE', 'TWO', 'DAY',
  'OIL', 'GAS', 'IT', 'AUTO', 'GOLD', 'RUPEE', 'USD', 'INR', 'CRORE', 'LAKH',
  'ON', 'IN', 'AT', 'TO', 'BY', 'OF', 'AS', 'IS', 'OR', 'UP', 'NO', 'SO', 'GO',
  'BE', 'WE', 'HE', 'ME', 'MY', 'US', 'VS', 'AM', 'PM', 'IST', 'ET', 'LIVE',
  'JUST', 'WHAT', 'WHY', 'HOW', 'WHO', 'WHEN', 'CAN', 'MAY', 'OUT', 'BIG',
  'MORE', 'MOST', 'BEST', 'NEXT', 'WEEK', 'YEAR', 'DATA', 'NEWS', 'DESK',
  'RETAIL', 'GLOBAL', 'SMART', 'SUPER', 'POWER', 'GREEN', 'PRIME', 'FIRST',
  'TRADE', 'MONEY', 'FUNDS', 'TOTAL', 'VALUE', 'SMALL', 'LARGE', 'FOCUS',
  'TREND', 'BRIEF', 'EQUITY', 'CREDIT', 'PROFIT', 'GROWTH', 'RATES', 'PRICE',
  'RALLY', 'SURGE', 'INVESTOR', 'INVESTORS', 'DAILY', 'BOARD', 'POLICY',
  'BUDGET', 'EXPORT', 'IMPORT', 'DOLLAR', 'INFRA', 'PHARMA', 'ENERGY', 'MEDIA',
  'REALTY', 'STEEL', 'METALS', 'TECH', 'CORP', 'BANKING', 'FINANCE', 'CAPITAL',
]);

let _tickerSet: Set<string> | null = null;
let _firstWordMap: Map<string, string> | null = null;

function ensureSymbolLookup() {
  if (_tickerSet && _firstWordMap) return;
  _tickerSet = new Set<string>();
  _firstWordMap = new Map<string, string>();
  for (const item of ALL_INDIAN_STOCKS) {
    if (item.symbol.length >= 3 && !NEWS_STOPWORDS.has(item.symbol)) {
      _tickerSet.add(item.symbol);
    }
    const firstWord = item.companyName
      .split(' ')[0]
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '');
    if (firstWord.length >= 6 && !NEWS_STOPWORDS.has(firstWord) && !_firstWordMap.has(firstWord)) {
      _firstWordMap.set(firstWord, item.symbol);
    }
  }
}

export function getIstDateKey(date: Date = new Date()): string {
  return date.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
}

export function extractMatchedSymbol(title: string, summary = ''): string | null {
  ensureSymbolLookup();
  const rawCombined = `${title} ${summary}`;

  // Pass 1: exact uppercase ticker mentions (e.g., IRFC, TCS, HDFCBANK, SBIN)
  const rawTokens = rawCombined.match(/\b[A-Z0-9&-]{3,}\b/g) ?? [];
  for (const token of rawTokens) {
    if (NEWS_STOPWORDS.has(token)) continue;
    if (_tickerSet!.has(token)) {
      return token;
    }
  }

  // Pass 2: case-insensitive distinctive company first-word match (>= 6 chars)
  const upperTokens = rawCombined.toUpperCase().match(/[A-Z0-9&-]{6,}/g) ?? [];
  for (const token of upperTokens) {
    if (NEWS_STOPWORDS.has(token)) continue;
    const mapped = _firstWordMap!.get(token);
    if (mapped) {
      return mapped;
    }
  }

  return null;
}

export function buildNewsArticleKey(title: string, link: string): string {
  const base = (link || title).trim().toLowerCase();
  let hash = 2166136261;
  for (let i = 0; i < base.length; i++) {
    hash ^= base.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const hex = (hash >>> 0).toString(16).padStart(8, '0');
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 42);
  return `${slug}-${hex}`;
}

export function shouldRunDailyNewsSync(params: {
  digestDate: string | null;
  lastSyncedAt: Date | string | null;
  articleCount?: number;
  now?: Date;
  staleMinutes?: number;
}): boolean {
  const now = params.now ?? new Date();
  const todayIst = getIstDateKey(now);
  const staleMs = (params.staleMinutes ?? 60) * 60_000;

  if (!params.digestDate || params.digestDate !== todayIst) {
    return true;
  }
  if ((params.articleCount ?? 0) === 0 || !params.lastSyncedAt) {
    return true;
  }

  const syncedDate =
    params.lastSyncedAt instanceof Date
      ? params.lastSyncedAt
      : new Date(params.lastSyncedAt);

  if (Number.isNaN(syncedDate.getTime())) {
    return true;
  }

  return now.getTime() - syncedDate.getTime() >= staleMs;
}

export function formatNextIstSyncLabel(now: Date = new Date()): string {
  const istString = now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' });
  const ist = new Date(istString);
  const minutes = ist.getHours() * 60 + ist.getMinutes();

  if (minutes < 510) return '08:30 AM IST (Pre-Market Auto Sync)';
  if (minutes < 750) return '12:30 PM IST (Mid-Session Auto Sync)';
  if (minutes < 960) return '04:00 PM IST (Post-Market Auto Sync)';
  return '08:30 AM IST Tomorrow (Next Daily Cycle)';
}

export function buildFallbackDailyNewsDigest(
  articles: Array<{ title: string; source: string; category: string; symbol?: string | null }>,
  lang: 'en' | 'hi',
  dateKey: string
): string {
  if (articles.length === 0) {
    return lang === 'hi'
      ? `${dateKey} के लिए लाइव वित्तीय समाचार फ़ीड अभी सिंक हो रही है।`
      : `Live Indian financial news feeds for ${dateKey} are currently syncing.`;
  }

  const top = articles.slice(0, 4);
  const header =
    lang === 'hi'
      ? `**दैनिक भारतीय बाज़ार समाचार सारांश (${dateKey} IST)**\n\nआज के प्रमुख ${articles.length} समाचारों से मुख्य बिंदु:`
      : `**Auto-Synced Indian Market News Digest (${dateKey} IST)**\n\nKey headlines curated from ${articles.length} live market stories:`;

  const bullets = top
    .map(
      (a) =>
        `- **${a.category}${a.symbol ? ` · ${a.symbol}` : ''}**: ${a.title} *(${a.source})*`
    )
    .join('\n');

  return `${header}\n\n${bullets}`;
}
