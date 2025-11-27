import { db } from '@/db';
import { userLocations } from '@/db/schema';
import { eq } from 'drizzle-orm';
import type { NewUserLocation } from '@/db/schema';

/**
 * 사용자 위치 정보 조회
 */
export async function getUserLocationByUserId(userId: string) {
  const result = await db
    .select()
    .from(userLocations)
    .where(eq(userLocations.clerkUserId, userId))
    .limit(1);
  
  return result[0] || null;
}

/**
 * 사용자 위치 정보 생성
 */
export async function createUserLocation(data: NewUserLocation) {
  const result = await db
    .insert(userLocations)
    .values(data)
    .returning();
  
  return result[0];
}

/**
 * 사용자 위치 정보 업데이트
 */
export async function updateUserLocationByUserId(
  userId: string, 
  data: Partial<Omit<NewUserLocation, 'clerkUserId'>>
) {
  const result = await db
    .update(userLocations)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(userLocations.clerkUserId, userId))
    .returning();
  
  return result[0] || null;
}

/**
 * 사용자 위치 정보 삭제
 */
export async function deleteUserLocationByUserId(userId: string) {
  const result = await db
    .delete(userLocations)
    .where(eq(userLocations.clerkUserId, userId))
    .returning();
  
  return result[0] || null;
}

/**
 * 사용자 위치 정보 존재 여부 확인
 */
export async function checkUserLocationExists(userId: string): Promise<boolean> {
  const result = await db
    .select({ id: userLocations.id })
    .from(userLocations)
    .where(eq(userLocations.clerkUserId, userId))
    .limit(1);
  
  return result.length > 0;
}
