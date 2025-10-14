'use server';

import { db } from '@/db';
import { martDiscounts, martDiscountItems } from '@/db/schema';
import { auth } from '@clerk/nextjs/server';
import { eq, asc, desc, min, max } from 'drizzle-orm';

/**
 * 할인 전단지의 할인 기간을 등록된 할인 상품 항목의 날짜 범위로 업데이트하는 서버 액션
 * 등록된 할인 상품 항목이 없는 경우 현재 날짜부터 20일 후까지로 설정
 * 
 * 참고: 이 함수는 mart-discounts.ts에도 내부 함수로 구현되어 있으며,
 * 할인 상품 항목이 추가/수정/삭제될 때 자동으로 호출됩니다.
 */
export async function updateDiscountPeriod(discountId: string) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return { success: false, message: 'Unauthorized' };
    }

    // 할인 전단지 존재 확인
    const existingDiscount = await db
      .select()
      .from(martDiscounts)
      .where(eq(martDiscounts.id, discountId))
      .limit(1);

    if (!existingDiscount.length) {
      return { success: false, message: '할인 전단지를 찾을 수 없습니다.' };
    }

    // 할인 상품 항목 조회
    const discountItems = await db
      .select()
      .from(martDiscountItems)
      .where(eq(martDiscountItems.discountId, discountId))
      .orderBy(asc(martDiscountItems.discountDate));

    let startDate: Date;
    let endDate: Date;

    if (discountItems.length > 0) {
      // 등록된 할인 상품 항목이 있는 경우, 가장 빠른 날짜와 가장 늦은 날짜 찾기
      const dates = discountItems.map(item => new Date(item.discountDate));
      startDate = new Date(Math.min(...dates.map(date => date.getTime())));
      endDate = new Date(Math.max(...dates.map(date => date.getTime())));
    } else {
      // 등록된 할인 상품 항목이 없는 경우, 현재 날짜부터 20일 후까지로 설정
      const today = new Date();
      startDate = new Date(today);
      endDate = new Date(today);
      endDate.setDate(today.getDate() + 20);
    }
    
    // 할인 전단지 기간 업데이트
    await db
      .update(martDiscounts)
      .set({
        startDate,
        endDate,
        updatedAt: new Date()
      })
      .where(eq(martDiscounts.id, discountId));

    return { 
      success: true, 
      data: { updated: true, id: discountId, startDate, endDate },
      message: '할인 기간이 성공적으로 업데이트되었습니다.'
    };
  } catch (error) {
    console.error('할인 기간 업데이트 오류:', error);
    return { 
      success: false, 
      message: '할인 기간을 업데이트하는 중 오류가 발생했습니다.' 
    };
  }
}
