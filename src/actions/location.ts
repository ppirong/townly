'use server';

import { db } from '@/db';
import { userLocations } from '@/db/schema';
import { auth } from '@clerk/nextjs/server';
import { eq } from 'drizzle-orm';
import { setUserLocationSchema, updateUserLocationSchema } from '@/lib/schemas/location';
import type { SetUserLocationInput, UpdateUserLocationInput } from '@/lib/schemas/location';

/**
 * 사용자 위치 설정
 */
export async function setUserLocation(input: SetUserLocationInput) {
  const { userId } = await auth();
  
  if (!userId) {
    throw new Error('Unauthorized');
  }
  
  // Zod로 데이터 검증
  const validatedData = setUserLocationSchema.parse(input);
  
  try {
    // 기존 위치 정보가 있는지 확인
    const existingLocation = await db
      .select()
      .from(userLocations)
      .where(eq(userLocations.clerkUserId, userId))
      .limit(1);
    
    if (existingLocation.length > 0) {
      // 기존 위치 정보 업데이트
      const result = await db
        .update(userLocations)
        .set({
          ...validatedData,
          updatedAt: new Date(),
        })
        .where(eq(userLocations.clerkUserId, userId))
        .returning();
      
      return { success: true, data: result[0] };
    } else {
      // 새 위치 정보 생성
      const result = await db
        .insert(userLocations)
        .values({
          ...validatedData,
          clerkUserId: userId,
          isDefault: true,
        })
        .returning();
      
      return { success: true, data: result[0] };
    }
  } catch (error) {
    console.error('위치 설정 실패:', error);
    throw new Error('위치 정보를 저장하는데 실패했습니다.');
  }
}

/**
 * 사용자 위치 조회
 */
export async function getUserLocation() {
  const { userId } = await auth();
  
  if (!userId) {
    throw new Error('Unauthorized');
  }
  
  try {
    const location = await db
      .select()
      .from(userLocations)
      .where(eq(userLocations.clerkUserId, userId))
      .limit(1);
    
    if (location.length === 0) {
      return { success: true, data: null };
    }
    
    // 데이터베이스 결과를 plain object로 변환하여 직렬화 가능하게 만듦
    const loc = location[0];
    return { 
      success: true, 
      data: {
        id: loc.id,
        clerkUserId: loc.clerkUserId,
        locationName: loc.locationName,
        address: loc.address,
        latitude: loc.latitude,
        longitude: loc.longitude,
        isDefault: loc.isDefault,
        createdAt: loc.createdAt,
        updatedAt: loc.updatedAt,
      }
    };
  } catch (error) {
    console.error('위치 조회 실패:', error);
    throw new Error('위치 정보를 조회하는데 실패했습니다.');
  }
}

/**
 * 사용자 위치 업데이트
 */
export async function updateUserLocation(input: UpdateUserLocationInput) {
  const { userId } = await auth();
  
  if (!userId) {
    throw new Error('Unauthorized');
  }
  
  // Zod로 데이터 검증
  const validatedData = updateUserLocationSchema.parse(input);
  
  try {
    // 사용자의 위치 정보가 있는지 확인
    const existingLocation = await db
      .select()
      .from(userLocations)
      .where(eq(userLocations.clerkUserId, userId))
      .limit(1);
    
    if (existingLocation.length === 0) {
      throw new Error('업데이트할 위치 정보가 없습니다.');
    }
    
    const result = await db
      .update(userLocations)
      .set({
        ...validatedData,
        updatedAt: new Date(),
      })
      .where(eq(userLocations.clerkUserId, userId))
      .returning();
    
    return { success: true, data: result[0] };
  } catch (error) {
    console.error('위치 업데이트 실패:', error);
    throw new Error('위치 정보를 업데이트하는데 실패했습니다.');
  }
}

/**
 * 사용자 위치 삭제
 */
export async function deleteUserLocation() {
  const { userId } = await auth();
  
  if (!userId) {
    throw new Error('Unauthorized');
  }
  
  try {
    const result = await db
      .delete(userLocations)
      .where(eq(userLocations.clerkUserId, userId))
      .returning();
    
    if (result.length === 0) {
      throw new Error('삭제할 위치 정보가 없습니다.');
    }
    
    return { success: true, data: result[0] };
  } catch (error) {
    console.error('위치 삭제 실패:', error);
    throw new Error('위치 정보를 삭제하는데 실패했습니다.');
  }
}
