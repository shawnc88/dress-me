import { create } from 'zustand';

interface ChatMessage {
  id: string;
  username: string;
  displayName: string;
  role: string;
  content: string;
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
      messages: [...state.messages.slice(-200), msg], // Keep last 200 messages
    })),

  clearMessages: () => set({ messages: [] }),
}));
