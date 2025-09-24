import { AirQualityDashboard } from '@/components/airquality/AirQualityDashboard';
import { SignedIn, SignedOut, SignInButton } from '@clerk/nextjs';

/**
 * 미세먼지 페이지
 * 한국환경공단 에어코리아 API를 활용한 대기질 정보 조회
 */
export default function AirQualityPage() {
  return (
    <>
      <SignedOut>
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-20">
            <h1 className="text-3xl font-bold mb-4">미세먼지 정보</h1>
            <p className="text-gray-600 mb-8">
              로그인하여 실시간 미세먼지 정보를 확인하세요
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
              <h1 className="text-3xl font-bold">미세먼지 정보</h1>
              <p className="text-muted-foreground">
                한국환경공단 에어코리아에서 제공하는 실시간 대기질 정보를 확인하세요
              </p>
            </div>

            {/* 미세먼지 대시보드 */}
            <AirQualityDashboard className="w-full" />

            {/* 도움말 섹션 */}
            <div className="bg-muted/50 rounded-lg p-6 space-y-4">
              <h2 className="text-lg font-semibold">대기질 지수 안내</h2>
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
              <div className="text-sm text-muted-foreground">
                <p>* 데이터 출처: 한국환경공단 에어코리아 (AirKorea)</p>
                <p>* 측정 시간은 각 측정소의 실제 측정 시각을 나타냅니다.</p>
              </div>
            </div>
          </div>
        </main>
      </SignedIn>
    </>
  );
}

export const metadata = {
  title: '미세먼지 정보 - Townly',
  description: '한국환경공단 에어코리아에서 제공하는 실시간 대기질 정보',
};
