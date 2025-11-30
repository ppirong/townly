import { GoogleAirQualityDashboard } from '@/components/airquality/GoogleAirQualityDashboard';
import { AirQuality96HourChart } from '@/components/airquality/AirQuality96HourChart';
import { AirQualityDebugPanel } from '@/components/airquality/AirQualityDebugPanel';
import { SignedIn, SignedOut, SignInButton } from '@clerk/nextjs';
import { getUserLocation } from '@/actions/location';
import { getStored90HourAirQuality } from '@/actions/google-air-quality';

export const dynamic = 'force-dynamic';

/**
 * 미세먼지(구글 API) 페이지
 * Google Air Quality API를 활용한 대기질 정보 조회
 */
export default async function GoogleAirQualityPage() {
  // 사용자의 저장된 위치 정보 조회
  let userLocation = null;
  let latitude = 37.5665; // 기본값: 서울시청
  let longitude = 126.9780;
  
  try {
    const locationResult = await getUserLocation();
    if (locationResult.success && locationResult.data) {
      userLocation = locationResult.data;
      latitude = parseFloat(locationResult.data.latitude);
      longitude = parseFloat(locationResult.data.longitude);
    }
  } catch (error) {
    // 사용자 위치 조회 실패 시 기본값 사용
  }

  // 90시간 데이터 조회 (데이터베이스에서)
  let data90Hour: Awaited<ReturnType<typeof getStored90HourAirQuality>> = [];
  try {
    data90Hour = await getStored90HourAirQuality(latitude, longitude);
  } catch (error) {
    // 90시간 데이터 조회 실패 시 빈 배열 사용
  }

  return (
    <>
      <SignedOut>
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
          {/* Background Effects */}
          <div className="fixed inset-0 opacity-30 pointer-events-none">
            <div className="absolute top-20 left-10 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl animate-blob"></div>
            <div className="absolute top-40 right-10 w-72 h-72 bg-yellow-500 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-2000"></div>
            <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-4000"></div>
          </div>

          <div className="relative max-w-7xl mx-auto px-4 py-8 min-h-screen flex items-center">
            {/* Welcome Header - Modern Glassmorphism */}
            <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-12 shadow-2xl hover:shadow-purple-500/25 transition-all duration-500 hover:scale-[1.02] w-full">
              <div className="text-center space-y-8">
                <div className="inline-flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-purple-500 rounded-2xl flex items-center justify-center text-3xl shadow-lg">
                    🌫️
                  </div>
                  <h1 className="text-4xl lg:text-5xl font-extrabold bg-gradient-to-r from-white via-blue-200 to-purple-400 bg-clip-text text-transparent leading-tight">
                    미세먼지 정보 (Google API)
                  </h1>
                </div>
                <p className="text-xl text-white/80 leading-relaxed max-w-3xl mx-auto">
                  🌍 <span className="font-semibold text-blue-300">Google Air Quality API</span> 기반으로 
                  <br className="hidden sm:block" />
                  실시간 대기질 정보와 90시간 예보를 확인하세요
                </p>
                
                <div className="pt-4">
                  <SignInButton mode="modal">
                    <button className="group relative inline-flex items-center gap-3 bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600 text-black font-bold py-4 px-8 rounded-2xl transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-yellow-500/25">
                      <span className="text-lg">로그인하기</span>
                      <div className="w-6 h-6 bg-black/20 rounded-full flex items-center justify-center group-hover:rotate-12 transition-transform">
                        ✨
                      </div>
                    </button>
                  </SignInButton>
                </div>
              </div>
            </div>
          </div>
        </div>
      </SignedOut>

      <SignedIn>
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
          {/* Background Effects */}
          <div className="fixed inset-0 opacity-30 pointer-events-none">
            <div className="absolute top-20 left-10 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl animate-blob"></div>
            <div className="absolute top-40 right-10 w-72 h-72 bg-yellow-500 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-2000"></div>
            <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-4000"></div>
          </div>

          <div className="relative max-w-7xl mx-auto px-4 py-8">
            {/* Welcome Header - Modern Glassmorphism */}
            <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-8 mb-8 shadow-2xl hover:shadow-purple-500/25 transition-all duration-500 hover:scale-[1.02]">
              <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
                <div className="text-center lg:text-left">
                  <div className="inline-flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-purple-500 rounded-2xl flex items-center justify-center text-2xl shadow-lg">
                      🌫️
                    </div>
                    <h1 className="text-4xl lg:text-5xl font-extrabold bg-gradient-to-r from-white via-blue-200 to-purple-400 bg-clip-text text-transparent leading-tight">
                      미세먼지 정보 (Google API)
                    </h1>
                  </div>
                  <p className="text-xl text-white/80 leading-relaxed max-w-2xl">
                    🌍 <span className="font-semibold text-blue-300">Google Air Quality API</span>에서 제공하는 
                    <br className="hidden sm:block" />
                    실시간 대기질 정보와 90시간 예보를 확인하세요.
                  </p>
                </div>
                <div className="relative">
                  <div className="w-24 h-24 bg-gradient-to-br from-blue-400 via-purple-500 to-pink-500 rounded-full flex items-center justify-center text-5xl shadow-2xl animate-pulse">
                    🌫️
                  </div>
                  <div className="absolute -inset-2 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full opacity-20 blur animate-ping"></div>
                </div>
              </div>
            </div>

            <div className="space-y-8">
              {/* 디버그 패널 */}
              <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-6 shadow-lg hover:shadow-purple-500/20 transition-all duration-300">
                <AirQualityDebugPanel latitude={latitude} longitude={longitude} />
              </div>

              {/* Google 대기질 대시보드 (12시간) */}
              <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-6 shadow-lg hover:shadow-blue-500/20 transition-all duration-300 hover:scale-[1.01]">
                <div className="mb-4">
                  <h2 className="text-2xl font-bold bg-gradient-to-r from-white via-blue-200 to-purple-300 bg-clip-text text-transparent">
                    실시간 대기질 현황
                  </h2>
                  <p className="text-white/70 mt-2">12시간 실시간 데이터와 예보 정보</p>
                </div>
                <GoogleAirQualityDashboard 
                  className="w-full" 
                  initialLocation={userLocation ? {
                    id: userLocation.id,
                    clerkUserId: userLocation.clerkUserId,
                    latitude: userLocation.latitude,
                    longitude: userLocation.longitude,
                    address: userLocation.address,
                    cityName: userLocation.cityName,
                    isDefault: userLocation.isDefault,
                    nickname: userLocation.nickname,
                    accuracy: userLocation.accuracy,
                    source: userLocation.source,
                    createdAt: userLocation.createdAt,
                    updatedAt: userLocation.updatedAt,
                  } : null}
                />
              </div>

              {/* 90시간 그래프 */}
              <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-6 shadow-lg hover:shadow-green-500/20 transition-all duration-300 hover:scale-[1.01]">
                <div className="mb-4">
                  <h2 className="text-2xl font-bold bg-gradient-to-r from-white via-green-200 to-blue-300 bg-clip-text text-transparent">
                    90시간 추세 분석
                  </h2>
                  <p className="text-white/70 mt-2">장기 대기질 변화 패턴과 예측</p>
                </div>
                <AirQuality96HourChart data={data90Hour} />
              </div>

              {/* 도움말 섹션 */}
              <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-8 shadow-lg hover:shadow-orange-500/20 transition-all duration-300">
                <div className="mb-6">
                  <h2 className="text-2xl font-bold bg-gradient-to-r from-white via-orange-200 to-yellow-300 bg-clip-text text-transparent mb-2">
                    📊 Google Air Quality API 정보 안내
                  </h2>
                  <p className="text-white/70">대기질 데이터와 지수에 대한 상세한 설명</p>
                </div>
                
                <div className="space-y-6">
                  {/* 대기질 정보 종류 안내 */}

                  {/* 대기질 농도 기준 */}
                  <div>
                    <h3 className="text-lg font-semibold text-white/90 mb-4">📏 대기질 농도 기준</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="backdrop-blur-sm bg-white/5 border border-white/10 p-4 rounded-xl">
                        <h4 className="font-semibold text-blue-300 mb-3 flex items-center gap-2">
                          <div className="w-6 h-6 bg-gradient-to-br from-blue-400 to-blue-600 rounded-lg flex items-center justify-center text-xs">PM</div>
                          미세먼지 (PM10) 농도 기준
                        </h4>
                        <ul className="space-y-2 text-sm">
                          <li className="flex items-center gap-3"><span className="w-4 h-4 bg-blue-500 rounded-full"></span><span className="text-white/80">좋음: 0~30 μg/m³</span></li>
                          <li className="flex items-center gap-3"><span className="w-4 h-4 bg-green-500 rounded-full"></span><span className="text-white/80">보통: 31~80 μg/m³</span></li>
                          <li className="flex items-center gap-3"><span className="w-4 h-4 bg-orange-500 rounded-full"></span><span className="text-white/80">나쁨: 81~150 μg/m³</span></li>
                          <li className="flex items-center gap-3"><span className="w-4 h-4 bg-red-500 rounded-full"></span><span className="text-white/80">매우나쁨: 151μg/m³ 이상</span></li>
                        </ul>
                      </div>
                      <div className="backdrop-blur-sm bg-white/5 border border-white/10 p-4 rounded-xl">
                        <h4 className="font-semibold text-green-300 mb-3 flex items-center gap-2">
                          <div className="w-6 h-6 bg-gradient-to-br from-green-400 to-green-600 rounded-lg flex items-center justify-center text-xs">2.5</div>
                          초미세먼지 (PM2.5) 농도 기준
                        </h4>
                        <ul className="space-y-2 text-sm">
                          <li className="flex items-center gap-3"><span className="w-4 h-4 bg-blue-500 rounded-full"></span><span className="text-white/80">좋음: 0~15 μg/m³</span></li>
                          <li className="flex items-center gap-3"><span className="w-4 h-4 bg-green-500 rounded-full"></span><span className="text-white/80">보통: 16~35 μg/m³</span></li>
                          <li className="flex items-center gap-3"><span className="w-4 h-4 bg-orange-500 rounded-full"></span><span className="text-white/80">나쁨: 36~75 μg/m³</span></li>
                          <li className="flex items-center gap-3"><span className="w-4 h-4 bg-red-500 rounded-full"></span><span className="text-white/80">매우나쁨: 76μg/m³ 이상</span></li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* 대기질 지수 기준 */}
                  <div>
                    <h3 className="text-lg font-semibold text-white/90 mb-4">📊 대기질 지수 기준</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="backdrop-blur-sm bg-white/5 border border-white/10 p-4 rounded-xl">
                        <h4 className="font-semibold text-purple-300 mb-3 flex items-center gap-2">
                          <div className="w-6 h-6 bg-gradient-to-br from-purple-400 to-purple-600 rounded-lg flex items-center justify-center text-xs">KR</div>
                          CAI (Korea) - 통합대기환경지수
                        </h4>
                        <ul className="space-y-2 text-sm">
                          <li className="flex items-center gap-3"><span className="w-4 h-4 bg-blue-500 rounded-full"></span><span className="text-white/80">좋음: 0~50</span></li>
                          <li className="flex items-center gap-3"><span className="w-4 h-4 bg-green-500 rounded-full"></span><span className="text-white/80">보통: 51~100</span></li>
                          <li className="flex items-center gap-3"><span className="w-4 h-4 bg-orange-500 rounded-full"></span><span className="text-white/80">나쁨: 101~250</span></li>
                          <li className="flex items-center gap-3"><span className="w-4 h-4 bg-red-500 rounded-full"></span><span className="text-white/80">매우나쁨: 251 이상</span></li>
                        </ul>
                      </div>
                      <div className="backdrop-blur-sm bg-white/5 border border-white/10 p-4 rounded-xl">
                        <h4 className="font-semibold text-orange-300 mb-3 flex items-center gap-2">
                          <div className="w-6 h-6 bg-gradient-to-br from-orange-400 to-orange-600 rounded-lg flex items-center justify-center text-xs">🌍</div>
                          BreezoMeter AQI - 국제 대기질 지수
                        </h4>
                        <ul className="space-y-2 text-sm">
                          <li className="flex items-center gap-3"><span className="w-4 h-4 bg-blue-500 rounded-full"></span><span className="text-white/80">좋음: 0~50</span></li>
                          <li className="flex items-center gap-3"><span className="w-4 h-4 bg-green-500 rounded-full"></span><span className="text-white/80">보통: 51~100</span></li>
                          <li className="flex items-center gap-3"><span className="w-4 h-4 bg-orange-500 rounded-full"></span><span className="text-white/80">민감군 주의: 101~150</span></li>
                          <li className="flex items-center gap-3"><span className="w-4 h-4 bg-red-500 rounded-full"></span><span className="text-white/80">나쁨: 151~200</span></li>
                          <li className="flex items-center gap-3"><span className="w-4 h-4 bg-purple-500 rounded-full"></span><span className="text-white/80">매우나쁨: 201~300</span></li>
                          <li className="flex items-center gap-3"><span className="w-4 h-4 bg-gray-600 rounded-full"></span><span className="text-white/80">위험: 301 이상</span></li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* 하단 정보 */}
                  <div className="backdrop-blur-sm bg-white/5 border border-white/10 p-4 rounded-xl">
                    <div className="text-sm text-white/70 space-y-1">
                      <p className="flex items-center gap-2"><span className="text-blue-400">📊</span> 데이터 출처: Google Air Quality API</p>
                      <p className="flex items-center gap-2"><span className="text-green-400">📋</span> 무료 한도: 월 10,000회 호출 (일 약 333회)</p>
                      <p className="flex items-center gap-2"><span className="text-purple-400">🕐</span> 90시간 데이터는 매일 6시, 12시, 18시, 24시에 자동 수집됩니다.</p>
                      <p className="flex items-center gap-2"><span className="text-orange-400">⏰</span> Google API 제한으로 최대 90시간(3.75일) 예보를 제공합니다.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </SignedIn>
    </>
  );
}

export const metadata = {
  title: '미세먼지 정보 (Google API) - Townly',
  description: 'Google Air Quality API에서 제공하는 실시간 대기질 정보',
};
