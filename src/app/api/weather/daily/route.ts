import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getDailyWeather } from '@/lib/services/weather';
import { z } from 'zod';

const dailyWeatherSchema = z.object({
  location: z.string().nullable().optional(),
  latitude: z.string().nullable().optional().transform(val => val ? parseFloat(val) : undefined),
  longitude: z.string().nullable().optional().transform(val => val ? parseFloat(val) : undefined),
  days: z.union([z.literal(1), z.literal(5), z.literal(10), z.literal(15)]).optional().default(5),
  units: z.enum(['metric', 'imperial']).optional().default('metric'),
}).refine(data => (data.location && data.location.trim() !== '') || (data.latitude !== undefined && data.longitude !== undefined), {
  message: '위치명 또는 위도/경도가 필요합니다',
});

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const location = searchParams.get('location');
    const latitude = searchParams.get('latitude');
    const longitude = searchParams.get('longitude');
    const days = searchParams.get('days');
    const units = searchParams.get('units') as 'metric' | 'imperial' | null;

    const validatedParams = dailyWeatherSchema.parse({
      location,
      latitude,
      longitude,
      days: days ? parseInt(days) : 5,
      units: units || 'metric',
    });

    const weatherResponse = await getDailyWeather({
      ...validatedParams,
      location: validatedParams.location || undefined,
    });

    return NextResponse.json({
      success: true,
      data: weatherResponse.dailyForecasts,
      headline: weatherResponse.headline,
    });
  } catch (error) {
    console.error('일별 날씨 조회 실패:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: '잘못된 요청 파라미터', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: '날씨 정보를 가져오는데 실패했습니다' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedParams = dailyWeatherSchema.parse(body);

    const weatherResponse = await getDailyWeather({
      ...validatedParams,
      location: validatedParams.location || undefined,
    });

    return NextResponse.json({
      success: true,
      data: weatherResponse.dailyForecasts,
      headline: weatherResponse.headline,
    });
  } catch (error) {
    console.error('일별 날씨 조회 실패:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: '잘못된 요청 파라미터', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: '날씨 정보를 가져오는데 실패했습니다' },
      { status: 500 }
    );
  }
}
