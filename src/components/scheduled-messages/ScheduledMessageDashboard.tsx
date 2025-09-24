'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Plus, Play, Pause, Trash2, Clock, Send, BarChart3 } from 'lucide-react';
import type { ScheduledMessage } from '@/db/schema';

interface ScheduledMessageDashboardProps {
  onCreateMessage: () => void;
  refreshTrigger?: number;
}

export function ScheduledMessageDashboard({ onCreateMessage, refreshTrigger }: ScheduledMessageDashboardProps) {
  const [messages, setMessages] = useState<ScheduledMessage[]>([]);
  const [stats, setStats] = useState({
    totalSchedules: 0,
    activeSchedules: 0,
    recentSuccessfulSends: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 메시지 목록 로드
  const loadMessages = async () => {
    try {
      setLoading(true);
      setError(null);

      // API 엔드포인트를 통해 데이터를 가져옵니다
      const response = await fetch('/api/scheduled-messages', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `서버 오류: ${response.status}`);
      }

      const data = await response.json();
      setMessages(data.messages || []);
      setStats(data.stats || { totalSchedules: 0, activeSchedules: 0, recentSuccessfulSends: 0 });
    } catch (err) {
      console.error('메시지 로드 오류:', err);
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMessages();
  }, [refreshTrigger]);

  // 메시지 활성화/비활성화
  const toggleMessage = async (id: string, isActive: boolean) => {
    try {
      const response = await fetch(`/api/scheduled-messages/${id}/toggle`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive }),
      });

      if (!response.ok) {
        throw new Error('상태 변경에 실패했습니다');
      }

      await loadMessages(); // 목록 새로고침
    } catch (err) {
      setError(err instanceof Error ? err.message : '상태 변경 중 오류가 발생했습니다');
    }
  };

  // 메시지 삭제
  const deleteMessage = async (id: string) => {
    if (!confirm('정말로 이 스케줄을 삭제하시겠습니까?')) {
      return;
    }

    try {
      const response = await fetch(`/api/scheduled-messages/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('삭제에 실패했습니다');
      }

      await loadMessages(); // 목록 새로고침
    } catch (err) {
      setError(err instanceof Error ? err.message : '삭제 중 오류가 발생했습니다');
    }
  };

  // 즉시 발송
  const sendNow = async (id: string) => {
    if (!confirm('이 메시지를 지금 즉시 발송하시겠습니까?')) {
      return;
    }

    try {
      const response = await fetch('/api/cron/scheduled-messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId: id }),
      });

      if (!response.ok) {
        throw new Error('즉시 발송에 실패했습니다');
      }

      const result = await response.json();
      if (result.success) {
        alert('메시지가 성공적으로 발송되었습니다!');
        await loadMessages();
      } else {
        throw new Error(result.error || '발송에 실패했습니다');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '발송 중 오류가 발생했습니다');
    }
  };

  // 스케줄 타입 표시
  const getScheduleDisplay = (message: ScheduledMessage) => {
    const { scheduleType, scheduleTime, scheduleDay } = message;
    
    switch (scheduleType) {
      case 'daily':
        return `매일 ${scheduleTime}`;
      case 'weekly':
        const days = ['일', '월', '화', '수', '목', '금', '토'];
        return `매주 ${days[scheduleDay || 0]}요일 ${scheduleTime}`;
      case 'monthly':
        return `매월 ${scheduleDay}일 ${scheduleTime}`;
      case 'once':
        return `일회성 ${scheduleTime}`;
      default:
        return scheduleTime;
    }
  };

  // 다음 발송 시간 표시
  const formatNextSendTime = (nextSendAt: string | null) => {
    if (!nextSendAt) return '발송 완료';
    
    const date = new Date(nextSendAt);
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    
    if (diffMs < 0) return '발송 대기중';
    
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (diffDays > 0) return `${diffDays}일 후`;
    if (diffHours > 0) return `${diffHours}시간 후`;
    return `${diffMinutes}분 후`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">스케줄 메시지를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <BarChart3 className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">총 스케줄</p>
                <p className="text-2xl font-bold">{stats.totalSchedules}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Clock className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">활성 스케줄</p>
                <p className="text-2xl font-bold">{stats.activeSchedules}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Send className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">최근 30일 발송</p>
                <p className="text-2xl font-bold">{stats.recentSuccessfulSends}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 에러 메시지 */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* 헤더 */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">스케줄 메시지 관리</h2>
        <Button onClick={onCreateMessage} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          새 스케줄 추가
        </Button>
      </div>

      {/* 메시지 목록 */}
      <div className="space-y-4">
        {messages.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                스케줄된 메시지가 없습니다
              </h3>
              <p className="text-gray-600 mb-4">
                첫 번째 정기 메시지 스케줄을 생성해보세요.
              </p>
              <Button onClick={onCreateMessage}>
                첫 스케줄 만들기
              </Button>
            </CardContent>
          </Card>
        ) : (
          messages.map((message) => (
            <Card key={message.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{message.title}</CardTitle>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant={message.isActive ? 'default' : 'secondary'}>
                        {message.isActive ? '활성' : '비활성'}
                      </Badge>
                      <Badge variant="outline">
                        {getScheduleDisplay(message)}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => sendNow(message.id)}
                      disabled={!message.isActive}
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => toggleMessage(message.id, !message.isActive)}
                    >
                      {message.isActive ? (
                        <Pause className="h-4 w-4" />
                      ) : (
                        <Play className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => deleteMessage(message.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">메시지 내용:</p>
                    <p className="text-sm bg-gray-50 p-3 rounded-md">
                      {message.message}
                    </p>
                  </div>
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>다음 발송: {formatNextSendTime(message.nextSendAt?.toISOString() || null)}</span>
                    <span>총 발송 횟수: {message.totalSentCount}회</span>
                  </div>
                  {message.lastSentAt && (
                    <div className="text-sm text-gray-600">
                      마지막 발송: {new Date(message.lastSentAt).toLocaleString('ko-KR')}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
