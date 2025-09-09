import { SignedIn, SignedOut, SignInButton } from "@clerk/nextjs";
import WelcomeDashboard from "@/components/WelcomeDashboard";

export default function Home() {
  return (
    <div className="container mx-auto px-4 py-8">
      <SignedOut>
        {/* Hero Section */}
        <div className="text-center py-20">
          <div className="max-w-4xl mx-auto">
            <div className="mb-8">
              <div className="text-6xl mb-4">🏘️</div>
              <h1 className="text-5xl font-bold text-gray-900 mb-6 leading-tight">
                우리 동네 생활 정보를 
                <span className="text-yellow-500"> 카카오톡</span>으로
              </h1>
              <p className="text-xl text-gray-600 mb-8 leading-relaxed">
                GPS 기반으로 당신의 지역에 맞춤화된 날씨, 미세먼지, 마트 할인 정보를 
                <br />실시간으로 받아보세요
              </p>
            </div>
            
            {/* CTA Button */}
            <div className="mb-16">
              <SignInButton mode="modal">
                <button className="bg-yellow-400 hover:bg-yellow-500 text-black font-bold text-lg px-8 py-4 rounded-full transition-all duration-200 transform hover:scale-105 shadow-lg">
                  🔑 카카오로 시작하기
                </button>
              </SignInButton>
              <p className="text-sm text-gray-500 mt-3">
                30초만에 시작 • 무료 서비스 • 언제든 해지 가능
              </p>
            </div>
            
            {/* Feature Cards */}
            <div className="grid md:grid-cols-3 gap-8">
              <div className="bg-white rounded-xl p-8 shadow-lg hover:shadow-xl transition-shadow border border-gray-100">
                <div className="text-4xl mb-4">🌤️</div>
                <h3 className="text-xl font-bold mb-3 text-gray-800">실시간 날씨 정보</h3>
                <p className="text-gray-600 leading-relaxed">
                  AccuWeather API로 정확한 날씨 예보와 
                  비가 오기 2시간 전 미리 알림
                </p>
                <div className="mt-4 text-sm text-blue-600 font-medium">
                  ✓ 시간별 날씨 예보 ✓ 강수 알림 ✓ 외출 추천
                </div>
              </div>
              
              <div className="bg-white rounded-xl p-8 shadow-lg hover:shadow-xl transition-shadow border border-gray-100">
                <div className="text-4xl mb-4">😷</div>
                <h3 className="text-xl font-bold mb-3 text-gray-800">미세먼지 농도</h3>
                <p className="text-gray-600 leading-relaxed">
                  에어코리아 API로 실시간 미세먼지 농도와 
                  마스크 착용 권장 알림
                </p>
                <div className="mt-4 text-sm text-green-600 font-medium">
                  ✓ 실시간 농도 ✓ 건강 가이드 ✓ 외출 주의보
                </div>
              </div>
              
              <div className="bg-white rounded-xl p-8 shadow-lg hover:shadow-xl transition-shadow border border-gray-100">
                <div className="text-4xl mb-4">🛒</div>
                <h3 className="text-xl font-bold mb-3 text-gray-800">마트 할인 정보</h3>
                <p className="text-gray-600 leading-relaxed">
                  우리 동네 주요 마트의 할인 정보를 
                  매일 아침 맞춤 제공
                </p>
                <div className="mt-4 text-sm text-orange-600 font-medium">
                  ✓ 할인 상품 알림 ✓ 가격 비교 ✓ 쇼핑 목록
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Benefits Section */}
        <div className="bg-gradient-to-r from-yellow-50 to-orange-50 py-16 rounded-2xl mb-16">
          <div className="max-w-4xl mx-auto text-center px-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-8">
              왜 Townly를 선택해야 할까요?
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="text-3xl mb-3">⚡</div>
                <h4 className="font-semibold mb-2">실시간 알림</h4>
                <p className="text-sm text-gray-600">중요한 정보를 놓치지 않도록 적시에 알림</p>
              </div>
              <div className="text-center">
                <div className="text-3xl mb-3">🎯</div>
                <h4 className="font-semibold mb-2">맞춤형 정보</h4>
                <p className="text-sm text-gray-600">당신의 위치와 선호도에 맞춘 정보 제공</p>
              </div>
              <div className="text-center">
                <div className="text-3xl mb-3">🔒</div>
                <h4 className="font-semibold mb-2">안전한 서비스</h4>
                <p className="text-sm text-gray-600">카카오 로그인으로 안전하게 이용</p>
              </div>
              <div className="text-center">
                <div className="text-3xl mb-3">💰</div>
                <h4 className="font-semibold mb-2">완전 무료</h4>
                <p className="text-sm text-gray-600">모든 기능을 무료로 이용 가능</p>
              </div>
            </div>
          </div>
        </div>
      </SignedOut>

      <SignedIn>
        <WelcomeDashboard />
      </SignedIn>
    </div>
  );
}
