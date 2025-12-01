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

  // 농도 표시 컴포넌트 - Glassmorphism Style with Original Color System
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
    
    // 기존 색상 시스템을 glassmorphism 스타일로 변환
    const getGlassmorphismStyle = (originalColor: string) => {
      if (originalColor.includes('blue')) {
        return 'backdrop-blur-sm bg-blue-400/30 border border-blue-300/50 text-blue-100 shadow-lg hover:bg-blue-400/40';
      } else if (originalColor.includes('green')) {
        return 'backdrop-blur-sm bg-green-400/30 border border-green-300/50 text-green-100 shadow-lg hover:bg-green-400/40';
      } else if (originalColor.includes('orange')) {
        return 'backdrop-blur-sm bg-orange-400/30 border border-orange-300/50 text-orange-100 shadow-lg hover:bg-orange-400/40';
      } else if (originalColor.includes('red')) {
        return 'backdrop-blur-sm bg-red-400/30 border border-red-300/50 text-red-100 shadow-lg hover:bg-red-400/40';
      } else if (originalColor.includes('purple')) {
        return 'backdrop-blur-sm bg-purple-400/30 border border-purple-300/50 text-purple-100 shadow-lg hover:bg-purple-400/40';
      } else if (originalColor.includes('gray-900')) {
        return 'backdrop-blur-sm bg-gray-800/50 border border-gray-600/50 text-gray-100 shadow-lg hover:bg-gray-800/60';
      } else {
        return 'backdrop-blur-sm bg-gray-400/30 border border-gray-300/50 text-gray-100 shadow-lg hover:bg-gray-400/40';
      }
    };
    
    const glassmorphismStyle = getGlassmorphismStyle(info.color);
    
    return (
      <div className={`text-center p-3 rounded-xl transition-all duration-300 ${glassmorphismStyle}`}>
        <div className="text-xl font-bold">{value || '-'}</div>
        <div className="text-xs opacity-90">{unit}</div>
        <div className="text-xs mt-1 font-medium opacity-95">{info.label}</div>
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
    <div className={`min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 ${className}`}>
      {/* Background Effects */}
      <div className="fixed inset-0 opacity-30 pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl animate-blob"></div>
        <div className="absolute top-40 right-10 w-72 h-72 bg-cyan-500 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-4000"></div>
      </div>
      
      <div className="relative max-w-7xl mx-auto px-4 py-8">
        <div className="space-y-8">
        {/* 현재 설정된 위치 정보 표시 - Modern Glassmorphism Design */}
        {userLocation && (
          <div className="group relative">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-500 via-pink-500 to-rose-500 rounded-3xl blur opacity-60 group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>
            <div className="relative backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl shadow-2xl hover:shadow-purple-500/25 transition-all duration-500">
              <div className="p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center text-2xl shadow-lg">
                    📍
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold bg-gradient-to-r from-white via-purple-200 to-purple-400 bg-clip-text text-transparent">
                      현재 설정된 위치
                    </h3>
                  </div>
                </div>
                
                <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
                  <div className="space-y-3 flex-1">
                    <div className="backdrop-blur-sm bg-white/10 border border-white/30 rounded-xl p-4">
                      <p className="text-sm font-medium text-white/90 mb-2">
                        📍 주소: {userLocation.address || '주소 정보 없음'}
                      </p>
                      {userLocation.cityName && (
                        <p className="text-xs text-white/70 mb-2">
                          🏙️ 대기질 조회 지역: {userLocation.cityName}
                        </p>
                      )}
                      <p className="text-xs text-white/60">
                        🌐 좌표: {parseFloat(userLocation.latitude).toFixed(4)}, {parseFloat(userLocation.longitude).toFixed(4)}
                      </p>
                    </div>
                  </div>
                  
                  <button
                    onClick={handleRefreshData}
                    disabled={locationRefreshing || loading}
                    className={`font-bold py-3 px-6 rounded-xl transition-all duration-300 transform flex items-center gap-2 ${
                      locationRefreshing || loading
                        ? 'bg-gradient-to-r from-gray-500/50 to-gray-600/50 text-white/70 cursor-not-allowed backdrop-blur-sm border border-gray-400/30'
                        : 'bg-gradient-to-r from-purple-500/80 to-pink-600/80 text-white hover:from-purple-600/90 hover:to-pink-700/90 hover:scale-[1.02] shadow-xl hover:shadow-purple-500/50 active:scale-[0.98] backdrop-blur-sm border border-purple-300/50'
                    }`}
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
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}


        {/* 현재 대기질 정보 - Modern Glassmorphism Design */}
        {currentData && (
          <div className="group relative">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 rounded-3xl blur opacity-60 group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>
            <div className="relative backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl shadow-2xl hover:shadow-emerald-500/25 transition-all duration-500">
              <div className="p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center text-2xl shadow-lg">
                    🌡️
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold bg-gradient-to-r from-white via-emerald-200 to-emerald-400 bg-clip-text text-transparent">
                      현재 대기질 정보
                    </h3>
                    <p className="text-emerald-200 mt-1 font-medium">
                      Google Air Quality API를 통한 실시간 대기질 데이터
                    </p>
                  </div>
                </div>
                
                <div className="max-w-2xl mx-auto">
                  <div 
                    className="backdrop-blur-lg border border-white/30 rounded-2xl p-6 shadow-xl"
                    style={{ backgroundColor: 'rgba(55, 65, 81, 0.3)' }}
                  >
                    <div className="space-y-6">
                      <div className="text-center border-b border-white/30 pb-4">
                        <h4 className="text-xl font-bold text-white">현재 대기질</h4>
                        <div className="text-sm text-white/70 mt-2 font-medium">
                          {new Date(currentData.dateTime).toLocaleString('ko-KR')} 기준
                        </div>
                      </div>
                      
                      {/* PM 농도 */}
                      <div className="grid grid-cols-2 gap-6">
                        <div className="text-center">
                          <div className="text-sm mb-3 text-white/80 font-medium">미세먼지 (PM10)</div>
                          <ConcentrationDisplay value={currentData.pm10} type="pm10" />
                          {currentData.pm10 && (
                            <div className="mt-3 text-xs text-white/60 bg-white/10 rounded-lg p-2 backdrop-blur-sm">
                              {getAirQualityInfo(currentData.pm10, 'pm10').description}
                            </div>
                          )}
                        </div>
                        <div className="text-center">
                          <div className="text-sm mb-3 text-white/80 font-medium">초미세먼지 (PM2.5)</div>
                          <ConcentrationDisplay value={currentData.pm25} type="pm25" />
                          {currentData.pm25 && (
                            <div className="mt-3 text-xs text-white/60 bg-white/10 rounded-lg p-2 backdrop-blur-sm">
                              {getAirQualityInfo(currentData.pm25, 'pm25').description}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* 대기질 지수 */}
                      <div className="grid grid-cols-2 gap-6 border-t border-white/30 pt-6">
                        <div className="text-center">
                          <div className="text-sm mb-3 text-white/80 font-medium">CAI (Korea)</div>
                          <ConcentrationDisplay value={currentData.caiKr} type="cai" unit="" />
                          {currentData.caiKr && (
                            <div className="mt-3 text-xs text-white/60 bg-white/10 rounded-lg p-2 backdrop-blur-sm">
                              한국 통합대기환경지수
                            </div>
                          )}
                        </div>
                        <div className="text-center">
                          <div className="text-sm mb-3 text-white/80 font-medium">BreezoMeter AQI</div>
                          <ConcentrationDisplay value={currentData.breezoMeterAqi} type="aqi" unit="" />
                          {currentData.breezoMeterAqi && (
                            <div className="mt-3 text-xs text-white/60 bg-white/10 rounded-lg p-2 backdrop-blur-sm">
                              국제 대기질 지수
                            </div>
                          )}
                        </div>
                      </div>

                      {/* 건강 권고사항 */}
                      {currentData.healthRecommendations && (
                        <div className="border-t border-white/30 pt-6">
                          <h4 className="text-sm font-medium text-white/90 mb-4 flex items-center gap-2">
                            <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></span>
                            건강 권고사항
                          </h4>
                          <div className="space-y-3 text-sm">
                            {currentData.healthRecommendations.general && (
                              <div className="backdrop-blur-sm bg-green-400/20 border border-green-300/40 p-3 rounded-xl">
                                <span className="font-medium text-green-200">일반인: </span>
                                <span className="text-green-100">{currentData.healthRecommendations.general}</span>
                              </div>
                            )}
                            {currentData.healthRecommendations.sensitive && (
                              <div className="backdrop-blur-sm bg-orange-400/20 border border-orange-300/40 p-3 rounded-xl">
                                <span className="font-medium text-orange-200">민감군: </span>
                                <span className="text-orange-100">{currentData.healthRecommendations.sensitive}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 시간별 대기질 예보 - Modern Glassmorphism Design */}
        {hourlyData.length > 0 && (
          <div className="group relative">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500 rounded-3xl blur opacity-60 group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>
            <div className="relative backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl shadow-2xl hover:shadow-cyan-500/25 transition-all duration-500">
              <div className="p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center text-2xl shadow-lg">
                    🌬️
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold bg-gradient-to-r from-white via-cyan-200 to-cyan-400 bg-clip-text text-transparent">
                      시간별 대기질 예보
                    </h3>
                    <p className="text-cyan-200 mt-1 font-medium">
                      향후 12시간 시간별 대기질 변화 예측
                    </p>
                  </div>
                </div>
                
                <div className="min-h-[450px]">
                  <div className="overflow-x-auto pb-4 h-[400px]">
                    <div className="flex gap-4 min-w-max h-full"
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
                                ? 'backdrop-blur-lg border border-yellow-300/40 shadow-xl hover:shadow-yellow-400/30' 
                                : 'backdrop-blur-lg border border-white/30 hover:border-cyan-300/50'
                            } rounded-2xl p-4 hover:shadow-lg transition-all duration-300 hover:scale-[1.02] flex flex-col flex-shrink-0 h-[350px] group/card`}
                            style={{ 
                              userSelect: 'none',
                              width: '90px',
                              backgroundColor: 'rgba(107, 114, 128, 0.3)'
                            }}
                          >
                            {/* 시간 표시 */}
                            <div className={`text-center border-b ${isNow ? 'border-yellow-300/40' : 'border-white/30'} mb-3 pb-2`}>
                              <div className={`font-bold text-xs ${isNow ? 'text-yellow-100' : 'text-white'}`}>
                                {hour}시
                              </div>
                            </div>
                            
                            {/* PM10 */}
                            <div className="text-center mb-3">
                              <div className="text-xs text-white/70 mb-2 font-medium">PM10</div>
                              <ConcentrationDisplay value={data.pm10} type="pm10" />
                            </div>
                            
                            {/* PM2.5 */}
                            <div className="text-center mb-3">
                              <div className="text-xs text-white/70 mb-2 font-medium">PM2.5</div>
                              <ConcentrationDisplay value={data.pm25} type="pm25" />
                            </div>
                            
                            {/* AQI */}
                            {(data.caiKr || data.breezoMeterAqi) && (
                              <div className="text-center mt-auto">
                                <div className="text-xs text-white/70 mb-1 font-medium">
                                  {data.caiKr ? 'CAI' : 'AQI'}
                                </div>
                                <div className="text-sm font-bold bg-gradient-to-r from-purple-300 to-pink-300 bg-clip-text text-transparent">
                                  {data.caiKr || data.breezoMeterAqi}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}



        {error && (
          <div className="group relative">
            <div className={`absolute -inset-0.5 ${
              error.includes('✅') 
                ? 'bg-gradient-to-r from-green-500 to-emerald-500' 
                : 'bg-gradient-to-r from-red-500 to-pink-500'
            } rounded-2xl blur opacity-60 group-hover:opacity-100 transition duration-1000`}></div>
            <div className="relative backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl shadow-2xl p-6">
              <div className={`${
                error.includes('✅') ? 'text-green-200' : 'text-red-200'
              }`}>
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-2xl">{error.includes('✅') ? '✅' : '⚠️'}</span>
                  <span className="font-medium">{error}</span>
                </div>
                {error.includes('API 키') && (
                  <div className="mt-4 text-sm backdrop-blur-sm bg-white/10 rounded-xl p-4 border border-white/30">
                    <p className="font-medium text-white mb-3">Google Maps API 키 설정 방법:</p>
                    <ol className="list-decimal list-inside space-y-2 text-white/80">
                      <li><a href="https://console.cloud.google.com/google/maps-apis" target="_blank" rel="noopener noreferrer" className="text-cyan-300 underline hover:text-cyan-200">Google Cloud Console</a>에서 API 키 생성</li>
                      <li>Air Quality API 활성화</li>
                      <li><code className="bg-gray-800/50 px-2 py-1 rounded text-cyan-300">GOOGLE_MAPS_API_KEY=발급받은키</code>를 .env.local에 추가</li>
                      <li>서버 재시작</li>
                    </ol>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {loading && (
          <div className="group relative">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl blur opacity-60 animate-pulse"></div>
            <div className="relative backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl shadow-2xl p-8">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-2xl shadow-lg animate-pulse">
                  🌬️
                </div>
                <div className="text-white/90 font-medium">대기질 정보를 불러오는 중...</div>
                <div className="text-white/60 text-sm mt-2">잠시만 기다려주세요</div>
              </div>
            </div>
          </div>
        )}

        {!userLocation && !loading && (
          <div className="group relative">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-gray-500 to-slate-500 rounded-2xl blur opacity-60 group-hover:opacity-100 transition duration-1000"></div>
            <div className="relative backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl shadow-2xl p-12">
              <div className="text-center">
                <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-gray-500 to-slate-600 rounded-full flex items-center justify-center text-3xl shadow-lg">
                  🌬️
                </div>
                <h3 className="text-xl font-bold text-white mb-4">
                  위치 정보가 필요합니다
                </h3>
                <div className="text-white/70 space-y-2">
                  <p>날씨 페이지에서 위치를 설정한 후</p>
                  <p>대기질 정보를 확인할 수 있습니다</p>
                </div>
              </div>
            </div>
          </div>
        )}
        </div>
      </div>
    </div>
  );
}
