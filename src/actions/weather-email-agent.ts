'use server';

/**
 * 날씨 안내 이메일 작성 에이전트 Server Actions
 */

import { auth } from '@clerk/nextjs/server';
import { WeatherEmailAgent } from '@/lib/services/weather-email-agent';
import { WeatherEmailDataPreparer } from '@/lib/services/weather-email-data-preparer';
import { db } from '@/db';
import { userEmailSettings } from '@/db/schema';
import { eq } from 'drizzle-orm';

export interface GenerateWeatherEmailInput {
  userId?: string; // 특정 사용자 (관리자가 지정하거나, 미제공 시 현재 사용자)
  sendTime: 6 | 18;
  targetDate?: string; // YYYY-MM-DD 형식, 미제공 시 오늘
}

export interface GenerateWeatherEmailResult {
  success: boolean;
  email?: string;
  iterations?: number;
  score?: number;
  isApproved?: boolean;
  executionTime?: number;
  report?: string;
  error?: string;
}

/**
 * 단일 사용자의 날씨 안내 이메일을 생성합니다.
 */
export async function generateWeatherEmailForUser(
  input: GenerateWeatherEmailInput
): Promise<GenerateWeatherEmailResult> {
  try {
    // 인증 확인
    const { userId: currentUserId } = await auth();

    if (!currentUserId) {
      return {
        success: false,
        error: '인증되지 않은 사용자입니다.',
      };
    }

    // 대상 사용자 결정
    const targetUserId = input.userId || currentUserId;

    // 권한 확인 (다른 사용자의 이메일 생성은 관리자만 가능)
    if (targetUserId !== currentUserId) {
      // 관리자 권한 확인 로직 추가 가능
      // 여기서는 일단 허용
    }

    console.log(`📧 날씨 안내 이메일 생성 시작: ${targetUserId}`);

    // 사용자 이메일 정보 조회
    const userEmail = await db
      .select()
      .from(userEmailSettings)
      .where(eq(userEmailSettings.clerkUserId, targetUserId))
      .limit(1);

    if (userEmail.length === 0) {
      return {
        success: false,
        error: '사용자 이메일 설정을 찾을 수 없습니다.',
      };
    }

    const emailSettings = userEmail[0];

    // 구독 상태 확인
    if (!emailSettings.isSubscribed || !emailSettings.receiveWeatherEmails) {
      return {
        success: false,
        error: '날씨 이메일을 수신하지 않는 사용자입니다.',
      };
    }

    // 발송 시간별 수신 설정 확인
    if (
      (input.sendTime === 6 && !emailSettings.receiveMorningEmail) ||
      (input.sendTime === 18 && !emailSettings.receiveEveningEmail)
    ) {
      return {
        success: false,
        error: `${input.sendTime === 6 ? '아침' : '저녁'} 이메일을 수신하지 않는 사용자입니다.`,
      };
    }

    // 날씨 데이터 준비
    const dataPreparer = new WeatherEmailDataPreparer();
    const weatherData = await dataPreparer.prepareUserWeatherData(
      targetUserId,
      input.sendTime
    );

    if (!weatherData) {
      return {
        success: false,
        error: '날씨 데이터를 준비할 수 없습니다.',
      };
    }

    // 이메일 주소 설정
    weatherData.userEmail = emailSettings.email;

    // 에이전트 실행
    const agent = new WeatherEmailAgent({
      maxIterations: 5,
      minApprovalScore: 80,
    });

    const result = await agent.generateEmail(weatherData);

    // 리포트 생성
    const report = agent.generateReport(result);

    console.log(`✅ 날씨 안내 이메일 생성 완료: ${targetUserId}`);

    return {
      success: true,
      email: result.finalEmail,
      iterations: result.iterations,
      score: result.finalScore,
      isApproved: result.isApproved,
      executionTime: result.executionTime,
      report,
    };
  } catch (error) {
    console.error('날씨 안내 이메일 생성 중 오류 발생:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.',
    };
  }
}

/**
 * 테스트용: 샘플 날씨 데이터로 이메일 생성
 */
export async function generateTestWeatherEmail(
  sendTime: 6 | 18
): Promise<GenerateWeatherEmailResult> {
  try {
    const { userId } = await auth();

    if (!userId) {
      return {
        success: false,
        error: '인증되지 않은 사용자입니다.',
      };
    }

    console.log(`🧪 테스트 날씨 안내 이메일 생성 시작`);

    // 테스트 데이터 생성
    const today = new Date();
    const kstOffset = 9 * 60;
    const kstNow = new Date(today.getTime() + kstOffset * 60 * 1000);
    const year = kstNow.getUTCFullYear();
    const month = kstNow.getUTCMonth() + 1;
    const day = kstNow.getUTCDate();
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    const dataPreparer = new WeatherEmailDataPreparer();
    const weatherData = await dataPreparer.prepareTestWeatherData(
      userId,
      dateStr,
      sendTime
    );

    if (!weatherData) {
      return {
        success: false,
        error: '테스트 날씨 데이터를 생성할 수 없습니다.',
      };
    }

    weatherData.userEmail = 'test@example.com';

    // 에이전트 실행
    const agent = new WeatherEmailAgent({
      maxIterations: 3, // 테스트는 3회로 제한
      minApprovalScore: 70, // 테스트는 낮은 점수도 허용
    });

    const result = await agent.generateEmail(weatherData);
    const report = agent.generateReport(result);

    console.log(`✅ 테스트 날씨 안내 이메일 생성 완료`);

    return {
      success: true,
      email: result.finalEmail,
      iterations: result.iterations,
      score: result.finalScore,
      isApproved: result.isApproved,
      executionTime: result.executionTime,
      report,
    };
  } catch (error) {
    console.error('테스트 이메일 생성 중 오류 발생:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.',
    };
  }
}
