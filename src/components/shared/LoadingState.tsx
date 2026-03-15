import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LoadingStateProps {
  message?: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function LoadingState({ message = "Loading...", className, size = "md" }: LoadingStateProps) {
  const sizeStyles = {
    sm: "h-4 w-4",
    md: "h-8 w-8",
    lg: "h-12 w-12",
  };

  return (
    <div className={cn("flex flex-col items-center justify-center gap-4 p-8", className)}>
      <Loader2 className={cn("animate-spin text-primary", sizeStyles[size])} />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

export function TableSkeleton({ rows = 5, columns = 5 }: { rows?: number; columns?: number }) {
  return (
    <div className="w-full space-y-3">
      <div className="flex gap-4">
        {Array.from({ length: columns }).map((_, i) => (
          <div key={i} className="h-10 flex-1 rounded-md shimmer" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4">
          {Array.from({ length: columns }).map((_, j) => (
            <div key={j} className="h-12 flex-1 rounded-md shimmer" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="rounded-xl border bg-card p-6 space-y-4">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <div className="h-4 w-24 rounded shimmer" />
          <div className="h-8 w-32 rounded shimmer" />
        </div>
        <div className="h-12 w-12 rounded-lg shimmer" />
      </div>
    </div>
  );
}