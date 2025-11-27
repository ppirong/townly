'use server';

import { auth } from '@clerk/nextjs/server';
import { setUserLocationSchema, updateUserLocationSchema } from '@/lib/schemas/location';
import type { SetUserLocationInput, UpdateUserLocationInput } from '@/lib/schemas/location';
import {
  getUserLocationByUserId,
  createUserLocation,
  updateUserLocationByUserId,
  deleteUserLocationByUserId,
  checkUserLocationExists
} from '@/db/queries/locations';
import { mapUserLocationForClient, mapLocationInputForDB } from '@/lib/dto/location-mappers';
import type { ClientUserLocation } from '@/lib/dto/location-mappers';

/**
 * 사용자 위치 설정
 */
export async function setUserLocation(input: SetUserLocationInput): Promise<{
  success: boolean;
  data: ClientUserLocation;
}> {
  const { userId } = await auth();
  
  if (!userId) {
    throw new Error('Unauthorized');
  }
  
  // Zod로 데이터 검증
  const validatedData = setUserLocationSchema.parse(input);
  
  try {
    // 기존 위치 정보가 있는지 확인
    const existsLocation = await checkUserLocationExists(userId);
    
    if (existsLocation) {
      // 기존 위치 정보 업데이트
      const result = await updateUserLocationByUserId(userId, validatedData);
      if (!result) {
        throw new Error('위치 정보 업데이트에 실패했습니다.');
      }
      return { success: true, data: mapUserLocationForClient(result) };
    } else {
      // 새 위치 정보 생성
      const dbData = mapLocationInputForDB(validatedData, userId);
      const result = await createUserLocation(dbData);
      return { success: true, data: mapUserLocationForClient(result) };
    }
  } catch (error) {
    console.error('위치 설정 실패:', error);
    throw new Error('위치 정보를 저장하는데 실패했습니다.');
  }
}

/**
 * 사용자 위치 조회
 */
export async function getUserLocation(): Promise<{
  success: boolean;
  data: ClientUserLocation | null;
}> {
  const { userId } = await auth();
  
  if (!userId) {
    throw new Error('Unauthorized');
  }
  
  try {
    const location = await getUserLocationByUserId(userId);
    
    if (!location) {
      return { success: true, data: null };
    }
    
    return { 
      success: true, 
      data: mapUserLocationForClient(location)
    };
  } catch (error) {
    console.error('위치 조회 실패:', error);
    throw new Error('위치 정보를 조회하는데 실패했습니다.');
  }
}

/**
 * 사용자 위치 업데이트
 */
export async function updateUserLocation(input: UpdateUserLocationInput): Promise<{
  success: boolean;
  data: ClientUserLocation;
}> {
  const { userId } = await auth();
  
  if (!userId) {
    throw new Error('Unauthorized');
  }
  
  // Zod로 데이터 검증
  const validatedData = updateUserLocationSchema.parse(input);
  
  try {
    // 사용자의 위치 정보가 있는지 확인
    const existsLocation = await checkUserLocationExists(userId);
    
    if (!existsLocation) {
      throw new Error('업데이트할 위치 정보가 없습니다.');
    }
    
    const result = await updateUserLocationByUserId(userId, validatedData);
    
    if (!result) {
      throw new Error('위치 정보 업데이트에 실패했습니다.');
    }
    
    return { success: true, data: mapUserLocationForClient(result) };
  } catch (error) {
    console.error('위치 업데이트 실패:', error);
    throw new Error('위치 정보를 업데이트하는데 실패했습니다.');
  }
}

/**
 * 사용자 위치 삭제
 */
export async function deleteUserLocation(): Promise<{
  success: boolean;
  data: ClientUserLocation;
}> {
  const { userId } = await auth();
  
  if (!userId) {
    throw new Error('Unauthorized');
  }
  
  try {
    const result = await deleteUserLocationByUserId(userId);
    
    if (!result) {
      throw new Error('삭제할 위치 정보가 없습니다.');
    }
    
    return { success: true, data: mapUserLocationForClient(result) };
  } catch (error) {
    console.error('위치 삭제 실패:', error);
    throw new Error('위치 정보를 삭제하는데 실패했습니다.');
  }
}
