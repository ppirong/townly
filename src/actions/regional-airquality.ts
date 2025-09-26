'use server';

import { regionalAirQualityService } from '@/lib/services/regional-airquality';
import { 
  getStationWithRegion, 
  findNearestStationWithRegion,
  getRegionByStationName,
} from '@/lib/data/stations';
import {
  type RegionalAirQualityRequest,
  type RegionalAirQualityResponse,
  regionalAirQualityRequestSchema,
} from '@/lib/schemas/regional-airquality';
import { auth } from '@clerk/nextjs/server';

/**
 * 측정소명으로 해당 지역의 시간별 대기질 정보 조회
 */
export async function getHourlyAirQualityByStation(
  stationName: string,
  date: string = new Date().toISOString().split('T')[0],
  numOfRows: number = 24
): Promise<RegionalAirQualityResponse> {
  const region = getRegionByStationName(stationName);
  
  if (!region) {
    throw new Error(`측정소 '${stationName}'의 지역 정보를 찾을 수 없습니다.`);
  }

  const request: RegionalAirQualityRequest = {
    regionCode: region.code,
    type: 'hourly',
    startDate: date,
    numOfRows,
  };

  // 요청 데이터 검증
  const validatedRequest = regionalAirQualityRequestSchema.parse(request);
  
  return await regionalAirQualityService.getRegionalHourlyAirQuality(validatedRequest);
}

/**
 * 측정소명으로 해당 지역의 일별 대기질 정보 조회
 */
export async function getDailyAirQualityByStation(
  stationName: string,
  date: string = new Date().toISOString().split('T')[0],
  numOfRows: number = 7
): Promise<RegionalAirQualityResponse> {
  const region = getRegionByStationName(stationName);
  
  if (!region) {
    throw new Error(`측정소 '${stationName}'의 지역 정보를 찾을 수 없습니다.`);
  }

  const request: RegionalAirQualityRequest = {
    regionCode: region.code,
    type: 'daily',
    startDate: date,
    numOfRows,
  };

  // 요청 데이터 검증
  const validatedRequest = regionalAirQualityRequestSchema.parse(request);
  
  return await regionalAirQualityService.getRegionalDailyAirQuality(validatedRequest);
}

/**
 * 지역 코드로 시간별 대기질 정보 조회
 */
export async function getHourlyAirQualityByRegion(
  regionCode: string,
  date: string = new Date().toISOString().split('T')[0],
  numOfRows: number = 24
): Promise<RegionalAirQualityResponse> {
  const request: RegionalAirQualityRequest = {
    regionCode,
    type: 'hourly',
    startDate: date,
    numOfRows,
  };

  // 요청 데이터 검증
  const validatedRequest = regionalAirQualityRequestSchema.parse(request);
  
  return await regionalAirQualityService.getRegionalHourlyAirQuality(validatedRequest);
}

/**
 * 지역 코드로 일별 대기질 정보 조회
 */
export async function getDailyAirQualityByRegion(
  regionCode: string,
  date: string = new Date().toISOString().split('T')[0],
  numOfRows: number = 7
): Promise<RegionalAirQualityResponse> {
  const request: RegionalAirQualityRequest = {
    regionCode,
    type: 'daily',
    startDate: date,
    numOfRows,
  };

  // 요청 데이터 검증
  const validatedRequest = regionalAirQualityRequestSchema.parse(request);
  
  return await regionalAirQualityService.getRegionalDailyAirQuality(validatedRequest);
}

/**
 * 사용자 위치 기반 지역별 시간별 대기질 정보 조회
 */
export async function getHourlyAirQualityByLocation(
  latitude: number,
  longitude: number,
  date: string = new Date().toISOString().split('T')[0],
  numOfRows: number = 24
): Promise<RegionalAirQualityResponse> {
  const nearestInfo = findNearestStationWithRegion(latitude, longitude);
  
  if (!nearestInfo) {
    throw new Error('주변에서 대기질 정보를 제공하는 지역을 찾을 수 없습니다.');
  }

  const request: RegionalAirQualityRequest = {
    regionCode: nearestInfo.region.code,
    type: 'hourly',
    startDate: date,
    numOfRows,
  };

  // 요청 데이터 검증
  const validatedRequest = regionalAirQualityRequestSchema.parse(request);
  
  return await regionalAirQualityService.getRegionalHourlyAirQuality(validatedRequest);
}

/**
 * 사용자 위치 기반 지역별 일별 대기질 정보 조회
 */
export async function getDailyAirQualityByLocation(
  latitude: number,
  longitude: number,
  date: string = new Date().toISOString().split('T')[0],
  numOfRows: number = 7
): Promise<RegionalAirQualityResponse> {
  const nearestInfo = findNearestStationWithRegion(latitude, longitude);
  
  if (!nearestInfo) {
    throw new Error('주변에서 대기질 정보를 제공하는 지역을 찾을 수 없습니다.');
  }

  const request: RegionalAirQualityRequest = {
    regionCode: nearestInfo.region.code,
    type: 'daily',
    startDate: date,
    numOfRows,
  };

  // 요청 데이터 검증
  const validatedRequest = regionalAirQualityRequestSchema.parse(request);
  
  return await regionalAirQualityService.getRegionalDailyAirQuality(validatedRequest);
}

/**
 * 사용자의 선택된 측정소 기반 지역별 대기질 정보 조회
 */
export async function getUserRegionalAirQuality(
  type: 'hourly' | 'daily' = 'hourly',
  date: string = new Date().toISOString().split('T')[0],
  numOfRows: number = type === 'hourly' ? 24 : 7
): Promise<{ station: any; region: any; airQuality: RegionalAirQualityResponse } | null> {
  const { userId } = await auth();
  
  if (!userId) {
    throw new Error('로그인이 필요합니다.');
  }

  // 사용자의 선택된 측정소 조회 (여기서는 기본값으로 서울 중구 사용)
  const stationName = '중구'; // 실제로는 DB에서 사용자의 선택된 측정소를 조회해야 함
  
  const stationWithRegion = getStationWithRegion(stationName);
  if (!stationWithRegion) {
    return null;
  }

  const request: RegionalAirQualityRequest = {
    regionCode: stationWithRegion.region.code,
    type,
    startDate: date,
    numOfRows,
  };

  // 요청 데이터 검증
  const validatedRequest = regionalAirQualityRequestSchema.parse(request);
  
  const airQuality = type === 'hourly' 
    ? await regionalAirQualityService.getRegionalHourlyAirQuality(validatedRequest)
    : await regionalAirQualityService.getRegionalDailyAirQuality(validatedRequest);

  return {
    station: stationWithRegion.station,
    region: stationWithRegion.region,
    airQuality,
  };
}

/**
 * 지원되는 모든 지역 목록 조회
 */
export async function getSupportedRegions() {
  return regionalAirQualityService.getSupportedRegions();
}

/**
 * 측정소와 지역 정보 함께 조회
 */
export async function getStationAndRegionInfo(stationName: string) {
  return getStationWithRegion(stationName);
}

/**
 * 사용자 위치에서 가장 가까운 측정소와 지역 정보 조회
 */
export async function getNearestStationAndRegion(latitude: number, longitude: number) {
  return findNearestStationWithRegion(latitude, longitude);
}
