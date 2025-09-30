import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { SmartTTLDashboard } from '@/components/admin/SmartTTLDashboard';

export default async function SmartTTLPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect('/sign-in');
  }

  // TODO: 관리자 권한 확인 추가

  return (
    <div className="container mx-auto py-8">
      <SmartTTLDashboard />
    </div>
  );
}
