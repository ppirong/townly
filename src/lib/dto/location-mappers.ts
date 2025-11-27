import type { UserLocation } from '@/db/schema';
import { toISOStringOrNull } from '@/lib/utils';

/**
 * 클라이언트용 Location DTO 타입
 */
export interface ClientUserLocation {
  id: string;
  clerkUserId: string;
  latitude: string;
  longitude: string;
  address: string | null;
  cityName: string | null;
  isDefault: boolean;
  nickname: string | null;
  accuracy: number | null;
  source: string;
  createdAt: string | null;
  updatedAt: string | null;
}

/**
 * 위치 입력용 DTO 타입
 */
export interface LocationInput {
  latitude: string;
  longitude: string;
  address?: string;
  cityName?: string;
  nickname?: string;
  accuracy?: number;
  source?: string;
}

/**
 * DB UserLocation을 클라이언트용 DTO로 변환
 */
export function mapUserLocationForClient(db: UserLocation): ClientUserLocation {
  return {
    id: db.id,
    clerkUserId: db.clerkUserId,
    latitude: db.latitude,
    longitude: db.longitude,
    address: db.address,
    cityName: db.cityName,
    isDefault: db.isDefault,
    nickname: db.nickname,
    accuracy: db.accuracy,
    source: db.source,
    createdAt: toISOStringOrNull(db.createdAt),
    updatedAt: toISOStringOrNull(db.updatedAt),
  };
}

/**
 * 클라이언트 입력을 DB 삽입용 데이터로 변환
 */
export function mapLocationInputForDB(
  input: LocationInput,
  userId: string
): {
  clerkUserId: string;
  latitude: string;
  longitude: string;
  address?: string;
  cityName?: string;
  nickname?: string;
  accuracy?: number;
  source: string;
  isDefault: boolean;
} {
  return {
    clerkUserId: userId,
    latitude: input.latitude,
    longitude: input.longitude,
    address: input.address,
    cityName: input.cityName,
    nickname: input.nickname,
    accuracy: input.accuracy,
    source: input.source || 'gps',
    isDefault: true, // 첫 번째 위치는 기본값으로 설정
  };
}
