'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { getHourlyAirQualityByStation } from '@/actions/regional-airquality';
import { airQualityGrade } from '@/lib/schemas/airquality';

interface HourlyAirQualityProps {
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

export function HourlyAirQuality({ stationName, regionName, className }: HourlyAirQualityProps) {
  const [hourlyData, setHourlyData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 지역별 시간별 대기정보 조회
  const fetchHourlyData = async () => {
    if (!stationName) return;
    
    setLoading(true);
    setError(null);
    
    try {
      console.log(`시간별 대기정보 조회 시작: ${stationName}`);
      const today = new Date().toISOString().split('T')[0];
      const response = await getHourlyAirQualityByStation(stationName, today, 24);
      
      console.log(`시간별 대기정보 조회 완료:`, response);
      setHourlyData(response.data || []);
      
      if (!response.data || response.data.length === 0) {
        setError(`${stationName} 측정소 지역의 시간별 대기정보가 없습니다.`);
      }
    } catch (error) {
      console.error('시간별 대기정보 조회 실패:', error);
      setError('시간별 대기정보를 가져오는데 실패했습니다.');
      setHourlyData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (stationName) {
      fetchHourlyData();
    }
  }, [stationName]);

  if (loading) {
    return (
      <div className={className}>
        <Card>
          <CardContent className="flex items-center justify-center py-8">
            <div className="text-muted-foreground">시간별 대기정보를 불러오는 중...</div>
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

  if (!hourlyData.length) {
    return (
      <div className={className}>
        <Card>
          <CardContent className="flex items-center justify-center py-8">
            <div className="text-muted-foreground">시간별 대기정보가 없습니다.</div>
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
            {regionName || stationName} 지역 - 시간별 대기정보
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
              {hourlyData.slice(0, 24).map((data, index) => {
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
                      {data.pm10Value ? (
                        <ConcentrationDisplay 
                          value={typeof data.pm10Value === 'string' ? parseFloat(data.pm10Value) : data.pm10Value} 
                          grade={data.pm10Grade || '2'} 
                        />
                      ) : (
                        <div className="text-xs text-gray-500">데이터 없음</div>
                      )}
                    </div>
                    
                    {/* PM2.5 농도 */}
                    <div className="text-center mb-3">
                      <div className="text-xs text-muted-foreground mb-1">PM2.5</div>
                      {data.pm25Value ? (
                        <ConcentrationDisplay 
                          value={typeof data.pm25Value === 'string' ? parseFloat(data.pm25Value) : data.pm25Value} 
                          grade={data.pm25Grade || '2'} 
                        />
                      ) : (
                        <div className="text-xs text-gray-500">데이터 없음</div>
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
    </div>
  );
}
