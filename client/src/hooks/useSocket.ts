import { useEffect, useRef } from 'react';
import { connectSocket, disconnectSocket, getSocket } from '../utils/socket';
import { useChatStore } from '../store/chatStore';

export function useStreamSocket(streamId: string | undefined, token: string | null) {
  const joinedRef = useRef(false);
  const addMessage = useChatStore((s) => s.addMessage);
  const setConnected = useChatStore((s) => s.setConnected);
  const clearMessages = useChatStore((s) => s.clearMessages);

  useEffect(() => {
    // Fall back to the persisted token — login/signup write localStorage
    // directly, so the auth store may not be hydrated yet.
    const authToken =
      token || (typeof window !== 'undefined' ? localStorage.getItem('token') : null);
    if (!streamId || !authToken) return;

    const socket = connectSocket(authToken);

    const joinAndSync = () => {
      setConnected(true);
      if (!joinedRef.current) {
        socket.emit('join-stream', streamId);
        joinedRef.current = true;
      }
      // Request recent chat history on connect/reconnect
      socket.emit('chat-sync', streamId);
    };

    // Named handlers so cleanup can off() exactly these — the socket is a shared
    // singleton (gift/entrance/heart overlays attach their own listeners), so we
    // must never off('gift-received') wholesale or disconnect it here.
    const onConnect = joinAndSync;
    const onChatHistory = (messages: any[]) => {
      for (const msg of messages) addMessage(msg);
    };
    const onDisconnect = () => {
      setConnected(false);
      joinedRef.current = false;
    };
    const onNewMessage = (msg: any) => {
      addMessage({ ...msg, type: msg.type || 'text' });
    };
    const onGiftReceived = (data: any) => {
      addMessage({
        id: `gift-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        type: 'gift',
        username: data.senderUsername || 'unknown',
        displayName: data.sender,
        avatarUrl: data.senderAvatar,
        role: 'VIEWER',
        content: data.message || '',
        giftType: data.giftType,
        threads: data.threads,
        timestamp: new Date().toISOString(),
      });
    };
    const onMessageBlocked = (data: any) => {
      addMessage({
        id: `blocked-${Date.now()}`,
        type: 'system',
        username: 'system',
        displayName: 'System',
        role: 'SYSTEM',
        content: `Your message was blocked: ${data.reason}`,
        timestamp: new Date().toISOString(),
      });
    };
    const onViewerJoined = (data: any) => {
      addMessage({
        id: `join-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        type: 'system',
        username: 'system',
        displayName: 'System',
        role: 'SYSTEM',
        badge: data.badge,
        content: `${data.displayName} joined`,
        timestamp: new Date().toISOString(),
      });
    };

    socket.on('connect', onConnect);
    socket.on('chat-history', onChatHistory);
    socket.on('disconnect', onDisconnect);
    socket.on('new-message', onNewMessage);
    socket.on('gift-received', onGiftReceived);
    socket.on('message-blocked', onMessageBlocked);
    socket.on('viewer-joined', onViewerJoined);

    // The shared socket may already be connected (an overlay opened it first),
    // in which case 'connect' won't fire again — join immediately.
    if (socket.connected) joinAndSync();

    return () => {
      if (joinedRef.current) {
        socket.emit('leave-stream', streamId);
        joinedRef.current = false;
      }
      socket.off('connect', onConnect);
      socket.off('chat-history', onChatHistory);
      socket.off('disconnect', onDisconnect);
      socket.off('new-message', onNewMessage);
      socket.off('gift-received', onGiftReceived);
      socket.off('message-blocked', onMessageBlocked);
      socket.off('viewer-joined', onViewerJoined);
      clearMessages();
      // Do NOT disconnectSocket(): the singleton is shared with the gift /
      // entrance / heart overlays — disconnecting here kills their effects until
      // a full page reload.
    };
  }, [streamId, token, addMessage, setConnected, clearMessages]);

  function sendMessage(content: string) {
    const socket = getSocket();
    if (socket && streamId) {
      socket.emit('chat-message', { streamId, content });
    }
  }

  // Gift messages are now emitted server-side from POST /api/threads/gift
  // No client-side sendGift needed — prevents spoofing

  function sendPollVote(pollId: string, optionId: string) {
    const socket = getSocket();
    if (socket && streamId) {
      socket.emit('poll-vote', { streamId, pollId, optionId });
    }
  }

  return { sendMessage, sendPollVote };
}
