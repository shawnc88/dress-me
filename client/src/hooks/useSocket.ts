import { useEffect, useRef } from 'react';
import { connectSocket, disconnectSocket, getSocket } from '../utils/socket';
import { useChatStore } from '../store/chatStore';

export function useStreamSocket(streamId: string | undefined, token: string | null) {
  const joinedRef = useRef(false);
  const addMessage = useChatStore((s) => s.addMessage);
  const setConnected = useChatStore((s) => s.setConnected);
  const clearMessages = useChatStore((s) => s.clearMessages);

  useEffect(() => {
    if (!streamId || !token) return;

    const socket = connectSocket(token);

    socket.on('connect', () => {
      setConnected(true);
      if (!joinedRef.current) {
        socket.emit('join-stream', streamId);
        joinedRef.current = true;
      }
    });

    socket.on('disconnect', () => {
      setConnected(false);
      joinedRef.current = false;
    });

    socket.on('new-message', (msg) => {
      addMessage(msg);
    });

    socket.on('gift-received', (data) => {
      addMessage({
        id: `gift-${Date.now()}`,
        username: 'system',
        displayName: 'System',
        role: 'SYSTEM',
        content: `${data.sender} sent a ${data.giftType} (${data.threads} threads)${data.message ? `: ${data.message}` : ''}`,
        timestamp: new Date().toISOString(),
      });
    });

    socket.on('message-blocked', (data) => {
      addMessage({
        id: `blocked-${Date.now()}`,
        username: 'system',
        displayName: 'System',
        role: 'SYSTEM',
        content: `Your message was blocked: ${data.reason}`,
        timestamp: new Date().toISOString(),
      });
    });

    socket.on('viewer-joined', (data) => {
      addMessage({
        id: `join-${Date.now()}`,
        username: 'system',
        displayName: 'System',
        role: 'SYSTEM',
        content: `${data.displayName} joined the stream`,
        timestamp: new Date().toISOString(),
      });
    });

    return () => {
      const s = getSocket();
      if (s && joinedRef.current) {
        s.emit('leave-stream', streamId);
        joinedRef.current = false;
      }
      clearMessages();
      disconnectSocket();
    };
  }, [streamId, token, addMessage, setConnected, clearMessages]);

  function sendMessage(content: string) {
    const socket = getSocket();
    if (socket && streamId) {
      socket.emit('chat-message', { streamId, content });
    }
  }

  function sendGift(giftType: string, threads: number, message?: string) {
    const socket = getSocket();
    if (socket && streamId) {
      socket.emit('gift-sent', { streamId, giftType, threads, message });
    }
  }

  function sendPollVote(pollId: string, optionId: string) {
    const socket = getSocket();
    if (socket && streamId) {
      socket.emit('poll-vote', { streamId, pollId, optionId });
    }
  }

  return { sendMessage, sendGift, sendPollVote };
}
