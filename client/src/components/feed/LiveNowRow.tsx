import Link from 'next/link';

interface LiveStream {
  id: string;
  title: string;
  viewerCount: number;
  creator: {
    user: { displayName: string; avatarUrl: string | null };
  };
}

export function LiveNowRow({ streams }: { streams: LiveStream[] }) {
  if (streams.length === 0) return null;

  return (
    <div className="mb-6">
      <h2 className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-3 px-1">
        Live Now
      </h2>
      <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
        {streams.map((stream) => (
          <Link
            key={stream.id}
            href={`/stream/${stream.id}`}
            className="flex-shrink-0 flex flex-col items-center gap-1 group"
          >
            {/* Avatar ring — live gradient */}
            <div className="w-16 h-16 rounded-full p-[3px] bg-gradient-to-tr from-pink-500 via-red-500 to-yellow-500">
              <div className="w-full h-full rounded-full bg-white dark:bg-gray-900 flex items-center justify-center text-lg font-bold text-brand-600 overflow-hidden">
                {stream.creator.user.avatarUrl ? (
                  <img src={stream.creator.user.avatarUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  stream.creator.user.displayName.charAt(0)
                )}
              </div>
            </div>
            <span className="text-[10px] font-medium text-gray-500 group-hover:text-brand-600 truncate max-w-[72px] text-center">
              {stream.creator.user.displayName}
            </span>
            <span className="text-[9px] text-red-500 font-bold">
              {stream.viewerCount} watching
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
