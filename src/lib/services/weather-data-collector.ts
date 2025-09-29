import { getHourlyWeather, getDailyWeather } from './weather';
import type { HourlyWeatherData, DailyWeatherData } from '@/db/schema';

/**
 * 이메일 발송을 위한 날씨 데이터 수집 서비스
 */
export class WeatherDataCollectorService {
  /**
   * 시간별 날씨 데이터 수집 (12시간)
   */
  async getHourlyForecast(location: string, hours: number = 12): Promise<any[]> {
    try {
      const hourlyData = await getHourlyWeather({
        location,
        units: 'metric',
      });

      // 요청된 시간 수만큼 자르기
      return hourlyData.slice(0, hours).map((hour: any) => ({
        forecastDateTime: hour.forecastDateTime || hour.dateTime || new Date().toISOString(),
        temperature: hour.temperature || hour.temp || 0,
        conditions: hour.conditions || hour.description || '',
        precipitationProbability: hour.precipitationProbability || hour.pop || 0,
        rainProbability: hour.rainProbability || hour.pop || 0,
        windSpeed: hour.windSpeed || hour.wind || 0,
        humidity: hour.humidity || 0,
      }));
    } catch (error) {
      console.error('Hourly weather data collection error:', error);
      return [];
    }
  }

  /**
   * 일별 날씨 데이터 수집 (5일)
   */
  async getDailyForecast(location: string, days: number = 5): Promise<any[]> {
    try {
      const dailyData = await getDailyWeather({
        location,
        days: Math.min(days, 15) as 1 | 5 | 10 | 15, // 허용된 값으로 제한
        units: 'metric',
      });

      return dailyData.dailyForecasts.map((day: any) => ({
        forecastDate: day.forecastDate || day.date || new Date().toISOString().split('T')[0],
        dayOfWeek: day.dayOfWeek || new Date().getDay(),
        highTemp: day.highTemp || day.maxTemp || 0,
        lowTemp: day.lowTemp || day.minTemp || 0,
        conditions: day.conditions || day.description || '',
        precipitationProbability: day.precipitationProbability || day.pop || 0,
        rainProbability: day.rainProbability || day.pop || 0,
      }));
    } catch (error) {
      console.error('Daily weather data collection error:', error);
      return [];
    }
  }
}

// 싱글톤 인스턴스 생성
export const weatherDataCollectorService = new WeatherDataCollectorService();

