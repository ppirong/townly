import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export default async function EmailManagementTestPage() {
  console.log('🔍 Email management test page loading...');
  
  const { userId } = await auth();
  console.log('👤 User ID:', userId);
  
  if (!userId) {
    console.log('❌ No user ID, redirecting to sign-in');
    redirect('/sign-in');
  }
  
  console.log('✅ User authenticated, showing test page');
  
  return (
    <div className="container mx-auto py-8">
      <div className="space-y-8">
        <div className="bg-green-50 border border-green-200 rounded-md p-4">
          <h1 className="text-2xl font-bold text-green-800">✅ 이메일 관리 페이지 테스트</h1>
          <div className="mt-4 space-y-2 text-sm">
            <p><strong>사용자 ID:</strong> {userId}</p>
            <p><strong>인증 상태:</strong> 로그인됨</p>
            <p><strong>페이지 로딩:</strong> 성공</p>
          </div>
        </div>
        
        <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
          <h2 className="text-lg font-semibold text-blue-800 mb-2">다음 단계</h2>
          <ol className="text-sm text-blue-700 space-y-1">
            <li>1. 이 페이지가 정상적으로 로드되면 인증 문제는 없습니다</li>
            <li>2. 데이터베이스 연결 또는 서버 액션에 문제가 있을 수 있습니다</li>
            <li>3. 브라우저 콘솔에서 오류 메시지를 확인하세요</li>
          </ol>
        </div>
        
        <div className="flex gap-4">
          <Link 
            href="/admin/email-management" 
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            원본 페이지로 이동
          </Link>
          <Link 
            href="/" 
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
          >
            홈으로 이동
          </Link>
        </div>
      </div>
    </div>
  );
}
