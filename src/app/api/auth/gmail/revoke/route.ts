import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

/**
 * Gmail 인증 해제
 * POST /api/auth/gmail/revoke
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 실제 운영에서는 다음과 같은 작업을 수행해야 함:
    // 1. 데이터베이스에서 토큰 삭제
    // 2. Google OAuth 서버에 토큰 폐기 요청
    // 3. 관련 권한 정리

    console.log('\n🔓 Gmail 인증 해제 요청');
    console.log('👤 사용자 ID:', userId);
    console.log('📝 작업:');
    console.log('  - .env.local에서 다음 변수들을 제거하세요:');
    console.log('    GMAIL_REFRESH_TOKEN');
    console.log('    GMAIL_ACCESS_TOKEN');
    console.log('  - 또는 빈 값으로 설정하세요\n');

    // 현재는 환경변수 기반이므로 실제 해제는 수동으로 해야 함
    return NextResponse.json({
      success: true,
      message: 'Gmail 인증 해제 처리 완료',
      instructions: [
        '.env.local 파일에서 GMAIL_REFRESH_TOKEN과 GMAIL_ACCESS_TOKEN을 제거하세요',
        '또는 해당 값들을 빈 문자열로 설정하세요',
        '서버를 재시작하면 변경사항이 적용됩니다',
      ],
      note: '보안을 위해 Google 계정 설정에서도 앱 권한을 직접 해제하는 것을 권장합니다',
    });

  } catch (error) {
    console.error('Gmail revoke error:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Gmail 인증 해제 중 오류가 발생했습니다',
    });
  }
}
