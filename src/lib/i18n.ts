export type AppLanguage = 'en' | 'hi';

export interface Translations {
  brand: string;
  nav: {
    dashboard: string;
    markets: string;
    stocks: string;
    charts: string;
    scanners: string;
    aiAnalyst: string;
    fno: string;
    reports: string;
    news: string;
    ipo: string;
    portfolio: string;
    paperTrading: string;
    watchlists: string;
    learning: string;
    profile: string;
    admin: string;
  };
  common: {
    searchPlaceholder: string;
    signIn: string;
    signOut: string;
    loading: string;
    unavailable: string;
    live: string;
    delayed: string;
    lastUpdated: string;
    marketOpen: string;
    marketClosed: string;
    save: string;
    cancel: string;
    delete: string;
    refresh: string;
    autoRefreshOn: string;
    autoRefreshOff: string;
    downloadPdf: string;
    language: string;
    english: string;
    hindi: string;
    theme: string;
    darkMode: string;
    lightMode: string;
    buy: string;
    sell: string;
    price: string;
    change: string;
    volume: string;
    marketCap: string;
    sector: string;
    exchange: string;
    action: string;
    symbol: string;
    company: string;
    disclaimer: string;
  };
  dashboard: {
    title: string;
    subtitle: string;
    indicesTitle: string;
    marketBreadth: string;
    advances: string;
    declines: string;
    unchanged: string;
    topGainers: string;
    topLosers: string;
    mostActive: string;
    sectorPerformance: string;
    indiaVix: string;
    quickWatchlist: string;
    aiBriefTitle: string;
  };
  stockDetail: {
    overview: string;
    technicals: string;
    fundamentals: string;
    financials: string;
    shareholding: string;
    newsAndCorp: string;
    aiAnalysis: string;
    peRatio: string;
    pbRatio: string;
    eps: string;
    roe: string;
    roce: string;
    debtToEquity: string;
    dividendYield: string;
    faceValue: string;
    bookValue: string;
    highLow52W: string;
    promoterHolding: string;
    fiiHolding: string;
    diiHolding: string;
    publicHolding: string;
    addToWatchlist: string;
    setAlert: string;
    paperTradeBtn: string;
    runAiAnalysis: string;
  };
  paperTrading: {
    title: string;
    virtualBadge: string;
    virtualDisclaimer: string;
    virtualCash: string;
    investedValue: string;
    totalPortfolioValue: string;
    unrealizedPnl: string;
    realizedPnl: string;
    placeVirtualOrder: string;
    orderType: string;
    quantity: string;
    estimatedValue: string;
    executeBuy: string;
    executeSell: string;
    resetAccount: string;
    positionsTab: string;
    historyTab: string;
    noPositions: string;
    noTrades: string;
  };
  aiAnalyst: {
    title: string;
    subtitle: string;
    placeholder: string;
    askButton: string;
    suggestedQueries: string;
    disclaimer: string;
    languageNote: string;
  };
  reports: {
    title: string;
    subtitle: string;
    generateNow: string;
    overallSummary: string;
    topMovers: string;
    sectorAnalysis: string;
    technicalSignals: string;
    newsFundamentals: string;
    nextOutlook: string;
    historicalArchive: string;
  };
  profile: {
    title: string;
    languageSettings: string;
    languageDesc: string;
    accountSection: string;
    deleteAccount: string;
    dashboardLayout: string;
  };
}

export const DICTIONARY: Record<AppLanguage, Translations> = {
  en: {
    brand: 'Stock Mastery',
    nav: {
      dashboard: 'Dashboard',
      markets: 'Markets',
      stocks: 'Stocks',
      charts: 'Charts',
      scanners: 'Scanners',
      aiAnalyst: 'AI Analyst',
      fno: 'F&O',
      reports: 'Daily Reports',
      news: 'News',
      ipo: 'IPO & Actions',
      portfolio: 'Portfolio',
      paperTrading: 'Paper Trading',
      watchlists: 'Watchlists',
      learning: 'Learning',
      profile: 'Profile',
      admin: 'Admin',
    },
    common: {
      searchPlaceholder: 'Search NSE/BSE stocks (e.g. RELIANCE, TCS, INFY)...',
      signIn: 'Sign In',
      signOut: 'Sign Out',
      loading: 'Loading market data...',
      unavailable: 'Feed unavailable',
      live: 'LIVE',
      delayed: 'DELAYED',
      lastUpdated: 'Last updated',
      marketOpen: 'NSE/BSE Open',
      marketClosed: 'Market Closed',
      save: 'Save',
      cancel: 'Cancel',
      delete: 'Delete',
      refresh: 'Refresh',
      autoRefreshOn: 'Auto 5s: ON',
      autoRefreshOff: 'Auto 5s: OFF',
      downloadPdf: 'Download PDF',
      language: 'Language',
      english: 'English',
      hindi: 'हिन्दी (Hindi)',
      theme: 'Theme',
      darkMode: 'Dark Terminal',
      lightMode: 'Light Mode',
      buy: 'BUY',
      sell: 'SELL',
      price: 'Price (₹)',
      change: 'Change',
      volume: 'Volume',
      marketCap: 'Market Cap',
      sector: 'Sector',
      exchange: 'Exchange',
      action: 'Action',
      symbol: 'Symbol',
      company: 'Company',
      disclaimer:
        'Educational & research platform only. Not SEBI-registered investment advice. Market data reflects latest exchange/provider feed.',
    },
    dashboard: {
      title: 'Indian Market Intelligence Terminal',
      subtitle: 'Live NSE & BSE indices, sectoral breadth, technical screeners, and AI research.',
      indicesTitle: 'Benchmark & Sectoral Indices',
      marketBreadth: 'Market Breadth (NSE Tracked)',
      advances: 'Advances',
      declines: 'Declines',
      unchanged: 'Unchanged',
      topGainers: 'Top Gainers',
      topLosers: 'Top Losers',
      mostActive: 'Most Active by Volume',
      sectorPerformance: 'Sector Performance',
      indiaVix: 'India VIX',
      quickWatchlist: 'Core Watchlist',
      aiBriefTitle: 'AI Market Intelligence Brief',
    },
    stockDetail: {
      overview: 'Price & Chart',
      technicals: 'Technical Indicators',
      fundamentals: 'Fundamentals',
      financials: 'Quarterly & Annual Results',
      shareholding: 'Shareholding Pattern',
      newsAndCorp: 'Announcements & News',
      aiAnalysis: 'AI Research Brief',
      peRatio: 'P/E Ratio',
      pbRatio: 'P/B Ratio',
      eps: 'EPS (TTM)',
      roe: 'ROE %',
      roce: 'ROCE %',
      debtToEquity: 'Debt / Equity',
      dividendYield: 'Dividend Yield',
      faceValue: 'Face Value',
      bookValue: 'Book Value',
      highLow52W: '52-Week High / Low',
      promoterHolding: 'Promoters',
      fiiHolding: 'FIIs',
      diiHolding: 'DIIs',
      publicHolding: 'Public',
      addToWatchlist: 'Add to Watchlist',
      setAlert: 'Create Alert',
      paperTradeBtn: 'Paper Trade',
      runAiAnalysis: 'Generate AI Stock Research',
    },
    paperTrading: {
      title: 'Virtual Paper Trading Simulator',
      virtualBadge: 'VIRTUAL MONEY · ₹0 REAL RISK',
      virtualDisclaimer:
        'Simulated trades use live/latest market prices with virtual INR capital for practice only. No real money or brokerage orders are executed.',
      virtualCash: 'Available Virtual Cash',
      investedValue: 'Invested Value',
      totalPortfolioValue: 'Virtual Net Worth',
      unrealizedPnl: 'Unrealized P&L',
      realizedPnl: 'Realized P&L',
      placeVirtualOrder: 'Place Virtual Order',
      orderType: 'Order Type',
      quantity: 'Quantity',
      estimatedValue: 'Estimated Order Value',
      executeBuy: 'Simulate Virtual BUY',
      executeSell: 'Simulate Virtual SELL',
      resetAccount: 'Reset ₹1,00,000 Account',
      positionsTab: 'Virtual Holdings',
      historyTab: 'Virtual Trade History',
      noPositions: 'No open virtual positions yet. Simulate your first buy order.',
      noTrades: 'No virtual trades executed yet.',
    },
    aiAnalyst: {
      title: 'AI Financial Research Assistant',
      subtitle: 'Ask about any NSE/BSE stock, technical setups, NIFTY trend, or quarterly comparisons.',
      placeholder: 'Ask e.g. "Analyse RELIANCE technicals and support levels" or "Compare TCS vs INFY"...',
      askButton: 'Run Research',
      suggestedQueries: 'Suggested Research Prompts',
      disclaimer:
        'Model-generated opinion separated from factual market telemetry. Never guarantees returns; consult a SEBI-registered advisor before investing.',
      languageNote: 'Responses follow your selected language',
    },
    reports: {
      title: 'After-Market Automatic Daily Report',
      subtitle: 'End-of-day institutional summary across NIFTY, SENSEX, sectors, technicals, and next-session outlook.',
      generateNow: 'Generate Today’s Report',
      overallSummary: 'A. Overall Market Summary',
      topMovers: 'B. Top Market Movements',
      sectorAnalysis: 'C. Sector Analysis',
      technicalSignals: 'D. Technical Market Analysis',
      newsFundamentals: 'E. Fundamental & News Analysis',
      nextOutlook: 'F. Next Trading Session Outlook',
      historicalArchive: 'Historical Reports Archive',
    },
    profile: {
      title: 'Profile, Language & Preferences',
      languageSettings: 'Platform Language (Multi-Language Support)',
      languageDesc: 'Switch all interface labels, technical terms, reports, and AI Analyst responses between English and Hindi.',
      accountSection: 'Account & Security',
      deleteAccount: 'Delete Account',
      dashboardLayout: 'Dashboard Modules',
    },
  },
  hi: {
    brand: 'स्टॉक मास्टरी',
    nav: {
      dashboard: 'डैशबोर्ड',
      markets: 'बाज़ार',
      stocks: 'शेयर सूची',
      charts: 'चार्ट्स',
      scanners: 'स्कैनर',
      aiAnalyst: 'AI विश्लेषक',
      fno: 'F&O डेरिवेटिव्स',
      reports: 'दैनिक रिपोर्ट',
      news: 'समाचार',
      ipo: 'IPO व कॉर्पोरेट',
      portfolio: 'पोर्टफोलियो',
      paperTrading: 'पेपर ट्रेडिंग',
      watchlists: 'वॉचलिस्ट',
      learning: 'शिक्षा केंद्र',
      profile: 'प्रोफ़ाइल',
      admin: 'एडमिन',
    },
    common: {
      searchPlaceholder: 'NSE/BSE शेयर खोजें (जैसे RELIANCE, TCS, INFY)...',
      signIn: 'साइन इन',
      signOut: 'साइन आउट',
      loading: 'बाज़ार डेटा लोड हो रहा है...',
      unavailable: 'डेटा उपलब्ध नहीं',
      live: 'लाइव',
      delayed: 'विलंबित',
      lastUpdated: 'अंतिम अपडेट',
      marketOpen: 'NSE/BSE खुला है',
      marketClosed: 'बाज़ार बंद',
      save: 'सहेजें',
      cancel: 'रद्द करें',
      delete: 'हटाएं',
      refresh: 'रिफ्रेश',
      autoRefreshOn: 'ऑटो 5s: चालू',
      autoRefreshOff: 'ऑटो 5s: बंद',
      downloadPdf: 'PDF डाउनलोड करें',
      language: 'भाषा',
      english: 'English (अंग्रेज़ी)',
      hindi: 'हिन्दी',
      theme: 'थीम',
      darkMode: 'डार्क टर्मिनल',
      lightMode: 'लाइट मोड',
      buy: 'खरीदें (BUY)',
      sell: 'बेचें (SELL)',
      price: 'कीमत (₹)',
      change: 'बदलाव',
      volume: 'वॉल्यूम',
      marketCap: 'मार्केट कैप',
      sector: 'सेक्टर',
      exchange: 'एक्सचेंज',
      action: 'कार्रवाई',
      symbol: 'प्रतीक',
      company: 'कंपनी',
      disclaimer:
        'केवल शैक्षिक और अनुसंधान प्लेटफ़ॉर्म। यह SEBI-पंजीकृत निवेश सलाह नहीं है। बाज़ार डेटा लाइव/अद्यतन प्रदाता फीड पर आधारित है।',
    },
    dashboard: {
      title: 'भारतीय शेयर बाज़ार इंटेलिजेंस टर्मिनल',
      subtitle: 'लाइव NSE और BSE सूचकांक, सेक्टर प्रदर्शन, तकनीकी स्कैनर और AI शोध।',
      indicesTitle: 'प्रमुख व सेक्टोरल सूचकांक',
      marketBreadth: 'मार्केट ब्रेड्थ (NSE)',
      advances: 'बढ़त वाले',
      declines: 'गिरावट वाले',
      unchanged: 'अपरिवर्तित',
      topGainers: 'शीर्ष लाभ वाले शेयर',
      topLosers: 'शीर्ष गिरावट वाले शेयर',
      mostActive: 'सर्वाधिक सक्रिय (वॉल्यूम)',
      sectorPerformance: 'सेक्टर प्रदर्शन',
      indiaVix: 'इंडिया VIX',
      quickWatchlist: 'प्रमुख वॉचलिस्ट',
      aiBriefTitle: 'AI बाज़ार सारांश',
    },
    stockDetail: {
      overview: 'कीमत और चार्ट',
      technicals: 'तकनीकी संकेतक',
      fundamentals: 'फंडामेंटल डेटा',
      financials: 'तिमाही व वार्षिक परिणाम',
      shareholding: 'शेयरहोल्डिंग पैटर्न',
      newsAndCorp: 'घोषणाएं व समाचार',
      aiAnalysis: 'AI शोध रिपोर्ट',
      peRatio: 'P/E अनुपात',
      pbRatio: 'P/B अनुपात',
      eps: 'EPS (TTM)',
      roe: 'ROE %',
      roce: 'ROCE %',
      debtToEquity: 'कर्ज / इक्विटी',
      dividendYield: 'डिविडेंड यील्ड',
      faceValue: 'फेस वैल्यू',
      bookValue: 'बुक वैल्यू',
      highLow52W: '52-सप्ताह उच्च / निम्न',
      promoterHolding: 'प्रमोटर',
      fiiHolding: 'FII (विदेशी संस्था)',
      diiHolding: 'DII (घरेलू संस्था)',
      publicHolding: 'पब्लिक',
      addToWatchlist: 'वॉचलिस्ट में जोड़ें',
      setAlert: 'अलर्ट सेट करें',
      paperTradeBtn: 'पेपर ट्रेड करें',
      runAiAnalysis: 'AI स्टॉक विश्लेषण तैयार करें',
    },
    paperTrading: {
      title: 'वर्चुअल पेपर ट्रेडिंग सिम्युलेटर',
      virtualBadge: 'वर्चुअल मुद्रा · ₹0 वास्तविक जोखिम',
      virtualDisclaimer:
        'पेपर ट्रेडिंग अभ्यास के लिए लाइव बाज़ार कीमतों और वर्चुअल ₹ पूंजी का उपयोग करती है। कोई वास्तविक धन या ब्रोकरेज ऑर्डर निष्पादित नहीं होता।',
      virtualCash: 'उपलब्ध वर्चुअल नकद',
      investedValue: 'निवेशित मूल्य',
      totalPortfolioValue: 'कुल वर्चुअल मूल्य',
      unrealizedPnl: 'अवास्तविक लाभ/हानि',
      realizedPnl: 'वास्तविक लाभ/हानि',
      placeVirtualOrder: 'वर्चुअल ऑर्डर लगाएं',
      orderType: 'ऑर्डर प्रकार',
      quantity: 'मात्रा (शेयर)',
      estimatedValue: 'अनुमानित ऑर्डर मूल्य',
      executeBuy: 'वर्चुअल BUY करें',
      executeSell: 'वर्चुअल SELL करें',
      resetAccount: '₹1,00,000 खाता रीसेट करें',
      positionsTab: 'वर्चुअल होल्डिंग्स',
      historyTab: 'वर्चुअल ट्रेड इतिहास',
      noPositions: 'अभी कोई वर्चुअल होल्डिंग नहीं है। अपना पहला वर्चुअल ऑर्डर लगाएं।',
      noTrades: 'अभी तक कोई वर्चुअल ट्रेड नहीं हुआ है।',
    },
    aiAnalyst: {
      title: 'AI वित्तीय शोध सहायक',
      subtitle: 'किसी भी NSE/BSE शेयर, तकनीकी सेटअप, NIFTY ट्रेंड या तिमाही तुलना के बारे में पूछें।',
      placeholder: 'पूछें जैसे "RELIANCE का तकनीकी विश्लेषण करें" या "TCS और INFY की तुलना करें"...',
      askButton: 'शोध चलाएं',
      suggestedQueries: 'सुझाए गए शोध प्रश्न',
      disclaimer:
        'मॉडल द्वारा तैयार राय को वास्तविक डेटा से अलग दिखाया गया है। लाभ की कोई गारंटी नहीं; निवेश से पहले SEBI-पंजीकृत सलाहकार से परामर्श लें।',
      languageNote: 'उत्तर आपकी चयनित भाषा में दिए जाएंगे',
    },
    reports: {
      title: 'बाज़ार बंद होने के बाद की स्वचालित दैनिक रिपोर्ट',
      subtitle: 'NIFTY, SENSEX, सेक्टर, तकनीकी संकेतक और अगले सत्र के दृष्टिकोण का संपूर्ण सारांश।',
      generateNow: 'आज की रिपोर्ट तैयार करें',
      overallSummary: 'A. समग्र बाज़ार सारांश',
      topMovers: 'B. शीर्ष बाज़ार चाल',
      sectorAnalysis: 'C. सेक्टर विश्लेषण',
      technicalSignals: 'D. तकनीकी बाज़ार विश्लेषण',
      newsFundamentals: 'E. फंडामेंटल और समाचार विश्लेषण',
      nextOutlook: 'F. अगले कारोबारी सत्र का दृष्टिकोण',
      historicalArchive: 'पिछली रिपोर्ट्स का संग्रह',
    },
    profile: {
      title: 'प्रोफ़ाइल, भाषा और प्राथमिकताएं',
      languageSettings: 'प्लेटफ़ॉर्म भाषा (बहु-भाषी समर्थन)',
      languageDesc: 'सभी लेबल, तकनीकी संकेतक, रिपोर्ट और AI विश्लेषक के उत्तर अंग्रेजी और हिन्दी के बीच बदलें।',
      accountSection: 'खाता और सुरक्षा',
      deleteAccount: 'खाता हटाएं',
      dashboardLayout: 'डैशबोर्ड मॉड्यूल',
    },
  },
};

export function formatINR(value: number | null | undefined, decimals = 2): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

export function formatIndianNumber(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  return new Intl.NumberFormat('en-IN').format(Math.round(value));
}

export function formatCrores(marketCapInr: number | null | undefined): string {
  if (!marketCapInr || Number.isNaN(marketCapInr)) return '—';
  const crores = marketCapInr / 1e7;
  if (crores >= 100000) return `₹${(crores / 100000).toFixed(2)} Lakh Cr`;
  return `₹${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(Math.round(crores))} Cr`;
}
