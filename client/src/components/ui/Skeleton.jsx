/**
 * Skeleton loading placeholders
 */

export const StatSkeleton = () => (
  <div className="surface-card p-5 flex items-start gap-4">
    <div className="h-11 w-11 rounded-2xl skeleton-shimmer shrink-0" />
    <div className="flex-1 space-y-2">
      <div className="h-7 w-20 skeleton-shimmer" />
      <div className="h-4 w-28 skeleton-shimmer" />
    </div>
  </div>
);

export const CardSkeleton = () => (
  <div className="surface-card p-6 space-y-4">
    <div className="flex justify-between items-center">
      <div className="h-5 w-36 skeleton-shimmer" />
      <div className="h-5 w-20 rounded-full skeleton-shimmer" />
    </div>
    <div className="h-12 w-full skeleton-shimmer" />
    <div className="h-4 w-2/3 skeleton-shimmer" />
    <div className="h-9 w-full skeleton-shimmer rounded-xl" />
  </div>
);

export const ListSkeleton = ({ count = 3 }) => (
  <div className="space-y-3">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="surface-card p-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1">
          <div className="h-10 w-10 rounded-xl skeleton-shimmer shrink-0" />
          <div className="space-y-1.5 flex-1">
            <div className="h-4 w-40 skeleton-shimmer" />
            <div className="h-3 w-24 skeleton-shimmer" />
          </div>
        </div>
        <div className="h-6 w-16 rounded-full skeleton-shimmer" />
      </div>
    ))}
  </div>
);

export const TableRowSkeleton = ({ rows = 4, cols = 5 }) => (
  <div className="space-y-2">
    {Array.from({ length: rows }).map((_, r) => (
      <div key={r} className="flex gap-4 p-3 border-b border-[#e8e2d5]/60 items-center">
        {Array.from({ length: cols }).map((_, c) => (
          <div key={c} className="h-4 flex-1 skeleton-shimmer" />
        ))}
      </div>
    ))}
  </div>
);

export default {
  StatSkeleton,
  CardSkeleton,
  ListSkeleton,
  TableRowSkeleton,
};
