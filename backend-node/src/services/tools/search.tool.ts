/**
 * src/services/tools/search.tool.ts
 *
 * Search tools — web search and citation generation.
 *
 * In real deployment: swap handler bodies for real search API calls
 * (SerpAPI / Tavily / Brave Search).
 *
 * Supports:
 *   web_search   — search the web for current information
 *   cite_source  — generate formatted citations for URLs
 */

import { RegisteredTool, ToolResult } from "./types";
import { logger } from "../../lib/logger";

// ---------------------------------------------------------------------------
// web_search
// ---------------------------------------------------------------------------

export const webSearch: RegisteredTool = {
  name:        "web_search",
  category:    "search",
  description: "Search the web for current information",
  version:     "2.0.0",
  requiresConfig: false,
  rateLimit:   { maxPerMinute: 10 },
  definition: {
    name: "web_search",
    description: "Search the web for up-to-date information on any topic. Returns titles, URLs, and snippets.",
    parameters: {
      type: "object",
      properties: {
        query:       { type: "string", description: "The search query" },
        num_results: { type: "string", description: "Number of results to return (1-10)" },
        language:    { type: "string", description: "Language code e.g. 'en', 'es', 'fr'" },
        date_range:  { type: "string", description: "Filter results by date", enum: ["any", "past_day", "past_week", "past_month", "past_year"] },
        site:        { type: "string", description: "Restrict results to a specific domain e.g. 'reddit.com'" },
      },
      required: ["query"],
    },
  },
  handler: async (args, _config, context): Promise<ToolResult> => {
    const query      = args["query"] as string;
    const numResults = Math.min(parseInt(args["num_results"] as string || "5", 10), 10);
    const language   = (args["language"] as string) ?? "en";

    logger.info("web_search called", { query, numResults, userId: context?.userId });

    // In production: call SerpAPI / Tavily / Brave Search
    // const res = await fetch(`https://api.tavily.com/search`, {
    //   method: "POST",
    //   headers: { "Content-Type": "application/json", "X-API-Key": config.apiKey },
    //   body: JSON.stringify({ query, num_results: numResults })
    // });
    // const data = await res.json();

    const mockResults = Array.from({ length: Math.min(numResults, 5) }, (_, i) => ({
      title:    i === 0
        ? `${query} — Comprehensive Guide`
        : i === 1
          ? `Latest news: ${query}`
          : `${query}: Wikipedia`,
      url:      `https://example${i + 1}.com/${query.toLowerCase().replace(/\s+/g, "-")}`,
      snippet:  `This is a mock search result ${i + 1} for the query "${query}". In production this would contain real web content from the search API.`,
      date:     new Date(Date.now() - i * 86_400_000).toISOString(),
      source:   i === 0 ? "example.com" : i === 1 ? "news.com" : "wikipedia.org",
    }));

    return {
      success: true,
      data: {
        query,
        language,
        date_range: (args["date_range"] as string) ?? "any",
        results:    mockResults,
        total:      mockResults.length,
        mock:       true,
      },
      meta: { source: "web_search_mock", latencyMs: 250 },
    };
  },
};

// ---------------------------------------------------------------------------
// cite_source
// ---------------------------------------------------------------------------

type CitationStyle = "apa" | "mla" | "chicago";

function formatCitation(style: CitationStyle, url: string, title: string, author: string, date: string): string {
  switch (style) {
    case "apa":
      return `${author}. (${date}). ${title}. Retrieved from ${url}`;
    case "mla":
      return `${author}. "${title}." Web, ${date}. <${url}>.`;
    case "chicago":
      return `${author}. "${title}." Accessed ${date}. ${url}.`;
    default:
      return `${author}. ${title}. ${date}. ${url}`;
  }
}

export const citeSource: RegisteredTool = {
  name:        "cite_source",
  category:    "utility",
  description: "Generate a formatted citation for a URL",
  version:     "1.0.0",
  requiresConfig: false,
  definition: {
    name: "cite_source",
    description: "Generate a properly formatted academic citation (APA, MLA, or Chicago) for a given URL.",
    parameters: {
      type: "object",
      properties: {
        url:    { type: "string", description: "The URL to cite" },
        style:  { type: "string", description: "Citation style", enum: ["apa", "mla", "chicago"] },
        title:  { type: "string", description: "Page title (override auto-detected title)" },
        author: { type: "string", description: "Author name (e.g. 'Smith, J.')" },
        year:   { type: "string", description: "Publication year (override current year)" },
      },
      required: ["url"],
    },
  },
  handler: async (args): Promise<ToolResult> => {
    const url    = args["url"] as string;
    const style  = ((args["style"] as string) ?? "apa") as CitationStyle;
    const title  = (args["title"] as string) ?? `Content at ${url}`;
    const author = (args["author"] as string) ?? "Unknown Author";
    const date   = (args["year"] as string) ?? new Date().getFullYear().toString();

    const citation = formatCitation(style, url, title, author, date);

    return {
      success: true,
      data: {
        citation,
        style,
        url,
        title,
        author,
        date,
      },
      meta: { source: url, latencyMs: 2 },
    };
  },
};
