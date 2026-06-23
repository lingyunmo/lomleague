/**
 * 论坛相关共享类型
 */
export interface ForumPost {
  id: number;
  userId: number;
  title: string;
  content: string;
  attachments: unknown;
  region: string;
  createdAt: string;
  updatedAt: string;
  user?: { username: string; avatar: string };
  _count?: { replies: number };
}

export interface ForumReply {
  id: number;
  postId: number;
  userId: number;
  content: string;
  attachments: unknown;
  region: string;
  createdAt: string;
  user?: { username: string; avatar: string };
}

export interface PaginatedResponse<T> {
  total: number;
  page: number;
  pageSize: number;
  items?: T[];
  // 不同模块使用不同字段名
  posts?: T[];
  replies?: T[];
  notifications?: T[];
  articles?: T[];
}
