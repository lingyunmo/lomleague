import { z } from 'zod';

// Keep existing raw URLs/JSON storage; validate only new writes, without URL decoding or rewriting.
export const attachmentSchema = z.array(z.string().min(1).max(2048)).max(100).nullable().optional();
export const avatarSchema = z.string().max(2048).optional();
