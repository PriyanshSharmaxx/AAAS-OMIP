"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Fires `visible = true` once the observed element enters the viewport.
 * Uses IntersectionObserver and disconnects after first trigger (fire-once).
 */
export function useScrollReveal<T extends Element = HTMLDivElement>(
  threshold = 0.12,
) {
  const ref     = useRef<T>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          io.disconnect();
        }
      },
      { threshold },
    );

    io.observe(el);
    return () => io.disconnect();
  }, [threshold]);

  return { ref, visible } as const;
}
