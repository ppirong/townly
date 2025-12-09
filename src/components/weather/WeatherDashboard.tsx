'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { ClientHourlyWeatherData, ClientDailyWeatherData } from '@/lib/dto/weather-dto-mappers';
import { mapHourlyWeatherForClient, mapDailyWeatherForClient } from '@/lib/dto/weather-dto-mappers';
import { getWeatherIcon } from '@/lib/weather-icons';
import type { ClientUserLocation } from '@/lib/dto/location-mappers';
import { setUserLocation } from '@/actions/location';
import { getUserLocationWeather, refreshWeatherFromAPI } from '@/actions/weather';


interface WeatherDashboardProps {
  className?: string;
  initialLocation?: ClientUserLocation | null;
}

export function WeatherDashboard({ className, initialLocation }: WeatherDashboardProps) {
  const [location, setLocation] = useState('서울');
  const [units, setUnits] = useState<'metric' | 'imperial'>('metric');
  const [hourlyData, setHourlyData] = useState<ClientHourlyWeatherData[]>([]);
  const [dailyData, setDailyData] = useState<ClientDailyWeatherData[]>([]);
  const [weatherHeadline, setWeatherHeadline] = useState<{text: string; category: string; severity: number} | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userLocation, setUserLocationState] = useState<ClientUserLocation | null>(initialLocation || null);
  
  
  const [locationRefreshing, setLocationRefreshing] = useState(false);
  const [lastRefreshTime, setLastRefreshTime] = useState<number>(0);
  const [cacheClearing, setCacheClearing] = useState(false);
  const [apiRefreshing, setApiRefreshing] = useState(false);

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

  // 사용자별 날씨 데이터 조회 (새로운 Server Actions 사용)
  const fetchUserWeatherData = useCallback(async () => {
    if (!userLocation) return;
    
    setLoading(true);
    setError(null);
    
    try {
      console.log('🌍 사용자별 날씨 조회 시작:', userLocation);
      
      // 사용자 저장된 위치의 날씨 조회
      const weatherResult = await getUserLocationWeather();
      
      if (weatherResult) {
        if (Array.isArray(weatherResult.hourlyWeather)) {
          setHourlyData(weatherResult.hourlyWeather);
        } else {
          setHourlyData([]);
        }
        
        // 일별 데이터를 올바른 형식으로 변환
        if (weatherResult.dailyWeather) {
          if (Array.isArray(weatherResult.dailyWeather)) {
            setDailyData(weatherResult.dailyWeather);
          } else if (weatherResult.dailyWeather && typeof weatherResult.dailyWeather === 'object' && 'dailyForecasts' in weatherResult.dailyWeather) {
            const dailyWeatherData = weatherResult.dailyWeather as any;
            if (Array.isArray(dailyWeatherData.dailyForecasts)) {
              setDailyData(dailyWeatherData.dailyForecasts);
            }
            // 헤드라인 처리  
            if (dailyWeatherData.headline && typeof dailyWeatherData.headline === 'object' && 'text' in dailyWeatherData.headline) {
              setWeatherHeadline(dailyWeatherData.headline as {text: string; category: string; severity: number});
            }
          }
        }
        
        console.log('✅ 사용자별 날씨 조회 성공');
      } else {
        // 사용자별 데이터가 없으면 일반 API 조회로 폴백
        console.log('ℹ️ 사용자별 날씨 데이터 없음, 일반 API 조회로 폴백');
        await fetchWeatherData();
      }
    } catch (error) {
      console.error('사용자별 날씨 조회 실패:', error);
      setError('날씨 정보를 가져오는데 실패했습니다. 다시 시도해주세요.');
      
      // 에러 시 일반 API 조회로 폴백
      await fetchWeatherData();
    } finally {
      setLoading(false);
    }
  }, [userLocation]);


  useEffect(() => {
    // 초기 위치 정보가 있으면 자동으로 설정하고 날씨 조회
    if (initialLocation) {
      const locationName = initialLocation.cityName || 
                          initialLocation.address || 
                          `${parseFloat(initialLocation.latitude).toFixed(4)}, ${parseFloat(initialLocation.longitude).toFixed(4)}`;
      setLocation(locationName);
      
      // userLocation 상태도 업데이트 (초기값과 다를 수 있음)
      if (!userLocation) {
        setUserLocationState(initialLocation);
      }
      
      // 사용자별 날씨 정보 조회
      setTimeout(() => {
        fetchUserWeatherData();
      }, 500);
    }
  }, [initialLocation, userLocation, fetchUserWeatherData]);

  const fetchWeatherData = async (locationName?: string) => {
    const targetLocation = locationName || location;
    if (!targetLocation.trim()) return;
    
    await Promise.all([
      fetchHourlyWeather(targetLocation),
      fetchDailyWeather(5, targetLocation)
    ]);
  };


  const fetchHourlyWeather = async (locationName: string) => {
    try {
      const response = await fetch(`/api/weather/hourly?location=${encodeURIComponent(locationName)}`);
      const data = await response.json();
      
      if (data.success && data.data) {
        const mappedData = mapHourlyWeatherForClient(data.data);
        if (Array.isArray(mappedData)) {
          setHourlyData(mappedData);
        } else {
          setHourlyData([]);
        }
      } else {
        throw new Error(data.error || '시간별 날씨 조회 실패');
      }
    } catch (error) {
      console.error('시간별 날씨 조회 실패:', error);
      setError('시간별 날씨 정보를 가져오는데 실패했습니다.');
    }
  };

  const fetchDailyWeather = async (days: number, locationName: string) => {
    try {
      const response = await fetch(`/api/weather/daily?location=${encodeURIComponent(locationName)}&days=${days}`);
      const data = await response.json();
      
      if (data.success && data.data) {
        const mappedData = mapDailyWeatherForClient(data.data) as any;
        if (Array.isArray(mappedData?.dailyForecasts)) {
          setDailyData(mappedData.dailyForecasts);
        } else if (Array.isArray(mappedData)) {
          setDailyData(mappedData);
        }
        
        if (mappedData?.headline && typeof mappedData.headline === 'object' && 'text' in mappedData.headline) {
          setWeatherHeadline(mappedData.headline as {text: string; category: string; severity: number});
        }
      } else {
        throw new Error(data.error || '일별 날씨 조회 실패');
      }
    } catch (error) {
      console.error('일별 날씨 조회 실패:', error);
      setError('일별 날씨 정보를 가져오는데 실패했습니다.');
    }
  };

  const getTemperatureUnit = () => {
    return units === 'metric' ? '°C' : '°F';
  };

  const clearCacheAndRefresh = async () => {
    setCacheClearing(true);
    setError(null);
    
    try {
      // 캐시 삭제 API 호출
      const response = await fetch('/api/weather/cache', {
        method: 'DELETE'
      });
      
      if (response.ok) {
        // 캐시 삭제 후 날씨 데이터 새로 조회
        if (userLocation) {
          await fetchUserWeatherData();
        } else {
          await fetchWeatherData();
        }
        setError('✅ 캐시가 삭제되고 데이터가 새로고침되었습니다.');
      } else {
        throw new Error('캐시 삭제 실패');
      }
    } catch (error) {
      console.error('캐시 삭제 및 새로고침 실패:', error);
      setError('캐시 삭제에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setCacheClearing(false);
    }
  };

  const refreshWeatherFromAPIHandler = async () => {
    if (!userLocation) {
      setError('사용자 위치가 설정되지 않았습니다.');
      return;
    }
    
    setApiRefreshing(true);
    setError(null);
    
    try {
      console.log('🔄 API에서 날씨 새로고침 시작');
      const result = await refreshWeatherFromAPI();
      
      if (result.success) {
        // API 새로고침 성공 후 사용자 날씨 데이터 조회
        await fetchUserWeatherData();
        setError(`✅ ${result.message || 'API에서 날씨 데이터가 성공적으로 새로고침되었습니다.'}`);
      } else {
        throw new Error(result.error || '알 수 없는 오류가 발생했습니다.');
      }
    } catch (error: any) {
      console.error('API 새로고침 실패:', error);
      
      const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
      if (errorMessage.includes('한도')) {
        setError('⏰ API 호출 한도가 초과되었습니다. 잠시 후 다시 시도해주세요.');
      } else {
        setError(`날씨 데이터 새로고침에 실패했습니다: ${errorMessage}`);
      }
    } finally {
      setApiRefreshing(false);
    }
  };

  const refreshLocation = async () => {
    if (!navigator.geolocation) {
      setError('브라우저에서 위치 서비스를 지원하지 않습니다.');
      return;
    }

    setLocationRefreshing(true);
    setError(null);

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          resolve, 
          reject, 
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
          }
        );
      });

      const { latitude, longitude, accuracy } = position.coords;
      
      // 기존 위치와 비교하여 큰 변화가 없으면 역지오코딩 생략
      let address = '';
      let cityName = '';
      let shouldGeocode = true;
      
      // 기존 위치 정보가 있고, 좌표 변화가 미미한 경우 (100m 이내) 역지오코딩 생략
      if (initialLocation?.latitude && initialLocation?.longitude) {
        const existingLat = parseFloat(initialLocation.latitude);
        const existingLng = parseFloat(initialLocation.longitude);
        const distance = Math.sqrt(
          Math.pow(latitude - existingLat, 2) + Math.pow(longitude - existingLng, 2)
        ) * 111000; // 대략적인 미터 변환
        
        if (distance < 100) { // 100m 이내면 기존 주소 정보 재사용
          address = initialLocation.address || '';
          cityName = initialLocation.cityName || '';
          shouldGeocode = false;
          console.log('위치 변화 미미함 - 기존 주소 정보 재사용:', address);
        }
      }
      
      // 필요한 경우에만 역지오코딩 수행
      if (shouldGeocode) {
        try {
          console.log('🌍 새로운 위치 감지 - Kakao 역지오코딩 API 호출');
          console.log('📍 호출할 좌표:', { latitude, longitude });
          
          const geocodeResponse = await fetch(`/api/kakao/geocode?lat=${latitude}&lng=${longitude}`);
          console.log('📡 Kakao API 응답 상태:', geocodeResponse.status);
          
          if (geocodeResponse.ok) {
            const geocodeData = await geocodeResponse.json();
            console.log('✅ Kakao API 응답 성공:', geocodeData);
            
            if (geocodeData.success && geocodeData.data) {
              address = geocodeData.data.address;
              cityName = geocodeData.data.city;
              console.log('🏠 주소 변환 완료:', { address, cityName });
            } else {
              console.warn('⚠️ Kakao API 응답에 데이터가 없음:', geocodeData);
            }
          } else {
            const errorText = await geocodeResponse.text();
            console.error('❌ Kakao API 응답 오류:', {
              status: geocodeResponse.status,
              statusText: geocodeResponse.statusText,
              body: errorText
            });
          }
        } catch (geocodeError) {
          console.error('❌ 역지오코딩 네트워크 오류:', geocodeError);
          // 실패 시 기존 주소 정보가 있다면 사용
          if (initialLocation?.address) {
            address = initialLocation.address;
            cityName = initialLocation.cityName || '';
            console.log('🔄 기존 주소 정보 사용:', { address, cityName });
          }
        }
      }
      
      // 서버에 위치 정보 저장
      try {
        const result = await setUserLocation({
          latitude: latitude.toString(),
          longitude: longitude.toString(),
          address: address || undefined,
          cityName: cityName || undefined,
          accuracy: accuracy ? Math.round(accuracy) : undefined,
          source: 'gps',
        });
        
        if (result.success) {
          setUserLocationState(result.data);
          const displayLocation = address || `위도: ${latitude.toFixed(4)}, 경도: ${longitude.toFixed(4)}`;
          setLocation(displayLocation);
          setError('✅ 위치가 성공적으로 업데이트되었습니다.');
          
          // 위치 업데이트 후 날씨 정보 조회
          setTimeout(() => {
            fetchUserWeatherData();
          }, 1000);
        }
      } catch (saveError) {
        console.error('위치 저장 실패:', saveError);
        setError('위치 정보를 저장하는데 실패했습니다.');
      }
      
    } catch (error: any) {
      console.error('위치 정보 가져오기 실패:', error);
      
      if (error.code === 1) {
        setError('위치 접근 권한이 거부되었습니다. 브라우저 설정을 확인해주세요.');
      } else if (error.code === 2) {
        setError('위치 정보를 사용할 수 없습니다.');
      } else if (error.code === 3) {
        setError('위치 정보 요청이 시간 초과되었습니다. 다시 시도해주세요.');
      } else {
        setError('위치 정보를 가져올 수 없습니다. 브라우저 설정을 확인해주세요.');
      }
    } finally {
      setLocationRefreshing(false);
    }
  };

  // 온도 범위 계산 (일별 날씨용)
  const { min: minTemp, max: maxTemp } = getTemperatureRange();

  return (
    <div className={className}>
      <div className="space-y-6">

        {/* 현재 설정된 위치 정보 표시 - Premium Glass Design */}
        {userLocation && (
          <div className="group relative">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-teal-500 rounded-2xl blur opacity-60 group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>
            <div className="relative backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-6 shadow-2xl hover:shadow-blue-500/25 transition-all duration-500 hover:scale-[1.02]">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-teal-500 rounded-xl flex items-center justify-center shadow-lg">
                  📍
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">현재 설정된 위치</h3>
                  <p className="text-blue-200 text-sm font-medium">Smart Location Service</p>
                </div>
              </div>
              
              <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
                <div className="space-y-3 flex-1">
                  <div className="bg-gradient-to-r from-blue-500/20 to-teal-500/20 backdrop-blur-sm border border-blue-300/30 rounded-xl p-4">
                    <p className="text-white font-semibold flex items-center gap-2">
                      <span className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></span>
                      📍 {userLocation.address || '주소 정보 없음'}
                    </p>
                    {userLocation.cityName && (
                      <p className="text-blue-300/80 text-sm mt-1">
                        🏙️ 날씨 조회 지역: {userLocation.cityName}
                      </p>
                    )}
                    <p className="text-blue-300/60 text-xs mt-1">
                      🗺️ 좌표: {parseFloat(userLocation.latitude).toFixed(4)}, {parseFloat(userLocation.longitude).toFixed(4)}
                    </p>
                  </div>
                </div>
                
                <button
                  onClick={refreshLocation}
                  disabled={locationRefreshing || loading}
                  className={`font-bold py-3 px-6 rounded-xl transition-all duration-300 transform ${
                    locationRefreshing || loading
                      ? 'bg-gradient-to-r from-gray-500 to-gray-600 text-white cursor-not-allowed animate-pulse'
                      : 'bg-gradient-to-r from-blue-500 to-teal-600 text-white hover:from-blue-600 hover:to-teal-700 hover:scale-[1.02] shadow-xl hover:shadow-blue-500/50 active:scale-[0.98]'
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
                      날씨 조회 중...
                    </>
                  ) : (
                    <>
                      <span>🔄</span>
                      위치 새로고침
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}


        {/* 검색 및 설정 - Premium Glass Design */}
        <div className="group relative">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-orange-400 via-red-400 to-pink-500 rounded-2xl blur opacity-60 group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>
          <div className="relative backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-6 shadow-2xl hover:shadow-orange-500/25 transition-all duration-500 hover:scale-[1.02]">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl flex items-center justify-center shadow-lg">
                🔍
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">날씨 조회 및 설정</h3>
                <p className="text-orange-200 text-sm font-medium">Smart Weather Control Center</p>
              </div>
            </div>
            
            <div className="space-y-6">
              {/* 검색 입력 및 단위 설정 */}
              <div className="flex gap-3">
                <div className="flex-1 relative">
                  <input
                    placeholder="도시명을 입력하세요"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        fetchWeatherData();
                      }
                    }}
                    className="w-full bg-gradient-to-r from-white/10 to-white/5 backdrop-blur-sm border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-orange-400/50 focus:border-orange-400/50 transition-all duration-300"
                  />
                </div>
                <button
                  onClick={() => setUnits(units === 'metric' ? 'imperial' : 'metric')}
                  className="bg-gradient-to-r from-orange-500/20 to-red-500/20 backdrop-blur-sm border border-orange-300/30 rounded-xl px-6 py-3 text-white font-bold hover:from-orange-500/30 hover:to-red-500/30 transition-all duration-300 transform hover:scale-105"
                >
                  {units === 'metric' ? '°C' : '°F'}
                </button>
              </div>
              
              {/* 액션 버튼들 - Enhanced Interactive Design */}
              <div className="flex flex-wrap gap-3">
                <button 
                  onClick={() => userLocation ? fetchUserWeatherData() : fetchWeatherData()} 
                  disabled={loading || cacheClearing || apiRefreshing || (!userLocation && !location.trim())}
                  className={`font-bold py-3 px-6 rounded-xl transition-all duration-300 transform flex items-center gap-2 ${
                    loading || cacheClearing || apiRefreshing || (!userLocation && !location.trim())
                      ? 'bg-gradient-to-r from-gray-500 to-gray-600 text-white cursor-not-allowed animate-pulse'
                      : 'bg-gradient-to-r from-orange-500 to-red-600 text-white hover:from-orange-600 hover:to-red-700 hover:scale-[1.02] shadow-xl hover:shadow-orange-500/50 active:scale-[0.98]'
                  }`}
                >
                  {loading ? (
                    <>
                      <span className="animate-spin">⏳</span>
                      조회 중...
                    </>
                  ) : (
                    <>
                      <span>🔄</span>
                      {userLocation ? '내 위치 날씨 새로고침' : '새로 고침'}
                    </>
                  )}
                </button>
                
                {userLocation && (
                  <button 
                    onClick={clearCacheAndRefresh}
                    disabled={loading || cacheClearing || apiRefreshing || (!userLocation && !location.trim())}
                    className={`font-bold py-3 px-6 rounded-xl transition-all duration-300 transform flex items-center gap-2 ${
                      loading || cacheClearing || apiRefreshing || (!userLocation && !location.trim())
                        ? 'bg-gradient-to-r from-gray-500 to-gray-600 text-white cursor-not-allowed animate-pulse'
                        : 'bg-gradient-to-r from-red-500 to-pink-600 text-white hover:from-red-600 hover:to-pink-700 hover:scale-[1.02] shadow-xl hover:shadow-red-500/50 active:scale-[0.98]'
                    }`}
                  >
                    {cacheClearing ? (
                      <>
                        <span className="animate-spin">🗑️</span>
                        캐시 삭제 중...
                      </>
                    ) : (
                      <>
                        <span>🗑️</span>
                        캐시 삭제 & 새로고침
                      </>
                    )}
                  </button>
                )}
                  
                {userLocation && (
                  <button 
                    onClick={refreshWeatherFromAPIHandler}
                    disabled={loading || cacheClearing || apiRefreshing}
                    className={`font-bold py-3 px-6 rounded-xl transition-all duration-300 transform flex items-center gap-2 ${
                      loading || cacheClearing || apiRefreshing
                        ? 'bg-gradient-to-r from-gray-500 to-gray-600 text-white cursor-not-allowed animate-pulse'
                        : 'bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:from-blue-600 hover:to-purple-600 hover:scale-[1.02] shadow-xl hover:shadow-blue-500/50 active:scale-[0.98]'
                    }`}
                  >
                    {apiRefreshing ? (
                      <>
                        <span className="animate-spin">⚡</span>
                        API 호출 중...
                      </>
                    ) : (
                      <>
                        <span>⚡</span>
                        날씨 새로고침 (디버그)
                      </>
                    )}
                  </button>
                )}
              </div>

              {/* Enhanced Error Display */}
              {error && (
                <div className={`relative p-4 rounded-xl border backdrop-blur-sm ${
                  error.includes('✅') ? 
                    'bg-gradient-to-r from-green-500/20 to-emerald-500/20 border-green-300/30' : 
                  error.includes('제한') || error.includes('한도') || error.includes('⏰') ? 
                    'bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border-yellow-300/30' : 
                    'bg-gradient-to-r from-red-500/20 to-pink-500/20 border-red-300/30'
                }`}>
                  <div className={`text-sm font-medium ${
                    error.includes('✅') ? 'text-green-200' :
                    error.includes('제한') || error.includes('한도') || error.includes('⏰') ? 'text-yellow-200' :
                    'text-red-200'
                  }`}>
                    {error}
                    
                    {error.includes('제한') && (
                      <div className="mt-3 p-3 bg-white/10 rounded-lg border border-white/20">
                        <div className="text-xs text-white/80">
                          💡 무료 API는 5일 예보만 지원됩니다. 더 긴 기간의 예보는 유료 플랜이 필요합니다.
                        </div>
                      </div>
                    )}
                    
                    {(error.includes('한도') || error.includes('API 호출 한도가 초과')) && (
                      <div className="mt-3 p-3 bg-white/10 rounded-lg border border-white/20">
                        <div className="text-xs text-white/80 space-y-1">
                          <div>⏰ 잠시 후 다시 시도해주세요. 무료 API는 일일 호출 한도가 있습니다.</div>
                          <div>💡 위치는 업데이트되었으니 나중에 날씨 새로고침 버튼을 이용해 주세요.</div>
                        </div>
                      </div>
                    )}
                    
                    {error.includes('위치 접근 권한') && (
                      <div className="mt-3 p-3 bg-white/10 rounded-lg border border-white/20">
                        <div className="text-xs text-white/80">
                          💡 브라우저 주소창 옆의 위치 아이콘을 클릭하여 위치 권한을 허용해 주세요.
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 시간별 날씨 - Premium Glass Design */}
        {hourlyData.length > 0 && (
          <div className="group relative">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-green-400 via-emerald-400 to-green-600 rounded-2xl blur opacity-60 group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>
            <div className="relative backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-6 shadow-2xl hover:shadow-emerald-500/25 transition-all duration-500 hover:scale-[1.02]">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center shadow-lg">
                  ⏰
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">{location} - 시간별 날씨</h3>
                  <p className="text-emerald-200 text-sm font-medium">24시간 시간별 예보</p>
                </div>
              </div>
              <div className="min-h-[300px]">
                {/* 시간별 날씨를 한 행으로 표시하고 가로 스크롤 지원 */}
                <div className="overflow-x-auto pb-4 h-[250px]">
                  <div className="flex gap-2 min-w-max h-full"
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
                        className="backdrop-blur-sm border border-emerald-300/30 rounded-xl p-2.5 hover:shadow-lg hover:shadow-emerald-400/25 transition-all duration-300 hover:scale-105 flex flex-col flex-shrink-0 h-[220px] hover:border-emerald-400/50"
                        style={{ 
                          userSelect: 'none',
                          width: '60px',
                          backgroundColor: 'rgba(107, 114, 128, 0.4)'
                        }}
                      >
                        {/* 시간 표시 */}
                        <div className="text-center border-b border-emerald-300/30 mb-2 pb-1.5">
                          <div className="font-bold text-white text-xs">
                            {weather.forecastHour}시
                          </div>
                        </div>
                        
                        {/* 날씨 아이콘 */}
                        <div className="text-center mb-2">
                          <div className="text-2xl mb-1">
                            {getWeatherIcon(weather.weatherIcon, weather.conditions)}
                          </div>
                        </div>
                        
                        {/* 온도 */}
                        <div className="text-center mb-2">
                          <div className="font-bold text-base text-white">
                            {weather.temperature}{getTemperatureUnit()}
                          </div>
                        </div>
                        
                        {/* 강수 정보 */}
                        <div className="text-center space-y-1 mt-auto">
                          <div className="text-xs font-bold text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                            <div>💧</div>
                            <div>{typeof weather.precipitation === 'number' ? weather.precipitation.toFixed(1) : '0.0'}mm</div>
                          </div>
                          <div className="text-xs font-bold text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                            <div>☔</div>
                            <div>{weather.precipitationProbability || 0}%</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 일별 날씨 - Premium Glass Design */}
        {dailyData.length > 0 && (
          <div className="group relative">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-pink-400 via-rose-400 to-pink-600 rounded-2xl blur opacity-60 group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>
            <div className="relative backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-6 shadow-2xl hover:shadow-pink-500/25 transition-all duration-500 hover:scale-[1.02]">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-gradient-to-br from-pink-500 to-rose-500 rounded-xl flex items-center justify-center shadow-lg">
                  📅
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">{location} - 일별 날씨 ({dailyData.length}일간)</h3>
                  <p className="text-pink-200 text-sm font-medium">
                    {dailyData.length > 7 ? '장기 예보입니다. 날짜가 멀수록 정확도가 낮아질 수 있습니다.' : 'AccuWeather 제공 일별 예보'}
                  </p>
                  <div className="mt-1 text-xs text-white/70">
                    온도 범위: {minTemp}{getTemperatureUnit()} ~ {maxTemp}{getTemperatureUnit()}
                  </div>
                </div>
              </div>
              
              {/* AccuWeather 헤드라인 표시 - Enhanced */}
              {weatherHeadline && weatherHeadline.text && (
                <div className={`relative p-4 rounded-xl border backdrop-blur-sm mb-6 ${
                  weatherHeadline.severity >= 7 ? 'bg-gradient-to-r from-red-500/20 to-pink-500/20 border-red-300/30' :
                  weatherHeadline.severity >= 4 ? 'bg-gradient-to-r from-orange-500/20 to-yellow-500/20 border-orange-300/30' :
                  'bg-gradient-to-r from-blue-500/20 to-cyan-500/20 border-blue-300/30'
                }`}>
                  <div className="flex items-start gap-3">
                    <div className={`px-3 py-1 rounded-xl text-sm font-bold shadow-lg ${
                      weatherHeadline.severity >= 7 ? 'bg-gradient-to-r from-red-500 to-red-600 text-white' :
                      weatherHeadline.severity >= 4 ? 'bg-gradient-to-r from-orange-500 to-yellow-500 text-white' :
                      'bg-gradient-to-r from-blue-500 to-cyan-500 text-white'
                    }`}>
                      {weatherHeadline.category || '날씨 요약'}
                    </div>
                    <div className={`text-sm font-medium ${
                      weatherHeadline.severity >= 7 ? 'text-red-200' :
                      weatherHeadline.severity >= 4 ? 'text-orange-200' :
                      'text-blue-200'
                    }`}>
                      {weatherHeadline.text}
                    </div>
                  </div>
                </div>
              )}
              
              <div className="min-h-[650px]">
                {/* 일별 날씨를 한 행으로 표시하고 가로 스크롤 지원 */}
                <div className="overflow-x-auto pb-4 h-[600px]">
                  <div className="flex gap-2 min-w-max h-full"
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
                        className="backdrop-blur-sm border border-pink-300/30 rounded-xl p-3 hover:shadow-lg hover:shadow-pink-400/25 transition-all duration-300 hover:scale-105 flex flex-col flex-shrink-0 h-[570px] hover:border-pink-400/50"
                        style={{ 
                          userSelect: 'none',
                          width: '86px',
                          backgroundColor: 'rgba(107, 114, 128, 0.3)'
                        }}
                      >
                        {/* 헤더: 날짜와 요일 */}
                        <div className="text-center border-b border-pink-300/30 mb-2 pb-1.5">
                          <div className="font-bold text-white text-xs">
                            {(() => {
                              const date = new Date(weather.forecastDate);
                              const month = String(date.getMonth() + 1).padStart(2, '0');
                              const day = String(date.getDate()).padStart(2, '0');
                              return `${month}-${day}`;
                            })()}
                          </div>
                          <div className="text-[10px] text-white/70">
                            ({weather.dayOfWeek})
                          </div>
                        </div>
                        
                        {/* 낮 날씨 */}
                        {weather.dayWeather && (
                          <div className="text-center mb-3 bg-gradient-to-r from-amber-500/20 to-yellow-500/20 backdrop-blur-sm border border-amber-300/30 rounded-lg p-2">
                            <div className="text-[10px] text-amber-200 font-medium mb-1">낮</div>
                            <div className="text-2xl mb-1">
                              {getWeatherIcon(weather.dayWeather?.icon as number, weather.dayWeather?.conditions as string)}
                            </div>
                             <div className="text-xs font-bold text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                                <div>☔</div>
                                <div>{(weather.dayWeather?.precipitationProbability as number) || 0}%</div>
                             </div>
                          </div>
                        )}
                        
                        {/* 온도 막대그래프 */}
                        <div className="flex-1 flex flex-col justify-center items-center my-3">
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
                                <div className="font-bold text-sm text-white mb-2">
                                  {weather.highTemp}{getTemperatureUnit()}
                                </div>
                                
                                {/* 온도 막대그래프 컨테이너 */}
                                <div className="relative w-10 h-40 bg-white/20 backdrop-blur-sm rounded-lg border border-pink-300/30">
                                  {/* 그라디언트 온도 막대 */}
                                  <div 
                                    className="absolute w-8 left-1 bg-gradient-to-b from-pink-400 via-rose-500 to-pink-600 rounded transition-all duration-300 hover:shadow-lg shadow-pink-500/25 border border-pink-300/50"
                                    style={{
                                      height: `${barHeight}px`,
                                      top: `${topPosition}px`
                                    }}
                                  ></div>
                                </div>
                                
                                {/* 최저 온도 표시 (컨테이너 아래쪽 고정) */}
                                <div className="font-bold text-sm text-white mt-2">
                                  {weather.lowTemp}{getTemperatureUnit()}
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                        
                         {/* 밤 날씨 */}
                         {weather.nightWeather && (
                           <div className="text-center bg-gradient-to-r from-indigo-500/20 to-purple-500/20 backdrop-blur-sm border border-indigo-300/30 rounded-lg p-2">
                             <div className="text-[10px] text-indigo-200 font-medium mb-1">밤</div>
                             <div className="text-2xl mb-1">
                               {getWeatherIcon(weather.nightWeather?.icon as number, weather.nightWeather?.conditions as string)}
                             </div>
                             <div className="text-xs font-bold text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                               <div>☔</div>
                               <div>{(weather.nightWeather?.precipitationProbability as number) || 0}%</div>
                             </div>
                           </div>
                         )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {loading && (
          <div className="text-center py-8">
            <div className="text-muted-foreground">날씨 정보를 불러오는 중...</div>
          </div>
        )}
      </div>
    </div>
  );
}