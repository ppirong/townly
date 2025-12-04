/**
 * 사용자 프로필 및 역할 DTO 매퍼
 * 마스터 규칙: DB 타입을 클라이언트로 직접 전달 금지, 반드시 DTO 매퍼 사용
 */

import type { UserProfile, UserRole } from '@/db/schema';
import { toISOString, toISOStringOrNull, toSafeNumber } from '@/lib/utils';

/**
 * 클라이언트용 사용자 프로필 DTO 타입
 */
export interface ClientUserProfile {
  id: string;
  clerkUserId: string;
  email: string;
  name: string | null;
  mobilePhone: string | null;
  imageUrl: string | null;
  signupMethod: 'email' | 'kakao';
  preferences: any;
  createdAt: string;
  updatedAt: string;
}

/**
 * 클라이언트용 사용자 역할 DTO 타입
 */
export interface ClientUserRole {
  id: string;
  clerkUserId: string;
  role: 'customer' | 'admin';
  permissions: any;
  createdAt: string;
  updatedAt: string;
}

/**
 * 클라이언트용 통합 사용자 정보 DTO 타입
 */
export interface ClientUser {
  profile: ClientUserProfile | null;
  role: ClientUserRole | null;
  isAdmin: boolean;
  signupMethod: 'email' | 'kakao';
}

/**
 * 관리자용 사용자 통계 DTO 타입
 */
export interface AdminUserStats {
  totalUsers: number;
  emailSignups: number;
  kakaoSignups: number;
  adminUsers: number;
  customerUsers: number;
  signupMethodBreakdown: {
    method: 'email' | 'kakao';
    count: number;
    percentage: number;
  }[];
}

// ===== DTO 매퍼 함수들 =====

/**
 * DB UserProfile을 클라이언트용 DTO로 변환
 */
export function mapUserProfileForClient(db: UserProfile): ClientUserProfile {
  return {
    id: db.id,
    clerkUserId: db.clerkUserId,
    email: db.email,
    name: db.name,
    mobilePhone: db.mobilePhone,
    imageUrl: db.imageUrl,
    signupMethod: (db.signupMethod as 'email' | 'kakao') || 'email',
    preferences: db.preferences || {},
    createdAt: toISOString(db.createdAt),
    updatedAt: toISOString(db.updatedAt),
  };
}

/**
 * DB UserRole을 클라이언트용 DTO로 변환
 */
export function mapUserRoleForClient(db: UserRole): ClientUserRole {
  return {
    id: db.id,
    clerkUserId: db.clerkUserId,
    role: (db.role as 'customer' | 'admin') || 'customer',
    permissions: db.permissions || {},
    createdAt: toISOString(db.createdAt),
    updatedAt: toISOString(db.updatedAt),
  };
}

/**
 * 사용자 프로필과 역할을 통합 DTO로 변환
 */
export function mapUserForClient(
  profile: UserProfile | null,
  role: UserRole | null
): ClientUser {
  const signupMethod = profile?.signupMethod || 'email';
  
  return {
    profile: profile ? mapUserProfileForClient(profile) : null,
    role: role ? mapUserRoleForClient(role) : null,
    isAdmin: role?.role === 'admin',
    signupMethod: signupMethod as 'email' | 'kakao',
  };
}

/**
 * 회원가입 방법별 통계를 관리자용 DTO로 변환
 */
export function mapUserStatsForAdmin(
  signupMethodCounts: { signupMethod: string; count: string | number }[],
  totalUsers: number
): AdminUserStats {
  const emailSignups = signupMethodCounts.find(s => s.signupMethod === 'email')?.count || 0;
  const kakaoSignups = signupMethodCounts.find(s => s.signupMethod === 'kakao')?.count || 0;
  
  const emailCount = toSafeNumber(emailSignups);
  const kakaoCount = toSafeNumber(kakaoSignups);
  
  return {
    totalUsers,
    emailSignups: emailCount,
    kakaoSignups: kakaoCount,
    adminUsers: 0, // 별도 쿼리 필요
    customerUsers: 0, // 별도 쿼리 필요
    signupMethodBreakdown: [
      {
        method: 'email',
        count: emailCount,
        percentage: totalUsers > 0 ? Math.round((emailCount / totalUsers) * 100) : 0,
      },
      {
        method: 'kakao',
        count: kakaoCount,
        percentage: totalUsers > 0 ? Math.round((kakaoCount / totalUsers) * 100) : 0,
      },
    ],
  };
}
