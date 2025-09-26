'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getSevenDayForecast, getUserRegionalForecast } from '@/actions/daily-forecast';
import type { SevenDayForecast } from '@/lib/schemas/airquality';

interface SevenDayForecastProps {
  defaultRegion?: string;
}

const SevenDayForecastComponent = ({ defaultRegion = '서울' }: SevenDayForecastProps) => {
  const [forecastData, setForecastData] = useState<SevenDayForecast[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRegion, setSelectedRegion] = useState(defaultRegion);
  const [regionInput, setRegionInput] = useState(defaultRegion);

  // 날짜 포맷팅 함수
  const formatDate = (dateString: string, dayOffset: number): string => {
    const date = new Date(dateString);
    
    const options: Intl.DateTimeFormatOptions = { 
      month: 'short', 
      day: 'numeric',
      weekday: 'short'
    };
    
    return date.toLocaleDateString('ko-KR', options);
  };

  // 날짜별 아이콘과 레이블 가져오기 함수
  const getDateInfo = (dayOffset: number) => {
    if (dayOffset === 0) return { icon: '📍', label: '오늘' };
    if (dayOffset === 1) return { icon: '📅', label: '내일' };
    if (dayOffset === 2) return { icon: '📊', label: '모레' };
    return { icon: '🔮', label: '미래' };
  };

  // 대기질 등급별 색상 및 스타일
  const getGradeStyle = (grade: string) => {
    switch (grade) {
      case '좋음':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case '보통':
        return 'bg-green-50 text-green-700 border-green-200';
      case '나쁨':
        return 'bg-orange-50 text-orange-700 border-orange-200';
      case '매우나쁨':
        return 'bg-red-50 text-red-700 border-red-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  // 데이터 로드 함수
  const loadForecastData = async (region: string = selectedRegion) => {
    try {
      setLoading(true);
      setError(null);
      
      const data = await getSevenDayForecast({ userRegion: region });
      setForecastData(data);
    } catch (err) {
      console.error('7일간 예보 로드 실패:', err);
      setError(err instanceof Error ? err.message : '데이터를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 지역 변경 핸들러
  const handleRegionChange = async () => {
    if (regionInput.trim() === '') return;
    
    try {
      setSelectedRegion(regionInput);
      await loadForecastData(regionInput);
    } catch (err) {
      console.error('지역 변경 실패:', err);
      setError('지역 정보를 변경하는데 실패했습니다.');
    }
  };

  // 새로고침 핸들러
  const handleRefresh = () => {
    loadForecastData();
  };

  // 컴포넌트 마운트 시 데이터 로드
  useEffect(() => {
    loadForecastData();
  }, []);

  // 데이터 로딩 중
  if (loading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-lg font-bold">7일간 대기질 예보</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2">데이터를 불러오는 중...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-lg font-bold">7일간 대기질 예보</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="text-red-600 mb-4">⚠️ {error}</div>
            <Button onClick={handleRefresh} className="bg-blue-600 hover:bg-blue-700">
              다시 시도
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <CardTitle className="text-lg font-bold">7일간 대기질 예보</CardTitle>
          
          {/* 지역 선택 */}
          <div className="flex gap-2 items-center">
            <Input
              value={regionInput}
              onChange={(e) => setRegionInput(e.target.value)}
              placeholder="지역명 (예: 서울, 부산)"
              className="w-40"
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleRegionChange();
                }
              }}
            />
            <Button 
              onClick={handleRegionChange}
              size="sm"
              className="whitespace-nowrap"
            >
              변경
            </Button>
            <Button 
              onClick={handleRefresh}
              size="sm"
              variant="outline"
              className="whitespace-nowrap"
            >
              새로고침
            </Button>
          </div>
        </div>
        
        <div className="text-sm text-gray-600">
          현재 지역: <span className="font-semibold text-blue-600">{selectedRegion}</span>
        </div>
      </CardHeader>
      
      <CardContent>
        {forecastData.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            예보 데이터가 없습니다.
          </div>
        ) : (
          <div className="space-y-3">
            {forecastData.map((forecast, index) => (
              <div
                key={`${forecast.forecastDate}-${index}`}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                {/* 날짜 정보 */}
                <div className="flex-1">
                  <div className="flex items-center gap-2 font-semibold text-gray-900">
                    <span className="text-lg">{getDateInfo(forecast.dayOffset).icon}</span>
                    <div className="flex flex-col">
                      <span>{formatDate(forecast.forecastDate, forecast.dayOffset)}</span>
                      <span className="text-xs font-normal text-gray-500">
                        ({getDateInfo(forecast.dayOffset).label})
                      </span>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {forecast.source === 'daily' ? '일별예보' : '주간예보'}
                    {forecast.dayOffset <= 2 && (
                      <span className="ml-1 text-blue-600 font-medium">
                        {forecast.dayOffset === 0 ? '(현재)' : '(단기)'}
                      </span>
                    )}
                  </div>
                </div>

                {/* 대기질 등급 */}
                <div className="flex-1 text-center">
                  <Badge 
                    className={`${getGradeStyle(forecast.pm10Grade || '정보없음')} px-3 py-1`}
                  >
                    {forecast.pm10Grade || '정보없음'}
                  </Badge>
                  <div className="text-xs text-gray-500 mt-1">
                    미세먼지
                  </div>
                </div>

                {/* 지역별 상세 정보 */}
                <div className="flex-2 text-right">
                  <div className="text-sm text-gray-700 max-w-xs truncate">
                    {forecast.pm10RegionalInfo || '상세 정보 없음'}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {forecast.gradeInfo.description}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 범례 */}
        <div className="mt-6 pt-4 border-t border-gray-200">
          <div className="text-sm font-semibold text-gray-700 mb-2">대기질 등급</div>
          <div className="flex flex-wrap gap-2">
            <Badge className="bg-blue-50 text-blue-700 border-blue-200 px-2 py-1">좋음</Badge>
            <Badge className="bg-green-50 text-green-700 border-green-200 px-2 py-1">보통</Badge>
            <Badge className="bg-orange-50 text-orange-700 border-orange-200 px-2 py-1">나쁨</Badge>
            <Badge className="bg-red-50 text-red-700 border-red-200 px-2 py-1">매우나쁨</Badge>
          </div>
        </div>

        {/* 데이터 출처 및 설명 */}
        <div className="mt-4 pt-3 border-t border-gray-100">
          <div className="text-xs text-gray-500 space-y-1">
            <div><strong>📍📅📊 단기예보:</strong> 일별예보 (getMinuDustFrcstDspth API)</div>
            <div><strong>🔮 장기예보:</strong> 주간예보 (getMinuDustWeekFrcstDspth API)</div>
            <div><strong>📊 데이터 출처:</strong> 한국환경공단 에어코리아</div>
            <div><strong>🎯 현재 지역:</strong> {selectedRegion} 지역의 예보등급 표시</div>
            <div><strong>🔄 업데이트:</strong> 일별예보(1시간), 주간예보(2시간) 주기</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SevenDayForecastComponent;
