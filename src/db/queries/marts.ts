/**
 * 마트 데이터 쿼리 함수들
 * 마스터 규칙: 모든 DB 접근은 db/queries를 통해서만
 */

import { db } from '@/db';
import { marts, type Mart, type NewMart } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';

/**
 * 마트 생성
 */
export async function createMart(data: Omit<NewMart, 'id' | 'createdAt' | 'updatedAt'>) {
  const result = await db.insert(marts).values({
    ...data,
    createdAt: new Date(),
    updatedAt: new Date(),
  }).returning();
  
  return result[0];
}

/**
 * 마트 ID로 조회
 */
export async function getMartById(martId: string) {
  const result = await db
    .select()
    .from(marts)
    .where(eq(marts.id, martId))
    .limit(1);
  
  return result[0] || null;
}

/**
 * 모든 마트 목록 조회 (최신순)
 */
export async function getAllMarts() {
  return await db
    .select()
    .from(marts)
    .orderBy(desc(marts.createdAt));
}

/**
 * 사용자가 생성한 마트 목록 조회
 */
export async function getMartsByCreator(createdBy: string) {
  return await db
    .select()
    .from(marts)
    .where(eq(marts.createdBy, createdBy))
    .orderBy(desc(marts.createdAt));
}

/**
 * 지역별 마트 조회
 */
export async function getMartsByRegion(region: string) {
  return await db
    .select()
    .from(marts)
    .where(eq(marts.region, region))
    .orderBy(desc(marts.createdAt));
}

/**
 * 마트 정보 업데이트
 */
export async function updateMart(
  martId: string, 
  data: Partial<Omit<NewMart, 'id' | 'createdAt' | 'updatedAt'>>
) {
  const result = await db
    .update(marts)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(marts.id, martId))
    .returning();
  
  return result[0] || null;
}

/**
 * 마트 삭제
 */
export async function deleteMart(martId: string) {
  const result = await db
    .delete(marts)
    .where(eq(marts.id, martId))
    .returning();
  
  return result[0] || null;
}

/**
 * 인증된 마트만 조회
 */
export async function getVerifiedMarts() {
  return await db
    .select()
    .from(marts)
    .where(eq(marts.isVerified, true))
    .orderBy(desc(marts.createdAt));
}
