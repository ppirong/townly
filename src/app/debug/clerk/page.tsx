import { auth } from '@clerk/nextjs/server';
import { ClerkClientDebug } from '@/components/debug/ClerkClientDebug';

export default async function ClerkDebugPage() {
  console.log('🔍 Clerk Debug Page Loading...');
  
  // 환경변수 확인
  const clerkSecretKey = process.env.CLERK_SECRET_KEY;
  const clerkPublishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  
  console.log('🔑 Clerk Secret Key exists:', !!clerkSecretKey);
  console.log('🔑 Clerk Publishable Key exists:', !!clerkPublishableKey);
  console.log('🔑 Clerk Secret Key length:', clerkSecretKey?.length || 0);
  console.log('🔑 Clerk Publishable Key length:', clerkPublishableKey?.length || 0);
  
  let authResult;
  let error = null;
  
  try {
    authResult = await auth();
    console.log('✅ auth() function executed successfully');
    console.log('👤 User ID from auth():', authResult.userId);
  } catch (err) {
    error = err;
    console.error('❌ auth() function failed:', err);
  }
  
  return (
    <div className="container mx-auto py-8">
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">🔍 Clerk 디버그 페이지</h1>
        
        {/* 환경변수 상태 */}
        <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
          <h2 className="text-lg font-semibold text-blue-800 mb-2">환경변수 상태</h2>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span>CLERK_SECRET_KEY:</span>
              <span className={clerkSecretKey ? 'text-green-600' : 'text-red-600'}>
                {clerkSecretKey ? `✅ 설정됨 (${clerkSecretKey.length}자)` : '❌ 설정되지 않음'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:</span>
              <span className={clerkPublishableKey ? 'text-green-600' : 'text-red-600'}>
                {clerkPublishableKey ? `✅ 설정됨 (${clerkPublishableKey.length}자)` : '❌ 설정되지 않음'}
              </span>
            </div>
          </div>
        </div>
        
        {/* 인증 상태 */}
        <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
          <h2 className="text-lg font-semibold text-gray-800 mb-2">인증 상태</h2>
          {error ? (
            <div className="text-red-600">
              <p><strong>오류 발생:</strong></p>
              <pre className="mt-2 text-xs bg-red-100 p-2 rounded">
                {error instanceof Error ? error.message : String(error)}
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
              <div className="flex justify-between">
                <span>인증 상태:</span>
                <span className={authResult?.userId ? 'text-green-600' : 'text-red-600'}>
                  {authResult?.userId ? '✅ 로그인됨' : '❌ 로그인 안됨'}
                </span>
              </div>
            </div>
          )}
        </div>
        
        {/* 해결 방법 */}
        {(!clerkSecretKey || !clerkPublishableKey || !authResult?.userId) && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
            <h2 className="text-lg font-semibold text-yellow-800 mb-2">⚠️ 문제 해결 방법</h2>
            <div className="text-sm text-yellow-700 space-y-2">
              {!clerkSecretKey && (
                <p>• .env.local 파일에 CLERK_SECRET_KEY를 추가하세요</p>
              )}
              {!clerkPublishableKey && (
                <p>• .env.local 파일에 NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY를 추가하세요</p>
              )}
              {!authResult?.userId && clerkSecretKey && clerkPublishableKey && (
                <div>
                  <p>• 환경변수는 설정되어 있지만 로그인이 안되어 있습니다</p>
                  <p>• <a href="/sign-in" className="underline">로그인 페이지</a>에서 로그인하세요</p>
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* 클라이언트 사이드 인증 정보 */}
        <ClerkClientDebug />

        {/* 성공 상태 */}
        {clerkSecretKey && clerkPublishableKey && authResult?.userId && (
          <div className="bg-green-50 border border-green-200 rounded-md p-4">
            <h2 className="text-lg font-semibold text-green-800 mb-2">✅ 모든 설정이 정상입니다!</h2>
            <p className="text-sm text-green-700">
              이제 <a href="/admin/email-management" className="underline">이메일 관리 페이지</a>에 접근할 수 있습니다.
            </p>
          </div>
        )}
        
        <div className="flex gap-4">
          <a 
            href="/sign-in" 
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            로그인 페이지
          </a>
          <a 
            href="/admin/email-management/test" 
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
          >
            이메일 관리 테스트
          </a>
          <a 
            href="/" 
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            홈으로 이동
          </a>
        </div>
      </div>
    </div>
  );
}
