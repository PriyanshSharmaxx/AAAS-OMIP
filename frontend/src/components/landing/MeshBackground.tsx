"use client";

/**
 * MeshBackground — theme-aware animated mesh background.
 *
 * Blob opacities driven by CSS custom properties:
 *   Light: --mesh-op-1 = 0.06, --mesh-op-2 = 0.04, --mesh-op-3 = 0.03
 *   Dark:  --mesh-op-1 = 0.18, --mesh-op-2 = 0.14, --mesh-op-3 = 0.10
 *
 * The base div supplies the page floor colour for the landing section.
 */
export function MeshBackground() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
    >
      {/* Page floor — light: clean off-white, dark: near-black */}
      <div className="absolute inset-0 bg-[#FAFAFA] dark:bg-[#0A0A0A] transition-colors duration-300" />

      {/* Blob 1 — top-left, electric blue */}
      <div
        className="absolute -left-1/4 -top-1/4 h-[900px] w-[900px] rounded-full animate-mesh-drift"
        style={{
          background:
            "radial-gradient(circle at 40% 40%, rgba(0,122,255,0.55) 0%, transparent 65%)",
          opacity: "var(--mesh-op-1, 0.06)",
        }}
      />

      {/* Blob 2 — top-right, indigo/violet */}
      <div
        className="absolute -right-1/4 top-1/4 h-[700px] w-[700px] rounded-full animate-mesh-drift"
        style={{
          background:
            "radial-gradient(circle at 60% 50%, rgba(120,80,255,0.6) 0%, transparent 65%)",
          opacity: "var(--mesh-op-2, 0.04)",
          animationDirection: "reverse",
          animationDuration: "32s",
        }}
      />

      {/* Blob 3 — bottom-center, cyan */}
      <div
        className="absolute -bottom-1/4 left-1/3 h-[750px] w-[750px] rounded-full animate-mesh-drift"
        style={{
          background:
            "radial-gradient(circle at 50% 60%, rgba(0,200,255,0.45) 0%, transparent 65%)",
          opacity: "var(--mesh-op-3, 0.03)",
          animationDelay: "8s",
          animationDuration: "20s",
        }}
      />

      {/* Dot grid — more visible in dark, barely there in light */}
      <div
        className="absolute inset-0 opacity-[0.035] dark:opacity-[0.04] transition-opacity duration-300"
        style={{
          backgroundImage:
            "radial-gradient(circle, currentColor 1px, transparent 1px)",
          backgroundSize: "48px 48px",
          color: "rgba(100,100,100,1)",
        }}
      />

      {/* Vignette — subtler in light mode */}
      <div
        className="absolute inset-0 opacity-30 dark:opacity-60 transition-opacity duration-300"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% 40%, transparent 40%, rgba(0,0,0,0.45) 100%)",
        }}
      />
    </div>
  );
}
