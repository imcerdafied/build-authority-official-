import { Skeleton } from "@/components/ui/skeleton";

interface PageSkeletonProps {
  /**
   * When true, fills the viewport and centers the skeleton. Use for the
   * top-level auth/workspace gate before the shell has rendered.
   */
  fullScreen?: boolean;
  /** Number of placeholder rows under the heading. Defaults to 4. */
  rows?: number;
}

/**
 * Single loading primitive for the app. Replaces ad-hoc "Loading..." text so
 * the loading state matches the layout that follows instead of a bare string.
 * Backed by the shared Skeleton.
 */
export default function PageSkeleton({ fullScreen = false, rows = 4 }: PageSkeletonProps) {
  const body = (
    <div className="w-full max-w-2xl space-y-4" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading</span>
      <Skeleton className="h-7 w-48" />
      <Skeleton className="h-4 w-72" />
      <div className="space-y-3 pt-2">
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    </div>
  );

  if (fullScreen) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-6">
        {body}
      </div>
    );
  }

  return <div className="py-2">{body}</div>;
}
