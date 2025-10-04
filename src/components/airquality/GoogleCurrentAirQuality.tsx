'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { RefreshCw, MapPin, Clock, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { ProcessedAirQualityData } from '@/lib/services/google-air-quality';

interface GoogleCurrentAirQualityProps {
  latitude?: number;
  longitude?: number;
  autoRefresh?: boolean;
  refreshInterval?: number; // 분 단위
}

interface AirQualityResponse {
  success: boolean;
  data: ProcessedAirQualityData;
  timestamp: string;
  error?: string;
}

export function GoogleCurrentAirQuality({
  latitude = 37.5665, // 서울시청 기본값
  longitude = 126.9780,
  autoRefresh = false,
  refreshInterval = 30, // 30분
}: GoogleCurrentAirQualityProps) {
  const [airQualityData, setAirQualityData] = useState<ProcessedAirQualityData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // 대기질 지수에 따른 색상 및 상태 반환
  const getAirQualityStatus = (pm25?: number, pm10?: number) => {
    const pm25Level = pm25 || 0;
    const pm10Level = pm10 || 0;
    
    // WHO 기준 적용
    if (pm25Level <= 15 && pm10Level <= 45) {
      return { level: '좋음', color: 'bg-green-500', textColor: 'text-green-700', icon: CheckCircle };
    } else if (pm25Level <= 35 && pm10Level <= 80) {
      return { level: '보통', color: 'bg-yellow-500', textColor: 'text-yellow-700', icon: AlertTriangle };
    } else if (pm25Level <= 75 && pm10Level <= 150) {
      return { level: '나쁨', color: 'bg-orange-500', textColor: 'text-orange-700', icon: AlertTriangle };
    } else {
      return { level: '매우나쁨', color: 'bg-red-500', textColor: 'text-red-700', icon: XCircle };
    }
  };

  // 현재 대기질 데이터 조회
  const fetchCurrentAirQuality = async () => {
    setLoading(true);
    setError(null);

    try {
      console.log(`🌬️ 현재 대기질 조회 시작: ${latitude}, ${longitude}`);

      const response = await fetch('/api/google-air-quality/current', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          latitude,
          longitude,
        }),
      });

      const result: AirQualityResponse = await response.json();

      if (!response.ok) {
        throw new Error(result.error || '대기질 정보를 가져오는데 실패했습니다.');
      }

      if (result.success && result.data) {
        setAirQualityData(result.data);
        setLastUpdated(new Date(result.timestamp));
        console.log('✅ 현재 대기질 조회 완료');
      } else {
        throw new Error(result.error || '대기질 데이터가 없습니다.');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.';
      setError(errorMessage);
      console.error('현재 대기질 조회 오류:', err);
    } finally {
      setLoading(false);
    }
  };

  // 컴포넌트 마운트 시 데이터 조회
  useEffect(() => {
    fetchCurrentAirQuality();
  }, [latitude, longitude]);

  // 자동 새로고침 설정
  useEffect(() => {
    if (!autoRefresh) return;

    const intervalId = setInterval(() => {
      fetchCurrentAirQuality();
    }, refreshInterval * 60 * 1000); // 분을 밀리초로 변환

    return () => clearInterval(intervalId);
  }, [autoRefresh, refreshInterval, latitude, longitude]);

  // 수동 새로고침
  const handleRefresh = () => {
    fetchCurrentAirQuality();
  };

  // 시간 포맷팅
  const formatTime = (date: Date) => {
    return date.toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const airQualityStatus = airQualityData 
    ? getAirQualityStatus(airQualityData.pm25, airQualityData.pm10)
    : null;

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <MapPin className="h-5 w-5 text-muted-foreground" />
            <CardTitle>현재 대기질 상태</CardTitle>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            새로고침
          </Button>
        </div>
        <CardDescription>
          Google Air Quality API 기반 실시간 대기질 정보
          <br />
          위치: {latitude.toFixed(4)}, {longitude.toFixed(4)}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <XCircle className="h-5 w-5 text-red-500" />
              <p className="text-red-700 font-medium">오류 발생</p>
            </div>
            <p className="text-red-600 mt-1">{error}</p>
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground mr-2" />
            <p className="text-muted-foreground">대기질 정보를 가져오는 중...</p>
          </div>
        )}

        {airQualityData && airQualityStatus && !loading && (
          <>
            {/* 전체 대기질 상태 */}
            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center space-x-3">
                <airQualityStatus.icon className={`h-6 w-6 ${airQualityStatus.textColor}`} />
                <div>
                  <p className="font-semibold text-lg">대기질 {airQualityStatus.level}</p>
                  <p className="text-sm text-muted-foreground">
                    PM2.5: {airQualityData.pm25 || 'N/A'}㎍/㎥ | PM10: {airQualityData.pm10 || 'N/A'}㎍/㎥
                  </p>
                </div>
              </div>
              <Badge className={`${airQualityStatus.color} text-white`}>
                {airQualityStatus.level}
              </Badge>
            </div>

            <Separator />

            {/* 상세 오염물질 정보 */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {airQualityData.pm25 !== undefined && (
                <div className="text-center p-3 bg-muted/30 rounded-lg">
                  <p className="text-sm text-muted-foreground">PM2.5</p>
                  <p className="text-2xl font-bold">{airQualityData.pm25}</p>
                  <p className="text-xs text-muted-foreground">㎍/㎥</p>
                </div>
              )}

              {airQualityData.pm10 !== undefined && (
                <div className="text-center p-3 bg-muted/30 rounded-lg">
                  <p className="text-sm text-muted-foreground">PM10</p>
                  <p className="text-2xl font-bold">{airQualityData.pm10}</p>
                  <p className="text-xs text-muted-foreground">㎍/㎥</p>
                </div>
              )}

              {airQualityData.caiKr !== undefined && (
                <div className="text-center p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-600 font-semibold">CAI (한국)</p>
                  <p className="text-2xl font-bold text-blue-700">{airQualityData.caiKr}</p>
                  <p className="text-xs text-blue-600">대기질지수</p>
                </div>
              )}

              {airQualityData.breezoMeterAqi !== undefined && (
                <div className="text-center p-3 bg-purple-50 border border-purple-200 rounded-lg">
                  <p className="text-sm text-purple-600 font-semibold">BreezoMeter AQI</p>
                  <p className="text-2xl font-bold text-purple-700">{airQualityData.breezoMeterAqi}</p>
                  <p className="text-xs text-purple-600">종합지수</p>
                </div>
              )}

              {airQualityData.no2 && (
                <div className="text-center p-3 bg-muted/30 rounded-lg">
                  <p className="text-sm text-muted-foreground">NO₂</p>
                  <p className="text-2xl font-bold">{airQualityData.no2}</p>
                  <p className="text-xs text-muted-foreground">ppb</p>
                </div>
              )}

              {airQualityData.o3 && (
                <div className="text-center p-3 bg-muted/30 rounded-lg">
                  <p className="text-sm text-muted-foreground">O₃</p>
                  <p className="text-2xl font-bold">{airQualityData.o3}</p>
                  <p className="text-xs text-muted-foreground">ppb</p>
                </div>
              )}

              {airQualityData.so2 && (
                <div className="text-center p-3 bg-muted/30 rounded-lg">
                  <p className="text-sm text-muted-foreground">SO₂</p>
                  <p className="text-2xl font-bold">{airQualityData.so2}</p>
                  <p className="text-xs text-muted-foreground">ppb</p>
                </div>
              )}

              {airQualityData.co && (
                <div className="text-center p-3 bg-muted/30 rounded-lg">
                  <p className="text-sm text-muted-foreground">CO</p>
                  <p className="text-2xl font-bold">{airQualityData.co}</p>
                  <p className="text-xs text-muted-foreground">mg/㎥</p>
                </div>
              )}
            </div>

            {/* 건강 권고사항 */}
            {airQualityData.healthRecommendations && (
              <>
                <Separator />
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">건강 권고사항</h4>
                  {airQualityData.healthRecommendations.general && (
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-sm text-blue-800">
                        <strong>일반인:</strong> {airQualityData.healthRecommendations.general}
                      </p>
                    </div>
                  )}
                  {airQualityData.healthRecommendations.sensitive && (
                    <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                      <p className="text-sm text-orange-800">
                        <strong>민감군:</strong> {airQualityData.healthRecommendations.sensitive}
                      </p>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* 업데이트 시간 */}
            {lastUpdated && (
              <>
                <Separator />
                <div className="flex items-center justify-center space-x-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>마지막 업데이트: {formatTime(lastUpdated)}</span>
                </div>
              </>
            )}
          </>
        )}

        {/* 자동 새로고침 정보 */}
        {autoRefresh && (
          <div className="text-center text-xs text-muted-foreground">
            {refreshInterval}분마다 자동으로 업데이트됩니다.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
