/**
 * src/adapters/rag.adapter.ts
 *
 * RAG Adapter — standardises document-augmented LLM calls.
 * Prepends context from agent.config.documents to the user input.
 */

import { runLLMAdapter } from "./llm.adapter";
import type { AgentRecord, AdapterResult } from "./types";

export async function runRAGAdapter(
  agent: AgentRecord,
  userInput: string,
): Promise<AdapterResult> {
  const documents = (agent.config.documents as string[]) || [];
  const context = documents.join("\n\n---\n\n");
  
  const augmentedInput = context 
    ? `Context:\n${context}\n\nUser Question: ${userInput}`
    : userInput;

  return runLLMAdapter(agent, augmentedInput);
}
