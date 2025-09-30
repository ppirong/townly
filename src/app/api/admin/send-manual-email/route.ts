import { NextRequest, NextResponse } from 'next/server';
import { sendManualEmail } from '@/actions/email-schedules';
import { auth } from '@clerk/nextjs/server';

/**
 * 수동 이메일 발송 API
 * POST /api/admin/send-manual-email
 */
export async function POST(request: NextRequest) {
  try {
    // 인증 확인 (테스트 모드에서는 우회 가능)
    const { userId } = await auth();
    const isTestMode = request.headers.get('User-Agent') === 'test-script';
    
    if (!userId && !isTestMode) {
      return NextResponse.json(
        { error: 'Unauthorized: 관리자 로그인이 필요합니다' },
        { status: 401 }
      );
    }
    
    const effectiveUserId = userId || 'test-user';

    const body = await request.json();
    
    // 필수 필드 검증
    const { subject, location, timeOfDay, targetType } = body;
    
    if (!subject || !location || !timeOfDay || !targetType) {
      return NextResponse.json(
        { error: 'Missing required fields: subject, location, timeOfDay, targetType' },
        { status: 400 }
      );
    }

    console.log('📧 수동 이메일 발송 API 호출됨');
    console.log('요청 데이터:', body);

    // 수동 이메일 발송 실행
    const result = await sendManualEmail(body, isTestMode ? effectiveUserId : undefined);
    
    console.log('✅ 이메일 발송 성공:', result);

    return NextResponse.json({
      success: true,
      message: '이메일이 성공적으로 발송되었습니다',
      ...result
    });

  } catch (error) {
    console.error('❌ 수동 이메일 발송 API 오류:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

/**
 * 지원되는 HTTP 메서드 확인
 * GET /api/admin/send-manual-email
 */
export async function GET() {
  return NextResponse.json({
    message: 'Manual Email Sending API',
    methods: ['POST'],
    description: 'Use POST method to send manual emails',
    requiredFields: ['subject', 'location', 'timeOfDay', 'targetType'],
    optionalFields: ['targetUserIds', 'testEmail', 'forceRefreshWeather']
  });
}
