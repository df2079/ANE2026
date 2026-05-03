"use client";

import { useFormStatus } from "react-dom";
import { cn } from "@/lib/utils";

type SubmitButtonProps = {
  children: React.ReactNode;
  pendingLabel?: string;
  className?: string;
  variant?: "primary" | "secondary" | "danger";
  disabled?: boolean;
};

export function SubmitButton({
  children,
  pendingLabel = "Saving...",
  className,
  variant = "primary",
  disabled = false
}: SubmitButtonProps) {
  const { pending } = useFormStatus();
  const variantClassName =
    variant === "secondary"
      ? "btn-secondary"
      : variant === "danger"
        ? "border border-rose-300 bg-rose-50 text-rose-800 hover:bg-rose-100"
        : "btn-primary";

  return (
    <button
      type="submit"
      className={cn(
        "flex w-full items-center justify-center gap-2 rounded-full px-4 py-3 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-70",
        variantClassName,
        className
      )}
      disabled={pending || disabled}
    >
      {pending ? (
        <>
          <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" />
          <span>{pendingLabel}</span>
        </>
      ) : (
        children
      )}
    </button>
  );
}
