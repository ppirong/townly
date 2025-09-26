'use server';

import { auth } from '@clerk/nextjs/server';
import { getSavedStation } from '@/actions/airquality';

/**
 * 사용자의 저장된 측정소 정보 조회
 */
export async function getUserStation() {
  const { userId } = await auth();
  
  if (!userId) {
    return null;
  }

  try {
    const station = await getSavedStation();
    return station;
  } catch (error) {
    console.error('사용자 측정소 조회 실패:', error);
    return null;
  }
}
