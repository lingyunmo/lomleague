/**
 * 文章相关共享类型
 */
export interface Article {
  id: number;
  title: string;
  content: string;
  attachments: unknown;
  region: string;
  createdAt: string;
  updatedAt: string;
  userId: number | null;
  user?: { username: string; avatar: string };
}
