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
}).transform((data) => ({
  ...data,
  // default 값들이 제대로 적용되도록 함
  emailTemplate: data.emailTemplate ?? 'weather_summary',
  timezone: data.timezone ?? 'Asia/Seoul',
  targetType: data.targetType ?? 'all_users',
  isActive: data.isActive ?? true,
}));

export type CreateEmailScheduleInput = z.infer<typeof createEmailScheduleSchema>;

/**
 * 이메일 스케줄 업데이트 스키마
 */
export const updateEmailScheduleSchema = z.object({
  title: z.string().min(1, '제목은 필수입니다').optional(),
  description: z.string().optional(),
  emailSubject: z.string().min(1, '이메일 제목은 필수입니다').optional(),
  emailTemplate: z.enum(['weather_summary', 'custom']).optional(),
  scheduleTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, '시간 형식이 올바르지 않습니다 (HH:MM)').optional(),
  timezone: z.string().optional(),
  targetType: z.enum(['all_users', 'active_users', 'specific_users']).optional(),
  targetUserIds: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
  nextSendAt: z.date().optional(),
});

export type UpdateEmailScheduleInput = z.infer<typeof updateEmailScheduleSchema>;

/**
 * 수동 이메일 발송 스키마
 */
export const sendManualEmailSchema = z.object({
  subject: z.string().min(1, '제목은 필수입니다'),
  location: z.string().min(1, '위치는 필수입니다').optional().default('서울'),
  timeOfDay: z.enum(['morning', 'evening']).optional().default('morning'),
  targetType: z.enum(['all_users', 'active_users', 'specific_users', 'test']).optional().default('all_users'),
  targetUserIds: z.array(z.string()).nullable().optional(),
  testEmail: z.string().email().optional(),
  forceRefreshWeather: z.boolean().optional().default(true),
  useAgent: z.boolean().optional().default(true), // 에이전트 사용 여부 (기본: true)
}).transform((data) => ({
  ...data,
  location: data.location ?? '서울',
  timeOfDay: data.timeOfDay ?? 'morning',
  targetType: data.targetType ?? 'all_users',
  targetUserIds: data.targetUserIds || undefined, // null을 undefined로 변환
  forceRefreshWeather: data.forceRefreshWeather ?? true,
  useAgent: data.useAgent ?? true, // 에이전트 기본 사용
}));

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

