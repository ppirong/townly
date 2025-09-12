'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  RefreshCw, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Activity,
  Globe,
  Clock,
  MessageSquare,
  TestTube
} from 'lucide-react';
import { getWebhookDebugInfo, testWebhookConnection } from '@/actions/kakao';

interface WebhookStats {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  successRate: number;
  lastRequestTime: Date | null;
}

interface MessageStats {
  recentMessageCount: number;
}

interface WebhookLog {
  id: string;
  method: string;
  statusCode: string;
  isSuccessful: boolean | null;
  errorMessage: string | null;
  timestamp: Date;
  processingTime: string | null;
}

interface WebhookDebugData {
  webhookStats: WebhookStats;
  messageStats: MessageStats;
  recentLogs: WebhookLog[];
  isWebhookHealthy: boolean;
}

interface TestResult {
  success: boolean;
  status?: number;
  statusText?: string;
  responseData?: string;
  testUrl: string;
  timestamp: Date;
  error?: string;
}

export function WebhookDebugPanel() {
  const [debugData, setDebugData] = useState<WebhookDebugData | null>(null);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isTesting, setIsTesting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 디버깅 정보 로드
  const loadDebugInfo = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const data = await getWebhookDebugInfo();
      setDebugData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '디버깅 정보를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  // 웹훅 연결 테스트
  const testWebhook = async () => {
    setIsTesting(true);
    
    try {
      const result = await testWebhookConnection();
      setTestResult(result);
    } catch (err) {
      setTestResult({
        success: false,
        error: err instanceof Error ? err.message : '테스트 중 오류가 발생했습니다.',
        testUrl: 'Unknown',
        timestamp: new Date(),
      });
    } finally {
      setIsTesting(false);
    }
  };

  // 초기 로드
  useEffect(() => {
    loadDebugInfo();
  }, []);

  // 상태에 따른 색상 및 아이콘
  const getStatusInfo = (isHealthy: boolean) => {
    if (isHealthy) {
      return {
        color: 'text-green-600',
        bgColor: 'bg-green-50',
        icon: CheckCircle,
        text: '정상',
        badgeVariant: 'default' as const,
      };
    } else {
      return {
        color: 'text-red-600',
        bgColor: 'bg-red-50',
        icon: XCircle,
        text: '문제 발생',
        badgeVariant: 'destructive' as const,
      };
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <RefreshCw className="h-6 w-6 animate-spin mr-2" />
          <span>디버깅 정보를 로드하는 중...</span>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <Button onClick={loadDebugInfo} className="mt-4">
            <RefreshCw className="h-4 w-4 mr-2" />
            다시 시도
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!debugData) {
    return null;
  }

  const statusInfo = getStatusInfo(debugData.isWebhookHealthy);
  const StatusIcon = statusInfo.icon;

  return (
    <div className="space-y-6">
      {/* 전체 상태 개요 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                웹훅 연결 상태
              </CardTitle>
              <CardDescription>
                카카오 채널 웹훅의 실시간 상태를 모니터링합니다
              </CardDescription>
            </div>
            <Button onClick={loadDebugInfo} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              새로고침
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-6">
            <div className={`p-3 rounded-full ${statusInfo.bgColor}`}>
              <StatusIcon className={`h-6 w-6 ${statusInfo.color}`} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-semibold">웹훅 상태</span>
                <Badge variant={statusInfo.badgeVariant}>{statusInfo.text}</Badge>
              </div>
              <p className="text-sm text-gray-600">
                {debugData.isWebhookHealthy 
                  ? '웹훅이 정상적으로 작동하고 있습니다' 
                  : '웹훅에 문제가 발생했습니다. 연결을 확인해주세요'}
              </p>
            </div>
          </div>

          {/* 통계 그리드 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {debugData.webhookStats.totalRequests}
              </div>
              <div className="text-sm text-gray-600">총 요청 수 (24시간)</div>
            </div>
            
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {debugData.webhookStats.successfulRequests}
              </div>
              <div className="text-sm text-gray-600">성공한 요청</div>
            </div>
            
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <div className="text-2xl font-bold text-red-600">
                {debugData.webhookStats.failedRequests}
              </div>
              <div className="text-sm text-gray-600">실패한 요청</div>
            </div>
            
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">
                {debugData.messageStats.recentMessageCount}
              </div>
              <div className="text-sm text-gray-600">수신된 메시지</div>
            </div>
          </div>

          {/* 성공률 및 마지막 요청 시간 */}
          <div className="mt-6 flex flex-col sm:flex-row gap-4">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-gray-500" />
              <span className="text-sm">성공률:</span>
              <Badge variant={debugData.webhookStats.successRate >= 90 ? 'default' : 'destructive'}>
                {debugData.webhookStats.successRate}%
              </Badge>
            </div>
            
            {debugData.webhookStats.lastRequestTime && (
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-gray-500" />
                <span className="text-sm">마지막 요청:</span>
                <span className="text-sm font-medium">
                  {new Date(debugData.webhookStats.lastRequestTime).toLocaleString('ko-KR')}
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 연결 테스트 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TestTube className="h-5 w-5" />
            웹훅 연결 테스트
          </CardTitle>
          <CardDescription>
            웹훅 엔드포인트에 직접 연결하여 상태를 확인합니다
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-4">
            <Button 
              onClick={testWebhook} 
              disabled={isTesting}
              className="flex items-center gap-2"
            >
              {isTesting ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Globe className="h-4 w-4" />
              )}
              {isTesting ? '테스트 중...' : '연결 테스트'}
            </Button>
          </div>

          {testResult && (
            <Alert variant={testResult.success ? 'default' : 'destructive'}>
              <div className="flex items-start gap-2">
                {testResult.success ? (
                  <CheckCircle className="h-4 w-4 mt-0.5" />
                ) : (
                  <XCircle className="h-4 w-4 mt-0.5" />
                )}
                <div className="flex-1">
                  <div className="font-medium">
                    {testResult.success ? '연결 성공' : '연결 실패'}
                  </div>
                  <div className="text-sm mt-1">
                    <div>URL: {testResult.testUrl}</div>
                    {testResult.status && (
                      <div>상태 코드: {testResult.status} {testResult.statusText}</div>
                    )}
                    {testResult.error && <div>오류: {testResult.error}</div>}
                    <div>테스트 시간: {testResult.timestamp.toLocaleString('ko-KR')}</div>
                  </div>
                </div>
              </div>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* 최근 웹훅 로그 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            최근 웹훅 로그
          </CardTitle>
          <CardDescription>
            최근 10개의 웹훅 요청 기록을 확인할 수 있습니다
          </CardDescription>
        </CardHeader>
        <CardContent>
          {debugData.recentLogs.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              최근 웹훅 로그가 없습니다
            </div>
          ) : (
            <ScrollArea className="h-80">
              <div className="space-y-4">
                {debugData.recentLogs.map((log, index) => (
                  <div key={log.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Badge variant={log.method === 'POST' ? 'default' : 'secondary'}>
                          {log.method}
                        </Badge>
                        <Badge 
                          variant={log.isSuccessful ? 'default' : 'destructive'}
                        >
                          {log.statusCode}
                        </Badge>
                        {log.processingTime && (
                          <span className="text-xs text-gray-500">
                            {log.processingTime}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-gray-500">
                        {new Date(log.timestamp).toLocaleString('ko-KR')}
                      </span>
                    </div>
                    
                    {log.errorMessage && (
                      <div className="text-sm text-red-600 mt-2">
                        오류: {log.errorMessage}
                      </div>
                    )}
                    
                    {index < debugData.recentLogs.length - 1 && (
                      <Separator className="mt-4" />
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
