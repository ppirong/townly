import { z } from 'zod';

// 메시지 필터링을 위한 스키마
export const getMessagesSchema = z.object({
  limit: z.number().min(1).max(100).default(50),
  offset: z.number().min(0).default(0),
  userKey: z.string().optional(),
  isRead: z.boolean().optional(),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
});

export type GetMessagesInput = z.infer<typeof getMessagesSchema>;

// 메시지 읽음 처리를 위한 스키마
export const markAsReadSchema = z.object({
  messageId: z.string().uuid(),
});

export type MarkAsReadInput = z.infer<typeof markAsReadSchema>;

// 여러 메시지 읽음 처리를 위한 스키마
export const markMultipleAsReadSchema = z.object({
  messageIds: z.array(z.string().uuid()).min(1),
});

export type MarkMultipleAsReadInput = z.infer<typeof markMultipleAsReadSchema>;
