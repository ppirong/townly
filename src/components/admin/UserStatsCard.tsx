/**
 * 관리자용 사용자 통계 카드 컴포넌트
 * 회원가입 방법별 사용자 수를 표시합니다.
 */

'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Mail, MessageCircle, Shield, User } from 'lucide-react';
import type { AdminUserStats } from '@/lib/dto/user-dto-mappers';

export default function UserStatsCard() {
  const [stats, setStats] = useState<AdminUserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchUserStats();
  }, []);

  const fetchUserStats = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/user-stats');
      const data = await response.json();

      if (data.success) {
        setStats(data.data);
      } else {
        setError(data.error || '통계를 불러오는데 실패했습니다.');
      }
    } catch (err) {
      setError('네트워크 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            사용자 통계
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <Users className="w-5 h-5" />
            사용자 통계
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-600">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (!stats) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5" />
          사용자 통계
        </CardTitle>
        <CardDescription>
          회원가입 방법별 사용자 현황
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 전체 사용자 수 */}
        <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-600" />
            <span className="font-medium">전체 사용자</span>
          </div>
          <Badge variant="secondary" className="bg-blue-100 text-blue-800">
            {stats.totalUsers}명
          </Badge>
        </div>

        {/* 회원가입 방법별 통계 */}
        <div className="space-y-2">
          <h4 className="font-medium text-sm text-gray-700">회원가입 방법별</h4>
          
          {/* 이메일 회원가입 */}
          <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-green-600" />
              <span className="text-sm">이메일 회원가입</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">
                {stats.signupMethodBreakdown.find(s => s.method === 'email')?.percentage}%
              </span>
              <Badge variant="secondary" className="bg-green-100 text-green-800">
                {stats.emailSignups}명
              </Badge>
            </div>
          </div>

          {/* 카카오 회원가입 */}
          <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
            <div className="flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-yellow-600" />
              <span className="text-sm">카카오 회원가입</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">
                {stats.signupMethodBreakdown.find(s => s.method === 'kakao')?.percentage}%
              </span>
              <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                {stats.kakaoSignups}명
              </Badge>
            </div>
          </div>
        </div>

        {/* 역할별 통계 */}
        <div className="space-y-2">
          <h4 className="font-medium text-sm text-gray-700">역할별</h4>
          
          {/* 관리자 */}
          <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-purple-600" />
              <span className="text-sm">관리자</span>
            </div>
            <Badge variant="secondary" className="bg-purple-100 text-purple-800">
              {stats.adminUsers}명
            </Badge>
          </div>

          {/* 일반 사용자 */}
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-gray-600" />
              <span className="text-sm">일반 사용자</span>
            </div>
            <Badge variant="secondary" className="bg-gray-100 text-gray-800">
              {stats.customerUsers}명
            </Badge>
          </div>
        </div>

        {/* 새로고침 버튼 */}
        <button
          onClick={fetchUserStats}
          className="w-full mt-4 px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          새로고침
        </button>
      </CardContent>
    </Card>
  );
}
