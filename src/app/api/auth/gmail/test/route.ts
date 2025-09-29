import { NextRequest, NextResponse } from 'next/server';
import { gmailService } from '@/lib/services/gmail-service';
import { auth } from '@clerk/nextjs/server';
import { env } from '@/lib/env';

/**
 * Gmail 연결 테스트
 * POST /api/auth/gmail/test
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

    // 환경변수 확인
    if (!env.GMAIL_REFRESH_TOKEN || !env.GMAIL_FROM_EMAIL) {
      return NextResponse.json({
        success: false,
        error: 'Gmail 토큰이 설정되지 않았습니다. 먼저 인증을 완료하세요.',
      });
    }

    // Gmail 연결 테스트
    const isConnected = await gmailService.testConnection();
    
    if (!isConnected) {
      return NextResponse.json({
        success: false,
        error: 'Gmail API 연결에 실패했습니다. 토큰이 만료되었거나 잘못되었을 수 있습니다.',
      });
    }

    // 테스트 이메일 발송 (자기 자신에게)
    const testResult = await gmailService.sendEmail({
      to: env.GMAIL_FROM_EMAIL,
      subject: '[테스트] Gmail API 연결 확인',
      htmlContent: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #4CAF50;">✅ Gmail API 연결 테스트 성공</h2>
          <p>Gmail API가 정상적으로 작동하고 있습니다.</p>
          <p><strong>테스트 시간:</strong> ${new Date().toLocaleString('ko-KR')}</p>
          <p><strong>발송 계정:</strong> ${env.GMAIL_FROM_EMAIL}</p>
          <p style="color: #666; font-size: 14px;">
            이 이메일은 시스템 테스트용으로 자동 발송되었습니다.
          </p>
        </div>
      `,
      textContent: `
Gmail API 연결 테스트 성공

Gmail API가 정상적으로 작동하고 있습니다.
테스트 시간: ${new Date().toLocaleString('ko-KR')}
발송 계정: ${env.GMAIL_FROM_EMAIL}

이 이메일은 시스템 테스트용으로 자동 발송되었습니다.
      `,
    });

    if (testResult.success) {
      return NextResponse.json({
        success: true,
        message: 'Gmail 연결 테스트가 성공했습니다',
        email: env.GMAIL_FROM_EMAIL,
        messageId: testResult.messageId,
        testTime: new Date().toLocaleString('ko-KR'),
      });
    } else {
      return NextResponse.json({
        success: false,
        error: `테스트 이메일 발송 실패: ${testResult.error}`,
      });
    }

  } catch (error) {
    console.error('Gmail test error:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Gmail 테스트 중 오류가 발생했습니다',
    });
  }
}
