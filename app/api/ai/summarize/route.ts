import { NextRequest, NextResponse } from 'next/server';
import { isGeminiConfigured, summarizeNewsArticle } from '@/src/lib/gemini';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const title = typeof body?.title === 'string' ? body.title : '';
    const summary = typeof body?.summary === 'string' ? body.summary : '';
    const source = typeof body?.source === 'string' ? body.source : 'Financial Desk';
    const language: 'en' | 'hi' = body?.language === 'hi' ? 'hi' : 'en';

    if (!title) {
      return NextResponse.json({ error: 'Article title is required.' }, { status: 400 });
    }
    if (!isGeminiConfigured()) {
      return NextResponse.json({ error: 'GEMINI_API_KEY is not configured.' }, { status: 503 });
    }

    const aiSummary = await summarizeNewsArticle({ title, summary, source, language });
    return NextResponse.json({ aiSummary, language });
  } catch (error) {
    console.error('Error in /api/ai/summarize:', error);
    return NextResponse.json({ error: 'Failed to summarize news article.' }, { status: 500 });
  }
}
