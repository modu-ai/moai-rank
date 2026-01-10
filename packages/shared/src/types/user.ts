/**
 * User-related type definitions
 */

export interface User {
  id: string;
  clerkId: string;
  email: string;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  imageUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Session {
  id: string;
  userId: string;
  clerkSessionId: string;
  startedAt: Date;
  endedAt: Date | null;
  isActive: boolean;
}

export interface UserProfile {
  user: User;
  totalTokensUsed: number;
  totalSessions: number;
  currentRank: number | null;
}
