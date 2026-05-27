/**
 * src/utils/agentMapper.ts
 *
 * Maps an agent's `framework` field to its execution `type`.
 * Used at agent-creation time to stamp the correct executor path.
 */

export type AgentExecutionType =
  | "llm"
  | "rag"
  | "api"
  | "script"
  | "workflow"
  | "multi-agent";

export function frameworkToType(framework: string): AgentExecutionType {
  switch (framework) {
    case "LangChain":
    case "n8n Workflow":
      return "workflow";

    case "LlamaIndex":
      return "rag";

    case "AutoGen":
    case "CrewAI":
      return "multi-agent";

    case "Node.js Agent":
    case "Python Agent":
      return "script";

    case "Custom REST Agent":
      return "api";

    default:
      return "llm";
  }
}
