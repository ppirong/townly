'use server';

import { db } from '@/db';
import { marts } from '@/db/schema';
import { auth } from '@clerk/nextjs/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { eq } from 'drizzle-orm';

// 마트 생성/수정을 위한 Zod 스키마
const martSchema = z.object({
  name: z.string().min(1, '마트 이름을 입력해주세요').max(20, '마트 이름은 최대 20자까지 입력 가능합니다'),
  managerName: z.string().min(1, '담당자 이름을 입력해주세요').max(20, '담당자 이름은 최대 20자까지 입력 가능합니다'),
  managerPhone: z.string().min(1, '담당자 연락처를 입력해주세요').regex(/^01([0|1|6|7|8|9])-?([0-9]{3,4})-?([0-9]{4})$/, '올바른 전화번호 형식이 아닙니다'),
  address: z.string().min(1, '마트 주소를 입력해주세요').max(30, '마트 주소는 최대 30자까지 입력 가능합니다'),
  // 위도/경도를 선택사항으로 변경
  latitude: z.string().optional()
    .refine(val => !val || /^-?([1-8]?\d(\.\d+)?|90(\.0+)?)$/.test(val), {
      message: '올바른 위도 형식이 아닙니다 (-90 ~ 90)'
    }),
  longitude: z.string().optional()
    .refine(val => !val || /^-?(180(\.0+)?|((1[0-7]\d)|([1-9]?\d))(\.\d+)?)$/.test(val), {
      message: '올바른 경도 형식이 아닙니다 (-180 ~ 180)'
    }),
  businessHours: z.string().min(1, '영업 시간을 입력해주세요').max(30, '영업 시간은 최대 30자까지 입력 가능합니다'),
  region: z.string().min(1, '지역을 선택해주세요'),
  detailRegion: z.string().min(1, '상세 지역을 선택해주세요'),
});

// 타입 추출
export type MartFormData = z.infer<typeof martSchema>;

/**
 * 마트 등록 서버 액션
 */
export async function createMart(formData: MartFormData) {
  try {
    // 사용자 인증 확인
    const { userId } = await auth();
    
    if (!userId) {
      throw new Error('인증되지 않은 사용자입니다');
    }
    
    // 데이터 검증
    const validatedData = martSchema.parse(formData);
    
    // 마트 데이터 생성
    const result = await db.insert(marts).values({
      id: crypto.randomUUID(),
      name: validatedData.name,
      description: '', // 기본값
      region: `${validatedData.region} ${validatedData.detailRegion}`, // 지역과 상세 지역 결합
      address: validatedData.address,
      phone: validatedData.managerPhone,
      managerName: validatedData.managerName,
      latitude: validatedData.latitude,
      longitude: validatedData.longitude,
      responseTime: validatedData.businessHours, // 영업 시간을 responseTime 필드에 저장
      createdBy: userId,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    
    // 캐시 갱신
    revalidatePath('/admin/mart');
    
    return { success: true, message: '마트가 성공적으로 등록되었습니다' };
  } catch (error) {
    console.error('마트 등록 오류:', error);
    
    if (error instanceof z.ZodError) {
      // Zod 검증 오류
      const errorMessages = error.issues.map(err => `${err.path}: ${err.message}`).join(', ');
      return { success: false, message: `입력 데이터 오류: ${errorMessages}` };
    }
    
    return { success: false, message: error instanceof Error ? error.message : '마트 등록 중 오류가 발생했습니다' };
  }
}

/**
 * 마트 수정 서버 액션
 */
export async function updateMart(martId: string, formData: MartFormData) {
  try {
    // 사용자 인증 확인
    const { userId } = await auth();
    
    if (!userId) {
      throw new Error('인증되지 않은 사용자입니다');
    }
    
    // 데이터 검증
    const validatedData = martSchema.parse(formData);
    
    // 마트 존재 여부 확인
    const existingMart = await db.select().from(marts).where(eq(marts.id, martId));
    
    if (!existingMart || existingMart.length === 0) {
      throw new Error('수정할 마트를 찾을 수 없습니다');
    }
    
    // 마트 데이터 수정
    const result = await db.update(marts)
      .set({
        name: validatedData.name,
        region: `${validatedData.region} ${validatedData.detailRegion}`, // 지역과 상세 지역 결합
        address: validatedData.address,
        phone: validatedData.managerPhone,
        managerName: validatedData.managerName,
        latitude: validatedData.latitude,
        longitude: validatedData.longitude,
        responseTime: validatedData.businessHours, // 영업 시간을 responseTime 필드에 저장
        updatedAt: new Date(),
      })
      .where(eq(marts.id, martId));
    
    // 캐시 갱신
    revalidatePath('/admin/mart');
    
    return { success: true, message: '마트 정보가 성공적으로 수정되었습니다' };
  } catch (error) {
    console.error('마트 수정 오류:', error);
    
    if (error instanceof z.ZodError) {
      // Zod 검증 오류
      const errorMessages = error.issues.map(err => `${err.path}: ${err.message}`).join(', ');
      return { success: false, message: `입력 데이터 오류: ${errorMessages}` };
    }
    
    return { success: false, message: error instanceof Error ? error.message : '마트 수정 중 오류가 발생했습니다' };
  }
}

/**
 * 마트 조회 서버 액션
 */
export async function getMart(martId: string) {
  try {
    // 사용자 인증 확인
    const { userId } = await auth();
    
    if (!userId) {
      throw new Error('인증되지 않은 사용자입니다');
    }
    
    // 마트 데이터 조회
    const mart = await db.select().from(marts).where(eq(marts.id, martId));
    
    if (!mart || mart.length === 0) {
      throw new Error('마트를 찾을 수 없습니다');
    }
    
    return { success: true, data: mart[0] };
  } catch (error) {
    console.error('마트 조회 오류:', error);
    return { success: false, message: error instanceof Error ? error.message : '마트 조회 중 오류가 발생했습니다' };
  }
}

/**
 * 마트 목록 조회 서버 액션
 */
export async function getMartList() {
  try {
    // 사용자 인증 확인
    const { userId } = await auth();
    
    if (!userId) {
      throw new Error('인증되지 않은 사용자입니다');
    }
    
    // 마트 목록 조회
    const martList = await db.select().from(marts).orderBy(marts.createdAt);
    
    return { success: true, data: martList };
  } catch (error) {
    console.error('마트 목록 조회 오류:', error);
    return { success: false, message: error instanceof Error ? error.message : '마트 목록 조회 중 오류가 발생했습니다' };
  }
}
