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
          카카오 채널 &ldquo;Towny&rdquo;로 수신된 메시지를 실시간으로 모니터링하고 관리할 수 있습니다.
        </p>
      </div>
      
      <KakaoAdminDashboard />
    </div>
  );
}
