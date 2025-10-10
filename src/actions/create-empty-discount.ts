'use server';

import { db } from '@/db';
import { martDiscounts } from '@/db/schema';
import { auth } from '@clerk/nextjs/server';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';

/**
 * 빈 할인 전단지를 생성하는 서버 액션
 * 할인 전단지 등록 버튼 클릭 시 사용됨
 */
export async function createEmptyDiscount(martId: string) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return { success: false, message: 'Unauthorized' };
    }

    // 현재 날짜 기준으로 시작일과 종료일 설정 (기본값)
    const today = new Date();
    const startDate = new Date(today);
    const endDate = new Date(today);
    endDate.setDate(today.getDate() + 7); // 기본 종료일: 오늘로부터 7일 후
    
    // 빈 할인 전단지 생성
    const discountId = crypto.randomUUID();
    
    await db.insert(martDiscounts).values({
      id: discountId,
      martId,
      title: '새 할인 전단지',
      description: null,
      startDate,
      endDate,
      discountRate: null,
    });

    return { 
      success: true, 
      data: { id: discountId },
      message: '할인 전단지가 생성되었습니다.'
    };
  } catch (error) {
    console.error('할인 전단지 생성 오류:', error);
    return { 
      success: false, 
      message: '할인 전단지를 생성하는 중 오류가 발생했습니다.' 
    };
  }
}
