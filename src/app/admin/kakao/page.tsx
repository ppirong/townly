import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { KakaoAdminDashboard } from '@/components/kakao/KakaoAdminDashboard';

export default async function KakaoAdminPage() {
  const { userId } = await auth();
  
  if (!userId) {
    redirect('/sign-in');
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">카카오 채널 관리자</h1>
        <p className="text-gray-600 mt-2">
          카카오 채널 &ldquo;Townly&rdquo;로 수신된 메시지를 모니터링하고 관리할 수 있습니다.
        </p>
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            💡 <strong>수동 새로고침 모드</strong>: 서버 성능 최적화를 위해 자동 새로고침이 비활성화되었습니다. 
            새로운 메시지를 확인하려면 &quot;수동 새로고침&quot; 버튼을 클릭하세요.
          </p>
        </div>
      </div>
      
      <KakaoAdminDashboard />
    </div>
  );
}
