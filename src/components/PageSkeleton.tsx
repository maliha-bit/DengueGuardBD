import { Skeleton, SkeletonCard, SkeletonGroup } from '@/components/ui';

/** Shown while a lazily loaded page downloads: title bar + a few cards. */
export function PageSkeleton() {
  return (
    <SkeletonGroup className="mt-7">
      <Skeleton shape="text" className="h-10 w-2/3 max-w-md" />
      <Skeleton shape="text" className="mt-3 w-1/2 max-w-sm" />
      <div className="mt-7 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    </SkeletonGroup>
  );
}
