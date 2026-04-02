import { useState } from 'react';
import { CheckCircle } from 'lucide-react';

interface PollOption {
  id: string;
  text: string;
  votes: number;
}

interface Poll {
  id: string;
  question: string;
  options: PollOption[];
  isActive: boolean;
}

export function PollOverlay({ poll, streamId }: { poll: Poll; streamId: string }) {
  const [voted, setVoted] = useState<string | null>(null);
  const [options, setOptions] = useState(poll.options);

  const totalVotes = options.reduce((sum, o) => sum + o.votes, 0);

  const vote = (optionId: string) => {
    if (voted) return;
    setVoted(optionId);
    setOptions((prev) =>
      prev.map((o) => (o.id === optionId ? { ...o, votes: o.votes + 1 } : o))
    );
    // TODO: Emit via Socket.IO
  };

  return (
    <div className="absolute top-16 left-4 right-4 bg-black/70 backdrop-blur-sm rounded-2xl p-4 animate-slide-up">
      <p className="text-white font-semibold text-sm mb-3">{poll.question}</p>
      <div className="space-y-2">
        {options.map((option) => {
          const pct = totalVotes > 0 ? Math.round((option.votes / totalVotes) * 100) : 0;
          return (
            <button
              key={option.id}
              onClick={() => vote(option.id)}
              disabled={!!voted}
              className="w-full relative overflow-hidden rounded-xl p-3 text-left transition-all
                         bg-white/10 hover:bg-white/20 disabled:cursor-default"
            >
              {voted && (
                <div
                  className="absolute inset-0 bg-brand-500/30 transition-all duration-500"
                  style={{ width: `${pct}%` }}
                />
              )}
              <div className="relative flex justify-between items-center">
                <span className="text-white text-sm font-medium">
                  {voted === option.id && <><CheckCircle className="w-3.5 h-3.5 inline mr-0.5" /> </>}{option.text}
                </span>
                {voted && (
                  <span className="text-white/80 text-xs font-bold">{pct}%</span>
                )}
              </div>
            </button>
          );
        })}
      </div>
      {totalVotes > 0 && (
        <p className="text-white/50 text-xs mt-2 text-center">{totalVotes + (voted ? 1 : 0)} votes</p>
      )}
    </div>
  );
}
