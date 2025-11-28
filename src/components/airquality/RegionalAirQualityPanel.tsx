'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  getHourlyAirQualityByStation,
  getDailyAirQualityByStation,
  getSupportedRegions 
} from '@/actions/regional-airquality';
import { getUserStation } from '@/actions/user-station';
import { 
  type RegionalAirQualityResponse,
  type HourlyRegionalAirQuality,
  type DailyRegionalAirQuality,
  AIR_QUALITY_GRADES,
  getAirQualityGradeInfo,
  extractMainAirQualityIndicators
} from '@/lib/schemas/regional-airquality';
import { type RegionInfo, type StationInfo } from '@/lib/data/stations';

interface RegionalAirQualityPanelProps {
  stationName?: string;
  className?: string;
}

interface RegionalData {
  station: StationInfo;
  region: RegionInfo;
  hourlyData: RegionalAirQualityResponse | null;
  dailyData: RegionalAirQualityResponse | null;
}

export function RegionalAirQualityPanel({ stationName, className }: RegionalAirQualityPanelProps) {
  const [regionalData, setRegionalData] = useState<RegionalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewType, setViewType] = useState<'hourly' | 'daily'>('hourly');

  useEffect(() => {
    loadRegionalData();
  }, [stationName]);

  const loadRegionalData = async () => {
    try {
      setLoading(true);
      setError(null);

      if (stationName) {
        // 특정 측정소 기반 조회
        const [hourlyResult, dailyResult] = await Promise.all([
          getHourlyAirQualityByStation(stationName),
          getDailyAirQualityByStation(stationName)
        ]);

        setRegionalData({
          station: { 
            name: stationName,
            sido: hourlyResult.regionName || '',
            latitude: 0,
            longitude: 0,
            address: '',
            regionCode: hourlyResult.regionCode
          } as StationInfo,
          region: { name: hourlyResult.regionName, code: hourlyResult.regionCode } as RegionInfo,
          hourlyData: hourlyResult,
          dailyData: dailyResult,
        });
      } else {
        // 사용자 기본 측정소 기반 조회
        const userStation = await getUserStation();
        if (userStation) {
          const [hourlyResult, dailyResult] = await Promise.all([
            getHourlyAirQualityByStation(userStation.stationName),
            getDailyAirQualityByStation(userStation.stationName)
          ]);

          setRegionalData({
            station: { 
              name: userStation.stationName,
              sido: hourlyResult.regionName || '',
              latitude: 0,
              longitude: 0,
              address: '',
              regionCode: hourlyResult.regionCode
            } as StationInfo,
            region: { name: hourlyResult.regionName, code: hourlyResult.regionCode } as RegionInfo,
            hourlyData: hourlyResult,
            dailyData: dailyResult,
          });
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '지역별 대기질 정보를 가져오는데 실패했습니다.');
      console.error('지역별 대기질 로딩 오류:', err);
    } finally {
      setLoading(false);
    }
  };

  const renderAirQualityValue = (value: string | undefined, grade: string | undefined, unit: string) => {
    if (!value) return <span className="text-muted-foreground">-</span>;
    
    const gradeInfo = getAirQualityGradeInfo(grade);
    
    return (
      <div className="flex items-center gap-2">
        <span className="font-semibold">{value}{unit}</span>
        <Badge 
          variant="secondary" 
          style={{ 
            backgroundColor: gradeInfo.bgColor, 
            color: gradeInfo.color,
            border: `1px solid ${gradeInfo.color}20`
          }}
        >
          {gradeInfo.label}
        </Badge>
      </div>
    );
  };

  const renderHourlyChart = (data: HourlyRegionalAirQuality[]) => {
    if (!data.length) return <div className="text-muted-foreground text-center py-4">데이터가 없습니다.</div>;

    return (
      <div className="space-y-3">
        {data.slice(0, 12).map((item, index) => {
          const indicators = extractMainAirQualityIndicators(item);
          
          return (
            <div key={index} className="flex items-center justify-between p-3 rounded-lg border">
              <div className="flex items-center gap-3">
                <div className="text-sm font-medium min-w-[60px]">
                  {item.hour.toString().padStart(2, '0')}:00
                </div>
                <div className="text-xs text-muted-foreground">
                  {item.date}
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                {indicators.pm10 && (
                  <div className="text-center">
                    <div className="text-xs text-muted-foreground">PM10</div>
                    <div className="flex items-center gap-1">
                      <span className="font-medium">{indicators.pm10.value}</span>
                      <Badge 
                        variant="outline" 
                        className="text-xs"
                        style={{ 
                          backgroundColor: indicators.pm10.gradeInfo.bgColor,
                          color: indicators.pm10.gradeInfo.color 
                        }}
                      >
                        {indicators.pm10.gradeInfo.label}
                      </Badge>
                    </div>
                  </div>
                )}
                
                {indicators.pm25 && (
                  <div className="text-center">
                    <div className="text-xs text-muted-foreground">PM2.5</div>
                    <div className="flex items-center gap-1">
                      <span className="font-medium">{indicators.pm25.value}</span>
                      <Badge 
                        variant="outline" 
                        className="text-xs"
                        style={{ 
                          backgroundColor: indicators.pm25.gradeInfo.bgColor,
                          color: indicators.pm25.gradeInfo.color 
                        }}
                      >
                        {indicators.pm25.gradeInfo.label}
                      </Badge>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderDailyChart = (data: DailyRegionalAirQuality[]) => {
    if (!data.length) return <div className="text-muted-foreground text-center py-4">데이터가 없습니다.</div>;

    return (
      <div className="space-y-3">
        {data.slice(0, 7).map((item, index) => {
          const indicators = extractMainAirQualityIndicators(item);
          
          return (
            <div key={index} className="flex items-center justify-between p-3 rounded-lg border">
              <div className="flex items-center gap-3">
                <div className="text-sm font-medium min-w-[80px]">
                  {new Date(item.date).toLocaleDateString('ko-KR', { 
                    month: 'short', 
                    day: 'numeric' 
                  })}
                </div>
                <div className="text-xs text-muted-foreground">
                  {new Date(item.date).toLocaleDateString('ko-KR', { weekday: 'short' })}
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                {indicators.pm10 && (
                  <div className="text-center">
                    <div className="text-xs text-muted-foreground">PM10</div>
                    <div className="flex items-center gap-1">
                      <span className="font-medium">{indicators.pm10.value}</span>
                      <Badge 
                        variant="outline" 
                        className="text-xs"
                        style={{ 
                          backgroundColor: indicators.pm10.gradeInfo.bgColor,
                          color: indicators.pm10.gradeInfo.color 
                        }}
                      >
                        {indicators.pm10.gradeInfo.label}
                      </Badge>
                    </div>
                    {/* 일별 통계 표시 */}
                    {item.pm10Max && item.pm10Min && (
                      <div className="text-xs text-muted-foreground mt-1">
                        {item.pm10Min} ~ {item.pm10Max}
                      </div>
                    )}
                  </div>
                )}
                
                {indicators.pm25 && (
                  <div className="text-center">
                    <div className="text-xs text-muted-foreground">PM2.5</div>
                    <div className="flex items-center gap-1">
                      <span className="font-medium">{indicators.pm25.value}</span>
                      <Badge 
                        variant="outline" 
                        className="text-xs"
                        style={{ 
                          backgroundColor: indicators.pm25.gradeInfo.bgColor,
                          color: indicators.pm25.gradeInfo.color 
                        }}
                      >
                        {indicators.pm25.gradeInfo.label}
                      </Badge>
                    </div>
                    {/* 일별 통계 표시 */}
                    {item.pm25Max && item.pm25Min && (
                      <div className="text-xs text-muted-foreground mt-1">
                        {item.pm25Min} ~ {item.pm25Max}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>지역별 대기질 정보</CardTitle>
          <CardDescription>데이터를 불러오는 중...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="text-muted-foreground">로딩 중...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>지역별 대기질 정보</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <Button onClick={loadRegionalData} className="mt-4" variant="outline">
            다시 시도
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!regionalData) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>지역별 대기질 정보</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            데이터를 찾을 수 없습니다.
          </div>
        </CardContent>
      </Card>
    );
  }

  const currentData = viewType === 'hourly' ? regionalData.hourlyData : regionalData.dailyData;
  const latestData = currentData?.data[0];

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>지역별 대기질 정보</CardTitle>
            <CardDescription>
              {regionalData.region.name} · {regionalData.station.name} 측정소 기준
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              variant={viewType === 'hourly' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewType('hourly')}
            >
              시간별
            </Button>
            <Button
              variant={viewType === 'daily' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewType('daily')}
            >
              일별
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* 현재 대기질 요약 */}
        {latestData && (
          <div className="mb-6 p-4 rounded-lg bg-muted/30">
            <h3 className="font-semibold mb-3">
              현재 대기질 ({viewType === 'hourly' ? '시간별' : '일별'})
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <div className="text-sm text-muted-foreground">미세먼지</div>
                {renderAirQualityValue(latestData.pm10Value, latestData.pm10Grade, 'μg/m³')}
              </div>
              <div>
                <div className="text-sm text-muted-foreground">초미세먼지</div>
                {renderAirQualityValue(latestData.pm25Value, latestData.pm25Grade, 'μg/m³')}
              </div>
              <div>
                <div className="text-sm text-muted-foreground">오존</div>
                {renderAirQualityValue(latestData.o3Value, latestData.o3Grade, 'ppm')}
              </div>
              {latestData.khaiValue && (
                <div>
                  <div className="text-sm text-muted-foreground">통합지수</div>
                  {renderAirQualityValue(latestData.khaiValue, latestData.khaiGrade, '')}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 시간별/일별 차트 */}
        <div>
          <h3 className="font-semibold mb-3">
            {viewType === 'hourly' ? '시간별 변화' : '일별 변화'}
          </h3>
          <ScrollArea className="h-[400px]">
            {viewType === 'hourly' && regionalData.hourlyData ? 
              renderHourlyChart(regionalData.hourlyData.data as HourlyRegionalAirQuality[]) :
              regionalData.dailyData ? 
                renderDailyChart(regionalData.dailyData.data as DailyRegionalAirQuality[]) :
                <div className="text-center py-8 text-muted-foreground">데이터가 없습니다.</div>
            }
          </ScrollArea>
        </div>

        {/* 새로고침 버튼 */}
        <div className="mt-4 pt-4 border-t">
          <Button onClick={loadRegionalData} variant="outline" size="sm">
            새로고침
          </Button>
          <div className="text-xs text-muted-foreground mt-2">
            마지막 업데이트: {new Date().toLocaleString('ko-KR')}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
