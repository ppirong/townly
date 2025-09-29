import { z } from 'zod';

/**
 * 이메일 스케줄 생성 스키마
 */
export const createEmailScheduleSchema = z.object({
  title: z.string().min(1, '제목은 필수입니다'),
  description: z.string().optional(),
  emailSubject: z.string().min(1, '이메일 제목은 필수입니다'),
  emailTemplate: z.enum(['weather_summary', 'custom']).default('weather_summary'),
  scheduleTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, '시간 형식이 올바르지 않습니다 (HH:MM)'),
  timezone: z.string().default('Asia/Seoul'),
  targetType: z.enum(['all_users', 'active_users', 'specific_users']).default('all_users'),
  targetUserIds: z.array(z.string()).optional(),
  isActive: z.boolean().default(true),
});

export type CreateEmailScheduleInput = z.infer<typeof createEmailScheduleSchema>;

/**
 * 이메일 스케줄 업데이트 스키마
 */
export const updateEmailScheduleSchema = createEmailScheduleSchema.partial();

export type UpdateEmailScheduleInput = z.infer<typeof updateEmailScheduleSchema>;

/**
 * 수동 이메일 발송 스키마
 */
export const sendManualEmailSchema = z.object({
  subject: z.string().min(1, '제목은 필수입니다'),
  location: z.string().min(1, '위치는 필수입니다').default('서울'),
  timeOfDay: z.enum(['morning', 'evening']).default('morning'),
  targetType: z.enum(['all_users', 'active_users', 'specific_users', 'test']).default('all_users'),
  targetUserIds: z.array(z.string()).optional(),
  testEmail: z.string().email().optional(),
  forceRefreshWeather: z.boolean().default(true),
});

export type SendManualEmailInput = z.infer<typeof sendManualEmailSchema>;

/**
 * 사용자 이메일 설정 업데이트 스키마
 */
export const updateUserEmailSettingsSchema = z.object({
  receiveWeatherEmails: z.boolean().optional(),
  receiveMorningEmail: z.boolean().optional(),
  receiveEveningEmail: z.boolean().optional(),
  preferredLanguage: z.string().optional(),
  timezone: z.string().optional(),
  isSubscribed: z.boolean().optional(),
});

export type UpdateUserEmailSettingsInput = z.infer<typeof updateUserEmailSettingsSchema>;

