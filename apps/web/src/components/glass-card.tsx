import { cn } from "@/lib/utils";

export function GlassCard({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-white/20 bg-white/60 shadow-lg backdrop-blur-xl dark:border-white/10 dark:bg-white/5",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
