/**
 * 用户相关共享类型
 * 前后端类型统一来源
 */
export interface UserProfile {
  id: number;
  username: string;
  email: string;
  avatar: string;
  gold_coins: number;
  is_admin: boolean;
  last_checkin_date: string | null;
  checkin_streak: number;
  lastLoginRegion: unknown;
  created_at: string;
  updated_at: string;
}

export interface LoginRequest {
  username: string;
  password: string;
  ip?: string;
  region?: string;
}

export interface RegisterRequest {
  username: string;
  password: string;
  email: string;
  avatar?: string;
}

export interface UpdateProfileRequest {
  username?: string;
  email?: string;
  avatar?: string;
}
