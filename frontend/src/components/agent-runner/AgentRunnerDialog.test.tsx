import { createElement } from "react";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockInitialise = vi.fn();
const mockReset = vi.fn();

const baseState = {
  step: "permissions",
  integrations: [],
  grants: {},
  permissionsError: null,
  permissionsSaving: false,
  permissionValidating: false,
  permissionValidation: null,
  auditLog: [],
  userTypeSaving: false,
  apiConfigSaving: false,
  apiConfigError: null,
  generatedApiEndpoint: null,
  validation: null,
  validating: false,
  executing: false,
  executionLogs: [],
  result: null,
  initError: null,
  userType: "non-technical",
  estimatedCost: null,
  userCredits: 0,
};

const mockUseAgentRunner = vi.fn(() => [
  baseState,
  {
    initialise: mockInitialise,
    reset: mockReset,
    setGrant: vi.fn(),
    setScope: vi.fn(),
    connectIntegration: vi.fn(),
    savePermissions: vi.fn(),
    confirmPermissions: vi.fn(),
    retry: vi.fn(),
    selectUserType: vi.fn(),
    submitApiConfig: vi.fn(),
    proceedToExecution: vi.fn(),
  },
]);

vi.mock("@/hooks/useAgentRunner", () => ({
  useAgentRunner: () => mockUseAgentRunner(),
}));

import { AgentRunnerDialog } from "./AgentRunnerDialog";

const agent = {
  id: "agent-1",
  name: "Runner Agent",
  tools: [],
} as any;

describe("AgentRunnerDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows the permissions step for a fresh run", () => {
    render(createElement(AgentRunnerDialog, { agent, open: true, onOpenChange: () => undefined }));
    expect(screen.getByText(/grant or deny access/i)).toBeInTheDocument();
    expect(mockInitialise).toHaveBeenCalledWith(agent);
  });

  it("shows initialization error state", () => {
    mockUseAgentRunner.mockReturnValueOnce([
      { ...baseState, step: "init", initError: "Runner failed to initialize." },
      { initialise: mockInitialise, reset: mockReset },
    ]);

    render(createElement(AgentRunnerDialog, { agent, open: true, onOpenChange: () => undefined }));
    expect(screen.getByText(/initialization failed/i)).toBeInTheDocument();
    expect(screen.getByText(/runner failed to initialize/i)).toBeInTheDocument();
  });
});
