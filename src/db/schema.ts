import { relations } from 'drizzle-orm';
import {
  boolean,
  integer,
  jsonb,
  numeric,
  pgTable,
  serial,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(),
  email: text('email').notNull(),
  displayName: text('display_name'),
  photoUrl: text('photo_url'),
  preferredLanguage: text('preferred_language').notNull().default('en'),
  preferredTheme: text('preferred_theme').notNull().default('dark'),
  subscriptionTier: text('subscription_tier').notNull().default('free'),
  role: text('role').notNull().default('user'),
  dashboardLayout: jsonb('dashboard_layout').$type<string[]>().default([
    'indices',
    'breadth',
    'movers',
    'sectors',
    'watchlist',
    'ai_brief',
  ]),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const watchlists = pgTable('watchlists', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  name: text('name').notNull(),
  description: text('description'),
  symbols: jsonb('symbols').$type<string[]>().notNull().default([]),
  isDefault: boolean('is_default').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const portfolioHoldings = pgTable('portfolio_holdings', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  symbol: text('symbol').notNull(),
  companyName: text('company_name').notNull(),
  exchange: text('exchange').notNull().default('NSE'),
  sector: text('sector').notNull().default('Diversified'),
  quantity: numeric('quantity', { precision: 14, scale: 4 }).notNull(),
  avgBuyPrice: numeric('avg_buy_price', { precision: 14, scale: 2 }).notNull(),
  buyDate: text('buy_date').notNull(),
  realizedPnl: numeric('realized_pnl', { precision: 14, scale: 2 })
    .notNull()
    .default('0'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const portfolioTransactions = pgTable('portfolio_transactions', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  symbol: text('symbol').notNull(),
  side: text('side').notNull(),
  quantity: numeric('quantity', { precision: 14, scale: 4 }).notNull(),
  price: numeric('price', { precision: 14, scale: 2 }).notNull(),
  tradeDate: text('trade_date').notNull(),
  realizedPnl: numeric('realized_pnl', { precision: 14, scale: 2 })
    .notNull()
    .default('0'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const paperAccounts = pgTable('paper_accounts', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull()
    .unique(),
  accountName: text('account_name')
    .notNull()
    .default('Virtual NSE Paper Account'),
  initialCapital: numeric('initial_capital', { precision: 14, scale: 2 })
    .notNull()
    .default('100000'),
  cashBalance: numeric('cash_balance', { precision: 14, scale: 2 })
    .notNull()
    .default('100000'),
  realizedPnl: numeric('realized_pnl', { precision: 14, scale: 2 })
    .notNull()
    .default('0'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const paperPositions = pgTable('paper_positions', {
  id: serial('id').primaryKey(),
  accountId: integer('account_id')
    .references(() => paperAccounts.id, { onDelete: 'cascade' })
    .notNull(),
  symbol: text('symbol').notNull(),
  companyName: text('company_name').notNull(),
  exchange: text('exchange').notNull().default('NSE'),
  quantity: integer('quantity').notNull(),
  avgPrice: numeric('avg_price', { precision: 14, scale: 2 }).notNull(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const paperTrades = pgTable('paper_trades', {
  id: serial('id').primaryKey(),
  accountId: integer('account_id')
    .references(() => paperAccounts.id, { onDelete: 'cascade' })
    .notNull(),
  symbol: text('symbol').notNull(),
  companyName: text('company_name').notNull(),
  exchange: text('exchange').notNull().default('NSE'),
  side: text('side').notNull(),
  orderType: text('order_type').notNull().default('MARKET'),
  quantity: integer('quantity').notNull(),
  executedPrice: numeric('executed_price', { precision: 14, scale: 2 }).notNull(),
  totalValue: numeric('total_value', { precision: 14, scale: 2 }).notNull(),
  realizedPnl: numeric('realized_pnl', { precision: 14, scale: 2 })
    .notNull()
    .default('0'),
  priceSource: text('price_source').notNull().default('NSE/Yahoo Feed'),
  executedAt: timestamp('executed_at').defaultNow(),
});

export const priceAlerts = pgTable('price_alerts', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  symbol: text('symbol').notNull(),
  alertType: text('alert_type').notNull(),
  conditionLabel: text('condition_label').notNull(),
  thresholdValue: numeric('threshold_value', { precision: 14, scale: 2 }),
  channels: jsonb('channels').$type<string[]>().notNull().default(['in_app']),
  isActive: boolean('is_active').notNull().default(true),
  triggeredAt: timestamp('triggered_at'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const savedScanners = pgTable('saved_scanners', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  name: text('name').notNull(),
  frequency: text('frequency').notNull().default('1D'),
  conditions: jsonb('conditions').$type<unknown[]>().notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const savedCharts = pgTable('saved_charts', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  symbol: text('symbol').notNull(),
  title: text('title').notNull(),
  chartType: text('chart_type').notNull().default('candlestick'),
  timeframe: text('timeframe').notNull().default('1D'),
  indicators: jsonb('indicators').$type<Record<string, unknown>>().notNull(),
  drawings: jsonb('drawings').$type<unknown[]>().notNull().default([]),
  createdAt: timestamp('created_at').defaultNow(),
});

export const dailyReports = pgTable('daily_reports', {
  id: serial('id').primaryKey(),
  reportDate: text('report_date').notNull().unique(),
  language: text('language').notNull().default('en'),
  marketSummary: jsonb('market_summary').$type<Record<string, unknown>>().notNull(),
  topMovers: jsonb('top_movers').$type<Record<string, unknown>>().notNull(),
  sectorAnalysis: jsonb('sector_analysis').$type<Record<string, unknown>>().notNull(),
  technicalSummary: jsonb('technical_summary').$type<Record<string, unknown>>().notNull(),
  newsAndFundamentals: jsonb('news_and_fundamentals').$type<Record<string, unknown>>().notNull(),
  nextSessionOutlook: jsonb('next_session_outlook').$type<Record<string, unknown>>().notNull(),
  aiNarrativeEn: text('ai_narrative_en').notNull(),
  aiNarrativeHi: text('ai_narrative_hi'),
  generatedAt: timestamp('generated_at').defaultNow(),
});

export const stockMaster = pgTable('stock_master', {
  id: serial('id').primaryKey(),
  symbol: text('symbol').notNull().unique(),
  bseCode: text('bse_code'),
  isin: text('isin'),
  companyName: text('company_name').notNull(),
  exchange: text('exchange').notNull().default('NSE'),
  sector: text('sector').notNull(),
  industry: text('industry').notNull(),
  marketCapCategory: text('market_cap_category').notNull(),
  isFno: boolean('is_fno').notNull().default(false),
  status: text('status').notNull().default('ACTIVE'),
  lastSyncedAt: timestamp('last_synced_at').defaultNow(),
});

export const auditLogs = pgTable('audit_logs', {
  id: serial('id').primaryKey(),
  userId: integer('user_id'),
  action: text('action').notNull(),
  resource: text('resource').notNull(),
  details: jsonb('details').$type<Record<string, unknown>>(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const platformAnnouncements = pgTable('platform_announcements', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  body: text('body').notNull(),
  severity: text('severity').notNull().default('info'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow(),
});

export const marketNewsItems = pgTable('market_news_items', {
  id: serial('id').primaryKey(),
  articleKey: text('article_key').notNull().unique(),
  newsDate: text('news_date').notNull(),
  title: text('title').notNull(),
  link: text('link').notNull(),
  source: text('source').notNull(),
  category: text('category').notNull(),
  summary: text('summary').notNull().default(''),
  symbol: text('symbol'),
  publishedAt: timestamp('published_at').notNull().defaultNow(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const newsDailyDigests = pgTable('news_daily_digests', {
  id: serial('id').primaryKey(),
  digestDate: text('digest_date').notNull().unique(),
  articleCount: integer('article_count').notNull().default(0),
  aiDigestEn: text('ai_digest_en').notNull().default(''),
  aiDigestHi: text('ai_digest_hi'),
  status: text('status').notNull().default('SYNCED'),
  lastSyncedAt: timestamp('last_synced_at').notNull().defaultNow(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const usersRelations = relations(users, ({ many, one }) => ({
  watchlists: many(watchlists),
  portfolioHoldings: many(portfolioHoldings),
  portfolioTransactions: many(portfolioTransactions),
  paperAccount: one(paperAccounts, {
    fields: [users.id],
    references: [paperAccounts.userId],
  }),
  priceAlerts: many(priceAlerts),
  savedScanners: many(savedScanners),
  savedCharts: many(savedCharts),
}));

export const paperAccountsRelations = relations(paperAccounts, ({ many, one }) => ({
  user: one(users, {
    fields: [paperAccounts.userId],
    references: [users.id],
  }),
  positions: many(paperPositions),
  trades: many(paperTrades),
}));
