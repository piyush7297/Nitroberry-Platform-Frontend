"use client";
import * as React from "react";
import { cn } from "@/lib/utils";
import { Eye, EyeOff } from "lucide-react";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  const [showPassword, setShowPassword] = React.useState(false);
  const isPassword = type === "password";

  const togglePassword = () => setShowPassword((prev) => !prev);

  return (
    <div className="relative w-full">
      <input
        type={isPassword ? (showPassword ? "text" : "password") : type}
        data-slot="input"
        max={
          type === "date"
            ? "9999-12-31"
            : type === "datetime-local"
              ? "9999-12-31T23:59"
              : undefined
        }
        className={cn(
          "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input h-11 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
          "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
          className,
        )}
        {...props}
      />
      {isPassword && (
        <button
          type="button"
          onClick={togglePassword}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
        >
          {showPassword ? (
            <EyeOff className="h-5 w-5" />
          ) : (
            <Eye className="h-5 w-5" />
          )}
        </button>
      )}
    </div>
  );
}

export { Input };
