'use client';

import { useAuth, useUser } from '@clerk/nextjs';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function ForceSyncPage() {
  const { isLoaded: authLoaded, userId, getToken, signOut } = useAuth();
  const { isLoaded: userLoaded, user } = useUser();
  const [syncStatus, setSyncStatus] = useState<string>('대기 중...');
  const [testResults, setTestResults] = useState<any[]>([]);

  const addTestResult = (test: string, result: any, success: boolean) => {
    setTestResults(prev => [...prev, {
      test,
      result,
      success,
      timestamp: new Date().toLocaleTimeString()
    }]);
  };

  const runAuthTests = async () => {
    setTestResults([]);
    setSyncStatus('테스트 실행 중...');

    // 1. 클라이언트 인증 상태 확인
    addTestResult('클라이언트 authLoaded', authLoaded, authLoaded);
    addTestResult('클라이언트 userLoaded', userLoaded, userLoaded);
    addTestResult('클라이언트 userId', userId, !!userId);
    addTestResult('클라이언트 user', !!user, !!user);

    // 2. 토큰 테스트
    if (userId) {
      try {
        const token = await getToken();
        addTestResult('토큰 획득', !!token, !!token);
      } catch (error) {
        addTestResult('토큰 획득', error, false);
      }
    }

    // 3. 서버 사이드 인증 테스트
    try {
      const response = await fetch('/api/debug/auth-test');
      const data = await response.json();
      addTestResult('서버 인증 테스트', data, data.success);
    } catch (error) {
      addTestResult('서버 인증 테스트', error, false);
    }

    setSyncStatus('테스트 완료');
  };

  const forceRefresh = () => {
    setSyncStatus('페이지 새로고침 중...');
    window.location.reload();
  };

  const clearBrowserData = async () => {
    setSyncStatus('브라우저 데이터 정리 중...');
    
    // localStorage 정리
    if (typeof window !== 'undefined') {
      localStorage.clear();
      sessionStorage.clear();
    }
    
    addTestResult('localStorage 정리', '완료', true);
    addTestResult('sessionStorage 정리', '완료', true);
    
    setSyncStatus('데이터 정리 완료 - 로그아웃 후 다시 로그인하세요');
  };

  const forceSignOut = async () => {
    setSyncStatus('로그아웃 중...');
    try {
      await signOut();
      setSyncStatus('로그아웃 완료');
    } catch (error) {
      setSyncStatus('로그아웃 실패');
      addTestResult('강제 로그아웃', error, false);
    }
  };

  useEffect(() => {
    if (authLoaded && userLoaded) {
      runAuthTests();
    }
  }, [authLoaded, userLoaded]);

  return (
    <div className="container mx-auto py-8">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">🔄 Clerk 강제 동기화</h1>
          <p className="text-muted-foreground mt-2">
            클라이언트-서버 인증 동기화 문제를 해결합니다.
          </p>
        </div>

        {/* 상태 표시 */}
        <Card>
          <CardHeader>
            <CardTitle>현재 상태</CardTitle>
            <CardDescription>{syncStatus}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <strong>클라이언트 상태:</strong>
                <div className="ml-4 mt-1">
                  <div>authLoaded: {authLoaded ? '✅' : '❌'}</div>
                  <div>userLoaded: {userLoaded ? '✅' : '❌'}</div>
                  <div>userId: {userId ? '✅' : '❌'}</div>
                  <div>user: {user ? '✅' : '❌'}</div>
                </div>
              </div>
              <div>
                <strong>사용자 정보:</strong>
                <div className="ml-4 mt-1">
                  {user ? (
                    <>
                      <div>이메일: {user.primaryEmailAddress?.emailAddress}</div>
                      <div>이름: {user.firstName} {user.lastName}</div>
                    </>
                  ) : (
                    <div>사용자 정보 없음</div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 액션 버튼들 */}
        <Card>
          <CardHeader>
            <CardTitle>문제 해결 액션</CardTitle>
            <CardDescription>
              단계별로 실행해보세요.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <Button onClick={runAuthTests} variant="outline">
                🔍 인증 상태 테스트
              </Button>
              
              <Button onClick={forceRefresh} variant="outline">
                🔄 페이지 새로고침
              </Button>
              
              <Button onClick={clearBrowserData} variant="outline">
                🗑️ 브라우저 데이터 정리
              </Button>
              
              <Button onClick={forceSignOut} variant="destructive">
                🚪 강제 로그아웃
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 테스트 결과 */}
        {testResults.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>테스트 결과</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {testResults.map((result, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <div className="flex items-center gap-2">
                      <span className={result.success ? 'text-green-600' : 'text-red-600'}>
                        {result.success ? '✅' : '❌'}
                      </span>
                      <span className="font-medium">{result.test}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-600">{result.timestamp}</div>
                      <div className="text-xs">
                        {typeof result.result === 'string' 
                          ? result.result 
                          : result.success 
                            ? '성공'
                            : '실패'
                        }
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* 추가 디버그 링크 */}
        <div className="flex gap-4">
          <a 
            href="/debug/clerk" 
            className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
          >
            Clerk 디버그
          </a>
          <a 
            href="/debug/headers" 
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Headers 디버그
          </a>
          <a 
            href="/admin/email-management/test" 
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            이메일 관리 테스트
          </a>
        </div>
      </div>
    </div>
  );
}
