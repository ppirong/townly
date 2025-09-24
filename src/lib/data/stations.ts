/**
 * 에어코리아 측정소별 위치 정보 데이터베이스
 * 주요 측정소들의 위도, 경도 정보를 포함합니다.
 */

export interface StationInfo {
  name: string;
  sido: string;
  latitude: number;
  longitude: number;
  address: string;
}

// 서울 지역 주요 측정소
export const seoulStations: StationInfo[] = [
  { name: '중구', sido: '서울', latitude: 37.5635, longitude: 126.9975, address: '서울특별시 중구' },
  { name: '종로구', sido: '서울', latitude: 37.5735, longitude: 126.9788, address: '서울특별시 종로구' },
  { name: '용산구', sido: '서울', latitude: 37.5384, longitude: 126.9648, address: '서울특별시 용산구' },
  { name: '성동구', sido: '서울', latitude: 37.5506, longitude: 127.0408, address: '서울특별시 성동구' },
  { name: '광진구', sido: '서울', latitude: 37.5429, longitude: 127.0845, address: '서울특별시 광진구' },
  { name: '동대문구', sido: '서울', latitude: 37.5838, longitude: 127.0507, address: '서울특별시 동대문구' },
  { name: '중랑구', sido: '서울', latitude: 37.5951, longitude: 127.0928, address: '서울특별시 중랑구' },
  { name: '성북구', sido: '서울', latitude: 37.6066, longitude: 127.0186, address: '서울특별시 성북구' },
  { name: '강북구', sido: '서울', latitude: 37.6469, longitude: 127.0147, address: '서울특별시 강북구' },
  { name: '도봉구', sido: '서울', latitude: 37.6658, longitude: 127.0317, address: '서울특별시 도봉구' },
  { name: '노원구', sido: '서울', latitude: 37.6541, longitude: 127.0750, address: '서울특별시 노원구' },
  { name: '은평구', sido: '서울', latitude: 37.6176, longitude: 126.9227, address: '서울특별시 은평구' },
  { name: '서대문구', sido: '서울', latitude: 37.5791, longitude: 126.9368, address: '서울특별시 서대문구' },
  { name: '마포구', sido: '서울', latitude: 37.5637, longitude: 126.9084, address: '서울특별시 마포구' },
  { name: '양천구', sido: '서울', latitude: 37.5269, longitude: 126.8555, address: '서울특별시 양천구' },
  { name: '강서구', sido: '서울', latitude: 37.5657, longitude: 126.8226, address: '서울특별시 강서구' },
  { name: '구로구', sido: '서울', latitude: 37.4954, longitude: 126.8574, address: '서울특별시 구로구' },
  { name: '금천구', sido: '서울', latitude: 37.4570, longitude: 126.9008, address: '서울특별시 금천구' },
  { name: '영등포구', sido: '서울', latitude: 37.5264, longitude: 126.8962, address: '서울특별시 영등포구' },
  { name: '동작구', sido: '서울', latitude: 37.4982, longitude: 126.9516, address: '서울특별시 동작구' },
  { name: '관악구', sido: '서울', latitude: 37.4653, longitude: 126.9446, address: '서울특별시 관악구' },
  { name: '서초구', sido: '서울', latitude: 37.4739, longitude: 127.0323, address: '서울특별시 서초구' },
  { name: '강남구', sido: '서울', latitude: 37.4979, longitude: 127.0276, address: '서울특별시 강남구' },
  { name: '송파구', sido: '서울', latitude: 37.5145, longitude: 127.1059, address: '서울특별시 송파구' },
  { name: '강동구', sido: '서울', latitude: 37.5505, longitude: 127.1468, address: '서울특별시 강동구' },
];

// 경기도 주요 측정소
export const gyeonggiStations: StationInfo[] = [
  { name: '수원', sido: '경기', latitude: 37.2636, longitude: 127.0286, address: '경기도 수원시' },
  { name: '성남', sido: '경기', latitude: 37.4449, longitude: 127.1388, address: '경기도 성남시' },
  { name: '의정부', sido: '경기', latitude: 37.7382, longitude: 127.0442, address: '경기도 의정부시' },
  { name: '안양', sido: '경기', latitude: 37.3943, longitude: 126.9568, address: '경기도 안양시' },
  { name: '부천', sido: '경기', latitude: 37.5035, longitude: 126.7660, address: '경기도 부천시' },
  { name: '광명', sido: '경기', latitude: 37.4782, longitude: 126.8644, address: '경기도 광명시' },
  { name: '평택', sido: '경기', latitude: 36.9921, longitude: 127.1129, address: '경기도 평택시' },
  { name: '동두천', sido: '경기', latitude: 37.9034, longitude: 127.0606, address: '경기도 동두천시' },
  { name: '안산', sido: '경기', latitude: 37.3236, longitude: 126.8219, address: '경기도 안산시' },
  { name: '고양', sido: '경기', latitude: 37.6584, longitude: 126.8320, address: '경기도 고양시' },
  { name: '과천', sido: '경기', latitude: 37.4292, longitude: 126.9876, address: '경기도 과천시' },
  { name: '구리', sido: '경기', latitude: 37.5943, longitude: 127.1296, address: '경기도 구리시' },
  { name: '남양주', sido: '경기', latitude: 37.6369, longitude: 127.2166, address: '경기도 남양주시' },
  { name: '오산', sido: '경기', latitude: 37.1499, longitude: 127.0778, address: '경기도 오산시' },
  { name: '시흥', sido: '경기', latitude: 37.3800, longitude: 126.8028, address: '경기도 시흥시' },
  { name: '군포', sido: '경기', latitude: 37.3617, longitude: 126.9352, address: '경기도 군포시' },
  { name: '의왕', sido: '경기', latitude: 37.3448, longitude: 126.9687, address: '경기도 의왕시' },
  { name: '하남', sido: '경기', latitude: 37.5390, longitude: 127.2035, address: '경기도 하남시' },
  { name: '용인', sido: '경기', latitude: 37.2411, longitude: 127.1776, address: '경기도 용인시' },
  { name: '파주', sido: '경기', latitude: 37.7598, longitude: 126.7802, address: '경기도 파주시' },
  { name: '이천', sido: '경기', latitude: 37.2797, longitude: 127.4435, address: '경기도 이천시' },
  { name: '안성', sido: '경기', latitude: 37.0078, longitude: 127.2795, address: '경기도 안성시' },
  { name: '김포', sido: '경기', latitude: 37.6150, longitude: 126.7159, address: '경기도 김포시' },
  { name: '화성', sido: '경기', latitude: 37.1997, longitude: 126.8312, address: '경기도 화성시' },
  { name: '광주', sido: '경기', latitude: 37.4292, longitude: 127.2550, address: '경기도 광주시' },
  { name: '양주', sido: '경기', latitude: 37.7851, longitude: 127.0456, address: '경기도 양주시' },
  { name: '포천', sido: '경기', latitude: 37.8949, longitude: 127.2002, address: '경기도 포천시' },
  { name: '여주', sido: '경기', latitude: 37.2982, longitude: 127.6372, address: '경기도 여주시' },
  { name: '연천', sido: '경기', latitude: 38.0966, longitude: 127.0748, address: '경기도 연천군' },
  { name: '가평', sido: '경기', latitude: 37.8315, longitude: 127.5109, address: '경기도 가평군' },
  { name: '양평', sido: '경기', latitude: 37.4915, longitude: 127.4873, address: '경기도 양평군' },
];

// 인천 지역 주요 측정소
export const incheonStations: StationInfo[] = [
  { name: '중구', sido: '인천', latitude: 37.4738, longitude: 126.6214, address: '인천광역시 중구' },
  { name: '동구', sido: '인천', latitude: 37.4740, longitude: 126.6432, address: '인천광역시 동구' },
  { name: '미추홀구', sido: '인천', latitude: 37.4638, longitude: 126.6505, address: '인천광역시 미추홀구' },
  { name: '연수구', sido: '인천', latitude: 37.4094, longitude: 126.6788, address: '인천광역시 연수구' },
  { name: '남동구', sido: '인천', latitude: 37.4468, longitude: 126.7315, address: '인천광역시 남동구' },
  { name: '부평구', sido: '인천', latitude: 37.5073, longitude: 126.7219, address: '인천광역시 부평구' },
  { name: '계양구', sido: '인천', latitude: 37.5379, longitude: 126.7378, address: '인천광역시 계양구' },
  { name: '서구', sido: '인천', latitude: 37.5459, longitude: 126.6761, address: '인천광역시 서구' },
  { name: '강화군', sido: '인천', latitude: 37.7473, longitude: 126.4879, address: '인천광역시 강화군' },
  { name: '옹진군', sido: '인천', latitude: 37.4468, longitude: 126.6367, address: '인천광역시 옹진군' },
];

// 부산 지역 주요 측정소
export const busanStations: StationInfo[] = [
  { name: '중구', sido: '부산', latitude: 35.1066, longitude: 129.0322, address: '부산광역시 중구' },
  { name: '서구', sido: '부산', latitude: 35.0971, longitude: 129.0243, address: '부산광역시 서구' },
  { name: '동구', sido: '부산', latitude: 35.1368, longitude: 129.0567, address: '부산광역시 동구' },
  { name: '영도구', sido: '부산', latitude: 35.0908, longitude: 129.0679, address: '부산광역시 영도구' },
  { name: '부산진구', sido: '부산', latitude: 35.1618, longitude: 129.0532, address: '부산광역시 부산진구' },
  { name: '동래구', sido: '부산', latitude: 35.2049, longitude: 129.0826, address: '부산광역시 동래구' },
  { name: '남구', sido: '부산', latitude: 35.1366, longitude: 129.0840, address: '부산광역시 남구' },
  { name: '북구', sido: '부산', latitude: 35.1949, longitude: 128.9895, address: '부산광역시 북구' },
  { name: '해운대구', sido: '부산', latitude: 35.1631, longitude: 129.1640, address: '부산광역시 해운대구' },
  { name: '사하구', sido: '부산', latitude: 35.1043, longitude: 128.9745, address: '부산광역시 사하구' },
  { name: '금정구', sido: '부산', latitude: 35.2434, longitude: 129.0923, address: '부산광역시 금정구' },
  { name: '강서구', sido: '부산', latitude: 35.2119, longitude: 128.9803, address: '부산광역시 강서구' },
  { name: '연제구', sido: '부산', latitude: 35.1763, longitude: 129.0802, address: '부산광역시 연제구' },
  { name: '수영구', sido: '부산', latitude: 35.1456, longitude: 129.1138, address: '부산광역시 수영구' },
  { name: '사상구', sido: '부산', latitude: 35.1495, longitude: 128.9906, address: '부산광역시 사상구' },
  { name: '기장군', sido: '부산', latitude: 35.2447, longitude: 129.2224, address: '부산광역시 기장군' },
];

// 전체 측정소 데이터베이스
export const allStations: StationInfo[] = [
  ...seoulStations,
  ...gyeonggiStations,
  ...incheonStations,
  ...busanStations,
  // 추가 지역들도 필요시 확장 가능
];

/**
 * 시도명으로 해당 지역의 측정소 목록 가져오기
 */
export function getStationsBySido(sido: string): StationInfo[] {
  return allStations.filter(station => station.sido === sido);
}

/**
 * 측정소 이름으로 측정소 정보 찾기
 */
export function getStationByName(name: string): StationInfo | undefined {
  return allStations.find(station => station.name === name);
}

/**
 * 사용자 위치에서 가장 가까운 측정소 찾기
 */
export function findNearestStation(
  userLat: number, 
  userLng: number, 
  maxDistance: number = 50000 // 최대 50km
): StationInfo | null {
  let nearestStation: StationInfo | null = null;
  let minDistance = maxDistance;

  for (const station of allStations) {
    const distance = calculateDistance(userLat, userLng, station.latitude, station.longitude);
    
    if (distance < minDistance) {
      minDistance = distance;
      nearestStation = station;
    }
  }

  return nearestStation;
}

/**
 * 사용자 위치에서 가까운 측정소들 목록 (거리순 정렬)
 */
export function findNearbyStations(
  userLat: number, 
  userLng: number, 
  maxDistance: number = 50000, // 최대 50km
  limit: number = 10
): Array<StationInfo & { distance: number }> {
  const stationsWithDistance = allStations
    .map(station => ({
      ...station,
      distance: calculateDistance(userLat, userLng, station.latitude, station.longitude)
    }))
    .filter(station => station.distance <= maxDistance)
    .sort((a, b) => a.distance - b.distance)
    .slice(0, limit);

  return stationsWithDistance;
}

/**
 * 하버사인 공식을 사용한 두 지점 간 거리 계산 (미터)
 */
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000; // 지구 반지름 (미터)
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  return R * c;
}
