import { create } from 'zustand';

export interface ChatMessage {
  id: string;
  type: 'text' | 'gift' | 'system';
  username: string;
  displayName: string;
  avatarUrl?: string | null;
  role: string;
  badge?: string | null; // SUPPORTER, VIP, INNER_CIRCLE
  club?: boolean;        // fan-club member of this room's creator
  level?: number;        // wealth level 0..5 from lifetime gift spend
  content: string;
  // Gift-specific fields
  giftType?: string;
  threads?: number;
  timestamp: string;
}

interface ChatState {
  messages: ChatMessage[];
  isConnected: boolean;
  setConnected: (connected: boolean) => void;
  addMessage: (msg: ChatMessage) => void;
  clearMessages: () => void;
}

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  isConnected: false,

  setConnected: (connected) => set({ isConnected: connected }),

  addMessage: (msg) =>
    set((state) => ({
      messages: [...state.messages.slice(-200), msg],
    })),

  clearMessages: () => set({ messages: [] }),
}));
