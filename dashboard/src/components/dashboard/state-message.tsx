import { cn } from "cn"

import { Button } from "@/components/ui/button"

export function StateMessage({
  title,
  description,
  tone = "muted",
  onRetry,
}: {
  title: string
  description?: string
  tone?: "muted" | "error"
  onRetry?: () => void
}) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "flex flex-col items-center justify-center gap-2 border border-dashed bg-card px-4 py-10 text-center",
        tone === "error" && "border-destructive/50",
      )}
    >
      <p className={cn("text-sm font-medium", tone === "error" && "text-destructive")}>{title}</p>
      {description && <p className="max-w-md text-xs text-muted-foreground">{description}</p>}
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          Reintentar
        </Button>
      )}
    </div>
  )
}
