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
    <div className="container mx-auto py-8">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">날씨 정보</h1>
          <p className="text-muted-foreground">
            MCP Weather Server를 통한 실시간 날씨 정보를 확인하세요
          </p>
          {userLocation && (
            <div className="mt-3 p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center gap-2">
                <span className="text-blue-600">📍</span>
                <div>
                  <p className="text-sm font-medium text-blue-800">
                    설정된 위치: {userLocation.address || `${parseFloat(userLocation.latitude).toFixed(4)}, ${parseFloat(userLocation.longitude).toFixed(4)}`}
                  </p>
                  {userLocation.cityName && (
                    <p className="text-xs text-blue-600">
                      날씨 조회 지역: {userLocation.cityName}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
        
        <WeatherDashboard initialLocation={userLocation} />
      </div>
    </div>
  );
}
