'use server';

import { db } from '@/db';
import { martDiscounts, marts } from '@/db/schema';
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

    // 마트 정보 조회하여 이름 가져오기
    const mart = await db
      .select()
      .from(marts)
      .where(eq(marts.id, martId))
      .limit(1);
    
    if (!mart.length) {
      return { success: false, message: '마트 정보를 찾을 수 없습니다.' };
    }
    
    const martName = mart[0].name || '마트';
    
    // 현재 날짜 기준으로 시작일과 종료일 설정
    const today = new Date();
    const startDate = new Date(today);
    const endDate = new Date(today);
    endDate.setDate(today.getDate() + 20); // 종료일: 오늘로부터 20일 후
    
    // 현재 월 구하기
    const month = today.getMonth() + 1; // 0부터 시작하므로 +1
    
    // 같은 월에 등록된 전단지 수 카운트하여 순번 결정
    const existingDiscounts = await db
      .select()
      .from(martDiscounts)
      .where(eq(martDiscounts.martId, martId));
    
    // 같은 월의 전단지 필터링
    const sameMonthDiscounts = existingDiscounts.filter(discount => {
      const discountDate = new Date(discount.createdAt);
      return discountDate.getMonth() + 1 === month;
    });
    
    const discountNumber = sameMonthDiscounts.length + 1;
    
    // 전단지 이름 형식: "마트이름 월 전단지 순번"
    const title = `${martName} ${month}월 전단지 ${discountNumber}`;
    
    // 할인 전단지 생성
    const discountId = crypto.randomUUID();
    
    await db.insert(martDiscounts).values({
      id: discountId,
      martId,
      title,
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
