'use client';

import { useAuth, useUser } from '@clerk/nextjs';
import { useEffect, useState } from 'react';

export function ClerkClientDebug() {
  const { isLoaded: authLoaded, userId, getToken } = useAuth();
  const { isLoaded: userLoaded, user } = useUser();
  const [token, setToken] = useState<string | null>(null);
  const [tokenError, setTokenError] = useState<string | null>(null);

  useEffect(() => {
    const fetchToken = async () => {
      if (authLoaded && userId) {
        try {
          const sessionToken = await getToken();
          setToken(sessionToken);
        } catch (error) {
          setTokenError(error instanceof Error ? error.message : 'Token fetch failed');
        }
      }
    };

    fetchToken();
  }, [authLoaded, userId, getToken]);

  return (
    <div className="bg-purple-50 border border-purple-200 rounded-md p-4">
      <h2 className="text-lg font-semibold text-purple-800 mb-2">클라이언트 사이드 인증 정보</h2>
      <div className="space-y-2 text-sm">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <h3 className="font-medium text-purple-700 mb-1">useAuth() 결과:</h3>
            <div className="space-y-1">
              <div className="flex justify-between">
                <span>isLoaded:</span>
                <span className={authLoaded ? 'text-green-600' : 'text-red-600'}>
                  {authLoaded ? '✅ true' : '❌ false'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>userId:</span>
                <span className={userId ? 'text-green-600' : 'text-red-600'}>
                  {userId || '❌ null'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Token:</span>
                <span className={token ? 'text-green-600' : 'text-red-600'}>
                  {token ? '✅ 있음' : tokenError ? `❌ ${tokenError}` : '❌ 없음'}
                </span>
              </div>
            </div>
          </div>
          
          <div>
            <h3 className="font-medium text-purple-700 mb-1">useUser() 결과:</h3>
            <div className="space-y-1">
              <div className="flex justify-between">
                <span>isLoaded:</span>
                <span className={userLoaded ? 'text-green-600' : 'text-red-600'}>
                  {userLoaded ? '✅ true' : '❌ false'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>user:</span>
                <span className={user ? 'text-green-600' : 'text-red-600'}>
                  {user ? '✅ 있음' : '❌ null'}
                </span>
              </div>
              {user && (
                <div className="flex justify-between">
                  <span>email:</span>
                  <span className="text-green-600 text-xs">
                    {user.primaryEmailAddress?.emailAddress || '없음'}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 환경변수 확인 */}
        <div className="mt-4 pt-4 border-t border-purple-200">
          <h3 className="font-medium text-purple-700 mb-1">클라이언트 환경변수:</h3>
          <div className="flex justify-between">
            <span>NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:</span>
            <span className={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ? 'text-green-600' : 'text-red-600'}>
              {process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ? 
                `✅ ${process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.substring(0, 20)}...` : 
                '❌ 설정되지 않음'
              }
            </span>
          </div>
        </div>

        {/* 브라우저 정보 */}
        <div className="mt-4 pt-4 border-t border-purple-200">
          <h3 className="font-medium text-purple-700 mb-1">브라우저 정보:</h3>
          <div className="space-y-1">
            <div className="flex justify-between">
              <span>localStorage 지원:</span>
              <span className="text-green-600">
                {typeof window !== 'undefined' && window.localStorage ? '✅ 지원됨' : '❌ 지원 안됨'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>sessionStorage 지원:</span>
              <span className="text-green-600">
                {typeof window !== 'undefined' && window.sessionStorage ? '✅ 지원됨' : '❌ 지원 안됨'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>쿠키 지원:</span>
              <span className="text-green-600">
                {typeof document !== 'undefined' ? '✅ 지원됨' : '❌ 지원 안됨'}
              </span>
            </div>
          </div>
        </div>

        {/* 문제 해결 제안 */}
        {authLoaded && userLoaded && !userId && (
          <div className="mt-4 p-3 bg-yellow-100 border border-yellow-300 rounded">
            <h4 className="font-medium text-yellow-800 mb-1">🔧 문제 해결 제안:</h4>
            <div className="text-xs text-yellow-700 space-y-1">
              <p>• 브라우저 쿠키를 삭제하고 다시 로그인해보세요</p>
              <p>• 시크릿/프라이빗 브라우징 모드를 시도해보세요</p>
              <p>• Clerk Dashboard에서 도메인 설정을 확인하세요</p>
              <p>• 개발자 도구 → Application → Cookies에서 Clerk 쿠키 확인</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
