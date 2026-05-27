// ─── Types ────────────────────────────────────────────────────────────────────

export type ApiCategory =
  | "AI/ML" | "Data" | "Communication" | "Finance" | "Search"
  | "Storage" | "Analytics" | "Security" | "Productivity" | "Media";

export type ApiPricing = "free" | "paid" | "subscription" | "usage";
export type ApiAuthType = "api_key" | "oauth" | "none" | "bearer";

export interface ApiEndpointExample {
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  path: string;
  description: string;
  request_body?: Record<string, unknown>;
  response_example?: Record<string, unknown>;
}

export interface MarketplaceApi {
  id: string;
  name: string;
  description: string;
  long_description: string;
  creator_name: string;
  creator_verified: boolean;
  category: ApiCategory;
  pricing: ApiPricing;
  price_per_call?: number;    // USD cents
  monthly_price?: number;     // USD cents
  free_calls_per_day?: number;
  base_url: string;
  auth_type: ApiAuthType;
  request_count: number;
  rating: number;
  reviews_count: number;
  uptime_pct: number;
  latency_ms: number;
  tags: string[];
  is_featured: boolean;
  is_trending: boolean;
  is_verified: boolean;
  created_at: string;
  endpoints: ApiEndpointExample[];
  integrates_with: string[];  // agent names
  version: string;
}

export interface ApiUsageLog {
  id: string;
  api_id: string;
  endpoint: string;
  timestamp: string;
  latency_ms: number;
  status: number;
  tokens?: number;
}

export interface ApiCreatorStats {
  api_id: string;
  total_calls: number;
  revenue_usd: number;
  active_subscribers: number;
  avg_latency_ms: number;
  error_rate: number;
  calls_last_7d: number[];
}

// ─── Filter state ─────────────────────────────────────────────────────────────

export interface ApiFilterState {
  search: string;
  categories: ApiCategory[];
  pricing: ApiPricing[];
  auth_type: ApiAuthType[];
  min_rating: number;
  sort: "trending" | "rating" | "newest" | "most_used" | "price_asc";
}

// ─── Mock data ────────────────────────────────────────────────────────────────

export const MARKETPLACE_APIS: MarketplaceApi[] = [
  {
    id: "api-001",
    name: "SentimentIQ",
    description: "Real-time sentiment analysis for text, reviews, and social media.",
    long_description: "SentimentIQ uses a fine-tuned transformer model to classify sentiment as positive, negative, or neutral with sub-100ms latency. Supports batch processing and 40+ languages.",
    creator_name: "DataLabs AI",
    creator_verified: true,
    category: "AI/ML",
    pricing: "usage",
    price_per_call: 2,
    free_calls_per_day: 100,
    base_url: "https://api.sentimentiq.io/v2",
    auth_type: "api_key",
    request_count: 4_820_000,
    rating: 4.8,
    reviews_count: 1240,
    uptime_pct: 99.97,
    latency_ms: 68,
    tags: ["nlp", "sentiment", "text-analysis", "multilingual"],
    is_featured: true,
    is_trending: true,
    is_verified: true,
    created_at: "2024-08-15T00:00:00Z",
    version: "2.1.0",
    integrates_with: ["Marketing Agent", "Support Agent", "Research Agent"],
    endpoints: [
      { method: "POST", path: "/analyze", description: "Analyze a single text", request_body: { text: "string" }, response_example: { sentiment: "positive", score: 0.94, language: "en" } },
      { method: "POST", path: "/batch", description: "Analyze up to 100 texts at once", request_body: { texts: ["string"] }, response_example: { results: [] } },
    ],
  },
  {
    id: "api-002",
    name: "NewsRadar",
    description: "Aggregated real-time news from 50,000+ sources with topic filtering.",
    long_description: "NewsRadar indexes millions of articles daily across 50k+ sources. Filter by topic, region, language, recency, and source credibility score. Ideal for research and monitoring agents.",
    creator_name: "MediaStack Inc",
    creator_verified: true,
    category: "Data",
    pricing: "subscription",
    monthly_price: 2900,
    free_calls_per_day: 50,
    base_url: "https://api.newsradar.dev/v1",
    auth_type: "api_key",
    request_count: 12_400_000,
    rating: 4.6,
    reviews_count: 876,
    uptime_pct: 99.89,
    latency_ms: 145,
    tags: ["news", "media", "real-time", "aggregation"],
    is_featured: true,
    is_trending: false,
    is_verified: true,
    created_at: "2024-04-20T00:00:00Z",
    version: "1.4.2",
    integrates_with: ["Research Agent", "Writing Agent"],
    endpoints: [
      { method: "GET", path: "/headlines", description: "Get top headlines by topic", response_example: { articles: [], total: 0 } },
      { method: "GET", path: "/search", description: "Full-text search across indexed articles" },
    ],
  },
  {
    id: "api-003",
    name: "SendPulse",
    description: "Transactional email and SMS delivery with 99.9% inbox rate.",
    long_description: "SendPulse provides enterprise-grade email and SMS delivery with analytics, template support, and real-time webhooks. Supports attachments, scheduling, and list segmentation.",
    creator_name: "PulseComm",
    creator_verified: true,
    category: "Communication",
    pricing: "usage",
    price_per_call: 1,
    free_calls_per_day: 200,
    base_url: "https://api.sendpulse.io/v3",
    auth_type: "bearer",
    request_count: 31_000_000,
    rating: 4.7,
    reviews_count: 2104,
    uptime_pct: 99.95,
    latency_ms: 82,
    tags: ["email", "sms", "transactional", "notifications"],
    is_featured: false,
    is_trending: true,
    is_verified: true,
    created_at: "2024-01-10T00:00:00Z",
    version: "3.2.1",
    integrates_with: ["Email Agent", "Support Agent", "Sales Agent"],
    endpoints: [
      { method: "POST", path: "/email/send", description: "Send transactional email" },
      { method: "POST", path: "/sms/send", description: "Send SMS to a single number" },
      { method: "GET", path: "/email/status/:id", description: "Get delivery status" },
    ],
  },
  {
    id: "api-004",
    name: "FinanceStream",
    description: "Live stock prices, forex rates, and crypto data with <50ms latency.",
    long_description: "FinanceStream provides institutional-grade market data covering 80,000+ securities across all major exchanges, forex pairs, and 500+ crypto assets. WebSocket and REST interfaces.",
    creator_name: "QuantData Labs",
    creator_verified: true,
    category: "Finance",
    pricing: "subscription",
    monthly_price: 9900,
    base_url: "https://api.financestream.io/v4",
    auth_type: "api_key",
    request_count: 8_700_000,
    rating: 4.9,
    reviews_count: 564,
    uptime_pct: 99.99,
    latency_ms: 42,
    tags: ["stocks", "crypto", "forex", "real-time", "market-data"],
    is_featured: true,
    is_trending: true,
    is_verified: true,
    created_at: "2024-03-05T00:00:00Z",
    version: "4.0.3",
    integrates_with: ["Finance Agent", "Analytics Agent"],
    endpoints: [
      { method: "GET", path: "/quote/:symbol", description: "Get real-time quote for a symbol" },
      { method: "GET", path: "/history/:symbol", description: "Historical OHLCV data" },
      { method: "GET", path: "/crypto/prices", description: "Top crypto prices and 24h change" },
    ],
  },
  {
    id: "api-005",
    name: "SearchNova",
    description: "Web search API returning structured results from 10B+ indexed pages.",
    long_description: "SearchNova powers AI agents with real-time web search. Returns structured JSON results including title, snippet, URL, and page metadata. Supports site: and date: filters.",
    creator_name: "IndexCorp",
    creator_verified: false,
    category: "Search",
    pricing: "usage",
    price_per_call: 5,
    free_calls_per_day: 30,
    base_url: "https://api.searchnova.ai/v1",
    auth_type: "api_key",
    request_count: 6_200_000,
    rating: 4.4,
    reviews_count: 432,
    uptime_pct: 99.70,
    latency_ms: 210,
    tags: ["search", "web", "indexing", "real-time"],
    is_featured: false,
    is_trending: true,
    is_verified: false,
    created_at: "2024-06-14T00:00:00Z",
    version: "1.2.0",
    integrates_with: ["Research Agent", "Dev Agent"],
    endpoints: [
      { method: "GET", path: "/search", description: "Web search — returns ranked results" },
      { method: "GET", path: "/news", description: "News-specific search with freshness filter" },
    ],
  },
  {
    id: "api-006",
    name: "VaultStore",
    description: "Encrypted file storage with presigned URLs and CDN delivery.",
    long_description: "VaultStore provides S3-compatible object storage with client-side encryption, CDN distribution across 200 PoPs, and fine-grained access controls. Perfect for agent output storage.",
    creator_name: "CloudVault",
    creator_verified: true,
    category: "Storage",
    pricing: "usage",
    price_per_call: 1,
    free_calls_per_day: 500,
    base_url: "https://api.vaultstore.io/v2",
    auth_type: "api_key",
    request_count: 22_000_000,
    rating: 4.7,
    reviews_count: 1876,
    uptime_pct: 99.98,
    latency_ms: 55,
    tags: ["storage", "cdn", "files", "encryption", "s3-compatible"],
    is_featured: false,
    is_trending: false,
    is_verified: true,
    created_at: "2023-11-01T00:00:00Z",
    version: "2.4.1",
    integrates_with: ["File Agent", "Report Generator"],
    endpoints: [
      { method: "POST", path: "/upload", description: "Upload a file (multipart or base64)" },
      { method: "GET", path: "/download/:id", description: "Generate presigned download URL" },
      { method: "DELETE", path: "/files/:id", description: "Permanently delete a file" },
    ],
  },
  {
    id: "api-007",
    name: "AnalyticsGraph",
    description: "Unified event tracking and funnel analytics for web and mobile.",
    long_description: "AnalyticsGraph captures user events, builds conversion funnels, cohort analyses, and A/B test results in real time. Compatible with all major frameworks via SDK or REST.",
    creator_name: "MetricFlow",
    creator_verified: false,
    category: "Analytics",
    pricing: "subscription",
    monthly_price: 4900,
    free_calls_per_day: 1000,
    base_url: "https://api.analyticsgraph.io/v1",
    auth_type: "bearer",
    request_count: 9_100_000,
    rating: 4.3,
    reviews_count: 312,
    uptime_pct: 99.80,
    latency_ms: 125,
    tags: ["analytics", "events", "funnel", "cohort", "a/b-testing"],
    is_featured: false,
    is_trending: false,
    is_verified: false,
    created_at: "2024-07-22T00:00:00Z",
    version: "1.5.0",
    integrates_with: ["Analytics Agent", "Marketing Agent"],
    endpoints: [
      { method: "POST", path: "/track", description: "Track a single user event" },
      { method: "POST", path: "/batch", description: "Track multiple events in one request" },
      { method: "GET", path: "/funnel/:id", description: "Get funnel conversion data" },
    ],
  },
  {
    id: "api-008",
    name: "ShieldAI",
    description: "Content moderation API with 98% accuracy across 15 harm categories.",
    long_description: "ShieldAI uses ensemble ML models to detect hate speech, violence, spam, NSFW content, and misinformation across text, images, and video. Returns confidence scores and evidence snippets.",
    creator_name: "TrustLayer",
    creator_verified: true,
    category: "Security",
    pricing: "usage",
    price_per_call: 3,
    free_calls_per_day: 50,
    base_url: "https://api.shieldai.io/v1",
    auth_type: "api_key",
    request_count: 3_400_000,
    rating: 4.6,
    reviews_count: 218,
    uptime_pct: 99.93,
    latency_ms: 95,
    tags: ["moderation", "safety", "nlp", "trust"],
    is_featured: false,
    is_trending: false,
    is_verified: true,
    created_at: "2024-09-30T00:00:00Z",
    version: "1.0.2",
    integrates_with: ["Support Agent", "Content Agent"],
    endpoints: [
      { method: "POST", path: "/moderate/text", description: "Moderate a text string" },
      { method: "POST", path: "/moderate/image", description: "Moderate an image (URL or base64)" },
    ],
  },
  {
    id: "api-009",
    name: "TranslateX",
    description: "Neural machine translation for 120 languages with glossary support.",
    long_description: "TranslateX delivers human-quality translations using domain-adapted neural models. Supports custom glossaries, formality control, and HTML-preserving translation for web content.",
    creator_name: "LinguaAI",
    creator_verified: true,
    category: "AI/ML",
    pricing: "usage",
    price_per_call: 2,
    free_calls_per_day: 200,
    base_url: "https://api.translatex.io/v3",
    auth_type: "api_key",
    request_count: 18_000_000,
    rating: 4.8,
    reviews_count: 2342,
    uptime_pct: 99.96,
    latency_ms: 88,
    tags: ["translation", "nlp", "multilingual", "i18n"],
    is_featured: true,
    is_trending: false,
    is_verified: true,
    created_at: "2023-12-01T00:00:00Z",
    version: "3.1.0",
    integrates_with: ["Writing Agent", "Support Agent", "Email Agent"],
    endpoints: [
      { method: "POST", path: "/translate", description: "Translate text between any two languages" },
      { method: "POST", path: "/detect", description: "Detect the language of a text" },
      { method: "GET", path: "/languages", description: "List all supported language pairs" },
    ],
  },
  {
    id: "api-010",
    name: "PDFForge",
    description: "HTML-to-PDF conversion with pixel-perfect rendering and watermarks.",
    long_description: "PDFForge converts any HTML, URL, or Markdown to high-fidelity PDF documents. Supports custom headers/footers, watermarks, password protection, digital signatures, and batch conversion.",
    creator_name: "DocuLabs",
    creator_verified: false,
    category: "Productivity",
    pricing: "usage",
    price_per_call: 8,
    free_calls_per_day: 25,
    base_url: "https://api.pdfforge.dev/v2",
    auth_type: "api_key",
    request_count: 2_800_000,
    rating: 4.5,
    reviews_count: 387,
    uptime_pct: 99.82,
    latency_ms: 780,
    tags: ["pdf", "documents", "html", "conversion"],
    is_featured: false,
    is_trending: true,
    is_verified: false,
    created_at: "2024-10-05T00:00:00Z",
    version: "2.0.1",
    integrates_with: ["Report Generator", "File Agent"],
    endpoints: [
      { method: "POST", path: "/html-to-pdf", description: "Convert HTML string to PDF" },
      { method: "POST", path: "/url-to-pdf", description: "Capture any URL as PDF" },
      { method: "POST", path: "/merge", description: "Merge multiple PDFs into one" },
    ],
  },
  {
    id: "api-011",
    name: "VisionOCR",
    description: "Extract text and structured data from any image or document.",
    long_description: "VisionOCR uses multi-model ensemble for 99.2% accuracy on handwritten and printed text. Extracts tables, forms, invoices, receipts, and ID documents into structured JSON automatically.",
    creator_name: "PixelMind",
    creator_verified: true,
    category: "AI/ML",
    pricing: "usage",
    price_per_call: 10,
    free_calls_per_day: 20,
    base_url: "https://api.visionocr.io/v1",
    auth_type: "api_key",
    request_count: 1_900_000,
    rating: 4.7,
    reviews_count: 198,
    uptime_pct: 99.91,
    latency_ms: 320,
    tags: ["ocr", "vision", "documents", "extraction"],
    is_featured: false,
    is_trending: true,
    is_verified: true,
    created_at: "2024-11-12T00:00:00Z",
    version: "1.3.0",
    integrates_with: ["Finance Agent", "HR Agent"],
    endpoints: [
      { method: "POST", path: "/extract", description: "Extract text from image or PDF" },
      { method: "POST", path: "/document", description: "Extract structured data from document" },
    ],
  },
  {
    id: "api-012",
    name: "WeatherNow",
    description: "Hyper-local weather forecasts and historical climate data worldwide.",
    long_description: "WeatherNow provides current conditions, 14-day forecasts, hourly data, and 30-year historical climate records for any coordinate worldwide. Includes severe weather alerts.",
    creator_name: "AtmosData",
    creator_verified: false,
    category: "Data",
    pricing: "free",
    free_calls_per_day: 1000,
    base_url: "https://api.weathernow.io/v2",
    auth_type: "api_key",
    request_count: 45_000_000,
    rating: 4.4,
    reviews_count: 3012,
    uptime_pct: 99.75,
    latency_ms: 90,
    tags: ["weather", "climate", "forecast", "geo"],
    is_featured: false,
    is_trending: false,
    is_verified: false,
    created_at: "2023-06-01T00:00:00Z",
    version: "2.5.0",
    integrates_with: ["Research Agent", "Report Generator"],
    endpoints: [
      { method: "GET", path: "/current", description: "Current weather at a location" },
      { method: "GET", path: "/forecast", description: "14-day forecast with hourly data" },
      { method: "GET", path: "/historical", description: "Historical climate data by date range" },
    ],
  },
];

// ─── Derived collections ──────────────────────────────────────────────────────

export const FEATURED_APIS = MARKETPLACE_APIS.filter((a) => a.is_featured);
export const TRENDING_APIS = MARKETPLACE_APIS.filter((a) => a.is_trending);

export const API_CATEGORIES: ApiCategory[] = [
  "AI/ML", "Data", "Communication", "Finance", "Search",
  "Storage", "Analytics", "Security", "Productivity", "Media",
];

export const CATEGORY_ICONS: Record<ApiCategory, string> = {
  "AI/ML":        "🤖",
  "Data":         "📊",
  "Communication":"💬",
  "Finance":      "💰",
  "Search":       "🔍",
  "Storage":      "🗄️",
  "Analytics":    "📈",
  "Security":     "🛡️",
  "Productivity": "⚡",
  "Media":        "🎬",
};

export const PRICING_CONFIG: Record<ApiPricing, { label: string; color: string }> = {
  free:         { label: "Free",          color: "bg-green-500/10 text-green-600 dark:text-green-400 border-green-300/30" },
  paid:         { label: "Pay per call",  color: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-300/30" },
  subscription: { label: "Subscription",  color: "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-300/30" },
  usage:        { label: "Usage-based",   color: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-300/30" },
};

// ─── Filter function ──────────────────────────────────────────────────────────

export function applyApiFilters(apis: MarketplaceApi[], filters: ApiFilterState): MarketplaceApi[] {
  let result = [...apis];

  if (filters.search) {
    const q = filters.search.toLowerCase();
    result = result.filter((a) =>
      a.name.toLowerCase().includes(q) ||
      a.description.toLowerCase().includes(q) ||
      a.tags.some((t) => t.includes(q)) ||
      a.category.toLowerCase().includes(q)
    );
  }

  if (filters.categories.length > 0) {
    result = result.filter((a) => filters.categories.includes(a.category));
  }
  if (filters.pricing.length > 0) {
    result = result.filter((a) => filters.pricing.includes(a.pricing));
  }
  if (filters.auth_type.length > 0) {
    result = result.filter((a) => filters.auth_type.includes(a.auth_type));
  }
  if (filters.min_rating > 0) {
    result = result.filter((a) => a.rating >= filters.min_rating);
  }

  switch (filters.sort) {
    case "trending":   result.sort((a, b) => (b.is_trending ? 1 : 0) - (a.is_trending ? 1 : 0)); break;
    case "rating":     result.sort((a, b) => b.rating - a.rating); break;
    case "newest":     result.sort((a, b) => b.created_at.localeCompare(a.created_at)); break;
    case "most_used":  result.sort((a, b) => b.request_count - a.request_count); break;
    case "price_asc":  result.sort((a, b) => (a.price_per_call ?? a.monthly_price ?? 0) - (b.price_per_call ?? b.monthly_price ?? 0)); break;
  }

  return result;
}

export function formatApiPrice(api: MarketplaceApi): string {
  if (api.pricing === "free") return "Free";
  if (api.pricing === "usage" && api.price_per_call) return `$${(api.price_per_call / 100).toFixed(2)}/call`;
  if (api.pricing === "subscription" && api.monthly_price) return `$${(api.monthly_price / 100).toFixed(0)}/mo`;
  if (api.pricing === "paid" && api.price_per_call) return `$${(api.price_per_call / 100).toFixed(2)}`;
  return "Custom";
}

export function formatRequestCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}k`;
  return String(n);
}
