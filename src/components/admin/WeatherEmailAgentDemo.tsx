'use client';

/**
 * 날씨 안내 이메일 작성 에이전트 데모 컴포넌트
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface AgentResult {
  success: boolean;
  email?: string;
  iterations?: number;
  score?: number;
  isApproved?: boolean;
  executionTime?: number;
  report?: string;
  error?: string;
}

export default function WeatherEmailAgentDemo() {
  const [sendTime, setSendTime] = useState<6 | 18>(6);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<AgentResult | null>(null);
  const [activeTab, setActiveTab] = useState<string>('email');

  const handleGenerate = async () => {
    setIsLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/weather-email-agent/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sendTime }),
      });

      const data = await response.json();
      setResult(data);

      if (data.success) {
        setActiveTab('email');
      }
    } catch (error) {
      console.error('이메일 생성 중 오류:', error);
      setResult({
        success: false,
        error: '이메일 생성 중 오류가 발생했습니다.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 설정 카드 */}
      <Card>
        <CardHeader>
          <CardTitle>이메일 생성 설정</CardTitle>
          <CardDescription>
            테스트용 날씨 안내 이메일을 생성합니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              발송 시간 선택
            </label>
            <div className="flex gap-4">
              <Button
                variant={sendTime === 6 ? 'default' : 'outline'}
                onClick={() => setSendTime(6)}
                disabled={isLoading}
              >
                아침 6시 (6시~18시 날씨)
              </Button>
              <Button
                variant={sendTime === 18 ? 'default' : 'outline'}
                onClick={() => setSendTime(18)}
                disabled={isLoading}
              >
                저녁 18시 (18시~다음날 6시 날씨)
              </Button>
            </div>
          </div>

          <Button
            onClick={handleGenerate}
            disabled={isLoading}
            className="w-full"
            size="lg"
          >
            {isLoading ? (
              <>
                <span className="inline-block animate-spin mr-2">⏳</span>
                이메일 생성 중... (최대 1-2분 소요)
              </>
            ) : (
              '날씨 안내 이메일 생성'
            )}
          </Button>
        </CardContent>
      </Card>

      {/* 로딩 상태 */}
      {isLoading && (
        <Alert>
          <AlertTitle>에이전트 실행 중</AlertTitle>
          <AlertDescription>
            Claude Sonnet 3.5와 4.5가 협업하여 날씨 안내 이메일을 작성하고
            있습니다. 잠시만 기다려주세요...
          </AlertDescription>
        </Alert>
      )}

      {/* 결과 표시 */}
      {result && !isLoading && (
        <>
          {result.success ? (
            <>
              {/* 통계 카드 */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-gray-600">
                      순환 횟수
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {result.iterations}회
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-gray-600">
                      최종 점수
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {result.score}/100
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-gray-600">
                      승인 여부
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {result.isApproved ? '✅ 승인' : '⚠️ 미승인'}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-gray-600">
                      실행 시간
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {result.executionTime
                        ? `${(result.executionTime / 1000).toFixed(1)}초`
                        : 'N/A'}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* 결과 탭 */}
              <Card>
                <CardHeader>
                  <CardTitle>생성 결과</CardTitle>
                </CardHeader>
                <CardContent>
                  <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="email">이메일 내용</TabsTrigger>
                      <TabsTrigger value="report">실행 리포트</TabsTrigger>
                    </TabsList>

                    <TabsContent value="email" className="mt-4">
                      <div className="bg-gray-50 p-6 rounded-lg">
                        <pre className="whitespace-pre-wrap text-sm font-mono">
                          {result.email}
                        </pre>
                      </div>
                    </TabsContent>

                    <TabsContent value="report" className="mt-4">
                      <div className="bg-gray-50 p-6 rounded-lg">
                        <pre className="whitespace-pre-wrap text-sm font-mono">
                          {result.report}
                        </pre>
                      </div>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            </>
          ) : (
            <Alert variant="destructive">
              <AlertTitle>오류 발생</AlertTitle>
              <AlertDescription>{result.error}</AlertDescription>
            </Alert>
          )}
        </>
      )}
    </div>
  );
}
