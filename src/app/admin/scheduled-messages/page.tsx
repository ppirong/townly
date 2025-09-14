import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { ScheduledMessageAdminPage } from '@/components/scheduled-messages/ScheduledMessageAdminPage';

export default async function ScheduledMessagesAdminPage() {
  const { userId } = await auth();
  
  if (!userId) {
    redirect('/sign-in');
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">예약 메시지 관리</h1>
        <p className="text-gray-600 mt-2">
          카카오 채널 구독자들에게 정기적으로 발송할 메시지를 스케줄링하고 관리할 수 있습니다.
        </p>
        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm text-green-800">
            💡 <strong>자동 발송 시스템</strong>: 설정된 스케줄에 따라 메시지가 자동으로 발송됩니다. 
            크론 작업을 통해 정확한 시간에 메시지가 전달됩니다.
          </p>
        </div>
      </div>
      
      <ScheduledMessageAdminPage />
    </div>
  );
}
