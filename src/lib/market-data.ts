import { analyzeTechnicals, OHLCVBar, TechnicalSummary } from './indicators';
import {
  findStockMaster,
  INDIAN_INDICES,
  INDIAN_STOCK_UNIVERSE,
  StockMasterItem,
  toYahooSymbol,
} from './nse-universe';

export interface LiveQuote {
  symbol: string;
  name: string;
  exchange: string;
  price: number | null;
  previousClose: number | null;
  change: number | null;
  changePercent: number | null;
  dayHigh: number | null;
  dayLow: number | null;
  fiftyTwoWeekHigh: number | null;
  fiftyTwoWeekLow: number | null;
  volume: number | null;
  marketCap: number | null;
  timestamp: string | null;
  source: string;
  isDelayed: boolean;
  delayNote: string;
  status: 'live' | 'delayed' | 'unavailable';
}

export interface StockWithTechnicals {
  master: StockMasterItem;
  quote: LiveQuote;
  technicals: TechnicalSummary | null;
  bars: OHLCVBar[];
}

export interface NewsArticle {
  id: string;
  title: string;
  link: string;
  source: string;
  category: string;
  publishedAt: string;
  summary: string;
  symbol?: string;
}

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

declare global {
  var _marketCache: Map<string, CacheEntry<unknown>> | undefined;
  var _marketInFlight: Map<string, Promise<unknown>> | undefined;
}

const cache = global._marketCache ?? new Map<string, CacheEntry<unknown>>();
global._marketCache = cache;

const inFlight = global._marketInFlight ?? new Map<string, Promise<unknown>>();
global._marketInFlight = inFlight;

async function withInFlight<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const existing = inFlight.get(key) as Promise<T> | undefined;
  if (existing) return existing;
  const promise = fn().finally(() => {
    inFlight.delete(key);
  });
  inFlight.set(key, promise);
  return promise;
}

function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.data as T;
}

function setCached<T>(key: string, data: T, ttlMs: number) {
  cache.set(key, { data, expiresAt: Date.now() + ttlMs });
}

export function getIndianMarketStatus(): {
  isOpen: boolean;
  session: 'PRE_OPEN' | 'REGULAR_OPEN' | 'POST_CLOSE' | 'WEEKEND_OR_CLOSED';
  istTimeLabel: string;
} {
  const now = new Date();
  const istString = now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' });
  const ist = new Date(istString);
  const day = ist.getDay();
  const minutes = ist.getHours() * 60 + ist.getMinutes();

  const formatted = now.toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }) + ' IST';

  if (day === 0 || day === 6) {
    return { isOpen: false, session: 'WEEKEND_OR_CLOSED', istTimeLabel: formatted };
  }
  if (minutes >= 540 && minutes < 555) {
    return { isOpen: false, session: 'PRE_OPEN', istTimeLabel: formatted };
  }
  if (minutes >= 555 && minutes <= 930) {
    return { isOpen: true, session: 'REGULAR_OPEN', istTimeLabel: formatted };
  }
  return { isOpen: false, session: 'POST_CLOSE', istTimeLabel: formatted };
}

const YAHOO_INTERVAL_MAP: Record<string, { interval: string; range: string }> = {
  '1m': { interval: '1m', range: '1d' },
  '3m': { interval: '5m', range: '5d' },
  '5m': { interval: '5m', range: '5d' },
  '10m': { interval: '15m', range: '5d' },
  '15m': { interval: '15m', range: '5d' },
  '30m': { interval: '30m', range: '1mo' },
  '1h': { interval: '60m', range: '3mo' },
  '4h': { interval: '60m', range: '6mo' },
  '1D': { interval: '1d', range: '1y' },
  '1W': { interval: '1wk', range: '5y' },
  '1M': { interval: '1mo', range: 'max' },
};

export async function fetchYahooChart(
  rawSymbol: string,
  timeframe = '1D',
  displayName?: string,
  exchangeLabel = 'NSE'
): Promise<{ quote: LiveQuote; bars: OHLCVBar[] }> {
  const yahooSym = toYahooSymbol(rawSymbol);
  const tf = YAHOO_INTERVAL_MAP[timeframe] ?? YAHOO_INTERVAL_MAP['1D'];
  const cacheKey = `yf:${yahooSym}:${tf.interval}:${tf.range}`;
  const cached = getCached<{ quote: LiveQuote; bars: OHLCVBar[] }>(cacheKey);
  if (cached) return cached;

  return withInFlight(cacheKey, async () => {
    const cleanSymbol = rawSymbol.replace(/\.(NS|BO)$/i, '');

  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
      yahooSym
    )}?interval=${tf.interval}&range=${tf.range}`;

    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(6500),
      cache: 'no-store',
    });

    if (!res.ok) {
      throw new Error(`Upstream HTTP ${res.status}`);
    }

    const json = await res.json();
    const result = json?.chart?.result?.[0];
    if (!result || !result.meta) {
      throw new Error('No chart payload returned');
    }

    const meta = result.meta;
    const timestamps: number[] = result.timestamp ?? [];
    const ohlcv = result.indicators?.quote?.[0] ?? {};
    const opens: (number | null)[] = ohlcv.open ?? [];
    const highs: (number | null)[] = ohlcv.high ?? [];
    const lows: (number | null)[] = ohlcv.low ?? [];
    const closes: (number | null)[] = ohlcv.close ?? [];
    const volumes: (number | null)[] = ohlcv.volume ?? [];

    const bars: OHLCVBar[] = [];
    for (let i = 0; i < timestamps.length; i++) {
      const o = opens[i];
      const h = highs[i];
      const l = lows[i];
      const c = closes[i];
      if (
        typeof o === 'number' &&
        typeof h === 'number' &&
        typeof l === 'number' &&
        typeof c === 'number' &&
        !Number.isNaN(c)
      ) {
        bars.push({
          time: timestamps[i],
          open: Math.round(o * 100) / 100,
          high: Math.round(h * 100) / 100,
          low: Math.round(l * 100) / 100,
          close: Math.round(c * 100) / 100,
          volume: typeof volumes[i] === 'number' ? volumes[i]! : 0,
        });
      }
    }

    const price =
      typeof meta.regularMarketPrice === 'number'
        ? Math.round(meta.regularMarketPrice * 100) / 100
        : bars.length > 0
          ? bars[bars.length - 1].close
          : null;

    let prevClose: number | null = null;
    if (typeof meta.regularMarketPreviousClose === 'number') {
      prevClose = Math.round(meta.regularMarketPreviousClose * 100) / 100;
    } else if (typeof meta.previousClose === 'number') {
      prevClose = Math.round(meta.previousClose * 100) / 100;
    } else if (timeframe === '1D' && bars.length >= 2) {
      const lastBarDate = new Date(bars[bars.length - 1].time * 1000).toLocaleDateString('en-CA', {
        timeZone: 'Asia/Kolkata',
      });
      const marketDate = meta.regularMarketTime
        ? new Date(meta.regularMarketTime * 1000).toLocaleDateString('en-CA', {
            timeZone: 'Asia/Kolkata',
          })
        : lastBarDate;
      const prevBar = lastBarDate === marketDate ? bars[bars.length - 2] : bars[bars.length - 1];
      prevClose = Math.round(prevBar.close * 100) / 100;
    } else if (tf.range === '1d' && typeof meta.chartPreviousClose === 'number') {
      prevClose = Math.round(meta.chartPreviousClose * 100) / 100;
    }

    const change =
      price !== null && prevClose !== null
        ? Math.round((price - prevClose) * 100) / 100
        : null;
    const changePercent =
      change !== null && prevClose && prevClose > 0
        ? Math.round((change / prevClose) * 10000) / 100
        : null;

    const marketTime = meta.regularMarketTime
      ? new Date(meta.regularMarketTime * 1000).toISOString()
      : new Date().toISOString();

    const delaySeconds = typeof meta.exchangeDataDelayedBy === 'number' ? meta.exchangeDataDelayedBy : 0;
    const isDelayed = delaySeconds > 60;

    const quote: LiveQuote = {
      symbol: cleanSymbol,
      name: displayName ?? meta.shortName ?? meta.longName ?? cleanSymbol,
      exchange: meta.exchangeName ?? exchangeLabel,
      price,
      previousClose: prevClose,
      change,
      changePercent,
      dayHigh: typeof meta.regularMarketDayHigh === 'number' ? Math.round(meta.regularMarketDayHigh * 100) / 100 : null,
      dayLow: typeof meta.regularMarketDayLow === 'number' ? Math.round(meta.regularMarketDayLow * 100) / 100 : null,
      fiftyTwoWeekHigh: typeof meta.fiftyTwoWeekHigh === 'number' ? Math.round(meta.fiftyTwoWeekHigh * 100) / 100 : null,
      fiftyTwoWeekLow: typeof meta.fiftyTwoWeekLow === 'number' ? Math.round(meta.fiftyTwoWeekLow * 100) / 100 : null,
      volume: typeof meta.regularMarketVolume === 'number' ? meta.regularMarketVolume : bars[bars.length - 1]?.volume ?? null,
      marketCap: null,
      timestamp: marketTime,
      source: 'Yahoo Finance NSE/BSE Feed',
      isDelayed,
      delayNote: isDelayed ? `Delayed by ~${Math.round(delaySeconds / 60)} min` : 'Near real-time exchange feed',
      status: price !== null ? (isDelayed ? 'delayed' : 'live') : 'unavailable',
    };

    const payload = { quote, bars };
    setCached(cacheKey, payload, 4_000);
    return payload;
  } catch (error) {
    console.warn(`Market feed unavailable for ${yahooSym}:`, error instanceof Error ? error.message : error);
    return {
      quote: {
        symbol: cleanSymbol,
        name: displayName ?? cleanSymbol,
        exchange: exchangeLabel,
        price: null,
        previousClose: null,
        change: null,
        changePercent: null,
        dayHigh: null,
        dayLow: null,
        fiftyTwoWeekHigh: null,
        fiftyTwoWeekLow: null,
        volume: null,
        marketCap: null,
        timestamp: null,
        source: 'Unavailable',
        isDelayed: true,
        delayNote: 'Live upstream feed unreachable',
        status: 'unavailable',
      },
      bars: [],
    };
  }
  });
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let idx = 0;
  async function worker() {
    while (idx < items.length) {
      const current = idx++;
      results[current] = await fn(items[current]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => worker()));
  return results;
}

export async function fetchAllIndices(): Promise<Array<LiveQuote & { id: string; category: string }>> {
  const cacheKey = 'all_indices_v1';
  const cached = getCached<Array<LiveQuote & { id: string; category: string }>>(cacheKey);
  if (cached) return cached;

  return withInFlight(cacheKey, async () => {
    const list = await mapWithConcurrency(INDIAN_INDICES, 6, async (idx) => {
      const { quote } = await fetchYahooChart(idx.yahooSymbol, '1D', idx.name, idx.exchange);
      return {
        ...quote,
        id: idx.id,
        symbol: idx.id,
        name: idx.name,
        exchange: idx.exchange,
        category: idx.category,
      };
    });

    setCached(cacheKey, list, 4_000);
    return list;
  });
}

export async function fetchStockUniverseWithTechnicals(limit = 46): Promise<StockWithTechnicals[]> {
  const cacheKey = `universe_tech_${limit}`;
  const cached = getCached<StockWithTechnicals[]>(cacheKey);
  if (cached) return cached;

  return withInFlight(cacheKey, async () => {
    const slice = INDIAN_STOCK_UNIVERSE.slice(0, limit);
    const results = await mapWithConcurrency(slice, 8, async (master) => {
      const { quote, bars } = await fetchYahooChart(master.symbol, '1D', master.companyName, 'NSE');
      const technicals = bars.length >= 15 ? analyzeTechnicals(bars) : null;
      return { master, quote, technicals, bars };
    });

    setCached(cacheKey, results, 4_500);
    return results;
  });
}

export async function fetchStocksWithQuotesForItems(
  items: StockMasterItem[]
): Promise<StockWithTechnicals[]> {
  return mapWithConcurrency(items, 10, async (master) => {
    const { quote, bars } = await fetchYahooChart(master.symbol, '1D', master.companyName, 'NSE');
    const technicals = bars.length >= 15 ? analyzeTechnicals(bars) : null;
    return { master, quote, technicals, bars };
  });
}

export async function fetchSingleStockDetail(symbol: string, timeframe = '1D'): Promise<StockWithTechnicals> {
  const clean = symbol.trim().toUpperCase().replace(/\.(NS|BO)$/i, '');
  const master: StockMasterItem = findStockMaster(clean) ?? {
    symbol: clean,
    bseCode: 'N/A',
    isin: 'NSE Listed Equity',
    companyName: clean,
    exchange: 'NSE',
    sector: 'Indian Equities',
    industry: 'Listed Security',
    marketCapCategory: 'Mid Cap',
    isFno: false,
    faceValue: 10,
  };

  const { quote, bars } = await fetchYahooChart(clean, timeframe, master.companyName, 'NSE');
  // Always compute full daily technicals and accurate daily prevClose when viewing intraday/weekly/monthly
  let dailyBars = bars;
  let finalQuote = quote;
  if (timeframe !== '1D' || bars.length < 30) {
    const daily = await fetchYahooChart(clean, '1D', master.companyName, 'NSE');
    if (daily.bars.length > bars.length) dailyBars = daily.bars;
    if (quote.previousClose === null && daily.quote.previousClose !== null) {
      finalQuote = {
        ...quote,
        previousClose: daily.quote.previousClose,
        change: daily.quote.change,
        changePercent: daily.quote.changePercent,
      };
    }
  }
  const technicals = dailyBars.length >= 5 ? analyzeTechnicals(dailyBars) : null;

  return { master, quote: finalQuote, technicals, bars };
}

function decodeXmlEntities(str: string): string {
  return str
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/<[^>]+>/g, '')
    .trim();
}

export async function fetchIndianFinancialNews(): Promise<NewsArticle[]> {
  const cacheKey = 'indian_news_rss_v1';
  const cached = getCached<NewsArticle[]>(cacheKey);
  if (cached) return cached;

  const feeds = [
    {
      url: 'https://economictimes.indiatimes.com/markets/rssfeeds/1977021501.cms',
      source: 'Economic Times Markets',
      category: 'Markets & NSE/BSE',
    },
    {
      url: 'https://economictimes.indiatimes.com/markets/stocks/rssfeeds/2146842.cms',
      source: 'ET Stocks & Earnings',
      category: 'Company Earnings',
    },
    {
      url: 'https://economictimes.indiatimes.com/markets/ipos/fpos/rssfeeds/14655708.cms',
      source: 'ET IPO Desk',
      category: 'IPO News',
    },
  ];

  const articles: NewsArticle[] = [];

  await Promise.all(
    feeds.map(async (feed) => {
      try {
        const res = await fetch(feed.url, {
          headers: { 'User-Agent': 'Mozilla/5.0' },
          signal: AbortSignal.timeout(5000),
          cache: 'no-store',
        });
        if (!res.ok) return;
        const xml = await res.text();
        const items = xml.match(/<item>([\s\S]*?)<\/item>/g) ?? [];
        for (let i = 0; i < Math.min(items.length, 15); i++) {
          const item = items[i];
          const titleMatch = item.match(/<title>([\s\S]*?)<\/title>/);
          const linkMatch = item.match(/<link>([\s\S]*?)<\/link>/);
          const dateMatch = item.match(/<pubDate>([\s\S]*?)<\/pubDate>/);
          const descMatch = item.match(/<description>([\s\S]*?)<\/description>/);
          const title = titleMatch ? decodeXmlEntities(titleMatch[1]) : '';
          const link = linkMatch ? decodeXmlEntities(linkMatch[1]) : '';
          if (!title) continue;
          articles.push({
            id: `${feed.source}-${i}-${title.slice(0, 16)}`,
            title,
            link,
            source: feed.source,
            category: feed.category,
            publishedAt: dateMatch ? new Date(decodeXmlEntities(dateMatch[1])).toISOString() : new Date().toISOString(),
            summary: descMatch ? decodeXmlEntities(descMatch[1]).slice(0, 260) : '',
          });
        }
      } catch (e) {
        console.warn(`RSS feed error (${feed.source}):`, e instanceof Error ? e.message : e);
      }
    })
  );

  const deduped: NewsArticle[] = [];
  const seenTitles = new Set<string>();
  articles.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
  for (const art of articles) {
    const norm = art.title.trim().toLowerCase();
    if (seenTitles.has(norm)) continue;
    seenTitles.add(norm);
    deduped.push(art);
  }
  setCached(cacheKey, deduped, 120_000);
  return deduped;
}

export async function fetchNseMarketStatusLive(): Promise<{
  source: string;
  states: Array<{ market: string; marketStatus: string; tradeDate: string; index: string; last: number; variation: number; percentChange: number }>;
}> {
  try {
    const res = await fetch('https://www.nseindia.com/api/marketStatus', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        Accept: 'application/json',
        Referer: 'https://www.nseindia.com/',
      },
      signal: AbortSignal.timeout(4000),
      cache: 'no-store',
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return {
      source: 'NSE India Official Status API',
      states: Array.isArray(data?.marketState) ? data.marketState : [],
    };
  } catch {
    return { source: 'IST Session Schedule', states: [] };
  }
}
