'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { getLatestHourlyForecast, getUserHourlyForecast } from '@/actions/hourly-forecast';
import { type ProcessedHourlyForecast } from '@/lib/schemas/airquality';

interface HourlyForecastProps {
  userRegion?: string;
  className?: string;
}

// 예보등급 배지 컴포넌트
const ForecastGradeBadge = ({ 
  grade, 
  gradeInfo,
  pollutant 
}: { 
  grade: string; 
  gradeInfo: { label: string; color: string; description: string };
  pollutant: string;
}) => {
  return (
    <div className="text-center">
      <Badge className={`${gradeInfo.color} border-0 mb-2`}>
        {pollutant} {gradeInfo.label}
      </Badge>
      <div className="text-xs text-muted-foreground">
        {gradeInfo.description}
      </div>
    </div>
  );
};

// 예보 카드 컴포넌트
const ForecastCard = ({ forecast }: { forecast: ProcessedHourlyForecast }) => {
  const forecastDate = new Date(forecast.forecastDate);
  const isToday = forecastDate.toDateString() === new Date().toDateString();
  const isTomorrow = forecastDate.toDateString() === new Date(Date.now() + 24 * 60 * 60 * 1000).toDateString();
  
  let dateLabel = forecastDate.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', weekday: 'short' });
  if (isToday) dateLabel = '오늘';
  else if (isTomorrow) dateLabel = '내일';

  return (
    <div className="bg-gradient-to-b from-blue-50 to-blue-100 dark:from-gray-800 dark:to-gray-900 border rounded-xl p-4 hover:shadow-lg transition-all duration-200 flex flex-col flex-shrink-0 w-64 h-[300px]">
      {/* 날짜 및 오염물질 표시 */}
      <div className="text-center border-b border-blue-200 dark:border-gray-700 mb-3 pb-2">
        <div className="font-bold text-gray-800 dark:text-gray-200 text-lg">
          {dateLabel}
        </div>
        <div className="text-sm text-blue-600 dark:text-blue-400 font-medium">
          {forecast.informCode}
        </div>
        <div className="text-xs text-muted-foreground">
          {forecastDate.toLocaleDateString('ko-KR')}
        </div>
      </div>
      
      {/* 예보등급 */}
      <div className="flex-1 flex flex-col justify-center">
        <ForecastGradeBadge 
          grade={forecast.informGrade}
          gradeInfo={forecast.gradeInfo}
          pollutant={forecast.informCode}
        />
      </div>
      
      {/* 예보 상세 정보 */}
      <div className="mt-auto space-y-2">
        {forecast.informOverall && (
          <div className="text-xs text-gray-600 dark:text-gray-400 bg-white/50 dark:bg-gray-700/50 rounded p-2">
            <div className="font-medium mb-1">전망</div>
            <div>{forecast.informOverall}</div>
          </div>
        )}
        
        {forecast.informCause && (
          <div className="text-xs text-gray-600 dark:text-gray-400">
            <div className="font-medium mb-1">원인</div>
            <div>{forecast.informCause}</div>
          </div>
        )}
      </div>
    </div>
  );
};

export function HourlyForecast({ userRegion = '수도권', className }: HourlyForecastProps) {
  const [forecastData, setForecastData] = useState<{
    pm10Forecast: ProcessedHourlyForecast[];
    pm25Forecast: ProcessedHourlyForecast[];
  }>({ pm10Forecast: [], pm25Forecast: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 시간별 대기예보 조회
  const fetchForecastData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log(`시간별 대기예보 조회 시작: ${userRegion}`);
      const data = await getUserHourlyForecast(userRegion);
      
      console.log(`시간별 대기예보 조회 완료:`, data);
      setForecastData(data);
      
      if (data.pm10Forecast.length === 0 && data.pm25Forecast.length === 0) {
        setError(`${userRegion} 지역의 시간별 대기예보가 없습니다.`);
      }
    } catch (error) {
      console.error('시간별 대기예보 조회 실패:', error);
      setError('시간별 대기예보를 가져오는데 실패했습니다.');
      setForecastData({ pm10Forecast: [], pm25Forecast: [] });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchForecastData();
  }, [userRegion]);

  if (loading) {
    return (
      <div className={className}>
        <Card>
          <CardContent className="flex items-center justify-center py-8">
            <div className="text-muted-foreground">시간별 대기예보를 불러오는 중...</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className={className}>
        <Card>
          <CardContent>
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  const hasAnyData = forecastData.pm10Forecast.length > 0 || forecastData.pm25Forecast.length > 0;

  if (!hasAnyData) {
    return (
      <div className={className}>
        <Card>
          <CardContent className="flex items-center justify-center py-8">
            <div className="text-muted-foreground">시간별 대기예보가 없습니다.</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <CardTitle>
            {userRegion} 지역 - 시간별 대기예보
          </CardTitle>
          <CardDescription>
            오늘, 내일, 모레 미세먼지 예보등급 (좋음, 보통, 나쁨, 매우나쁨)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* PM10 예보 */}
          {forecastData.pm10Forecast.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-3 text-amber-700 dark:text-amber-300">
                미세먼지 (PM10) 예보
              </h3>
              <div className="overflow-x-auto pb-4">
                <div className="flex gap-3 min-w-max"
                     style={{ scrollBehavior: 'smooth' }}>
                  {forecastData.pm10Forecast.map((forecast, index) => (
                    <ForecastCard key={`pm10-${index}`} forecast={forecast} />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* PM2.5 예보 */}
          {forecastData.pm25Forecast.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-3 text-indigo-700 dark:text-indigo-300">
                초미세먼지 (PM2.5) 예보
              </h3>
              <div className="overflow-x-auto pb-4">
                <div className="flex gap-3 min-w-max"
                     style={{ scrollBehavior: 'smooth' }}>
                  {forecastData.pm25Forecast.map((forecast, index) => (
                    <ForecastCard key={`pm25-${index}`} forecast={forecast} />
                  ))}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
