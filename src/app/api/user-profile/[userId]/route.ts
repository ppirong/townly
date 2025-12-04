import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getUserProfile } from '@/db/queries/user-profiles';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    // 인증된 사용자만 접근 가능
    const { userId: currentUserId } = await auth();
    if (!currentUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userId } = await params;

    // 자신의 프로필만 조회 가능 (또는 관리자 권한 확인)
    if (currentUserId !== userId) {
      // TODO: 관리자 권한 확인 로직 추가 가능
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 프로필 조회
    const profile = await getUserProfile(userId);

    if (!profile) {
      return NextResponse.json({ 
        error: 'Profile not found',
        message: '사용자 프로필을 찾을 수 없습니다'
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      profile: {
        id: profile.id,
        clerkUserId: profile.clerkUserId,
        email: profile.email,
        name: profile.name,
        mobilePhone: profile.mobilePhone,
        imageUrl: profile.imageUrl,
        signupMethod: profile.signupMethod,
        createdAt: profile.createdAt,
        updatedAt: profile.updatedAt
      }
    });

  } catch (error) {
    console.error('❌ 사용자 프로필 조회 실패:', error);
    return NextResponse.json({
      error: 'Internal server error',
      message: error.message
    }, { status: 500 });
  }
}
