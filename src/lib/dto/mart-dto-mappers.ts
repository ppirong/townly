/**
 * 마트 데이터 DTO 매퍼
 * 마스터 규칙: DB 타입을 클라이언트로 직접 전달 금지, 반드시 DTO 매퍼 사용
 */

import type { Mart } from '@/db/schema';
import { toISOString, toISOStringOrNull, toSafeNumber, toSafeArray } from '@/lib/utils';

/**
 * 클라이언트용 마트 DTO 타입
 */
export interface ClientMart {
  id: string;
  name: string;
  description: string | null;
  region: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  latitude: string | null;
  longitude: string | null;
  isVerified: boolean;
  isFastResponse: boolean;
  isBusinessRegistered: boolean;
  hireCount: number;
  responseTime: string;
  portfolioCount: number;
  photoCount: number;
  logoUrl: string | null;
  portfolioUrls: string[];
  photoUrls: string[];
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * 관리자용 마트 DTO 타입 (추가 정보 포함)
 */
export interface AdminMart extends ClientMart {
  // 관리자만 볼 수 있는 추가 정보들
  totalViews?: number;
  lastContactDate?: string | null;
}

/**
 * 마트 목록용 간소화된 DTO 타입
 */
export interface MartListItem {
  id: string;
  name: string;
  region: string;
  address: string | null;
  phone: string | null;
  isVerified: boolean;
  hireCount: number;
  responseTime: string;
  createdAt: string;
}

/**
 * 마트 생성/수정용 입력 DTO 타입
 */
export interface MartInput {
  name: string;
  description?: string;
  region: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  latitude?: string;
  longitude?: string;
  responseTime?: string;
}

/**
 * DB 마트 데이터를 클라이언트용으로 변환
 */
export function mapMartForClient(dbMart: Mart): ClientMart {
  return {
    id: dbMart.id,
    name: dbMart.name,
    description: dbMart.description,
    region: dbMart.region,
    address: dbMart.address,
    phone: dbMart.phone,
    email: dbMart.email,
    website: dbMart.website,
    latitude: dbMart.latitude,
    longitude: dbMart.longitude,
    isVerified: dbMart.isVerified ?? false,
    isFastResponse: dbMart.isFastResponse ?? false,
    isBusinessRegistered: dbMart.isBusinessRegistered ?? false,
    hireCount: toSafeNumber(dbMart.hireCount),
    responseTime: dbMart.responseTime ?? '24시간',
    portfolioCount: toSafeNumber(dbMart.portfolioCount),
    photoCount: toSafeNumber(dbMart.photoCount),
    logoUrl: dbMart.logoUrl,
    portfolioUrls: toSafeArray(dbMart.portfolioUrls),
    photoUrls: toSafeArray(dbMart.photoUrls),
    createdBy: dbMart.createdBy,
    createdAt: toISOString(dbMart.createdAt),
    updatedAt: toISOString(dbMart.updatedAt),
  };
}

/**
 * DB 마트 데이터를 관리자용으로 변환
 */
export function mapMartForAdmin(dbMart: Mart): AdminMart {
  const clientMart = mapMartForClient(dbMart);
  
  return {
    ...clientMart,
    // 관리자 전용 필드들 추가 가능
    totalViews: 0, // 추후 구현
    lastContactDate: null, // 추후 구현
  };
}

/**
 * DB 마트 데이터를 목록용으로 변환 (간소화)
 */
export function mapMartForList(dbMart: Mart): MartListItem {
  return {
    id: dbMart.id,
    name: dbMart.name,
    region: dbMart.region,
    address: dbMart.address,
    phone: dbMart.phone,
    isVerified: dbMart.isVerified ?? false,
    hireCount: toSafeNumber(dbMart.hireCount),
    responseTime: dbMart.responseTime ?? '24시간',
    createdAt: toISOString(dbMart.createdAt),
  };
}

/**
 * 마트 배열을 클라이언트용으로 변환
 */
export function mapMartsForClient(dbMarts: Mart[]): ClientMart[] {
  return dbMarts.map(mapMartForClient);
}

/**
 * 마트 배열을 관리자용으로 변환
 */
export function mapMartsForAdmin(dbMarts: Mart[]): AdminMart[] {
  return dbMarts.map(mapMartForAdmin);
}

/**
 * 마트 배열을 목록용으로 변환
 */
export function mapMartsForList(dbMarts: Mart[]): MartListItem[] {
  return dbMarts.map(mapMartForList);
}
