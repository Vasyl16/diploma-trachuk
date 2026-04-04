/** Recipe as returned by the Nest API (Prisma). */
export type Recipe = {
  id: string;
  title: string;
  ingredients: string[];
  steps: string[];
  /** AI-generated dish photo URL when enabled at generation time. */
  imageUrl?: string | null;
  isAI: boolean;
  isPublished: boolean;
  userId: string;
  createdAt: string;
  updatedAt: string;
};

/** Published recipe in the public feed (includes author). */
export type FeedRecipe = {
  id: string;
  title: string;
  ingredients: string[];
  steps: string[];
  category?: string | null;
  tags?: string[];
  imageUrl?: string | null;
  isAI: boolean;
  isPublished: boolean;
  userId: string;
  createdAt: string;
  updatedAt: string;
  user: { name: string; avatarUrl: string | null };
  likesCount: number;
  likedByMe: boolean;
  /** Bookmark / saved (Instagram-style save), separate from like. */
  savedByMe: boolean;
};
