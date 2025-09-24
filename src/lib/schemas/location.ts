import { z } from 'zod';

/**
 * 위치 설정 스키마
 */
export const setUserLocationSchema = z.object({
  latitude: z.string().min(1, '위도는 필수입니다'),
  longitude: z.string().min(1, '경도는 필수입니다'),
  address: z.string().optional(),
  cityName: z.string().optional(),
  nickname: z.string().optional(),
  accuracy: z.number().optional(),
  source: z.enum(['gps', 'manual']).default('gps'),
});

/**
 * 위치 업데이트 스키마
 */
export const updateUserLocationSchema = setUserLocationSchema.partial();

/**
 * TypeScript 타입 추출
 */
export type SetUserLocationInput = z.infer<typeof setUserLocationSchema>;
export type UpdateUserLocationInput = z.infer<typeof updateUserLocationSchema>;
