/**
 * MCP Weather Server 연동을 위한 날씨 서비스
 * AccuWeather API를 사용하여 날씨 정보를 제공합니다.
 */

import { env } from '@/lib/env';

export interface WeatherLocation {
  location?: string | null;
  latitude?: number;
  longitude?: number;
  units?: 'metric' | 'imperial';
}

export interface HourlyWeatherRequest extends WeatherLocation {
  hours?: number; // 예보할 시간 수 (기본값: 24시간)
}

export interface DailyWeatherRequest extends WeatherLocation {
  days?: 1 | 5 | 10 | 15;
}

export interface WeatherData {
  location: string;
  timestamp: string;
  temperature: number;
  conditions: string;
  weatherIcon?: number | null; // AccuWeather 아이콘 번호
  humidity?: number;
  precipitation?: number; // 실제 강수량 (mm)
  precipitationProbability?: number; // 강수 확률 (%)
  rainProbability?: number; // 비 올 확률 (%)
  windSpeed?: number;
  units: 'metric' | 'imperial';
}

export interface HourlyWeatherData extends WeatherData {
  hour: string;
}

export interface DailyWeatherData extends WeatherData {
  date: string;
  dayOfWeek: string;
  highTemp: number;
  lowTemp: number;
  dayWeather?: {
    icon: number;
    conditions: string;
    precipitationProbability: number;
  };
  nightWeather?: {
    icon: number;
    conditions: string;
    precipitationProbability: number;
  };
}

export interface DailyWeatherResponse {
  headline?: {
    text: string;
    category: string;
    severity: number;
  };
  dailyForecasts: DailyWeatherData[];
}

/**
 * MCP Weather Server를 통한 시간별 날씨 예보 조회
 */
export async function getHourlyWeather(params: HourlyWeatherRequest): Promise<HourlyWeatherData[]> {
  if (!env.ACCUWEATHER_API_KEY) {
    throw new Error('ACCUWEATHER_API_KEY가 설정되지 않았습니다.');
  }

  try {
    // 1. 위치 키 조회 (위도/경도 우선, 없으면 위치명 사용)
    let locationKey: string;
    let locationName: string;
    
    if (params.latitude !== undefined && params.longitude !== undefined) {
      locationKey = await getLocationKeyByCoordinates(params.latitude, params.longitude);
      locationName = `${params.latitude.toFixed(4)}, ${params.longitude.toFixed(4)}`;
    } else if (params.location && params.location.trim() !== '') {
      locationKey = await getLocationKey(params.location);
      locationName = params.location;
    } else {
      throw new Error('위치 정보(location 또는 latitude/longitude)가 필요합니다.');
    }
    
    // 2. 12시간 시간별 날씨 예보 조회
    const forecastUrl = `https://dataservice.accuweather.com/forecasts/v1/hourly/12hour/${locationKey}`;
    const response = await fetch(`${forecastUrl}?apikey=${env.ACCUWEATHER_API_KEY}&metric=${params.units === 'metric'}`);
    
    if (!response.ok) {
      throw new Error(`AccuWeather API 오류: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // 3. AccuWeather 응답을 내부 형식으로 변환
    const hourlyData: HourlyWeatherData[] = data.map((forecast: any) => {
      const date = new Date(forecast.DateTime);
      return {
        location: locationName,
        timestamp: forecast.DateTime,
        hour: date.toLocaleTimeString('ko-KR', { hour: '2-digit' }),
        temperature: Math.round(forecast.Temperature.Value),
        conditions: forecast.IconPhrase || '알 수 없음',
        weatherIcon: forecast.WeatherIcon || null,
        humidity: forecast.RelativeHumidity || 0,
        precipitation: forecast.Rain?.Value || forecast.TotalLiquid?.Value || 0, // 실제 강수량 (mm)
        precipitationProbability: forecast.PrecipitationProbability || 0, // 강수 확률 (%)
        rainProbability: forecast.RainProbability || 0, // 비 올 확률 (%)
        windSpeed: forecast.Wind?.Speed?.Value ? Math.round(forecast.Wind.Speed.Value) : 0,
        units: params.units || 'metric'
      };
    });

    return hourlyData;
  } catch (error) {
    console.error('시간별 날씨 조회 실패:', error);
    throw new Error('날씨 정보를 가져오는데 실패했습니다.');
  }
}

/**
 * MCP Weather Server를 통한 일별 날씨 예보 조회
 */
export async function getDailyWeather(params: DailyWeatherRequest): Promise<DailyWeatherResponse> {
  if (!env.ACCUWEATHER_API_KEY) {
    throw new Error('ACCUWEATHER_API_KEY가 설정되지 않았습니다.');
  }

  try {
    const days = params.days || 5;
    
    // 1. 위치 키 조회 (위도/경도 우선, 없으면 위치명 사용)
    let locationKey: string;
    let locationName: string;
    
    if (params.latitude !== undefined && params.longitude !== undefined) {
      locationKey = await getLocationKeyByCoordinates(params.latitude, params.longitude);
      locationName = `${params.latitude.toFixed(4)}, ${params.longitude.toFixed(4)}`;
    } else if (params.location && params.location.trim() !== '') {
      locationKey = await getLocationKey(params.location);
      locationName = params.location;
    } else {
      throw new Error('위치 정보(location 또는 latitude/longitude)가 필요합니다.');
    }
    
    // 2. 일별 날씨 예보 조회 (AccuWeather는 1일, 5일, 10일, 15일 지원)
    const forecastType = days === 1 ? '1day' : days === 5 ? '5day' : days === 10 ? '10day' : '15day';
    const forecastUrl = `https://dataservice.accuweather.com/forecasts/v1/daily/${forecastType}/${locationKey}`;
    
    // AccuWeather API 문서에 따른 권장 파라미터 설정
    const apiParams = new URLSearchParams({
      apikey: env.ACCUWEATHER_API_KEY,
      language: 'ko-kr', // 한국어 응답
      details: 'true',   // 상세 정보 포함
      metric: (params.units === 'metric').toString() // 미터법 여부
    });
    
    const response = await fetch(`${forecastUrl}?${apiParams.toString()}`);
    
    if (!response.ok) {
      if (response.status === 403) {
        // 15일/10일 예보가 제한된 경우 5일 예보로 대체 시도
        if (days > 5) {
          console.warn(`${days}일 예보가 제한되어 5일 예보로 대체합니다.`);
          return await getDailyWeather({
            ...params,
            days: 5
          });
        }
        throw new Error(`AccuWeather API 권한 제한: ${days}일 예보는 현재 API 플랜에서 지원되지 않습니다. 5일 예보만 가능할 수 있습니다. (${response.status})`);
      } else if (response.status === 401) {
        throw new Error(`AccuWeather API 키 인증 실패: API 키를 확인해주세요. (${response.status})`);
      } else if (response.status === 400) {
        throw new Error(`잘못된 요청: 위치 정보나 매개변수를 확인해주세요. (${response.status})`);
      } else if (response.status === 429) {
        throw new Error(`API 호출 한도 초과: 잠시 후 다시 시도해주세요. (${response.status})`);
      } else if (response.status >= 500) {
        throw new Error(`AccuWeather 서버 오류: 잠시 후 다시 시도해주세요. (${response.status})`);
      } else {
        throw new Error(`AccuWeather API 오류: ${response.status} ${response.statusText}`);
      }
    }
    
    const data = await response.json();
    
    // 3. AccuWeather 응답을 내부 형식으로 변환
    const dailyData: DailyWeatherData[] = data.DailyForecasts.slice(0, days).map((forecast: any) => {
      const date = new Date(forecast.Date);
      const dayOfWeek = ['일', '월', '화', '수', '목', '금', '토'][date.getDay()];
      
      return {
        location: locationName,
        timestamp: forecast.Date,
        date: `${date.getMonth() + 1}월 ${date.getDate()}일`,
        dayOfWeek: dayOfWeek,
        temperature: Math.round((forecast.Temperature.Maximum.Value + forecast.Temperature.Minimum.Value) / 2),
        highTemp: Math.round(forecast.Temperature.Maximum.Value),
        lowTemp: Math.round(forecast.Temperature.Minimum.Value),
        conditions: forecast.Day?.IconPhrase || '알 수 없음',
        weatherIcon: forecast.Day?.Icon || null,
        humidity: 0, // AccuWeather 일별 예보에는 습도 정보가 제한적
        precipitation: 0, // 일별 예보에는 실제 강수량 정보가 제한적
        precipitationProbability: forecast.Day?.PrecipitationProbability || 0, // 강수 확률
        rainProbability: forecast.Day?.RainProbability || 0, // 비 올 확률
        windSpeed: 0, // 일별 예보에는 바람 속도 정보가 제한적
        units: params.units || 'metric',
        // Day/Night 세부 정보
        dayWeather: forecast.Day ? {
          icon: forecast.Day.Icon,
          conditions: forecast.Day.IconPhrase || forecast.Day.ShortPhrase || '알 수 없음',
          precipitationProbability: Math.max(
            forecast.Day.PrecipitationProbability || 0,
            forecast.Day.RainProbability || 0,
            forecast.Day.ThunderstormProbability || 0,
            forecast.Day.SnowProbability || 0,
            forecast.Day.IceProbability || 0
          )
        } : undefined,
        nightWeather: forecast.Night ? {
          icon: forecast.Night.Icon,
          conditions: forecast.Night.IconPhrase || forecast.Night.ShortPhrase || '알 수 없음',
          precipitationProbability: Math.max(
            forecast.Night.PrecipitationProbability || 0,
            forecast.Night.RainProbability || 0,
            forecast.Night.ThunderstormProbability || 0,
            forecast.Night.SnowProbability || 0,
            forecast.Night.IceProbability || 0
          )
        } : undefined
      };
    });

    // 헤드라인 정보 추출
    const headline = data.Headline ? {
      text: data.Headline.Text || '',
      category: data.Headline.Category || '',
      severity: data.Headline.Severity || 0
    } : undefined;

    return {
      headline,
      dailyForecasts: dailyData
    };
  } catch (error) {
    console.error('일별 날씨 조회 실패:', error);
    throw new Error('날씨 정보를 가져오는데 실패했습니다.');
  }
}

/**
 * 위치명으로 AccuWeather 위치 키 조회
 */
async function getLocationKey(location: string): Promise<string> {
  if (!env.ACCUWEATHER_API_KEY) {
    throw new Error('ACCUWEATHER_API_KEY가 설정되지 않았습니다.');
  }

  try {
    const searchUrl = `https://dataservice.accuweather.com/locations/v1/cities/search`;
    const response = await fetch(`${searchUrl}?apikey=${env.ACCUWEATHER_API_KEY}&q=${encodeURIComponent(location)}&language=ko-kr`);
    
    if (!response.ok) {
      throw new Error(`위치 검색 API 오류: ${response.status} ${response.statusText}`);
    }
    
    const locations = await response.json();
    
    if (!locations || locations.length === 0) {
      throw new Error(`위치를 찾을 수 없습니다: ${location}`);
    }
    
    // 첫 번째 검색 결과의 키 반환
    return locations[0].Key;
  } catch (error) {
    console.error('위치 키 조회 실패:', error);
    throw new Error(`위치 검색에 실패했습니다: ${location}`);
  }
}

/**
 * 위도/경도로 AccuWeather 위치 키 조회
 */
export async function getLocationKeyByCoordinates(latitude: number, longitude: number): Promise<string> {
  if (!env.ACCUWEATHER_API_KEY) {
    throw new Error('ACCUWEATHER_API_KEY가 설정되지 않았습니다.');
  }

  try {
    const geopositionUrl = `https://dataservice.accuweather.com/locations/v1/cities/geoposition/search`;
    const response = await fetch(`${geopositionUrl}?apikey=${env.ACCUWEATHER_API_KEY}&q=${latitude},${longitude}&language=ko-kr`);
    
    if (!response.ok) {
      throw new Error(`좌표 검색 API 오류: ${response.status} ${response.statusText}`);
    }
    
    const location = await response.json();
    
    if (!location || !location.Key) {
      throw new Error(`좌표에 해당하는 위치를 찾을 수 없습니다: ${latitude}, ${longitude}`);
    }
    
    return location.Key;
  } catch (error) {
    console.error('좌표로 위치 키 조회 실패:', error);
    throw new Error(`좌표 검색에 실패했습니다: ${latitude}, ${longitude}`);
  }
}

/**
 * MCP Weather Server 상태 확인
 */
export async function checkWeatherServiceHealth(): Promise<boolean> {
  try {
    if (!env.ACCUWEATHER_API_KEY) {
      return false;
    }

    // AccuWeather API 키 유효성을 간단한 요청으로 확인
    try {
      const response = await fetch(`https://dataservice.accuweather.com/locations/v1/cities/search?apikey=${env.ACCUWEATHER_API_KEY}&q=Seoul`);
      return response.ok;
    } catch {
      return false;
    }
  } catch (error) {
    console.error('Weather Service 상태 확인 실패:', error);
    return false;
  }
}
