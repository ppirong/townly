'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { HourlyWeatherData, DailyWeatherData } from '@/lib/services/weather';
import { getWeatherIcon } from '@/lib/weather-icons';
import type { UserLocation } from '@/db/schema';

interface WeatherDashboardProps {
  className?: string;
  initialLocation?: UserLocation | null;
}

export function WeatherDashboard({ className, initialLocation }: WeatherDashboardProps) {
  const [location, setLocation] = useState('서울');
  const [units, setUnits] = useState<'metric' | 'imperial'>('metric');
  const [hourlyData, setHourlyData] = useState<HourlyWeatherData[]>([]);
  const [dailyData, setDailyData] = useState<DailyWeatherData[]>([]);
  const [weatherHeadline, setWeatherHeadline] = useState<{text: string; category: string; severity: number} | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 온도 범위에 따른 막대 위치와 길이 계산 함수
  const calculateBarProperties = (highTemp: number, lowTemp: number, minTemp: number, maxTemp: number, isDetailed: boolean = true) => {
    const containerHeight = isDetailed ? 160 : 80; // 전체 컨테이너 높이 (h-40 = 160px)
    const tempRange = maxTemp - minTemp;
    
    // 온도 범위가 0인 경우 기본값 반환
    if (tempRange === 0) {
      return {
        barHeight: containerHeight / 2,
        topPosition: containerHeight / 4
      };
    }
    
    // 최고/최저 온도의 상대적 위치 계산 (0~1 사이)
    const highTempRatio = (highTemp - minTemp) / tempRange;
    const lowTempRatio = (lowTemp - minTemp) / tempRange;
    
    // 막대의 위쪽 끝과 아래쪽 끝 위치 계산 (위에서부터 거리)
    const topPosition = (1 - highTempRatio) * containerHeight;
    const bottomPosition = (1 - lowTempRatio) * containerHeight;
    
    // 막대 높이 계산
    const barHeight = Math.max(bottomPosition - topPosition, 8); // 최소 8px
    
    return {
      barHeight,
      topPosition: Math.min(topPosition, containerHeight - barHeight)
    };
  };

  // 일별 데이터에서 최고/최저 온도 범위 계산
  const getTemperatureRange = () => {
    if (dailyData.length === 0) return { min: 0, max: 0 };
    
    const allTemps = dailyData.flatMap(day => [day.highTemp, day.lowTemp]);
    const minTemp = Math.min(...allTemps);
    const maxTemp = Math.max(...allTemps);
    
    return { min: minTemp, max: maxTemp };
  };

  useEffect(() => {
    // 초기 위치 정보가 있으면 자동으로 설정하고 날씨 조회
    if (initialLocation) {
      const locationName = initialLocation.cityName || 
                          initialLocation.address || 
                          `${parseFloat(initialLocation.latitude).toFixed(4)}, ${parseFloat(initialLocation.longitude).toFixed(4)}`;
      setLocation(locationName);
      
      // 자동으로 날씨 정보 조회
      setTimeout(() => {
        fetchWeatherData(locationName);
      }, 500);
    }
  }, [initialLocation]);

  const fetchWeatherData = async (locationName?: string) => {
    const targetLocation = locationName || location;
    if (!targetLocation.trim()) return;
    
    await Promise.all([
      fetchHourlyWeather(targetLocation),
      fetchDailyWeather(5, targetLocation)
    ]);
  };


  const fetchHourlyWeather = async (targetLocation?: string) => {
    const locationToUse = targetLocation || location;
    if (!locationToUse.trim() && !initialLocation) return;
    
    setLoading(true);
    setError(null);
    
    try {
      let url = '/api/weather/hourly';
      const params = new URLSearchParams();
      
      // 사용자 위치 정보가 있으면 위도/경도를 우선 사용
      if (initialLocation?.latitude && initialLocation?.longitude) {
        params.append('latitude', initialLocation.latitude);
        params.append('longitude', initialLocation.longitude);
      } else if (locationToUse) {
        params.append('location', locationToUse);
      }
      
      params.append('units', units);
      url += '?' + params.toString();
      
      const response = await fetch(url);
      const result = await response.json();
      
      if (result.success) {
        setHourlyData(result.data);
      } else {
        setError(result.error || '시간별 날씨 조회에 실패했습니다');
      }
    } catch (error) {
      console.error('시간별 날씨 조회 실패:', error);
      setError('시간별 날씨 정보를 가져오는데 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  const fetchDailyWeather = async (days: 1 | 5 | 10 | 15 = 5, targetLocation?: string) => {
    const locationToUse = targetLocation || location;
    if (!locationToUse.trim() && !initialLocation) return;
    
    setLoading(true);
    setError(null);
    
    try {
      let url = '/api/weather/daily';
      const params = new URLSearchParams();
      
      // 사용자 위치 정보가 있으면 위도/경도를 우선 사용
      if (initialLocation?.latitude && initialLocation?.longitude) {
        params.append('latitude', initialLocation.latitude);
        params.append('longitude', initialLocation.longitude);
      } else if (locationToUse) {
        params.append('location', locationToUse);
      }
      
      params.append('days', days.toString());
      params.append('units', units);
      url += '?' + params.toString();
      
      const response = await fetch(url);
      const result = await response.json();
      
      if (result.success) {
        setDailyData(result.data);
        setWeatherHeadline(result.headline || null);
      } else {
        setError(result.error || '일별 날씨 조회에 실패했습니다');
      }
    } catch (error) {
      console.error('일별 날씨 조회 실패:', error);
      setError('일별 날씨 정보를 가져오는데 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  const getTemperatureUnit = () => units === 'metric' ? '°C' : '°F';

  return (
    <div className={className}>
      <div className="space-y-6">

        {/* 검색 및 설정 */}
        <Card>
          <CardHeader>
            <CardTitle>날씨 조회</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="도시명을 입력하세요"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    fetchWeatherData();
                  }
                }}
              />
              <Button
                variant="outline"
                onClick={() => setUnits(units === 'metric' ? 'imperial' : 'metric')}
              >
                {units === 'metric' ? '°C' : '°F'}
              </Button>
            </div>
            
            <div className="flex flex-wrap gap-2">
              <Button 
                onClick={() => fetchWeatherData()} 
                disabled={loading || !location.trim()}
              >
                {loading ? '조회 중...' : '날씨 조회'}
              </Button>
            </div>

            {error && (
              <Alert variant={error.includes('제한') || error.includes('한도') ? 'default' : 'destructive'}>
                <AlertDescription>
                  {error}
                  {error.includes('제한') && (
                    <div className="mt-2 text-sm">
                      💡 무료 API는 5일 예보만 지원됩니다. 더 긴 기간의 예보는 유료 플랜이 필요합니다.
                    </div>
                  )}
                  {error.includes('한도') && (
                    <div className="mt-2 text-sm">
                      ⏰ 잠시 후 다시 시도해주세요. 무료 API는 일일 호출 한도가 있습니다.
                    </div>
                  )}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* 시간별 날씨 */}
        {hourlyData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>{location} - 시간별 날씨</CardTitle>
              <CardDescription>
                12시간 시간별 예보
              </CardDescription>
            </CardHeader>
            <CardContent className="min-h-[300px]">
              {/* 시간별 날씨를 한 행으로 표시하고 가로 스크롤 지원 */}
              <div className="overflow-x-auto pb-4 h-[250px]">
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
                  {hourlyData.slice(0, 24).map((weather, index) => (
                    <div 
                      key={index} 
                      className="bg-gradient-to-b from-sky-50 to-sky-100 dark:from-gray-800 dark:to-gray-900 border rounded-xl p-4 hover:shadow-lg transition-all duration-200 flex flex-col flex-shrink-0 w-28 h-[220px]"
                      style={{ userSelect: 'none' }}
                    >
                      {/* 시간 표시 */}
                      <div className="text-center border-b border-sky-200 dark:border-gray-700 mb-3 pb-2">
                        <div className="font-bold text-gray-800 dark:text-gray-200 text-sm">
                          {weather.hour}
                        </div>
                      </div>
                      
                      {/* 날씨 아이콘 */}
                      <div className="text-center mb-3">
                        <div className="text-3xl mb-2">
                          {getWeatherIcon(weather.weatherIcon, weather.conditions)}
                        </div>
                      </div>
                      
                      {/* 온도 */}
                      <div className="text-center mb-3">
                        <div className="font-bold text-lg text-blue-600 dark:text-blue-400">
                          {weather.temperature}{getTemperatureUnit()}
                        </div>
                      </div>
                      
                      {/* 강수 정보 */}
                      <div className="text-center space-y-1 mt-auto">
                        {weather.precipitation && weather.precipitation > 0 && (
                          <div className="text-xs text-blue-600 dark:text-blue-400">
                            💧 {weather.precipitation}mm
                          </div>
                        )}
                        {weather.precipitationProbability && weather.precipitationProbability > 0 && (
                          <div className="text-xs text-green-600 dark:text-green-400">
                            ☔ {weather.precipitationProbability}%
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 일별 날씨 - AccuWeather 스타일 */}
        {dailyData.length > 0 && (() => {
          const { min: minTemp, max: maxTemp } = getTemperatureRange();
          
          return (
            <Card>
              <CardHeader>
                <CardTitle>{location} - 일별 날씨 ({dailyData.length}일간)</CardTitle>
                <CardDescription>
                  {dailyData.length > 7 ? '장기 예보입니다. 날짜가 멀수록 정확도가 낮아질 수 있습니다.' : 'AccuWeather 제공 일별 예보'}
                  <div className="mt-1 text-xs text-muted-foreground">
                    온도 범위: {minTemp}{getTemperatureUnit()} ~ {maxTemp}{getTemperatureUnit()}
                  </div>
                </CardDescription>
                
                {/* AccuWeather 헤드라인 표시 */}
                {weatherHeadline && weatherHeadline.text && (
                  <Alert className="mt-3">
                    <AlertDescription>
                      <div className="flex items-start gap-2">
                        <div className={`flex-shrink-0 text-sm px-2 py-1 rounded ${
                          weatherHeadline.severity >= 7 ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400' :
                          weatherHeadline.severity >= 4 ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400' :
                          'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
                        }`}>
                          {weatherHeadline.category || '날씨 요약'}
                        </div>
                        <div className="text-sm">
                          {weatherHeadline.text}
                        </div>
                      </div>
                    </AlertDescription>
                  </Alert>
                )}
              </CardHeader>
              <CardContent className="min-h-[650px]">
              {/* 일별 날씨를 한 행으로 표시하고 가로 스크롤 지원 */}
              <div className="overflow-x-auto pb-4 h-[600px]">
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
                {dailyData.map((weather, index) => (
                  <div 
                    key={index} 
                    className="bg-gradient-to-b from-blue-50 to-blue-100 dark:from-gray-800 dark:to-gray-900 border rounded-xl p-5 hover:shadow-lg transition-all duration-200 flex flex-col flex-shrink-0 w-48 h-[570px]"
                    style={{ userSelect: 'none' }}
                  >
                    {/* 헤더: 날짜와 요일 */}
                    <div className="text-center border-b border-blue-200 dark:border-gray-700 mb-3 pb-2">
                      <div className="font-bold text-gray-800 dark:text-gray-200 text-sm">
                        {weather.date}
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        ({weather.dayOfWeek})
                      </div>
                    </div>
                    
                    {/* 낮 날씨 */}
                    {weather.dayWeather && (
                      <div className="text-center mb-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3">
                        <div className="text-xs text-amber-700 dark:text-amber-300 font-medium mb-2">낮</div>
                        <div className="text-3xl mb-2">
                          {getWeatherIcon(weather.dayWeather.icon, weather.dayWeather.conditions)}
                        </div>
                         <div className="text-sm font-medium text-blue-600 dark:text-blue-400">
                           ☔ {weather.dayWeather.precipitationProbability || 0}%
                         </div>
                      </div>
                    )}
                    
                    {/* 온도 막대그래프 */}
                    <div className="flex-1 flex flex-col justify-center items-center my-4">
                      {(() => {
                        const { barHeight, topPosition } = calculateBarProperties(
                          weather.highTemp, 
                          weather.lowTemp, 
                          minTemp, 
                          maxTemp, 
                          true
                        );
                        
                        return (
                          <div className="relative w-full flex flex-col items-center">
                            {/* 최고 온도 표시 (컨테이너 위쪽 고정) */}
                            <div className="font-bold text-base text-red-600 dark:text-red-400 mb-3">
                              {weather.highTemp}{getTemperatureUnit()}
                            </div>
                            
                            {/* 온도 막대그래프 컨테이너 */}
                            <div className="relative w-12 h-40 bg-gray-100 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                              {/* 단일 색상 온도 막대 */}
                              <div 
                                className="absolute w-10 left-1 bg-gradient-to-b from-blue-500 to-blue-600 dark:from-blue-400 dark:to-blue-500 rounded transition-all duration-300 hover:shadow-lg border border-blue-300 dark:border-blue-400"
                                style={{
                                  height: `${barHeight}px`,
                                  top: `${topPosition}px`
                                }}
                              ></div>
                            </div>
                            
                            {/* 최저 온도 표시 (컨테이너 아래쪽 고정) */}
                            <div className="font-bold text-base text-blue-600 dark:text-blue-400 mt-3">
                              {weather.lowTemp}{getTemperatureUnit()}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                    
                     {/* 밤 날씨 */}
                     {weather.nightWeather && (
                       <div className="text-center bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-3">
                         <div className="text-xs text-indigo-700 dark:text-indigo-300 font-medium mb-2">밤</div>
                         <div className="text-3xl mb-2">
                           {getWeatherIcon(weather.nightWeather.icon, weather.nightWeather.conditions)}
                         </div>
                         <div className="text-sm font-medium text-blue-600 dark:text-blue-400">
                           ☔ {weather.nightWeather.precipitationProbability || 0}%
                         </div>
                       </div>
                     )}
                  </div>
                ))}
                </div>
              </div>
              </CardContent>
            </Card>
          );
        })()}

        {loading && (
          <div className="text-center py-8">
            <div className="text-muted-foreground">날씨 정보를 불러오는 중...</div>
          </div>
        )}
      </div>
    </div>
  );
}


