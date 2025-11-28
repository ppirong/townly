'use server';

import { auth } from '@clerk/nextjs/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import * as martQueries from '@/db/queries/marts';
import { mapMartForClient, mapMartsForAdmin, type ClientMart, type AdminMart } from '@/lib/dto/mart-dto-mappers';

// 마트 생성/수정을 위한 Zod 스키마
const martSchema = z.object({
  name: z.string().min(1, '마트 이름을 입력해주세요').max(20, '마트 이름은 최대 20자까지 입력 가능합니다'),
  phone: z.string().min(1, '연락처를 입력해주세요').regex(/^01([0|1|6|7|8|9])-?([0-9]{3,4})-?([0-9]{4})$/, '올바른 전화번호 형식이 아닙니다'),
  address: z.string().min(1, '마트 주소를 입력해주세요').max(30, '마트 주소는 최대 30자까지 입력 가능합니다'),
  email: z.string().email('올바른 이메일 형식이 아닙니다').optional(),
  website: z.string().url('올바른 웹사이트 URL이 아닙니다').optional(),
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
export async function createMart(formData: MartFormData): Promise<{ success: boolean; message: string; data?: ClientMart }> {
  try {
    // 사용자 인증 확인
    const { userId } = await auth();
    
    if (!userId) {
      throw new Error('인증되지 않은 사용자입니다');
    }
    
    // 데이터 검증
    const validatedData = martSchema.parse(formData);
    
    // 마트 데이터 생성 (db/queries 사용)
    const newMart = await martQueries.createMart({
      name: validatedData.name,
      description: '', // 기본값
      region: `${validatedData.region} ${validatedData.detailRegion}`, // 지역과 상세 지역 결합
      address: validatedData.address,
      phone: validatedData.phone,
      email: validatedData.email,
      website: validatedData.website,
      latitude: validatedData.latitude,
      longitude: validatedData.longitude,
      responseTime: validatedData.businessHours, // 영업 시간을 responseTime 필드에 저장
      createdBy: userId,
    });
    
    // 캐시 갱신
    revalidatePath('/admin/mart');
    
    // DTO 매퍼를 통해 안전하게 변환
    const clientMart = mapMartForClient(newMart);
    
    return { 
      success: true, 
      message: '마트가 성공적으로 등록되었습니다',
      data: clientMart
    };
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
export async function updateMart(martId: string, formData: MartFormData): Promise<{ success: boolean; message: string; data?: ClientMart }> {
  try {
    // 사용자 인증 확인
    const { userId } = await auth();
    
    if (!userId) {
      throw new Error('인증되지 않은 사용자입니다');
    }
    
    // 데이터 검증
    const validatedData = martSchema.parse(formData);
    
    // 마트 존재 여부 확인 (db/queries 사용)
    const existingMart = await martQueries.getMartById(martId);
    
    if (!existingMart) {
      throw new Error('수정할 마트를 찾을 수 없습니다');
    }
    
    // 마트 데이터 수정 (db/queries 사용)
    const updatedMart = await martQueries.updateMart(martId, {
      name: validatedData.name,
      region: `${validatedData.region} ${validatedData.detailRegion}`, // 지역과 상세 지역 결합
      address: validatedData.address,
      phone: validatedData.phone,
      email: validatedData.email,
      website: validatedData.website,
      latitude: validatedData.latitude,
      longitude: validatedData.longitude,
      responseTime: validatedData.businessHours, // 영업 시간을 responseTime 필드에 저장
    });
    
    if (!updatedMart) {
      throw new Error('마트 수정에 실패했습니다');
    }
    
    // 캐시 갱신
    revalidatePath('/admin/mart');
    
    // DTO 매퍼를 통해 안전하게 변환
    const clientMart = mapMartForClient(updatedMart);
    
    return { 
      success: true, 
      message: '마트 정보가 성공적으로 수정되었습니다',
      data: clientMart
    };
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
export async function getMart(martId: string): Promise<{ success: boolean; message?: string; data?: ClientMart }> {
  try {
    // 사용자 인증 확인
    const { userId } = await auth();
    
    if (!userId) {
      throw new Error('인증되지 않은 사용자입니다');
    }
    
    // 마트 데이터 조회 (db/queries 사용)
    const mart = await martQueries.getMartById(martId);
    
    if (!mart) {
      throw new Error('마트를 찾을 수 없습니다');
    }
    
    // DTO 매퍼를 통해 안전하게 변환
    const clientMart = mapMartForClient(mart);
    
    return { success: true, data: clientMart };
  } catch (error) {
    console.error('마트 조회 오류:', error);
    return { success: false, message: error instanceof Error ? error.message : '마트 조회 중 오류가 발생했습니다' };
  }
}

/**
 * 마트 목록 조회 서버 액션 (관리자용)
 */
export async function getMartList(): Promise<{ success: boolean; message?: string; data?: AdminMart[] }> {
  try {
    // 사용자 인증 확인
    const { userId } = await auth();
    
    if (!userId) {
      throw new Error('인증되지 않은 사용자입니다');
    }
    
    // 마트 목록 조회 (db/queries 사용)
    const martList = await martQueries.getAllMarts();
    
    // DTO 매퍼를 통해 안전하게 변환 (관리자용)
    const adminMartList = mapMartsForAdmin(martList);
    
    return { success: true, data: adminMartList };
  } catch (error) {
    console.error('마트 목록 조회 오류:', error);
    return { success: false, message: error instanceof Error ? error.message : '마트 목록 조회 중 오류가 발생했습니다' };
  }
}
