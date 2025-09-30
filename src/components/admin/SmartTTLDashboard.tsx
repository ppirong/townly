'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from 'recharts';
import { 
  Users, 
  TrendingUp, 
  Clock, 
  Database, 
  Zap,
  RefreshCw,
  Target,
  Activity
} from 'lucide-react';

interface UserPattern {
  userId: string;
  totalQueries: number;
  dailyAverage: number;
  weeklyPattern: Record<string, number>;
  hourlyPattern: Record<string, number>;
  locationPreferences: Array<{
    locationKey: string;
    count: number;
    percentage: number;
  }>;
  timePreference: 'morning' | 'evening' | 'all_day';
  activityLevel: 'low' | 'medium' | 'high' | 'very_high';
  consistencyScore: number;
}

interface TTLRecommendation {
  userId: string;
  currentEfficiency: number;
  recommendedTTLMultiplier: number;
  recommendations: string[];
  potentialSavings: {
    storageReduction: number;
    apiCallReduction: number;
  };
  priority: 'low' | 'medium' | 'high';
}

interface SystemStats {
  systemPatterns: {
    totalActiveUsers: number;
    averageQueriesPerUser: number;
    peakHours: number[];
    peakDays: string[];
    userSegmentation: {
      lowActivity: number;
      mediumActivity: number;
      highActivity: number;
      veryHighActivity: number;
    };
  };
  performance: {
    totalCachedItems: number;
    averageTTL: number;
    cacheHitRate: number;
    expiredItemsToday: number;
    storageEfficiency: number;
  };
  optimization: {
    totalUsers: number;
    averageUserCacheSize: number;
    totalCacheHits: number;
    storageEfficiency: number;
    optimizationScore: number;
  };
}

export function SmartTTLDashboard() {
  const [userPattern, setUserPattern] = useState<UserPattern | null>(null);
  const [recommendation, setRecommendation] = useState<TTLRecommendation | null>(null);
  const [systemStats, setSystemStats] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  // 사용자 패턴 데이터 로드
  const loadUserPattern = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/admin/smart-ttl?action=user_pattern');
      const result = await response.json();
      
      if (result.success) {
        setUserPattern(result.data.pattern);
      } else {
        setError('사용자 패턴 데이터를 불러오는데 실패했습니다.');
      }
    } catch (err) {
      setError('네트워크 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // TTL 추천 데이터 로드
  const loadRecommendation = async () => {
    try {
      const response = await fetch('/api/admin/smart-ttl?action=ttl_recommendation');
      const result = await response.json();
      
      if (result.success) {
        setRecommendation(result.data);
      }
    } catch (err) {
      console.error('추천 데이터 로드 실패:', err);
    }
  };

  // 시스템 통계 로드
  const loadSystemStats = async () => {
    try {
      const response = await fetch('/api/admin/smart-ttl?action=system_stats');
      const result = await response.json();
      
      if (result.success) {
        setSystemStats(result.data);
      }
    } catch (err) {
      console.error('시스템 통계 로드 실패:', err);
    }
  };

  // 패턴 재분석
  const refreshPattern = async () => {
    setLoading(true);
    
    try {
      const response = await fetch('/api/admin/smart-ttl', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset_user_pattern' }),
      });
      
      const result = await response.json();
      
      if (result.success) {
        setUserPattern(result.data.pattern);
        setRecommendation(result.data.recommendation);
      } else {
        setError('패턴 재분석에 실패했습니다.');
      }
    } catch (err) {
      setError('재분석 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUserPattern();
    loadRecommendation();
    loadSystemStats();
  }, []);

  // 차트 데이터 변환
  const getHourlyChartData = () => {
    if (!userPattern) return [];
    
    return Object.entries(userPattern.hourlyPattern).map(([hour, count]) => ({
      hour: `${hour}시`,
      queries: count,
    }));
  };

  const getWeeklyChartData = () => {
    if (!userPattern) return [];
    
    return Object.entries(userPattern.weeklyPattern).map(([day, count]) => ({
      day,
      queries: count,
    }));
  };

  const getActivityLevelColor = (level: string) => {
    switch (level) {
      case 'very_high': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'outline';
    }
  };

  if (loading && !userPattern) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-8 w-8 animate-spin mr-2" />
        <span>스마트 TTL 데이터를 로딩중...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">스마트 TTL 관리</h2>
          <p className="text-muted-foreground">
            사용자 패턴 기반 지능형 캐시 최적화 시스템
          </p>
        </div>
        <Button onClick={refreshPattern} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          패턴 재분석
        </Button>
      </div>

      {error && (
        <Alert>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">개요</TabsTrigger>
          <TabsTrigger value="patterns">사용자 패턴</TabsTrigger>
          <TabsTrigger value="system">시스템 통계</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* 현재 상태 요약 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">활동 수준</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-2">
                  <div className={`w-3 h-3 rounded-full ${getActivityLevelColor(userPattern?.activityLevel || 'low')}`} />
                  <span className="text-2xl font-bold capitalize">
                    {userPattern?.activityLevel || 'N/A'}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  일평균 {userPattern?.dailyAverage || 0}회 조회
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">일관성 점수</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{userPattern?.consistencyScore || 0}</div>
                <Progress value={userPattern?.consistencyScore || 0} className="mt-2" />
                <p className="text-xs text-muted-foreground">
                  사용 패턴의 규칙성
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">캐시 효율성</CardTitle>
                <Database className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{recommendation?.currentEfficiency || 0}%</div>
                <Progress value={recommendation?.currentEfficiency || 0} className="mt-2" />
                <p className="text-xs text-muted-foreground">
                  현재 TTL 효율성
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">권장 TTL</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{recommendation?.recommendedTTLMultiplier || 1.0}x</div>
                <Badge variant={getPriorityColor(recommendation?.priority || 'low')} className="mt-2">
                  {recommendation?.priority || 'N/A'} 우선순위
                </Badge>
                <p className="text-xs text-muted-foreground">
                  기본 TTL 대비 배수
                </p>
              </CardContent>
            </Card>
          </div>

          {/* TTL 최적화 추천 */}
          {recommendation && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Zap className="h-5 w-5 mr-2" />
                  TTL 최적화 추천
                </CardTitle>
                <CardDescription>
                  개인 사용 패턴을 기반으로 한 맞춤형 캐시 최적화 전략
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold mb-2">예상 절약 효과</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>저장 공간 절약:</span>
                        <span className="font-medium">{recommendation.potentialSavings.storageReduction}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>API 호출 절약:</span>
                        <span className="font-medium">{recommendation.potentialSavings.apiCallReduction}%</span>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold mb-2">추천 사항</h4>
                    <ul className="space-y-1 text-sm">
                      {recommendation.recommendations.map((rec, index) => (
                        <li key={index} className="flex items-start">
                          <span className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-2 flex-shrink-0" />
                          {rec}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="patterns" className="space-y-6">
          {userPattern && (
            <>
              {/* 시간대별 사용 패턴 */}
              <Card>
                <CardHeader>
                  <CardTitle>시간대별 사용 패턴</CardTitle>
                  <CardDescription>
                    24시간 동안의 날씨 조회 패턴 ({userPattern.timePreference} 선호)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={getHourlyChartData()}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="hour" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="queries" fill="#3b82f6" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* 요일별 사용 패턴 */}
              <Card>
                <CardHeader>
                  <CardTitle>요일별 사용 패턴</CardTitle>
                  <CardDescription>
                    주간 날씨 조회 분포
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={getWeeklyChartData()}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="day" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="queries" fill="#10b981" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* 선호 위치 */}
              <Card>
                <CardHeader>
                  <CardTitle>선호 위치 분석</CardTitle>
                  <CardDescription>
                    자주 조회하는 지역 순위
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {userPattern.locationPreferences.map((location, index) => (
                      <div key={location.locationKey} className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <Badge variant="outline">#{index + 1}</Badge>
                          <span className="font-medium">{location.locationKey}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-muted-foreground">{location.count}회</span>
                          <Badge variant="secondary">{location.percentage}%</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="system" className="space-y-6">
          {systemStats && (
            <>
              {/* 시스템 개요 */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">활성 사용자</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{systemStats.systemPatterns.totalActiveUsers}</div>
                    <p className="text-xs text-muted-foreground">
                      최근 30일 기준
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">평균 조회수</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{systemStats.systemPatterns.averageQueriesPerUser}</div>
                    <p className="text-xs text-muted-foreground">
                      사용자당 평균
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">캐시 히트율</CardTitle>
                    <Database className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{systemStats.performance.cacheHitRate}%</div>
                    <p className="text-xs text-muted-foreground">
                      캐시 효율성
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">최적화 점수</CardTitle>
                    <Zap className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{systemStats.optimization.optimizationScore}</div>
                    <Progress value={systemStats.optimization.optimizationScore} className="mt-2" />
                    <p className="text-xs text-muted-foreground">
                      전체 시스템 효율성
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* 사용자 세분화 */}
              <Card>
                <CardHeader>
                  <CardTitle>사용자 활동 수준 분포</CardTitle>
                  <CardDescription>
                    활동 수준별 사용자 분포 현황
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {systemStats.systemPatterns.userSegmentation.lowActivity}
                      </div>
                      <div className="text-sm text-muted-foreground">저활동</div>
                      <div className="text-xs">0-3회/일</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-yellow-600">
                        {systemStats.systemPatterns.userSegmentation.mediumActivity}
                      </div>
                      <div className="text-sm text-muted-foreground">중활동</div>
                      <div className="text-xs">3-8회/일</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-orange-600">
                        {systemStats.systemPatterns.userSegmentation.highActivity}
                      </div>
                      <div className="text-sm text-muted-foreground">고활동</div>
                      <div className="text-xs">8-15회/일</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-600">
                        {systemStats.systemPatterns.userSegmentation.veryHighActivity}
                      </div>
                      <div className="text-sm text-muted-foreground">초고활동</div>
                      <div className="text-xs">15+회/일</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 피크 시간 및 요일 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>피크 시간대</CardTitle>
                    <CardDescription>가장 활발한 시간대</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {systemStats.systemPatterns.peakHours.map((hour, index) => (
                        <Badge key={hour} variant="default" className="mr-2">
                          {hour}시
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>피크 요일</CardTitle>
                    <CardDescription>가장 활발한 요일</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {systemStats.systemPatterns.peakDays.map((day, index) => (
                        <Badge key={day} variant="default" className="mr-2">
                          {day}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
