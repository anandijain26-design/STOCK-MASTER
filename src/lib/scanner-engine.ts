export type ScannerField =
  | 'price'
  | 'changePercent'
  | 'rsi14'
  | 'ema20'
  | 'ema50'
  | 'ema200'
  | 'sma50'
  | 'sma200'
  | 'relativeVolume'
  | 'macd'
  | 'macdSignal'
  | 'peRatio'
  | 'roe'
  | 'roce'
  | 'debtToEquity'
  | 'profitGrowth';

export type ScannerOperator = '>' | '<' | '>=' | '<=' | '==' | 'CROSS_ABOVE' | 'CROSS_BELOW';

export interface ScannerCondition {
  field: ScannerField;
  operator: ScannerOperator;
  compareTo: 'VALUE' | ScannerField;
  value?: number;
}

export interface ScannableStock {
  symbol: string;
  companyName: string;
  sector: string;
  marketCapCategory: string;
  isFno: boolean;
  price: number;
  changePercent: number;
  volume: number;
  relativeVolume: number | null;
  rsi14: number | null;
  ema20: number | null;
  ema50: number | null;
  ema200: number | null;
  sma50: number | null;
  sma200: number | null;
  macd: number | null;
  macdSignal: number | null;
  macdCrossover: 'BULLISH' | 'BEARISH' | 'NONE';
  supertrendSignal: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  breakout: 'BREAKOUT' | 'BREAKDOWN' | 'NONE';
  near52WHigh: boolean;
  near52WLow: boolean;
  patterns: string[];
  peRatio: number | null;
  roe: number | null;
  roce: number | null;
  debtToEquity: number | null;
  profitGrowth: number | null;
}

export interface PrebuiltScan {
  id: string;
  name: string;
  nameHi: string;
  category: 'Momentum' | 'Trend' | 'Volume' | 'Fundamentals' | 'F&O & Patterns';
  description: string;
  descriptionHi: string;
  conditions: ScannerCondition[];
  specialFilter?: (s: ScannableStock) => boolean;
}

export const PREBUILT_SCANS: PrebuiltScan[] = [
  {
    id: 'rsi_overbought',
    name: 'RSI Above 70 (Overbought)',
    nameHi: 'RSI 70 से ऊपर (ओवरबॉट)',
    category: 'Momentum',
    description: 'Stocks showing strong overbought momentum with 14-day RSI > 70.',
    descriptionHi: '14-दिन का RSI > 70 वाले मजबूत मोमेंटम शेयर।',
    conditions: [{ field: 'rsi14', operator: '>', compareTo: 'VALUE', value: 70 }],
  },
  {
    id: 'rsi_oversold',
    name: 'RSI Below 30 (Oversold)',
    nameHi: 'RSI 30 से नीचे (ओवरसोल्ड)',
    category: 'Momentum',
    description: 'Stocks in oversold territory with 14-day RSI < 30.',
    descriptionHi: '14-दिन का RSI < 30 वाले ओवरसोल्ड शेयर।',
    conditions: [{ field: 'rsi14', operator: '<', compareTo: 'VALUE', value: 30 }],
  },
  {
    id: 'macd_bullish',
    name: 'MACD Bullish Crossover',
    nameHi: 'MACD बुलिश क्रॉसओवर',
    category: 'Momentum',
    description: 'MACD line above signal line with positive momentum.',
    descriptionHi: 'सिग्नल लाइन के ऊपर MACD लाइन।',
    conditions: [{ field: 'macd', operator: '>', compareTo: 'macdSignal' }],
  },
  {
    id: 'macd_bearish',
    name: 'MACD Bearish Crossover',
    nameHi: 'MACD बेयरिश क्रॉसओवर',
    category: 'Momentum',
    description: 'MACD line below signal line indicating bearish shift.',
    descriptionHi: 'सिग्नल लाइन के नीचे MACD लाइन।',
    conditions: [{ field: 'macd', operator: '<', compareTo: 'macdSignal' }],
  },
  {
    id: 'above_20ema',
    name: 'Price Above 20 EMA',
    nameHi: 'कीमत 20 EMA से ऊपर',
    category: 'Trend',
    description: 'Short-term bullish trend trading above 20-day EMA.',
    descriptionHi: '20-दिन के EMA से ऊपर अल्पकालिक बुलिश ट्रेंड।',
    conditions: [{ field: 'price', operator: '>', compareTo: 'ema20' }],
  },
  {
    id: 'above_50ema',
    name: 'Price Above 50 EMA',
    nameHi: 'कीमत 50 EMA से ऊपर',
    category: 'Trend',
    description: 'Medium-term uptrend above 50-day EMA.',
    descriptionHi: '50-दिन के EMA से ऊपर मध्यम अवधि का अपट्रेंड।',
    conditions: [{ field: 'price', operator: '>', compareTo: 'ema50' }],
  },
  {
    id: 'above_200ema',
    name: 'Price Above 200 EMA',
    nameHi: 'कीमत 200 EMA से ऊपर',
    category: 'Trend',
    description: 'Long-term structural uptrend above 200-day EMA.',
    descriptionHi: '200-दिन के EMA से ऊपर दीर्घकालिक अपट्रेंड।',
    conditions: [{ field: 'price', operator: '>', compareTo: 'ema200' }],
  },
  {
    id: 'golden_cross',
    name: 'Golden Crossover (50 SMA > 200 SMA)',
    nameHi: 'गोल्डन क्रॉसओवर (50 SMA > 200 SMA)',
    category: 'Trend',
    description: '50-day SMA positioned above 200-day SMA.',
    descriptionHi: '50-दिन का SMA 200-दिन के SMA से ऊपर।',
    conditions: [{ field: 'sma50', operator: '>', compareTo: 'sma200' }],
  },
  {
    id: 'death_cross',
    name: 'Death Crossover (50 SMA < 200 SMA)',
    nameHi: 'डेथ क्रॉसओवर (50 SMA < 200 SMA)',
    category: 'Trend',
    description: '50-day SMA below 200-day SMA.',
    descriptionHi: '50-दिन का SMA 200-दिन के SMA से नीचे।',
    conditions: [{ field: 'sma50', operator: '<', compareTo: 'sma200' }],
  },
  {
    id: 'volume_breakout',
    name: 'High Relative Volume Breakout (>1.5x)',
    nameHi: 'उच्च वॉल्यूम ब्रेकआउट (>1.5x)',
    category: 'Volume',
    description: 'Trading volume significantly exceeding 20-day average.',
    descriptionHi: '20-दिन के औसत से अधिक वॉल्यूम वाले शेयर।',
    conditions: [{ field: 'relativeVolume', operator: '>', compareTo: 'VALUE', value: 1.5 }],
  },
  {
    id: 'supertrend_buy',
    name: 'Supertrend Buy Signal',
    nameHi: 'सुपरट्रेंड बाय सिग्नल',
    category: 'Trend',
    description: 'Stocks currently in a bullish Supertrend (10,3) regime.',
    descriptionHi: 'सुपरट्रेंड (10,3) बुलिश सिग्नल वाले शेयर।',
    conditions: [],
    specialFilter: (s) => s.supertrendSignal === 'BULLISH',
  },
  {
    id: 'supertrend_sell',
    name: 'Supertrend Sell Signal',
    nameHi: 'सुपरट्रेंड सेल सिग्नल',
    category: 'Trend',
    description: 'Stocks currently in a bearish Supertrend (10,3) regime.',
    descriptionHi: 'सुपरट्रेंड (10,3) बेयरिश सिग्नल वाले शेयर।',
    conditions: [],
    specialFilter: (s) => s.supertrendSignal === 'BEARISH',
  },
  {
    id: '52w_high_breakout',
    name: 'Near 52-Week High',
    nameHi: '52-सप्ताह के उच्च स्तर के करीब',
    category: 'Volume',
    description: 'Stocks trading within 3% of their 52-week high.',
    descriptionHi: '52-सप्ताह के उच्चतम स्तर के 3% के भीतर ट्रेड करने वाले शेयर।',
    conditions: [],
    specialFilter: (s) => s.near52WHigh,
  },
  {
    id: 'high_roe_low_debt',
    name: 'Strong Fundamentals (High ROE & Low Debt)',
    nameHi: 'मजबूत फंडामेंटल (उच्च ROE व कम कर्ज)',
    category: 'Fundamentals',
    description: 'Quality companies with ROE >= 15% and Debt-to-Equity <= 0.5.',
    descriptionHi: 'ROE >= 15% और कर्ज-इक्विटी <= 0.5 वाली गुणवत्तापूर्ण कंपनियां।',
    conditions: [
      { field: 'roe', operator: '>=', compareTo: 'VALUE', value: 15 },
      { field: 'debtToEquity', operator: '<=', compareTo: 'VALUE', value: 0.5 },
    ],
  },
  {
    id: 'fno_unusual',
    name: 'F&O Stocks with Strong Momentum',
    nameHi: 'मजबूत मोमेंटम वाले F&O शेयर',
    category: 'F&O & Patterns',
    description: 'Derivatives-enabled stocks moving >1.5% or high relative volume.',
    descriptionHi: 'तेज चाल या उच्च वॉल्यूम वाले F&O शेयर।',
    conditions: [],
    specialFilter: (s) => s.isFno && (Math.abs(s.changePercent) >= 1.2 || (s.relativeVolume ?? 0) >= 1.3),
  },
];

export function getFieldValue(stock: ScannableStock, field: ScannerField): number | null {
  switch (field) {
    case 'price':
      return stock.price;
    case 'changePercent':
      return stock.changePercent;
    case 'rsi14':
      return stock.rsi14;
    case 'ema20':
      return stock.ema20;
    case 'ema50':
      return stock.ema50;
    case 'ema200':
      return stock.ema200;
    case 'sma50':
      return stock.sma50;
    case 'sma200':
      return stock.sma200;
    case 'relativeVolume':
      return stock.relativeVolume;
    case 'macd':
      return stock.macd;
    case 'macdSignal':
      return stock.macdSignal;
    case 'peRatio':
      return stock.peRatio;
    case 'roe':
      return stock.roe;
    case 'roce':
      return stock.roce;
    case 'debtToEquity':
      return stock.debtToEquity;
    case 'profitGrowth':
      return stock.profitGrowth;
    default:
      return null;
  }
}

export function evaluateCondition(stock: ScannableStock, cond: ScannerCondition): boolean {
  const left = getFieldValue(stock, cond.field);
  if (left === null || Number.isNaN(left)) return false;

  const right =
    cond.compareTo === 'VALUE'
      ? cond.value ?? null
      : getFieldValue(stock, cond.compareTo);
  if (right === null || Number.isNaN(right)) return false;

  switch (cond.operator) {
    case '>':
    case 'CROSS_ABOVE':
      return left > right;
    case '<':
    case 'CROSS_BELOW':
      return left < right;
    case '>=':
      return left >= right;
    case '<=':
      return left <= right;
    case '==':
      return Math.abs(left - right) < 0.01;
    default:
      return false;
  }
}

export function runScanner(
  stocks: ScannableStock[],
  conditions: ScannerCondition[],
  specialFilter?: (s: ScannableStock) => boolean
): ScannableStock[] {
  return stocks.filter((stock) => {
    if (specialFilter && !specialFilter(stock)) return false;
    return conditions.every((cond) => evaluateCondition(stock, cond));
  });
}
