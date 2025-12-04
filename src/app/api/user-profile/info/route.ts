import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getUserProfile } from '@/db/queries/user-profiles';

/**
 * 사용자 프로필 기본 정보 조회 API
 * signup_method 등 기본 정보만 반환합니다.
 */
export async function GET(req: NextRequest) {
  try {
    // 인증된 사용자만 접근 가능
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // URL에서 userId 파라미터 추출
    const url = new URL(req.url);
    const targetUserId = url.searchParams.get('userId');

    // 요청한 사용자와 조회 대상이 일치하는지 확인
    if (userId !== targetUserId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!targetUserId) {
      return NextResponse.json({ 
        error: 'Missing userId parameter' 
      }, { status: 400 });
    }

    // 프로필 조회
    const profile = await getUserProfile(targetUserId);

    if (!profile) {
      return NextResponse.json({ 
        error: 'Profile not found' 
      }, { status: 404 });
    }

    return NextResponse.json({
      id: profile.id,
      clerkUserId: profile.clerkUserId,
      email: profile.email,
      name: profile.name,
      signupMethod: profile.signupMethod,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt
    });

  } catch (error) {
    console.error('❌ 프로필 정보 조회 실패:', error);
    
    return NextResponse.json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
