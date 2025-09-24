import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { checkWeatherServiceHealth } from '@/lib/services/weather';
import { env } from '@/lib/env';

export async function GET() {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isHealthy = await checkWeatherServiceHealth();
    const hasApiKey = !!env.ACCUWEATHER_API_KEY;

    return NextResponse.json({
      success: true,
      data: {
        status: isHealthy ? 'healthy' : 'unhealthy',
        accuweatherApiKeyConfigured: hasApiKey,
        timestamp: new Date().toISOString(),
        service: 'MCP Weather Server',
      },
    });
  } catch (error) {
    console.error('Weather Service 상태 확인 실패:', error);
    
    return NextResponse.json({
      success: false,
      data: {
        status: 'unhealthy',
        accuweatherApiKeyConfigured: !!env.ACCUWEATHER_API_KEY,
        timestamp: new Date().toISOString(),
        service: 'MCP Weather Server',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
    }, { status: 500 });
  }
}
