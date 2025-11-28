'use server';

import { db } from '@/db';
import { martDiscounts, martDiscountItems, marts } from '@/db/schema';
import { auth } from '@clerk/nextjs/server';
import { eq, desc, asc } from 'drizzle-orm';
import { z } from 'zod';
import crypto from 'crypto';

// 상품 정보 스키마
const productSchema = z.object({
  name: z.string().min(1, '상품명을 입력해주세요'),
  price: z.string().min(1, '가격을 입력해주세요'),
});

// 할인 전단지 생성 스키마
const createDiscountSchema = z.object({
  title: z.string().min(1, '제목을 입력해주세요').max(100, '제목은 100자 이내로 입력해주세요'),
  description: z.string().optional(),
  startDate: z.date(),
  endDate: z.date(),
  discountRate: z.string().optional(),
  imageUrl: z.string().optional(),
});

// 할인 전단지 수정 스키마
const updateDiscountSchema = createDiscountSchema.partial();

// 할인 상품 항목 생성 스키마
const createDiscountItemSchema = z.object({
  discountId: z.string().uuid('유효한 할인 전단지 ID가 필요합니다'),
  discountDate: z.date(),
  title: z.string().min(1, '제목을 입력해주세요').max(100, '제목은 100자 이내로 입력해주세요'),
  description: z.string().optional(),
  imageUrl: z.string().optional(),
  originalImageUrl: z.string().optional(),
  imageSize: z.number().optional(),
  products: z.array(productSchema).optional().default([]),
  originalProducts: z.array(productSchema).optional().default([]),
  ocrAnalyzed: z.boolean().optional().default(false),
});

// 할인 상품 항목 수정 스키마
const updateDiscountItemSchema = createDiscountItemSchema.partial().omit({ discountId: true });

export type CreateDiscountInput = z.infer<typeof createDiscountSchema>;
export type UpdateDiscountInput = z.infer<typeof updateDiscountSchema>;
export type CreateDiscountItemInput = z.infer<typeof createDiscountItemSchema>;
export type UpdateDiscountItemInput = z.infer<typeof updateDiscountItemSchema>;

/**
 * 할인 상품 항목 기반으로 할인 전단지의 기간을 업데이트하는 내부 함수
 */
async function updateDiscountPeriodBasedOnItems(discountId: string) {
  try {
    // 할인 상품 항목 조회
    const discountItems = await db
      .select()
      .from(martDiscountItems)
      .where(eq(martDiscountItems.discountId, discountId))
      .orderBy(asc(martDiscountItems.discountDate));

    // 항목이 없는 경우 업데이트하지 않음
    if (discountItems.length === 0) {
      return;
    }

    // 가장 빠른 날짜와 가장 늦은 날짜 찾기
    const dates = discountItems.map(item => new Date(item.discountDate));
    const startDate = new Date(Math.min(...dates.map(date => date.getTime())));
    const endDate = new Date(Math.max(...dates.map(date => date.getTime())));

    // 할인 전단지 기간 업데이트
    await db
      .update(martDiscounts)
      .set({
        startDate,
        endDate,
        updatedAt: new Date()
      })
      .where(eq(martDiscounts.id, discountId));

    return { success: true };
  } catch (error) {
    console.error('할인 기간 자동 업데이트 오류:', error);
    return { success: false };
  }
}

/**
 * 마트의 할인 전단지 목록 조회
 */
export async function getMartDiscounts(martId: string) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return { success: false, message: 'Unauthorized' };
    }

    // 마트 소유권 확인
    const mart = await db
      .select()
      .from(marts)
      .where(eq(marts.id, martId))
      .limit(1);

    if (!mart.length) {
      return { success: false, message: '마트를 찾을 수 없습니다.' };
    }

    // 할인 전단지 조회 (최신순)
    const discounts = await db
      .select()
      .from(martDiscounts)
      .where(eq(martDiscounts.martId, martId))
      .orderBy(desc(martDiscounts.startDate));

    return { 
      success: true, 
      data: discounts,
      message: '할인 전단지 목록을 성공적으로 조회했습니다.'
    };
  } catch (error) {
    console.error('할인 전단지 조회 오류:', error);
    return { 
      success: false, 
      message: '할인 전단지를 조회하는 중 오류가 발생했습니다.' 
    };
  }
}

/**
 * 할인 전단지 생성
 */
export async function createMartDiscount(martId: string, input: CreateDiscountInput) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return { success: false, message: 'Unauthorized' };
    }

    // 입력 데이터 검증
    const validatedData = createDiscountSchema.parse(input);

    // 시작일이 종료일보다 이후인지 확인
    if (validatedData.startDate > validatedData.endDate) {
      return { success: false, message: '시작 날짜는 종료 날짜보다 이전이어야 합니다.' };
    }

    // 마트 소유권 확인
    const mart = await db
      .select()
      .from(marts)
      .where(eq(marts.id, martId))
      .limit(1);

    if (!mart.length) {
      return { success: false, message: '마트를 찾을 수 없습니다.' };
    }

    // 할인 전단지 생성
    const discountId = crypto.randomUUID();
    
    await db.insert(martDiscounts).values({
      id: discountId,
      martId,
      title: validatedData.title,
      description: validatedData.description || null,
      startDate: validatedData.startDate,
      endDate: validatedData.endDate,
      discountRate: validatedData.discountRate || null,
    });

    return { 
      success: true, 
      data: { id: discountId },
      message: '할인 전단지가 성공적으로 등록되었습니다.'
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { 
        success: false, 
        message: error.issues[0]?.message || '입력 데이터가 올바르지 않습니다.' 
      };
    }

    console.error('할인 전단지 생성 오류:', error);
    return { 
      success: false, 
      message: '할인 전단지를 등록하는 중 오류가 발생했습니다.' 
    };
  }
}

/**
 * 할인 전단지 수정
 */
export async function updateMartDiscount(discountId: string, input: UpdateDiscountInput) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return { success: false, message: 'Unauthorized' };
    }

    // 입력 데이터 검증
    const validatedData = updateDiscountSchema.parse(input);

    // 시작일과 종료일이 모두 제공된 경우, 시작일이 종료일보다 이후인지 확인
    if (validatedData.startDate && validatedData.endDate && validatedData.startDate > validatedData.endDate) {
      return { success: false, message: '시작 날짜는 종료 날짜보다 이전이어야 합니다.' };
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

    // 업데이트할 데이터 준비 (명시적 타입 지정)
    const updateData: Partial<typeof martDiscounts.$inferInsert> = {
      ...validatedData,
      updatedAt: new Date(),
    };

    // 할인 전단지 수정
    await db
      .update(martDiscounts)
      .set(updateData)
      .where(eq(martDiscounts.id, discountId));

    return { 
      success: true, 
      data: { updated: true, id: discountId },
      message: '할인 전단지가 성공적으로 수정되었습니다.'
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { 
        success: false, 
        message: error.issues[0]?.message || '입력 데이터가 올바르지 않습니다.' 
      };
    }

    console.error('할인 전단지 수정 오류:', error);
    return { 
      success: false, 
      message: '할인 전단지를 수정하는 중 오류가 발생했습니다.' 
    };
  }
}

/**
 * 할인 전단지 삭제
 */
export async function deleteMartDiscount(discountId: string) {
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

    // 할인 전단지 삭제 (관련 할인 상품 항목은 CASCADE로 자동 삭제됨)
    await db
      .delete(martDiscounts)
      .where(eq(martDiscounts.id, discountId));

    return { 
      success: true, 
      data: { deleted: true, id: discountId },
      message: '할인 전단지가 성공적으로 삭제되었습니다.'
    };
  } catch (error) {
    console.error('할인 전단지 삭제 오류:', error);
    return { 
      success: false, 
      message: '할인 전단지를 삭제하는 중 오류가 발생했습니다.' 
    };
  }
}

/**
 * 특정 할인 전단지 조회
 */
export async function getMartDiscount(discountId: string) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return { success: false, message: 'Unauthorized' };
    }

    // 할인 전단지 조회
    const discount = await db
      .select()
      .from(martDiscounts)
      .where(eq(martDiscounts.id, discountId))
      .limit(1);

    if (!discount.length) {
      return { success: false, message: '할인 전단지를 찾을 수 없습니다.' };
    }

    return { 
      success: true, 
      data: discount[0],
      message: '할인 전단지를 성공적으로 조회했습니다.'
    };
  } catch (error) {
    console.error('할인 전단지 조회 오류:', error);
    return { 
      success: false, 
      message: '할인 전단지를 조회하는 중 오류가 발생했습니다.' 
    };
  }
}

/**
 * 할인 상품 항목 생성
 */
export async function createDiscountItem(input: CreateDiscountItemInput) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return { success: false, message: 'Unauthorized' };
    }

    // 입력 데이터 검증
    const validatedData = createDiscountItemSchema.parse(input);

    // 할인 전단지 존재 확인
    const discount = await db
      .select()
      .from(martDiscounts)
      .where(eq(martDiscounts.id, validatedData.discountId))
      .limit(1);

    if (!discount.length) {
      return { success: false, message: '할인 전단지를 찾을 수 없습니다.' };
    }

    // 할인 날짜 검증 제거 - 사용자가 원하는 날짜에 할인 정보를 등록할 수 있도록 함
    // 대신 할인 정보가 추가될 때마다 전단지의 할인 기간이 자동으로 업데이트됨

    // 할인 상품 항목 생성
    const itemId = crypto.randomUUID();
    
    await db.insert(martDiscountItems).values({
      id: itemId,
      discountId: validatedData.discountId,
      discountDate: validatedData.discountDate,
      title: validatedData.title,
      description: validatedData.description || null,
      imageUrl: validatedData.imageUrl || null,
      originalImageUrl: validatedData.originalImageUrl || null,
      imageSize: validatedData.imageSize || null,
      products: validatedData.products || [],
      originalProducts: validatedData.originalProducts || [],
      ocrAnalyzed: validatedData.ocrAnalyzed || false,
    });

    // 할인 상품 항목 추가 후 전단지의 할인 기간 자동 업데이트
    await updateDiscountPeriodBasedOnItems(validatedData.discountId);

    return { 
      success: true, 
      data: { id: itemId },
      message: '할인 상품 항목이 성공적으로 등록되었습니다.'
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { 
        success: false, 
        message: error.issues[0]?.message || '입력 데이터가 올바르지 않습니다.' 
      };
    }

    console.error('할인 상품 항목 생성 오류:', error);
    return { 
      success: false, 
      message: '할인 상품 항목을 등록하는 중 오류가 발생했습니다.' 
    };
  }
}

/**
 * 할인 상품 항목 수정
 */
export async function updateDiscountItem(itemId: string, input: UpdateDiscountItemInput) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return { success: false, message: 'Unauthorized' };
    }

    // 입력 데이터 검증
    const validatedData = updateDiscountItemSchema.parse(input);

    // 할인 상품 항목 존재 확인
    const existingItem = await db
      .select()
      .from(martDiscountItems)
      .where(eq(martDiscountItems.id, itemId))
      .limit(1);

    if (!existingItem.length) {
      return { success: false, message: '할인 상품 항목을 찾을 수 없습니다.' };
    }

    // 할인 날짜 검증 제거 - 날짜 변경 시에도 제약 없이 수정 가능하도록 함

    // 업데이트할 데이터 준비
    const updateData: Partial<UpdateDiscountItemInput> & { updatedAt: Date } = {
      ...validatedData,
      updatedAt: new Date(),
    };

    // 할인 상품 항목 수정
    await db
      .update(martDiscountItems)
      .set(updateData)
      .where(eq(martDiscountItems.id, itemId));

    // 날짜가 변경된 경우 전단지의 할인 기간도 자동 업데이트
    if (validatedData.discountDate) {
      await updateDiscountPeriodBasedOnItems(existingItem[0].discountId);
    }

    return { 
      success: true, 
      data: { updated: true, id: itemId },
      message: '할인 상품 항목이 성공적으로 수정되었습니다.'
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { 
        success: false, 
        message: error.issues[0]?.message || '입력 데이터가 올바르지 않습니다.' 
      };
    }

    console.error('할인 상품 항목 수정 오류:', error);
    return { 
      success: false, 
      message: '할인 상품 항목을 수정하는 중 오류가 발생했습니다.' 
    };
  }
}

/**
 * 할인 상품 항목 삭제
 */
export async function deleteDiscountItem(itemId: string) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return { success: false, message: 'Unauthorized' };
    }

    // 할인 상품 항목 존재 확인
    const existingItem = await db
      .select()
      .from(martDiscountItems)
      .where(eq(martDiscountItems.id, itemId))
      .limit(1);

    if (!existingItem.length) {
      return { success: false, message: '할인 상품 항목을 찾을 수 없습니다.' };
    }

    const discountId = existingItem[0].discountId;

    // 할인 상품 항목 삭제
    await db
      .delete(martDiscountItems)
      .where(eq(martDiscountItems.id, itemId));

    // 항목 삭제 후 전단지의 할인 기간 자동 업데이트
    await updateDiscountPeriodBasedOnItems(discountId);

    return { 
      success: true, 
      data: { deleted: true, id: itemId },
      message: '할인 상품 항목이 성공적으로 삭제되었습니다.'
    };
  } catch (error) {
    console.error('할인 상품 항목 삭제 오류:', error);
    return { 
      success: false, 
      message: '할인 상품 항목을 삭제하는 중 오류가 발생했습니다.' 
    };
  }
}

/**
 * 할인 전단지의 할인 상품 항목 목록 조회
 */
export async function getDiscountItems(discountId: string) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return { success: false, message: 'Unauthorized' };
    }

    // 할인 전단지 존재 확인
    const discount = await db
      .select()
      .from(martDiscounts)
      .where(eq(martDiscounts.id, discountId))
      .limit(1);

    if (!discount.length) {
      return { success: false, message: '할인 전단지를 찾을 수 없습니다.' };
    }

    // 할인 상품 항목 조회 (날짜순)
    const items = await db
      .select()
      .from(martDiscountItems)
      .where(eq(martDiscountItems.discountId, discountId))
      .orderBy(desc(martDiscountItems.discountDate));

    return { 
      success: true, 
      data: items,
      message: '할인 상품 항목 목록을 성공적으로 조회했습니다.'
    };
  } catch (error) {
    console.error('할인 상품 항목 조회 오류:', error);
    return { 
      success: false, 
      message: '할인 상품 항목을 조회하는 중 오류가 발생했습니다.' 
    };
  }
}

/**
 * 특정 할인 상품 항목 조회
 */
export async function getDiscountItem(itemId: string) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return { success: false, message: 'Unauthorized' };
    }

    // 할인 상품 항목 조회
    const item = await db
      .select()
      .from(martDiscountItems)
      .where(eq(martDiscountItems.id, itemId))
      .limit(1);

    if (!item.length) {
      return { success: false, message: '할인 상품 항목을 찾을 수 없습니다.' };
    }

    return { 
      success: true, 
      data: item[0],
      message: '할인 상품 항목을 성공적으로 조회했습니다.'
    };
  } catch (error) {
    console.error('할인 상품 항목 조회 오류:', error);
    return { 
      success: false, 
      message: '할인 상품 항목을 조회하는 중 오류가 발생했습니다.' 
    };
  }
}

/**
 * 할인 전단지와 할인 상품 항목을 함께 조회
 */
export async function getDiscountWithItems(discountId: string) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return { success: false, message: 'Unauthorized' };
    }

    // 할인 전단지 조회
    const discount = await db
      .select()
      .from(martDiscounts)
      .where(eq(martDiscounts.id, discountId))
      .limit(1);

    if (!discount.length) {
      return { success: false, message: '할인 전단지를 찾을 수 없습니다.' };
    }

    // 할인 상품 항목 조회
    const items = await db
      .select()
      .from(martDiscountItems)
      .where(eq(martDiscountItems.discountId, discountId))
      .orderBy(desc(martDiscountItems.discountDate));

    return { 
      success: true, 
      data: {
        discount: discount[0],
        items: items
      },
      message: '할인 전단지와 할인 상품 항목을 성공적으로 조회했습니다.'
    };
  } catch (error) {
    console.error('할인 전단지 조회 오류:', error);
    return { 
      success: false, 
      message: '할인 전단지를 조회하는 중 오류가 발생했습니다.' 
    };
  }
}