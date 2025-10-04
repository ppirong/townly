'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import type { ProcessedAirQualityData } from '@/lib/services/google-air-quality';

interface AirQuality96HourChartProps {
  data: ProcessedAirQualityData[];
}

/**
 * 90시간 대기질 그래프 컴포넌트
 * PM2.5, PM10, AQI를 시간별로 표시합니다.
 */
export function AirQuality96HourChart({ data }: AirQuality96HourChartProps) {
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>90시간 대기질 예보</CardTitle>
          <CardDescription>대기질 데이터가 없습니다.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <p className="font-semibold text-yellow-900 dark:text-yellow-100 mb-2">
              📊 데이터를 수집해야 합니다
            </p>
            <p className="text-sm text-yellow-700 dark:text-yellow-300 mb-3">
              90시간 대기질 데이터를 표시하려면 먼저 데이터를 수집해야 합니다.
            </p>
            <div className="space-y-2 text-sm text-yellow-700 dark:text-yellow-300">
              <p><strong>방법 1 (즉시 수집):</strong> 위의 &quot;대기질 정보 가져오기&quot; 버튼을 클릭하세요.</p>
              <p><strong>방법 2 (자동 수집):</strong> 매일 6시, 12시, 18시, 24시에 자동으로 수집됩니다.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // 차트 데이터 준비
  const chartData = data.map(item => {
    const date = new Date(item.dateTime);
    return {
      dateTime: date,
      dateLabel: format(date, 'M/d HH:mm', { locale: ko }),
      pm25: item.pm25 || 0,
      pm10: item.pm10 || 0,
      aqi: item.caiKr || item.breezoMeterAqi || 0,
    };
  });

  // 통계 계산
  const avgPm25 = Math.round(
    data.reduce((sum, item) => sum + (item.pm25 || 0), 0) / data.length
  );
  const avgPm10 = Math.round(
    data.reduce((sum, item) => sum + (item.pm10 || 0), 0) / data.length
  );
  const maxPm25 = Math.max(...data.map(item => item.pm25 || 0));
  const maxPm10 = Math.max(...data.map(item => item.pm10 || 0));

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                90시간 대기질 예보
                {data.length < 90 && (
                  <Badge variant="outline" className="text-xs">
                    {data.length}시간 데이터
                  </Badge>
                )}
              </CardTitle>
              <CardDescription className="mt-1">
                {format(new Date(data[0].dateTime), 'M월 d일 HH:mm', { locale: ko })} ~ 
                {format(new Date(data[data.length - 1].dateTime), 'M월 d일 HH:mm', { locale: ko })}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Badge variant="secondary">
                평균 PM2.5: {avgPm25}㎍/㎥
              </Badge>
              <Badge variant="secondary">
                평균 PM10: {avgPm10}㎍/㎥
              </Badge>
            </div>
          </div>
          
          {data.length < 90 && (
            <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
              <p className="text-sm text-blue-700 dark:text-blue-300">
                💡 현재 <strong>{data.length}시간</strong> 데이터가 있습니다. 
                90시간 전체 데이터를 보려면 &quot;대기질 정보 가져오기&quot; 버튼을 클릭하세요.
              </p>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {/* 통계 요약 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-muted rounded-lg p-3">
            <p className="text-xs text-muted-foreground">PM2.5 평균</p>
            <p className="text-2xl font-bold">{avgPm25}</p>
            <p className="text-xs text-muted-foreground">㎍/㎥</p>
          </div>
          <div className="bg-muted rounded-lg p-3">
            <p className="text-xs text-muted-foreground">PM2.5 최대</p>
            <p className="text-2xl font-bold text-orange-600">{maxPm25}</p>
            <p className="text-xs text-muted-foreground">㎍/㎥</p>
          </div>
          <div className="bg-muted rounded-lg p-3">
            <p className="text-xs text-muted-foreground">PM10 평균</p>
            <p className="text-2xl font-bold">{avgPm10}</p>
            <p className="text-xs text-muted-foreground">㎍/㎥</p>
          </div>
          <div className="bg-muted rounded-lg p-3">
            <p className="text-xs text-muted-foreground">PM10 최대</p>
            <p className="text-2xl font-bold text-orange-600">{maxPm10}</p>
            <p className="text-xs text-muted-foreground">㎍/㎥</p>
          </div>
        </div>

        {/* 그래프 - 좌우 스크롤 가능 */}
        <div className="w-full overflow-x-auto">
          <div style={{ width: `${Math.max(chartData.length * 15, 800)}px`, height: '400px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={chartData}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="dateLabel"
                  tick={{ fontSize: 12 }}
                  interval={0}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  tickFormatter={(value, index) => {
                    // 날짜가 변경되는 지점에만 날짜 표시
                    if (index === 0) return value;
                    const currentDate = chartData[index]?.dateTime;
                    const prevDate = chartData[index - 1]?.dateTime;
                    if (currentDate && prevDate) {
                      const currentDay = format(currentDate, 'd');
                      const prevDay = format(prevDate, 'd');
                      if (currentDay !== prevDay) {
                        return format(currentDate, 'M/d HH:mm', { locale: ko });
                      }
                    }
                    // 3시간마다 시간 표시
                    if (index % 3 === 0) {
                      return format(chartData[index].dateTime, 'HH:mm');
                    }
                    return '';
                  }}
                />
              <YAxis
                label={{ value: '농도 (㎍/㎥)', angle: -90, position: 'insideLeft' }}
                tick={{ fontSize: 12 }}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload || !payload.length) return null;
                  
                  const data = payload[0].payload;
                  return (
                    <div className="bg-background border rounded-lg p-3 shadow-lg">
                      <p className="font-semibold mb-2">
                        {format(data.dateTime, 'M월 d일 HH:mm', { locale: ko })}
                      </p>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-blue-500 rounded-full" />
                          <span className="text-sm">PM2.5: {data.pm25}㎍/㎥</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-green-500 rounded-full" />
                          <span className="text-sm">PM10: {data.pm10}㎍/㎥</span>
                        </div>
                        {data.aqi > 0 && (
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-purple-500 rounded-full" />
                            <span className="text-sm">AQI: {data.aqi}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                }}
              />
              <Legend
                wrapperStyle={{ fontSize: '14px' }}
                formatter={(value) => {
                  if (value === 'pm25') return 'PM2.5 (㎍/㎥)';
                  if (value === 'pm10') return 'PM10 (㎍/㎥)';
                  if (value === 'aqi') return 'AQI';
                  return value;
                }}
              />
              <Line
                type="monotone"
                dataKey="pm25"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={false}
                name="PM2.5"
              />
              <Line
                type="monotone"
                dataKey="pm10"
                stroke="#22c55e"
                strokeWidth={2}
                dot={false}
                name="PM10"
              />
              <Line
                type="monotone"
                dataKey="aqi"
                stroke="#a855f7"
                strokeWidth={2}
                dot={false}
                name="AQI"
                strokeDasharray="5 5"
              />
            </LineChart>
          </ResponsiveContainer>
          </div>
        </div>

        {/* 스크롤 안내 */}
        <div className="flex items-center justify-center gap-2 mt-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16l-4-4m0 0l4-4m-4 4h18" />
            </svg>
            <span>좌우 스크롤하여 전체 90시간 데이터 확인</span>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </div>
        </div>

        {/* 범례 설명 */}
        <div className="mt-4 text-xs text-muted-foreground space-y-1">
          <p>• PM2.5: 지름 2.5㎛ 이하의 초미세먼지 (파란색 실선)</p>
          <p>• PM10: 지름 10㎛ 이하의 미세먼지 (초록색 실선)</p>
          <p>• AQI: 대기질 지수 (보라색 점선)</p>
          <p>• 시간 축 표시: 날짜 변경 시 날짜 표시, 3시간마다 시간 표시</p>
          <p>• 그래프 너비는 데이터 개수에 비례하여 자동 조정됩니다</p>
          <p>• Google API 제한으로 최대 90시간 데이터를 표시합니다</p>
        </div>
      </CardContent>
    </Card>
  );
}

