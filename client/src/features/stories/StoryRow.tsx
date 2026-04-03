import { useState, useEffect } from 'react';
import { StoryBubble } from './StoryBubble';
import { StoryViewer } from './StoryViewer';
import { Plus } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface StoryGroup {
  creatorId: string;
  user: { id: string; username: string; displayName: string; avatarUrl?: string };
  stories: Array<{
    id: string;
    mediaUrl: string;
    mediaType: string;
    caption?: string;
    createdAt: string;
    expiresAt: string;
    viewCount: number;
  }>;
}

export function StoryRow() {
  const [groups, setGroups] = useState<StoryGroup[]>([]);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);

  useEffect(() => {
    fetch(`${API_URL}/api/stories`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.storyGroups) setGroups(data.storyGroups);
      })
      .catch(() => {});
  }, []);

  if (groups.length === 0) return null;

  return (
    <>
      <div className="flex items-center gap-3 px-4 py-3 overflow-x-auto scrollbar-hide">
        {groups.map((group, i) => (
          <StoryBubble
            key={group.creatorId}
            username={group.user.username}
            displayName={group.user.displayName}
            avatarUrl={group.user.avatarUrl}
            hasUnviewed={true}
            onClick={() => setViewerIndex(i)}
          />
        ))}
      </div>

      {/* Fullscreen story viewer */}
      {viewerIndex !== null && (
        <StoryViewer
          groups={groups}
          initialIndex={viewerIndex}
          onClose={() => setViewerIndex(null)}
        />
      )}
    </>
  );
}
