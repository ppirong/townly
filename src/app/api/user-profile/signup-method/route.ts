import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { updateUserProfile } from '@/db/queries/user-profiles';

/**
 * 사용자 프로필의 signup_method만 업데이트하는 API
 * 카카오 계정 감지 후 signup_method를 수정할 때 사용합니다.
 */
export async function PATCH(req: NextRequest) {
  try {
    // 인증된 사용자만 접근 가능
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { clerkUserId, signupMethod } = body;

    // 요청한 사용자와 업데이트 대상이 일치하는지 확인
    if (userId !== clerkUserId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 필수 필드 검증
    if (!clerkUserId || !signupMethod) {
      return NextResponse.json({ 
        error: 'Missing required fields',
        required: ['clerkUserId', 'signupMethod']
      }, { status: 400 });
    }

    // signupMethod 값 검증
    if (signupMethod !== 'email' && signupMethod !== 'kakao') {
      return NextResponse.json({ 
        error: 'Invalid signupMethod',
        allowed: ['email', 'kakao']
      }, { status: 400 });
    }

    console.log('🔧 signup_method 업데이트 요청:', {
      clerkUserId,
      signupMethod
    });

    // 프로필 업데이트 (signup_method만)
    const updatedProfile = await updateUserProfile(clerkUserId, {
      signupMethod
    });

    console.log('✅ signup_method 업데이트 완료:', {
      profileId: updatedProfile.id,
      signupMethod: updatedProfile.signupMethod
    });

    return NextResponse.json({
      success: true,
      profile: {
        id: updatedProfile.id,
        signupMethod: updatedProfile.signupMethod,
        updatedAt: updatedProfile.updatedAt
      }
    });

  } catch (error) {
    console.error('❌ signup_method 업데이트 실패:', error);
    
    return NextResponse.json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
