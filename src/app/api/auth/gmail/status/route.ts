import { NextRequest, NextResponse } from 'next/server';
import { gmailService } from '@/lib/services/gmail-service';
import { auth } from '@clerk/nextjs/server';
import { env } from '@/lib/env';

/**
 * Gmail 인증 상태 확인
 * GET /api/auth/gmail/status
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { isConnected: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 환경변수에 토큰이 설정되어 있는지 확인
    if (!env.GMAIL_REFRESH_TOKEN) {
      return NextResponse.json({
        isConnected: false,
        message: 'Gmail 토큰이 설정되지 않았습니다',
        lastChecked: new Date().toLocaleString('ko-KR'),
      });
    }

    // Gmail 연결 테스트
    const isConnected = await gmailService.testConnection();
    
    if (isConnected) {
      return NextResponse.json({
        isConnected: true,
        email: env.GMAIL_FROM_EMAIL,
        message: 'Gmail 연결이 정상적으로 작동합니다',
        lastChecked: new Date().toLocaleString('ko-KR'),
      });
    } else {
      return NextResponse.json({
        isConnected: false,
        message: 'Gmail 연결에 실패했습니다',
        lastChecked: new Date().toLocaleString('ko-KR'),
      });
    }

  } catch (error) {
    console.error('Gmail status check error:', error);
    
    return NextResponse.json({
      isConnected: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      lastChecked: new Date().toLocaleString('ko-KR'),
    });
  }
}
