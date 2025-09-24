'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  getSeoulAirQuality, 
  getSidoAirQuality, 
  getStationHourlyAirQuality,
  getStationDailyAirQuality,
  getSeoulStations,
  getNearbyStationsLocal,
  getAirQualityByLocation,
  saveSelectedStation,
  getSavedStation
} from '@/actions/airquality';
import { airQualityGrade, getPM10Grade, getPM25Grade } from '@/lib/schemas/airquality';
import type { AirQualityItem } from '@/lib/schemas/airquality';

interface AirQualityDashboardProps {
  className?: string;
}

interface ProcessedAirQualityData {
  stationName: string;
  dataTime: string;
  pm10Value: number;
  pm25Value: number;
  pm10Grade: keyof typeof airQualityGrade;
  pm25Grade: keyof typeof airQualityGrade;
  khaiValue?: number;
  khaiGrade?: string;
}

// 인증이 필요한 대시보드 래퍼
export function AirQualityDashboard({ className }: AirQualityDashboardProps) {
  const { isLoaded, userId } = useAuth();

  if (!isLoaded) {
    return (
      <div className={className}>
        <div className="text-center py-8">
          <div className="text-muted-foreground">로딩 중...</div>
        </div>
      </div>
    );
  }

  if (!userId) {
    return (
      <div className={className}>
        <div className="text-center py-8">
          <Alert>
            <AlertDescription>
              미세먼지 정보를 조회하려면 로그인이 필요합니다.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  return <AirQualityDashboardContent className={className} />;
}

// 실제 대시보드 컨텐츠 컴포넌트
function AirQualityDashboardContent({ className }: AirQualityDashboardProps) {
  const [selectedSido, setSelectedSido] = useState('서울');
  const [selectedStation, setSelectedStation] = useState('');
  const [availableStations, setAvailableStations] = useState<string[]>([]);
  const [hourlyData, setHourlyData] = useState<ProcessedAirQualityData[]>([]);
  const [dailyData, setDailyData] = useState<ProcessedAirQualityData[]>([]);
  const [currentData, setCurrentData] = useState<ProcessedAirQualityData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'current' | 'hourly' | 'daily'>('current');
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [selectedStationInfo, setSelectedStationInfo] = useState<{
    distance?: number;
    address?: string;
  } | null>(null);

  // 시도 목록
  const sidoList = ['서울', '부산', '대구', '인천', '광주', '대전', '울산', '세종', '경기', '강원', '충북', '충남', '전북', '전남', '경북', '경남', '제주'];

  // 대기질 데이터 처리 함수
  const processAirQualityData = (items: AirQualityItem[]): ProcessedAirQualityData[] => {
    return items
      .filter(item => item.pm10Value && item.pm25Value && item.stationName && item.dataTime) // dataTime null 체크 추가
      .map(item => {
        const pm10Value = parseFloat(item.pm10Value || '0');
        const pm25Value = parseFloat(item.pm25Value || '0');
        
        return {
          stationName: item.stationName!,
          dataTime: item.dataTime!, // null이 아님을 보장 (위에서 필터링됨)
          pm10Value,
          pm25Value,
          pm10Grade: item.pm10Grade || getPM10Grade(pm10Value),
          pm25Grade: item.pm25Grade || getPM25Grade(pm25Value),
          khaiValue: item.khaiValue ? parseFloat(item.khaiValue) : undefined,
          khaiGrade: item.khaiGrade || undefined,
        };
      })
      .sort((a, b) => new Date(b.dataTime).getTime() - new Date(a.dataTime).getTime());
  };

  // 시간대별 분류 함수 (아침, 점심, 저녁)
  const classifyByTimeOfDay = (data: ProcessedAirQualityData[]) => {
    const grouped: { [key: string]: { morning?: ProcessedAirQualityData; afternoon?: ProcessedAirQualityData; evening?: ProcessedAirQualityData } } = {};
    
    data.forEach(item => {
      const date = new Date(item.dataTime);
      const hour = date.getHours();
      const dateKey = date.toISOString().split('T')[0]; // YYYY-MM-DD 형식
      
      if (!grouped[dateKey]) {
        grouped[dateKey] = {};
      }
      
      // 시간대별 분류: 아침(6-11), 점심(12-17), 저녁(18-23)
      if (hour >= 6 && hour <= 11) {
        grouped[dateKey].morning = item;
      } else if (hour >= 12 && hour <= 17) {
        grouped[dateKey].afternoon = item;
      } else if (hour >= 18 && hour <= 23) {
        grouped[dateKey].evening = item;
      }
    });
    
    return grouped;
  };

  // 현재 실시간 대기질 정보 조회
  const fetchCurrentAirQuality = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await getSidoAirQuality({
        sidoName: selectedSido,
        numOfRows: 50,
      });
      
      if (response.response.header.resultCode === '00') {
        const processed = processAirQualityData(response.response.body.items);
        setCurrentData(processed);
        
        // 측정소 목록 업데이트
        const stations = processed.map(item => item.stationName);
        setAvailableStations([...new Set(stations)]);
        
        if (stations.length > 0 && !selectedStation) {
          setSelectedStation(stations[0]);
        }
      } else {
        throw new Error(response.response.header.resultMsg);
      }
    } catch (error) {
      console.error('현재 대기질 정보 조회 실패:', error);
      setError('현재 대기질 정보를 가져오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 특정 측정소의 현재 대기질 정보 조회
  const fetchCurrentAirQualityByStation = async (stationName: string, sido: string) => {
    setLoading(true);
    setError(null);
    
    try {
      console.log(`특정 측정소 현재 데이터 조회: ${stationName} (${sido})`);
      const response = await getSidoAirQuality({
        sidoName: sido,
        numOfRows: 100, // 더 많은 데이터를 가져와서 해당 측정소를 찾기
      });
      
      if (response.response.header.resultCode === '00') {
        // 특정 측정소 데이터만 필터링
        const stationData = response.response.body.items.filter(
          item => item.stationName === stationName
        );
        
        if (stationData.length > 0) {
          const processed = processAirQualityData(stationData);
          setCurrentData(processed);
          console.log(`${stationName} 측정소 현재 데이터 로드 완료: ${processed.length}개 항목`);
        } else {
          console.warn(`${stationName} 측정소의 현재 데이터를 찾을 수 없습니다.`);
          // 전체 시도 데이터로 대체
          const processed = processAirQualityData(response.response.body.items);
          setCurrentData(processed);
        }
      } else {
        throw new Error(response.response.header.resultMsg);
      }
    } catch (error) {
      console.error('특정 측정소 현재 대기질 정보 조회 실패:', error);
      setError(`${stationName} 측정소의 현재 대기질 정보를 가져오는데 실패했습니다.`);
    } finally {
      setLoading(false);
    }
  };

  // 시간별 대기질 정보 조회
  const fetchHourlyAirQuality = async (stationName?: string) => {
    const targetStation = stationName || selectedStation;
    if (!targetStation) {
      console.warn('시간별 데이터 조회: 측정소가 선택되지 않았습니다.');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      console.log(`시간별 데이터 조회 시작: ${targetStation}`);
      const response = await getStationHourlyAirQuality({
        stationName: targetStation,
        dataTerm: 'DAILY',
        numOfRows: 24,
      });
      
      if (response.response.header.resultCode === '00') {
        const processed = processAirQualityData(response.response.body.items);
        console.log(`시간별 데이터 처리 완료: ${processed.length}개 항목 (전체 ${response.response.body.items.length}개 중)`);
        setHourlyData(processed);
        
        if (processed.length === 0) {
          setError(`${targetStation} 측정소의 시간별 데이터가 없습니다.`);
        }
      } else {
        throw new Error(response.response.header.resultMsg);
      }
    } catch (error) {
      console.error('시간별 대기질 정보 조회 실패:', error);
      setError('시간별 대기질 정보를 가져오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 일별 대기질 정보 조회
  const fetchDailyAirQuality = async (stationName?: string) => {
    const targetStation = stationName || selectedStation;
    if (!targetStation) {
      console.warn('일별 데이터 조회: 측정소가 선택되지 않았습니다.');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      console.log(`일별 데이터 조회 시작: ${targetStation}`);
      const response = await getStationDailyAirQuality({
        stationName: targetStation,
        dataTerm: '3MONTH',
        numOfRows: 90,
      });
      
      if (response.response.header.resultCode === '00') {
        const processed = processAirQualityData(response.response.body.items);
        console.log(`일별 데이터 처리 완료: ${processed.length}개 항목`);
        setDailyData(processed);
      } else {
        throw new Error(response.response.header.resultMsg);
      }
    } catch (error) {
      console.error('일별 대기질 정보 조회 실패:', error);
      setError('일별 대기질 정보를 가져오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 위치 기반 자동 측정소 선택
  const handleAutoSelectStation = async () => {
    if (!navigator.geolocation) {
      setError('브라우저에서 위치 서비스를 지원하지 않습니다.');
      return;
    }

    setIsGettingLocation(true);
    setError(null);

    try {
      // 사용자 위치 가져오기
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000 // 1분간 캐시 사용
        });
      });

      const { latitude, longitude } = position.coords;
      console.log(`사용자 위치: lat=${latitude}, lng=${longitude}`);

      // 로컬 데이터베이스에서 근접측정소 조회
      const nearbyStations = await getNearbyStationsLocal({ latitude, longitude });
      
      if (!nearbyStations.length) {
        throw new Error('근처에 측정소가 없습니다.');
      }

      const nearestStation = nearbyStations[0];

      // 가장 가까운 측정소 자동 선택
      setSelectedStation(nearestStation.stationName);
      
      // 해당 측정소의 시도 자동 설정
      setSelectedSido(nearestStation.sido);

      // 측정소 정보 저장 (거리, 주소)
      setSelectedStationInfo({
        distance: nearestStation.distance,
        address: nearestStation.address,
      });

      console.log(`자동 선택된 측정소: ${nearestStation.stationName} (${nearestStation.sido}) - 거리: ${nearestStation.distance}m`);
      
      // 성공 메시지 설정
      setError(null);
      
      // 데이터베이스에 선택된 측정소 정보 저장
      try {
        await saveSelectedStation({
          stationName: nearestStation.stationName,
          sido: nearestStation.sido,
          isAutoSelected: true,
          distance: nearestStation.distance,
          stationAddress: nearestStation.address,
          userLatitude: latitude,
          userLongitude: longitude,
        });
        console.log('측정소 정보 데이터베이스 저장 완료');
      } catch (saveError) {
        console.error('측정소 정보 저장 실패:', saveError);
        // 저장 실패해도 기능은 계속 진행
      }
      
      // 자동 선택 후 시간별 데이터 자동 로드
      setTimeout(async () => {
        try {
          setActiveTab('hourly');
          await fetchHourlyAirQuality(nearestStation.stationName);
          
          // 성공 알림 (3초간 표시)
          setSuccessMessage(`✅ ${nearestStation.stationName} 측정소가 자동 선택되어 저장되었습니다. 시간별 데이터를 확인하세요!`);
          setTimeout(() => setSuccessMessage(null), 3000);
        } catch (fetchError) {
          console.error('시간별 데이터 로드 실패:', fetchError);
          setError('측정소는 선택되었지만 시간별 데이터를 가져오는데 실패했습니다.');
        }
      }, 500); // 측정소 선택 후 약간의 딜레이
      
    } catch (error) {
      console.error('위치 기반 측정소 선택 실패:', error);
      if (error instanceof GeolocationPositionError) {
        switch (error.code) {
          case GeolocationPositionError.PERMISSION_DENIED:
            setError('위치 권한이 거부되었습니다. 브라우저 설정에서 위치 권한을 허용해주세요.');
            break;
          case GeolocationPositionError.POSITION_UNAVAILABLE:
            setError('위치 정보를 사용할 수 없습니다.');
            break;
          case GeolocationPositionError.TIMEOUT:
            setError('위치 정보 요청이 시간 초과되었습니다.');
            break;
          default:
            setError('위치 정보를 가져오는데 실패했습니다.');
        }
      } else {
        setError(error instanceof Error ? error.message : '자동 측정소 선택에 실패했습니다.');
      }
    } finally {
      setIsGettingLocation(false);
    }
  };

  // 페이지 로드 시 저장된 측정소 정보 불러오기
  useEffect(() => {
    const loadSavedStation = async () => {
      try {
        const savedStation = await getSavedStation();
        if (savedStation) {
          console.log('저장된 측정소 정보 발견:', savedStation);
          
          // 저장된 측정소 정보로 상태 설정
          setSelectedSido(savedStation.sido);
          setSelectedStation(savedStation.stationName);
          
          // 거리 및 주소 정보 설정
          if (savedStation.distance || savedStation.stationAddress) {
            setSelectedStationInfo({
              distance: savedStation.distance,
              address: savedStation.stationAddress,
            });
          }
          
          // 자동으로 모든 탭의 데이터 로드
          await Promise.all([
            fetchCurrentAirQualityByStation(savedStation.stationName, savedStation.sido),
            fetchHourlyAirQuality(savedStation.stationName),
            fetchDailyAirQuality(savedStation.stationName)
          ]);
          
          // 기본적으로 시간별 탭을 활성화 (가장 유용한 정보)
          setActiveTab('hourly');
          
          setSuccessMessage(`✅ 저장된 측정소 "${savedStation.stationName}"의 데이터를 불러왔습니다.`);
          setTimeout(() => setSuccessMessage(null), 3000);
        } else {
          // 저장된 측정소가 없으면 기본 서울 데이터 로드
          fetchCurrentAirQuality();
        }
      } catch (error) {
        console.error('저장된 측정소 불러오기 실패:', error);
        // 에러 시 기본 서울 데이터 로드
        fetchCurrentAirQuality();
      }
    };
    
    loadSavedStation();
  }, []); // 컴포넌트 마운트 시 한 번만 실행

  // 시도 변경 시 현재 데이터 로드 (수동 선택 시)
  useEffect(() => {
    if (selectedSido && !selectedStationInfo?.distance) {
      // 자동 선택이 아닌 경우에만 실행
      fetchCurrentAirQuality();
    }
  }, [selectedSido]);

  // 측정소 변경 시 시간별, 일별 데이터 로드 (수동 선택 시에만)
  useEffect(() => {
    if (selectedStation && !selectedStationInfo?.distance) {
      // 자동 선택이 아닌 경우에만 실행 (저장된 측정소 로드 시에는 이미 모든 데이터가 로드됨)
      if (activeTab === 'hourly') {
        fetchHourlyAirQuality();
      } else if (activeTab === 'daily') {
        fetchDailyAirQuality();
      }
    }
  }, [selectedStation, activeTab]);

  // 대기질 등급 표시 컴포넌트
  const AirQualityBadge = ({ grade, type }: { grade: keyof typeof airQualityGrade; type: 'PM10' | 'PM2.5' }) => {
    const gradeInfo = airQualityGrade[grade];
    return (
      <Badge className={`${gradeInfo.color} border-0`}>
        {type} {gradeInfo.label}
      </Badge>
    );
  };

  // 농도 표시 컴포넌트
  const ConcentrationDisplay = ({ value, grade, unit = 'μg/m³' }: { value: number; grade: keyof typeof airQualityGrade; unit?: string }) => {
    const gradeInfo = airQualityGrade[grade];
    return (
      <div className={`text-center p-2 rounded-lg ${gradeInfo.color}`}>
        <div className="text-2xl font-bold">{value}</div>
        <div className="text-sm">{unit}</div>
      </div>
    );
  };

  return (
    <div className={className}>
      <div className="space-y-6">
        {/* 검색 및 설정 */}
        <Card>
          <CardHeader>
            <CardTitle>미세먼지 조회</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">시도 선택</label>
                <select
                  value={selectedSido}
                  onChange={(e) => setSelectedSido(e.target.value)}
                  className="w-full p-2 border rounded-md"
                >
                  {sidoList.map(sido => (
                    <option key={sido} value={sido}>{sido}</option>
                  ))}
                </select>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">측정소 선택</label>
                <div className="flex gap-2">
                  <select
                    value={selectedStation}
                    onChange={(e) => {
                      setSelectedStation(e.target.value);
                      // 수동 선택 시 자동 선택 정보 초기화
                      setSelectedStationInfo(null);
                    }}
                    className="flex-1 p-2 border rounded-md"
                    disabled={availableStations.length === 0}
                  >
                    <option value="">측정소를 선택하세요</option>
                    {availableStations.map(station => (
                      <option key={station} value={station}>{station}</option>
                    ))}
                  </select>
                  <Button
                    onClick={handleAutoSelectStation}
                    disabled={isGettingLocation}
                    variant="outline"
                    className="flex items-center gap-1 whitespace-nowrap"
                  >
                    {isGettingLocation ? (
                      <>
                        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        위치 확인 중...
                      </>
                    ) : (
                      <>
                        📍 자동 선택
                      </>
                    )}
                  </Button>
                </div>
                {selectedStation && (
                  <div className="text-xs mt-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="text-green-600">✅ 선택된 측정소: {selectedStation}</p>
                      {selectedStationInfo?.distance && (
                        <Badge variant="secondary" className="text-xs">
                          자동 선택됨
                        </Badge>
                      )}
                    </div>
                    {selectedStationInfo?.distance && (
                      <p className="text-blue-600">
                        📍 거리: {(selectedStationInfo.distance / 1000).toFixed(1)}km
                        {selectedStationInfo.distance < 1000 && ` (${selectedStationInfo.distance}m)`}
                      </p>
                    )}
                    {selectedStationInfo?.address && (
                      <p className="text-gray-500">
                        📍 주소: {selectedStationInfo.address}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* 탭 버튼 */}
            <div className="flex gap-2">
              <Button
                variant={activeTab === 'current' ? 'default' : 'outline'}
                onClick={() => setActiveTab('current')}
              >
                현재 상황
              </Button>
              <Button
                variant={activeTab === 'hourly' ? 'default' : 'outline'}
                onClick={() => setActiveTab('hourly')}
                disabled={!selectedStation}
              >
                시간별
              </Button>
              <Button
                variant={activeTab === 'daily' ? 'default' : 'outline'}
                onClick={() => setActiveTab('daily')}
                disabled={!selectedStation}
              >
                일별
              </Button>
            </div>

            {/* 성공 메시지 */}
            {successMessage && (
              <Alert className="mb-4 border-green-200 bg-green-50">
                <AlertDescription className="text-green-800">{successMessage}</AlertDescription>
              </Alert>
            )}

            {error && (
              <Alert variant="destructive">
                <AlertDescription>
                  {error}
                  {error.includes('AIRKOREA_API_KEY') && (
                    <div className="mt-2 text-sm">
                      <p className="font-medium">API 키 설정 방법:</p>
                      <ol className="list-decimal list-inside mt-1 space-y-1">
                        <li><a href="https://www.data.go.kr/tcs/dss/selectApiDataDetailView.do?publicDataPk=15073861" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">에어코리아 API 신청</a></li>
                        <li>프로젝트 루트에 <code className="bg-gray-100 px-1 rounded">.env.local</code> 파일 생성</li>
                        <li><code className="bg-gray-100 px-1 rounded">AIRKOREA_API_KEY=발급받은키</code> 추가</li>
                        <li>서버 재시작</li>
                      </ol>
                    </div>
                  )}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* 현재 대기질 현황 */}
        {activeTab === 'current' && currentData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>
                {selectedStation ? `${selectedStation} - 현재 대기질 현황` : `${selectedSido} - 현재 대기질 현황`}
                {selectedStationInfo?.distance && (
                  <span className="text-sm font-normal text-blue-600 ml-2">
                    (저장된 측정소)
                  </span>
                )}
              </CardTitle>
              <CardDescription>
                {selectedStation && selectedStationInfo?.distance 
                  ? `저장된 측정소의 실시간 미세먼지 농도` 
                  : '실시간 측정소별 미세먼지 농도'
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {currentData.slice(0, 12).map((station, index) => (
                  <Card key={index} className="p-4">
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <h3 className="font-medium">{station.stationName}</h3>
                        <div className="text-xs text-muted-foreground">
                          {new Date(station.dataTime).toLocaleString()}
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <div className="text-sm mb-1">미세먼지 (PM10)</div>
                          <ConcentrationDisplay 
                            value={station.pm10Value} 
                            grade={station.pm10Grade} 
                          />
                        </div>
                        <div>
                          <div className="text-sm mb-1">초미세먼지 (PM2.5)</div>
                          <ConcentrationDisplay 
                            value={station.pm25Value} 
                            grade={station.pm25Grade} 
                          />
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        <AirQualityBadge grade={station.pm10Grade} type="PM10" />
                        <AirQualityBadge grade={station.pm25Grade} type="PM2.5" />
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* 시간별 미세먼지 농도 */}
        {activeTab === 'hourly' && hourlyData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>
                {selectedStation} - 시간별 미세먼지 농도
                {selectedStationInfo?.distance && (
                  <span className="text-sm font-normal text-blue-600 ml-2">
                    (거리: {(selectedStationInfo.distance / 1000).toFixed(1)}km)
                  </span>
                )}
              </CardTitle>
              <CardDescription>최근 24시간 시간별 변화 - 자동 선택된 가장 가까운 측정소</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="flex gap-3 min-w-max pb-4">
                  {hourlyData.map((data, index) => {
                    const isLatest = index === 0;
                    return (
                      <div 
                        key={index}
                        className={`${
                          isLatest 
                            ? 'bg-gradient-to-b from-blue-50 to-blue-100 border-blue-300 shadow-lg' 
                            : 'bg-gradient-to-b from-green-50 to-green-100 border'
                        } dark:from-gray-800 dark:to-gray-900 rounded-xl p-4 hover:shadow-lg transition-all duration-200 flex flex-col flex-shrink-0 w-32 h-[350px]`}
                      >
                      {/* 시간 표시 */}
                      <div className={`text-center border-b ${isLatest ? 'border-blue-200' : 'border-green-200'} dark:border-gray-700 mb-3 pb-2`}>
                        <div className="font-bold text-gray-800 dark:text-gray-200 text-sm">
                          {new Date(data.dataTime).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                          {isLatest && <span className="text-xs text-blue-600 ml-1">최신</span>}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(data.dataTime).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
                        </div>
                      </div>
                      
                      {/* PM10 농도 */}
                      <div className="text-center mb-3">
                        <div className="text-xs text-muted-foreground mb-1">PM10</div>
                        <ConcentrationDisplay 
                          value={data.pm10Value} 
                          grade={data.pm10Grade} 
                        />
                      </div>
                      
                      {/* PM2.5 농도 */}
                      <div className="text-center mb-3">
                        <div className="text-xs text-muted-foreground mb-1">PM2.5</div>
                        <ConcentrationDisplay 
                          value={data.pm25Value} 
                          grade={data.pm25Grade} 
                        />
                      </div>
                      
                      {/* 등급 표시 */}
                      <div className="mt-auto space-y-1">
                        <AirQualityBadge grade={data.pm10Grade} type="PM10" />
                        <AirQualityBadge grade={data.pm25Grade} type="PM2.5" />
                      </div>
                    </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        )}

        {/* 일별 미세먼지 농도 */}
        {activeTab === 'daily' && dailyData.length > 0 && (() => {
          const groupedData = classifyByTimeOfDay(dailyData);
          const sortedDates = Object.keys(groupedData).sort((a, b) => new Date(b).getTime() - new Date(a).getTime()).slice(0, 30);
          
          return (
            <Card>
              <CardHeader>
                <CardTitle>
                  {selectedStation} - 일별 미세먼지 농도
                  {selectedStationInfo?.distance && (
                    <span className="text-sm font-normal text-blue-600 ml-2">
                      (저장된 측정소)
                    </span>
                  )}
                </CardTitle>
                <CardDescription>최근 30일간 일별 변화 (아침/점심/저녁)</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px]">
                  <div className="flex gap-3 min-w-max pb-4">
                    {sortedDates.map((date, index) => {
                      const dayData = groupedData[date];
                      return (
                        <div 
                          key={index}
                          className="bg-gradient-to-b from-blue-50 to-blue-100 dark:from-gray-800 dark:to-gray-900 border rounded-xl p-4 hover:shadow-lg transition-all duration-200 flex flex-col flex-shrink-0 w-48 h-[450px]"
                        >
                          {/* 날짜 표시 */}
                          <div className="text-center border-b border-blue-200 dark:border-gray-700 mb-3 pb-2">
                            <div className="font-bold text-gray-800 dark:text-gray-200 text-sm">
                              {new Date(date).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {new Date(date).toLocaleDateString('ko-KR', { weekday: 'short' })}
                            </div>
                          </div>
                          
                          {/* 아침 */}
                          {dayData.morning && (
                            <div className="mb-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-2">
                              <div className="text-xs text-yellow-700 dark:text-yellow-300 font-medium mb-2 text-center">아침</div>
                              <div className="grid grid-cols-2 gap-2 text-xs">
                                <div>
                                  <div className="text-center">PM10</div>
                                  <ConcentrationDisplay 
                                    value={dayData.morning.pm10Value} 
                                    grade={dayData.morning.pm10Grade} 
                                  />
                                </div>
                                <div>
                                  <div className="text-center">PM2.5</div>
                                  <ConcentrationDisplay 
                                    value={dayData.morning.pm25Value} 
                                    grade={dayData.morning.pm25Grade} 
                                  />
                                </div>
                              </div>
                            </div>
                          )}
                          
                          {/* 점심 */}
                          {dayData.afternoon && (
                            <div className="mb-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg p-2">
                              <div className="text-xs text-orange-700 dark:text-orange-300 font-medium mb-2 text-center">점심</div>
                              <div className="grid grid-cols-2 gap-2 text-xs">
                                <div>
                                  <div className="text-center">PM10</div>
                                  <ConcentrationDisplay 
                                    value={dayData.afternoon.pm10Value} 
                                    grade={dayData.afternoon.pm10Grade} 
                                  />
                                </div>
                                <div>
                                  <div className="text-center">PM2.5</div>
                                  <ConcentrationDisplay 
                                    value={dayData.afternoon.pm25Value} 
                                    grade={dayData.afternoon.pm25Grade} 
                                  />
                                </div>
                              </div>
                            </div>
                          )}
                          
                          {/* 저녁 */}
                          {dayData.evening && (
                            <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-2">
                              <div className="text-xs text-indigo-700 dark:text-indigo-300 font-medium mb-2 text-center">저녁</div>
                              <div className="grid grid-cols-2 gap-2 text-xs">
                                <div>
                                  <div className="text-center">PM10</div>
                                  <ConcentrationDisplay 
                                    value={dayData.evening.pm10Value} 
                                    grade={dayData.evening.pm10Grade} 
                                  />
                                </div>
                                <div>
                                  <div className="text-center">PM2.5</div>
                                  <ConcentrationDisplay 
                                    value={dayData.evening.pm25Value} 
                                    grade={dayData.evening.pm25Grade} 
                                  />
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          );
        })()}

        {loading && (
          <div className="text-center py-8">
            <div className="text-muted-foreground">미세먼지 정보를 불러오는 중...</div>
          </div>
        )}
      </div>
    </div>
  );
}
