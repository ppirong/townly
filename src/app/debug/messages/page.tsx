'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, MessageSquare, Activity } from 'lucide-react';

interface Message {
  id: string;
  userKey: string;
  message: string;
  messageType: string | null;
  receivedAt: string;
  isRead: boolean;
  createdAt: string;
}

interface WebhookLog {
  id: string;
  method: string;
  url: string;
  statusCode: string;
  isSuccessful: boolean;
  errorMessage: string | null;
  timestamp: string;
  processingTime: string;
  requestBody: string | null;
}

interface DebugData {
  messages: Message[];
  webhookLogs: WebhookLog[];
  counts: {
    totalMessages: number;
    totalLogs: number;
  };
}

export default function DebugMessagesPage() {
  const [data, setData] = useState<DebugData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/debug/messages');
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch data');
      }
      
      setData(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">🐞 카카오 메시지 디버깅</h1>
          <p className="text-gray-600 mt-2">데이터베이스에 저장된 모든 메시지와 웹훅 로그를 확인할 수 있습니다.</p>
        </div>
        
        <Button onClick={fetchData} disabled={loading} className="flex items-center gap-2">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          새로고침
        </Button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-700">❌ 오류: {error}</p>
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-500" />
            <p className="text-gray-600">데이터를 불러오는 중...</p>
          </div>
        </div>
      )}

      {data && (
        <div className="space-y-6">
          {/* 통계 카드 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">총 메시지</CardTitle>
                <MessageSquare className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{data.counts.totalMessages}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">웹훅 로그</CardTitle>
                <Activity className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{data.counts.totalLogs}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">읽지 않은 메시지</CardTitle>
                <MessageSquare className="h-4 w-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">
                  {data.messages.filter(msg => !msg.isRead).length}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 메시지 목록 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                최근 메시지 ({data.messages.length}개)
              </CardTitle>
              <CardDescription>
                데이터베이스에 저장된 카카오 메시지들
              </CardDescription>
            </CardHeader>
            <CardContent>
              {data.messages.length === 0 ? (
                <p className="text-gray-500 text-center py-8">저장된 메시지가 없습니다.</p>
              ) : (
                <div className="space-y-4">
                  {data.messages.map((message) => (
                    <div 
                      key={message.id} 
                      className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant={message.isRead ? "secondary" : "default"}>
                              {message.isRead ? '읽음' : '읽지 않음'}
                            </Badge>
                            <span className="text-sm text-gray-500">{message.userKey}</span>
                            <span className="text-xs text-gray-400">{formatTime(message.receivedAt)}</span>
                          </div>
                          <p className="text-gray-900 font-medium">{message.message}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* 웹훅 로그 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                최근 웹훅 로그 ({data.webhookLogs.length}개)
              </CardTitle>
              <CardDescription>
                웹훅 요청과 응답 기록
              </CardDescription>
            </CardHeader>
            <CardContent>
              {data.webhookLogs.length === 0 ? (
                <p className="text-gray-500 text-center py-8">웹훅 로그가 없습니다.</p>
              ) : (
                <div className="space-y-4">
                  {data.webhookLogs.map((log) => (
                    <div 
                      key={log.id} 
                      className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Badge variant={log.isSuccessful ? "default" : "destructive"}>
                            {log.method} {log.statusCode}
                          </Badge>
                          <span className="text-sm text-gray-500">{log.processingTime}</span>
                          <span className="text-xs text-gray-400">{formatTime(log.timestamp)}</span>
                        </div>
                      </div>
                      
                      {log.errorMessage && (
                        <p className="text-red-600 text-sm mb-2">오류: {log.errorMessage}</p>
                      )}
                      
                      {log.requestBody && (
                        <details className="mt-2">
                          <summary className="text-sm text-gray-600 cursor-pointer hover:text-gray-800">
                            요청 본문 보기
                          </summary>
                          <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-auto max-h-32">
                            {JSON.stringify(JSON.parse(log.requestBody), null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
