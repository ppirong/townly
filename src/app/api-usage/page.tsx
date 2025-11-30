'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { getGoogleAirQualityApiUsage } from '@/actions/google-air-quality';

interface WeatherApiStats {
  today: {
    date: string;
    totalCalls: number;
    successfulCalls: number;
    failedCalls: number;
    successRate: number;
    avgResponseTime: number;
    hourlyUsage: Array<{ hour: number; calls: number }>;
    endpointUsage: Record<string, { calls: number; avgResponseTime: number }>;
  };
  limit: {
    current: number;
    limit: number;
    remaining: number;
    percentage: number;
    canMakeRequest: boolean;
    status: 'ok' | 'warning' | 'critical';
  };
  recent: {
    days: number;
    stats: Array<{
      date: string;
      totalCalls: number;
      successRate: number;
      avgResponseTime: number;
    }>;
    totalCalls: number;
    averageDaily: number;
  };
  recommendations: {
    shouldOptimizeCache: boolean;
    shouldUpgradePlan: boolean;
    peakHours: number[];
  };
}

interface GoogleApiStats {
  totalCalls: number;
  successfulCalls: number;
  failedCalls: number;
  avgResponseTime: number;
  dailyLimit: number;
  remainingCalls: number;
  usagePercentage: number;
}

export default function ApiUsagePage() {
  const [apiStats, setApiStats] = useState<WeatherApiStats | null>(null);
  const [googleApiStats, setGoogleApiStats] = useState<GoogleApiStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [googleLoading, setGoogleLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [googleError, setGoogleError] = useState<string | null>(null);
  const [cacheClearing, setCacheClearing] = useState(false);

  useEffect(() => {
    fetchApiStats();
    fetchGoogleApiStats();
  }, []);

  const fetchApiStats = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/weather/stats');
      const result = await response.json();
      
      if (result.success) {
        setApiStats(result.data);
      } else {
        setError('API 통계 조회에 실패했습니다: ' + (result.error || '알 수 없는 오류'));
      }
    } catch (error) {
      console.error('API 통계 조회 실패:', error);
      setError('API 통계를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const fetchGoogleApiStats = async () => {
    setGoogleLoading(true);
    setGoogleError(null);
    
    try {
      const stats = await getGoogleAirQualityApiUsage();
      setGoogleApiStats(stats);
    } catch (error) {
      console.error('Google API 통계 조회 실패:', error);
      setGoogleError('Google API 통계를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setGoogleLoading(false);
    }
  };

  const clearCacheAndRefresh = async () => {
    setCacheClearing(true);
    setError(null);
    
    try {
      const response = await fetch('/api/weather/cache', {
        method: 'DELETE'
      });
      
      if (response.ok) {
        setError('✅ 캐시가 삭제되었습니다.');
        // 캐시 삭제 후 통계 새로고침
        await fetchApiStats();
      } else {
        throw new Error('캐시 삭제 실패');
      }
    } catch (error) {
      console.error('캐시 삭제 실패:', error);
      setError('캐시 삭제에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setCacheClearing(false);
    }
  };

  const refreshAllStats = async () => {
    await Promise.all([fetchApiStats(), fetchGoogleApiStats()]);
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
        {/* Header - Premium Glass Design */}
        <div className="group relative mb-8">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-400 via-violet-400 to-purple-600 rounded-3xl blur opacity-60 group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>
          <div className="relative backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-8 shadow-2xl hover:shadow-purple-500/25 transition-all duration-500 hover:scale-[1.02]">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-violet-500 rounded-2xl flex items-center justify-center shadow-lg">
                📊
              </div>
              <div>
                <h1 className="text-4xl lg:text-5xl font-extrabold bg-gradient-to-r from-white via-purple-200 to-violet-400 bg-clip-text text-transparent leading-tight">
                  API 사용량 대시보드
                </h1>
                <p className="text-xl text-purple-200 leading-relaxed mt-2">
                  🔍 실시간 API 호출 현황 및 성능 모니터링
                </p>
              </div>
            </div>
            
            {/* Control Buttons */}
            <div className="flex flex-wrap gap-3">
              <button 
                onClick={refreshAllStats}
                disabled={loading || googleLoading}
                className={`font-bold py-3 px-6 rounded-xl transition-all duration-300 transform flex items-center gap-2 ${
                  loading || googleLoading
                    ? 'bg-gradient-to-r from-gray-500 to-gray-600 text-white cursor-not-allowed animate-pulse'
                    : 'bg-gradient-to-r from-purple-500 to-violet-600 text-white hover:from-purple-600 hover:to-violet-700 hover:scale-[1.02] shadow-xl hover:shadow-purple-500/50 active:scale-[0.98]'
                }`}
              >
                {loading || googleLoading ? (
                  <>
                    <span className="animate-spin">⏳</span>
                    새로고침 중...
                  </>
                ) : (
                  <>
                    <span>🔄</span>
                    모든 통계 새로고침
                  </>
                )}
              </button>
              
              <button 
                onClick={clearCacheAndRefresh}
                disabled={loading || googleLoading || cacheClearing}
                className={`font-bold py-3 px-6 rounded-xl transition-all duration-300 transform flex items-center gap-2 ${
                  loading || googleLoading || cacheClearing
                    ? 'bg-gradient-to-r from-gray-500 to-gray-600 text-white cursor-not-allowed animate-pulse'
                    : 'bg-gradient-to-r from-red-500 to-pink-600 text-white hover:from-red-600 hover:to-pink-700 hover:scale-[1.02] shadow-xl hover:shadow-red-500/50 active:scale-[0.98]'
                }`}
              >
                {cacheClearing ? (
                  <>
                    <span className="animate-spin">🗑️</span>
                    캐시 삭제 중...
                  </>
                ) : (
                  <>
                    <span>🗑️</span>
                    날씨 캐시 삭제
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {(error || googleError) && (
          <div className="group relative mb-8 space-y-4">
            {error && (
              <div className={`relative p-4 rounded-xl border backdrop-blur-sm ${
                error.includes('✅') ? 
                  'bg-gradient-to-r from-green-500/20 to-emerald-500/20 border-green-300/30' : 
                'bg-gradient-to-r from-red-500/20 to-pink-500/20 border-red-300/30'
              }`}>
                <div className={`text-sm font-medium ${
                  error.includes('✅') ? 'text-green-200' : 'text-red-200'
                }`}>
                  {error}
                </div>
              </div>
            )}
            {googleError && (
              <div className="relative p-4 rounded-xl border backdrop-blur-sm bg-gradient-to-r from-red-500/20 to-pink-500/20 border-red-300/30">
                <div className="text-sm font-medium text-red-200">
                  {googleError}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Loading State */}
        {(loading && !apiStats) || (googleLoading && !googleApiStats) ? (
          <div className="group relative">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-600 rounded-2xl blur opacity-60"></div>
            <div className="relative backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-12 shadow-2xl text-center">
              <div className="text-6xl mb-4 animate-bounce">📊</div>
              <h3 className="text-2xl font-bold text-white mb-2">API 통계 로딩 중...</h3>
              <p className="text-white/70">잠시만 기다려주세요</p>
            </div>
          </div>
        ) : null}

        {/* API Stats Display */}
        {(apiStats || googleApiStats) && (
          <div className="space-y-8">
            {/* Google Air Quality API 사용량 - Premium Glass Design */}
            {googleApiStats && (
              <div className="group relative">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-green-400 via-emerald-400 to-green-600 rounded-2xl blur opacity-60 group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>
                <div className="relative backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-6 shadow-2xl hover:shadow-green-500/25 transition-all duration-500 hover:scale-[1.02]">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center shadow-lg">
                      📊
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white">Google Air Quality API 사용량</h3>
                      <p className="text-emerald-200 text-sm font-medium">오늘의 API 호출 현황 및 무료 한도 관리</p>
                    </div>
                  </div>
                  
                  <div className="space-y-6">
                    {/* 기본 통계 - Glass Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="backdrop-blur-sm bg-white/10 border border-green-300/30 rounded-xl p-4 text-center">
                        <div className="text-2xl font-black bg-gradient-to-r from-blue-300 to-cyan-400 bg-clip-text text-transparent mb-1">
                          {googleApiStats.totalCalls}
                        </div>
                        <div className="text-sm text-white/70 font-medium">오늘 사용</div>
                      </div>
                      <div className="backdrop-blur-sm bg-white/10 border border-green-300/30 rounded-xl p-4 text-center">
                        <div className="text-2xl font-black bg-gradient-to-r from-green-300 to-emerald-400 bg-clip-text text-transparent mb-1">
                          {googleApiStats.remainingCalls}
                        </div>
                        <div className="text-sm text-white/70 font-medium">남은 횟수</div>
                      </div>
                      <div className="backdrop-blur-sm bg-white/10 border border-green-300/30 rounded-xl p-4 text-center">
                        <div className="text-2xl font-black bg-gradient-to-r from-purple-300 to-violet-400 bg-clip-text text-transparent mb-1">
                          {Math.round((googleApiStats.successfulCalls / Math.max(googleApiStats.totalCalls, 1)) * 100)}%
                        </div>
                        <div className="text-sm text-white/70 font-medium">성공률</div>
                      </div>
                      <div className="backdrop-blur-sm bg-white/10 border border-green-300/30 rounded-xl p-4 text-center">
                        <div className="text-2xl font-black bg-gradient-to-r from-orange-300 to-red-400 bg-clip-text text-transparent mb-1">
                          {googleApiStats.avgResponseTime}ms
                        </div>
                        <div className="text-sm text-white/70 font-medium">평균 응답</div>
                      </div>
                    </div>

                    {/* 사용량 진행바 - Enhanced */}
                    <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 backdrop-blur-sm border border-green-300/30 rounded-xl p-4">
                      <div className="flex justify-between text-white mb-3">
                        <span className="font-medium">일일 한도 사용률</span>
                        <span className={`font-bold flex items-center gap-1 ${
                          googleApiStats.usagePercentage >= 90 ? 'text-red-300' :
                          googleApiStats.usagePercentage >= 70 ? 'text-yellow-300' :
                          'text-green-300'
                        }`}>
                          <span className={`w-2 h-2 rounded-full animate-pulse ${
                            googleApiStats.usagePercentage >= 90 ? 'bg-red-400' :
                            googleApiStats.usagePercentage >= 70 ? 'bg-yellow-400' :
                            'bg-green-400'
                          }`}></span>
                          {googleApiStats.usagePercentage}%
                        </span>
                      </div>
                      <div className="w-full bg-white/20 rounded-full h-3 shadow-inner">
                        <div 
                          className={`h-3 rounded-full transition-all duration-500 shadow-lg ${
                            googleApiStats.usagePercentage >= 90 ? 'bg-gradient-to-r from-red-500 to-red-600' :
                            googleApiStats.usagePercentage >= 70 ? 'bg-gradient-to-r from-yellow-500 to-orange-500' :
                            'bg-gradient-to-r from-green-500 to-emerald-500'
                          }`}
                          style={{ width: `${Math.min(googleApiStats.usagePercentage, 100)}%` }}
                        ></div>
                      </div>
                      <div className="text-xs text-white/70 mt-2">
                        {googleApiStats.totalCalls} / {googleApiStats.dailyLimit} 호출 사용 (무료 한도)
                      </div>
                    </div>

                    {/* 상태 배지 및 권장사항 - Enhanced Badges */}
                    <div className="flex flex-wrap gap-3">
                      <div className={`px-4 py-2 rounded-xl font-bold text-sm shadow-lg ${
                        googleApiStats.usagePercentage >= 90 ? 'bg-gradient-to-r from-red-500 to-red-600 text-white' :
                        googleApiStats.usagePercentage >= 70 ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white' :
                        'bg-gradient-to-r from-green-500 to-emerald-500 text-white'
                      }`}>
                        {googleApiStats.usagePercentage >= 90 ? '⚠️ 한도 임박' :
                         googleApiStats.usagePercentage >= 70 ? '⚡ 주의 필요' :
                         '✅ 정상'}
                      </div>
                      
                      <div className="px-4 py-2 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 backdrop-blur-sm border border-blue-300/30 rounded-xl text-blue-200 font-medium text-sm">
                        💰 무료 플랜 (월 10,000회)
                      </div>
                    </div>

                    {/* 무료 한도 안내 */}
                    <div className="bg-gradient-to-r from-blue-500/20 to-indigo-500/20 backdrop-blur-sm border border-blue-300/30 rounded-xl p-4">
                      <div className="text-white font-bold mb-3 flex items-center gap-2">
                        <span className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></span>
                        Google Air Quality API 무료 한도
                      </div>
                      <div className="text-blue-200 text-sm space-y-1">
                        <p>• 월 10,000회 무료 호출 (일 약 333회)</p>
                        <p>• 초과 시 $5.00 per 1,000 calls</p>
                        <p>• 분당 최대 6,000회 호출 제한</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* AccuWeather API 사용량 - Premium Glass Design */}
            {apiStats && (
            <div className="group relative">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-400 via-violet-400 to-purple-600 rounded-2xl blur opacity-60 group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>
              <div className="relative backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-6 shadow-2xl hover:shadow-purple-500/25 transition-all duration-500 hover:scale-[1.02]">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-violet-500 rounded-xl flex items-center justify-center shadow-lg">
                    📊
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">AccuWeather API 사용량</h3>
                    <p className="text-violet-200 text-sm font-medium">오늘의 API 호출 현황 및 한도 관리</p>
                  </div>
                </div>
                
                <div className="space-y-6">
                  {/* 기본 통계 - Glass Cards */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="backdrop-blur-sm bg-white/10 border border-purple-300/30 rounded-xl p-4 text-center">
                      <div className="text-2xl font-black bg-gradient-to-r from-blue-300 to-cyan-400 bg-clip-text text-transparent mb-1">
                        {apiStats.limit.current}
                      </div>
                      <div className="text-sm text-white/70 font-medium">오늘 사용</div>
                    </div>
                    <div className="backdrop-blur-sm bg-white/10 border border-purple-300/30 rounded-xl p-4 text-center">
                      <div className="text-2xl font-black bg-gradient-to-r from-green-300 to-emerald-400 bg-clip-text text-transparent mb-1">
                        {apiStats.limit.remaining}
                      </div>
                      <div className="text-sm text-white/70 font-medium">남은 횟수</div>
                    </div>
                    <div className="backdrop-blur-sm bg-white/10 border border-purple-300/30 rounded-xl p-4 text-center">
                      <div className="text-2xl font-black bg-gradient-to-r from-purple-300 to-violet-400 bg-clip-text text-transparent mb-1">
                        {apiStats.today.successRate}%
                      </div>
                      <div className="text-sm text-white/70 font-medium">성공률</div>
                    </div>
                    <div className="backdrop-blur-sm bg-white/10 border border-purple-300/30 rounded-xl p-4 text-center">
                      <div className="text-2xl font-black bg-gradient-to-r from-orange-300 to-red-400 bg-clip-text text-transparent mb-1">
                        {apiStats.today.avgResponseTime}ms
                      </div>
                      <div className="text-sm text-white/70 font-medium">평균 응답</div>
                    </div>
                  </div>

                  {/* 사용량 진행바 - Enhanced */}
                  <div className="bg-gradient-to-r from-purple-500/20 to-violet-500/20 backdrop-blur-sm border border-purple-300/30 rounded-xl p-4">
                    <div className="flex justify-between text-white mb-3">
                      <span className="font-medium">일일 한도 사용률</span>
                      <span className={`font-bold flex items-center gap-1 ${
                        apiStats.limit.status === 'critical' ? 'text-red-300' :
                        apiStats.limit.status === 'warning' ? 'text-yellow-300' :
                        'text-green-300'
                      }`}>
                        <span className={`w-2 h-2 rounded-full animate-pulse ${
                          apiStats.limit.status === 'critical' ? 'bg-red-400' :
                          apiStats.limit.status === 'warning' ? 'bg-yellow-400' :
                          'bg-green-400'
                        }`}></span>
                        {apiStats.limit.percentage}%
                      </span>
                    </div>
                    <div className="w-full bg-white/20 rounded-full h-3 shadow-inner">
                      <div 
                        className={`h-3 rounded-full transition-all duration-500 shadow-lg ${
                          apiStats.limit.status === 'critical' ? 'bg-gradient-to-r from-red-500 to-red-600' :
                          apiStats.limit.status === 'warning' ? 'bg-gradient-to-r from-yellow-500 to-orange-500' :
                          'bg-gradient-to-r from-green-500 to-emerald-500'
                        }`}
                        style={{ width: `${Math.min(apiStats.limit.percentage, 100)}%` }}
                      ></div>
                    </div>
                    <div className="text-xs text-white/70 mt-2">
                      {apiStats.limit.current} / {apiStats.limit.limit} 호출 사용
                    </div>
                  </div>

                  {/* 상태 배지 및 권장사항 - Enhanced Badges */}
                  <div className="flex flex-wrap gap-3">
                    <div className={`px-4 py-2 rounded-xl font-bold text-sm shadow-lg ${
                      apiStats.limit.status === 'critical' ? 'bg-gradient-to-r from-red-500 to-red-600 text-white' :
                      apiStats.limit.status === 'warning' ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white' :
                      'bg-gradient-to-r from-green-500 to-emerald-500 text-white'
                    }`}>
                      {apiStats.limit.status === 'critical' ? '⚠️ 한도 임박' :
                       apiStats.limit.status === 'warning' ? '⚡ 주의 필요' :
                       '✅ 정상'}
                    </div>
                    
                    {apiStats.recommendations.shouldOptimizeCache && (
                      <div className="px-4 py-2 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 backdrop-blur-sm border border-blue-300/30 rounded-xl text-blue-200 font-medium text-sm">
                        💾 캐시 최적화 권장
                      </div>
                    )}
                    
                    {apiStats.recommendations.shouldUpgradePlan && (
                      <div className="px-4 py-2 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 backdrop-blur-sm border border-indigo-300/30 rounded-xl text-indigo-200 font-medium text-sm">
                        ⬆️ 플랜 업그레이드 권장
                      </div>
                    )}
                  </div>

                  {/* 최근 7일 트렌드 - Enhanced Summary */}
                  {apiStats.recent.stats.length > 0 && (
                    <div className="bg-gradient-to-r from-violet-500/20 to-purple-500/20 backdrop-blur-sm border border-violet-300/30 rounded-xl p-4">
                      <div className="text-white font-bold mb-3 flex items-center gap-2">
                        <span className="w-2 h-2 bg-violet-400 rounded-full animate-pulse"></span>
                        최근 7일 평균
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center">
                          <div className="text-lg font-bold text-violet-200">
                            {apiStats.recent.averageDaily}회
                          </div>
                          <div className="text-xs text-white/70">일평균 호출</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-bold text-violet-200">
                            {apiStats.recent.totalCalls}회
                          </div>
                          <div className="text-xs text-white/70">총 호출</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 시간별 사용량 차트 */}
                  {apiStats.today.hourlyUsage && apiStats.today.hourlyUsage.length > 0 && (
                    <div className="bg-gradient-to-r from-indigo-500/20 to-blue-500/20 backdrop-blur-sm border border-indigo-300/30 rounded-xl p-4">
                      <div className="text-white font-bold mb-4 flex items-center gap-2">
                        <span className="w-2 h-2 bg-indigo-400 rounded-full animate-pulse"></span>
                        오늘의 시간별 API 호출 현황
                      </div>
                      <div className="grid grid-cols-12 gap-1 h-20">
                        {Array.from({ length: 24 }, (_, hour) => {
                          const usage = apiStats.today.hourlyUsage.find(u => u.hour === hour);
                          const calls = usage?.calls || 0;
                          const maxCalls = Math.max(...apiStats.today.hourlyUsage.map(u => u.calls));
                          const height = maxCalls > 0 ? (calls / maxCalls) * 100 : 0;
                          
                          return (
                            <div key={hour} className="flex flex-col items-center">
                              <div className="flex-1 flex items-end">
                                <div 
                                  className="w-full bg-gradient-to-t from-indigo-500 to-blue-400 rounded-sm transition-all duration-300 hover:from-indigo-400 hover:to-blue-300"
                                  style={{ height: `${height}%`, minHeight: calls > 0 ? '2px' : '0px' }}
                                  title={`${hour}시: ${calls}회 호출`}
                                ></div>
                              </div>
                              <div className="text-xs text-white/60 mt-1">
                                {hour}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* 엔드포인트별 사용량 */}
                  {apiStats.today.endpointUsage && Object.keys(apiStats.today.endpointUsage).length > 0 && (
                    <div className="bg-gradient-to-r from-teal-500/20 to-cyan-500/20 backdrop-blur-sm border border-teal-300/30 rounded-xl p-4">
                      <div className="text-white font-bold mb-4 flex items-center gap-2">
                        <span className="w-2 h-2 bg-teal-400 rounded-full animate-pulse"></span>
                        엔드포인트별 사용량
                      </div>
                      <div className="space-y-3">
                        {Object.entries(apiStats.today.endpointUsage).map(([endpoint, stats]) => (
                          <div key={endpoint} className="flex items-center justify-between bg-white/10 rounded-lg p-3">
                            <div className="flex-1">
                              <div className="text-white font-medium text-sm">{endpoint}</div>
                              <div className="text-teal-200 text-xs">{stats.calls}회 호출</div>
                            </div>
                            <div className="text-right">
                              <div className="text-teal-300 font-bold text-sm">{stats.avgResponseTime}ms</div>
                              <div className="text-white/60 text-xs">평균 응답시간</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
            )}
          </div>
        )}
      </div>

      {/* CSS 애니메이션 */}
      <style jsx>{`
        @keyframes blob {
          0% {
            transform: translate(0px, 0px) scale(1);
          }
          33% {
            transform: translate(30px, -50px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.9);
          }
          100% {
            transform: translate(0px, 0px) scale(1);
          }
        }
        
        .animate-blob {
          animation: blob 7s infinite;
        }
        
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </div>
  );
}
