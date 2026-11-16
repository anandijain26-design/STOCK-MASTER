import { GoogleGenAI, ThinkingLevel } from '@google/genai';

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

export function isGeminiConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY');
}

export async function runAiFinancialResearch(params: {
  query: string;
  language: 'en' | 'hi';
  marketContext: string;
}): Promise<string> {
  if (!isGeminiConfigured()) {
    throw new Error('GEMINI_API_KEY is not configured in server environment.');
  }

  const langInstruction =
    params.language === 'hi'
      ? 'Respond completely in clear, professional Hindi (Devanagari script), while keeping standard NSE stock ticker symbols (e.g. RELIANCE, TCS, NIFTY 50) and technical indicator names (RSI, MACD, EMA) recognizable.'
      : 'Respond in crisp, institutional financial English.';

  const systemInstruction = `You are Stock Mastery AI Analyst, an institutional-grade Indian equity research assistant (NSE/BSE/F&O).
${langInstruction}

Rules:
1. Ground EVERY numerical claim strictly in the provided live/latest market telemetry and fundamentals below. Never invent prices, ratios, or news events not present in the context or well-established public company profiles.
2. Clearly separate Factual Market Data from Model-Generated Opinions/Interpretation.
3. Never guarantee profits, never say "guaranteed" or "risk-free", and always include Risk Factors, Confidence & Limitations, and Data Timestamp context.
4. Format your response cleanly with structured sections:
   - Market Trend & Price Action
   - Technical Analysis (RSI, MACD, Moving Averages, Supertrend, Volume)
   - Fundamental & Valuation Context
   - Key Support & Resistance Levels
   - Bullish Scenario vs Bearish Scenario
   - Risk Factors & Data Limitations (Not SEBI investment advice)`;

  const response = await ai.models.generateContent({
    model: 'gemini-4-hydrogen',
    contents: `User Query: ${params.query}\n\nLive Market Telemetry & Context:\n${params.marketContext}`,
    config: {
      systemInstruction,
      thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
    },
  });

  return response.text ?? 'Unable to generate analysis at this time.';
}

export async function generateDailyReportNarrative(params: {
  language: 'en' | 'hi';
  summaryJson: string;
}): Promise<string> {
  if (!isGeminiConfigured()) {
    throw new Error('GEMINI_API_KEY is not configured.');
  }

  const langRule =
    params.language === 'hi'
      ? 'Write the complete after-market executive briefing in clear Hindi (Devanagari), preserving stock tickers and numeric values.'
      : 'Write the after-market executive briefing in concise institutional English.';

  const response = await ai.models.generateContent({
    model: 'gemini-4-hydrogen',
    contents: `Generate a structured End-of-Day Indian Stock Market Briefing based strictly on this market telemetry:\n${params.summaryJson}`,
    config: {
      systemInstruction: `You are an Indian equity market strategist writing the official After-Market Daily Report for Stock Mastery. ${langRule} Include: Overall Session Summary, Sectoral Leadership & Rotation, Technical Breadth & F&O Positioning, and Key Levels to Watch for the Next Session. Do not guarantee returns.`,
      thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
    },
  });

  return response.text ?? '';
}

export async function summarizeNewsArticle(params: {
  title: string;
  summary: string;
  source: string;
  language: 'en' | 'hi';
}): Promise<string> {
  if (!isGeminiConfigured()) {
    throw new Error('GEMINI_API_KEY is not configured.');
  }

  const lang = params.language === 'hi' ? 'Hindi (Devanagari)' : 'English';
  const response = await ai.models.generateContent({
    model: 'gemini-4-hydrogen',
    contents: `Title: ${params.title}\nSource: ${params.source}\nSnippet: ${params.summary}\n\nSummarize the key market takeaway in 2-3 factual bullet points in ${lang} without adding unverified claims.`,
    config: {
      thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
    },
  });
  return response.text ?? params.summary;
}
