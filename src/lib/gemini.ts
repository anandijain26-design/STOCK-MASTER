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

interface ResilientCallParams {
  contents: string;
  systemInstruction?: string;
  responseMimeType?: string;
  timeoutMs?: number;
}

function parseBilingualJson(raw: string): { en: string; hi: string } | null {
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
  const parsed = JSON.parse(cleaned);
  if (parsed && typeof parsed.en === 'string' && typeof parsed.hi === 'string') {
    return { en: parsed.en.trim(), hi: parsed.hi.trim() };
  }
  return null;
}

/**
 * Resilient Gemini caller with automatic exponential backoff, per-request timeout,
 * and transparent fallback from 'gemini-4-hydrogen' to 'gemini-3.1-flash-lite'
 * when encountering high demand spikes (503 UNAVAILABLE) or rate throttling (429).
 */
async function callGeminiWithResilience(params: ResilientCallParams): Promise<string> {
  const modelChain = [
    { name: 'gemini-4-hydrogen', thinkingLevel: ThinkingLevel.LOW },
    { name: 'gemini-3.1-flash-lite', thinkingLevel: ThinkingLevel.MINIMAL },
  ] as const;

  const perAttemptTimeoutMs = params.timeoutMs ?? 12000;
  let lastError: unknown = null;

  for (let m = 0; m < modelChain.length; m++) {
    const { name, thinkingLevel } = modelChain[m];
    const maxAttempts = m === 0 ? 2 : 1;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const response = await Promise.race([
          ai.models.generateContent({
            model: name,
            contents: params.contents,
            config: {
              systemInstruction: params.systemInstruction,
              responseMimeType: params.responseMimeType,
              thinkingConfig: { thinkingLevel },
            },
          }),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error(`Gemini ${name} timed out after ${perAttemptTimeoutMs}ms`)), perAttemptTimeoutMs)
          ),
        ]);

        const text = response.text?.trim();
        if (text) {
          return text;
        }
      } catch (err: unknown) {
        lastError = err;
        const errMsg = err instanceof Error ? err.message : String(err);
        const isTransient =
          errMsg.includes('503') ||
          errMsg.includes('UNAVAILABLE') ||
          errMsg.includes('high demand') ||
          errMsg.includes('429') ||
          errMsg.includes('RESOURCE_EXHAUSTED') ||
          errMsg.includes('timed out');

        if (isTransient && attempt < maxAttempts) {
          // Wait briefly before retrying primary model
          await new Promise((resolve) => setTimeout(resolve, 800 * attempt));
          continue;
        }

        if (isTransient && m < modelChain.length - 1) {
          console.warn(
            `Gemini model ${name} returned transient high demand (${errMsg.slice(0, 100)}). Falling back to ${modelChain[m + 1].name}...`
          );
          break; // Move to fallback model
        }

        if (!isTransient) {
          // Non-transient error: stop chain
          throw err;
        }
      }
    }
  }

  throw lastError ?? new Error('Gemini generation failed across all models.');
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

  const text = await callGeminiWithResilience({
    contents: `User Query: ${params.query}\n\nLive Market Telemetry & Context:\n${params.marketContext}`,
    systemInstruction,
  });

  return text || 'Unable to generate analysis at this time.';
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

  const text = await callGeminiWithResilience({
    contents: `Generate a structured End-of-Day Indian Stock Market Briefing based strictly on this market telemetry:\n${params.summaryJson}`,
    systemInstruction: `You are an Indian equity market strategist writing the official After-Market Daily Report for Stock Mastery. ${langRule} Include: Overall Session Summary, Sectoral Leadership & Rotation, Technical Breadth & F&O Positioning, and Key Levels to Watch for the Next Session. Do not guarantee returns.`,
  });

  return text || '';
}

export async function generateBilingualDailyReportNarrative(params: {
  summaryJson: string;
}): Promise<{ en: string; hi: string }> {
  if (!isGeminiConfigured()) {
    throw new Error('GEMINI_API_KEY is not configured.');
  }

  const prompt = `Indian Equity Market Telemetry:\n${params.summaryJson}\n\nTask:\nGenerate the official After-Market Daily Report for Stock Mastery in BOTH English and Hindi.\nReturn a strict JSON object with exact keys "en" and "hi".`;

  const raw = await callGeminiWithResilience({
    contents: prompt,
    systemInstruction:
      'You are an Indian equity market strategist writing the After-Market Daily Report. Return valid JSON with "en" and "hi" executive briefings. Include Overall Session Summary, Sectoral Leadership, Technical Breadth, and Next Session Levels. Do not promise returns.',
    responseMimeType: 'application/json',
    timeoutMs: 10000,
  });

  try {
    const parsed = parseBilingualJson(raw);
    if (parsed) return parsed;
  } catch (err) {
    console.warn('Bilingual report JSON parse failed, falling back to sequential calls:', err);
  }

  // Sequential fallback only if valid response was not JSON
  const en = await generateDailyReportNarrative({ language: 'en', summaryJson: params.summaryJson });
  const hi = await generateDailyReportNarrative({ language: 'hi', summaryJson: params.summaryJson });
  return { en, hi };
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
  const text = await callGeminiWithResilience({
    contents: `Title: ${params.title}\nSource: ${params.source}\nSnippet: ${params.summary}\n\nSummarize the key market takeaway in 2-3 factual bullet points in ${lang} without adding unverified claims.`,
    systemInstruction: 'You are a financial desk editor summarizing Indian market news concisely.',
  });

  return text || params.summary;
}

export async function generateDailyNewsDigest(params: {
  language: 'en' | 'hi';
  dateKey: string;
  headlinesText: string;
}): Promise<string> {
  if (!isGeminiConfigured()) {
    throw new Error('GEMINI_API_KEY is not configured.');
  }

  const langRule =
    params.language === 'hi'
      ? 'Write the daily Indian market news digest in crisp, clear Hindi (Devanagari), preserving stock tickers (e.g. RELIANCE, TCS, NIFTY).'
      : 'Write the daily Indian market news digest in crisp institutional English.';

  const text = await callGeminiWithResilience({
    contents: `Date (IST): ${params.dateKey}\nHeadlines:\n${params.headlinesText}\n\nSummarize the top 4-5 market themes, sector catalysts, and corporate news triggers concisely as bullet points.`,
    systemInstruction: `You are Stock Mastery's Daily News Desk AI. ${langRule} Stay strictly factual to the provided headlines without inventing events.`,
  });

  return text || '';
}

export async function generateBilingualNewsDigest(params: {
  dateKey: string;
  headlinesText: string;
}): Promise<{ en: string; hi: string }> {
  if (!isGeminiConfigured()) {
    throw new Error('GEMINI_API_KEY is not configured.');
  }

  const prompt = `Date (IST): ${params.dateKey}
Headlines:
${params.headlinesText}

Task:
Produce a concise daily Indian stock market news digest in BOTH English and Hindi.
Return a strict JSON object with exact keys "en" and "hi".

Format requirements:
- "en": 4-5 high-impact bullet points summarizing key market themes, sector rotations, and corporate triggers in crisp English.
- "hi": 4-5 high-impact bullet points in clear Hindi (Devanagari script), keeping stock tickers (e.g. RELIANCE, TCS, NIFTY 50) clear.
- Ground points strictly in the provided headlines. Do not invent speculative claims.`;

  const raw = await callGeminiWithResilience({
    contents: prompt,
    systemInstruction:
      'You are Stock Mastery Daily News AI. Return factual Indian market summaries in JSON format with "en" and "hi" keys.',
    responseMimeType: 'application/json',
    timeoutMs: 9000,
  });

  try {
    const parsed = parseBilingualJson(raw);
    if (parsed) return parsed;
  } catch (err) {
    console.warn('Bilingual news JSON parse failed, falling back to sequential calls:', err);
  }

  // Sequential fallback only if valid response was not JSON
  const en = await generateDailyNewsDigest({
    language: 'en',
    dateKey: params.dateKey,
    headlinesText: params.headlinesText,
  });
  const hi = await generateDailyNewsDigest({
    language: 'hi',
    dateKey: params.dateKey,
    headlinesText: params.headlinesText,
  });

  return { en, hi };
}
