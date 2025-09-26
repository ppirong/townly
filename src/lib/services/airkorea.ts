import { env } from '@/lib/env';
import {
  type RealtimeAirQualityRequest,
  type SidoRealtimeAirQualityRequest,
  type NearbyStationRequest,
  type WeeklyForecastRequest,
  type HourlyForecastRequest,
  type DailyForecastRequest,
  type AirQualityResponse,
  type NearbyStationResponse,
  type WeeklyForecastResponse,
  type HourlyForecastResponse,
  type DailyForecastResponse,
  type ExtendedWeeklyForecastResponse,
  type ProcessedWeeklyForecast,
  type ProcessedHourlyForecast,
  type ProcessedDailyForecast,
  type SevenDayForecast,
  airQualityResponseSchema,
  nearbyStationResponseSchema,
  weeklyForecastResponseSchema,
  hourlyForecastResponseSchema,
  dailyForecastResponseSchema,
  extendedWeeklyForecastResponseSchema,
} from '@/lib/schemas/airquality';

/**
 * 한국환경공단 에어코리아 OpenAPI 서비스
 */

const BASE_URL = 'http://apis.data.go.kr/B552584/ArpltnInforInqireSvc';

class AirKoreaService {
  private apiKey: string | undefined;

  constructor() {
    this.apiKey = env.AIRKOREA_API_KEY;
    
    if (!this.apiKey) {
      console.warn('AIRKOREA_API_KEY가 설정되지 않았습니다. 미세먼지 정보 조회가 제한됩니다.');
    }
  }

  /**
   * 측정소별 실시간 측정정보 조회
   */
  async getRealtimeAirQuality(params: Omit<RealtimeAirQualityRequest, 'serviceKey'>): Promise<AirQualityResponse> {
    if (!this.apiKey) {
      throw new Error('AIRKOREA_API_KEY가 설정되지 않았습니다. .env.local 파일에 API 키를 추가하세요.');
    }
    const searchParams = new URLSearchParams({
      serviceKey: this.apiKey,
      returnType: params.returnType || 'json',
      numOfRows: params.numOfRows?.toString() || '10',
      pageNo: params.pageNo?.toString() || '1',
      stationName: params.stationName,
      dataTerm: params.dataTerm,
      ver: params.ver || '1.3',
    });

    const url = `${BASE_URL}/getMsrstnAcctoRltmMesureDnsty?${searchParams.toString()}`;
    
    try {
      console.log('API 요청 URL:', url);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        // 캐시 설정 (5분)
        next: { revalidate: 300 }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API 요청 실패 상세:', { 
          status: response.status, 
          statusText: response.statusText, 
          url: url,
          responseText: errorText.substring(0, 500) 
        });
        throw new Error(`API 요청 실패: ${response.status} ${response.statusText}`);
      }

      const responseText = await response.text();
      console.log('API 응답 (처음 500자):', responseText.substring(0, 500));
      
      // JSON 파싱 시도
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error('JSON 파싱 실패:', parseError);
        console.error('응답 전체 내용:', responseText);
        throw new Error(`API 응답이 유효한 JSON이 아닙니다: ${responseText.substring(0, 200)}`);
      }
      
      return airQualityResponseSchema.parse(data);
    } catch (error) {
      console.error('에어코리아 API 호출 오류:', error);
      throw new Error('대기질 정보를 가져오는데 실패했습니다.');
    }
  }

  /**
   * 시도별 실시간 측정정보 조회
   */
  async getSidoRealtimeAirQuality(params: Omit<SidoRealtimeAirQualityRequest, 'serviceKey'>): Promise<AirQualityResponse> {
    if (!this.apiKey) {
      throw new Error('AIRKOREA_API_KEY가 설정되지 않았습니다. .env.local 파일에 API 키를 추가하세요.');
    }
    const searchParams = new URLSearchParams({
      serviceKey: this.apiKey,
      returnType: params.returnType || 'json',
      numOfRows: params.numOfRows?.toString() || '100',
      pageNo: params.pageNo?.toString() || '1',
      sidoName: params.sidoName,
      ver: params.ver || '1.3',
    });

    const url = `${BASE_URL}/getCtprvnRltmMesureDnsty?${searchParams.toString()}`;
    
    try {
      console.log('시도별 API 요청 URL:', url);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        // 캐시 설정 (5분)
        next: { revalidate: 300 }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('시도별 API 요청 실패 상세:', { 
          status: response.status, 
          statusText: response.statusText, 
          url: url,
          responseText: errorText.substring(0, 500) 
        });
        throw new Error(`API 요청 실패: ${response.status} ${response.statusText}`);
      }

      const responseText = await response.text();
      console.log('시도별 API 응답 (처음 500자):', responseText.substring(0, 500));
      
      // JSON 파싱 시도
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error('시도별 JSON 파싱 실패:', parseError);
        console.error('시도별 응답 전체 내용:', responseText);
        throw new Error(`API 응답이 유효한 JSON이 아닙니다: ${responseText.substring(0, 200)}`);
      }
      
      return airQualityResponseSchema.parse(data);
    } catch (error) {
      console.error('에어코리아 API 호출 오류:', error);
      throw new Error('대기질 정보를 가져오는데 실패했습니다.');
    }
  }

  /**
   * 근접측정소 목록 조회
   */
  async getNearbyStations(params: Omit<NearbyStationRequest, 'serviceKey'>): Promise<NearbyStationResponse> {
    if (!this.apiKey) {
      throw new Error('AIRKOREA_API_KEY가 설정되지 않았습니다. .env.local 파일에 API 키를 추가하세요.');
    }
    
    const searchParams = new URLSearchParams({
      serviceKey: this.apiKey,
      returnType: params.returnType || 'json',
      tmX: params.tmX.toString(),
      tmY: params.tmY.toString(),
      ver: params.ver || '1.3',
    });

    const url = `${BASE_URL}/getNearbyMsrstnList?${searchParams.toString()}`;
    
    try {
      console.log('근접측정소 API 요청 URL:', url);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        // 캐시 설정 (10분)
        next: { revalidate: 600 }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('근접측정소 API 요청 실패 상세:', { 
          status: response.status, 
          statusText: response.statusText, 
          url: url,
          responseText: errorText.substring(0, 500) 
        });
        throw new Error(`API 요청 실패: ${response.status} ${response.statusText}`);
      }

      const responseText = await response.text();
      console.log('근접측정소 API 응답 (처음 500자):', responseText.substring(0, 500));
      
      // JSON 파싱 시도
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error('근접측정소 JSON 파싱 실패:', parseError);
        console.error('근접측정소 응답 전체 내용:', responseText);
        throw new Error(`API 응답이 유효한 JSON이 아닙니다: ${responseText.substring(0, 200)}`);
      }
      
      return nearbyStationResponseSchema.parse(data);
    } catch (error) {
      console.error('근접측정소 API 호출 오류:', error);
      throw new Error('근접측정소 정보를 가져오는데 실패했습니다.');
    }
  }

  /**
   * 서울시 대기질 정보 조회 (기본값)
   */
  async getSeoulAirQuality(): Promise<AirQualityResponse> {
    return this.getSidoRealtimeAirQuality({
      sidoName: '서울',
      numOfRows: 50,
      returnType: 'json',
      pageNo: 1,
      ver: '1.3',
    });
  }

  /**
   * 특정 측정소의 시간별 대기질 정보 조회
   */
  async getStationHourlyData(stationName: string): Promise<AirQualityResponse> {
    return this.getRealtimeAirQuality({
      stationName,
      dataTerm: 'DAILY',
      numOfRows: 24, // 24시간
      returnType: 'json',
      pageNo: 1,
      ver: '1.3',
    });
  }

  /**
   * 특정 측정소의 일별 대기질 정보 조회 
   */
  async getStationDailyData(stationName: string): Promise<AirQualityResponse> {
    return this.getRealtimeAirQuality({
      stationName,
      dataTerm: '3MONTH', // 3개월
      numOfRows: 90, // 90일
      returnType: 'json',
      pageNo: 1,
      ver: '1.3',
    });
  }

  /**
   * 주요 도시별 대기질 정보 조회
   */
  async getMajorCitiesAirQuality(): Promise<Record<string, AirQualityResponse>> {
    const cities = ['서울', '부산', '대구', '인천', '광주', '대전', '울산', '세종'];
    const results: Record<string, AirQualityResponse> = {};

    // 병렬로 API 호출
    const promises = cities.map(async (city) => {
      try {
        const data = await this.getSidoRealtimeAirQuality({
          sidoName: city,
          numOfRows: 10,
          returnType: 'json',
          pageNo: 1,
          ver: '1.3',
        });
        return { city, data };
      } catch (error) {
        console.error(`${city} 대기질 정보 조회 실패:`, error);
        return null;
      }
    });

    const responses = await Promise.allSettled(promises);
    
    responses.forEach((response) => {
      if (response.status === 'fulfilled' && response.value) {
        results[response.value.city] = response.value.data;
      }
    });

    return results;
  }

  /**
   * 미세먼지 주간예보통보 조회
   */
  async getWeeklyForecast(params: Omit<WeeklyForecastRequest, 'serviceKey'>): Promise<WeeklyForecastResponse> {
    if (!this.apiKey) {
      throw new Error('AIRKOREA_API_KEY가 설정되지 않았습니다. .env.local 파일에 API 키를 추가하세요.');
    }

    const searchParams = new URLSearchParams({
      serviceKey: this.apiKey,
      returnType: params.returnType || 'json',
      searchDate: params.searchDate,
    });

    const url = `${BASE_URL}/getMinuDustWeekFrcstDspth?${searchParams.toString()}`;
    
    try {
      console.log('주간예보 API 요청 URL:', url);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        // 캐시 설정 (1시간)
        next: { revalidate: 3600 }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('주간예보 API 요청 실패 상세:', { 
          status: response.status, 
          statusText: response.statusText, 
          url: url,
          responseText: errorText.substring(0, 500) 
        });
        throw new Error(`API 요청 실패: ${response.status} ${response.statusText}`);
      }

      const responseText = await response.text();
      console.log('주간예보 API 응답 (처음 500자):', responseText.substring(0, 500));
      
      // JSON 파싱 시도
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error('주간예보 JSON 파싱 실패:', parseError);
        console.error('주간예보 응답 전체 내용:', responseText);
        throw new Error(`API 응답이 유효한 JSON이 아닙니다: ${responseText.substring(0, 200)}`);
      }
      
      return weeklyForecastResponseSchema.parse(data);
    } catch (error) {
      console.error('미세먼지 주간예보 API 호출 오류:', error);
      throw new Error('미세먼지 주간예보 정보를 가져오는데 실패했습니다.');
    }
  }

  /**
   * 미세먼지 주간예보 데이터 처리
   */
  processWeeklyForecastData(response: WeeklyForecastResponse): ProcessedWeeklyForecast[] {
    if (!response.response.body.items.length) {
      return [];
    }

    return response.response.body.items
      .filter(item => item.dataTime && item.informCode && item.informData && item.informOverall)
      .map(item => {
        // 일별 예보 데이터 처리
        const dailyForecasts = [];
        const baseDate = new Date();
        
        for (let i = 1; i <= 6; i++) {
          const dateKey = `informData${i}` as keyof typeof item;
          const gradeKey = `informGrade${i}` as keyof typeof item;
          
          const dateValue = item[dateKey];
          const gradeValue = item[gradeKey];
          
          if (dateValue && gradeValue) {
            const forecastDate = new Date(baseDate);
            forecastDate.setDate(baseDate.getDate() + i);
            
            dailyForecasts.push({
              date: forecastDate.toISOString().split('T')[0],
              grade: gradeValue,
              description: dateValue,
            });
          }
        }

        // 이미지 URL 수집
        const imageUrls = [];
        for (let i = 1; i <= 6; i++) {
          const imageKey = `imageUrl${i}` as keyof typeof item;
          const imageUrl = item[imageKey];
          if (imageUrl) {
            imageUrls.push(imageUrl);
          }
        }

        return {
          dataTime: item.dataTime!,
          informCode: item.informCode!,
          informData: item.informData!,
          informOverall: item.informOverall!,
          informCause: item.informCause || undefined,
          actionKnack: item.actionKnack || undefined,
          dailyForecasts,
          imageUrls: imageUrls.length > 0 ? imageUrls : undefined,
        };
      });
  }

  /**
   * 최신 미세먼지 주간예보 조회 (오늘 날짜 기준)
   */
  async getLatestWeeklyForecast(): Promise<ProcessedWeeklyForecast[]> {
    const today = new Date();
    const searchDate = today.toISOString().split('T')[0]; // YYYY-MM-DD 형식

    try {
      const response = await this.getWeeklyForecast({
        searchDate,
        returnType: 'json',
      });

      return this.processWeeklyForecastData(response);
    } catch (error) {
      console.error('최신 주간예보 조회 실패:', error);
      throw new Error('최신 미세먼지 주간예보를 가져오는데 실패했습니다.');
    }
  }

  /**
   * 시간별 대기예보 조회 (등급 정보)
   * 에어코리아 API 문서에 따르면 informGrade에 지역별 예보등급, informData에 날짜 정보가 포함
   */
  async getHourlyForecast(params: Omit<HourlyForecastRequest, 'serviceKey'>): Promise<HourlyForecastResponse> {
    if (!this.apiKey) {
      throw new Error('AIRKOREA_API_KEY가 설정되지 않았습니다. .env.local 파일에 API 키를 추가하세요.');
    }

    const searchParams = new URLSearchParams({
      serviceKey: this.apiKey,
      returnType: params.returnType || 'json',
      searchDate: params.searchDate,
    });

    // 미세먼지 주간예보 API를 사용하되 시간별 정보로 처리
    const url = `${BASE_URL}/getMinuDustWeekFrcstDspth?${searchParams.toString()}`;
    
    try {
      console.log('시간별 대기예보 API 요청 URL:', url);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        // 캐시 설정 (30분)
        next: { revalidate: 1800 }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('시간별 대기예보 API 요청 실패 상세:', { 
          status: response.status, 
          statusText: response.statusText, 
          url: url,
          responseText: errorText.substring(0, 500) 
        });
        throw new Error(`API 요청 실패: ${response.status} ${response.statusText}`);
      }

      const responseText = await response.text();
      console.log('시간별 대기예보 API 응답 (처음 500자):', responseText.substring(0, 500));
      
      // JSON 파싱 시도
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error('시간별 대기예보 JSON 파싱 실패:', parseError);
        console.error('응답 전체 내용:', responseText);
        throw new Error(`API 응답이 유효한 JSON이 아닙니다: ${responseText.substring(0, 200)}`);
      }
      
      return hourlyForecastResponseSchema.parse(data);
    } catch (error) {
      console.error('시간별 대기예보 API 호출 오류:', error);
      throw new Error('시간별 대기예보 정보를 가져오는데 실패했습니다.');
    }
  }

  /**
   * 시간별 대기예보 데이터 처리
   */
  processHourlyForecastData(response: HourlyForecastResponse): ProcessedHourlyForecast[] {
    if (!response.response.body.items.length) {
      return [];
    }

    return response.response.body.items
      .filter(item => item.dataTime && item.informCode && item.informData && item.informGrade)
      .map(item => {
        // 예보등급 정보 매핑
        const gradeInfo = this.getGradeInfo(item.informGrade!);
        
        // 예보 날짜 파싱 (informData에서 날짜 정보 추출)
        const forecastDate = this.parseForecastDate(item.informData!);

        return {
          dataTime: item.dataTime!,
          informCode: item.informCode!,
          informData: item.informData!,
          informGrade: item.informGrade!,
          informOverall: item.informOverall || undefined,
          informCause: item.informCause || undefined,
          forecastDate,
          gradeInfo,
        };
      });
  }

  /**
   * 예보등급 정보 매핑
   */
  private getGradeInfo(grade: string): { label: string; color: string; description: string } {
    const gradeMap: Record<string, { label: string; color: string; description: string }> = {
      '좋음': { 
        label: '좋음', 
        color: 'text-blue-600 bg-blue-50',
        description: '대기오염 관련 질환자군에서도 영향이 거의 없는 수준'
      },
      '보통': { 
        label: '보통', 
        color: 'text-green-600 bg-green-50',
        description: '환자군에게 약한 증상이 나타날 수 있는 수준'
      },
      '나쁨': { 
        label: '나쁨', 
        color: 'text-orange-600 bg-orange-50',
        description: '환자군에게 증상 악화가 우려되는 수준'
      },
      '매우나쁨': { 
        label: '매우나쁨', 
        color: 'text-red-600 bg-red-50',
        description: '환자군에게 급성 노출시 심각한 영향 우려'
      },
    };

    return gradeMap[grade] || { 
      label: '정보없음', 
      color: 'text-gray-600 bg-gray-50',
      description: '예보 정보를 확인할 수 없습니다'
    };
  }

  /**
   * 예보 날짜 파싱
   */
  private parseForecastDate(informData: string): string {
    // informData에서 날짜 정보 추출
    // 예: "○ 6월 15일(수) : 수도권·강원영서·충북 '나쁨', 그 밖의 권역 '보통'"
    const dateMatch = informData.match(/(\d+)월\s*(\d+)일/);
    if (dateMatch) {
      const month = parseInt(dateMatch[1]);
      const day = parseInt(dateMatch[2]);
      const currentYear = new Date().getFullYear();
      const date = new Date(currentYear, month - 1, day);
      return date.toISOString().split('T')[0];
    }
    
    // 기본값: 오늘 날짜
    return new Date().toISOString().split('T')[0];
  }

  /**
   * 최신 시간별 대기예보 조회 (오늘 날짜 기준)
   */
  async getLatestHourlyForecast(): Promise<ProcessedHourlyForecast[]> {
    const today = new Date();
    const searchDate = today.toISOString().split('T')[0]; // YYYY-MM-DD 형식

    try {
      const response = await this.getHourlyForecast({
        searchDate,
        returnType: 'json',
      });

      return this.processHourlyForecastData(response);
    } catch (error) {
      console.error('최신 시간별 예보 조회 실패:', error);
      throw new Error('최신 시간별 대기예보를 가져오는데 실패했습니다.');
    }
  }

  /**
   * 미세먼지 일별예보 조회 (getMinuDustFrcstDspth) - 오늘~오늘+2일
   */
  async getDailyForecast(params: Omit<DailyForecastRequest, 'serviceKey'>): Promise<DailyForecastResponse> {
    if (!this.apiKey) {
      throw new Error('AIRKOREA_API_KEY가 설정되지 않았습니다. .env.local 파일에 API 키를 추가하세요.');
    }

    const searchParams = new URLSearchParams({
      serviceKey: this.apiKey,
      returnType: params.returnType || 'json',
      searchDate: params.searchDate,
    });

    const url = `${BASE_URL}/getMinuDustFrcstDspth?${searchParams.toString()}`;
    
    try {
      console.log('일별예보 API 요청 URL:', url);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        // 캐시 설정 (1시간)
        next: { revalidate: 3600 }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('일별예보 API 요청 실패 상세:', { 
          status: response.status, 
          statusText: response.statusText, 
          url: url,
          responseText: errorText.substring(0, 500) 
        });
        throw new Error(`API 요청 실패: ${response.status} ${response.statusText}`);
      }

      const responseText = await response.text();
      console.log('일별예보 API 응답 (처음 500자):', responseText.substring(0, 500));
      
      // JSON 파싱 시도
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error('일별예보 JSON 파싱 실패:', parseError);
        console.error('응답 전체 내용:', responseText);
        throw new Error(`API 응답이 유효한 JSON이 아닙니다: ${responseText.substring(0, 200)}`);
      }
      
      return dailyForecastResponseSchema.parse(data);
    } catch (error) {
      console.error('미세먼지 일별예보 API 호출 오류:', error);
      throw new Error('미세먼지 일별예보 정보를 가져오는데 실패했습니다.');
    }
  }

  /**
   * 미세먼지 주간예보 확장 조회 (getMinuDustWeekFrcstDspth) - 오늘+3일~오늘+6일
   */
  async getExtendedWeeklyForecast(params: Omit<DailyForecastRequest, 'serviceKey'>): Promise<ExtendedWeeklyForecastResponse> {
    if (!this.apiKey) {
      throw new Error('AIRKOREA_API_KEY가 설정되지 않았습니다. .env.local 파일에 API 키를 추가하세요.');
    }

    const searchParams = new URLSearchParams({
      serviceKey: this.apiKey,
      returnType: params.returnType || 'json',
      searchDate: params.searchDate,
    });

    const url = `${BASE_URL}/getMinuDustWeekFrcstDspth?${searchParams.toString()}`;
    
    try {
      console.log('확장 주간예보 API 요청 URL:', url);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        // 캐시 설정 (2시간)
        next: { revalidate: 7200 }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('확장 주간예보 API 요청 실패 상세:', { 
          status: response.status, 
          statusText: response.statusText, 
          url: url,
          responseText: errorText.substring(0, 500) 
        });
        throw new Error(`API 요청 실패: ${response.status} ${response.statusText}`);
      }

      const responseText = await response.text();
      console.log('확장 주간예보 API 응답 (처음 500자):', responseText.substring(0, 500));
      
      // JSON 파싱 시도
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error('확장 주간예보 JSON 파싱 실패:', parseError);
        console.error('응답 전체 내용:', responseText);
        throw new Error(`API 응답이 유효한 JSON이 아닙니다: ${responseText.substring(0, 200)}`);
      }
      
      return extendedWeeklyForecastResponseSchema.parse(data);
    } catch (error) {
      console.error('확장 주간예보 API 호출 오류:', error);
      throw new Error('확장 주간예보 정보를 가져오는데 실패했습니다.');
    }
  }

  /**
   * 일별예보 데이터 처리
   */
  processDailyForecastData(response: DailyForecastResponse): ProcessedDailyForecast[] {
    if (!response.response.body.items.length) {
      return [];
    }

    return response.response.body.items
      .filter(item => item.dataTime && item.informCode && item.informData && item.informGrade)
      .map(item => {
        // 예보등급 정보 매핑
        const gradeInfo = this.getGradeInfo(item.informGrade!);
        
        // 예보 날짜 파싱 (informData에서 날짜 정보 추출)
        const forecastDate = this.parseForecastDate(item.informData!);

        return {
          dataTime: item.dataTime!,
          informCode: item.informCode!,
          informData: item.informData!,
          informGrade: item.informGrade!,
          informOverall: item.informOverall || undefined,
          informCause: item.informCause || undefined,
          actionKnack: item.actionKnack || undefined,
          forecastDate,
          gradeInfo,
        };
      });
  }

  /**
   * 지역별 대기질 등급 추출 함수
   */
  private extractRegionalGrade(gradeString: string, region: string): string {
    // "서울: 나쁨, 제주: 나쁨, 전남: 나쁨" 형태에서 특정 지역의 등급 추출
    const regionPattern = new RegExp(`${region}\\s*:\\s*([^,]+)`, 'i');
    const match = gradeString.match(regionPattern);
    
    if (match) {
      return match[1].trim();
    }
    
    // 해당 지역이 없으면 첫 번째 지역의 등급을 반환
    const firstGrade = gradeString.split(',')[0];
    const firstGradeMatch = firstGrade.match(/:\s*([^,]+)/);
    
    return firstGradeMatch ? firstGradeMatch[1].trim() : '정보없음';
  }

  /**
   * 7일간 통합 대기질 예보 조회
   */
  async getSevenDayForecast(userRegion: string = '서울'): Promise<SevenDayForecast[]> {
    const today = new Date();
    const searchDate = today.toISOString().split('T')[0];
    
    try {
      // 일별예보 (오늘~+2일) 및 주간예보 (오늘+3일~+6일) 병렬 호출
      const [dailyResponse, weeklyResponse] = await Promise.all([
        this.getDailyForecast({ searchDate, returnType: 'json' }),
        this.getExtendedWeeklyForecast({ searchDate, returnType: 'json' })
      ]);

      const sevenDayData: SevenDayForecast[] = [];

      console.log('일별예보 응답:', JSON.stringify(dailyResponse, null, 2));
      console.log('주간예보 응답:', JSON.stringify(weeklyResponse, null, 2));

      // 일별예보 데이터 처리 (오늘, 오늘+1일, 오늘+2일)
      if (dailyResponse.response.body.items.length > 0) {
        const dailyItems = dailyResponse.response.body.items;
        
        // PM10과 PM2.5 데이터를 분리 처리
        const pm10Items = dailyItems.filter(item => item.informCode === 'PM10');
        const pm25Items = dailyItems.filter(item => item.informCode === 'PM25');
        
        for (let i = 0; i <= 2; i++) {
          const targetDate = new Date(today);
          targetDate.setDate(today.getDate() + i);
          const dateString = targetDate.toISOString().split('T')[0];
          
          // PM10 정보 찾기
          let pm10Item = pm10Items.find(item => 
            item.informData && (
              item.informData.includes(targetDate.getMonth() + 1 + '월') &&
              item.informData.includes(targetDate.getDate() + '일')
            )
          );
          
          // 날짜 매칭이 안될 경우 순서대로 가져오기 (가장 최신 항목부터)
          if (!pm10Item && pm10Items.length > 0) {
            pm10Item = pm10Items[0]; // 첫 번째 PM10 항목 사용
          }
          
          // PM2.5 정보 찾기  
          let pm25Item = pm25Items.find(item => 
            item.informData && (
              item.informData.includes(targetDate.getMonth() + 1 + '월') &&
              item.informData.includes(targetDate.getDate() + '일')
            )
          );
          
          if (!pm25Item && pm25Items.length > 0) {
            pm25Item = pm25Items[0]; // 첫 번째 PM2.5 항목 사용
          }
          
          // 데이터가 있으면 추가 (PM10 우선, 없으면 PM2.5)
          const relevantItem = pm10Item || pm25Item;
          
          if (relevantItem) {
            const pm10Grade = this.extractRegionalGrade(relevantItem.informGrade || '', userRegion);
            const gradeInfo = this.getGradeInfo(pm10Grade);
            
            sevenDayData.push({
              forecastDate: dateString,
              dayOffset: i,
              pm10Grade,
               pm10RegionalInfo: relevantItem.informGrade || undefined,
              gradeInfo,
              source: 'daily'
            });
          } else {
            // 데이터가 없어도 기본값으로 추가
            sevenDayData.push({
              forecastDate: dateString,
              dayOffset: i,
              pm10Grade: '정보없음',
              pm10RegionalInfo: '예보 정보를 확인할 수 없습니다',
              gradeInfo: this.getGradeInfo('정보없음'),
              source: 'daily'
            });
          }
        }
      } else {
        // 일별예보 데이터가 없을 경우 기본값으로 오늘~+2일 추가
        for (let i = 0; i <= 2; i++) {
          const targetDate = new Date(today);
          targetDate.setDate(today.getDate() + i);
          const dateString = targetDate.toISOString().split('T')[0];
          
          sevenDayData.push({
            forecastDate: dateString,
            dayOffset: i,
            pm10Grade: '정보없음',
            pm10RegionalInfo: '일별 예보 정보를 확인할 수 없습니다',
            gradeInfo: this.getGradeInfo('정보없음'),
            source: 'daily'
          });
        }
      }

      // 주간예보 데이터 처리 (오늘+3일~+6일)
      if (weeklyResponse.response.body.items.length > 0) {
        const weeklyItem = weeklyResponse.response.body.items[0];
        
        const weeklyDates = [
          { date: weeklyItem.frcstOneDt, grade: weeklyItem.frcstOneCn, offset: 3 },
          { date: weeklyItem.frcstTwoDt, grade: weeklyItem.frcstTwoCn, offset: 4 },
          { date: weeklyItem.frcstThreeDt, grade: weeklyItem.frcstThreeCn, offset: 5 },
          { date: weeklyItem.frcstFourDt, grade: weeklyItem.frcstFourCn, offset: 6 },
        ];

        weeklyDates.forEach(({ date, grade, offset }) => {
          const targetDate = new Date(today);
          targetDate.setDate(today.getDate() + offset);
          const dateString = targetDate.toISOString().split('T')[0];
          
          if (grade) {
            const pm10Grade = this.extractRegionalGrade(grade, userRegion);
            const gradeInfo = this.getGradeInfo(pm10Grade);
            
            sevenDayData.push({
              forecastDate: dateString,
              dayOffset: offset,
              pm10Grade,
               pm10RegionalInfo: grade || undefined,
              gradeInfo,
              source: 'weekly'
            });
          } else {
            // 주간예보 데이터가 없어도 기본값으로 추가
            sevenDayData.push({
              forecastDate: dateString,
              dayOffset: offset,
              pm10Grade: '정보없음',
              pm10RegionalInfo: '주간 예보 정보를 확인할 수 없습니다',
              gradeInfo: this.getGradeInfo('정보없음'),
              source: 'weekly'
            });
          }
        });
      } else {
        // 주간예보 데이터가 없을 경우 기본값으로 +3일~+6일 추가
        for (let i = 3; i <= 6; i++) {
          const targetDate = new Date(today);
          targetDate.setDate(today.getDate() + i);
          const dateString = targetDate.toISOString().split('T')[0];
          
          sevenDayData.push({
            forecastDate: dateString,
            dayOffset: i,
            pm10Grade: '정보없음',
            pm10RegionalInfo: '주간 예보 정보를 확인할 수 없습니다',
            gradeInfo: this.getGradeInfo('정보없음'),
            source: 'weekly'
          });
        }
      }

      // 날짜순 정렬
      const sortedData = sevenDayData.sort((a, b) => a.dayOffset - b.dayOffset);
      
      console.log('최종 7일간 예보 데이터:', JSON.stringify(sortedData, null, 2));
      
      return sortedData;

    } catch (error) {
      console.error('7일간 예보 조회 실패:', error);
      throw new Error('7일간 대기질 예보를 가져오는데 실패했습니다.');
    }
  }

  /**
   * 최신 일별예보 조회 (오늘 날짜 기준)
   */
  async getLatestDailyForecast(): Promise<ProcessedDailyForecast[]> {
    const today = new Date();
    const searchDate = today.toISOString().split('T')[0];

    try {
      const response = await this.getDailyForecast({
        searchDate,
        returnType: 'json',
      });

      return this.processDailyForecastData(response);
    } catch (error) {
      console.error('최신 일별예보 조회 실패:', error);
      throw new Error('최신 미세먼지 일별예보를 가져오는데 실패했습니다.');
    }
  }
}

// 싱글톤 인스턴스
export const airKoreaService = new AirKoreaService();
