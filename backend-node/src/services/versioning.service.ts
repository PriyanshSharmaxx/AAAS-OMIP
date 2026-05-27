/**
 * src/services/versioning.service.ts
 *
 * Agent Versioning — snapshot an agent's config on demand and roll back.
 *
 * Flow:
 *   POST /versions           → save current agent state as the next version number
 *   GET  /versions           → list all saved versions (metadata only)
 *   GET  /versions/:vid      → full snapshot detail
 *   POST /versions/:vid/rollback → overwrite agent with snapshot, optionally save current first
 */

import { z } from "zod";
import { agentRepo, agentVersionRepo } from "../lib/db";
import { AppError } from "../middleware/errorHandler";
import { logger } from "../lib/logger";

// ---------------------------------------------------------------------------
// Validation schemas
// ---------------------------------------------------------------------------

export const SaveVersionSchema = z.object({
  changelog: z.string().max(500).trim().optional(),
});

export const RollbackSchema = z.object({
  // If true, saves the current agent state as a new version before overwriting
  saveCurrentFirst: z.boolean().default(true),
  changelog:        z.string().max(500).trim().optional(),
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function assertOwner(agentId: string, userId: string) {
  const agent = await agentRepo.findById(agentId);
  if (!agent) throw new AppError("Agent not found.", 404, "AGENT_NOT_FOUND");
  if (agent.userId !== userId) throw new AppError("Access denied.", 403, "FORBIDDEN");
  return agent;
}

// ---------------------------------------------------------------------------
// versioningService
// ---------------------------------------------------------------------------

export const versioningService = {

  // ── saveVersion ────────────────────────────────────────────────────────────

  async saveVersion(
    agentId:   string,
    userId:    string,
    input:     z.infer<typeof SaveVersionSchema>,
  ) {
    const agent = await assertOwner(agentId, userId);

    const nextNumber = (await agentVersionRepo.findLatestNumber(agentId)) + 1;

    const version = await agentVersionRepo.create({
      agent:         { connect: { id: agentId } },
      creator:       { connect: { id: userId } },
      versionNumber: nextNumber,
      name:          agent.name,
      description:   agent.description,
      prompt:        agent.prompt,
      model:         agent.model,
      config:        agent.config as object,
      tools:         agent.tools as object,
      ...(input.changelog ? { changelog: input.changelog } : {}),
    });

    logger.info("Agent version saved", { agentId, versionId: version.id, versionNumber: nextNumber, userId });
    return version;
  },

  // ── listVersions ───────────────────────────────────────────────────────────

  async listVersions(agentId: string, userId: string) {
    await assertOwner(agentId, userId);
    return agentVersionRepo.findByAgent(agentId);
  },

  // ── getVersion ─────────────────────────────────────────────────────────────

  async getVersion(agentId: string, versionId: string, userId: string) {
    await assertOwner(agentId, userId);

    const version = await agentVersionRepo.findById(versionId);
    if (!version || version.agentId !== agentId) {
      throw new AppError("Version not found.", 404, "VERSION_NOT_FOUND");
    }
    return version;
  },

  // ── rollback ───────────────────────────────────────────────────────────────

  async rollback(
    agentId:   string,
    versionId: string,
    userId:    string,
    input:     z.infer<typeof RollbackSchema>,
  ) {
    const agent = await assertOwner(agentId, userId);

    const version = await agentVersionRepo.findById(versionId);
    if (!version || version.agentId !== agentId) {
      throw new AppError("Version not found.", 404, "VERSION_NOT_FOUND");
    }

    // Optionally snapshot the current state before overwriting
    if (input.saveCurrentFirst) {
      const nextNumber = (await agentVersionRepo.findLatestNumber(agentId)) + 1;
      await agentVersionRepo.create({
        agent:         { connect: { id: agentId } },
        creator:       { connect: { id: userId } },
        versionNumber: nextNumber,
        name:          agent.name,
        description:   agent.description,
        prompt:        agent.prompt,
        model:         agent.model,
        config:        agent.config as object,
        tools:         agent.tools as object,
        changelog:     input.changelog ?? `Auto-saved before rollback to v${version.versionNumber}`,
      });
    }

    // Overwrite agent with snapshot
    const updated = await agentRepo.update(agentId, {
      name:        version.name,
      description: version.description,
      prompt:      version.prompt,
      model:       version.model,
      config:      version.config as object,
      tools:       version.tools as object,
    });

    logger.info("Agent rolled back", {
      agentId,
      versionId,
      versionNumber: version.versionNumber,
      userId,
      savedCurrentFirst: input.saveCurrentFirst,
    });

    return {
      agent:           updated,
      restoredVersion: version.versionNumber,
    };
  },

  // ── deleteVersion ──────────────────────────────────────────────────────────

  async deleteVersion(agentId: string, versionId: string, userId: string) {
    await assertOwner(agentId, userId);

    const version = await agentVersionRepo.findById(versionId);
    if (!version || version.agentId !== agentId) {
      throw new AppError("Version not found.", 404, "VERSION_NOT_FOUND");
    }

    await agentVersionRepo.delete(versionId);
    logger.info("Agent version deleted", { agentId, versionId, userId });
  },
};
