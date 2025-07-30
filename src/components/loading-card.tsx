import { Progress } from "@/components/ui/progress"

export function LoadingCard({ message = "Generating your content…" }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-md border p-6 shadow-sm animate-pulse bg-muted/40">
      <span className="text-sm font-medium text-muted-foreground text-center">
        {message}
      </span>
      <Progress value={100} max={100} className="h-2 w-full bg-background" />
      <span className="text-xs text-center text-muted-foreground italic">
        Refining tone, polishing prose, triple-checking emoji placement…
      </span>
    </div>
  )
} 