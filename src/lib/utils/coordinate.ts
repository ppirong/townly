/**
 * 좌표 변환 유틸리티
 * GPS 좌표(WGS84)를 TM 좌표계로 변환
 */

// TM 좌표계 변환을 위한 상수들
const EARTH_RADIUS = 6378137.0;
const FLATTENING = 1.0 / 298.257223563;
const ECCENTRICITY_SQUARED = 2 * FLATTENING - FLATTENING * FLATTENING;

// TM 투영 상수 (한국 중부원점)
const TM_SCALE_FACTOR = 1.0;
const TM_FALSE_EASTING = 500000.0;
const TM_FALSE_NORTHING = 200000.0;
const TM_CENTRAL_MERIDIAN = 127.0 * Math.PI / 180.0; // 경도 127도
const TM_LATITUDE_OF_ORIGIN = 38.0 * Math.PI / 180.0; // 위도 38도

/**
 * WGS84 좌표를 TM 좌표로 변환
 * @param latitude 위도 (도 단위)
 * @param longitude 경도 (도 단위)
 * @returns {tmX, tmY} TM 좌표
 */
export function wgs84ToTm(latitude: number, longitude: number): { tmX: number; tmY: number } {
  const lat = latitude * Math.PI / 180.0;
  const lon = longitude * Math.PI / 180.0;
  
  const deltaLon = lon - TM_CENTRAL_MERIDIAN;
  
  const N = EARTH_RADIUS / Math.sqrt(1 - ECCENTRICITY_SQUARED * Math.sin(lat) * Math.sin(lat));
  const T = Math.tan(lat) * Math.tan(lat);
  const C = ECCENTRICITY_SQUARED * Math.cos(lat) * Math.cos(lat) / (1 - ECCENTRICITY_SQUARED);
  const A = Math.cos(lat) * deltaLon;
  
  const M = EARTH_RADIUS * (
    (1 - ECCENTRICITY_SQUARED / 4 - 3 * ECCENTRICITY_SQUARED * ECCENTRICITY_SQUARED / 64) * lat -
    (3 * ECCENTRICITY_SQUARED / 8 + 3 * ECCENTRICITY_SQUARED * ECCENTRICITY_SQUARED / 32) * Math.sin(2 * lat) +
    (15 * ECCENTRICITY_SQUARED * ECCENTRICITY_SQUARED / 256) * Math.sin(4 * lat)
  );
  
  const M0 = EARTH_RADIUS * (
    (1 - ECCENTRICITY_SQUARED / 4 - 3 * ECCENTRICITY_SQUARED * ECCENTRICITY_SQUARED / 64) * TM_LATITUDE_OF_ORIGIN -
    (3 * ECCENTRICITY_SQUARED / 8 + 3 * ECCENTRICITY_SQUARED * ECCENTRICITY_SQUARED / 32) * Math.sin(2 * TM_LATITUDE_OF_ORIGIN) +
    (15 * ECCENTRICITY_SQUARED * ECCENTRICITY_SQUARED / 256) * Math.sin(4 * TM_LATITUDE_OF_ORIGIN)
  );
  
  const tmX = TM_SCALE_FACTOR * N * (
    A + (1 - T + C) * A * A * A / 6 + 
    (5 - 18 * T + T * T + 72 * C - 58 * ECCENTRICITY_SQUARED) * A * A * A * A * A / 120
  ) + TM_FALSE_EASTING;
  
  const tmY = TM_SCALE_FACTOR * (
    M - M0 + N * Math.tan(lat) * (
      A * A / 2 + (5 - T + 9 * C + 4 * C * C) * A * A * A * A / 24 +
      (61 - 58 * T + T * T + 600 * C - 330 * ECCENTRICITY_SQUARED) * A * A * A * A * A * A / 720
    )
  ) + TM_FALSE_NORTHING;
  
  return {
    tmX: Math.round(tmX),
    tmY: Math.round(tmY)
  };
}

/**
 * 두 지점 간의 거리 계산 (하버사인 공식)
 * @param lat1 첫 번째 지점의 위도
 * @param lon1 첫 번째 지점의 경도
 * @param lat2 두 번째 지점의 위도
 * @param lon2 두 번째 지점의 경도
 * @returns 거리 (미터)
 */
export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // 지구 반지름 (미터)
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  return R * c;
}

/**
 * 카카오 API를 사용한 좌표 변환 (더 정확한 방법)
 * @param latitude WGS84 위도
 * @param longitude WGS84 경도
 * @returns Promise<{tmX, tmY}> TM 좌표
 */
export async function convertToTmUsingKakao(latitude: number, longitude: number): Promise<{ tmX: number; tmY: number }> {
  try {
    // 카카오 좌표 변환 API 호출 (서버에서만 가능)
    const response = await fetch('/api/kakao/convert-coordinate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        x: longitude,
        y: latitude,
        input_coord: 'WGS84',
        output_coord: 'TM'
      }),
    });
    
    if (!response.ok) {
      throw new Error('좌표 변환 실패');
    }
    
    const data = await response.json();
    return {
      tmX: Math.round(parseFloat(data.documents[0].x)),
      tmY: Math.round(parseFloat(data.documents[0].y))
    };
  } catch (error) {
    console.error('카카오 좌표 변환 실패, 자체 변환 사용:', error);
    // 카카오 API 실패 시 자체 변환 함수 사용
    return wgs84ToTm(latitude, longitude);
  }
}
