/**
 * 관리자용 사용자 통계 API
 * 회원가입 방법별 사용자 수 등의 통계를 제공합니다.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getUserRole } from '@/lib/services/user-role-service';
import { db } from '@/db';
import { userProfiles, userRoles } from '@/db/schema';
import { mapUserStatsForAdmin } from '@/lib/dto/user-dto-mappers';
import { sql } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    // 인증 확인
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }

    // 관리자 권한 확인
    const userRoleInfo = await getUserRole(userId);
    if (!userRoleInfo.isAdmin) {
      return NextResponse.json({ error: '관리자 권한이 필요합니다.' }, { status: 403 });
    }

    // 전체 사용자 수 조회
    const totalUsersResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(userProfiles);
    const totalUsers = totalUsersResult[0]?.count || 0;

    // 회원가입 방법별 사용자 수 조회
    const signupMethodStats = await db
      .select({
        signupMethod: userProfiles.signupMethod,
        count: sql<number>`count(*)`,
      })
      .from(userProfiles)
      .groupBy(userProfiles.signupMethod);

    // 역할별 사용자 수 조회
    const roleStats = await db
      .select({
        role: userRoles.role,
        count: sql<number>`count(*)`,
      })
      .from(userRoles)
      .groupBy(userRoles.role);

    // DTO로 변환
    const stats = mapUserStatsForAdmin(signupMethodStats, totalUsers);
    
    // 역할별 통계 추가
    const adminCount = roleStats.find(r => r.role === 'admin')?.count || 0;
    const customerCount = roleStats.find(r => r.role === 'customer')?.count || 0;
    
    stats.adminUsers = adminCount;
    stats.customerUsers = customerCount;

    return NextResponse.json({
      success: true,
      data: stats,
    });

  } catch (error) {
    console.error('사용자 통계 조회 실패:', error);
    return NextResponse.json(
      { error: '사용자 통계를 조회하는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
