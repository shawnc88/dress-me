import { Eye } from 'lucide-react';

export function LiveStatsPill({ viewerCount }: { viewerCount: number }) {
  return (
    <div className="flex items-center gap-1.5 bg-black/50 backdrop-blur-sm rounded-full px-2.5 py-1">
      <Eye className="w-3.5 h-3.5 text-white/70" />
      <span className="text-white text-xs font-semibold">
        {viewerCount > 999 ? `${(viewerCount / 1000).toFixed(1)}K` : viewerCount}
      </span>
    </div>
  );
}
