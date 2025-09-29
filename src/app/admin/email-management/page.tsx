import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { getEmailSchedules } from '@/actions/email-schedules';
import { getAllSubscribers, getSubscriberStats } from '@/actions/user-email-settings';
import { EmailManagementDashboard } from '@/components/email/EmailManagementDashboard';

export default async function EmailManagementPage() {
  const { userId } = await auth();
  
  if (!userId) {
    redirect('/sign-in');
  }
  
  // TODO: 관리자 권한 체크 추가
  
  try {
    // 데이터 병렬 로딩 (에러 핸들링 추가)
    const [schedules, subscribers, stats] = await Promise.all([
      getEmailSchedules().catch(err => {
        console.error('Failed to load email schedules:', err);
        return [];
      }),
      getAllSubscribers().catch(err => {
        console.error('Failed to load subscribers:', err);
        return [];
      }),
      getSubscriberStats().catch(err => {
        console.error('Failed to load stats:', err);
        return {
          totalUsers: 0,
          subscribedUsers: 0,
          weatherEmailUsers: 0,
          morningEmailUsers: 0,
          eveningEmailUsers: 0,
        };
      }),
    ]);
    
    return (
      <div className="container mx-auto py-8">
        <div className="space-y-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">이메일 발송 관리</h1>
              <p className="text-muted-foreground">
                날씨 안내 이메일 스케줄 및 발송 현황을 관리합니다.
              </p>
            </div>
          </div>
          
          <EmailManagementDashboard 
            initialSchedules={schedules}
            initialSubscribers={subscribers}
            initialStats={stats}
          />
        </div>
      </div>
    );
  } catch (error) {
    console.error('Email management page error:', error);
    
    // 에러 발생 시 기본 페이지 표시
    return (
      <div className="container mx-auto py-8">
        <div className="space-y-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">이메일 발송 관리</h1>
              <p className="text-muted-foreground">
                날씨 안내 이메일 스케줄 및 발송 현황을 관리합니다.
              </p>
            </div>
          </div>
          
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <h3 className="text-red-800 font-medium">페이지 로딩 오류</h3>
            <p className="text-red-600 text-sm mt-1">
              데이터를 불러오는 중 오류가 발생했습니다. 콘솔을 확인하세요.
            </p>
          </div>
        </div>
      </div>
    );
  }
}

