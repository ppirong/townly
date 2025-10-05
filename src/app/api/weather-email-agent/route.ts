/**
 * 날씨 안내 이메일 작성 에이전트 API 엔드포인트
 * 
 * POST /api/weather-email-agent
 * - 특정 사용자의 날씨 안내 이메일 생성
 * 
 * POST /api/weather-email-agent/test
 * - 테스트용 이메일 생성
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { generateWeatherEmailForUser, generateTestWeatherEmail } from '@/actions/weather-email-agent';

/**
 * POST /api/weather-email-agent
 * 특정 사용자의 날씨 안내 이메일을 생성합니다.
 */
export async function POST(request: NextRequest) {
  try {
    // 인증 확인
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { success: false, error: '인증되지 않은 사용자입니다.' },
        { status: 401 }
      );
    }

    // 요청 본문 파싱
    const body = await request.json();
    const { userId: targetUserId, sendTime, targetDate } = body;

    // 입력 검증
    if (!sendTime || (sendTime !== 6 && sendTime !== 18)) {
      return NextResponse.json(
        { success: false, error: 'sendTime은 6 또는 18이어야 합니다.' },
        { status: 400 }
      );
    }

    // Server Action 호출
    const result = await generateWeatherEmailForUser({
      userId: targetUserId,
      sendTime,
      targetDate,
    });

    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error('API 처리 중 오류 발생:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '서버 오류가 발생했습니다.',
      },
      { status: 500 }
    );
  }
}
