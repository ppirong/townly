'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import Image from 'next/image';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { EmailScheduleForm } from './EmailScheduleForm';
import { ManualEmailSender } from './ManualEmailSender';
import { SubscriberStatsCard } from './SubscriberStatsCard';
import { EmailSendHistoryTable } from './EmailSendHistoryTable';
import { GmailAuthStatus } from './GmailAuthStatus';
import { 
  createEmailSchedule, 
  updateEmailSchedule, 
  deleteEmailSchedule,
  sendManualEmail,
  sendManualEmailWithAgent
} from '@/actions/email-schedules';
import type { EmailSchedule, UserEmailSettings } from '@/db/schema';
import type { CreateEmailScheduleInput, UpdateEmailScheduleInput, SendManualEmailInput } from '@/lib/schemas/email';

interface EmailManagementDashboardProps {
  initialSchedules: EmailSchedule[];
  initialSubscribers: Array<{
    clerkUserId: string;
    email: string;
    firstName?: string | null;
    lastName?: string | null;
    imageUrl?: string;
    receiveWeatherEmails: boolean;
    receiveMorningEmail: boolean;
    receiveEveningEmail: boolean;
    isSubscribed: boolean;
    totalEmailsSent: number;
    lastEmailSentAt: Date | null;
    createdAt: Date;
    lastSignInAt?: Date | null;
    hasEmailSettings: boolean;
  }>;
  initialStats: {
    totalUsers: number;
    subscribedUsers: number;
    weatherEmailUsers: number;
    morningEmailUsers: number;
    eveningEmailUsers: number;
  };
}

export function EmailManagementDashboard({
  initialSchedules,
  initialSubscribers,
  initialStats,
}: EmailManagementDashboardProps) {
  const [schedules, setSchedules] = useState(initialSchedules);
  const [isLoading, setIsLoading] = useState(false);
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'schedules' | 'manual' | 'subscribers' | 'history'>('schedules');

  const showAlert = (type: 'success' | 'error', message: string) => {
    setAlert({ type, message });
    setTimeout(() => setAlert(null), 5000);
  };

  const handleCreateSchedule = async (data: CreateEmailScheduleInput) => {
    setIsLoading(true);
    try {
      await createEmailSchedule(data);
      // 스케줄 목록 새로고침
      window.location.reload();
      showAlert('success', '이메일 스케줄이 생성되었습니다.');
    } catch (error) {
      showAlert('error', '스케줄 생성 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateSchedule = async (id: string, data: UpdateEmailScheduleInput) => {
    setIsLoading(true);
    try {
      await updateEmailSchedule(id, data);
      // 스케줄 목록 새로고침
      window.location.reload();
      showAlert('success', '이메일 스케줄이 업데이트되었습니다.');
    } catch (error) {
      showAlert('error', '스케줄 업데이트 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteSchedule = async (id: string) => {
    if (!confirm('정말 이 스케줄을 삭제하시겠습니까?')) {
      return;
    }

    setIsLoading(true);
    try {
      await deleteEmailSchedule(id);
      setSchedules(schedules.filter(s => s.id !== id));
      showAlert('success', '이메일 스케줄이 삭제되었습니다.');
    } catch (error) {
      showAlert('error', '스케줄 삭제 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendManualEmail = async (data: SendManualEmailInput) => {
    setIsLoading(true);
    try {
      // useAgent 옵션에 따라 적절한 함수 호출
      const result = data.useAgent 
        ? await sendManualEmailWithAgent(data)
        : await sendManualEmail(data);
        
      const resultWithStats = result as { successCount: number; failureCount: number; agentStats?: { averageScore: number } };
      const successMessage = data.useAgent && resultWithStats.agentStats
        ? `이메일이 발송되었습니다. (성공: ${result.successCount}, 실패: ${result.failureCount}) - 평균 점수: ${resultWithStats.agentStats.averageScore.toFixed(1)}/100`
        : `이메일이 발송되었습니다. (성공: ${result.successCount}, 실패: ${result.failureCount})`;
        
      showAlert('success', successMessage);
    } catch (error) {
      showAlert('error', '이메일 발송 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const tabs = [
    { id: 'schedules', label: '스케줄 관리', icon: '📅' },
    { id: 'manual', label: '수동 발송', icon: '📧' },
    { id: 'subscribers', label: '구독자 관리', icon: '👥' },
    { id: 'history', label: '발송 이력', icon: '📊' },
  ];

  return (
    <div className="space-y-6">
      {alert && (
        <Alert className={alert.type === 'error' ? 'border-red-500' : 'border-green-500'}>
          <AlertDescription>{alert.message}</AlertDescription>
        </Alert>
      )}

      {/* Gmail 인증 상태 */}
      <GmailAuthStatus />

      {/* 통계 카드 */}
      <SubscriberStatsCard stats={initialStats} />

      {/* 탭 네비게이션 */}
      <div className="flex space-x-1 bg-muted p-1 rounded-lg">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as 'schedules' | 'manual' | 'subscribers' | 'history')}
            className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === tab.id
                ? 'bg-background shadow-sm text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <span className="mr-2">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* 탭 컨텐츠 */}
      {activeTab === 'schedules' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>새 스케줄 만들기</CardTitle>
              <CardDescription>
                정기적으로 발송할 날씨 안내 이메일 스케줄을 설정하세요.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <EmailScheduleForm
                onSubmit={handleCreateSchedule}
                isLoading={isLoading}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>현재 스케줄 목록</CardTitle>
            </CardHeader>
            <CardContent>
              <ScheduleTable
                schedules={schedules}
                onUpdate={handleUpdateSchedule}
                onDelete={handleDeleteSchedule}
                isLoading={isLoading}
              />
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'manual' && (
        <Card>
          <CardHeader>
            <CardTitle>수동 이메일 발송</CardTitle>
            <CardDescription>
              즉시 날씨 안내 이메일을 발송하거나 테스트 이메일을 보낼 수 있습니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ManualEmailSender
              onSend={handleSendManualEmail}
              isLoading={isLoading}
            />
          </CardContent>
        </Card>
      )}

      {activeTab === 'subscribers' && (
        <Card>
          <CardHeader>
            <CardTitle>구독자 목록</CardTitle>
            <CardDescription>
              이메일 구독자들의 설정을 확인할 수 있습니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SubscriberTable subscribers={initialSubscribers} />
          </CardContent>
        </Card>
      )}

      {activeTab === 'history' && (
        <Card>
          <CardHeader>
            <CardTitle>이메일 발송 이력</CardTitle>
            <CardDescription>
              과거 이메일 발송 결과를 확인할 수 있습니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <EmailSendHistoryTable />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ScheduleTable({ 
  schedules, 
  onUpdate, 
  onDelete, 
  isLoading 
}: {
  schedules: EmailSchedule[];
  onUpdate: (id: string, data: UpdateEmailScheduleInput) => void;
  onDelete: (id: string) => void;
  isLoading: boolean;
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>제목</TableHead>
          <TableHead>발송 시간</TableHead>
          <TableHead>대상</TableHead>
          <TableHead>상태</TableHead>
          <TableHead>다음 발송</TableHead>
          <TableHead>발송 횟수</TableHead>
          <TableHead>작업</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {schedules.map((schedule) => (
          <TableRow key={schedule.id}>
            <TableCell className="font-medium">{schedule.title}</TableCell>
            <TableCell>{schedule.scheduleTime}</TableCell>
            <TableCell>
              <Badge variant="outline">
                {schedule.targetType === 'all_users' ? '모든 사용자' : 
                 schedule.targetType === 'active_users' ? '활성 사용자' : '특정 사용자'}
              </Badge>
            </TableCell>
            <TableCell>
              <Badge variant={schedule.isActive ? 'default' : 'secondary'}>
                {schedule.isActive ? '활성' : '비활성'}
              </Badge>
            </TableCell>
            <TableCell>
              {schedule.nextSendAt ? schedule.nextSendAt.toLocaleString('ko-KR') : '없음'}
            </TableCell>
            <TableCell>{schedule.totalSentCount}</TableCell>
            <TableCell>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onUpdate(schedule.id, { isActive: !schedule.isActive })}
                  disabled={isLoading}
                >
                  {schedule.isActive ? '비활성화' : '활성화'}
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => onDelete(schedule.id)}
                  disabled={isLoading}
                >
                  삭제
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function SubscriberTable({ 
  subscribers 
}: {
  subscribers: EmailManagementDashboardProps['initialSubscribers'];
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>사용자</TableHead>
          <TableHead>이메일</TableHead>
          <TableHead>구독 상태</TableHead>
          <TableHead>날씨 이메일</TableHead>
          <TableHead>아침 이메일</TableHead>
          <TableHead>저녁 이메일</TableHead>
          <TableHead>발송 횟수</TableHead>
          <TableHead>마지막 로그인</TableHead>
          <TableHead>가입일</TableHead>
          <TableHead>설정 상태</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {subscribers.length === 0 ? (
          <TableRow>
            <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
              등록된 사용자가 없습니다.
            </TableCell>
          </TableRow>
        ) : (
          subscribers.map((subscriber) => (
            <TableRow key={subscriber.clerkUserId}>
              <TableCell>
                <div className="flex items-center gap-3">
                  {subscriber.imageUrl && (
                    <Image 
                      src={subscriber.imageUrl} 
                      alt="프로필" 
                      className="w-8 h-8 rounded-full"
                      width={32}
                      height={32}
                    />
                  )}
                  <div>
                    <div className="font-medium">
                      {subscriber.firstName && subscriber.lastName ? 
                        `${subscriber.firstName} ${subscriber.lastName}` : 
                        subscriber.firstName || 
                        subscriber.lastName || 
                        '이름 없음'
                      }
                    </div>
                    <div className="text-sm text-muted-foreground">
                      ID: {subscriber.clerkUserId.slice(0, 8)}...
                    </div>
                  </div>
                </div>
              </TableCell>
              <TableCell className="font-medium">{subscriber.email}</TableCell>
              <TableCell>
                <Badge variant={subscriber.isSubscribed ? 'default' : 'secondary'}>
                  {subscriber.isSubscribed ? '구독' : '구독 해지'}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge variant={subscriber.receiveWeatherEmails ? 'default' : 'secondary'}>
                  {subscriber.receiveWeatherEmails ? '수신' : '수신 안함'}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge variant={subscriber.receiveMorningEmail ? 'default' : 'secondary'}>
                  {subscriber.receiveMorningEmail ? '수신' : '수신 안함'}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge variant={subscriber.receiveEveningEmail ? 'default' : 'secondary'}>
                  {subscriber.receiveEveningEmail ? '수신' : '수신 안함'}
                </Badge>
              </TableCell>
              <TableCell>{subscriber.totalEmailsSent}</TableCell>
              <TableCell>
                {subscriber.lastSignInAt ? 
                  new Date(subscriber.lastSignInAt).toLocaleDateString('ko-KR') : 
                  '로그인 안함'
                }
              </TableCell>
              <TableCell>
                {new Date(subscriber.createdAt).toLocaleDateString('ko-KR')}
              </TableCell>
              <TableCell>
                <Badge variant={subscriber.hasEmailSettings ? 'default' : 'outline'}>
                  {subscriber.hasEmailSettings ? '설정됨' : '기본값'}
                </Badge>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}

