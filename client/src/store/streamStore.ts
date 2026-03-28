import { create } from 'zustand';
import { apiFetch } from '../utils/api';

interface StreamCreator {
  user: { username: string; displayName: string; avatarUrl: string | null };
}

interface Stream {
  id: string;
  title: string;
  description: string | null;
  thumbnailUrl: string | null;
  status: string;
  streamType: string;
  viewerCount: number;
  peakViewers: number;
  startedAt: string | null;
  endedAt: string | null;
  scheduledFor: string | null;
  creator: StreamCreator;
}

interface StreamState {
  streams: Stream[];
  currentStream: Stream | null;
  isLoading: boolean;
  fetchStreams: (status?: string) => Promise<void>;
  fetchStream: (id: string) => Promise<void>;
  clearCurrent: () => void;
}

export const useStreamStore = create<StreamState>((set) => ({
  streams: [],
  currentStream: null,
  isLoading: false,

  fetchStreams: async (status = 'LIVE') => {
    set({ isLoading: true });
    try {
      const data = await apiFetch<{ streams: Stream[] }>(`/api/streams?status=${status}`);
      set({ streams: data.streams, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  fetchStream: async (id) => {
    set({ isLoading: true });
    try {
      const data = await apiFetch<{ stream: Stream }>(`/api/streams/${id}`);
      set({ currentStream: data.stream, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  clearCurrent: () => set({ currentStream: null }),
}));
