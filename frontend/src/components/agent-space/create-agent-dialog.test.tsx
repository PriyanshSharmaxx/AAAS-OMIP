import { createElement } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockMutateAsync = vi.fn();

vi.mock("@/lib/api", () => ({
  api: {
    get: vi.fn(async () => ({ data: { data: [] } })),
  },
}));

vi.mock("@/lib/queries", () => ({
  useCreateDraft: () => ({
    mutateAsync: mockMutateAsync,
    isPending: false,
  }),
}));

import { CreateAgentDialog } from "./create-agent-dialog";

describe("CreateAgentDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("keeps next disabled until a framework is selected", () => {
    render(createElement(CreateAgentDialog, { open: true, onOpenChange: () => undefined, onCreated: () => undefined }));
    expect(screen.getByRole("button", { name: /next/i })).toBeDisabled();
  });

  it("submits the selected framework and name", async () => {
    mockMutateAsync.mockResolvedValue({ id: "agent-1" });
    const user = userEvent.setup();

    render(createElement(CreateAgentDialog, { open: true, onOpenChange: () => undefined, onCreated: () => undefined }));

    await user.click(screen.getByRole("button", { name: /python/i }));
    await user.click(screen.getByRole("button", { name: /next/i }));
    await user.type(screen.getByLabelText(/agent name/i), "Billing Copilot");
    await user.click(screen.getByRole("button", { name: /create & open builder/i }));

    expect(mockMutateAsync).toHaveBeenCalledWith(expect.objectContaining({
      name: "Billing Copilot",
      framework: "python",
    }));
  });
});
