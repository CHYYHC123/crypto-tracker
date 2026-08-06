import { cn } from '@/lib/utils';

interface AssetListSkeletonProps {
  count?: number;
  className?: string;
}

const SkeletonBlock = ({ className }: { className?: string }) => {
  return <div className={cn(`animate-pulse  rounded-md bg-white/10`, className)} />;
};

export default function AssetListSkeleton({ count = 5, className }: AssetListSkeletonProps) {
  return (
    <div className={cn('mt-5', className)}>
      {Array.from({
        length: count
      }).map((_, index) => (
        <div key={index} className="grid grid-cols-[auto_1fr_auto] items-center p-2 mb-1.5 rounded-xl  bg-white/5">
          <SkeletonBlock className="w-9 h-9 rounded-lg" />

          <div className="ml-2 space-y-2">
            <SkeletonBlock className="w-14 h-4" />
            <SkeletonBlock className="w-16 h-3" />
          </div>

          <div className="ml-5 space-y-2">
            <SkeletonBlock className="w-20 h-4" />
            <SkeletonBlock className="w-12 h-3" />
          </div>
        </div>
      ))}
    </div>
  );
}
