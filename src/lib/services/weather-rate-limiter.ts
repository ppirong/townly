/**
 * AccuWeather API 레이트 리미터
 * 무료 플랜의 호출 제한을 관리합니다 (일 500회)
 */

class WeatherRateLimiter {
  private requestTimestamps: number[]; // 요청 시간 기록 (밀리초)
  private readonly MINUTE_LIMIT: number;
  private readonly HOUR_LIMIT: number;
  private readonly DAY_LIMIT: number;
  private readonly WINDOW_MINUTE: number = 60 * 1000; // 1분
  private readonly WINDOW_HOUR: number = 60 * this.WINDOW_MINUTE; // 1시간
  private readonly WINDOW_DAY: number = 24 * this.WINDOW_HOUR; // 1일

  constructor(minuteLimit: number = 20, hourLimit: number = 100, dayLimit: number = 450) {
    this.requestTimestamps = [];
    this.MINUTE_LIMIT = minuteLimit;
    this.HOUR_LIMIT = hourLimit;
    this.DAY_LIMIT = dayLimit;
  }

  private cleanup(): void {
    const now = Date.now();
    // 가장 오래된 요청부터 현재 시간 - 1일 이전의 기록은 삭제
    this.requestTimestamps = this.requestTimestamps.filter(
      (timestamp) => now - timestamp < this.WINDOW_DAY
    );
  }

  canMakeRequest(): boolean {
    this.cleanup();
    const now = Date.now();

    const requestsLastMinute = this.requestTimestamps.filter(
      (timestamp) => now - timestamp < this.WINDOW_MINUTE
    ).length;
    const requestsLastHour = this.requestTimestamps.filter(
      (timestamp) => now - timestamp < this.WINDOW_HOUR
    ).length;
    const requestsLastDay = this.requestTimestamps.length;

    return (
      requestsLastMinute < this.MINUTE_LIMIT &&
      requestsLastHour < this.HOUR_LIMIT &&
      requestsLastDay < this.DAY_LIMIT
    );
  }

  recordRequest(): void {
    this.requestTimestamps.push(Date.now());
  }

  getWaitTime(): number {
    this.cleanup();
    const now = Date.now();
    let minWaitTime = 0;

    // 분당 제한
    const requestsLastMinute = this.requestTimestamps.filter(
      (timestamp) => now - timestamp < this.WINDOW_MINUTE
    );
    if (requestsLastMinute.length >= this.MINUTE_LIMIT) {
      const oldestRequestInWindow = requestsLastMinute[0];
      minWaitTime = Math.max(minWaitTime, this.WINDOW_MINUTE - (now - oldestRequestInWindow));
    }

    // 시간당 제한
    const requestsLastHour = this.requestTimestamps.filter(
      (timestamp) => now - timestamp < this.WINDOW_HOUR
    );
    if (requestsLastHour.length >= this.HOUR_LIMIT) {
      const oldestRequestInWindow = requestsLastHour[0];
      minWaitTime = Math.max(minWaitTime, this.WINDOW_HOUR - (now - oldestRequestInWindow));
    }

    // 일일 제한
    if (this.requestTimestamps.length >= this.DAY_LIMIT) {
      const oldestRequestInWindow = this.requestTimestamps[0];
      minWaitTime = Math.max(minWaitTime, this.WINDOW_DAY - (now - oldestRequestInWindow));
    }

    return minWaitTime;
  }

  getStats(): { minute: number; hour: number; day: number; canMakeRequest: boolean; waitTime: number } {
    this.cleanup();
    const now = Date.now();
    const requestsLastMinute = this.requestTimestamps.filter(
      (timestamp) => now - timestamp < this.WINDOW_MINUTE
    ).length;
    const requestsLastHour = this.requestTimestamps.filter(
      (timestamp) => now - timestamp < this.WINDOW_HOUR
    ).length;
    const requestsLastDay = this.requestTimestamps.length;

    return {
      minute: requestsLastMinute,
      hour: requestsLastHour,
      day: requestsLastDay,
      canMakeRequest: this.canMakeRequest(),
      waitTime: this.getWaitTime(),
    };
  }

  reset(): void {
    this.requestTimestamps = [];
  }
}

// AccuWeather 무료 플랜 기준 (일 500회)로 설정
// 안전하게 조금 낮춘 450회로 제한
export const weatherRateLimiter = new WeatherRateLimiter(25, 150, 450);
