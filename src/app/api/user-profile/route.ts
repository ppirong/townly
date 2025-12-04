import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createUserProfile } from '@/db/queries/user-profiles';
import { setUserRole } from '@/lib/services/user-role-service';

export async function POST(req: NextRequest) {
  try {
    // 인증된 사용자만 프로필 생성 가능
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { clerkUserId, email, name, mobilePhone, imageUrl, signupMethod } = body;

    // 요청한 사용자와 프로필 생성 대상이 일치하는지 확인
    if (userId !== clerkUserId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 필수 필드 검증
    if (!clerkUserId || !email) {
      return NextResponse.json({ 
        error: 'Missing required fields',
        required: ['clerkUserId', 'email']
      }, { status: 400 });
    }

    console.log('🔄 클라이언트에서 사용자 프로필 생성 요청:', {
      clerkUserId,
      email,
      signupMethod: signupMethod || 'email'
    });

    // 프로필 생성
    const profile = await createUserProfile({
      clerkUserId,
      email,
      name,
      mobilePhone,
      imageUrl,
      signupMethod: signupMethod || 'email'
    });

    // 기본 역할도 설정 (없는 경우에만)
    try {
      await setUserRole(clerkUserId, 'customer');
      console.log('✅ 기본 역할(customer) 설정 완료');
    } catch (roleError) {
      // 이미 역할이 있는 경우 무시
      console.log('ℹ️ 역할 설정 건너뜀 (이미 존재하거나 오류):', roleError.message);
    }

    console.log('✅ 클라이언트에서 사용자 프로필 생성 완료:', profile.id);

    return NextResponse.json({
      success: true,
      profile: {
        id: profile.id,
        clerkUserId: profile.clerkUserId,
        email: profile.email,
        name: profile.name,
        signupMethod: profile.signupMethod,
        createdAt: profile.createdAt
      }
    });

  } catch (error) {
    console.error('❌ 클라이언트 프로필 생성 실패:', error);
    
    // 중복 키 오류 처리
    if (error.message?.includes('duplicate key') || error.code === '23505') {
      return NextResponse.json({
        error: 'Profile already exists',
        message: '이미 프로필이 존재합니다'
      }, { status: 409 });
    }

    return NextResponse.json({
      error: 'Internal server error',
      message: error.message
    }, { status: 500 });
  }
}
