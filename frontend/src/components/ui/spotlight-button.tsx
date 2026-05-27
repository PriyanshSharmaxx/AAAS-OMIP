"use client";

import React, { useRef, useCallback } from "react";
import { cn } from "@/lib/utils";

interface SpotlightButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual style. Defaults to "default" (primary filled). */
  variant?: "default" | "outline" | "ghost";
  /** Size preset. Defaults to "default". */
  size?: "sm" | "default" | "lg";
}

/**
 * SpotlightButton
 *
 * A premium CTA button with a mouse-tracking radial spotlight effect.
 * The glow follows the cursor position inside the button.
 *
 * Use for:
 *   • Hero / landing page CTAs
 *   • "Get Started" / "Run Agent" high-value actions
 *
 * For regular buttons use <Button> from ./button.tsx — it already
 * has a subtle static spotlight via CSS ::before.
 */
export function SpotlightButton({
  className,
  variant = "default",
  size = "default",
  children,
  onMouseMove,
  onMouseEnter,
  onMouseLeave,
  ...props
}: SpotlightButtonProps) {
  const btnRef  = useRef<HTMLButtonElement>(null);
  const glowRef = useRef<HTMLSpanElement>(null);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      onMouseMove?.(e);
      const btn  = btnRef.current;
      const glow = glowRef.current;
      if (!btn || !glow) return;
      const rect = btn.getBoundingClientRect();
      glow.style.left = `${e.clientX - rect.left}px`;
      glow.style.top  = `${e.clientY - rect.top}px`;
    },
    [onMouseMove]
  );

  const handleMouseEnter = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      onMouseEnter?.(e);
      if (glowRef.current) glowRef.current.style.opacity = "1";
    },
    [onMouseEnter]
  );

  const handleMouseLeave = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      onMouseLeave?.(e);
      if (glowRef.current) glowRef.current.style.opacity = "0";
    },
    [onMouseLeave]
  );

  const sizeClasses = {
    sm:      "h-8 px-3 text-xs rounded-md gap-1.5",
    default: "h-9 px-4 py-2 text-sm rounded-md gap-2",
    lg:      "h-11 px-8 text-base rounded-lg gap-2",
  }[size];

  // CSS custom property sets the glow colour per variant + theme
  const variantClasses = {
    default:
      "bg-primary text-primary-foreground shadow hover:bg-primary/90 " +
      "[--sb-glow:rgba(255,255,255,0.28)] dark:[--sb-glow:rgba(255,255,255,0.32)]",
    outline:
      "border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground " +
      "[--sb-glow:hsl(var(--primary)/0.18)] dark:[--sb-glow:rgba(255,255,255,0.14)]",
    ghost:
      "hover:bg-accent hover:text-accent-foreground " +
      "[--sb-glow:hsl(var(--primary)/0.14)] dark:[--sb-glow:rgba(255,255,255,0.10)]",
  }[variant];

  return (
    <button
      ref={btnRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={cn(
        "relative inline-flex items-center justify-center overflow-hidden whitespace-nowrap font-medium",
        "transition-colors duration-200",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
        "disabled:pointer-events-none disabled:opacity-50",
        "[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
        sizeClasses,
        variantClasses,
        className
      )}
      {...props}
    >
      {/* Mouse-tracking radial glow */}
      <span
        ref={glowRef}
        aria-hidden
        style={{
          opacity: 0,
          transition: "opacity 0.25s ease",
          background: "radial-gradient(closest-side, var(--sb-glow, rgba(255,255,255,0.25)), transparent)",
        }}
        className="pointer-events-none absolute h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full"
      />

      {/* Content above the glow */}
      <span className="relative z-10 inline-flex items-center gap-[inherit]">
        {children}
      </span>
    </button>
  );
}
