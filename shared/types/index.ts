// ─── Enums ──────────────────────────────────────────────────────

export type UserRole = 'VIEWER' | 'CREATOR' | 'MODERATOR' | 'ADMIN';
export type SubscriptionTier = 'BASIC' | 'PREMIUM' | 'ELITE';
export type SubStatus = 'ACTIVE' | 'PAST_DUE' | 'CANCELED' | 'TRIALING';
export type StreamStatus = 'SCHEDULED' | 'LIVE' | 'ENDED' | 'ARCHIVED';
export type StreamType = 'PUBLIC' | 'PREMIUM' | 'ELITE' | 'PRIVATE';
export type MessageType = 'TEXT' | 'GIFT' | 'SYSTEM' | 'POLL';
export type GiveawayStatus = 'DRAFT' | 'ACTIVE' | 'CLOSED' | 'WINNER_SELECTED' | 'COMPLETED';

// ─── Entities ───────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string | null;
  role: UserRole;
  isVerified: boolean;
  threadBalance: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreatorProfile {
  id: string;
  userId: string;
  category: string;
  totalEarnings: number;
  threadBalance: number;
  isLive: boolean;
  streamKey: string;
  socialLinks: Record<string, string> | null;
  createdAt: string;
  user?: Pick<User, 'username' | 'displayName' | 'avatarUrl'>;
}

export interface Subscription {
  id: string;
  userId: string;
  tier: SubscriptionTier;
  status: SubStatus;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
}

export interface Stream {
  id: string;
  creatorId: string;
  title: string;
  description: string | null;
  thumbnailUrl: string | null;
  status: StreamStatus;
  streamType: StreamType;
  startedAt: string | null;
  endedAt: string | null;
  viewerCount: number;
  peakViewers: number;
  replayUrl: string | null;
  scheduledFor: string | null;
  createdAt: string;
  creator?: CreatorProfile;
}

export interface ChatMessage {
  id: string;
  streamId: string;
  userId: string;
  content: string;
  type: MessageType;
  isDeleted: boolean;
  createdAt: string;
}

export interface Gift {
  id: string;
  streamId: string;
  senderId: string;
  giftType: string;
  threads: number;
  message: string | null;
  createdAt: string;
}

export interface Poll {
  id: string;
  streamId: string;
  question: string;
  options: PollOption[];
  isActive: boolean;
  endsAt: string | null;
}

export interface PollOption {
  id: string;
  text: string;
  votes: number;
}

export interface Giveaway {
  id: string;
  creatorId: string;
  title: string;
  description: string;
  prizeDetails: string;
  prizeValueUsd: number;
  rulesUrl: string;
  amoeMethod: string;
  eligibility: string;
  status: GiveawayStatus;
  startDate: string;
  endDate: string;
  winnerId: string | null;
}

export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  isRead: boolean;
  data: Record<string, any> | null;
  createdAt: string;
}

// ─── API Types ──────────────────────────────────────────────────

export interface ApiError {
  error: { message: string; statusCode: number };
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  limit: number;
  offset: number;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: Pick<User, 'id' | 'email' | 'username' | 'displayName' | 'role'>;
  token: string;
}

export interface RegisterRequest {
  email: string;
  username: string;
  displayName: string;
  password: string;
}

export type RegisterResponse = LoginResponse;

export interface CreateStreamRequest {
  title: string;
  description?: string;
  streamType?: StreamType;
  scheduledFor?: string;
}

// ─── Socket Event Types ─────────────────────────────────────────

export interface ChatMessageEvent {
  streamId: string;
  content: string;
}

export interface NewMessageEvent {
  id: string;
  username: string;
  displayName: string;
  role: string;
  content: string;
  timestamp: string;
}

export interface GiftSentEvent {
  streamId: string;
  giftType: string;
  threads: number;
  message?: string;
}

export interface GiftReceivedEvent {
  sender: string;
  giftType: string;
  threads: number;
  message?: string;
}

export interface PollVoteEvent {
  streamId: string;
  pollId: string;
  optionId: string;
}

export interface ViewerJoinedEvent {
  username: string;
  displayName: string;
}
