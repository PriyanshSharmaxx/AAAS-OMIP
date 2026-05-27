"use client";

import { use, useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * The standalone run wizard has been replaced by the AgentRunnerDialog
 * launched from the agent detail page. Redirect visitors to the detail page
 * so they can click "Run Agent" and trigger the dialog.
 */
export default function RunRedirectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  useEffect(() => {
    router.replace(`/agents/${id}`);
  }, [id, router]);

  return null;
}
