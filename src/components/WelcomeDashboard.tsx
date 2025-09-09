'use client';

import { useUser } from '@clerk/nextjs';
import { useState } from 'react';

export default function WelcomeDashboard() {
  const { user } = useUser();
  const [locationPermission, setLocationPermission] = useState<'granted' | 'denied' | 'prompt'>('prompt');
  const [currentLocation, setCurrentLocation] = useState<string>('');

  const handleLocationRequest = async () => {
    if (!navigator.geolocation) {
      alert('브라우저에서 위치 서비스를 지원하지 않습니다.');
      return;
    }

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        });
      });

      const { latitude, longitude } = position.coords;
      
      // 역지오코딩을 통해 주소 가져오기 (임시로 좌표 표시)
      setCurrentLocation(`위도: ${latitude.toFixed(4)}, 경도: ${longitude.toFixed(4)}`);
      setLocationPermission('granted');
      
      // 여기에 서버로 위치 정보 전송 로직 추가
      console.log('위치 정보:', { latitude, longitude });
      
    } catch (error) {
      console.error('위치 정보 가져오기 실패:', error);
      setLocationPermission('denied');
      alert('위치 정보를 가져올 수 없습니다. 브라우저 설정을 확인해주세요.');
    }
  };

  const handleKakaoConnect = () => {
    // 카카오톡 채널 연결 로직
    window.open('https://pf.kakao.com/_your_channel_id', '_blank');
  };

  return (
    <div className="max-w-6xl mx-auto">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-yellow-400 to-orange-400 rounded-2xl p-8 mb-8 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">
              안녕하세요, {user?.firstName || '회원'}님! 👋
            </h1>
            <p className="text-lg opacity-90">
              Townly에 오신 것을 환영합니다. 하이퍼 로컬 정보 서비스를 시작해보세요.
            </p>
          </div>
          <div className="text-6xl">🏘️</div>
        </div>
      </div>

      {/* Setup Cards */}
      <div className="grid md:grid-cols-2 gap-8 mb-8">
        <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-xl font-bold mb-2 flex items-center">
                🗺️ 위치 설정
                {locationPermission === 'granted' && (
                  <span className="ml-2 bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                    완료
                  </span>
                )}
              </h3>
              <p className="text-gray-600 mb-4">
                GPS를 통해 현재 위치를 설정하고 지역별 맞춤 정보를 받아보세요.
              </p>
              {currentLocation && (
                <p className="text-sm text-blue-600 mb-4">
                  📍 현재 위치: {currentLocation}
                </p>
              )}
            </div>
          </div>
          
          <button 
            onClick={handleLocationRequest}
            disabled={locationPermission === 'granted'}
            className={`w-full font-medium py-3 px-4 rounded-lg transition-all ${
              locationPermission === 'granted'
                ? 'bg-green-100 text-green-800 cursor-not-allowed'
                : 'bg-blue-500 text-white hover:bg-blue-600 transform hover:scale-105'
            }`}
          >
            {locationPermission === 'granted' 
              ? '✅ 위치 설정 완료' 
              : '📍 위치 설정하기'
            }
          </button>
        </div>
        
        <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-xl font-bold mb-2">💬 카카오톡 채널</h3>
              <p className="text-gray-600 mb-4">
                카카오톡 채널을 추가하고 실시간 알림을 받아보세요.
              </p>
              <div className="text-sm text-gray-500 mb-4">
                • 날씨 변화 알림<br />
                • 미세먼지 주의보<br />
                • 마트 할인 정보
              </div>
            </div>
          </div>
          
          <button 
            onClick={handleKakaoConnect}
            className="w-full bg-yellow-400 text-black font-medium py-3 px-4 rounded-lg hover:bg-yellow-500 transition-all transform hover:scale-105"
          >
            💬 카카오톡 채널 추가하기
          </button>
        </div>
      </div>

      {/* Information Cards */}
      <div className="grid md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold">오늘의 날씨</h3>
            <div className="text-2xl">🌤️</div>
          </div>
          <div className="text-center py-4">
            <div className="text-3xl font-bold text-blue-600 mb-1">22°C</div>
            <p className="text-gray-600 mb-2">맑음</p>
            <p className="text-sm text-gray-500">습도 65% • 바람 2.3m/s</p>
          </div>
          <div className="bg-blue-50 rounded-lg p-3 text-sm">
            <p className="text-blue-800">☀️ 외출하기 좋은 날씨입니다!</p>
          </div>
        </div>
        
        <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold">미세먼지</h3>
            <div className="text-2xl">😷</div>
          </div>
          <div className="text-center py-4">
            <div className="text-3xl font-bold text-green-600 mb-1">좋음</div>
            <p className="text-gray-600 mb-2">PM2.5: 15㎍/㎥</p>
            <p className="text-sm text-gray-500">PM10: 25㎍/㎥</p>
          </div>
          <div className="bg-green-50 rounded-lg p-3 text-sm">
            <p className="text-green-800">✅ 마스크 없이 외출 가능합니다</p>
          </div>
        </div>
        
        <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold">오늘의 할인</h3>
            <div className="text-2xl">🛒</div>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm">🥬 배추 (이마트)</span>
              <span className="text-red-600 font-bold">30% ↓</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">🥩 한우 (롯데마트)</span>
              <span className="text-red-600 font-bold">25% ↓</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">🍎 사과 (홈플러스)</span>
              <span className="text-red-600 font-bold">40% ↓</span>
            </div>
          </div>
          <button className="w-full mt-4 bg-orange-100 text-orange-800 font-medium py-2 px-4 rounded-lg hover:bg-orange-200 transition-colors">
            더 많은 할인 보기
          </button>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-8 bg-gray-50 rounded-xl p-6">
        <h3 className="text-lg font-bold mb-4">빠른 작업</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button className="bg-white p-4 rounded-lg hover:shadow-md transition-shadow">
            <div className="text-2xl mb-2">🔔</div>
            <div className="text-sm font-medium">알림 설정</div>
          </button>
          <button className="bg-white p-4 rounded-lg hover:shadow-md transition-shadow">
            <div className="text-2xl mb-2">📍</div>
            <div className="text-sm font-medium">관심 지역</div>
          </button>
          <button className="bg-white p-4 rounded-lg hover:shadow-md transition-shadow">
            <div className="text-2xl mb-2">📊</div>
            <div className="text-sm font-medium">이용 통계</div>
          </button>
          <button className="bg-white p-4 rounded-lg hover:shadow-md transition-shadow">
            <div className="text-2xl mb-2">⚙️</div>
            <div className="text-sm font-medium">환경 설정</div>
          </button>
        </div>
      </div>
    </div>
  );
}
