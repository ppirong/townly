import { NextRequest, NextResponse } from 'next/server';
import { weatherCache } from '@/lib/services/weather-cache';
import { weatherRateLimiter } from '@/lib/services/weather-rate-limiter';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');

  if (type === 'cache') {
    return NextResponse.json({
      cache: weatherCache.getStats(),
    });
  }

  if (type === 'ratelimit') {
    return NextResponse.json({
      rateLimiter: weatherRateLimiter.getStats(),
    });
  }

  return NextResponse.json({
    cache: weatherCache.getStats(),
    rateLimiter: weatherRateLimiter.getStats(),
  });
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');

  if (type === 'cache') {
    weatherCache.clear();
    return NextResponse.json({ message: 'Weather cache cleared', cache: weatherCache.getStats() });
  }

  if (type === 'ratelimit') {
    weatherRateLimiter.reset();
    return NextResponse.json({ message: 'Weather rate limiter reset', rateLimiter: weatherRateLimiter.getStats() });
  }

  return NextResponse.json({ error: 'Invalid type for DELETE operation. Use ?type=cache or ?type=ratelimit' }, { status: 400 });
}
