'use client';

import { useAuth, useUser, useClerk } from '@clerk/nextjs';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export function ClerkClientStatus() {
  const { isLoaded: authLoaded, userId, sessionId } = useAuth();
  const { isLoaded: userLoaded, user } = useUser();
  const clerk = useClerk();
  const [clerkError, setClerkError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    // Clerk 로딩 상태와 오류 감지
    const checkClerkStatus = () => {
      if (!authLoaded || !userLoaded) {
        console.log('🔄 Clerk still loading...');
        return;
      }

      if (userId) {
        console.log('✅ Clerk client-side auth successful');
        console.log('👤 User ID:', userId);
        setClerkError(null);
      } else {
        console.log('❌ Clerk client-side auth failed - no userId');
      }
    };

    checkClerkStatus();
  }, [authLoaded, userLoaded, userId]);

  const handleRetry = async () => {
    setRetryCount(prev => prev + 1);
    try {
      console.log('🔄 Clerk 재시도 중...');
      // 페이지 새로고침으로 Clerk 재초기화
      window.location.reload();
    } catch (error) {
      console.error('❌ Clerk 재시도 실패:', error);
      setClerkError(error instanceof Error ? error.message : 'Unknown error');
    }
  };

  const handleClearData = () => {
    // 브라우저 데이터 정리
    localStorage.clear();
    sessionStorage.clear();
    window.location.reload();
  };

  if (!authLoaded || !userLoaded) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>🔄 Clerk 로딩 중...</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <p>Auth Loaded: {authLoaded.toString()}</p>
            <p>User Loaded: {userLoaded.toString()}</p>
            <p>Retry Count: {retryCount}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>
            {userId ? '✅ Clerk 클라이언트 연결됨' : '❌ Clerk 클라이언트 연결 실패'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div>
              <strong>Auth Loaded:</strong> {authLoaded.toString()}
            </div>
            <div>
              <strong>User Loaded:</strong> {userLoaded.toString()}
            </div>
            <div>
              <strong>User ID:</strong> {userId || 'N/A'}
            </div>
            <div>
              <strong>Session ID:</strong> {sessionId || 'N/A'}
            </div>
            <div>
              <strong>User Email:</strong> {user?.emailAddresses[0]?.emailAddress || 'N/A'}
            </div>
            <div>
              <strong>Retry Count:</strong> {retryCount}
            </div>
          </div>

          {clerkError && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded">
              <p className="text-red-800 text-sm">
                <strong>오류:</strong> {clerkError}
              </p>
            </div>
          )}

          <div className="mt-4 space-x-2">
            <Button onClick={handleRetry} variant="outline" size="sm">
              Clerk 재시도
            </Button>
            <Button onClick={handleClearData} variant="outline" size="sm">
              브라우저 데이터 초기화
            </Button>
          </div>
        </CardContent>
      </Card>

      {!userId && (
        <Card>
          <CardHeader>
            <CardTitle>🔧 해결 방법</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            <p>1. <strong>브라우저 새로고침</strong>을 시도하세요</p>
            <p>2. <strong>시크릿/프라이빗 모드</strong>에서 테스트하세요</p>
            <p>3. <strong>브라우저 캐시와 쿠키</strong>를 삭제하세요</p>
            <p>4. <strong>다른 브라우저</strong>에서 테스트하세요</p>
            <p>5. <strong>개발 서버를 재시작</strong>하세요</p>
            <p>6. <strong>Clerk Dashboard</strong>에서 애플리케이션 상태를 확인하세요</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
