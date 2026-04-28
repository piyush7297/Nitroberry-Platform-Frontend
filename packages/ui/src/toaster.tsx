"use client";

import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "./toast";
import { useToast } from "./use-toast";
import { CheckCircle2, XCircle } from "lucide-react";

export function Toaster() {
  const { toasts } = useToast();

  return (
    <ToastProvider>
      {toasts.map(function ({
        id,
        title,
        description,
        action,
        variant,
        ...props
      }) {
        const isSuccess = variant === "default";
        const isError = variant === "destructive";

        return (
          <Toast
            key={id}
            {...props}
            className={`flex items-center justify-between w-full max-w-sm p-3 rounded-lg border shadow-sm ${
              isSuccess
                ? "bg-green-50 border-green-300 text-green-800"
                : isError
                  ? "bg-red-50 border-red-300 text-red-800"
                  : "bg-gray-50 border-gray-300 text-gray-800"
            }`}
          >
            {/* Left icon + text */}
            <div className="flex items-center gap-3">
              {isSuccess && <CheckCircle2 className="h-8 w-8 shrink-0 text-green-600" />}
              {isError && <XCircle className="h-8 w-8 shrink-0 text-red-600" />}

              <div className="grid gap-1">
                {title ? <ToastTitle>{title}</ToastTitle> : null}
                {description && (
                  <ToastDescription>{description}</ToastDescription>
                )}
              </div>
            </div>

            {/* Action + Close */}
            <div className="flex items-center gap-2">
              {action}
              <ToastClose className="text-current self-center opacity-100" />
            </div>
          </Toast>
        );
      })}
      <ToastViewport />
    </ToastProvider>
  );
}
