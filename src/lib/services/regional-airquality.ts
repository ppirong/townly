import { eq, and, desc } from 'drizzle-orm';
import { db } from '@/db';
import { regionalHourlyAirQuality, regionalDailyAirQuality } from '@/db/schema';
import { airKoreaService } from './airkorea';
import { 
  getRegionByCode, 
  airQualityRegions, 
  type RegionInfo,
} from '@/lib/data/stations';
import {
  type RegionalAirQualityRequest,
  type RegionalAirQualityResponse,
  type HourlyRegionalAirQuality,
  type DailyRegionalAirQuality,
  generateRegionalCacheKey,
} from '@/lib/schemas/regional-airquality';

/**
 * 지역별 대기질 정보 서비스
 */
class RegionalAirQualityService {
  
  /**
   * 지역별 시간별 대기질 정보 조회
   */
  async getRegionalHourlyAirQuality(params: RegionalAirQualityRequest): Promise<RegionalAirQualityResponse> {
    const { regionCode, startDate, endDate = startDate, numOfRows = 24 } = params;
    
    const region = getRegionByCode(regionCode);
    if (!region) {
      throw new Error(`지원하지 않는 지역코드입니다: ${regionCode}`);
    }

    // 캐시에서 데이터 조회
    const cachedData = await this.getCachedHourlyData(regionCode, startDate, endDate);
    
    if (cachedData.length >= numOfRows) {
      return {
        regionCode,
        regionName: region.name,
        type: 'hourly',
        data: cachedData.slice(0, numOfRows).map(this.mapHourlyDBToSchema),
        metadata: {
          totalCount: cachedData.length,
          requestedAt: new Date().toISOString(),
          dataSource: 'cache',
        },
      };
    }

    // API에서 새 데이터 조회
    try {
      const apiData = await this.fetchHourlyDataFromAPI(region, startDate, numOfRows);
      
      // 데이터베이스에 캐시
      await this.cacheHourlyData(region, apiData, startDate);
      
      return {
        regionCode,
        regionName: region.name,
        type: 'hourly',
        data: apiData,
        metadata: {
          totalCount: apiData.length,
          requestedAt: new Date().toISOString(),
          dataSource: 'api',
        },
      };
    } catch (error) {
      console.error('지역별 시간별 대기질 조회 실패:', error);
      
      // 캐시된 데이터라도 반환
      if (cachedData.length > 0) {
        return {
          regionCode,
          regionName: region.name,
          type: 'hourly',
          data: cachedData.slice(0, numOfRows).map(this.mapHourlyDBToSchema),
          metadata: {
            totalCount: cachedData.length,
            requestedAt: new Date().toISOString(),
            dataSource: 'cache_fallback',
          },
        };
      }
      
      throw new Error('지역별 시간별 대기질 정보를 가져올 수 없습니다.');
    }
  }

  /**
   * 지역별 일별 대기질 정보 조회
   */
  async getRegionalDailyAirQuality(params: RegionalAirQualityRequest): Promise<RegionalAirQualityResponse> {
    const { regionCode, startDate, endDate = startDate, numOfRows = 7 } = params;
    
    const region = getRegionByCode(regionCode);
    if (!region) {
      throw new Error(`지원하지 않는 지역코드입니다: ${regionCode}`);
    }

    // 캐시에서 데이터 조회
    const cachedData = await this.getCachedDailyData(regionCode, startDate, endDate);
    
    if (cachedData.length >= numOfRows) {
      return {
        regionCode,
        regionName: region.name,
        type: 'daily',
        data: cachedData.slice(0, numOfRows).map(this.mapDailyDBToSchema),
        metadata: {
          totalCount: cachedData.length,
          requestedAt: new Date().toISOString(),
          dataSource: 'cache',
        },
      };
    }

    // API에서 새 데이터 조회
    try {
      const apiData = await this.fetchDailyDataFromAPI(region, startDate, numOfRows);
      
      // 데이터베이스에 캐시
      await this.cacheDailyData(region, apiData, startDate);
      
      return {
        regionCode,
        regionName: region.name,
        type: 'daily',
        data: apiData,
        metadata: {
          totalCount: apiData.length,
          requestedAt: new Date().toISOString(),
          dataSource: 'api',
        },
      };
    } catch (error) {
      console.error('지역별 일별 대기질 조회 실패:', error);
      
      // 캐시된 데이터라도 반환
      if (cachedData.length > 0) {
        return {
          regionCode,
          regionName: region.name,
          type: 'daily',
          data: cachedData.slice(0, numOfRows).map(this.mapDailyDBToSchema),
          metadata: {
            totalCount: cachedData.length,
            requestedAt: new Date().toISOString(),
            dataSource: 'cache_fallback',
          },
        };
      }
      
      throw new Error('지역별 일별 대기질 정보를 가져올 수 없습니다.');
    }
  }

  /**
   * API에서 시간별 데이터 조회
   */
  private async fetchHourlyDataFromAPI(
    region: RegionInfo, 
    date: string, 
    numOfRows: number
  ): Promise<HourlyRegionalAirQuality[]> {
    // 지역의 대표 측정소를 이용해 실제 측정소별 시간별 데이터를 조회
    const stationName = this.getRepresentativeStationName(region);
    
    try {
      // 측정소별 실시간 측정정보 조회 (DAILY dataTerm으로 시간별 데이터 확보)
      const response = await airKoreaService.getRealtimeAirQuality({
        stationName,
        dataTerm: 'DAILY', // 일주일치 시간별 데이터
        numOfRows: numOfRows,
        returnType: 'json',
        pageNo: 1,
        ver: '1.3',
      });

      if (!response.response.body.items || response.response.body.items.length === 0) {
        console.warn(`${stationName} 측정소의 시간별 데이터가 없습니다.`);
        return [];
      }

      // 최신 데이터부터 시간별로 정렬
      const sortedItems = response.response.body.items
        .filter(item => item.dataTime) // dataTime이 있는 항목만
        .sort((a, b) => new Date(b.dataTime!).getTime() - new Date(a.dataTime!).getTime())
        .slice(0, numOfRows);

      console.log(`${stationName} 측정소 시간별 데이터 ${sortedItems.length}개 조회 완료`);
      console.log('첫 번째 데이터 샘플:', sortedItems[0]);

      return sortedItems.map((item, index) => {
        const dataTime = new Date(item.dataTime!);
        const hour = dataTime.getHours();
        const dateStr = dataTime.toISOString().split('T')[0];

        return {
          type: 'hourly',
          regionCode: region.code,
          regionName: region.name,
          sidoName: region.apiSidoName,
          date: dateStr,
          hour,
          dataTime: item.dataTime!,
          
          khaiValue: item.khaiValue || undefined,
          khaiGrade: item.khaiGrade || undefined,
          
          // PM10/PM2.5 농도 값과 등급을 명시적으로 매핑
          pm10Value: item.pm10Value || undefined,
          pm10Grade: item.pm10Grade || undefined,
          
          pm25Value: item.pm25Value || undefined,
          pm25Grade: item.pm25Grade || undefined,
          
          o3Value: item.o3Value || undefined,
          o3Grade: item.o3Grade || undefined,
          
          no2Value: item.no2Value || undefined,
          no2Grade: item.no2Grade || undefined,
          
          coValue: item.coValue || undefined,
          coGrade: item.coGrade || undefined,
          
          so2Value: item.so2Value || undefined,
          so2Grade: item.so2Grade || undefined,
        };
      });

    } catch (error) {
      console.error(`${stationName} 측정소 시간별 데이터 조회 실패:`, error);
      return [];
    }
  }

  /**
   * API에서 일별 데이터 조회
   */
  private async fetchDailyDataFromAPI(
    region: RegionInfo, 
    date: string, 
    numOfRows: number
  ): Promise<DailyRegionalAirQuality[]> {
    // 지역의 대표 측정소를 이용해 실제 측정소별 일별 데이터를 조회
    const stationName = this.getRepresentativeStationName(region);
    
    try {
      // 측정소별 실시간 측정정보 조회 (3MONTH dataTerm으로 일별 데이터 확보)
      const response = await airKoreaService.getRealtimeAirQuality({
        stationName,
        dataTerm: '3MONTH', // 3개월치 일별 데이터
        numOfRows: numOfRows * 3, // 여유있게 더 많이 가져와서 필터링
        returnType: 'json',
        pageNo: 1,
        ver: '1.3',
      });

      if (!response.response.body.items || response.response.body.items.length === 0) {
        console.warn(`${stationName} 측정소의 일별 데이터가 없습니다.`);
        return [];
      }

      // 날짜별로 그룹화하여 일평균 계산
      const dailyGroups = new Map<string, any[]>();
      
      response.response.body.items
        .filter(item => item.dataTime && item.pm10Value && item.pm25Value)
        .forEach(item => {
          const itemDate = new Date(item.dataTime!);
          const dateKey = itemDate.toISOString().split('T')[0];
          
          if (!dailyGroups.has(dateKey)) {
            dailyGroups.set(dateKey, []);
          }
          dailyGroups.get(dateKey)!.push(item);
        });

      // 최신 날짜부터 정렬하여 요청된 개수만큼 반환
      const sortedDates = Array.from(dailyGroups.keys())
        .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
        .slice(0, numOfRows);

      console.log(`${stationName} 측정소 일별 데이터 ${sortedDates.length}개 날짜 조회 완료`);

      return sortedDates.map(dateKey => {
        const dayItems = dailyGroups.get(dateKey)!;
        
        // 일별 통계 계산
        const pm10Values = dayItems.map(item => parseFloat(item.pm10Value!)).filter(v => !isNaN(v));
        const pm25Values = dayItems.map(item => parseFloat(item.pm25Value!)).filter(v => !isNaN(v));
        const o3Values = dayItems.map(item => parseFloat(item.o3Value || '0')).filter(v => !isNaN(v));

        const latestItem = dayItems[0]; // 해당 날짜의 가장 최신 데이터

        return {
          type: 'daily',
          regionCode: region.code,
          regionName: region.name,
          sidoName: region.apiSidoName,
          date: dateKey,
          dataTime: latestItem.dataTime!,
          
          khaiValue: latestItem.khaiValue || undefined,
          khaiGrade: latestItem.khaiGrade || undefined,
          
          // 대표값 (가장 최신 데이터)
          pm10Value: latestItem.pm10Value || undefined,
          pm10Grade: latestItem.pm10Grade || undefined,
          // 통계값
          pm10Avg: pm10Values.length > 0 ? Math.round(pm10Values.reduce((a, b) => a + b, 0) / pm10Values.length).toString() : undefined,
          pm10Max: pm10Values.length > 0 ? Math.max(...pm10Values).toString() : undefined,
          pm10Min: pm10Values.length > 0 ? Math.min(...pm10Values).toString() : undefined,
          
          // 대표값 (가장 최신 데이터)
          pm25Value: latestItem.pm25Value || undefined,
          pm25Grade: latestItem.pm25Grade || undefined,
          // 통계값
          pm25Avg: pm25Values.length > 0 ? Math.round(pm25Values.reduce((a, b) => a + b, 0) / pm25Values.length).toString() : undefined,
          pm25Max: pm25Values.length > 0 ? Math.max(...pm25Values).toString() : undefined,
          pm25Min: pm25Values.length > 0 ? Math.min(...pm25Values).toString() : undefined,
          
          o3Value: latestItem.o3Value || undefined,
          o3Grade: latestItem.o3Grade || undefined,
          o3Avg: o3Values.length > 0 ? (Math.round(o3Values.reduce((a, b) => a + b, 0) / o3Values.length * 1000) / 1000).toString() : undefined,
          o3Max: o3Values.length > 0 ? (Math.round(Math.max(...o3Values) * 1000) / 1000).toString() : undefined,
          o3Min: o3Values.length > 0 ? (Math.round(Math.min(...o3Values) * 1000) / 1000).toString() : undefined,
          
          no2Value: latestItem.no2Value || undefined,
          no2Grade: latestItem.no2Grade || undefined,
          
          coValue: latestItem.coValue || undefined,
          coGrade: latestItem.coGrade || undefined,
          
          so2Value: latestItem.so2Value || undefined,
          so2Grade: latestItem.so2Grade || undefined,
        };
      });

    } catch (error) {
      console.error(`${stationName} 측정소 일별 데이터 조회 실패:`, error);
      return [];
    }
  }

  /**
   * 시간별 데이터 캐시
   */
  private async cacheHourlyData(
    region: RegionInfo,
    data: HourlyRegionalAirQuality[],
    date: string
  ): Promise<void> {
    const cacheKey = generateRegionalCacheKey(region.code, 'hourly', date);
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1); // 1시간 캐시

    for (const item of data) {
      try {
        await db.insert(regionalHourlyAirQuality).values({
          regionCode: region.code,
          regionName: region.name,
          sidoName: region.apiSidoName,
          measureDate: item.date,
          measureHour: item.hour,
          dataTime: item.dataTime,
          khaiValue: item.khaiValue,
          khaiGrade: item.khaiGrade,
          pm10Value: item.pm10Value,
          pm10Grade: item.pm10Grade,
          pm25Value: item.pm25Value,
          pm25Grade: item.pm25Grade,
          o3Value: item.o3Value,
          o3Grade: item.o3Grade,
          no2Value: item.no2Value,
          no2Grade: item.no2Grade,
          coValue: item.coValue,
          coGrade: item.coGrade,
          so2Value: item.so2Value,
          so2Grade: item.so2Grade,
          cacheKey: `${cacheKey}_${item.hour}`,
          expiresAt,
          rawData: item,
        });
      } catch (error) {
        console.error('시간별 데이터 캐시 실패:', error);
      }
    }
  }

  /**
   * 일별 데이터 캐시
   */
  private async cacheDailyData(
    region: RegionInfo,
    data: DailyRegionalAirQuality[],
    date: string
  ): Promise<void> {
    const cacheKey = generateRegionalCacheKey(region.code, 'daily', date);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 1); // 1일 캐시

    for (const item of data) {
      try {
        await db.insert(regionalDailyAirQuality).values({
          regionCode: region.code,
          regionName: region.name,
          sidoName: region.apiSidoName,
          measureDate: item.date,
          dataTime: item.dataTime,
          khaiValue: item.khaiValue,
          khaiGrade: item.khaiGrade,
          pm10Value: item.pm10Value,
          pm10Grade: item.pm10Grade,
          pm10Avg: item.pm10Avg,
          pm10Max: item.pm10Max,
          pm10Min: item.pm10Min,
          pm25Value: item.pm25Value,
          pm25Grade: item.pm25Grade,
          pm25Avg: item.pm25Avg,
          pm25Max: item.pm25Max,
          pm25Min: item.pm25Min,
          o3Value: item.o3Value,
          o3Grade: item.o3Grade,
          o3Avg: item.o3Avg,
          o3Max: item.o3Max,
          o3Min: item.o3Min,
          no2Value: item.no2Value,
          no2Grade: item.no2Grade,
          coValue: item.coValue,
          coGrade: item.coGrade,
          so2Value: item.so2Value,
          so2Grade: item.so2Grade,
          cacheKey: `${cacheKey}_${item.date}`,
          expiresAt,
          rawData: item,
        });
      } catch (error) {
        console.error('일별 데이터 캐시 실패:', error);
      }
    }
  }

  /**
   * 캐시된 시간별 데이터 조회
   */
  private async getCachedHourlyData(
    regionCode: string,
    startDate: string,
    endDate: string
  ) {
    return await db
      .select()
      .from(regionalHourlyAirQuality)
      .where(
        and(
          eq(regionalHourlyAirQuality.regionCode, regionCode),
          eq(regionalHourlyAirQuality.measureDate, startDate)
        )
      )
      .orderBy(desc(regionalHourlyAirQuality.measureHour));
  }

  /**
   * 캐시된 일별 데이터 조회
   */
  private async getCachedDailyData(
    regionCode: string,
    startDate: string,
    endDate: string
  ) {
    return await db
      .select()
      .from(regionalDailyAirQuality)
      .where(
        and(
          eq(regionalDailyAirQuality.regionCode, regionCode),
          eq(regionalDailyAirQuality.measureDate, startDate)
        )
      )
      .orderBy(desc(regionalDailyAirQuality.measureDate));
  }

  /**
   * DB 시간별 데이터를 스키마로 변환
   */
  private mapHourlyDBToSchema(dbData: any): HourlyRegionalAirQuality {
    return {
      type: 'hourly',
      regionCode: dbData.regionCode,
      regionName: dbData.regionName,
      sidoName: dbData.sidoName,
      date: dbData.measureDate,
      hour: dbData.measureHour,
      dataTime: dbData.dataTime,
      khaiValue: dbData.khaiValue,
      khaiGrade: dbData.khaiGrade,
      pm10Value: dbData.pm10Value,
      pm10Grade: dbData.pm10Grade,
      pm25Value: dbData.pm25Value,
      pm25Grade: dbData.pm25Grade,
      o3Value: dbData.o3Value,
      o3Grade: dbData.o3Grade,
      no2Value: dbData.no2Value,
      no2Grade: dbData.no2Grade,
      coValue: dbData.coValue,
      coGrade: dbData.coGrade,
      so2Value: dbData.so2Value,
      so2Grade: dbData.so2Grade,
    };
  }

  /**
   * DB 일별 데이터를 스키마로 변환
   */
  private mapDailyDBToSchema(dbData: any): DailyRegionalAirQuality {
    return {
      type: 'daily',
      regionCode: dbData.regionCode,
      regionName: dbData.regionName,
      sidoName: dbData.sidoName,
      date: dbData.measureDate,
      dataTime: dbData.dataTime,
      khaiValue: dbData.khaiValue,
      khaiGrade: dbData.khaiGrade,
      pm10Value: dbData.pm10Value,
      pm10Grade: dbData.pm10Grade,
      pm10Avg: dbData.pm10Avg,
      pm10Max: dbData.pm10Max,
      pm10Min: dbData.pm10Min,
      pm25Value: dbData.pm25Value,
      pm25Grade: dbData.pm25Grade,
      pm25Avg: dbData.pm25Avg,
      pm25Max: dbData.pm25Max,
      pm25Min: dbData.pm25Min,
      o3Value: dbData.o3Value,
      o3Grade: dbData.o3Grade,
      o3Avg: dbData.o3Avg,
      o3Max: dbData.o3Max,
      o3Min: dbData.o3Min,
      no2Value: dbData.no2Value,
      no2Grade: dbData.no2Grade,
      coValue: dbData.coValue,
      coGrade: dbData.coGrade,
      so2Value: dbData.so2Value,
      so2Grade: dbData.so2Grade,
    };
  }

  /**
   * 지원되는 모든 지역 목록 조회
   */
  getSupportedRegions(): RegionInfo[] {
    return airQualityRegions;
  }

  /**
   * 지역의 대표 측정소명 조회
   */
  private getRepresentativeStationName(region: RegionInfo): string {
    // 지역별 대표 측정소 매핑
    const representativeStations: Record<string, string> = {
      'seoul': '중구',
      'gyeonggi_north': '고양시',
      'gyeonggi_south': '수원시',
      'incheon': '부평구',
      'gangwon': '춘천시',
      'chungbuk': '청주시',
      'chungnam': '천안시',
      'jeonbuk': '전주시',
      'jeonnam': '광주시',
      'gyeongbuk': '대구시',
      'gyeongnam': '창원시',
      'busan': '연제구',
      'ulsan': '남구',
      'daegu': '중구',
      'daejeon': '서구',
      'gwangju': '서구',
      'jeju': '제주시',
      'sejong': '세종시',
    };

    return representativeStations[region.code] || '중구';
  }
}

// 싱글톤 인스턴스
export const regionalAirQualityService = new RegionalAirQualityService();
