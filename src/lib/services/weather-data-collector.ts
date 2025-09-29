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
      return hourlyData.slice(0, hours).map(hour => ({
        forecastDateTime: hour.forecastDateTime,
        temperature: hour.temperature,
        conditions: hour.conditions,
        precipitationProbability: hour.precipitationProbability,
        rainProbability: hour.rainProbability,
        windSpeed: hour.windSpeed,
        humidity: hour.humidity,
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
        days,
        units: 'metric',
      });

      return dailyData.dailyForecasts.map(day => ({
        forecastDate: day.forecastDate,
        dayOfWeek: day.dayOfWeek,
        highTemp: day.highTemp,
        lowTemp: day.lowTemp,
        conditions: day.conditions,
        precipitationProbability: day.precipitationProbability,
        rainProbability: day.rainProbability,
      }));
    } catch (error) {
      console.error('Daily weather data collection error:', error);
      return [];
    }
  }
}

// 싱글톤 인스턴스 생성
export const weatherDataCollectorService = new WeatherDataCollectorService();

