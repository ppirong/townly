import { NextRequest, NextResponse } from 'next/server';
import { env } from '@/lib/env';

/**
 * 환경변수 설정 상태를 확인하는 디버그 API
 * GET /api/debug/env-check
 */
export async function GET(request: NextRequest) {
  try {
    const envStatus = {
      accuWeatherApiKey: {
        configured: !!env.ACCUWEATHER_API_KEY,
        keyLength: env.ACCUWEATHER_API_KEY ? env.ACCUWEATHER_API_KEY.length : 0,
        keyPreview: env.ACCUWEATHER_API_KEY ? 
          `${env.ACCUWEATHER_API_KEY.substring(0, 8)}...` : 
          'NOT_SET'
      },
      airKoreaApiKey: {
        configured: !!env.AIRKOREA_API_KEY,
        keyLength: env.AIRKOREA_API_KEY ? env.AIRKOREA_API_KEY.length : 0,
        keyPreview: env.AIRKOREA_API_KEY ? 
          `${env.AIRKOREA_API_KEY.substring(0, 8)}...` : 
          'NOT_SET'
      },
      clerkKeys: {
        publicKey: !!env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
        secretKey: !!env.CLERK_SECRET_KEY
      },
      databaseUrl: {
        configured: !!env.DATABASE_URL,
        preview: env.DATABASE_URL ? 
          `${env.DATABASE_URL.substring(0, 20)}...` : 
          'NOT_SET'
      }
    };

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      environment: env.NODE_ENV,
      envStatus
    });

  } catch (error) {
    console.error('환경변수 확인 실패:', error);
    
    return NextResponse.json(
      { 
        error: '환경변수 확인 실패',
        details: error instanceof Error ? error.message : '알 수 없는 오류'
      },
      { status: 500 }
    );
  }
}
