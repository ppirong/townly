/**
 * 날씨 API 응답 캐싱 시스템
 * 메모리 기반 캐시로 API 호출 횟수를 줄이고 성능을 향상시킵니다.
 */

interface CacheEntry<T> {
  value: T;
  expiry: number; // Unix timestamp in milliseconds
}

class WeatherCache {
  private cache: Map<string, CacheEntry<any>>;

  constructor() {
    this.cache = new Map();
    // 1분마다 만료된 캐시 항목 정리
    setInterval(() => this.cleanup(), 60 * 1000); 
  }

  get<T>(key: string): T | undefined {
    const entry = this.cache.get(key);
    if (!entry) {
      return undefined;
    }
    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return undefined;
    }
    return entry.value;
  }

  set<T>(key: string, value: T, ttlMinutes: number): void {
    const expiry = Date.now() + ttlMinutes * 60 * 1000;
    this.cache.set(key, { value, expiry });
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  clearAll(): void {
    this.cache.clear();
  }

  // 캐시 키 생성 헬퍼 함수들
  getLocationKeyCacheKey(location?: string, latitude?: number, longitude?: number): string {
    if (location) return `locationKey:${location}`;
    if (latitude !== undefined && longitude !== undefined) return `locationKey:${latitude},${longitude}`;
    throw new Error('Invalid parameters for location key cache.');
  }

  getHourlyWeatherCacheKey(locationKey: string, units: 'metric' | 'imperial'): string {
    return `hourlyWeather:${locationKey}:${units}`;
  }

  getDailyWeatherCacheKey(locationKey: string, days: number, units: 'metric' | 'imperial'): string {
    return `dailyWeather:${locationKey}:${days}:${units}`;
  }

  private cleanup(): void {
    const now = Date.now();
    this.cache.forEach((entry, key) => {
      if (now > entry.expiry) {
        this.cache.delete(key);
      }
    });
  }

  getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}

export const weatherCache = new WeatherCache();
