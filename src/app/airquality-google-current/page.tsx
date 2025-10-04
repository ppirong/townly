import { Suspense } from 'react';
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { GoogleCurrentAirQuality } from '@/components/airquality/GoogleCurrentAirQuality';
import { AirQuality96HourChart } from '@/components/airquality/AirQuality96HourChart';
import { AirQualityDebugPanel } from '@/components/airquality/AirQualityDebugPanel';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { 
  MapPin, 
  Thermometer, 
  Wind, 
  Eye, 
  Info,
  ExternalLink,
  Globe,
  Clock
} from 'lucide-react';
import { getStored90HourAirQuality } from '@/actions/google-air-quality';
import { getUserLocation } from '@/actions/location';

/**
 * Google Air Quality API 대기질 페이지
 * - 12시간: 현재 방식 (실시간 조회)
 * - 90시간: 그래프 (데이터베이스에서 조회)
 */
export default async function GoogleAirQualityPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect('/sign-in');
  }

  // 사용자 위치 정보 조회
  const locationResult = await getUserLocation();
  let latitude = 37.5665; // 기본값: 서울시청
  let longitude = 126.9780;
  
  if (locationResult.success && locationResult.data) {
    latitude = parseFloat(locationResult.data.latitude);
    longitude = parseFloat(locationResult.data.longitude);
  }

  // 90시간 데이터 조회 (데이터베이스에서)
  let data90Hour: Awaited<ReturnType<typeof getStored90HourAirQuality>> = [];
  try {
    data90Hour = await getStored90HourAirQuality(latitude, longitude);
  } catch (error) {
    console.error('90시간 데이터 조회 실패:', error);
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* 페이지 헤더 */}
      <div className="mb-8">
        <div className="flex items-center space-x-3 mb-4">
          <Globe className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-3xl font-bold">미세먼지 (Google)</h1>
            <p className="text-muted-foreground">
              Google Air Quality API를 통한 대기질 모니터링
            </p>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary" className="flex items-center space-x-1">
            <MapPin className="h-3 w-3" />
            <span>위치: {latitude.toFixed(4)}, {longitude.toFixed(4)}</span>
          </Badge>
          <Badge variant="secondary" className="flex items-center space-x-1">
            <Clock className="h-3 w-3" />
            <span>스케줄: 6시, 12시, 18시, 24시</span>
          </Badge>
          <Badge variant="secondary" className="flex items-center space-x-1">
            <Wind className="h-3 w-3" />
            <span>WHO 기준</span>
          </Badge>
        </div>
      </div>

      {/* 디버그 패널 */}
      <div className="mb-6">
        <AirQualityDebugPanel latitude={latitude} longitude={longitude} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* 12시간 현재 대기질 정보 */}
        <div className="lg:col-span-2">
          <Suspense fallback={
            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                  <p className="text-muted-foreground">12시간 대기질 정보를 불러오는 중...</p>
                </div>
              </CardContent>
            </Card>
          }>
            <GoogleCurrentAirQuality 
              latitude={latitude}
              longitude={longitude}
              autoRefresh={false} // 자동 새로고침 비활성화
              refreshInterval={30}
            />
          </Suspense>
        </div>

        {/* 사이드바 정보 */}
        <div className="space-y-6">
          {/* 데이터 수집 정보 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Info className="h-5 w-5" />
                <span>데이터 수집</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="font-semibold text-sm">자동 수집 시간</p>
                <p className="text-sm text-muted-foreground">매일 6시, 12시, 18시, 24시</p>
              </div>
              <Separator />
              <div>
                <p className="font-semibold text-sm">수집 데이터</p>
                <p className="text-sm text-muted-foreground">90시간 (3.75일) 대기질 예보</p>
              </div>
              <Separator />
              <div>
                <p className="font-semibold text-sm">데이터 소스</p>
                <p className="text-sm text-muted-foreground">Google Air Quality API</p>
              </div>
              <Separator />
              <div>
                <p className="font-semibold text-sm">표시 방식</p>
                <p className="text-sm text-muted-foreground">12시간: 상세 정보<br/>90시간: 그래프</p>
              </div>
            </CardContent>
          </Card>

          {/* 대기질 지수 기준 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Thermometer className="h-5 w-5" />
                <span>대기질 지수 기준</span>
              </CardTitle>
              <CardDescription>WHO 기준 PM2.5/PM10</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-sm">좋음</span>
                </div>
                <span className="text-xs text-muted-foreground">≤15/≤45</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  <span className="text-sm">보통</span>
                </div>
                <span className="text-xs text-muted-foreground">≤35/≤80</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                  <span className="text-sm">나쁨</span>
                </div>
                <span className="text-xs text-muted-foreground">≤75/≤150</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <span className="text-sm">매우나쁨</span>
                </div>
                <span className="text-xs text-muted-foreground">&gt;75/&gt;150</span>
              </div>
            </CardContent>
          </Card>

          {/* 오염물질 설명 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Wind className="h-5 w-5" />
                <span>오염물질 정보</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <p className="font-semibold">PM2.5</p>
                <p className="text-muted-foreground">지름 2.5㎛ 이하의 초미세먼지</p>
              </div>
              <Separator />
              <div>
                <p className="font-semibold">PM10</p>
                <p className="text-muted-foreground">지름 10㎛ 이하의 미세먼지</p>
              </div>
              <Separator />
              <div>
                <p className="font-semibold">NO₂</p>
                <p className="text-muted-foreground">이산화질소 (자동차 배기가스)</p>
              </div>
              <Separator />
              <div>
                <p className="font-semibold">O₃</p>
                <p className="text-muted-foreground">오존 (광화학 스모그)</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 90시간 그래프 */}
      <div className="mb-8">
        <AirQuality96HourChart data={data90Hour} />
      </div>

      {/* 사용법 안내 */}
      <div>
        <Card>
          <CardHeader>
            <CardTitle>사용법 안내</CardTitle>
            <CardDescription>대기질 정보 페이지 사용 방법</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold mb-2">자동 데이터 수집</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• 매일 6시, 12시, 18시, 24시에 자동 수집</li>
                  <li>• 90시간 (3.75일) 대기질 예보 데이터 저장</li>
                  <li>• 이전 시각 데이터는 자동으로 삭제됩니다</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-2">데이터 확인</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• 12시간 정보: 상세한 시간별 대기질 상태</li>
                  <li>• 90시간 그래프: 장기 추세 확인</li>
                  <li>• &quot;대기질 정보 가져오기&quot; 버튼으로 수동 업데이트</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
