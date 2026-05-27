/**
 * src/adapters/types.ts
 *
 * Shared contract for all framework adapters.
 * Every adapter takes AgentRecord + raw user input and returns AdapterResult.
 * The adapter index normalises this into the AgentRunResult used by execution.service.
 */

export interface AgentRecord {
  id:        string;
  name:      string;
  framework: string;
  type:      string;
  model:     string;
  prompt:    string;
  /** Arbitrary JSON config stored on the agent row */
  config: {
    systemPrompt?: string;
    /** n8n: webhook URL to POST the input to */
    webhookUrl?:   string;
    /** LangChain-style: prompt template with {input} placeholder */
    promptTemplate?: string;
    /** Python microservice: code string to execute */
    code?:         string;
    /** Multi-agent: sequential step definitions */
    steps?:        Array<{ prompt: string; model?: string }>;
    /** RAG: document strings to prepend as context */
    documents?:    string[];
    /** API agent: upstream URL + method + headers */
    url?:          string;
    method?:       string;
    headers?:      Record<string, string>;
    [key: string]: unknown;
  };
  tools: Array<{ name: string; enabled: boolean; config?: Record<string, unknown> }>;
}

export interface AdapterResult {
  output:    string;
  success:   boolean;
  error?:    string;
  latencyMs: number;
  /** Framework-specific metadata (step traces, status codes, etc.) */
  metadata?: Record<string, unknown>;
}

/** Every adapter must implement this signature */
export type FrameworkAdapter = (
  agent: AgentRecord,
  userInput: string,
) => Promise<AdapterResult>;
