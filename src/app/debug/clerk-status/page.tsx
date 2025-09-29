import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { ClerkClientStatus } from '@/components/debug/ClerkClientStatus';

export default async function ClerkStatusPage() {
  let authResult;
  let error = null;
  
  try {
    authResult = await auth();
    console.log('✅ Server-side Clerk auth successful');
    console.log('👤 User ID:', authResult.userId);
  } catch (err) {
    error = err;
    console.error('❌ Server-side Clerk auth failed:', err);
  }

  if (!authResult?.userId) {
    redirect('/sign-in');
  }

  return (
    <div className="container mx-auto py-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Clerk 상태 확인</h1>
        
        <div className="space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h2 className="font-semibold text-green-800 mb-2">✅ 서버 사이드 인증</h2>
            <div className="text-sm text-green-700">
              <p>User ID: {authResult.userId}</p>
              <p>Session ID: {authResult.sessionId || 'N/A'}</p>
            </div>
          </div>

          {error ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h2 className="font-semibold text-red-800 mb-2">❌ 오류</h2>
              <p className="text-sm text-red-700">{String(error)}</p>
            </div>
          ) : null}

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h2 className="font-semibold text-blue-800 mb-2">🔧 해결 방법</h2>
            <div className="text-sm text-blue-700 space-y-2">
              <p>1. 브라우저 캐시 및 쿠키 삭제</p>
              <p>2. 시크릿/프라이빗 브라우징 모드에서 테스트</p>
              <p>3. Clerk 대시보드에서 애플리케이션 상태 확인</p>
              <p>4. 개발 서버 재시작</p>
            </div>
          </div>

          <div className="mt-8">
            <h2 className="text-xl font-semibold mb-4">클라이언트 사이드 상태</h2>
            <ClerkClientStatus />
          </div>
        </div>
      </div>
    </div>
  );
}
