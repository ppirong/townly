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
  getLocationKeyCacheKey(location?: string, latitude?: number, longitude?: number, userId?: string): string {
    let baseKey: string;
    if (location) {
      baseKey = `locationKey:${location}`;
    } else if (latitude !== undefined && longitude !== undefined) {
      baseKey = `locationKey:${latitude},${longitude}`;
    } else {
      throw new Error('Invalid parameters for location key cache.');
    }
    
    // 사용자별 캐시 키 생성 (선택적)
    return userId ? `${baseKey}:user:${userId}` : baseKey;
  }

  getHourlyWeatherCacheKey(locationKey: string, units: 'metric' | 'imperial', userId?: string): string {
    const baseKey = `hourlyWeather:${locationKey}:${units}`;
    return userId ? `${baseKey}:user:${userId}` : baseKey;
  }

  getDailyWeatherCacheKey(locationKey: string, days: number, units: 'metric' | 'imperial', userId?: string): string {
    const baseKey = `dailyWeather:${locationKey}:${days}:${units}`;
    return userId ? `${baseKey}:user:${userId}` : baseKey;
  }

  /**
   * 사용자별 캐시 키 생성 (스마트 TTL 지원)
   */
  getUserSpecificCacheKey(baseKey: string, userId: string, additionalSuffix?: string): string {
    const userKey = `${baseKey}:user:${userId}`;
    return additionalSuffix ? `${userKey}:${additionalSuffix}` : userKey;
  }

  /**
   * 캐시 키에서 사용자 ID 추출
   */
  extractUserIdFromCacheKey(cacheKey: string): string | null {
    const userMatch = cacheKey.match(/:user:([^:]+)/);
    return userMatch ? userMatch[1] : null;
  }

  /**
   * 사용자별 캐시 통계
   */
  getUserCacheStats(userId: string): { size: number; keys: string[] } {
    const userKeys = Array.from(this.cache.keys()).filter(key => 
      this.extractUserIdFromCacheKey(key) === userId
    );
    
    return {
      size: userKeys.length,
      keys: userKeys,
    };
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
