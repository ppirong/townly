import { NextResponse } from 'next/server';
import { env } from '@/lib/env';
import { getBaseUrl } from '@/lib/utils';

/**
 * Health Check API 엔드포인트
 * GET /api/health
 */
export async function GET() {
  try {
    const baseUrl = getBaseUrl();
    const timestamp = new Date().toISOString();
    
    // 기본 환경 정보
    const healthInfo = {
      status: 'healthy',
      service: 'Townly API',
      version: '1.0.0',
      timestamp,
      environment: process.env.NODE_ENV,
      baseUrl,
      endpoints: {
        webhook: `${baseUrl}/api/kakao/webhook`,
        chatbotStatus: `${baseUrl}/api/chatbot/status`,
        health: `${baseUrl}/api/health`
      },
      services: {
        openai: env.OPENAI_API_KEY ? 'configured' : 'not_configured',
        kakao: env.KAKAO_API_KEY ? 'configured' : 'not_configured',
        clerk: env.CLERK_SECRET_KEY ? 'configured' : 'not_configured',
      }
    };

    // 프로덕션에서는 민감한 정보 제외
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({
        status: healthInfo.status,
        service: healthInfo.service,
        version: healthInfo.version,
        timestamp: healthInfo.timestamp,
        environment: healthInfo.environment,
        baseUrl: healthInfo.baseUrl
      });
    }

    // 개발 환경에서는 상세 정보 포함
    return NextResponse.json(healthInfo);

  } catch (error) {
    console.error('Health check failed:', error);
    
    return NextResponse.json(
      {
        status: 'unhealthy',
        service: 'Townly API',
        timestamp: new Date().toISOString(),
        error: process.env.NODE_ENV === 'development' 
          ? (error as Error).message 
          : 'Internal server error'
      },
      { status: 500 }
    );
  }
}
