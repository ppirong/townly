import { GoogleAirQualityDashboard } from '@/components/airquality/GoogleAirQualityDashboard';
import { SignedIn, SignedOut, SignInButton } from '@clerk/nextjs';
import { getUserLocation } from '@/actions/location';

/**
 * 미세먼지(구글 API) 페이지
 * Google Air Quality API를 활용한 대기질 정보 조회
 */
export default async function GoogleAirQualityPage() {
  // 사용자의 저장된 위치 정보 조회
  let userLocation = null;
  try {
    const locationResult = await getUserLocation();
    if (locationResult.success && locationResult.data) {
      userLocation = locationResult.data;
    }
  } catch (error) {
    console.error('사용자 위치 조회 실패:', error);
  }

  return (
    <>
      <SignedOut>
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-20">
            <h1 className="text-3xl font-bold mb-4">미세먼지 정보 (Google API)</h1>
            <p className="text-gray-600 mb-8">
              로그인하여 Google Air Quality API 기반 실시간 대기질 정보를 확인하세요
            </p>
            <SignInButton mode="modal">
              <button className="bg-yellow-400 hover:bg-yellow-500 text-black font-medium py-2 px-4 rounded-lg transition-colors">
                로그인하기
              </button>
            </SignInButton>
          </div>
        </div>
      </SignedOut>

      <SignedIn>
        <main className="container mx-auto px-4 py-8">
          <div className="space-y-6">
            {/* 페이지 헤더 */}
            <div className="text-center space-y-2">
              <h1 className="text-3xl font-bold">미세먼지 정보 (Google API)</h1>
              <p className="text-muted-foreground">
                Google Air Quality API에서 제공하는 실시간 대기질 정보를 확인하세요
              </p>
            </div>

            {/* Google 대기질 대시보드 */}
            <div className="space-y-6">
              <GoogleAirQualityDashboard 
                className="w-full" 
                initialLocation={userLocation ? {
                  id: userLocation.id,
                  clerkUserId: userLocation.clerkUserId,
                  latitude: userLocation.latitude,
                  longitude: userLocation.longitude,
                  address: userLocation.address,
                  cityName: userLocation.locationName,
                  isDefault: userLocation.isDefault,
                  nickname: null,
                  accuracy: null,
                  source: 'gps',
                  createdAt: userLocation.createdAt,
                  updatedAt: userLocation.updatedAt,
                } : null}
              />
            </div>

            {/* 도움말 섹션 */}
            <div className="bg-muted/50 rounded-lg p-6 space-y-4">
              <h2 className="text-lg font-semibold">Google Air Quality API 정보 안내</h2>
              
              {/* 대기질 정보 종류 안내 */}
              <div className="mb-6">
                <h3 className="font-medium mb-2">제공되는 대기질 정보</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="bg-white dark:bg-gray-800 p-3 rounded-lg">
                    <h4 className="font-medium text-blue-600 mb-2">현재 대기질</h4>
                    <p className="text-muted-foreground">실시간 PM10, PM2.5 농도 및 대기질 지수</p>
                  </div>
                  <div className="bg-white dark:bg-gray-800 p-3 rounded-lg">
                    <h4 className="font-medium text-green-600 mb-2">시간별 예보</h4>
                    <p className="text-muted-foreground">향후 12시간 시간별 대기질 변화 예측</p>
                  </div>
                  <div className="bg-white dark:bg-gray-800 p-3 rounded-lg">
                    <h4 className="font-medium text-purple-600 mb-2">일별 예보</h4>
                    <p className="text-muted-foreground">향후 7일간 일별 대기질 변화 예측</p>
                  </div>
                  <div className="bg-white dark:bg-gray-800 p-3 rounded-lg">
                    <h4 className="font-medium text-orange-600 mb-2">건강 권고사항</h4>
                    <p className="text-muted-foreground">대기질에 따른 맞춤형 건강 가이드</p>
                  </div>
                </div>
                
                <div className="text-sm space-y-1 mt-4">
                  <div><strong>현재 대기질:</strong> 실시간 PM10/PM2.5 농도와 CAI(KR), BreezoMeter AQI 지수</div>
                  <div><strong>시간별 예보:</strong> 향후 12시간 동안의 시간별 대기질 변화</div>
                  <div><strong>일별 예보:</strong> 향후 7일간의 일별 대기질 평균 예측</div>
                  <div><strong>건강 권고:</strong> 일반인 및 민감군을 위한 맞춤형 건강 가이드</div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="font-medium mb-2">미세먼지 (PM10) 농도 기준</h3>
                  <ul className="space-y-1 text-sm">
                    <li><span className="inline-block w-3 h-3 bg-blue-500 rounded mr-2"></span>좋음: 0~30 μg/m³</li>
                    <li><span className="inline-block w-3 h-3 bg-green-500 rounded mr-2"></span>보통: 31~80 μg/m³</li>
                    <li><span className="inline-block w-3 h-3 bg-orange-500 rounded mr-2"></span>나쁨: 81~150 μg/m³</li>
                    <li><span className="inline-block w-3 h-3 bg-red-500 rounded mr-2"></span>매우나쁨: 151μg/m³ 이상</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-medium mb-2">초미세먼지 (PM2.5) 농도 기준</h3>
                  <ul className="space-y-1 text-sm">
                    <li><span className="inline-block w-3 h-3 bg-blue-500 rounded mr-2"></span>좋음: 0~15 μg/m³</li>
                    <li><span className="inline-block w-3 h-3 bg-green-500 rounded mr-2"></span>보통: 16~35 μg/m³</li>
                    <li><span className="inline-block w-3 h-3 bg-orange-500 rounded mr-2"></span>나쁨: 36~75 μg/m³</li>
                    <li><span className="inline-block w-3 h-3 bg-red-500 rounded mr-2"></span>매우나쁨: 76μg/m³ 이상</li>
                  </ul>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div>
                  <h3 className="font-medium mb-2">CAI (Korea) - 통합대기환경지수</h3>
                  <ul className="space-y-1 text-sm">
                    <li><span className="inline-block w-3 h-3 bg-blue-500 rounded mr-2"></span>좋음: 0~50</li>
                    <li><span className="inline-block w-3 h-3 bg-green-500 rounded mr-2"></span>보통: 51~100</li>
                    <li><span className="inline-block w-3 h-3 bg-orange-500 rounded mr-2"></span>나쁨: 101~250</li>
                    <li><span className="inline-block w-3 h-3 bg-red-500 rounded mr-2"></span>매우나쁨: 251 이상</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-medium mb-2">BreezoMeter AQI - 국제 대기질 지수</h3>
                  <ul className="space-y-1 text-sm">
                    <li><span className="inline-block w-3 h-3 bg-blue-500 rounded mr-2"></span>좋음: 0~50</li>
                    <li><span className="inline-block w-3 h-3 bg-green-500 rounded mr-2"></span>보통: 51~100</li>
                    <li><span className="inline-block w-3 h-3 bg-orange-500 rounded mr-2"></span>민감군 주의: 101~150</li>
                    <li><span className="inline-block w-3 h-3 bg-red-500 rounded mr-2"></span>나쁨: 151~200</li>
                    <li><span className="inline-block w-3 h-3 bg-purple-500 rounded mr-2"></span>매우나쁨: 201~300</li>
                    <li><span className="inline-block w-3 h-3 bg-gray-900 rounded mr-2"></span>위험: 301 이상</li>
                  </ul>
                </div>
              </div>

              {/* API 정보 */}
              <div className="border-t pt-4 mt-6">
                <h3 className="font-medium mb-2">Google Air Quality API 특징</h3>
                <div className="text-sm space-y-2">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-medium text-blue-600 mb-1">✨ 고정밀 데이터</h4>
                      <p className="text-muted-foreground">500x500m 해상도의 정밀한 대기질 데이터</p>
                    </div>
                    <div>
                      <h4 className="font-medium text-green-600 mb-1">🌍 글로벌 커버리지</h4>
                      <p className="text-muted-foreground">100개 이상 국가의 대기질 정보 제공</p>
                    </div>
                    <div>
                      <h4 className="font-medium text-purple-600 mb-1">🔮 예보 기능</h4>
                      <p className="text-muted-foreground">최대 96시간 시간별, 7일 일별 예보</p>
                    </div>
                    <div>
                      <h4 className="font-medium text-orange-600 mb-1">💡 건강 가이드</h4>
                      <p className="text-muted-foreground">대기질에 따른 맞춤형 건강 권고사항</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="text-sm text-muted-foreground">
                <p>* 데이터 출처: Google Air Quality API</p>
                <p>* 무료 한도: 월 10,000회 호출 (일 약 333회)</p>
                <p>* 데이터는 실시간으로 업데이트되며, 스마트 TTL 시스템으로 효율적으로 캐시됩니다.</p>
              </div>
            </div>
          </div>
        </main>
      </SignedIn>
    </>
  );
}

export const metadata = {
  title: '미세먼지 정보 (Google API) - Townly',
  description: 'Google Air Quality API에서 제공하는 실시간 대기질 정보',
};
