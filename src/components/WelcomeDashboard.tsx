'use client';

import { useUser } from '@clerk/nextjs';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { setUserLocation, getUserLocation } from '@/actions/location';
import type { ClientUserLocation } from '@/lib/dto/location-mappers';

export default function WelcomeDashboard() {
  const { user } = useUser();
  const router = useRouter();
  const [locationPermission, setLocationPermission] = useState<'granted' | 'denied' | 'prompt'>('prompt');
  const [currentLocation, setCurrentLocation] = useState<string>('');
  const [savedLocation, setSavedLocation] = useState<ClientUserLocation | null>(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);

  // 컴포넌트 마운트 시 저장된 위치 정보 조회
  useEffect(() => {
    loadSavedLocation();
  }, []);

  const loadSavedLocation = async () => {
    try {
      const result = await getUserLocation();
      if (result.success && result.data) {
        const mappedLocation: ClientUserLocation = {
          id: result.data.id,
          clerkUserId: result.data.clerkUserId,
          latitude: result.data.latitude,
          longitude: result.data.longitude,
          address: result.data.address,
          cityName: result.data.cityName,
          isDefault: result.data.isDefault,
          nickname: null,
          accuracy: null,
          source: 'gps',
          createdAt: result.data.createdAt,
          updatedAt: result.data.updatedAt,
        };
        setSavedLocation(mappedLocation);
        setLocationPermission('granted');
        setCurrentLocation(result.data.address || `위도: ${parseFloat(result.data.latitude).toFixed(4)}, 경도: ${parseFloat(result.data.longitude).toFixed(4)}`);
      }
    } catch (error) {
      console.error('저장된 위치 조회 실패:', error);
    }
  };

  const handleLocationRequest = async () => {
    if (!navigator.geolocation) {
      alert('브라우저에서 위치 서비스를 지원하지 않습니다.');
      return;
    }

    setIsLoadingLocation(true);

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        });
      });

      const { latitude, longitude, accuracy } = position.coords;
      
      // 역지오코딩을 통해 주소 가져오기 (Kakao API 사용)
      let address = '';
      let cityName = '';
      
      try {
        const geocodeResponse = await fetch(`/api/kakao/geocode?lat=${latitude}&lng=${longitude}`);
        if (geocodeResponse.ok) {
          const geocodeData = await geocodeResponse.json();
          if (geocodeData.success && geocodeData.data) {
            address = geocodeData.data.address;
            cityName = geocodeData.data.city;
          }
        }
      } catch (geocodeError) {
        console.warn('역지오코딩 실패:', geocodeError);
      }
      
      // 서버에 위치 정보 저장
      try {
        const result = await setUserLocation({
          latitude: latitude.toString(),
          longitude: longitude.toString(),
          address: address || undefined,
          cityName: cityName || undefined,
          accuracy: accuracy ? Math.round(accuracy) : undefined,
          source: 'gps',
        });
        
        if (result.success) {
          setSavedLocation(result.data);
          setCurrentLocation(address || `위도: ${latitude.toFixed(4)}, 경도: ${longitude.toFixed(4)}`);
          setLocationPermission('granted');
        }
      } catch (saveError) {
        console.error('위치 저장 실패:', saveError);
        alert('위치 정보를 저장하는데 실패했습니다.');
      }
      
    } catch (error) {
      console.error('위치 정보 가져오기 실패:', error);
      setLocationPermission('denied');
      alert('위치 정보를 가져올 수 없습니다. 브라우저 설정을 확인해주세요.');
    } finally {
      setIsLoadingLocation(false);
    }
  };

  const handleKakaoConnect = () => {
    // 카카오톡 채널 연결 로직
    window.open('https://pf.kakao.com/_your_channel_id', '_blank');
  };

  const handleWeatherClick = () => {
    router.push('/weather');
  };

  const handleAirQualityClick = () => {
    router.push('/airquality');
  };

  const handleGoogleAirQualityClick = () => {
    router.push('/airquality-google');
  };

  return (
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
                <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-2xl flex items-center justify-center text-2xl shadow-lg">
                  👋
                </div>
                <h1 className="text-4xl lg:text-5xl font-extrabold bg-gradient-to-r from-white via-yellow-200 to-yellow-400 bg-clip-text text-transparent leading-tight">
                  안녕하세요, {user?.firstName || '회원'}님!
                </h1>
              </div>
              <p className="text-xl text-white/80 leading-relaxed max-w-2xl">
                🏘️ <span className="font-semibold text-yellow-300">Townly</span>에 오신 것을 환영합니다. 
                <br className="hidden sm:block" />
                AI 기반 하이퍼 로컬 정보 서비스를 경험해보세요.
              </p>
            </div>
            <div className="relative">
              <div className="w-24 h-24 bg-gradient-to-br from-yellow-400 via-orange-500 to-pink-500 rounded-full flex items-center justify-center text-5xl shadow-2xl animate-pulse">
                🏘️
              </div>
              <div className="absolute -inset-2 bg-gradient-to-r from-yellow-400 to-pink-500 rounded-full opacity-20 blur animate-ping"></div>
            </div>
          </div>
        </div>

        {/* Setup Cards - Enhanced with Modern Design */}
        <div className="grid md:grid-cols-2 gap-8 mb-12">
          {/* Location Setup Card */}
          <div className="group relative">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-teal-500 rounded-2xl blur opacity-60 group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>
            <div className="relative backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-8 shadow-2xl hover:shadow-blue-500/25 transition-all duration-500">
              <div className="flex items-start justify-between mb-6">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-teal-500 rounded-xl flex items-center justify-center text-2xl shadow-lg">
                      🗺️
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-white flex items-center gap-3">
                        위치 설정
                        {locationPermission === 'granted' && (
                          <span className="bg-gradient-to-r from-green-400 to-emerald-500 text-white text-sm px-3 py-1 rounded-full animate-pulse shadow-lg">
                            ✅ 완료
                          </span>
                        )}
                      </h3>
                      <p className="text-blue-200 mt-1 font-medium">Smart Location Service</p>
                    </div>
                  </div>
                  <p className="text-white/80 mb-6 leading-relaxed">
                    AI 기반 정밀 위치 인식으로 초개인화된 지역 정보를 경험해보세요.
                  </p>
                  {currentLocation && (
                    <div className="bg-gradient-to-r from-blue-500/20 to-teal-500/20 backdrop-blur-sm border border-blue-300/30 rounded-xl p-4 mb-6">
                      <p className="text-blue-200 font-semibold flex items-center gap-2">
                        <span className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></span>
                        📍 {currentLocation}
                      </p>
                    </div>
                  )}
                </div>
              </div>
              
              <button 
                onClick={handleLocationRequest}
                disabled={locationPermission === 'granted' || isLoadingLocation}
                className={`w-full font-bold py-4 px-6 rounded-xl transition-all duration-300 transform ${
                  locationPermission === 'granted'
                    ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg cursor-not-allowed'
                    : isLoadingLocation
                    ? 'bg-gradient-to-r from-gray-500 to-gray-600 text-white cursor-not-allowed animate-pulse'
                    : 'bg-gradient-to-r from-blue-500 to-teal-600 text-white hover:from-blue-600 hover:to-teal-700 hover:scale-[1.02] shadow-xl hover:shadow-blue-500/50 active:scale-[0.98]'
                }`}
              >
                {isLoadingLocation 
                  ? '🔄 AI가 위치를 분석중입니다...' 
                  : locationPermission === 'granted' 
                    ? '✅ 위치 설정 완료' 
                    : '🚀 스마트 위치 설정 시작하기'
                }
              </button>
              
              {savedLocation && (
                <div className="mt-6 bg-gradient-to-r from-green-500/10 to-emerald-500/10 backdrop-blur-sm border border-green-300/30 rounded-xl p-5 space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></span>
                    <p className="text-green-200 font-semibold">설정된 위치: {currentLocation}</p>
                  </div>
                  {savedLocation.cityName && (
                    <p className="text-green-300 text-sm ml-5">
                      🏙️ 서비스 지역: {savedLocation.cityName}
                    </p>
                  )}
                  <p className="text-green-300/80 text-xs ml-5">
                    ⏰ 업데이트: {savedLocation.updatedAt ? new Date(savedLocation.updatedAt).toLocaleString('ko-KR') : '정보 없음'}
                  </p>
                </div>
              )}
            </div>
          </div>
          
          {/* Kakao Channel Card */}
          <div className="group relative">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-2xl blur opacity-60 group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>
            <div className="relative backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-8 shadow-2xl hover:shadow-yellow-500/25 transition-all duration-500">
              <div className="flex items-start justify-between mb-6">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-xl flex items-center justify-center text-2xl shadow-lg">
                      💬
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-white">카카오톡 채널</h3>
                      <p className="text-yellow-200 mt-1 font-medium">Real-time Notification</p>
                    </div>
                  </div>
                  <p className="text-white/80 mb-6 leading-relaxed">
                    실시간 AI 분석으로 가장 중요한 순간에 맞춤 알림을 받아보세요.
                  </p>
                  
                  <div className="space-y-3 mb-6">
                    <div className="flex items-center gap-3 text-white/90">
                      <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-blue-600 rounded-lg flex items-center justify-center text-sm">🌤️</div>
                      <span className="font-medium">실시간 날씨 변화 알림</span>
                    </div>
                    <div className="flex items-center gap-3 text-white/90">
                      <div className="w-8 h-8 bg-gradient-to-br from-green-400 to-green-600 rounded-lg flex items-center justify-center text-sm">😷</div>
                      <span className="font-medium">미세먼지 위험 수준 알림</span>
                    </div>
                    <div className="flex items-center gap-3 text-white/90">
                      <div className="w-8 h-8 bg-gradient-to-br from-orange-400 to-orange-600 rounded-lg flex items-center justify-center text-sm">🛒</div>
                      <span className="font-medium">AI 맞춤 할인 정보</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <button 
                onClick={handleKakaoConnect}
                className="w-full bg-gradient-to-r from-yellow-400 to-orange-500 text-black font-bold py-4 px-6 rounded-xl hover:from-yellow-500 hover:to-orange-600 transition-all duration-300 transform hover:scale-[1.02] shadow-xl hover:shadow-yellow-500/50 active:scale-[0.98]"
              >
                🚀 카카오톡 채널 연결하기
              </button>
            </div>
          </div>
        </div>

        {/* Information Cards - Premium Glass Design */}
        <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-6 mb-12">
          {/* Weather Card */}
          <div 
            className="group relative cursor-pointer"
            onClick={handleWeatherClick}
          >
            <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-600 rounded-2xl blur opacity-60 group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>
            <div className="relative backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-6 shadow-2xl hover:shadow-cyan-500/25 transition-all duration-500 transform hover:scale-[1.03] hover:-translate-y-1">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-bold text-white mb-1">오늘의 날씨</h3>
                  <p className="text-cyan-200 text-sm font-medium">AccuWeather AI</p>
                </div>
                <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-cyan-500 rounded-2xl flex items-center justify-center text-2xl shadow-lg animate-bounce">
                  🌤️
                </div>
              </div>
              
              <div className="text-center py-6 space-y-2">
                <div className="text-5xl font-black bg-gradient-to-r from-blue-300 to-cyan-400 bg-clip-text text-transparent mb-2">22°C</div>
                <p className="text-white font-semibold text-lg">맑음</p>
                <div className="flex justify-center gap-4 text-sm text-white/70">
                  <span>💧 65%</span>
                  <span>💨 2.3m/s</span>
                </div>
              </div>
              
              <div className="bg-gradient-to-r from-blue-500/20 to-cyan-500/20 backdrop-blur-sm border border-blue-300/30 rounded-xl p-4">
                <p className="text-cyan-200 flex items-center justify-between font-medium">
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></span>
                    ☀️ 외출하기 좋은 날씨입니다!
                  </span>
                  <span className="text-cyan-300 group-hover:translate-x-1 transition-transform">→</span>
                </p>
              </div>
            </div>
          </div>
          
          {/* Air Quality Card */}
          <div 
            className="group relative cursor-pointer"
            onClick={handleAirQualityClick}
          >
            <div className="absolute -inset-0.5 bg-gradient-to-r from-green-400 via-emerald-400 to-green-600 rounded-2xl blur opacity-60 group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>
            <div className="relative backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-6 shadow-2xl hover:shadow-emerald-500/25 transition-all duration-500 transform hover:scale-[1.03] hover:-translate-y-1">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-bold text-white mb-1">미세먼지</h3>
                  <p className="text-emerald-200 text-sm font-medium">에어코리아 API</p>
                </div>
                <div className="w-16 h-16 bg-gradient-to-br from-green-400 to-emerald-500 rounded-2xl flex items-center justify-center text-2xl shadow-lg">
                  😷
                </div>
              </div>
              
              <div className="text-center py-6 space-y-2">
                <div className="text-4xl font-black bg-gradient-to-r from-green-300 to-emerald-400 bg-clip-text text-transparent mb-2">좋음</div>
                <p className="text-white/80 font-medium">PM2.5: 15㎍/㎥</p>
                <p className="text-white/60 text-sm">PM10: 25㎍/㎥</p>
              </div>
              
              <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 backdrop-blur-sm border border-green-300/30 rounded-xl p-4">
                <p className="text-emerald-200 flex items-center justify-between font-medium">
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></span>
                    ✅ 마스크 없이 외출 가능
                  </span>
                  <span className="text-emerald-300 group-hover:translate-x-1 transition-transform">→</span>
                </p>
              </div>
            </div>
          </div>
          
          {/* Google Air Quality Card */}
          <div 
            className="group relative cursor-pointer"
            onClick={handleGoogleAirQualityClick}
          >
            <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-400 via-violet-400 to-purple-600 rounded-2xl blur opacity-60 group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>
            <div className="relative backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-6 shadow-2xl hover:shadow-purple-500/25 transition-all duration-500 transform hover:scale-[1.03] hover:-translate-y-1">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-bold text-white mb-1">Google AI</h3>
                  <p className="text-violet-200 text-sm font-medium">미세먼지 예보</p>
                </div>
                <div className="w-16 h-16 bg-gradient-to-br from-purple-400 to-violet-500 rounded-2xl flex items-center justify-center text-2xl shadow-lg">
                  🌬️
                </div>
              </div>
              
              <div className="text-center py-6 space-y-2">
                <div className="text-4xl font-black bg-gradient-to-r from-purple-300 to-violet-400 bg-clip-text text-transparent mb-2">AQI 65</div>
                <p className="text-white font-semibold">좋은 공기질</p>
                <p className="text-white/60 text-sm">CAI: 42 • BreezoMeter</p>
              </div>
              
              <div className="bg-gradient-to-r from-purple-500/20 to-violet-500/20 backdrop-blur-sm border border-purple-300/30 rounded-xl p-4">
                <p className="text-violet-200 flex items-center justify-between font-medium">
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-violet-400 rounded-full animate-pulse"></span>
                    🧠 Google AI 정밀 예보
                  </span>
                  <span className="text-violet-300 group-hover:translate-x-1 transition-transform">→</span>
                </p>
              </div>
            </div>
          </div>
          
          {/* Discount Card */}
          <div className="group relative">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-orange-400 via-red-400 to-pink-500 rounded-2xl blur opacity-60 group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>
            <div className="relative backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-6 shadow-2xl hover:shadow-orange-500/25 transition-all duration-500 transform hover:scale-[1.03] hover:-translate-y-1">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-bold text-white mb-1">오늘의 할인</h3>
                  <p className="text-orange-200 text-sm font-medium">AI 맞춤 추천</p>
                </div>
                <div className="w-16 h-16 bg-gradient-to-br from-orange-400 to-red-500 rounded-2xl flex items-center justify-center text-2xl shadow-lg animate-pulse">
                  🛒
                </div>
              </div>
              
              <div className="space-y-4 mb-6">
                <div className="flex justify-between items-center bg-gradient-to-r from-red-500/10 to-orange-500/10 backdrop-blur-sm border border-red-300/20 rounded-lg p-3">
                  <span className="text-white font-medium flex items-center gap-2">
                    <span className="text-lg">🥬</span>
                    <div>
                      <p className="font-semibold">배추</p>
                      <p className="text-xs text-white/60">이마트</p>
                    </div>
                  </span>
                  <div className="text-right">
                    <span className="text-red-300 font-black text-lg">30%</span>
                    <p className="text-red-400 text-xs">할인</p>
                  </div>
                </div>
                <div className="flex justify-between items-center bg-gradient-to-r from-red-500/10 to-orange-500/10 backdrop-blur-sm border border-red-300/20 rounded-lg p-3">
                  <span className="text-white font-medium flex items-center gap-2">
                    <span className="text-lg">🥩</span>
                    <div>
                      <p className="font-semibold">한우</p>
                      <p className="text-xs text-white/60">롯데마트</p>
                    </div>
                  </span>
                  <div className="text-right">
                    <span className="text-red-300 font-black text-lg">25%</span>
                    <p className="text-red-400 text-xs">할인</p>
                  </div>
                </div>
              </div>
              
              <button className="w-full bg-gradient-to-r from-orange-500 to-red-600 text-white font-bold py-3 px-4 rounded-xl hover:from-orange-600 hover:to-red-700 transition-all duration-300 transform hover:scale-[1.02] shadow-lg">
                🔥 더 많은 할인 보기
              </button>
            </div>
          </div>
        </div>

        {/* Quick Actions - Advanced Interactive Grid */}
        <div className="relative">
          <div className="absolute -inset-1 bg-gradient-to-r from-pink-300 via-purple-300 to-indigo-400 rounded-3xl blur-sm opacity-30"></div>
          <div className="relative backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-8 shadow-2xl">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center shadow-lg">
                ⚡
              </div>
              <div>
                <h3 className="text-2xl font-bold text-white">빠른 작업</h3>
                <p className="text-white/70 text-sm">원터치로 필요한 정보에 바로 접근하세요</p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
              <button 
                onClick={handleWeatherClick}
                className="group relative bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm border border-white/20 p-5 rounded-2xl hover:from-blue-500/20 hover:to-cyan-500/20 hover:border-blue-400/50 transition-all duration-300 transform hover:scale-105 hover:-translate-y-1 active:scale-95"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-blue-400/0 to-cyan-400/0 group-hover:from-blue-400/10 group-hover:to-cyan-400/10 rounded-2xl transition-all duration-300"></div>
                <div className="relative">
                  <div className="text-3xl mb-3 transform group-hover:scale-110 transition-transform duration-300">🌤️</div>
                  <div className="text-sm font-bold text-white group-hover:text-blue-200 transition-colors">날씨 정보</div>
                  <div className="text-xs text-white/60 mt-1">실시간 예보</div>
                </div>
              </button>
              
              <button 
                onClick={handleAirQualityClick}
                className="group relative bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm border border-white/20 p-5 rounded-2xl hover:from-green-500/20 hover:to-emerald-500/20 hover:border-green-400/50 transition-all duration-300 transform hover:scale-105 hover:-translate-y-1 active:scale-95"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-green-400/0 to-emerald-400/0 group-hover:from-green-400/10 group-hover:to-emerald-400/10 rounded-2xl transition-all duration-300"></div>
                <div className="relative">
                  <div className="text-3xl mb-3 transform group-hover:scale-110 transition-transform duration-300">😷</div>
                  <div className="text-sm font-bold text-white group-hover:text-green-200 transition-colors">미세먼지</div>
                  <div className="text-xs text-white/60 mt-1">에어코리아</div>
                </div>
              </button>
              
              <button 
                onClick={handleGoogleAirQualityClick}
                className="group relative bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm border border-white/20 p-5 rounded-2xl hover:from-purple-500/20 hover:to-violet-500/20 hover:border-purple-400/50 transition-all duration-300 transform hover:scale-105 hover:-translate-y-1 active:scale-95"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-purple-400/0 to-violet-400/0 group-hover:from-purple-400/10 group-hover:to-violet-400/10 rounded-2xl transition-all duration-300"></div>
                <div className="relative">
                  <div className="text-3xl mb-3 transform group-hover:scale-110 transition-transform duration-300">🌬️</div>
                  <div className="text-sm font-bold text-white group-hover:text-purple-200 transition-colors">Google AI</div>
                  <div className="text-xs text-white/60 mt-1">정밀 예보</div>
                </div>
              </button>
              
              <button className="group relative bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm border border-white/20 p-5 rounded-2xl hover:from-yellow-500/20 hover:to-orange-500/20 hover:border-yellow-400/50 transition-all duration-300 transform hover:scale-105 hover:-translate-y-1 active:scale-95">
                <div className="absolute inset-0 bg-gradient-to-br from-yellow-400/0 to-orange-400/0 group-hover:from-yellow-400/10 group-hover:to-orange-400/10 rounded-2xl transition-all duration-300"></div>
                <div className="relative">
                  <div className="text-3xl mb-3 transform group-hover:scale-110 transition-transform duration-300">🔔</div>
                  <div className="text-sm font-bold text-white group-hover:text-yellow-200 transition-colors">알림 설정</div>
                  <div className="text-xs text-white/60 mt-1">맞춤 알림</div>
                </div>
              </button>
              
              <button className="group relative bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm border border-white/20 p-5 rounded-2xl hover:from-indigo-500/20 hover:to-blue-500/20 hover:border-indigo-400/50 transition-all duration-300 transform hover:scale-105 hover:-translate-y-1 active:scale-95">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-400/0 to-blue-400/0 group-hover:from-indigo-400/10 group-hover:to-blue-400/10 rounded-2xl transition-all duration-300"></div>
                <div className="relative">
                  <div className="text-3xl mb-3 transform group-hover:scale-110 transition-transform duration-300">📍</div>
                  <div className="text-sm font-bold text-white group-hover:text-indigo-200 transition-colors">관심 지역</div>
                  <div className="text-xs text-white/60 mt-1">지역 관리</div>
                </div>
              </button>
              
              <button className="group relative bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm border border-white/20 p-5 rounded-2xl hover:from-pink-500/20 hover:to-rose-500/20 hover:border-pink-400/50 transition-all duration-300 transform hover:scale-105 hover:-translate-y-1 active:scale-95">
                <div className="absolute inset-0 bg-gradient-to-br from-pink-400/0 to-rose-400/0 group-hover:from-pink-400/10 group-hover:to-rose-400/10 rounded-2xl transition-all duration-300"></div>
                <div className="relative">
                  <div className="text-3xl mb-3 transform group-hover:scale-110 transition-transform duration-300">⚙️</div>
                  <div className="text-sm font-bold text-white group-hover:text-pink-200 transition-colors">환경 설정</div>
                  <div className="text-xs text-white/60 mt-1">개인화 설정</div>
                </div>
              </button>
            </div>
            
            {/* Additional Feature Highlight */}
            <div className="mt-8 pt-6 border-t border-white/10">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/70 text-sm">✨ <span className="font-semibold text-white">AI 기반 스마트 대시보드</span>가 당신의 하루를 더 편리하게 만들어드립니다</p>
                </div>
                <div className="flex space-x-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse animation-delay-200"></div>
                  <div className="w-2 h-2 bg-pink-400 rounded-full animate-pulse animation-delay-400"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
