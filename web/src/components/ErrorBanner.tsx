import { AlertCircle } from "lucide-react";
import { getErrorMessage } from "@/lib/errors";
import { cn } from "@/lib/utils";

export function ErrorBanner({
  error,
  className,
}: {
  error: unknown;
  className?: string;
}) {
  if (!error) return null;
  return (
    <div
      role="alert"
      className={cn(
        "flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive",
        className,
      )}
    >
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{getErrorMessage(error)}</span>
    </div>
  );
}
