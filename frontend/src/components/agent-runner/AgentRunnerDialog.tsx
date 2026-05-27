"use client";

import { useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { AlertTriangle } from "lucide-react";
import { Spinner } from "@/components/ui/spinner-1";
import { Button } from "@/components/ui/button";
import { useAgentRunner } from "@/hooks/useAgentRunner";
import { PermissionStep } from "./PermissionStep";
import { PermissionReviewStep } from "./PermissionReviewStep";
import { UserTypeStep } from "./UserTypeStep";
import { ApiConfigStep } from "./ApiConfigStep";
import { ValidationStep } from "./ValidationStep";
import { ExecutionStep } from "./ExecutionStep";
import { ResultStep } from "./ResultStep";
import type { Agent } from "@/lib/types";
import type { ApiConfigMode } from "@/hooks/useAgentRunner";

// ── Step metadata ──────────────────────────────────────────────────────────

const STEPS = [
  { id: "permissions",        label: "Permissions" },
  { id: "permission_review",  label: "Review" },
  { id: "user_type",          label: "User Type" },
  { id: "api_config",         label: "Exec Setup" },
  { id: "validation",         label: "Validate" },
  { id: "execution",          label: "Execute" },
  { id: "result",             label: "Result" },
] as const;

const STEP_INDEX: Record<string, number> = Object.fromEntries(
  STEPS.map((s, i) => [s.id, i])
);

// ── Step progress bar ──────────────────────────────────────────────────────

function StepProgress({ currentStep }: { currentStep: string }) {
  const current = STEP_INDEX[currentStep] ?? 0;
  return (
    <div className="flex items-center gap-1 px-1 pb-2">
      {STEPS.map((step, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <div key={step.id} className="flex flex-1 flex-col items-center gap-1">
            <div
              className={`h-1.5 w-full rounded-full transition-colors ${
                done
                  ? "bg-primary"
                  : active
                  ? "bg-primary/60"
                  : "bg-muted"
              }`}
            />
            <span
              className={`text-[10px] leading-none ${
                active
                  ? "font-semibold text-primary"
                  : done
                  ? "text-primary/70"
                  : "text-muted-foreground"
              }`}
            >
              {step.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── Main dialog ────────────────────────────────────────────────────────────

interface AgentRunnerDialogProps {
  agent: Agent;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AgentRunnerDialog({ agent, open, onOpenChange }: AgentRunnerDialogProps) {
  const [state, actions] = useAgentRunner();

  const {
    step,
    integrations,
    grants,
    permissionsError,
    permissionsSaving,
    permissionValidating,
    permissionValidation,
    auditLog,
    userTypeSaving,
    apiConfigSaving,
    apiConfigError,
    generatedApiEndpoint,
    validation,
    validating,
    executing,
    executionLogs,
    result,
    initError,
  } = state;

  // Initialise the runner when dialog opens
  useEffect(() => {
    if (open) {
      void actions.initialise(agent);
    } else {
      actions.reset();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleClose = () => {
    onOpenChange(false);
  };

  // ── Step titles ──
  const TITLES: Record<string, { title: string; description: string }> = {
    init:               { title: "Starting Runner…",        description: "Setting up your session." },
    permissions:        { title: "Permissions",              description: `Grant or deny access for ${agent.name}.` },
    permission_review:  { title: "Review & Confirm",         description: "Confirm your permission choices before running." },
    user_type:          { title: "Your Experience Level",   description: "This helps us tailor the setup." },
    api_config:         { title: "Execution Setup",           description: "Choose Quick Run or configure an external API." },
    validation:         { title: "Validation",               description: "Verifying agent configuration." },
    execution:          { title: "Running Agent",            description: `${agent.name} is executing.` },
    result:             { title: "Execution Result",         description: `Run completed for ${agent.name}.` },
  };

  const meta = TITLES[step] ?? TITLES.init;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-2">
          <DialogTitle>{meta.title}</DialogTitle>
          <DialogDescription>{meta.description}</DialogDescription>
        </DialogHeader>

        {/* Progress bar — hidden on init/result */}
        {step !== "init" && step !== "result" && (
          <StepProgress currentStep={step} />
        )}

        {/* ── Init / loading ── */}
        {step === "init" && !initError && (
          <div className="flex flex-col items-center justify-center gap-4 py-12">
            <Spinner size={36} color="hsl(var(--primary))" />
            <p className="text-sm text-muted-foreground">Preparing agent session…</p>
          </div>
        )}

        {/* ── Init error ── */}
        {step === "init" && initError && (
          <div className="space-y-4 py-4">
            <div className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
              <div>
                <p className="font-semibold text-sm">Initialization failed</p>
                <p className="mt-1 text-sm text-muted-foreground">{initError}</p>
              </div>
            </div>
            <Button variant="outline" className="w-full" onClick={handleClose}>
              Close
            </Button>
          </div>
        )}

        {/* ── Step: permissions ── */}
        {step === "permissions" && (
          <PermissionStep
            integrations={integrations}
            grants={grants}
            error={permissionsError}
            saving={permissionsSaving}
            onGrant={actions.setGrant}
            onScope={actions.setScope}
            onConnect={actions.connectIntegration}
            onSubmit={actions.savePermissions}
          />
        )}

        {/* ── Step: permission_review ── */}
        {step === "permission_review" && (
          <PermissionReviewStep
            integrations={integrations}
            grants={grants}
            auditLog={auditLog}
            validating={permissionValidating}
            validation={permissionValidation}
            onConfirm={actions.confirmPermissions}
            onBack={() => actions.retry()}
          />
        )}

        {/* ── Step: user_type ── */}
        {step === "user_type" && (
          <UserTypeStep
            saving={userTypeSaving}
            onSelect={actions.selectUserType}
          />
        )}

        {/* ── Step: api_config (now "Execution Setup") ── */}
        {step === "api_config" && (
          <ApiConfigStep
            userType={state.userType}
            saving={apiConfigSaving}
            error={apiConfigError}
            onSubmit={(config: ApiConfigMode) => actions.submitApiConfig(config)}
            agentTools={Array.isArray(agent.tools) ? agent.tools : []}
            estimatedCost={state.estimatedCost}
            userCredits={state.userCredits}
          />
        )}

        {/* ── Step: validation ── */}
        {step === "validation" && (
          <ValidationStep
            validation={validation}
            validating={validating}
            generatedApiEndpoint={generatedApiEndpoint}
            onProceed={actions.proceedToExecution}
            onBack={() => {
              // Re-open api_config by retrying from that step
              actions.retry();
              // advance past permissions straight to api_config
              // retry resets to permissions step — user will re-enter
              // For a better UX we could expose a direct step setter,
              // but since retry is the provided action we use it.
            }}
          />
        )}

        {/* ── Step: execution ── */}
        {step === "execution" && (
          <ExecutionStep
            executing={executing}
            logs={executionLogs}
          />
        )}

        {/* ── Step: result ── */}
        {step === "result" && (
          <ResultStep
            result={result}
            agentName={agent.name}
            onRetry={actions.retry}
            onClose={handleClose}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
