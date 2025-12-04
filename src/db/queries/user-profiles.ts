/**
 * 사용자 프로필 관련 데이터베이스 쿼리 함수들
 * 데이터베이스 마스터 규칙을 준수합니다.
 */

import { db } from '@/db';
import { userProfiles, userRoles } from '@/db/schema';
import { eq } from 'drizzle-orm';

/**
 * 사용자 프로필 생성
 */
export async function createUserProfile(data: {
  clerkUserId: string;
  email: string;
  name?: string;
  mobilePhone?: string;
  imageUrl?: string;
  signupMethod: 'email' | 'kakao';
}) {
  try {
    const result = await db.insert(userProfiles).values({
      clerkUserId: data.clerkUserId,
      email: data.email,
      name: data.name,
      mobilePhone: data.mobilePhone,
      imageUrl: data.imageUrl,
      signupMethod: data.signupMethod,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();

    return result[0];
  } catch (error) {
    console.error('사용자 프로필 생성 실패:', error);
    throw new Error('사용자 프로필 생성 중 오류가 발생했습니다.');
  }
}

/**
 * 사용자 프로필 조회
 */
export async function getUserProfile(clerkUserId: string) {
  try {
    const result = await db
      .select()
      .from(userProfiles)
      .where(eq(userProfiles.clerkUserId, clerkUserId))
      .limit(1);

    return result[0] || null;
  } catch (error) {
    console.error('사용자 프로필 조회 실패:', error);
    return null;
  }
}

/**
 * 사용자 프로필 업데이트
 */
export async function updateUserProfile(
  clerkUserId: string,
  data: Partial<{
    email: string;
    name: string;
    mobilePhone: string;
    imageUrl: string;
    signupMethod: 'email' | 'kakao';
    preferences: any;
  }>
) {
  try {
    const result = await db
      .update(userProfiles)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(userProfiles.clerkUserId, clerkUserId))
      .returning();

    return result[0];
  } catch (error) {
    console.error('사용자 프로필 업데이트 실패:', error);
    throw new Error('사용자 프로필 업데이트 중 오류가 발생했습니다.');
  }
}

/**
 * 사용자 프로필과 역할 정보를 함께 조회
 */
export async function getUserProfileWithRole(clerkUserId: string) {
  try {
    const profileResult = await db
      .select()
      .from(userProfiles)
      .where(eq(userProfiles.clerkUserId, clerkUserId))
      .limit(1);

    const roleResult = await db
      .select()
      .from(userRoles)
      .where(eq(userRoles.clerkUserId, clerkUserId))
      .limit(1);

    return {
      profile: profileResult[0] || null,
      role: roleResult[0] || null,
    };
  } catch (error) {
    console.error('사용자 프로필과 역할 조회 실패:', error);
    return {
      profile: null,
      role: null,
    };
  }
}

/**
 * 회원가입 방법별 사용자 수 조회
 */
export async function getUserCountBySignupMethod() {
  try {
    const result = await db
      .select({
        signupMethod: userProfiles.signupMethod,
        count: db.$count(userProfiles.id),
      })
      .from(userProfiles)
      .groupBy(userProfiles.signupMethod);

    return result;
  } catch (error) {
    console.error('회원가입 방법별 사용자 수 조회 실패:', error);
    return [];
  }
}
