import { env } from '@/lib/env';
import {
  type RealtimeAirQualityRequest,
  type SidoRealtimeAirQualityRequest,
  type NearbyStationRequest,
  type AirQualityResponse,
  type NearbyStationResponse,
  airQualityResponseSchema,
  nearbyStationResponseSchema,
} from '@/lib/schemas/airquality';

/**
 * 한국환경공단 에어코리아 OpenAPI 서비스
 */

const BASE_URL = 'http://apis.data.go.kr/B552584/ArpltnInforInqireSvc';

class AirKoreaService {
  private apiKey: string;

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
}

// 싱글톤 인스턴스
export const airKoreaService = new AirKoreaService();
