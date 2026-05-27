import { describe, expect, it } from "vitest";
import { frameworkToType } from "../../src/utils/agentMapper";

describe("frameworkToType", () => {
  it("maps known orchestration frameworks to multi-agent", () => {
    expect(frameworkToType("CrewAI")).toBe("multi-agent");
    expect(frameworkToType("AutoGen")).toBe("multi-agent");
  });

  it("maps workflow frameworks correctly", () => {
    expect(frameworkToType("n8n Workflow")).toBe("workflow");
    expect(frameworkToType("Custom REST Agent")).toBe("api");
  });

  it("falls back to llm for unknown frameworks", () => {
    expect(frameworkToType("custom-framework")).toBe("llm");
  });
});
