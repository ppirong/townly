import { headers, cookies } from 'next/headers';
import { auth } from '@clerk/nextjs/server';
import Link from 'next/link';

export default async function HeadersDebugPage() {
  const headersList = await headers();
  const cookieStore = await cookies();
  
  // Clerk 인증 시도
  let authResult;
  let authError = null;
  
  try {
    authResult = await auth();
  } catch (error) {
    authError = error;
  }

  // 관련 헤더들 수집
  const relevantHeaders = [
    'authorization',
    'cookie',
    'user-agent',
    'x-forwarded-for',
    'x-real-ip',
    'host',
    'origin',
    'referer',
  ];

  // Clerk 관련 쿠키들 수집
  const clerkCookies: Array<{ name: string; value: string; }> = [];
  cookieStore.getAll().forEach(cookie => {
    if (cookie.name.includes('clerk') || cookie.name.includes('__clerk') || cookie.name.includes('__session')) {
      clerkCookies.push(cookie);
    }
  });

  return (
    <div className="container mx-auto py-8">
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">🔍 Headers & Cookies 디버그</h1>
        
        {/* 인증 결과 */}
        <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
          <h2 className="text-lg font-semibold text-blue-800 mb-2">서버 사이드 인증 결과</h2>
          {authError ? (
            <div className="text-red-600">
              <p><strong>인증 에러:</strong></p>
              <pre className="mt-2 text-xs bg-red-100 p-2 rounded">
                {authError instanceof Error ? authError.message : String(authError)}
              </pre>
            </div>
          ) : (
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span>User ID:</span>
                <span className={authResult?.userId ? 'text-green-600' : 'text-red-600'}>
                  {authResult?.userId || '❌ 없음'}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* 요청 헤더 */}
        <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
          <h2 className="text-lg font-semibold text-gray-800 mb-2">요청 헤더</h2>
          <div className="space-y-1 text-sm font-mono">
            {relevantHeaders.map(headerName => {
              const value = headersList.get(headerName);
              return (
                <div key={headerName} className="flex">
                  <span className="w-32 text-gray-600">{headerName}:</span>
                  <span className="flex-1 break-all">
                    {value || <span className="text-gray-400">없음</span>}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Clerk 쿠키 */}
        <div className="bg-green-50 border border-green-200 rounded-md p-4">
          <h2 className="text-lg font-semibold text-green-800 mb-2">Clerk 관련 쿠키</h2>
          {clerkCookies.length > 0 ? (
            <div className="space-y-2 text-sm">
              {clerkCookies.map(cookie => (
                <div key={cookie.name} className="bg-white p-2 rounded border">
                  <div className="font-medium text-green-700">{cookie.name}</div>
                  <div className="text-xs text-gray-600 break-all mt-1">
                    {cookie.value.substring(0, 100)}
                    {cookie.value.length > 100 && '...'}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-red-600">
              ❌ Clerk 관련 쿠키가 없습니다. 이것이 문제의 원인일 수 있습니다.
            </div>
          )}
        </div>

        {/* 모든 쿠키 */}
        <details className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
          <summary className="text-lg font-semibold text-yellow-800 cursor-pointer">
            모든 쿠키 보기 (클릭하여 펼치기)
          </summary>
          <div className="mt-4 space-y-1 text-sm font-mono max-h-60 overflow-y-auto">
            {cookieStore.getAll().map(cookie => (
              <div key={cookie.name} className="flex">
                <span className="w-48 text-gray-600 truncate">{cookie.name}:</span>
                <span className="flex-1 break-all text-xs">
                  {cookie.value.substring(0, 50)}
                  {cookie.value.length > 50 && '...'}
                </span>
              </div>
            ))}
          </div>
        </details>

        {/* 해결 방법 */}
        <div className="bg-orange-50 border border-orange-200 rounded-md p-4">
          <h2 className="text-lg font-semibold text-orange-800 mb-2">💡 문제 해결 방법</h2>
          <div className="space-y-3 text-sm">
            <div>
              <h3 className="font-medium text-orange-700">1. 쿠키 문제인 경우:</h3>
              <ul className="ml-4 mt-1 space-y-1 text-orange-600">
                <li>• 브라우저에서 모든 쿠키 삭제</li>
                <li>• 시크릿/프라이빗 모드에서 테스트</li>
                <li>• 다른 브라우저에서 테스트</li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-medium text-orange-700">2. 환경 설정 문제인 경우:</h3>
              <ul className="ml-4 mt-1 space-y-1 text-orange-600">
                <li>• Clerk Dashboard에서 도메인 설정 확인</li>
                <li>• 환경변수 재확인 및 서버 재시작</li>
                <li>• HTTPS vs HTTP 설정 확인</li>
              </ul>
            </div>

            <div>
              <h3 className="font-medium text-orange-700">3. 즉시 해결 방법:</h3>
              <ul className="ml-4 mt-1 space-y-1 text-orange-600">
                <li>• <a href="/sign-out" className="underline">로그아웃</a> 후 다시 로그인</li>
                <li>• 브라우저 새로고침 (Ctrl+F5 또는 Cmd+Shift+R)</li>
                <li>• 개발자 도구에서 Application → Storage → Clear storage</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="flex gap-4">
          <Link 
            href="/debug/clerk" 
            className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
          >
            Clerk 디버그
          </Link>
          <Link 
            href="/sign-out" 
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
          >
            로그아웃
          </Link>
          <Link 
            href="/sign-in" 
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            로그인
          </Link>
        </div>
      </div>
    </div>
  );
}
