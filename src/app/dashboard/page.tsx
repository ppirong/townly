import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

export default async function DashboardPage() {
  const { userId } = auth();

  if (!userId) {
    redirect('/sign-in');
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">대시보드</h1>
          <p className="text-gray-600">나의 하이퍼 로컬 정보를 한눈에 확인하세요</p>
        </div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">오늘 받은 알림</p>
                <p className="text-2xl font-bold text-blue-600">12</p>
              </div>
              <div className="text-3xl">📱</div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">확인한 할인</p>
                <p className="text-2xl font-bold text-green-600">8</p>
              </div>
              <div className="text-3xl">🛒</div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">절약한 금액</p>
                <p className="text-2xl font-bold text-orange-600">₩45,000</p>
              </div>
              <div className="text-3xl">💰</div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">이용 일수</p>
                <p className="text-2xl font-bold text-purple-600">15</p>
              </div>
              <div className="text-3xl">📅</div>
            </div>
          </div>
        </div>

        {/* Charts and Recent Activity */}
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Recent Activity */}
          <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
            <h3 className="text-lg font-bold mb-4">최근 활동</h3>
            <div className="space-y-4">
              <div className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg">
                <div className="text-2xl">🌧️</div>
                <div className="flex-1">
                  <p className="font-medium">비 알림을 받았습니다</p>
                  <p className="text-sm text-gray-600">2시간 후 비 예상 - 우산 챙기세요!</p>
                </div>
                <span className="text-xs text-gray-500">10분 전</span>
              </div>
              
              <div className="flex items-center space-x-3 p-3 bg-green-50 rounded-lg">
                <div className="text-2xl">🛒</div>
                <div className="flex-1">
                  <p className="font-medium">할인 정보를 확인했습니다</p>
                  <p className="text-sm text-gray-600">이마트 - 한우 30% 할인</p>
                </div>
                <span className="text-xs text-gray-500">1시간 전</span>
              </div>
              
              <div className="flex items-center space-x-3 p-3 bg-yellow-50 rounded-lg">
                <div className="text-2xl">😷</div>
                <div className="flex-1">
                  <p className="font-medium">미세먼지 알림</p>
                  <p className="text-sm text-gray-600">보통 수준 - 외출 시 주의하세요</p>
                </div>
                <span className="text-xs text-gray-500">3시간 전</span>
              </div>
            </div>
          </div>

          {/* Settings Quick Access */}
          <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
            <h3 className="text-lg font-bold mb-4">빠른 설정</h3>
            <div className="grid grid-cols-2 gap-4">
              <button className="p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">
                <div className="text-2xl mb-2">🔔</div>
                <div className="text-sm font-medium">알림 설정</div>
              </button>
              
              <button className="p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors">
                <div className="text-2xl mb-2">📍</div>
                <div className="text-sm font-medium">위치 관리</div>
              </button>
              
              <button className="p-4 bg-yellow-50 rounded-lg hover:bg-yellow-100 transition-colors">
                <div className="text-2xl mb-2">🛒</div>
                <div className="text-sm font-medium">관심 상품</div>
              </button>
              
              <button className="p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors">
                <div className="text-2xl mb-2">⚙️</div>
                <div className="text-sm font-medium">계정 설정</div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
