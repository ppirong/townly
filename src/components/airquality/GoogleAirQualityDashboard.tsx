'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { ClientUserLocation } from '@/lib/dto/location-mappers';
import { 
  getCurrentAirQuality,
  getHourlyAirQuality,
  getDailyAirQuality,
  getUserLocationAirQuality,
  refreshAirQualityData
} from '@/actions/google-air-quality';
import type { ProcessedAirQualityData } from '@/lib/services/google-air-quality';

interface GoogleAirQualityDashboardProps {
  className?: string;
  initialLocation?: ClientUserLocation | null;
}


export function GoogleAirQualityDashboard({ className, initialLocation }: GoogleAirQualityDashboardProps) {
  const [currentData, setCurrentData] = useState<ProcessedAirQualityData | null>(null);
  const [hourlyData, setHourlyData] = useState<ProcessedAirQualityData[]>([]);
  const [dailyData, setDailyData] = useState<ProcessedAirQualityData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userLocation, setUserLocationState] = useState<ClientUserLocation | null>(initialLocation || null);
  const [locationRefreshing, setLocationRefreshing] = useState(false);
  const [lastRefreshTime, setLastRefreshTime] = useState<number>(0);

  // 대기질 지수에 따른 색상 및 설명 반환
  const getAirQualityInfo = (value: number | undefined, type: 'pm10' | 'pm25' | 'cai' | 'aqi') => {
    if (!value) return { color: 'bg-gray-100 text-gray-700', label: '데이터 없음', description: '' };

    switch (type) {
      case 'pm10':
        if (value <= 30) return { color: 'bg-blue-100 text-blue-700', label: '좋음', description: '0~30 μg/m³' };
        if (value <= 80) return { color: 'bg-green-100 text-green-700', label: '보통', description: '31~80 μg/m³' };
        if (value <= 150) return { color: 'bg-orange-100 text-orange-700', label: '나쁨', description: '81~150 μg/m³' };
        return { color: 'bg-red-100 text-red-700', label: '매우나쁨', description: '151μg/m³ 이상' };
      
      case 'pm25':
        if (value <= 15) return { color: 'bg-blue-100 text-blue-700', label: '좋음', description: '0~15 μg/m³' };
        if (value <= 35) return { color: 'bg-green-100 text-green-700', label: '보통', description: '16~35 μg/m³' };
        if (value <= 75) return { color: 'bg-orange-100 text-orange-700', label: '나쁨', description: '36~75 μg/m³' };
        return { color: 'bg-red-100 text-red-700', label: '매우나쁨', description: '76μg/m³ 이상' };
      
      case 'cai':
        if (value <= 50) return { color: 'bg-blue-100 text-blue-700', label: '좋음', description: '0~50' };
        if (value <= 100) return { color: 'bg-green-100 text-green-700', label: '보통', description: '51~100' };
        if (value <= 250) return { color: 'bg-orange-100 text-orange-700', label: '나쁨', description: '101~250' };
        return { color: 'bg-red-100 text-red-700', label: '매우나쁨', description: '251 이상' };
      
      case 'aqi':
        if (value <= 50) return { color: 'bg-blue-100 text-blue-700', label: '좋음', description: '0~50' };
        if (value <= 100) return { color: 'bg-green-100 text-green-700', label: '보통', description: '51~100' };
        if (value <= 150) return { color: 'bg-orange-100 text-orange-700', label: '민감군 주의', description: '101~150' };
        if (value <= 200) return { color: 'bg-red-100 text-red-700', label: '나쁨', description: '151~200' };
        if (value <= 300) return { color: 'bg-purple-100 text-purple-700', label: '매우나쁨', description: '201~300' };
        return { color: 'bg-gray-900 text-white', label: '위험', description: '301 이상' };
      
      default:
        return { color: 'bg-gray-100 text-gray-700', label: '알 수 없음', description: '' };
    }
  };

  // 농도 표시 컴포넌트
  const ConcentrationDisplay = ({ 
    value, 
    type, 
    unit = 'μg/m³' 
  }: { 
    value: number | undefined; 
    type: 'pm10' | 'pm25' | 'cai' | 'aqi'; 
    unit?: string;
  }) => {
    const info = getAirQualityInfo(value, type);
    
    return (
      <div className={`text-center p-3 rounded-lg ${info.color}`}>
        <div className="text-2xl font-bold">{value || '-'}</div>
        <div className="text-sm">{unit}</div>
        <div className="text-xs mt-1">{info.label}</div>
      </div>
    );
  };


  // 사용자별 대기질 데이터 조회
  const fetchUserAirQualityData = async () => {
    if (!userLocation) return;
    
    setLoading(true);
    setError(null);
    
    try {
      console.log('🌬️ 사용자별 대기질 조회 시작:', userLocation);
      
      const result = await getUserLocationAirQuality();
      
      if (result) {
        setCurrentData(result.currentAirQuality);
        setHourlyData(result.hourlyAirQuality);
        setDailyData(result.dailyAirQuality);
        
        console.log('✅ 사용자별 대기질 조회 성공');
      } else {
        setError('저장된 위치 정보가 없습니다. 위치를 새로고침해 주세요.');
      }
    } catch (error) {
      console.error('사용자별 대기질 조회 실패:', error);
      setError('대기질 정보를 가져오는데 실패했습니다. 다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  };

  // 대기질 데이터 새로고침
  const handleRefreshData = async () => {
    if (!userLocation) return;
    
    // 쿨다운 체크 (30초)
    const now = Date.now();
    const cooldownTime = 30 * 1000;
    
    if (now - lastRefreshTime < cooldownTime) {
      const remainingTime = Math.ceil((cooldownTime - (now - lastRefreshTime)) / 1000);
      setError(`⏰ 새로고침은 ${remainingTime}초 후에 다시 시도할 수 있습니다.`);
      setTimeout(() => setError(null), 3000);
      return;
    }

    setLocationRefreshing(true);
    setError(null);
    setLastRefreshTime(now);

    try {
      const result = await refreshAirQualityData(
        parseFloat(userLocation.latitude),
        parseFloat(userLocation.longitude)
      );

      setCurrentData(result.currentAirQuality);
      setHourlyData(result.hourlyAirQuality);
      setDailyData(result.dailyAirQuality);

      setError('✅ 대기질 정보가 성공적으로 새로고침되었습니다!');
      setTimeout(() => setError(null), 3000);
    } catch (error) {
      console.error('대기질 새로고침 실패:', error);
      setError('대기질 정보 새로고침에 실패했습니다.');
    } finally {
      setLocationRefreshing(false);
    }
  };

  useEffect(() => {
    if (initialLocation) {
      setUserLocationState(initialLocation);
      setTimeout(() => {
        fetchUserAirQualityData();
      }, 500);
    }
  }, [initialLocation]);


  return (
    <div className={className}>
      <div className="space-y-6">
        {/* 현재 설정된 위치 정보 표시 */}
        {userLocation && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span>📍</span>
                현재 설정된 위치
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium">
                    주소: {userLocation.address || '주소 정보 없음'}
                  </p>
                  {userLocation.cityName && (
                    <p className="text-xs text-muted-foreground">
                      대기질 조회 지역: {userLocation.cityName}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    좌표: {parseFloat(userLocation.latitude).toFixed(4)}, {parseFloat(userLocation.longitude).toFixed(4)}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefreshData}
                  disabled={locationRefreshing || loading}
                  className="flex items-center gap-2"
                >
                  {locationRefreshing ? (
                    <>
                      <span className="animate-spin">🔄</span>
                      새로고침 중...
                    </>
                  ) : loading ? (
                    <>
                      <span className="animate-pulse">⏳</span>
                      조회 중...
                    </>
                  ) : (
                    <>
                      <span>🔄</span>
                      대기질 새로고침
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}


        {/* 현재 대기질 정보 */}
        {currentData && (
          <Card>
            <CardHeader>
              <CardTitle>현재 대기질 정보</CardTitle>
              <CardDescription>
                Google Air Quality API를 통한 실시간 대기질 데이터
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="max-w-2xl mx-auto">
                <Card className="p-6 border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-white">
                  <div className="space-y-6">
                    <div className="text-center border-b border-blue-200 pb-3">
                      <h3 className="text-xl font-bold text-gray-800">현재 대기질</h3>
                      <div className="text-sm text-muted-foreground mt-1">
                        {new Date(currentData.dateTime).toLocaleString('ko-KR')} 기준
                      </div>
                    </div>
                    
                    {/* PM 농도 */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center">
                        <div className="text-sm mb-2 text-gray-600">미세먼지 (PM10)</div>
                        <ConcentrationDisplay value={currentData.pm10} type="pm10" />
                        {currentData.pm10 && (
                          <div className="mt-2 text-xs text-muted-foreground">
                            {getAirQualityInfo(currentData.pm10, 'pm10').description}
                          </div>
                        )}
                      </div>
                      <div className="text-center">
                        <div className="text-sm mb-2 text-gray-600">초미세먼지 (PM2.5)</div>
                        <ConcentrationDisplay value={currentData.pm25} type="pm25" />
                        {currentData.pm25 && (
                          <div className="mt-2 text-xs text-muted-foreground">
                            {getAirQualityInfo(currentData.pm25, 'pm25').description}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 대기질 지수 */}
                    <div className="grid grid-cols-2 gap-4 border-t border-blue-200 pt-4">
                      <div className="text-center">
                        <div className="text-sm mb-2 text-gray-600">CAI (Korea)</div>
                        <ConcentrationDisplay value={currentData.caiKr} type="cai" unit="" />
                        {currentData.caiKr && (
                          <div className="mt-2 text-xs text-muted-foreground">
                            한국 통합대기환경지수
                          </div>
                        )}
                      </div>
                      <div className="text-center">
                        <div className="text-sm mb-2 text-gray-600">BreezoMeter AQI</div>
                        <ConcentrationDisplay value={currentData.breezoMeterAqi} type="aqi" unit="" />
                        {currentData.breezoMeterAqi && (
                          <div className="mt-2 text-xs text-muted-foreground">
                            국제 대기질 지수
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 건강 권고사항 */}
                    {currentData.healthRecommendations && (
                      <div className="border-t border-blue-200 pt-4">
                        <h4 className="text-sm font-medium text-gray-700 mb-2">건강 권고사항</h4>
                        <div className="space-y-2 text-sm">
                          {currentData.healthRecommendations.general && (
                            <div className="bg-green-50 p-2 rounded">
                              <span className="font-medium text-green-800">일반인: </span>
                              <span className="text-green-700">{currentData.healthRecommendations.general}</span>
                            </div>
                          )}
                          {currentData.healthRecommendations.sensitive && (
                            <div className="bg-orange-50 p-2 rounded">
                              <span className="font-medium text-orange-800">민감군: </span>
                              <span className="text-orange-700">{currentData.healthRecommendations.sensitive}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </Card>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 시간별 대기질 예보 */}
        {hourlyData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>시간별 대기질 예보</CardTitle>
              <CardDescription>
                향후 12시간 시간별 대기질 변화 예측
              </CardDescription>
            </CardHeader>
            <CardContent className="min-h-[350px]">
              <div className="overflow-x-auto pb-4 h-[320px]">
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
                  {hourlyData.slice(0, 12).map((data, index) => {
                    const hour = new Date(data.dateTime).getHours();
                    const isNow = index === 0;
                    
                    return (
                      <div 
                        key={index} 
                        className={`${
                          isNow 
                            ? 'bg-gradient-to-b from-blue-50 to-blue-100 border-blue-300 shadow-lg' 
                            : 'bg-gradient-to-b from-sky-50 to-sky-100'
                        } dark:from-gray-800 dark:to-gray-900 border rounded-xl p-4 hover:shadow-lg transition-all duration-200 flex flex-col flex-shrink-0 w-32 h-[290px]`}
                        style={{ userSelect: 'none' }}
                      >
                        {/* 시간 표시 */}
                        <div className={`text-center border-b ${isNow ? 'border-blue-200' : 'border-sky-200'} dark:border-gray-700 mb-3 pb-2`}>
                          <div className="font-bold text-gray-800 dark:text-gray-200 text-sm">
                            {hour}시
                            {isNow && <span className="text-xs text-blue-600 ml-1">현재</span>}
                          </div>
                        </div>
                        
                        {/* PM10 */}
                        <div className="text-center mb-2">
                          <div className="text-xs text-muted-foreground mb-1">PM10</div>
                          <ConcentrationDisplay value={data.pm10} type="pm10" />
                        </div>
                        
                        {/* PM2.5 */}
                        <div className="text-center mb-2">
                          <div className="text-xs text-muted-foreground mb-1">PM2.5</div>
                          <ConcentrationDisplay value={data.pm25} type="pm25" />
                        </div>
                        
                        {/* AQI */}
                        {(data.caiKr || data.breezoMeterAqi) && (
                          <div className="text-center mt-auto">
                            <div className="text-xs text-muted-foreground mb-1">
                              {data.caiKr ? 'CAI' : 'AQI'}
                            </div>
                            <div className="text-sm font-bold text-purple-600">
                              {data.caiKr || data.breezoMeterAqi}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        )}



        {error && (
          <Alert variant={
            error.includes('✅') ? 'default' : 'destructive'
          }>
            <AlertDescription>
              {error}
              {error.includes('API 키') && (
                <div className="mt-2 text-sm">
                  <p className="font-medium">Google Maps API 키 설정 방법:</p>
                  <ol className="list-decimal list-inside mt-1 space-y-1">
                    <li><a href="https://console.cloud.google.com/google/maps-apis" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">Google Cloud Console</a>에서 API 키 생성</li>
                    <li>Air Quality API 활성화</li>
                    <li><code className="bg-gray-100 px-1 rounded">GOOGLE_MAPS_API_KEY=발급받은키</code>를 .env.local에 추가</li>
                    <li>서버 재시작</li>
                  </ol>
                </div>
              )}
            </AlertDescription>
          </Alert>
        )}

        {loading && (
          <div className="text-center py-8">
            <div className="text-muted-foreground">대기질 정보를 불러오는 중...</div>
          </div>
        )}

        {!userLocation && !loading && (
          <div className="text-center py-12">
            <div className="mb-4">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                <span className="text-2xl">🌬️</span>
              </div>
              <h3 className="text-lg font-medium text-gray-700 mb-2">
                위치 정보가 필요합니다
              </h3>
              <div className="text-sm text-gray-500 space-y-1">
                <p>날씨 페이지에서 위치를 설정한 후</p>
                <p>대기질 정보를 확인할 수 있습니다</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
