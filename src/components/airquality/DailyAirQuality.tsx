'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { getDailyAirQualityByStation } from '@/actions/regional-airquality';
import { airQualityGrade } from '@/lib/schemas/airquality';

interface DailyAirQualityProps {
  stationName: string;
  regionName?: string;
  className?: string;
}

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

// 대기질 등급 표시 컴포넌트
const AirQualityBadge = ({ grade, type }: { grade: keyof typeof airQualityGrade; type: 'PM10' | 'PM2.5' }) => {
  const gradeInfo = airQualityGrade[grade];
  return (
    <Badge className={`${gradeInfo.color} border-0`}>
      {type} {gradeInfo.label}
    </Badge>
  );
};

export function DailyAirQuality({ stationName, regionName, className }: DailyAirQualityProps) {
  const [dailyData, setDailyData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 지역별 일별 대기정보 조회
  const fetchDailyData = async () => {
    if (!stationName) return;
    
    setLoading(true);
    setError(null);
    
    try {
      console.log(`일별 대기정보 조회 시작: ${stationName}`);
      const today = new Date().toISOString().split('T')[0];
      const response = await getDailyAirQualityByStation(stationName, today, 7);
      
      console.log(`일별 대기정보 조회 완료:`, response);
      setDailyData(response.data || []);
      
      if (!response.data || response.data.length === 0) {
        setError(`${stationName} 측정소 지역의 일별 대기정보가 없습니다.`);
      }
    } catch (error) {
      console.error('일별 대기정보 조회 실패:', error);
      setError('일별 대기정보를 가져오는데 실패했습니다.');
      setDailyData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (stationName) {
      fetchDailyData();
    }
  }, [stationName]);

  if (loading) {
    return (
      <div className={className}>
        <Card>
          <CardContent className="flex items-center justify-center py-8">
            <div className="text-muted-foreground">일별 대기정보를 불러오는 중...</div>
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

  if (!dailyData.length) {
    return (
      <div className={className}>
        <Card>
          <CardContent className="flex items-center justify-center py-8">
            <div className="text-muted-foreground">일별 대기정보가 없습니다.</div>
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
            {regionName || stationName} 지역 - 일별 대기정보
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
              {dailyData.slice(0, 7).map((data, index) => {
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
                      {data.pm10Value ? (
                        <>
                          <ConcentrationDisplay 
                            value={typeof data.pm10Value === 'string' ? parseFloat(data.pm10Value) : data.pm10Value} 
                            grade={data.pm10Grade || '2'} 
                          />
                          {data.pm10Grade && (
                            <div className="mt-2">
                              <AirQualityBadge grade={data.pm10Grade as keyof typeof airQualityGrade} type="PM10" />
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="text-xs text-gray-500">데이터 없음</div>
                      )}
                      {(data.pm10Avg || data.pm10Max || data.pm10Min) && (
                        <div className="text-xs text-gray-600 mt-2 space-y-1">
                          {data.pm10Avg && <div>평균: {data.pm10Avg}μg/m³</div>}
                          {data.pm10Max && <div>최고: {data.pm10Max}μg/m³</div>}
                          {data.pm10Min && <div>최저: {data.pm10Min}μg/m³</div>}
                        </div>
                      )}
                    </div>
                    
                    {/* PM2.5 정보 */}
                    <div className="text-center bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-3">
                      <div className="text-xs text-indigo-700 dark:text-indigo-300 font-medium mb-2">PM2.5</div>
                      {data.pm25Value ? (
                        <>
                          <ConcentrationDisplay 
                            value={typeof data.pm25Value === 'string' ? parseFloat(data.pm25Value) : data.pm25Value} 
                            grade={data.pm25Grade || '2'} 
                          />
                          {data.pm25Grade && (
                            <div className="mt-2">
                              <AirQualityBadge grade={data.pm25Grade as keyof typeof airQualityGrade} type="PM2.5" />
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="text-xs text-gray-500">데이터 없음</div>
                      )}
                      {(data.pm25Avg || data.pm25Max || data.pm25Min) && (
                        <div className="text-xs text-gray-600 mt-2 space-y-1">
                          {data.pm25Avg && <div>평균: {data.pm25Avg}μg/m³</div>}
                          {data.pm25Max && <div>최고: {data.pm25Max}μg/m³</div>}
                          {data.pm25Min && <div>최저: {data.pm25Min}μg/m³</div>}
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
    </div>
  );
}
