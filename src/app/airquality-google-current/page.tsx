import { Suspense } from 'react';
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { GoogleCurrentAirQuality } from '@/components/airquality/GoogleCurrentAirQuality';
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
  Globe
} from 'lucide-react';

/**
 * Google Air Quality API 현재 대기질 상태 페이지
 */
export default async function GoogleCurrentAirQualityPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect('/sign-in');
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* 페이지 헤더 */}
      <div className="mb-8">
        <div className="flex items-center space-x-3 mb-4">
          <Globe className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-3xl font-bold">Google 현재 대기질</h1>
            <p className="text-muted-foreground">
              Google Air Quality API를 통한 실시간 대기질 모니터링
            </p>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary" className="flex items-center space-x-1">
            <MapPin className="h-3 w-3" />
            <span>실시간 데이터</span>
          </Badge>
          <Badge variant="secondary" className="flex items-center space-x-1">
            <Wind className="h-3 w-3" />
            <span>WHO 기준</span>
          </Badge>
          <Badge variant="secondary" className="flex items-center space-x-1">
            <Eye className="h-3 w-3" />
            <span>건강 권고</span>
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 메인 대기질 정보 */}
        <div className="lg:col-span-2">
          <Suspense fallback={
            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                  <p className="text-muted-foreground">대기질 정보를 불러오는 중...</p>
                </div>
              </CardContent>
            </Card>
          }>
            <GoogleCurrentAirQuality 
              latitude={37.5665} // 서울시청
              longitude={126.9780}
              autoRefresh={true}
              refreshInterval={30} // 30분마다 자동 새로고침
            />
          </Suspense>
        </div>

        {/* 사이드바 정보 */}
        <div className="space-y-6">
          {/* API 정보 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Info className="h-5 w-5" />
                <span>API 정보</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="font-semibold text-sm">데이터 제공</p>
                <p className="text-sm text-muted-foreground">Google Air Quality API</p>
              </div>
              <Separator />
              <div>
                <p className="font-semibold text-sm">업데이트 주기</p>
                <p className="text-sm text-muted-foreground">실시간 (30분마다 자동 새로고침)</p>
              </div>
              <Separator />
              <div>
                <p className="font-semibold text-sm">기본 위치</p>
                <p className="text-sm text-muted-foreground">서울시청 (37.5665, 126.9780)</p>
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
              <Separator />
              <div>
                <p className="font-semibold">SO₂</p>
                <p className="text-muted-foreground">아황산가스 (공장 배출가스)</p>
              </div>
              <Separator />
              <div>
                <p className="font-semibold">CO</p>
                <p className="text-muted-foreground">일산화탄소 (불완전 연소)</p>
              </div>
            </CardContent>
          </Card>

          {/* 관련 링크 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <ExternalLink className="h-5 w-5" />
                <span>관련 링크</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <a 
                href="https://developers.google.com/maps/documentation/air-quality"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center space-x-2 text-sm text-blue-600 hover:text-blue-800 transition-colors"
              >
                <ExternalLink className="h-4 w-4" />
                <span>Google Air Quality API 문서</span>
              </a>
              <a 
                href="https://www.who.int/news-room/feature-stories/detail/what-are-the-who-air-quality-guidelines"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center space-x-2 text-sm text-blue-600 hover:text-blue-800 transition-colors"
              >
                <ExternalLink className="h-4 w-4" />
                <span>WHO 대기질 가이드라인</span>
              </a>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 추가 정보 */}
      <div className="mt-8">
        <Card>
          <CardHeader>
            <CardTitle>사용법 안내</CardTitle>
            <CardDescription>Google Air Quality API 현재 대기질 페이지 사용 방법</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold mb-2">실시간 모니터링</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• 30분마다 자동으로 데이터가 업데이트됩니다</li>
                  <li>• 새로고침 버튼으로 수동 업데이트 가능합니다</li>
                  <li>• 현재 위치는 서울시청으로 설정되어 있습니다</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-2">데이터 해석</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• WHO 기준에 따른 대기질 등급을 표시합니다</li>
                  <li>• 각 오염물질별 농도를 확인할 수 있습니다</li>
                  <li>• 건강 권고사항을 제공합니다</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
