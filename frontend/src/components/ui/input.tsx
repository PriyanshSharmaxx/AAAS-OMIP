import * as React from "react";

import { cn } from "@/lib/utils";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          // Carved look: recessed surface, no visible border — tonal shift creates depth
          "flex h-9 w-full rounded-md px-3 py-1 text-sm transition-colors",
          "bg-[var(--ds-surface-container-lowest)] text-foreground",
          "shadow-[inset_0_1px_3px_rgba(0,0,0,0.12)] dark:shadow-[inset_0_1px_4px_rgba(0,0,0,0.4)]",
          "placeholder:text-muted-foreground",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
