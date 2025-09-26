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
  getSavedStation,
  getLatestWeeklyForecast,
  getProcessedWeeklyForecast
} from '@/actions/airquality';
import { 
  getHourlyAirQualityByStation,
  getDailyAirQualityByStation 
} from '@/actions/regional-airquality';
import { airQualityGrade, getPM10Grade, getPM25Grade } from '@/lib/schemas/airquality';
import type { AirQualityItem, ProcessedWeeklyForecast } from '@/lib/schemas/airquality';

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
  const [hourlyData, setHourlyData] = useState<ProcessedAirQualityData[]>([]);
  const [dailyData, setDailyData] = useState<ProcessedAirQualityData[]>([]);
  const [currentData, setCurrentData] = useState<ProcessedAirQualityData[]>([]);
  const [weeklyForecastData, setWeeklyForecastData] = useState<ProcessedWeeklyForecast[]>([]);
  // 지역별 시간별/일별 대기정보 데이터
  const [regionalHourlyData, setRegionalHourlyData] = useState<any[]>([]);
  const [regionalDailyData, setRegionalDailyData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'current' | 'hourly' | 'daily' | 'forecast'>('current');
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [selectedStationInfo, setSelectedStationInfo] = useState<{
    distance?: number;
    address?: string;
  } | null>(null);


  // 대기질 등급 유효성 검사 함수
  const isValidGrade = (grade: string | null | undefined): grade is keyof typeof airQualityGrade => {
    return grade !== null && grade !== undefined && ['1', '2', '3', '4'].includes(grade);
  };

  // 대기질 데이터 처리 함수
  const processAirQualityData = (items: AirQualityItem[]): ProcessedAirQualityData[] => {
    return items
      .filter(item => item.pm10Value && item.pm25Value && item.stationName && item.dataTime) // dataTime null 체크 추가
      .map(item => {
        const pm10Value = parseFloat(item.pm10Value || '0');
        const pm25Value = parseFloat(item.pm25Value || '0');
        
        // 등급이 유효하지 않으면 농도값으로 계산한 등급 사용
        const pm10Grade = isValidGrade(item.pm10Grade) ? item.pm10Grade : getPM10Grade(pm10Value);
        const pm25Grade = isValidGrade(item.pm25Grade) ? item.pm25Grade : getPM25Grade(pm25Value);
        
        return {
          stationName: item.stationName!,
          dataTime: item.dataTime!, // null이 아님을 보장 (위에서 필터링됨)
          pm10Value,
          pm25Value,
          pm10Grade,
          pm25Grade,
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


  // 특정 측정소의 현재 대기질 정보 조회
  const fetchCurrentAirQualityByStation = async (stationName: string, sido: string) => {
    console.log(`🔍 [현재 대기질 조회 시작] 측정소: "${stationName}", 시도: "${sido}"`);
    setLoading(true);
    setError(null);
    
    try {
      console.log(`📡 API 호출 준비: ${sido} 지역의 모든 측정소 데이터 요청`);
      const response = await getSidoAirQuality({
        sidoName: sido,
        numOfRows: 100, // 더 많은 데이터를 가져와서 해당 측정소를 찾기
      });
      console.log(`📡 API 응답 받음:`, response);
      
      if (response.response.header.resultCode === '00') {
        // 디버깅: 받아온 모든 측정소명 출력
        const allStationNames = response.response.body.items.map(item => item.stationName);
        console.log(`${sido} 지역의 모든 측정소명 (총 ${allStationNames.length}개):`, allStationNames);
        console.log(`찾고 있는 측정소명: "${stationName}"`);
        
        // 운정과 관련된 측정소 찾기
        const relatedStations = response.response.body.items.filter(item => 
          item.stationName && (
            item.stationName.includes('운정') || 
            item.stationName.includes('파주') ||
            item.stationName.includes('김포')
          )
        );
        console.log('운정/파주/김포 관련 측정소들:', relatedStations.map(item => item.stationName));
        
        // 특정 측정소 데이터만 필터링
        const stationData = response.response.body.items.filter(
          item => item.stationName === stationName
        );
        
        console.log(`필터링된 측정소 데이터 개수: ${stationData.length}`);
        
        if (stationData.length > 0) {
          const processed = processAirQualityData(stationData);
          setCurrentData(processed);
          console.log(`${stationName} 측정소 현재 데이터 로드 완료: ${processed.length}개 항목`);
          
          // 새로고침 성공 메시지
          const currentTime = new Date().toLocaleTimeString('ko-KR', { 
            hour: '2-digit', 
            minute: '2-digit' 
          });
          setSuccessMessage(`✅ ${currentTime}에 새로고침 완료`);
          setTimeout(() => setSuccessMessage(null), 2000);
        } else {
          console.warn(`${stationName} 측정소의 현재 데이터를 찾을 수 없습니다.`);
          
          // 부분 일치 시도 (공백 제거, 소문자 변환)
          const normalizedStationName = stationName.replace(/\s+/g, '').toLowerCase();
          const partialMatchData = response.response.body.items.filter(
            item => item.stationName && item.stationName.replace(/\s+/g, '').toLowerCase().includes(normalizedStationName)
          );
          
          console.log(`부분 일치 시도: "${normalizedStationName}", 결과: ${partialMatchData.length}개`);
          
          if (partialMatchData.length > 0) {
            const processed = processAirQualityData(partialMatchData);
            setCurrentData(processed);
            console.log(`부분 일치로 ${partialMatchData[0].stationName} 측정소 데이터 로드: ${processed.length}개 항목`);
            
            setSuccessMessage(`✅ ${partialMatchData[0].stationName} 측정소 데이터 로드 완료 (부분 일치)`);
            setTimeout(() => setSuccessMessage(null), 3000);
          } else {
            // 정확한 일치도 부분 일치도 없으면 첫 번째 측정소 데이터 사용
            console.log('부분 일치도 실패, 첫 번째 측정소 데이터 사용');
            const firstStationData = response.response.body.items.slice(0, 1);
            const processed = processAirQualityData(firstStationData);
            setCurrentData(processed);
            
            setSuccessMessage(`✅ ${firstStationData[0].stationName} 측정소 데이터 로드 완료 (대체)`);
            setTimeout(() => setSuccessMessage(null), 3000);
          }
        }
      } else {
        throw new Error(response.response.header.resultMsg);
      }
    } catch (error) {
      console.error('특정 측정소 현재 대기질 정보 조회 실패:', error);
      setError(`${stationName} 측정소의 현재 대기질 정보를 가져오는데 실패했습니다.`);
      setCurrentData([]);
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

  // 주간예보 정보 조회
  const fetchWeeklyForecast = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('주간예보 데이터 조회 시작');
      const forecasts = await getLatestWeeklyForecast();
      console.log(`주간예보 데이터 처리 완료: ${forecasts.length}개 항목`);
      setWeeklyForecastData(forecasts);
      
      if (forecasts.length === 0) {
        setError('주간예보 데이터가 없습니다.');
      }
    } catch (error) {
      console.error('주간예보 정보 조회 실패:', error);
      setError('주간예보 정보를 가져오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 지역별 시간별 대기정보 조회
  const fetchRegionalHourlyAirQuality = async (stationName?: string) => {
    const targetStation = stationName || selectedStation;
    if (!targetStation) {
      console.warn('지역별 시간별 데이터 조회: 측정소가 선택되지 않았습니다.');
      throw new Error('측정소가 선택되지 않았습니다.');
    }
    
    setLoading(true);
    setError(null);
    
    try {
      console.log(`🔍 지역별 시간별 데이터 조회 시작: "${targetStation}"`);
      const today = new Date().toISOString().split('T')[0];
      const response = await getHourlyAirQualityByStation(targetStation, today, 24);
      
      console.log(`✅ 지역별 시간별 데이터 조회 완료:`, response);
      setRegionalHourlyData(response.data || []);
      
      if (!response.data || response.data.length === 0) {
        const warningMsg = `${targetStation} 측정소 지역의 시간별 대기정보가 없습니다.`;
        console.warn(warningMsg);
        throw new Error(warningMsg);
      }
    } catch (error) {
      console.error('❌ 지역별 시간별 대기정보 조회 실패:', error);
      
      // 에러 메시지에 따라 다른 처리
      const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
      
      if (errorMessage.includes('지역 정보를 찾을 수 없습니다')) {
        console.warn(`측정소 "${targetStation}"의 지역 매핑 실패 - 폴백 필요`);
      }
      
      setRegionalHourlyData([]);
      throw error; // 상위에서 폴백 처리할 수 있도록 에러 재던지기
    } finally {
      setLoading(false);
    }
  };

  // 지역별 일별 대기정보 조회
  const fetchRegionalDailyAirQuality = async (stationName?: string) => {
    const targetStation = stationName || selectedStation;
    if (!targetStation) {
      console.warn('지역별 일별 데이터 조회: 측정소가 선택되지 않았습니다.');
      throw new Error('측정소가 선택되지 않았습니다.');
    }
    
    setLoading(true);
    setError(null);
    
    try {
      console.log(`🔍 지역별 일별 데이터 조회 시작: "${targetStation}"`);
      const today = new Date().toISOString().split('T')[0];
      const response = await getDailyAirQualityByStation(targetStation, today, 7);
      
      console.log(`✅ 지역별 일별 데이터 조회 완료:`, response);
      setRegionalDailyData(response.data || []);
      
      if (!response.data || response.data.length === 0) {
        const warningMsg = `${targetStation} 측정소 지역의 일별 대기정보가 없습니다.`;
        console.warn(warningMsg);
        throw new Error(warningMsg);
      }
    } catch (error) {
      console.error('❌ 지역별 일별 대기정보 조회 실패:', error);
      
      // 에러 메시지에 따라 다른 처리
      const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
      
      if (errorMessage.includes('지역 정보를 찾을 수 없습니다')) {
        console.warn(`측정소 "${targetStation}"의 지역 매핑 실패 - 폴백 필요`);
      }
      
      setRegionalDailyData([]);
      throw error; // 상위에서 폴백 처리할 수 있도록 에러 재던지기
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
      
      // 자동 선택 후 현재 상황 데이터 자동 로드
      setTimeout(async () => {
        try {
          setActiveTab('current');
          await fetchCurrentAirQualityByStation(nearestStation.stationName, nearestStation.sido);
          
          // 성공 알림 (3초간 표시)
          setSuccessMessage(`✅ ${nearestStation.stationName} 측정소가 자동 선택되어 저장되었습니다. 현재 대기질을 확인하세요!`);
          setTimeout(() => setSuccessMessage(null), 3000);
        } catch (fetchError) {
          console.error('현재 데이터 로드 실패:', fetchError);
          setError('측정소는 선택되었지만 현재 대기질 데이터를 가져오는데 실패했습니다.');
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
    console.log(`🚀 [페이지 로드] AirQualityDashboard 초기화 시작`);
    const loadSavedStation = async () => {
      try {
        console.log(`📋 저장된 측정소 정보 조회 중...`);
        const savedStation = await getSavedStation();
        if (savedStation) {
          console.log('저장된 측정소 정보 발견:', savedStation);
          console.log(`측정소명: "${savedStation.stationName}", 시도: "${savedStation.sido}"`);
          
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
          
          // 현재 상황 데이터 우선 로드
          console.log(`저장된 측정소로 현재 대기질 조회 시작: ${savedStation.stationName} (${savedStation.sido})`);
          await fetchCurrentAirQualityByStation(savedStation.stationName, savedStation.sido);
          
          // 기본적으로 현재 상황 탭을 활성화 (가장 직관적인 정보)
          setActiveTab('current');
          
          setSuccessMessage(`✅ 저장된 측정소 "${savedStation.stationName}"의 데이터를 불러왔습니다.`);
          setTimeout(() => setSuccessMessage(null), 3000);
        } else {
          // 저장된 측정소가 없으면 안내 메시지만 표시
          console.log('저장된 측정소가 없습니다. 자동 선택 버튼을 이용해주세요.');
        }
      } catch (error) {
        console.error('저장된 측정소 불러오기 실패:', error);
        // 에러 시에도 안내 메시지만 표시
        setError('저장된 측정소 정보를 불러오는데 실패했습니다. 자동 선택 버튼을 이용해주세요.');
      }
    };
    
    loadSavedStation();
  }, []); // 컴포넌트 마운트 시 한 번만 실행


  // 측정소 변경 시 또는 탭 변경 시 데이터 로드
  useEffect(() => {
    if (selectedStation) {
      if (activeTab === 'current') {
        fetchCurrentAirQualityByStation(selectedStation, selectedSido);
      } else if (activeTab === 'hourly') {
        // 지역별 데이터를 우선 시도하고, 실패시 측정소별 데이터로 폴백
        fetchRegionalHourlyAirQuality().catch(() => {
          console.warn('지역별 시간별 데이터 조회 실패, 측정소별 데이터로 폴백');
          fetchHourlyAirQuality();
        });
      } else if (activeTab === 'daily') {
        // 지역별 데이터를 우선 시도하고, 실패시 측정소별 데이터로 폴백
        fetchRegionalDailyAirQuality().catch(() => {
          console.warn('지역별 일별 데이터 조회 실패, 측정소별 데이터로 폴백');
          fetchDailyAirQuality();
        });
      } else if (activeTab === 'forecast') {
        fetchWeeklyForecast();
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
        {/* 측정소 설정 */}
        <Card>
          <CardHeader>
            <CardTitle>내 측정소</CardTitle>
            <CardDescription>
              가장 가까운 측정소를 자동으로 선택하여 저장합니다
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 자동 선택 버튼과 현재 측정소 정보 */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  {selectedStation ? (
                    <>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-semibold text-green-700">✅ {selectedStation}</h3>
                        {selectedStationInfo?.distance && (
                          <Badge variant="secondary" className="text-xs">
                            자동 선택됨
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">{selectedSido}</p>
                      {selectedStationInfo?.distance && (
                        <p className="text-sm text-blue-600">
                          📍 거리: {(selectedStationInfo.distance / 1000).toFixed(1)}km
                          {selectedStationInfo.distance < 1000 && ` (${selectedStationInfo.distance}m)`}
                        </p>
                      )}
                      {selectedStationInfo?.address && (
                        <p className="text-xs text-gray-500">
                          📍 {selectedStationInfo.address}
                        </p>
                      )}
                    </>
                  ) : (
                    <div className="space-y-1">
                      <h3 className="text-lg font-medium text-gray-500">측정소가 선택되지 않았습니다</h3>
                      <p className="text-sm text-gray-400">자동 선택 버튼을 눌러 가까운 측정소를 찾아보세요</p>
                    </div>
                  )}
                </div>
                
                <Button
                  onClick={handleAutoSelectStation}
                  disabled={isGettingLocation}
                  variant={selectedStation ? "outline" : "default"}
                  className="flex items-center gap-2 whitespace-nowrap"
                >
                  {isGettingLocation ? (
                    <>
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      위치 확인 중...
                    </>
                  ) : (
                    <>
                      📍 {selectedStation ? '다시 선택' : '자동 선택'}
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* 탭 버튼 */}
            <div className="flex gap-2 flex-wrap">
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
              <Button
                variant={activeTab === 'forecast' ? 'default' : 'outline'}
                onClick={() => setActiveTab('forecast')}
              >
                📅 주간예보
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
        {activeTab === 'current' && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>
                    {selectedStation ? `${selectedStation} - 현재 대기질 현황` : `${selectedSido} - 현재 대기질 현황`}
                    {selectedStationInfo?.distance && (
                      <span className="text-sm font-normal text-blue-600 ml-2">
                        (자동 선택된 측정소)
                      </span>
                    )}
                  </CardTitle>
                  <CardDescription>
                    {selectedStation && selectedStationInfo?.distance 
                      ? `자동 선택된 가장 가까운 측정소의 실시간 미세먼지 농도` 
                      : selectedStation 
                        ? `${selectedStation} 측정소의 실시간 미세먼지 농도`
                        : '측정소를 선택하여 실시간 미세먼지 농도를 확인하세요'
                    }
                  </CardDescription>
                </div>
                {selectedStation && (
                  <Button
                    onClick={() => fetchCurrentAirQualityByStation(selectedStation, selectedSido)}
                    disabled={loading}
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-1"
                  >
                    {loading ? (
                      <>
                        <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        새로고침 중...
                      </>
                    ) : (
                      <>
                        🔄 새로고침
                      </>
                    )}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {currentData.length > 0 ? (
                <div className="max-w-md mx-auto">
                  {currentData.slice(0, 1).map((station, index) => (
                    <Card key={index} className="p-6 border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-white">
                      <div className="space-y-4">
                        <div className="text-center border-b border-blue-200 pb-3">
                          <h3 className="text-xl font-bold text-gray-800">{station.stationName}</h3>
                          <div className="text-sm text-muted-foreground mt-1">
                            {new Date(station.dataTime).toLocaleString('ko-KR', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })} 측정
                          </div>
                          {selectedStationInfo?.distance && (
                            <div className="text-sm text-blue-600 mt-1">
                              📍 거리: {(selectedStationInfo.distance / 1000).toFixed(1)}km
                            </div>
                          )}
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div className="text-center">
                            <div className="text-sm mb-2 text-gray-600">미세먼지 (PM10)</div>
                            <ConcentrationDisplay 
                              value={station.pm10Value} 
                              grade={station.pm10Grade} 
                            />
                            <div className="mt-2">
                              <AirQualityBadge grade={station.pm10Grade} type="PM10" />
                            </div>
                          </div>
                          <div className="text-center">
                            <div className="text-sm mb-2 text-gray-600">초미세먼지 (PM2.5)</div>
                            <ConcentrationDisplay 
                              value={station.pm25Value} 
                              grade={station.pm25Grade} 
                            />
                            <div className="mt-2">
                              <AirQualityBadge grade={station.pm25Grade} type="PM2.5" />
                            </div>
                          </div>
                        </div>

                        {/* 종합 공기질 정보 */}
                        {station.khaiValue && (
                          <div className="text-center border-t border-blue-200 pt-3">
                            <div className="text-sm text-gray-600 mb-1">통합대기환경지수 (KHAI)</div>
                            <div className="text-lg font-bold text-blue-700">
                              {station.khaiValue} {station.khaiGrade && `(${station.khaiGrade})`}
                            </div>
                          </div>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              ) : selectedStation ? (
                <div className="text-center py-8">
                  <div className="text-muted-foreground mb-2">
                    {selectedStation} 측정소의 현재 대기질 데이터를 찾을 수 없습니다.
                  </div>
                  <div className="text-sm text-gray-500">
                    다른 측정소를 선택하거나 자동 선택 기능을 사용해보세요.
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="mb-4">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                      <span className="text-2xl">📍</span>
                    </div>
                    <h3 className="text-lg font-medium text-gray-700 mb-2">
                      측정소를 선택해주세요
                    </h3>
                    <div className="text-sm text-gray-500 space-y-1">
                      <p>위의 📍 자동 선택 버튼을 눌러</p>
                      <p>가장 가까운 측정소를 자동으로 찾아보세요</p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* 지역별 시간별 대기정보 */}
        {activeTab === 'hourly' && regionalHourlyData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>
                {selectedStation}의 지역 - 시간별 대기정보
                {selectedStationInfo?.distance && (
                  <span className="text-sm font-normal text-blue-600 ml-2">
                    (거리: {(selectedStationInfo.distance / 1000).toFixed(1)}km)
                  </span>
                )}
              </CardTitle>
              <CardDescription>최근 24시간 지역별 시간별 대기질 변화</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto pb-4 h-[300px]">
                <div className="flex gap-3 min-w-max h-full"
                     style={{ 
                       scrollBehavior: 'smooth',
                       cursor: 'grab'
                     }}
                     onMouseDown={(e) => {
                       const startX = e.pageX;
                       const container = e.currentTarget;
                       const scrollLeft = container.scrollLeft;
                       
                       const handleMouseMove = (moveEvent: MouseEvent) => {
                         const x = moveEvent.pageX - startX;
                         container.scrollLeft = scrollLeft - x;
                       };
                       
                       const handleMouseUp = () => {
                         document.removeEventListener('mousemove', handleMouseMove);
                         document.removeEventListener('mouseup', handleMouseUp);
                         container.style.cursor = 'grab';
                       };
                       
                       container.style.cursor = 'grabbing';
                       document.addEventListener('mousemove', handleMouseMove);
                       document.addEventListener('mouseup', handleMouseUp);
                     }}>
                  {regionalHourlyData.slice(0, 24).map((data, index) => {
                    const isLatest = index === 0;
                    const hour = data.hour || new Date(data.dataTime).getHours();
                    return (
                      <div 
                        key={index}
                        className={`${
                          isLatest 
                            ? 'bg-gradient-to-b from-blue-50 to-blue-100 border-blue-300 shadow-lg' 
                            : 'bg-gradient-to-b from-green-50 to-green-100 border'
                        } dark:from-gray-800 dark:to-gray-900 rounded-xl p-4 hover:shadow-lg transition-all duration-200 flex flex-col flex-shrink-0 w-32 h-[270px]`}
                        style={{ userSelect: 'none' }}
                      >
                        {/* 시간 표시 */}
                        <div className={`text-center border-b ${isLatest ? 'border-blue-200' : 'border-green-200'} dark:border-gray-700 mb-3 pb-2`}>
                          <div className="font-bold text-gray-800 dark:text-gray-200 text-sm">
                            {hour}시
                            {isLatest && <span className="text-xs text-blue-600 ml-1">최신</span>}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {data.regionName}
                          </div>
                        </div>
                        
                        {/* PM10 농도 */}
                        <div className="text-center mb-3">
                          <div className="text-xs text-muted-foreground mb-1">PM10</div>
                          {data.pm10Value && (
                            <ConcentrationDisplay 
                              value={data.pm10Value} 
                              grade={data.pm10Grade || '2'} 
                            />
                          )}
                        </div>
                        
                        {/* PM2.5 농도 */}
                        <div className="text-center mb-3">
                          <div className="text-xs text-muted-foreground mb-1">PM2.5</div>
                          {data.pm25Value && (
                            <ConcentrationDisplay 
                              value={data.pm25Value} 
                              grade={data.pm25Grade || '2'} 
                            />
                          )}
                        </div>
                        
                        {/* 등급 표시 */}
                        <div className="mt-auto space-y-1">
                          {data.pm10Value && data.pm10Grade && (
                            <AirQualityBadge grade={data.pm10Grade as keyof typeof airQualityGrade} type="PM10" />
                          )}
                          {data.pm25Value && data.pm25Grade && (
                            <AirQualityBadge grade={data.pm25Grade as keyof typeof airQualityGrade} type="PM2.5" />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 지역별 일별 대기정보 */}
        {activeTab === 'daily' && regionalDailyData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>
                {selectedStation}의 지역 - 일별 대기정보
                {selectedStationInfo?.distance && (
                  <span className="text-sm font-normal text-blue-600 ml-2">
                    (거리: {(selectedStationInfo.distance / 1000).toFixed(1)}km)
                  </span>
                )}
              </CardTitle>
              <CardDescription>최근 7일간 지역별 일별 대기질 변화</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto pb-4 h-[400px]">
                <div className="flex gap-3 min-w-max h-full"
                     style={{ 
                       scrollBehavior: 'smooth',
                       cursor: 'grab'
                     }}
                     onMouseDown={(e) => {
                       const startX = e.pageX;
                       const container = e.currentTarget;
                       const scrollLeft = container.scrollLeft;
                       
                       const handleMouseMove = (moveEvent: MouseEvent) => {
                         const x = moveEvent.pageX - startX;
                         container.scrollLeft = scrollLeft - x;
                       };
                       
                       const handleMouseUp = () => {
                         document.removeEventListener('mousemove', handleMouseMove);
                         document.removeEventListener('mouseup', handleMouseUp);
                         container.style.cursor = 'grab';
                       };
                       
                       container.style.cursor = 'grabbing';
                       document.addEventListener('mousemove', handleMouseMove);
                       document.addEventListener('mouseup', handleMouseUp);
                     }}>
                  {regionalDailyData.slice(0, 7).map((data, index) => {
                    const date = new Date(data.date);
                    const dateStr = date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
                    const dayOfWeek = date.toLocaleDateString('ko-KR', { weekday: 'short' });
                    return (
                      <div 
                        key={index}
                        className="bg-gradient-to-b from-blue-50 to-blue-100 dark:from-gray-800 dark:to-gray-900 border rounded-xl p-4 hover:shadow-lg transition-all duration-200 flex flex-col flex-shrink-0 w-40 h-[370px]"
                        style={{ userSelect: 'none' }}
                      >
                        {/* 날짜 표시 */}
                        <div className="text-center border-b border-blue-200 dark:border-gray-700 mb-3 pb-2">
                          <div className="font-bold text-gray-800 dark:text-gray-200 text-sm">
                            {dateStr}
                          </div>
                          <div className="text-xs text-gray-600 dark:text-gray-400">
                            ({dayOfWeek})
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {data.regionName}
                          </div>
                        </div>
                        
                        {/* PM10 정보 */}
                        <div className="text-center mb-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3">
                          <div className="text-xs text-amber-700 dark:text-amber-300 font-medium mb-2">PM10</div>
                          {data.pm10Value && (
                            <>
                              <ConcentrationDisplay 
                                value={data.pm10Value} 
                                grade={data.pm10Grade || '2'} 
                              />
                              {data.pm10Grade && (
                                <div className="mt-2">
                                  <AirQualityBadge grade={data.pm10Grade as keyof typeof airQualityGrade} type="PM10" />
                                </div>
                              )}
                            </>
                          )}
                          {(data.pm10Avg || data.pm10Max || data.pm10Min) && (
                            <div className="text-xs text-gray-600 mt-2 space-y-1">
                              {data.pm10Avg && <div>평균: {data.pm10Avg}</div>}
                              {data.pm10Max && <div>최고: {data.pm10Max}</div>}
                              {data.pm10Min && <div>최저: {data.pm10Min}</div>}
                            </div>
                          )}
                        </div>
                        
                        {/* PM2.5 정보 */}
                        <div className="text-center bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-3">
                          <div className="text-xs text-indigo-700 dark:text-indigo-300 font-medium mb-2">PM2.5</div>
                          {data.pm25Value && (
                            <>
                              <ConcentrationDisplay 
                                value={data.pm25Value} 
                                grade={data.pm25Grade || '2'} 
                              />
                              {data.pm25Grade && (
                                <div className="mt-2">
                                  <AirQualityBadge grade={data.pm25Grade as keyof typeof airQualityGrade} type="PM2.5" />
                                </div>
                              )}
                            </>
                          )}
                          {(data.pm25Avg || data.pm25Max || data.pm25Min) && (
                            <div className="text-xs text-gray-600 mt-2 space-y-1">
                              {data.pm25Avg && <div>평균: {data.pm25Avg}</div>}
                              {data.pm25Max && <div>최고: {data.pm25Max}</div>}
                              {data.pm25Min && <div>최저: {data.pm25Min}</div>}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 시간별 미세먼지 농도 (기존) */}
        {activeTab === 'hourly' && hourlyData.length > 0 && regionalHourlyData.length === 0 && (
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

        {/* 주간예보 */}
        {activeTab === 'forecast' && weeklyForecastData.length > 0 && (
          <div className="space-y-6">
            {weeklyForecastData.map((forecast, index) => (
              <Card key={index}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    📅 {forecast.informCode === 'PM10' ? '미세먼지(PM10)' : '초미세먼지(PM2.5)'} 주간예보
                    <Badge variant="secondary" className="text-xs">
                      {new Date(forecast.dataTime).toLocaleDateString('ko-KR')} 발표
                    </Badge>
                  </CardTitle>
                  <CardDescription>
                    {forecast.informData} - 한국환경공단 발표
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* 전반적인 대기질 전망 */}
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                    <h3 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">전반적인 대기질 전망</h3>
                    <p className="text-blue-700 dark:text-blue-300 leading-relaxed">{forecast.informOverall}</p>
                    {forecast.informCause && (
                      <div className="mt-3 pt-3 border-t border-blue-200 dark:border-blue-700">
                        <p className="text-sm text-blue-600 dark:text-blue-400">
                          <strong>원인:</strong> {forecast.informCause}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* 일별 예보 */}
                  {forecast.dailyForecasts.length > 0 && (
                    <div>
                      <h3 className="font-semibold mb-3">일별 예보</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {forecast.dailyForecasts.map((daily, dailyIndex) => {
                          const date = new Date(daily.date);
                          const dayOfWeek = date.toLocaleDateString('ko-KR', { weekday: 'short' });
                          const monthDay = date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
                          
                          // 등급에 따른 색상 결정
                          let gradeColor = 'bg-gray-100 text-gray-700';
                          let gradeText = daily.grade;
                          
                          if (daily.grade.includes('좋음')) {
                            gradeColor = 'bg-blue-100 text-blue-700';
                            gradeText = '좋음';
                          } else if (daily.grade.includes('보통')) {
                            gradeColor = 'bg-green-100 text-green-700'; 
                            gradeText = '보통';
                          } else if (daily.grade.includes('나쁨') && !daily.grade.includes('매우')) {
                            gradeColor = 'bg-orange-100 text-orange-700';
                            gradeText = '나쁨';
                          } else if (daily.grade.includes('매우나쁨')) {
                            gradeColor = 'bg-red-100 text-red-700';
                            gradeText = '매우나쁨';
                          }
                          
                          return (
                            <div key={dailyIndex} className="border rounded-lg p-3 hover:shadow-md transition-shadow">
                              <div className="text-center">
                                <div className="font-medium text-gray-800 dark:text-gray-200">
                                  {monthDay} ({dayOfWeek})
                                </div>
                                <div className={`inline-block px-2 py-1 rounded text-sm font-medium mt-2 ${gradeColor}`}>
                                  {gradeText}
                                </div>
                                {daily.description && (
                                  <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                                    {daily.description}
                                  </p>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* 행동요령 */}
                  {forecast.actionKnack && (
                    <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-4">
                      <h3 className="font-semibold text-amber-800 dark:text-amber-200 mb-2">💡 행동요령</h3>
                      <p className="text-amber-700 dark:text-amber-300 leading-relaxed">{forecast.actionKnack}</p>
                    </div>
                  )}

                  {/* 예보 이미지 */}
                  {forecast.imageUrls && forecast.imageUrls.length > 0 && (
                    <div>
                      <h3 className="font-semibold mb-3">예보 차트</h3>
                      <ScrollArea className="w-full">
                        <div className="flex gap-3 pb-2">
                          {forecast.imageUrls.map((imageUrl, imgIndex) => (
                            <div key={imgIndex} className="flex-shrink-0">
                              <img 
                                src={imageUrl} 
                                alt={`예보 차트 ${imgIndex + 1}`}
                                className="w-64 h-auto border rounded-lg shadow-sm hover:shadow-md transition-shadow"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                }}
                              />
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {loading && (
          <div className="text-center py-8">
            <div className="text-muted-foreground">미세먼지 정보를 불러오는 중...</div>
          </div>
        )}
      </div>
    </div>
  );
}
