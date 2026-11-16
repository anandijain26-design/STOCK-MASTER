import nseAllStocksRaw from './nse-all-stocks.json';

export type MarketCapCategory =
  | 'Large Cap'
  | 'Mid Cap'
  | 'Small Cap'
  | 'Micro Cap'
  | 'NSE Listed';

export interface StockMasterItem {
  symbol: string; // NSE ticker without .NS
  bseCode: string;
  isin: string;
  companyName: string;
  exchange: 'NSE' | 'BSE' | 'NSE/BSE';
  sector: string;
  industry: string;
  marketCapCategory: MarketCapCategory;
  isFno: boolean;
  faceValue: number;
  series?: string;
  listingDate?: string;
  // Reference fundamental profile (static exchange/annual filing reference, clearly labeled vs live price)
  peRef?: number;
  pbRef?: number;
  roeRef?: number;
  roceRef?: number;
  debtToEquityRef?: number;
  dividendYieldRef?: number;
  promoterHolding?: number;
  fiiHolding?: number;
  diiHolding?: number;
  profitGrowthRef?: number;
}

export interface IndexDefinition {
  id: string;
  name: string;
  yahooSymbol: string;
  exchange: 'NSE' | 'BSE' | 'MCX';
  category: 'Benchmark' | 'Broad' | 'Sectoral' | 'Volatility' | 'Commodity';
}

export const INDIAN_INDICES: IndexDefinition[] = [
  { id: 'NIFTY50', name: 'NIFTY 50', yahooSymbol: '^NSEI', exchange: 'NSE', category: 'Benchmark' },
  { id: 'SENSEX', name: 'SENSEX', yahooSymbol: '^BSESN', exchange: 'BSE', category: 'Benchmark' },
  { id: 'BANKNIFTY', name: 'BANK NIFTY', yahooSymbol: '^NSEBANK', exchange: 'NSE', category: 'Sectoral' },
  { id: 'INDIAVIX', name: 'INDIA VIX', yahooSymbol: '^INDIAVIX', exchange: 'NSE', category: 'Volatility' },
  { id: 'NIFTYNEXT50', name: 'NIFTY NEXT 50', yahooSymbol: '^NSMIDCP', exchange: 'NSE', category: 'Broad' },
  { id: 'NIFTY100', name: 'NIFTY 100', yahooSymbol: '^CNX100', exchange: 'NSE', category: 'Broad' },
  { id: 'NIFTY200', name: 'NIFTY 200', yahooSymbol: '^CNX200', exchange: 'NSE', category: 'Broad' },
  { id: 'NIFTY500', name: 'NIFTY 500', yahooSymbol: '^CRSLDX', exchange: 'NSE', category: 'Broad' },
  { id: 'FINNIFTY', name: 'FINNIFTY', yahooSymbol: 'NIFTY_FIN_SERVICE.NS', exchange: 'NSE', category: 'Sectoral' },
  { id: 'MIDCAPNIFTY', name: 'MIDCAP NIFTY', yahooSymbol: 'NIFTY_MIDCAP_100.NS', exchange: 'NSE', category: 'Broad' },
  { id: 'BANKEX', name: 'BSE BANKEX', yahooSymbol: 'BSE-BANK.BO', exchange: 'BSE', category: 'Sectoral' },
  { id: 'NIFTYIT', name: 'NIFTY IT', yahooSymbol: '^CNXIT', exchange: 'NSE', category: 'Sectoral' },
  { id: 'NIFTYAUTO', name: 'NIFTY AUTO', yahooSymbol: '^CNXAUTO', exchange: 'NSE', category: 'Sectoral' },
  { id: 'NIFTYPHARMA', name: 'NIFTY PHARMA', yahooSymbol: '^CNXPHARMA', exchange: 'NSE', category: 'Sectoral' },
  { id: 'NIFTYFMCG', name: 'NIFTY FMCG', yahooSymbol: '^CNXFMCG', exchange: 'NSE', category: 'Sectoral' },
  { id: 'NIFTYMETAL', name: 'NIFTY METAL', yahooSymbol: '^CNXMETAL', exchange: 'NSE', category: 'Sectoral' },
  { id: 'NIFTYREALTY', name: 'NIFTY REALTY', yahooSymbol: '^CNXREALTY', exchange: 'NSE', category: 'Sectoral' },
  { id: 'NIFTYENERGY', name: 'NIFTY ENERGY', yahooSymbol: '^CNXENERGY', exchange: 'NSE', category: 'Sectoral' },
  { id: 'MCXGOLD', name: 'GOLD (Global/MCX Ref)', yahooSymbol: 'GC=F', exchange: 'MCX', category: 'Commodity' },
  { id: 'MCXCRUDE', name: 'CRUDE OIL (Global/MCX Ref)', yahooSymbol: 'CL=F', exchange: 'MCX', category: 'Commodity' },
];

export const CURATED_STOCK_UNIVERSE: StockMasterItem[] = [
  // Large Cap - NIFTY 50 & Key Leaders
  { symbol: 'RELIANCE', bseCode: '500325', isin: 'INE002A01018', companyName: 'Reliance Industries Ltd', exchange: 'NSE/BSE', sector: 'Energy', industry: 'Oil, Gas & Telecom', marketCapCategory: 'Large Cap', isFno: true, faceValue: 10, series: 'EQ', peRef: 27.8, pbRef: 2.2, roeRef: 9.6, roceRef: 10.2, debtToEquityRef: 0.41, dividendYieldRef: 0.37, promoterHolding: 50.3, fiiHolding: 21.8, diiHolding: 16.9, profitGrowthRef: 10.4 },
  { symbol: 'TCS', bseCode: '532540', isin: 'INE467B01029', companyName: 'Tata Consultancy Services Ltd', exchange: 'NSE/BSE', sector: 'IT', industry: 'IT Services & Consulting', marketCapCategory: 'Large Cap', isFno: true, faceValue: 1, series: 'EQ', peRef: 30.4, pbRef: 14.8, roeRef: 51.2, roceRef: 64.1, debtToEquityRef: 0.08, dividendYieldRef: 1.45, promoterHolding: 71.77, fiiHolding: 12.4, diiHolding: 10.8, profitGrowthRef: 8.9 },
  { symbol: 'HDFCBANK', bseCode: '500180', isin: 'INE040A01034', companyName: 'HDFC Bank Ltd', exchange: 'NSE/BSE', sector: 'Banking & Finance', industry: 'Private Sector Bank', marketCapCategory: 'Large Cap', isFno: true, faceValue: 1, series: 'EQ', peRef: 19.2, pbRef: 2.8, roeRef: 16.4, roceRef: 7.9, debtToEquityRef: 0.0, dividendYieldRef: 1.12, promoterHolding: 0.0, fiiHolding: 47.2, diiHolding: 34.1, profitGrowthRef: 16.2 },
  { symbol: 'ICICIBANK', bseCode: '532174', isin: 'INE090A01021', companyName: 'ICICI Bank Ltd', exchange: 'NSE/BSE', sector: 'Banking & Finance', industry: 'Private Sector Bank', marketCapCategory: 'Large Cap', isFno: true, faceValue: 2, series: 'EQ', peRef: 19.8, pbRef: 3.3, roeRef: 18.7, roceRef: 8.2, debtToEquityRef: 0.0, dividendYieldRef: 0.78, promoterHolding: 0.0, fiiHolding: 44.8, diiHolding: 44.1, profitGrowthRef: 21.5 },
  { symbol: 'BHARTIARTL', bseCode: '532454', isin: 'INE397D01024', companyName: 'Bharti Airtel Ltd', exchange: 'NSE/BSE', sector: 'Telecom', industry: 'Telecom Services', marketCapCategory: 'Large Cap', isFno: true, faceValue: 5, series: 'EQ', peRef: 58.2, pbRef: 10.1, roeRef: 14.2, roceRef: 13.8, debtToEquityRef: 1.85, dividendYieldRef: 0.48, promoterHolding: 53.1, fiiHolding: 24.4, diiHolding: 18.2, profitGrowthRef: 32.0 },
  { symbol: 'INFY', bseCode: '500209', isin: 'INE009A01021', companyName: 'Infosys Ltd', exchange: 'NSE/BSE', sector: 'IT', industry: 'IT Services & Consulting', marketCapCategory: 'Large Cap', isFno: true, faceValue: 5, series: 'EQ', peRef: 27.5, pbRef: 8.2, roeRef: 31.8, roceRef: 39.2, debtToEquityRef: 0.09, dividendYieldRef: 2.15, promoterHolding: 14.6, fiiHolding: 33.8, diiHolding: 36.2, profitGrowthRef: 9.1 },
  { symbol: 'SBIN', bseCode: '500112', isin: 'INE062A01020', companyName: 'State Bank of India', exchange: 'NSE/BSE', sector: 'Banking & Finance', industry: 'Public Sector Bank', marketCapCategory: 'Large Cap', isFno: true, faceValue: 1, series: 'EQ', peRef: 10.6, pbRef: 1.8, roeRef: 18.2, roceRef: 6.9, debtToEquityRef: 0.0, dividendYieldRef: 1.65, promoterHolding: 57.5, fiiHolding: 11.1, diiHolding: 24.2, profitGrowthRef: 19.4 },
  { symbol: 'LT', bseCode: '500510', isin: 'INE018A01030', companyName: 'Larsen & Toubro Ltd', exchange: 'NSE/BSE', sector: 'Infrastructure', industry: 'Engineering & Construction', marketCapCategory: 'Large Cap', isFno: true, faceValue: 2, series: 'EQ', peRef: 34.8, pbRef: 5.4, roeRef: 15.1, roceRef: 13.6, debtToEquityRef: 1.18, dividendYieldRef: 0.79, promoterHolding: 0.0, fiiHolding: 22.8, diiHolding: 41.2, profitGrowthRef: 18.0 },
  { symbol: 'ITC', bseCode: '500875', isin: 'INE154A01025', companyName: 'ITC Ltd', exchange: 'NSE/BSE', sector: 'FMCG', industry: 'Diversified FMCG', marketCapCategory: 'Large Cap', isFno: true, faceValue: 1, series: 'EQ', peRef: 27.9, pbRef: 8.1, roeRef: 28.4, roceRef: 36.5, debtToEquityRef: 0.01, dividendYieldRef: 2.95, promoterHolding: 0.0, fiiHolding: 40.2, diiHolding: 44.1, profitGrowthRef: 7.8 },
  { symbol: 'HINDUNILVR', bseCode: '500696', isin: 'INE030A01027', companyName: 'Hindustan Unilever Ltd', exchange: 'NSE/BSE', sector: 'FMCG', industry: 'Personal Care & Home', marketCapCategory: 'Large Cap', isFno: true, faceValue: 1, series: 'EQ', peRef: 54.6, pbRef: 11.2, roeRef: 20.1, roceRef: 27.4, debtToEquityRef: 0.02, dividendYieldRef: 1.75, promoterHolding: 61.9, fiiHolding: 12.1, diiHolding: 14.3, profitGrowthRef: 5.2 },
  { symbol: 'AXISBANK', bseCode: '532215', isin: 'INE238A01034', companyName: 'Axis Bank Ltd', exchange: 'NSE/BSE', sector: 'Banking & Finance', industry: 'Private Sector Bank', marketCapCategory: 'Large Cap', isFno: true, faceValue: 2, series: 'EQ', peRef: 13.8, pbRef: 2.2, roeRef: 17.5, roceRef: 7.6, debtToEquityRef: 0.0, dividendYieldRef: 0.09, promoterHolding: 8.2, fiiHolding: 52.4, diiHolding: 31.0, profitGrowthRef: 17.8 },
  { symbol: 'KOTAKBANK', bseCode: '500247', isin: 'INE237A01028', companyName: 'Kotak Mahindra Bank Ltd', exchange: 'NSE/BSE', sector: 'Banking & Finance', industry: 'Private Sector Bank', marketCapCategory: 'Large Cap', isFno: true, faceValue: 5, series: 'EQ', peRef: 19.4, pbRef: 2.6, roeRef: 14.9, roceRef: 7.4, debtToEquityRef: 0.0, dividendYieldRef: 0.11, promoterHolding: 25.9, fiiHolding: 33.1, diiHolding: 28.4, profitGrowthRef: 14.2 },
  { symbol: 'BAJFINANCE', bseCode: '500034', isin: 'INE296A01024', companyName: 'Bajaj Finance Ltd', exchange: 'NSE/BSE', sector: 'Banking & Finance', industry: 'NBFC', marketCapCategory: 'Large Cap', isFno: true, faceValue: 2, series: 'EQ', peRef: 28.9, pbRef: 5.4, roeRef: 21.8, roceRef: 12.2, debtToEquityRef: 3.6, dividendYieldRef: 0.52, promoterHolding: 54.7, fiiHolding: 20.8, diiHolding: 14.5, profitGrowthRef: 22.1 },
  { symbol: 'MARUTI', bseCode: '532500', isin: 'INE585B01010', companyName: 'Maruti Suzuki India Ltd', exchange: 'NSE/BSE', sector: 'Automobile', industry: 'Passenger Vehicles', marketCapCategory: 'Large Cap', isFno: true, faceValue: 5, series: 'EQ', peRef: 26.8, pbRef: 4.3, roeRef: 16.5, roceRef: 21.4, debtToEquityRef: 0.01, dividendYieldRef: 1.05, promoterHolding: 58.2, fiiHolding: 18.8, diiHolding: 19.4, profitGrowthRef: 26.0 },
  { symbol: 'M&M', bseCode: '500520', isin: 'INE101A01026', companyName: 'Mahindra & Mahindra Ltd', exchange: 'NSE/BSE', sector: 'Automobile', industry: 'SUVs & Tractors', marketCapCategory: 'Large Cap', isFno: true, faceValue: 5, series: 'EQ', peRef: 29.4, pbRef: 5.2, roeRef: 18.9, roceRef: 15.8, debtToEquityRef: 1.45, dividendYieldRef: 0.72, promoterHolding: 18.5, fiiHolding: 41.2, diiHolding: 27.8, profitGrowthRef: 24.5 },
  { symbol: 'TATAMOTORS', bseCode: '500570', isin: 'INE155A01022', companyName: 'Tata Motors Ltd', exchange: 'NSE/BSE', sector: 'Automobile', industry: 'Commercial & EV Vehicles', marketCapCategory: 'Large Cap', isFno: true, faceValue: 2, series: 'EQ', peRef: 10.8, pbRef: 3.4, roeRef: 29.8, roceRef: 20.1, debtToEquityRef: 1.15, dividendYieldRef: 0.65, promoterHolding: 42.6, fiiHolding: 18.2, diiHolding: 16.5, profitGrowthRef: 42.0 },
  { symbol: 'SUNPHARMA', bseCode: '524715', isin: 'INE044A01036', companyName: 'Sun Pharmaceutical Industries Ltd', exchange: 'NSE/BSE', sector: 'Pharma', industry: 'Specialty Pharmaceuticals', marketCapCategory: 'Large Cap', isFno: true, faceValue: 1, series: 'EQ', peRef: 39.2, pbRef: 6.5, roeRef: 16.8, roceRef: 19.9, debtToEquityRef: 0.05, dividendYieldRef: 0.76, promoterHolding: 54.5, fiiHolding: 17.8, diiHolding: 18.9, profitGrowthRef: 18.6 },
  { symbol: 'NTPC', bseCode: '532555', isin: 'INE733E01010', companyName: 'NTPC Ltd', exchange: 'NSE/BSE', sector: 'Power & Energy', industry: 'Power Generation', marketCapCategory: 'Large Cap', isFno: true, faceValue: 10, series: 'EQ', peRef: 17.9, pbRef: 2.3, roeRef: 13.1, roceRef: 10.6, debtToEquityRef: 1.42, dividendYieldRef: 2.08, promoterHolding: 51.1, fiiHolding: 17.8, diiHolding: 27.6, profitGrowthRef: 14.3 },
  { symbol: 'POWERGRID', bseCode: '532898', isin: 'INE752E01010', companyName: 'Power Grid Corporation of India Ltd', exchange: 'NSE/BSE', sector: 'Power & Energy', industry: 'Power Transmission', marketCapCategory: 'Large Cap', isFno: true, faceValue: 10, series: 'EQ', peRef: 18.6, pbRef: 3.3, roeRef: 18.4, roceRef: 13.2, debtToEquityRef: 1.41, dividendYieldRef: 3.45, promoterHolding: 51.3, fiiHolding: 29.2, diiHolding: 15.8, profitGrowthRef: 6.4 },
  { symbol: 'TATASTEEL', bseCode: '500470', isin: 'INE081A01020', companyName: 'Tata Steel Ltd', exchange: 'NSE/BSE', sector: 'Metals', industry: 'Integrated Steel', marketCapCategory: 'Large Cap', isFno: true, faceValue: 1, series: 'EQ', peRef: 42.1, pbRef: 2.0, roeRef: 5.4, roceRef: 8.2, debtToEquityRef: 0.94, dividendYieldRef: 2.35, promoterHolding: 33.2, fiiHolding: 19.4, diiHolding: 24.1, profitGrowthRef: 12.0 },
  { symbol: 'JSWSTEEL', bseCode: '500228', isin: 'INE019A01038', companyName: 'JSW Steel Ltd', exchange: 'NSE/BSE', sector: 'Metals', industry: 'Steel Manufacturing', marketCapCategory: 'Large Cap', isFno: true, faceValue: 1, series: 'EQ', peRef: 28.4, pbRef: 2.9, roeRef: 11.2, roceRef: 12.4, debtToEquityRef: 1.05, dividendYieldRef: 0.78, promoterHolding: 44.8, fiiHolding: 25.6, diiHolding: 10.4, profitGrowthRef: 15.2 },
  { symbol: 'HCLTECH', bseCode: '532281', isin: 'INE860A01027', companyName: 'HCL Technologies Ltd', exchange: 'NSE/BSE', sector: 'IT', industry: 'IT Services & Engineering', marketCapCategory: 'Large Cap', isFno: true, faceValue: 2, series: 'EQ', peRef: 28.1, pbRef: 6.9, roeRef: 24.5, roceRef: 30.8, debtToEquityRef: 0.08, dividendYieldRef: 3.05, promoterHolding: 60.8, fiiHolding: 18.8, diiHolding: 15.2, profitGrowthRef: 9.8 },
  { symbol: 'WIPRO', bseCode: '507685', isin: 'INE075A01022', companyName: 'Wipro Ltd', exchange: 'NSE/BSE', sector: 'IT', industry: 'IT Services', marketCapCategory: 'Large Cap', isFno: true, faceValue: 2, series: 'EQ', peRef: 24.6, pbRef: 3.8, roeRef: 15.6, roceRef: 19.4, debtToEquityRef: 0.21, dividendYieldRef: 0.35, promoterHolding: 72.8, fiiHolding: 7.4, diiHolding: 8.9, profitGrowthRef: 6.8 },
  { symbol: 'TITAN', bseCode: '500114', isin: 'INE280A01028', companyName: 'Titan Company Ltd', exchange: 'NSE/BSE', sector: 'Consumer Discretionary', industry: 'Jewellery & Watches', marketCapCategory: 'Large Cap', isFno: true, faceValue: 1, series: 'EQ', peRef: 84.5, pbRef: 27.8, roeRef: 33.4, roceRef: 22.8, debtToEquityRef: 1.32, dividendYieldRef: 0.33, promoterHolding: 52.9, fiiHolding: 18.1, diiHolding: 11.4, profitGrowthRef: 12.6 },
  { symbol: 'ASIANPAINT', bseCode: '500820', isin: 'INE021A01026', companyName: 'Asian Paints Ltd', exchange: 'NSE/BSE', sector: 'Consumer Discretionary', industry: 'Paints & Coatings', marketCapCategory: 'Large Cap', isFno: true, faceValue: 1, series: 'EQ', peRef: 51.2, pbRef: 13.8, roeRef: 27.4, roceRef: 33.2, debtToEquityRef: 0.14, dividendYieldRef: 1.28, promoterHolding: 52.6, fiiHolding: 15.2, diiHolding: 13.8, profitGrowthRef: 4.1 },
  { symbol: 'ADANIPORTS', bseCode: '532921', isin: 'INE742F01042', companyName: 'Adani Ports and Special Economic Zone Ltd', exchange: 'NSE/BSE', sector: 'Infrastructure', industry: 'Ports & Logistics', marketCapCategory: 'Large Cap', isFno: true, faceValue: 2, series: 'EQ', peRef: 27.2, pbRef: 4.8, roeRef: 17.6, roceRef: 14.1, debtToEquityRef: 0.92, dividendYieldRef: 0.45, promoterHolding: 65.9, fiiHolding: 14.8, diiHolding: 12.6, profitGrowthRef: 28.4 },
  { symbol: 'ONGC', bseCode: '500312', isin: 'INE213A01029', companyName: 'Oil & Natural Gas Corporation Ltd', exchange: 'NSE/BSE', sector: 'Energy', industry: 'Oil Exploration', marketCapCategory: 'Large Cap', isFno: true, faceValue: 5, series: 'EQ', peRef: 7.4, pbRef: 1.0, roeRef: 14.8, roceRef: 15.2, debtToEquityRef: 0.45, dividendYieldRef: 4.6, promoterHolding: 58.9, fiiHolding: 8.6, diiHolding: 19.8, profitGrowthRef: 13.5 },
  { symbol: 'COALINDIA', bseCode: '533278', isin: 'INE522F01014', companyName: 'Coal India Ltd', exchange: 'NSE/BSE', sector: 'Metals', industry: 'Coal Mining', marketCapCategory: 'Large Cap', isFno: true, faceValue: 10, series: 'EQ', peRef: 7.8, pbRef: 3.1, roeRef: 42.6, roceRef: 54.8, debtToEquityRef: 0.08, dividendYieldRef: 5.8, promoterHolding: 63.1, fiiHolding: 8.9, diiHolding: 22.8, profitGrowthRef: 18.2 },
  { symbol: 'DRREDDY', bseCode: '500124', isin: 'INE089A01031', companyName: 'Dr. Reddys Laboratories Ltd', exchange: 'NSE/BSE', sector: 'Pharma', industry: 'Pharmaceuticals', marketCapCategory: 'Large Cap', isFno: true, faceValue: 1, series: 'EQ', peRef: 19.6, pbRef: 3.6, roeRef: 19.8, roceRef: 24.4, debtToEquityRef: 0.07, dividendYieldRef: 0.62, promoterHolding: 26.6, fiiHolding: 28.4, diiHolding: 25.1, profitGrowthRef: 19.0 },
  { symbol: 'CIPLA', bseCode: '500087', isin: 'INE059A01026', companyName: 'Cipla Ltd', exchange: 'NSE/BSE', sector: 'Pharma', industry: 'Pharmaceuticals', marketCapCategory: 'Large Cap', isFno: true, faceValue: 2, series: 'EQ', peRef: 27.4, pbRef: 4.3, roeRef: 16.4, roceRef: 22.1, debtToEquityRef: 0.02, dividendYieldRef: 0.85, promoterHolding: 31.6, fiiHolding: 27.8, diiHolding: 24.6, profitGrowthRef: 24.1 },
  { symbol: 'DLF', bseCode: '532868', isin: 'INE271C01023', companyName: 'DLF Ltd', exchange: 'NSE/BSE', sector: 'Realty', industry: 'Real Estate Development', marketCapCategory: 'Large Cap', isFno: true, faceValue: 2, series: 'EQ', peRef: 62.4, pbRef: 5.1, roeRef: 8.2, roceRef: 9.4, debtToEquityRef: 0.11, dividendYieldRef: 0.61, promoterHolding: 74.1, fiiHolding: 15.8, diiHolding: 5.2, profitGrowthRef: 31.2 },
  { symbol: 'HAL', bseCode: '541154', isin: 'INE066F01020', companyName: 'Hindustan Aeronautics Ltd', exchange: 'NSE/BSE', sector: 'Defence & Capital Goods', industry: 'Aerospace & Defence', marketCapCategory: 'Large Cap', isFno: true, faceValue: 5, series: 'EQ', peRef: 36.2, pbRef: 9.8, roeRef: 28.9, roceRef: 38.4, debtToEquityRef: 0.0, dividendYieldRef: 0.82, promoterHolding: 71.6, fiiHolding: 11.9, diiHolding: 9.8, profitGrowthRef: 29.4 },
  { symbol: 'BEL', bseCode: '500049', isin: 'INE263A01024', companyName: 'Bharat Electronics Ltd', exchange: 'NSE/BSE', sector: 'Defence & Capital Goods', industry: 'Defence Electronics', marketCapCategory: 'Large Cap', isFno: true, faceValue: 1, series: 'EQ', peRef: 47.8, pbRef: 12.6, roeRef: 26.8, roceRef: 35.1, debtToEquityRef: 0.0, dividendYieldRef: 0.74, promoterHolding: 51.1, fiiHolding: 17.5, diiHolding: 21.8, profitGrowthRef: 33.6 },
  { symbol: 'TRENT', bseCode: '500251', isin: 'INE849A01020', companyName: 'Trent Ltd', exchange: 'NSE/BSE', sector: 'Consumer Discretionary', industry: 'Apparel Retail', marketCapCategory: 'Large Cap', isFno: true, faceValue: 1, series: 'EQ', peRef: 128.4, pbRef: 42.1, roeRef: 34.2, roceRef: 32.8, debtToEquityRef: 0.42, dividendYieldRef: 0.05, promoterHolding: 37.0, fiiHolding: 26.8, diiHolding: 14.2, profitGrowthRef: 68.5 },

  // Mid Cap Stocks
  { symbol: 'DIXON', bseCode: '540699', isin: 'INE935N01020', companyName: 'Dixon Technologies (India) Ltd', exchange: 'NSE/BSE', sector: 'Electronics & EMS', industry: 'Consumer Electronics EMS', marketCapCategory: 'Mid Cap', isFno: true, faceValue: 2, series: 'EQ', peRef: 138.0, pbRef: 38.4, roeRef: 24.8, roceRef: 29.4, debtToEquityRef: 0.18, dividendYieldRef: 0.04, promoterHolding: 33.2, fiiHolding: 22.4, diiHolding: 24.8, profitGrowthRef: 48.2 },
  { symbol: 'PERSISTENT', bseCode: '533179', isin: 'INE262H01021', companyName: 'Persistent Systems Ltd', exchange: 'NSE/BSE', sector: 'IT', industry: 'Digital Engineering', marketCapCategory: 'Mid Cap', isFno: true, faceValue: 5, series: 'EQ', peRef: 64.2, pbRef: 15.8, roeRef: 25.4, roceRef: 31.2, debtToEquityRef: 0.05, dividendYieldRef: 0.48, promoterHolding: 31.0, fiiHolding: 24.2, diiHolding: 26.8, profitGrowthRef: 26.4 },
  { symbol: 'IRCTC', bseCode: '542830', isin: 'INE335Y01020', companyName: 'Indian Railway Catering and Tourism Corp', exchange: 'NSE/BSE', sector: 'Travel & Hospitality', industry: 'Rail Ticketing & Catering', marketCapCategory: 'Mid Cap', isFno: true, faceValue: 2, series: 'EQ', peRef: 54.8, pbRef: 19.6, roeRef: 37.2, roceRef: 48.6, debtToEquityRef: 0.02, dividendYieldRef: 0.78, promoterHolding: 62.4, fiiHolding: 7.8, diiHolding: 12.6, profitGrowthRef: 17.5 },
  { symbol: 'GODREJPROP', bseCode: '533151', isin: 'INE484J01027', companyName: 'Godrej Properties Ltd', exchange: 'NSE/BSE', sector: 'Realty', industry: 'Residential Real Estate', marketCapCategory: 'Mid Cap', isFno: true, faceValue: 5, series: 'EQ', peRef: 58.6, pbRef: 6.2, roeRef: 11.4, roceRef: 9.8, debtToEquityRef: 0.98, dividendYieldRef: 0.0, promoterHolding: 58.5, fiiHolding: 29.4, diiHolding: 6.2, profitGrowthRef: 39.0 },
  { symbol: 'POLYCAB', bseCode: '542652', isin: 'INE455K01017', companyName: 'Polycab India Ltd', exchange: 'NSE/BSE', sector: 'Defence & Capital Goods', industry: 'Cables & Wires', marketCapCategory: 'Mid Cap', isFno: true, faceValue: 10, series: 'EQ', peRef: 49.5, pbRef: 11.4, roeRef: 23.6, roceRef: 31.4, debtToEquityRef: 0.02, dividendYieldRef: 0.45, promoterHolding: 65.2, fiiHolding: 12.8, diiHolding: 8.6, profitGrowthRef: 28.4 },
  { symbol: 'KPITTECH', bseCode: '542651', isin: 'INE04I401011', companyName: 'KPIT Technologies Ltd', exchange: 'NSE/BSE', sector: 'IT', industry: 'Automotive Software', marketCapCategory: 'Mid Cap', isFno: true, faceValue: 10, series: 'EQ', peRef: 58.2, pbRef: 18.2, roeRef: 30.8, roceRef: 38.2, debtToEquityRef: 0.12, dividendYieldRef: 0.42, promoterHolding: 39.5, fiiHolding: 22.1, diiHolding: 18.4, profitGrowthRef: 38.2 },
  { symbol: 'SUZLON', bseCode: '532667', isin: 'INE040H01021', companyName: 'Suzlon Energy Ltd', exchange: 'NSE/BSE', sector: 'Power & Energy', industry: 'Renewable Wind Energy', marketCapCategory: 'Mid Cap', isFno: false, faceValue: 2, series: 'EQ', peRef: 82.4, pbRef: 19.2, roeRef: 22.4, roceRef: 26.8, debtToEquityRef: 0.04, dividendYieldRef: 0.0, promoterHolding: 13.2, fiiHolding: 23.7, diiHolding: 9.2, profitGrowthRef: 84.0 },
  { symbol: 'AUROPHARMA', bseCode: '524804', isin: 'INE406A01037', companyName: 'Aurobindo Pharma Ltd', exchange: 'NSE/BSE', sector: 'Pharma', industry: 'Generic Pharmaceuticals', marketCapCategory: 'Mid Cap', isFno: true, faceValue: 1, series: 'EQ', peRef: 22.4, pbRef: 2.5, roeRef: 12.1, roceRef: 14.8, debtToEquityRef: 0.22, dividendYieldRef: 0.36, promoterHolding: 51.8, fiiHolding: 17.6, diiHolding: 21.8, profitGrowthRef: 42.0 },
  { symbol: 'KALYANKJIL', bseCode: '543278', isin: 'INE303R01014', companyName: 'Kalyan Jewellers India Ltd', exchange: 'NSE/BSE', sector: 'Consumer Discretionary', industry: 'Jewellery Retail', marketCapCategory: 'Mid Cap', isFno: true, faceValue: 10, series: 'EQ', peRef: 84.2, pbRef: 14.8, roeRef: 15.8, roceRef: 18.2, debtToEquityRef: 0.84, dividendYieldRef: 0.21, promoterHolding: 62.9, fiiHolding: 16.4, diiHolding: 12.1, profitGrowthRef: 38.4 },

  // Small Cap & Micro Cap Stocks
  { symbol: 'CDSL', bseCode: '540678', isin: 'INE736A01011', companyName: 'Central Depository Services (India) Ltd', exchange: 'NSE/BSE', sector: 'Banking & Finance', industry: 'Capital Markets Depository', marketCapCategory: 'Small Cap', isFno: true, faceValue: 10, series: 'EQ', peRef: 61.5, pbRef: 20.4, roeRef: 31.4, roceRef: 41.2, debtToEquityRef: 0.0, dividendYieldRef: 0.65, promoterHolding: 15.0, fiiHolding: 14.8, diiHolding: 19.2, profitGrowthRef: 49.5 },
  { symbol: 'MCX', bseCode: '534091', isin: 'INE745G01035', companyName: 'Multi Commodity Exchange of India Ltd', exchange: 'NSE/BSE', sector: 'Banking & Finance', industry: 'Commodity Exchange', marketCapCategory: 'Small Cap', isFno: true, faceValue: 10, series: 'EQ', peRef: 68.2, pbRef: 19.4, roeRef: 24.6, roceRef: 31.8, debtToEquityRef: 0.0, dividendYieldRef: 0.25, promoterHolding: 0.0, fiiHolding: 21.4, diiHolding: 54.8, profitGrowthRef: 62.0 },
  { symbol: 'AFFLE', bseCode: '542752', isin: 'INE00WC01027', companyName: 'Affle (India) Ltd', exchange: 'NSE/BSE', sector: 'IT', industry: 'AdTech & Mobile Marketing', marketCapCategory: 'Small Cap', isFno: false, faceValue: 2, series: 'EQ', peRef: 58.4, pbRef: 8.6, roeRef: 14.8, roceRef: 17.4, debtToEquityRef: 0.05, dividendYieldRef: 0.0, promoterHolding: 55.1, fiiHolding: 16.4, diiHolding: 17.2, profitGrowthRef: 24.2 },
  { symbol: 'ANGELONE', bseCode: '543235', isin: 'INE732I01013', companyName: 'Angel One Ltd', exchange: 'NSE/BSE', sector: 'Banking & Finance', industry: 'Stock Broking & Fintech', marketCapCategory: 'Small Cap', isFno: true, faceValue: 10, series: 'EQ', peRef: 21.4, pbRef: 5.8, roeRef: 38.4, roceRef: 34.2, debtToEquityRef: 0.85, dividendYieldRef: 1.45, promoterHolding: 35.6, fiiHolding: 16.2, diiHolding: 14.8, profitGrowthRef: 31.0 },
  { symbol: 'TEJASNET', bseCode: '540595', isin: 'INE010J01012', companyName: 'Tejas Networks Ltd', exchange: 'NSE/BSE', sector: 'Telecom', industry: 'Telecom Equipment', marketCapCategory: 'Small Cap', isFno: false, faceValue: 10, series: 'EQ', peRef: 42.6, pbRef: 6.1, roeRef: 14.2, roceRef: 18.4, debtToEquityRef: 0.62, dividendYieldRef: 0.0, promoterHolding: 55.4, fiiHolding: 9.8, diiHolding: 7.4, profitGrowthRef: 95.0 },
  { symbol: 'HAPPSTMNDS', bseCode: '543227', isin: 'INE419U01012', companyName: 'Happiest Minds Technologies Ltd', exchange: 'NSE/BSE', sector: 'IT', industry: 'Digital IT Services', marketCapCategory: 'Small Cap', isFno: false, faceValue: 2, series: 'EQ', peRef: 44.2, pbRef: 7.2, roeRef: 17.8, roceRef: 19.6, debtToEquityRef: 0.31, dividendYieldRef: 0.82, promoterHolding: 44.2, fiiHolding: 5.4, diiHolding: 3.8, profitGrowthRef: 7.4 },
  { symbol: 'DATAPATTNS', bseCode: '543428', isin: 'INE0IX101010', companyName: 'Data Patterns (India) Ltd', exchange: 'NSE/BSE', sector: 'Defence & Capital Goods', industry: 'Defence Electronics', marketCapCategory: 'Small Cap', isFno: false, faceValue: 2, series: 'EQ', peRef: 68.4, pbRef: 9.8, roeRef: 14.2, roceRef: 19.1, debtToEquityRef: 0.0, dividendYieldRef: 0.28, promoterHolding: 42.4, fiiHolding: 14.2, diiHolding: 12.4, profitGrowthRef: 38.0 },
  { symbol: 'TRIDENT', bseCode: '521064', isin: 'INE064C01022', companyName: 'Trident Ltd', exchange: 'NSE/BSE', sector: 'Consumer Discretionary', industry: 'Textiles & Paper', marketCapCategory: 'Small Cap', isFno: false, faceValue: 1, series: 'EQ', peRef: 48.2, pbRef: 3.8, roeRef: 8.4, roceRef: 10.6, debtToEquityRef: 0.48, dividendYieldRef: 1.05, promoterHolding: 73.2, fiiHolding: 2.9, diiHolding: 0.8, profitGrowthRef: -6.2 },
  { symbol: 'EASEMYTRIP', bseCode: '543272', isin: 'INE07O001026', companyName: 'Easy Trip Planners Ltd', exchange: 'NSE/BSE', sector: 'Travel & Hospitality', industry: 'Online Travel', marketCapCategory: 'Micro Cap', isFno: false, faceValue: 1, series: 'EQ', peRef: 38.2, pbRef: 7.4, roeRef: 19.4, roceRef: 25.1, debtToEquityRef: 0.04, dividendYieldRef: 0.0, promoterHolding: 50.4, fiiHolding: 2.8, diiHolding: 1.4, profitGrowthRef: 11.2 },
  { symbol: 'SUBEXLTD', bseCode: '532348', isin: 'INE754A01055', companyName: 'Subex Ltd', exchange: 'NSE/BSE', sector: 'IT', industry: 'Telecom Analytics Software', marketCapCategory: 'Micro Cap', isFno: false, faceValue: 5, series: 'EQ', peRef: 0, pbRef: 3.1, roeRef: -4.2, roceRef: -2.1, debtToEquityRef: 0.06, dividendYieldRef: 0.0, promoterHolding: 0.0, fiiHolding: 1.2, diiHolding: 0.2, profitGrowthRef: -12.0 },
  { symbol: 'GTLINFRA', bseCode: '532775', isin: 'INE221H01019', companyName: 'GTL Infrastructure Ltd', exchange: 'NSE/BSE', sector: 'Telecom', industry: 'Telecom Towers', marketCapCategory: 'Micro Cap', isFno: false, faceValue: 10, series: 'EQ', peRef: 0, pbRef: 0, roeRef: 0, roceRef: -3.4, debtToEquityRef: 4.5, dividendYieldRef: 0.0, promoterHolding: 3.3, fiiHolding: 0.1, diiHolding: 41.2, profitGrowthRef: 0 },
];

// Keep backward-compatible export name for leaders universe
export const INDIAN_STOCK_UNIVERSE: StockMasterItem[] = CURATED_STOCK_UNIVERSE;

interface RawNseCsvRecord {
  s: string;
  n: string;
  sr: string;
  ld: string;
  i: string;
  fv: number;
}

const curatedMap = new Map<string, StockMasterItem>();
for (const item of CURATED_STOCK_UNIVERSE) {
  curatedMap.set(item.symbol, item);
}

const seenSymbols = new Set<string>();
const combinedList: StockMasterItem[] = [];

// Place curated flagship equities first, enriched with official listing date/series if present in CSV
const rawMap = new Map<string, RawNseCsvRecord>();
for (const rec of nseAllStocksRaw as RawNseCsvRecord[]) {
  rawMap.set(rec.s.toUpperCase(), rec);
}

for (const item of CURATED_STOCK_UNIVERSE) {
  const csvRec = rawMap.get(item.symbol);
  combinedList.push({
    ...item,
    series: csvRec?.sr ?? item.series ?? 'EQ',
    listingDate: csvRec?.ld ?? item.listingDate,
    isin: csvRec?.i || item.isin,
  });
  seenSymbols.add(item.symbol);
}

for (const rec of nseAllStocksRaw as RawNseCsvRecord[]) {
  const sym = rec.s.trim().toUpperCase();
  if (!sym || seenSymbols.has(sym)) continue;
  seenSymbols.add(sym);
  combinedList.push({
    symbol: sym,
    bseCode: '—',
    isin: rec.i || '—',
    companyName: rec.n.trim(),
    exchange: 'NSE',
    sector: 'NSE Listed Equities',
    industry: `Series ${rec.sr || 'EQ'}`,
    marketCapCategory: 'NSE Listed',
    isFno: false,
    faceValue: Number(rec.fv) || 10,
    series: rec.sr || 'EQ',
    listingDate: rec.ld || undefined,
  });
}

export const ALL_INDIAN_STOCKS: StockMasterItem[] = combinedList;

const ALL_STOCKS_MAP = new Map<string, StockMasterItem>();
for (const stock of ALL_INDIAN_STOCKS) {
  ALL_STOCKS_MAP.set(stock.symbol, stock);
}

export function findStockMaster(symbol: string): StockMasterItem | undefined {
  const clean = symbol.trim().toUpperCase().replace(/\.(NS|BO)$/i, '');
  return ALL_STOCKS_MAP.get(clean);
}

export function toYahooSymbol(symbol: string): string {
  const s = symbol.trim().toUpperCase();
  if (s.startsWith('^') || s.includes('=') || s.endsWith('.NS') || s.endsWith('.BO')) {
    return s;
  }
  return `${s}.NS`;
}
