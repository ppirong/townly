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

interface WeatherApiStats {
  today: {
    date: string;
    totalCalls: number;
    successfulCalls: number;
    failedCalls: number;
    successRate: number;
    avgResponseTime: number;
    hourlyUsage: Array<{ hour: number; calls: number }>;
    endpointUsage: Record<string, { calls: number; avgResponseTime: number }>;
  };
  limit: {
    current: number;
    limit: number;
    remaining: number;
    percentage: number;
    canMakeRequest: boolean;
    status: 'ok' | 'warning' | 'critical';
  };
  recent: {
    days: number;
    stats: Array<{
      date: string;
      totalCalls: number;
      successRate: number;
      avgResponseTime: number;
    }>;
    totalCalls: number;
    averageDaily: number;
  };
  recommendations: {
    shouldOptimizeCache: boolean;
    shouldUpgradePlan: boolean;
    peakHours: number[];
  };
}

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
  const [apiStats, setApiStats] = useState<WeatherApiStats | null>(null);
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
        setHourlyData(weatherResult.hourlyWeather);
        
        // 일별 데이터를 올바른 형식으로 변환
        if (weatherResult.dailyWeather.dailyForecasts) {
          setDailyData(weatherResult.dailyWeather.dailyForecasts);
          setWeatherHeadline(weatherResult.dailyWeather.headline || null);
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
      // API 통계는 별도로 조회
      await fetchApiStats();
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
      fetchDailyWeather(5, targetLocation),
      fetchApiStats()
    ]);
  };

  const fetchApiStats = async () => {
    try {
      const response = await fetch('/api/weather/stats');
      const result = await response.json();
      
      if (result.success) {
        setApiStats(result.data);
      } else {
        console.error('API 통계 조회 실패:', result.error);
      }
    } catch (error) {
      console.error('API 통계 조회 실패:', error);
    }
  };


  const fetchHourlyWeather = async (targetLocation?: string) => {
    const locationToUse = targetLocation || location;
    if (!locationToUse.trim() && !userLocation) return;
    
    setLoading(true);
    setError(null);
    
    try {
      let url = '/api/weather/hourly';
      const params = new URLSearchParams();
      
      // 사용자 위치 정보가 있으면 위도/경도를 우선 사용
      if (userLocation?.latitude && userLocation?.longitude) {
        console.log('🌍 시간별 날씨 조회 - 위도/경도 사용:', userLocation.latitude, userLocation.longitude);
        params.append('latitude', userLocation.latitude);
        params.append('longitude', userLocation.longitude);
        // 사용자별 날씨 데이터로 저장하기 위해 사용자 ID 포함
        params.append('includeUserId', 'true');
      } else if (locationToUse) {
        console.log('🌍 시간별 날씨 조회 - 도시명 사용:', locationToUse);
        params.append('location', locationToUse);
        // 일반 검색도 사용자가 조회한 경우 사용자 ID 포함
        params.append('includeUserId', 'true');
      }
      
      params.append('units', units);
      url += '?' + params.toString();
      
      const response = await fetch(url);
      const result = await response.json();
      
      if (result.success) {
        setHourlyData(result.data);
      } else {
        const errorMessage = result.error || '시간별 날씨 조회에 실패했습니다';
        if (errorMessage.includes('429') || errorMessage.includes('Too Many Requests') || errorMessage.includes('한도')) {
          setError('⏰ API 호출 한도가 초과되었습니다. 잠시 후 다시 시도해주세요.');
        } else {
          setError(errorMessage);
        }
      }
    } catch (error) {
      console.error('시간별 날씨 조회 실패:', error);
      const errorStr = error instanceof Error ? error.message : '시간별 날씨 정보를 가져오는데 실패했습니다';
      if (errorStr.includes('429') || errorStr.includes('Too Many Requests') || errorStr.includes('한도')) {
        setError('⏰ API 호출 한도가 초과되었습니다. 잠시 후 다시 시도해주세요.');
      } else {
        setError('시간별 날씨 정보를 가져오는데 실패했습니다');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchDailyWeather = async (days: 1 | 5 | 10 | 15 = 5, targetLocation?: string) => {
    const locationToUse = targetLocation || location;
    if (!locationToUse.trim() && !userLocation) return;
    
    setLoading(true);
    setError(null);
    
    try {
      let url = '/api/weather/daily';
      const params = new URLSearchParams();
      
      // 사용자 위치 정보가 있으면 위도/경도를 우선 사용
      if (userLocation?.latitude && userLocation?.longitude) {
        console.log('🌍 일별 날씨 조회 - 위도/경도 사용:', userLocation.latitude, userLocation.longitude);
        params.append('latitude', userLocation.latitude);
        params.append('longitude', userLocation.longitude);
        // 사용자별 날씨 데이터로 저장하기 위해 사용자 ID 포함
        params.append('includeUserId', 'true');
      } else if (locationToUse) {
        console.log('🌍 일별 날씨 조회 - 도시명 사용:', locationToUse);
        params.append('location', locationToUse);
        // 일반 검색도 사용자가 조회한 경우 사용자 ID 포함
        params.append('includeUserId', 'true');
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
        const errorMessage = result.error || '일별 날씨 조회에 실패했습니다';
        if (errorMessage.includes('429') || errorMessage.includes('Too Many Requests') || errorMessage.includes('한도')) {
          setError('⏰ API 호출 한도가 초과되었습니다. 잠시 후 다시 시도해주세요.');
        } else {
          setError(errorMessage);
        }
      }
    } catch (error) {
      console.error('일별 날씨 조회 실패:', error);
      const errorStr = error instanceof Error ? error.message : '일별 날씨 정보를 가져오는데 실패했습니다';
      if (errorStr.includes('429') || errorStr.includes('Too Many Requests') || errorStr.includes('한도')) {
        setError('⏰ API 호출 한도가 초과되었습니다. 잠시 후 다시 시도해주세요.');
      } else {
        setError('일별 날씨 정보를 가져오는데 실패했습니다');
      }
    } finally {
      setLoading(false);
    }
  };

  const getTemperatureUnit = () => units === 'metric' ? '°C' : '°F';

  // 캐시 삭제 및 새로운 데이터 조회 함수
  const clearCacheAndRefresh = async () => {
    setCacheClearing(true);
    setError(null);

    try {
      console.log('🧹 캐시 삭제 및 새로운 데이터 조회 시작...');

      const requestBody: {
        mode: string;
        units: string;
        latitude?: string;
        longitude?: string;
        locationName?: string;
        location?: string;
      } = {
        mode: 'refresh_location', // 명시적으로 새로고침 모드 지정
        units: units,
      };

      // 사용자 위치 정보가 있으면 우선 사용 (문자열로 전달)
      if (userLocation?.latitude && userLocation?.longitude) {
        requestBody.latitude = userLocation.latitude; // 이미 문자열
        requestBody.longitude = userLocation.longitude; // 이미 문자열
      } else if (location && location.trim()) {
        requestBody.location = location;
      } else {
        throw new Error('위치 정보가 필요합니다. 위치를 설정하거나 GPS를 허용해주세요.');
      }

      const response = await fetch('/api/weather/cache-clear', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const result = await response.json();

      if (result.success) {
        // 새로운 데이터로 UI 업데이트
        setHourlyData(result.data.hourlyData);
        setDailyData(result.data.dailyData);
        setWeatherHeadline(result.data.headline || null);
        
        setError('✅ 캐시가 삭제되고 새로운 날씨 데이터가 저장되었습니다!');
        setTimeout(() => setError(null), 5000);
        
        console.log('✅ 캐시 삭제 및 데이터 갱신 완료');
        console.log('📊 캐시 통계:', result.data.cacheStats);
      } else {
        throw new Error(result.error || '캐시 삭제에 실패했습니다.');
      }
    } catch (error) {
      console.error('캐시 삭제 실패:', error);
      setError(error instanceof Error ? error.message : '캐시 삭제에 실패했습니다.');
    } finally {
      setCacheClearing(false);
      // API 통계 새로고침
      await fetchApiStats();
    }
  };

  // AccuWeather API 강제 호출 함수 (디버그용)
  const refreshWeatherFromAPIHandler = async () => {
    setApiRefreshing(true);
    setError(null);

    try {
      console.log('🔄 AccuWeather API 강제 호출 시작 (디버그)...');

      const result = await refreshWeatherFromAPI();

      if (result.success && result.data) {
        // 새로운 데이터로 UI 업데이트 - API 데이터는 이미 클라이언트 형식
        // refreshWeatherFromAPI는 API 서비스 타입을 반환하므로 DTO 매퍼 불필요
        const hourlyData = result.data.hourlyWeather.map(item => ({
          id: item.id || '',
          clerkUserId: item.clerkUserId || null,
          locationKey: item.locationKey || '',
          locationName: item.locationName || null,
          latitude: String(item.latitude || ''),
          longitude: String(item.longitude || ''),
          forecastDateTime: item.forecastDateTime || new Date().toISOString(),
          forecastDate: item.forecastDate || '',
          forecastHour: Number(item.forecastHour || 0),
          temperature: Number(item.temperature || 0),
          conditions: item.conditions || '',
          weatherIcon: Number(item.weatherIcon || 0),
          humidity: Number(item.humidity || 0),
          precipitation: Number(item.precipitation || 0),
          precipitationProbability: Number(item.precipitationProbability || 0),
          rainProbability: Number(item.rainProbability || 0),
          windSpeed: Number(item.windSpeed || 0),
          units: item.units || 'metric',
          cacheKey: item.cacheKey || null,
          expiresAt: item.expiresAt || new Date().toISOString(),
          createdAt: item.createdAt || new Date().toISOString(),
        }));
        
        const dailyData = result.data.dailyWeather.dailyForecasts.map(item => ({
          id: item.id || '',
          clerkUserId: item.clerkUserId || null,
          locationKey: item.locationKey || '',
          locationName: item.locationName || null,
          latitude: String(item.latitude || ''),
          longitude: String(item.longitude || ''),
          forecastDate: item.forecastDate || '',
          dayOfWeek: item.dayOfWeek || '',
          temperature: Number(item.temperature || 0),
          highTemp: Number(item.highTemp || 0),
          lowTemp: Number(item.lowTemp || 0),
          conditions: item.conditions || '',
          weatherIcon: Number(item.weatherIcon || 0),
          precipitationProbability: Number(item.precipitationProbability || 0),
          rainProbability: Number(item.rainProbability || 0),
          units: item.units || 'metric',
          dayWeather: item.dayWeather || null,
          nightWeather: item.nightWeather || null,
          headline: item.headline || null,
          forecastDays: Number(item.forecastDays || 0),
          rawData: item.rawData || null,
          cacheKey: item.cacheKey || '',
          expiresAt: item.expiresAt || new Date().toISOString(),
          createdAt: item.createdAt || new Date().toISOString(),
        }));
        
        setHourlyData(hourlyData);
        setDailyData(dailyData);
        setWeatherHeadline(result.data.dailyWeather.headline || null);
        
        setError(`✅ ${result.message}`);
        setTimeout(() => setError(null), 5000);
        
        console.log('✅ AccuWeather API 강제 호출 성공');
      } else {
        throw new Error(result.error || result.message);
      }
    } catch (error) {
      console.error('AccuWeather API 강제 호출 실패:', error);
      setError(error instanceof Error ? error.message : 'API 호출에 실패했습니다.');
    } finally {
      setApiRefreshing(false);
      // API 통계 새로고침
      await fetchApiStats();
    }
  };

  // 현재 위치 새로고침 함수
  const refreshLocation = async () => {
    // 쿨다운 체크 (30초)
    const now = Date.now();
    const cooldownTime = 30 * 1000; // 30초
    
    if (now - lastRefreshTime < cooldownTime) {
      const remainingTime = Math.ceil((cooldownTime - (now - lastRefreshTime)) / 1000);
      setError(`⏰ 위치 새로고침은 ${remainingTime}초 후에 다시 시도할 수 있습니다.`);
      setTimeout(() => setError(null), 3000);
      return;
    }

    setLocationRefreshing(true);
    setError(null);
    setLastRefreshTime(now);

    try {
      // Geolocation API 지원 확인
      if (!navigator.geolocation) {
        throw new Error('이 브라우저에서는 위치 서비스를 지원하지 않습니다.');
      }

      // 현재 위치 조회
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          resolve,
          reject,
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 60000 // 1분간 캐시된 위치 사용
          }
        );
      });

      const { latitude, longitude } = position.coords;

      // 카카오 Geocoding API를 통해 주소 변환
      const geocodeResponse = await fetch('/api/kakao/geocode', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ latitude, longitude }),
      });

      const geocodeResult = await geocodeResponse.json();
      
      let address = '';
      let cityName = '';

      if (geocodeResult.success && geocodeResult.data) {
        address = geocodeResult.data.address;
        cityName = geocodeResult.data.cityName;
      } else {
        // Geocoding 실패 시 좌표만 사용
        address = `위도: ${latitude.toFixed(4)}, 경도: ${longitude.toFixed(4)}`;
        cityName = '현재 위치';
      }

      // 위치 정보 업데이트
      try {
        const updateResult = await setUserLocation({
          latitude: latitude.toString(),
          longitude: longitude.toString(),
          address,
          cityName,
          source: 'gps' as const,
        });

        if (updateResult.success) {
          console.log('🔄 위치 새로고침 성공:', updateResult.data);
          setUserLocationState(updateResult.data);
          setLocation(cityName);
          
          // 성공 메시지 먼저 표시
          setError('✅ 위치가 성공적으로 업데이트되었습니다!');
          
          // 새로운 위치로 사용자별 날씨 조회 (실패해도 위치 업데이트는 성공으로 처리)
          try {
            await fetchUserWeatherData();
            // 날씨 조회도 성공하면 메시지 업데이트
            setError('✅ 위치 및 날씨 정보가 성공적으로 업데이트되었습니다!');
          } catch (weatherError) {
            console.warn('날씨 조회 실패, 하지만 위치는 업데이트됨:', weatherError);
            setError('✅ 위치가 업데이트되었습니다. 날씨 정보는 수동으로 새로고침해 주세요.');
          }
          
          setTimeout(() => setError(null), 5000);
        } else {
          throw new Error('위치 정보 저장에 실패했습니다.');
        }
      } catch (locationError) {
        throw new Error('위치 정보 저장에 실패했습니다.');
      }

    } catch (error) {
      console.error('위치 새로고침 실패:', error);
      
      if (error instanceof GeolocationPositionError) {
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setError('위치 접근 권한이 거부되었습니다. 브라우저 설정에서 위치 권한을 허용해 주세요.');
            break;
          case error.POSITION_UNAVAILABLE:
            setError('위치 정보를 사용할 수 없습니다.');
            break;
          case error.TIMEOUT:
            setError('위치 조회 시간이 초과되었습니다. 다시 시도해 주세요.');
            break;
          default:
            setError('위치 조회에 실패했습니다.');
        }
      } else {
        setError(error instanceof Error ? error.message : '위치 새로고침에 실패했습니다.');
      }
    } finally {
      setLocationRefreshing(false);
    }
  };

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
                      날씨 조회 지역: {userLocation.cityName}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    좌표: {parseFloat(userLocation.latitude).toFixed(4)}, {parseFloat(userLocation.longitude).toFixed(4)}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={refreshLocation}
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
                      날씨 조회 중...
                    </>
                  ) : (
                    <>
                      <span>🔄</span>
                      위치 새로고침
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* API 사용량 통계 */}
        {apiStats && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span>📊</span>
                AccuWeather API 사용량
              </CardTitle>
              <CardDescription>
                오늘의 API 호출 현황 및 한도 관리
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* 기본 통계 */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {apiStats.limit.current}
                    </div>
                    <div className="text-sm text-muted-foreground">오늘 사용</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {apiStats.limit.remaining}
                    </div>
                    <div className="text-sm text-muted-foreground">남은 횟수</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">
                      {apiStats.today.successRate}%
                    </div>
                    <div className="text-sm text-muted-foreground">성공률</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">
                      {apiStats.today.avgResponseTime}ms
                    </div>
                    <div className="text-sm text-muted-foreground">평균 응답</div>
                  </div>
                </div>

                {/* 사용량 진행바 */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>일일 한도 사용률</span>
                    <span className={`font-medium ${
                      apiStats.limit.status === 'critical' ? 'text-red-600' :
                      apiStats.limit.status === 'warning' ? 'text-yellow-600' :
                      'text-green-600'
                    }`}>
                      {apiStats.limit.percentage}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div 
                      className={`h-3 rounded-full transition-all duration-300 ${
                        apiStats.limit.status === 'critical' ? 'bg-red-500' :
                        apiStats.limit.status === 'warning' ? 'bg-yellow-500' :
                        'bg-green-500'
                      }`}
                      style={{ width: `${Math.min(apiStats.limit.percentage, 100)}%` }}
                    ></div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {apiStats.limit.current} / {apiStats.limit.limit} 호출 사용
                  </div>
                </div>

                {/* 상태 배지 및 권장사항 */}
                <div className="flex flex-wrap gap-2">
                  <Badge variant={
                    apiStats.limit.status === 'critical' ? 'destructive' :
                    apiStats.limit.status === 'warning' ? 'default' :
                    'secondary'
                  }>
                    {apiStats.limit.status === 'critical' ? '⚠️ 한도 임박' :
                     apiStats.limit.status === 'warning' ? '⚡ 주의 필요' :
                     '✅ 정상'}
                  </Badge>
                  
                  {apiStats.recommendations.shouldOptimizeCache && (
                    <Badge variant="outline">💾 캐시 최적화 권장</Badge>
                  )}
                  
                  {apiStats.recommendations.shouldUpgradePlan && (
                    <Badge variant="outline">⬆️ 플랜 업그레이드 권장</Badge>
                  )}
                </div>

                {/* 최근 7일 트렌드 (간단한 텍스트 요약) */}
                {apiStats.recent.stats.length > 0 && (
                  <div className="pt-3 border-t">
                    <div className="text-sm font-medium mb-2">최근 7일 평균</div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">일평균 호출: </span>
                        <span className="font-medium">{apiStats.recent.averageDaily}회</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">총 호출: </span>
                        <span className="font-medium">{apiStats.recent.totalCalls}회</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

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
                onClick={() => userLocation ? fetchUserWeatherData() : fetchWeatherData()} 
                disabled={loading || cacheClearing || apiRefreshing || (!userLocation && !location.trim())}
              >
                {loading ? '조회 중...' : userLocation ? '내 위치 날씨 새로고침' : '새로 고침'}
              </Button>
              {userLocation && (
                <Button 
                  variant="outline"
                  onClick={() => fetchWeatherData()} 
                  disabled={loading || cacheClearing || apiRefreshing || !location.trim()}
                >
                  {loading ? '조회 중...' : '일반 검색'}
                </Button>
              )}
              <Button 
                variant="outline"
                onClick={clearCacheAndRefresh}
                disabled={loading || cacheClearing || apiRefreshing || (!userLocation && !location.trim())}
                className="flex items-center gap-2"
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
              </Button>
              {userLocation && (
                <Button 
                  variant="secondary"
                  onClick={refreshWeatherFromAPIHandler}
                  disabled={loading || cacheClearing || apiRefreshing}
                  className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:from-blue-600 hover:to-purple-600"
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
                </Button>
              )}
            </div>

            {error && (
              <Alert variant={
                error.includes('✅') ? 'default' : 
                error.includes('제한') || error.includes('한도') || error.includes('⏰') ? 'default' : 
                'destructive'
              }>
                <AlertDescription>
                  {error}
                  {error.includes('제한') && (
                    <div className="mt-2 text-sm">
                      💡 무료 API는 5일 예보만 지원됩니다. 더 긴 기간의 예보는 유료 플랜이 필요합니다.
                    </div>
                  )}
                  {(error.includes('한도') || error.includes('API 호출 한도가 초과')) && (
                    <div className="mt-2 text-sm">
                      ⏰ 잠시 후 다시 시도해주세요. 무료 API는 일일 호출 한도가 있습니다.
                      <br />
                      💡 위치는 업데이트되었으니 나중에 날씨 새로고침 버튼을 이용해 주세요.
                    </div>
                  )}
                  {error.includes('위치 접근 권한') && (
                    <div className="mt-2 text-sm">
                      💡 브라우저 주소창 옆의 위치 아이콘을 클릭하여 위치 권한을 허용해 주세요.
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
                      className="bg-gradient-to-b from-sky-50 to-sky-100 dark:from-gray-800 dark:to-gray-900 border rounded-xl p-2.5 hover:shadow-lg transition-all duration-200 flex flex-col flex-shrink-0 w-[70px] h-[220px]"
                      style={{ userSelect: 'none' }}
                    >
                      {/* 시간 표시 */}
                      <div className="text-center border-b border-sky-200 dark:border-gray-700 mb-2 pb-1.5">
                        <div className="font-bold text-gray-800 dark:text-gray-200 text-xs">
                          {weather.hour}
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
                        <div className="font-bold text-base text-blue-600 dark:text-blue-400">
                          {weather.temperature}{getTemperatureUnit()}
                        </div>
                      </div>
                      
                        {/* 강수 정보 */}
                        <div className="text-center space-y-0.5 mt-auto">
                          <div className="text-[10px] text-blue-600 dark:text-blue-400">
                            💧 {typeof weather.precipitation === 'number' ? weather.precipitation.toFixed(1) : '0.0'}mm
                          </div>
                          <div className="text-[10px] text-green-600 dark:text-green-400">
                            ☔ {weather.precipitationProbability || 0}%
                          </div>
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
                    className="bg-gradient-to-b from-blue-50 to-blue-100 dark:from-gray-800 dark:to-gray-900 border rounded-xl p-3 hover:shadow-lg transition-all duration-200 flex flex-col flex-shrink-0 w-[120px] h-[570px]"
                    style={{ userSelect: 'none' }}
                  >
                    {/* 헤더: 날짜와 요일 */}
                    <div className="text-center border-b border-blue-200 dark:border-gray-700 mb-2 pb-1.5">
                      <div className="font-bold text-gray-800 dark:text-gray-200 text-xs">
                        {weather.date}
                      </div>
                      <div className="text-[10px] text-gray-600 dark:text-gray-400">
                        ({weather.dayOfWeek})
                      </div>
                    </div>
                    
                    {/* 낮 날씨 */}
                    {weather.dayWeather && (
                      <div className="text-center mb-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg p-2">
                        <div className="text-[10px] text-amber-700 dark:text-amber-300 font-medium mb-1">낮</div>
                        <div className="text-2xl mb-1">
                          {getWeatherIcon(weather.dayWeather.icon, weather.dayWeather.conditions)}
                        </div>
                         <div className="text-xs font-medium text-blue-600 dark:text-blue-400">
                           ☔ {weather.dayWeather.precipitationProbability || 0}%
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
                            <div className="font-bold text-sm text-red-600 dark:text-red-400 mb-2">
                              {weather.highTemp}{getTemperatureUnit()}
                            </div>
                            
                            {/* 온도 막대그래프 컨테이너 */}
                            <div className="relative w-10 h-40 bg-gray-100 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                              {/* 단일 색상 온도 막대 */}
                              <div 
                                className="absolute w-8 left-1 bg-gradient-to-b from-blue-500 to-blue-600 dark:from-blue-400 dark:to-blue-500 rounded transition-all duration-300 hover:shadow-lg border border-blue-300 dark:border-blue-400"
                                style={{
                                  height: `${barHeight}px`,
                                  top: `${topPosition}px`
                                }}
                              ></div>
                            </div>
                            
                            {/* 최저 온도 표시 (컨테이너 아래쪽 고정) */}
                            <div className="font-bold text-sm text-blue-600 dark:text-blue-400 mt-2">
                              {weather.lowTemp}{getTemperatureUnit()}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                    
                     {/* 밤 날씨 */}
                     {weather.nightWeather && (
                       <div className="text-center bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-2">
                         <div className="text-[10px] text-indigo-700 dark:text-indigo-300 font-medium mb-1">밤</div>
                         <div className="text-2xl mb-1">
                           {getWeatherIcon(weather.nightWeather.icon, weather.nightWeather.conditions)}
                         </div>
                         <div className="text-xs font-medium text-blue-600 dark:text-blue-400">
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


