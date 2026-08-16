/**
 * Content categories — the single taxonomy for the whole platform.
 * Used by: creator onboarding, the go-live category picker, Explore chips.
 * IDs are stored verbatim on CreatorProfile.category, Stream.category, and
 * Reel.category — never rename an id (legacy rows keep the old string).
 */
export interface Category {
  id: string;
  label: string;
  icon: string;
}

export const CATEGORIES: Category[] = [
  { id: 'chat', label: 'Just Chatting', icon: '💬' },
  { id: 'music', label: 'Music & Performance', icon: '🎵' },
  { id: 'gaming', label: 'Gaming', icon: '🎮' },
  { id: 'coding', label: 'Coding & Tech', icon: '💻' },
  { id: 'cooking', label: 'Cooking & Food', icon: '🍳' },
  { id: 'art', label: 'Art & Design', icon: '🎨' },
  { id: 'fitness', label: 'Fitness & Health', icon: '🏋️' },
  { id: 'beauty', label: 'Beauty & Makeup', icon: '💄' },
  { id: 'fashion', label: 'Fashion & Style', icon: '👗' },
  { id: 'comedy', label: 'Comedy', icon: '😂' },
  { id: 'education', label: 'Learning', icon: '📚' },
  { id: 'sports', label: 'Sports', icon: '⚽' },
  { id: 'lifestyle', label: 'Lifestyle', icon: '🌴' },
  { id: 'coaching', label: 'Coaching & Advice', icon: '🧠' },
  { id: 'dating', label: 'Dating & Social', icon: '💕' },
  { id: 'general', label: 'General Creator', icon: '⭐' },
];

export const categoryById = (id?: string | null): Category | undefined =>
  CATEGORIES.find((c) => c.id === id);
