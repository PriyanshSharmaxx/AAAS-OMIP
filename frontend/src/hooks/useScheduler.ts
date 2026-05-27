"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import {
  Schedule, ScheduleRun, ScheduleStatus,
  MOCK_SCHEDULES, MOCK_SCHEDULE_RUNS,
  buildCronExpression, computeNextRun,
} from "@/lib/schedule-data";

// Simulated backend delay
function delay(ms: number) {
  return new Promise<void>((res) => setTimeout(res, ms));
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CreateSchedulePayload {
  agent_id: string;
  agent_name: string;
  name: string;
  type: Schedule["type"];
  time: string;
  day?: Schedule["day"];
  day_of_month?: number;
  webhook_url?: string;
  webhook_secret?: string;
  event_source?: string;
  input_data: Record<string, string>;
  output_actions: Schedule["output_actions"];
  max_retries: number;
}

export type ScheduleFilter = "all" | "active" | "paused" | "failed";

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useScheduler() {
  const [schedules, setSchedules]     = useState<Schedule[]>(MOCK_SCHEDULES);
  const [runs, setRuns]               = useState<ScheduleRun[]>(MOCK_SCHEDULE_RUNS);
  const [filter, setFilter]           = useState<ScheduleFilter>("all");
  const [saving, setSaving]           = useState(false);
  const [triggering, setTriggering]   = useState<string | null>(null);

  // Simulated heartbeat — updates "next_run" countdowns every 60s
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    tickRef.current = setInterval(() => {
      setSchedules((prev) =>
        prev.map((s) => ({
          ...s,
          next_run:
            s.status === "active" && s.next_run
              ? computeNextRun(s.cron_expression, s.type)
              : s.next_run,
        })),
      );
    }, 60_000);
    return () => { if (tickRef.current) clearInterval(tickRef.current); };
  }, []);

  // -- Derived ---------------------------------------------------------------

  const filtered = filter === "all"
    ? schedules
    : schedules.filter((s) => s.status === filter);

  const stats = {
    total:   schedules.length,
    active:  schedules.filter((s) => s.status === "active").length,
    paused:  schedules.filter((s) => s.status === "paused").length,
    failed:  schedules.filter((s) => s.status === "failed").length,
  };

  // -- Actions ---------------------------------------------------------------

  const createSchedule = useCallback(async (payload: CreateSchedulePayload): Promise<Schedule> => {
    setSaving(true);
    await delay(800); // simulate POST /api/schedule/create

    const cron = buildCronExpression(payload.type, payload.time, payload.day, payload.day_of_month);
    const nextRun = computeNextRun(cron, payload.type);

    const newSchedule: Schedule = {
      id: `sch-${Date.now()}`,
      user_id: "u1",
      agent_id: payload.agent_id,
      agent_name: payload.agent_name,
      name: payload.name,
      type: payload.type,
      cron_expression: cron,
      time: payload.time,
      day: payload.day,
      day_of_month: payload.day_of_month,
      webhook_url: payload.webhook_url,
      webhook_secret: payload.webhook_secret,
      event_source: payload.event_source,
      input_data: payload.input_data,
      output_actions: payload.output_actions,
      retry_count: 0,
      max_retries: payload.max_retries,
      status: "active",
      next_run: nextRun === "On trigger" ? undefined : nextRun,
      total_runs: 0,
      total_successes: 0,
      total_failures: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    setSchedules((prev) => [newSchedule, ...prev]);
    setSaving(false);
    return newSchedule;
  }, []);

  const updateSchedule = useCallback(async (id: string, updates: Partial<CreateSchedulePayload>): Promise<void> => {
    setSaving(true);
    await delay(600);

    setSchedules((prev) =>
      prev.map((s) => {
        if (s.id !== id) return s;
        const type = updates.type ?? s.type;
        const time = updates.time ?? s.time;
        const day  = updates.day  ?? s.day;
        const dom  = updates.day_of_month ?? s.day_of_month;
        const cron = buildCronExpression(type, time, day, dom);
        return {
          ...s,
          ...updates,
          cron_expression: cron,
          next_run: computeNextRun(cron, type),
          updated_at: new Date().toISOString(),
        };
      }),
    );
    setSaving(false);
  }, []);

  const pauseSchedule = useCallback(async (id: string): Promise<void> => {
    await delay(300);
    setSchedules((prev) =>
      prev.map((s) =>
        s.id === id ? { ...s, status: "paused" as ScheduleStatus, updated_at: new Date().toISOString() } : s,
      ),
    );
  }, []);

  const resumeSchedule = useCallback(async (id: string): Promise<void> => {
    await delay(300);
    setSchedules((prev) =>
      prev.map((s) => {
        if (s.id !== id) return s;
        return {
          ...s,
          status: "active" as ScheduleStatus,
          next_run: computeNextRun(s.cron_expression, s.type),
          updated_at: new Date().toISOString(),
        };
      }),
    );
  }, []);

  const deleteSchedule = useCallback(async (id: string): Promise<void> => {
    await delay(400);
    setSchedules((prev) => prev.filter((s) => s.id !== id));
    setRuns((prev) => prev.filter((r) => r.schedule_id !== id));
  }, []);

  // Manual trigger — simulates POST /api/schedule/trigger
  const triggerSchedule = useCallback(async (id: string): Promise<void> => {
    setTriggering(id);
    await delay(1200);

    const schedule = schedules.find((s) => s.id === id);
    if (!schedule) { setTriggering(null); return; }

    const success = Math.random() > 0.15; // 85% mock success rate
    const durationMs = 3000 + Math.random() * 12_000;
    const now = new Date().toISOString();

    const newRun: ScheduleRun = {
      id: `run-${Date.now()}`,
      schedule_id: id,
      agent_id: schedule.agent_id,
      started_at: now,
      completed_at: new Date(Date.now() + durationMs).toISOString(),
      status: success ? "success" : "failed",
      duration_ms: durationMs,
      retry_attempt: 0,
      output_summary: success
        ? `Manual trigger completed successfully in ${(durationMs / 1000).toFixed(1)}s.`
        : undefined,
      error_message: success ? undefined : "Agent execution timed out after 30s.",
      logs: [
        { timestamp: now, level: "info",    message: "Manual trigger initiated" },
        { timestamp: now, level: "info",    message: "Job queued in worker pool" },
        { timestamp: now, level: success ? "success" : "error",
          message: success ? "Job completed successfully" : "Job failed — max retries reached" },
      ],
    };

    setRuns((prev) => [newRun, ...prev]);
    setSchedules((prev) =>
      prev.map((s) =>
        s.id === id
          ? {
              ...s,
              last_run: now,
              last_run_status: success ? "success" : "failed",
              last_run_duration_ms: durationMs,
              total_runs: s.total_runs + 1,
              total_successes: success ? s.total_successes + 1 : s.total_successes,
              total_failures:  success ? s.total_failures  : s.total_failures + 1,
              status: !success && s.retry_count >= s.max_retries - 1 ? "failed" : s.status,
            }
          : s,
      ),
    );

    setTriggering(null);
  }, [schedules]);

  const getRunsForSchedule = useCallback(
    (scheduleId: string) => runs.filter((r) => r.schedule_id === scheduleId),
    [runs],
  );

  return {
    schedules,
    filtered,
    filter,
    setFilter,
    stats,
    saving,
    triggering,
    createSchedule,
    updateSchedule,
    pauseSchedule,
    resumeSchedule,
    deleteSchedule,
    triggerSchedule,
    getRunsForSchedule,
  };
}
