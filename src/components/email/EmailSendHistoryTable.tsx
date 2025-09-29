'use client';

import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

// 이메일 발송 로그 타입 (임시)
interface EmailSendLog {
  id: string;
  emailType: 'scheduled' | 'manual' | 'test';
  subject: string;
  recipientCount: number;
  successCount: number;
  failureCount: number;
  aiSummary: string | null;
  forecastPeriod: string | null;
  sentAt: Date;
  executionTime: number | null;
  isSuccessful: boolean;
  initiatedBy: string;
}

export function EmailSendHistoryTable() {
  const [logs, setLogs] = useState<EmailSendLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<EmailSendLog | null>(null);

  // 실제로는 서버 액션에서 데이터를 가져와야 함
  useEffect(() => {
    // 임시 데이터
    const mockLogs: EmailSendLog[] = [
      {
        id: '1',
        emailType: 'scheduled',
        subject: '[날씨 안내] 아침 날씨 정보 - 2024년 1월 15일',
        recipientCount: 150,
        successCount: 148,
        failureCount: 2,
        aiSummary: '오늘은 맑은 날씨가 예상됩니다. 최고기온 15°C, 최저기온 5°C입니다.',
        forecastPeriod: '12시간',
        sentAt: new Date('2024-01-15T06:00:00'),
        executionTime: 4500,
        isSuccessful: true,
        initiatedBy: 'system',
      },
      {
        id: '2',
        emailType: 'manual',
        subject: '[날씨 안내] 저녁 날씨 정보 - 2024년 1월 14일',
        recipientCount: 150,
        successCount: 150,
        failureCount: 0,
        aiSummary: '내일 아침 출근길에 눈이 올 가능성이 있습니다. 미끄럼에 주의하세요.',
        forecastPeriod: '12시간',
        sentAt: new Date('2024-01-14T18:30:00'),
        executionTime: 3200,
        isSuccessful: true,
        initiatedBy: 'admin_user_123',
      },
      {
        id: '3',
        emailType: 'test',
        subject: '[테스트] 날씨 안내 이메일',
        recipientCount: 1,
        successCount: 1,
        failureCount: 0,
        aiSummary: '테스트 이메일입니다.',
        forecastPeriod: '12시간',
        sentAt: new Date('2024-01-14T14:15:00'),
        executionTime: 800,
        isSuccessful: true,
        initiatedBy: 'admin_user_123',
      },
    ];

    setTimeout(() => {
      setLogs(mockLogs);
      setIsLoading(false);
    }, 1000);
  }, []);

  const getEmailTypeLabel = (type: EmailSendLog['emailType']) => {
    switch (type) {
      case 'scheduled':
        return '스케줄';
      case 'manual':
        return '수동';
      case 'test':
        return '테스트';
      default:
        return '알 수 없음';
    }
  };

  const getEmailTypeBadge = (type: EmailSendLog['emailType']) => {
    switch (type) {
      case 'scheduled':
        return <Badge variant="default">스케줄</Badge>;
      case 'manual':
        return <Badge variant="secondary">수동</Badge>;
      case 'test':
        return <Badge variant="outline">테스트</Badge>;
      default:
        return <Badge variant="destructive">알 수 없음</Badge>;
    }
  };

  const getSuccessRate = (log: EmailSendLog) => {
    if (log.recipientCount === 0) return 0;
    return Math.round((log.successCount / log.recipientCount) * 100);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="text-center">
          <div className="text-sm text-muted-foreground">발송 이력을 불러오는 중...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {logs.length === 0 ? (
        <Card>
          <CardContent className="flex items-center justify-center h-32">
            <div className="text-center">
              <div className="text-sm text-muted-foreground">발송 이력이 없습니다.</div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>발송 시간</TableHead>
              <TableHead>유형</TableHead>
              <TableHead>제목</TableHead>
              <TableHead>수신자</TableHead>
              <TableHead>성공/실패</TableHead>
              <TableHead>성공률</TableHead>
              <TableHead>실행 시간</TableHead>
              <TableHead>상태</TableHead>
              <TableHead>작업</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.map((log) => (
              <TableRow key={log.id}>
                <TableCell className="font-medium">
                  {log.sentAt.toLocaleString('ko-KR')}
                </TableCell>
                <TableCell>
                  {getEmailTypeBadge(log.emailType)}
                </TableCell>
                <TableCell className="max-w-xs truncate">
                  {log.subject}
                </TableCell>
                <TableCell>{log.recipientCount}</TableCell>
                <TableCell>
                  <div className="text-sm">
                    <span className="text-green-600">{log.successCount}</span>
                    {log.failureCount > 0 && (
                      <>
                        {' / '}
                        <span className="text-red-600">{log.failureCount}</span>
                      </>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge 
                    variant={getSuccessRate(log) === 100 ? 'default' : 'secondary'}
                  >
                    {getSuccessRate(log)}%
                  </Badge>
                </TableCell>
                <TableCell>
                  {log.executionTime ? `${log.executionTime}ms` : '-'}
                </TableCell>
                <TableCell>
                  <Badge variant={log.isSuccessful ? 'default' : 'destructive'}>
                    {log.isSuccessful ? '성공' : '실패'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedLog(log)}
                      >
                        상세보기
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>이메일 발송 상세 정보</DialogTitle>
                        <DialogDescription>
                          {selectedLog?.sentAt.toLocaleString('ko-KR')} 발송
                        </DialogDescription>
                      </DialogHeader>
                      {selectedLog && (
                        <EmailLogDetails log={selectedLog} />
                      )}
                    </DialogContent>
                  </Dialog>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

function EmailLogDetails({ log }: { log: EmailSendLog }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <h4 className="font-semibold mb-2">기본 정보</h4>
          <div className="space-y-1 text-sm">
            <div><strong>유형:</strong> {log.emailType}</div>
            <div><strong>제목:</strong> {log.subject}</div>
            <div><strong>발송 시간:</strong> {log.sentAt.toLocaleString('ko-KR')}</div>
            <div><strong>발송자:</strong> {log.initiatedBy === 'system' ? '시스템' : '관리자'}</div>
          </div>
        </div>
        
        <div>
          <h4 className="font-semibold mb-2">발송 결과</h4>
          <div className="space-y-1 text-sm">
            <div><strong>총 수신자:</strong> {log.recipientCount}명</div>
            <div><strong>성공:</strong> <span className="text-green-600">{log.successCount}명</span></div>
            <div><strong>실패:</strong> <span className="text-red-600">{log.failureCount}명</span></div>
            <div><strong>실행 시간:</strong> {log.executionTime}ms</div>
          </div>
        </div>
      </div>

      {log.aiSummary && (
        <div>
          <h4 className="font-semibold mb-2">AI 생성 날씨 요약</h4>
          <div className="bg-muted p-3 rounded-md text-sm">
            {log.aiSummary}
          </div>
        </div>
      )}

      {log.forecastPeriod && (
        <div>
          <h4 className="font-semibold mb-2">예보 기간</h4>
          <div className="text-sm">{log.forecastPeriod}</div>
        </div>
      )}
    </div>
  );
}

