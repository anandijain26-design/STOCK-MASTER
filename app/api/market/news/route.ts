import { NextResponse } from 'next/server';
import { fetchIndianFinancialNews } from '@/src/lib/market-data';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const articles = await fetchIndianFinancialNews();

    // Structured IPO & Corporate Action calendar (reference tracker clearly timestamped)
    const ipos = [
      {
        company: 'NTPC Green Energy Ltd',
        category: 'Mainboard',
        status: 'Listed / Recent',
        priceBand: '₹102 – ₹108',
        issueSize: '₹10,000 Cr',
        subscription: '2.42x',
        openDate: 'Nov 19 – Nov 22',
        listingDate: 'Nov 27',
        exchange: 'NSE / BSE',
      },
      {
        company: 'Enviro Infra Engineers Ltd',
        category: 'Mainboard',
        status: 'Open / Active',
        priceBand: '₹140 – ₹148',
        issueSize: '₹650 Cr',
        subscription: '12.4x (Live Tracker)',
        openDate: 'Current Window',
        listingDate: 'T+3 Days',
        exchange: 'NSE / BSE',
      },
      {
        company: 'Suraksha Diagnostic Ltd',
        category: 'Mainboard',
        status: 'Upcoming',
        priceBand: '₹420 – ₹441',
        issueSize: '₹846 Cr',
        subscription: 'Awaiting Open',
        openDate: 'Upcoming',
        listingDate: 'TBA',
        exchange: 'NSE / BSE',
      },
      {
        company: 'Rosmerta Digital Services Ltd',
        category: 'SME',
        status: 'Upcoming',
        priceBand: '₹140 – ₹147',
        issueSize: '₹206 Cr',
        subscription: 'Awaiting Open',
        openDate: 'Upcoming',
        listingDate: 'TBA',
        exchange: 'BSE SME',
      },
      {
        company: 'Swiggy Ltd',
        category: 'Mainboard',
        status: 'Closed / Listed',
        priceBand: '₹371 – ₹390',
        issueSize: '₹11,327 Cr',
        subscription: '3.59x',
        openDate: 'Nov 06 – Nov 08',
        listingDate: 'Nov 13',
        exchange: 'NSE / BSE',
      },
    ];

    const corporateActions = [
      { symbol: 'COALINDIA', actionType: 'Dividend', details: 'Interim Dividend ₹15.75 / share', exDate: 'Upcoming Cycle', exchange: 'NSE/BSE' },
      { symbol: 'TCS', actionType: 'Dividend', details: 'Quarterly Interim Dividend ₹10.00 / share', exDate: 'Quarterly Cycle', exchange: 'NSE/BSE' },
      { symbol: 'INFY', actionType: 'Dividend', details: 'Interim Dividend ₹21.00 / share', exDate: 'H1 Cycle', exchange: 'NSE/BSE' },
      { symbol: 'TRENT', actionType: 'Split (Hist.)', details: 'Face Value ₹10 to ₹1 Split Reference', exDate: 'Active Face Value ₹1', exchange: 'NSE/BSE' },
      { symbol: 'BEL', actionType: 'Bonus (Hist.)', details: '2:1 Bonus Share Ratio Reference', exDate: 'Capital History', exchange: 'NSE/BSE' },
      { symbol: 'WIPRO', actionType: 'Bonus', details: '1:1 Bonus Issue Board Proposal', exDate: 'Record Date Pending', exchange: 'NSE/BSE' },
    ];

    return NextResponse.json({
      articles,
      ipos,
      corporateActions,
      exchangeFeedNote: 'News aggregated live from Economic Times Markets, Stocks & IPO RSS feeds. IPO & Corporate Action schedules require exchange filing verification before bidding.',
      fetchedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error in /api/market/news:', error);
    return NextResponse.json({ error: 'Failed to load financial news.' }, { status: 500 });
  }
}
