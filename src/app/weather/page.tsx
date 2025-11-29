import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { WeatherDashboard } from '@/components/weather/WeatherDashboard';
import { getUserLocation } from '@/actions/location';

export default async function WeatherPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect('/sign-in');
  }

  // 사용자의 저장된 위치 정보 조회
  let userLocation: Awaited<ReturnType<typeof getUserLocation>>['data'] = null;
  try {
    const locationResult = await getUserLocation();
    if (locationResult.success && locationResult.data) {
      userLocation = locationResult.data;
    }
  } catch (error) {
    console.error('사용자 위치 조회 실패:', error);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Background Effects */}
      <div className="fixed inset-0 opacity-30 pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl animate-blob"></div>
        <div className="absolute top-40 right-10 w-72 h-72 bg-yellow-500 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-4000"></div>
      </div>
      
      <div className="relative max-w-7xl mx-auto px-4 py-8">
        {/* Weather Header - Modern Glassmorphism */}
        <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-8 mb-8 shadow-2xl hover:shadow-cyan-500/25 transition-all duration-500 hover:scale-[1.02]">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
            <div className="text-center lg:text-left">
              <div className="inline-flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-cyan-500 rounded-2xl flex items-center justify-center text-2xl shadow-lg">
                  🌤️
                </div>
                <h1 className="text-4xl lg:text-5xl font-extrabold bg-gradient-to-r from-white via-cyan-200 to-blue-400 bg-clip-text text-transparent leading-tight">
                  실시간 날씨 정보
                </h1>
              </div>
              <p className="text-xl text-white/80 leading-relaxed max-w-2xl">
                🌟 <span className="font-semibold text-cyan-300">AccuWeather AI</span>로 구동되는 정밀한 기상 예보를 확인하세요.
                <br className="hidden sm:block" />
                24시간 예보부터 7일간 상세 전망까지 한눈에 살펴보세요.
              </p>
              {userLocation && (
                <div className="mt-6 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 backdrop-blur-sm border border-cyan-300/30 rounded-xl p-4">
                  <p className="text-cyan-200 font-semibold flex items-center gap-2">
                    <span className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></span>
                    📍 {userLocation.address || `${parseFloat(userLocation.latitude).toFixed(4)}, ${parseFloat(userLocation.longitude).toFixed(4)}`}
                  </p>
                  {userLocation.cityName && (
                    <p className="text-cyan-300/80 text-sm mt-1">
                      🏙️ 날씨 조회 지역: {userLocation.cityName}
                    </p>
                  )}
                </div>
              )}
            </div>
            <div className="relative">
              <div className="w-24 h-24 bg-gradient-to-br from-blue-400 via-cyan-500 to-blue-600 rounded-full flex items-center justify-center text-5xl shadow-2xl animate-pulse">
                ⛅
              </div>
              <div className="absolute -inset-2 bg-gradient-to-r from-blue-400 to-cyan-500 rounded-full opacity-20 blur animate-ping"></div>
            </div>
          </div>
        </div>

        {/* Weather Dashboard Container - Premium Glass Design */}
        <div className="group relative">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-600 rounded-2xl blur opacity-60 group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>
          <div className="relative backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-8 shadow-2xl hover:shadow-cyan-500/25 transition-all duration-500">
            <WeatherDashboard 
              initialLocation={userLocation ? {
                id: userLocation.id,
                clerkUserId: userLocation.clerkUserId,
                latitude: userLocation.latitude,
                longitude: userLocation.longitude,
                address: userLocation.address,
                cityName: userLocation.cityName,
                isDefault: userLocation.isDefault,
                nickname: null,
                accuracy: null,
                source: 'gps',
                createdAt: userLocation.createdAt,
                updatedAt: userLocation.updatedAt,
              } : null} 
            />
          </div>
        </div>
      </div>
    </div>
  );
}
